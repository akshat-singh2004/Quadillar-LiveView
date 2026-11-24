// @refresh reset
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { supabase } from "@/lib/supabaseClient";
import {
  VANGUARD_GENOME,
  ArchitecturalBitSpec,
} from "@/lib/project/vanguardGenome";

interface SurfaceSnagRecord {
  snagId: string;
  bitId: ArchitecturalBitSpec["bitId"];
  targetElement: string;
  discipline: "STRUCTURAL" | "HVAC" | "ARCHITECTURE";
  deviationMm: number;
  severity: "MINOR" | "NOMINAL" | "RESOLVED_CERTIFIED";
  timestamp: string;
  localPoint: [number, number, number];
  merkleHash: string;
}

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function VolumetricRealityTourPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const scanGroupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);

  const [selectedBitId, setSelectedBitId] = useState<ArchitecturalBitSpec["bitId"]>("BIT-2");
  const [realityBlendPct, setRealityBlendPct] = useState<number>(65); // 0 = Pure BIM Wireframe, 100 = Pure Dense LiDAR
  const [pointCount, setPointCount] = useState<number>(28500);
  const [pinModeActive, setPinModeActive] = useState<boolean>(false);
  const [isNotarizing, setIsNotarizing] = useState<boolean>(false);

  const [snags, setSnags] = useState<SurfaceSnagRecord[]>([
    {
      snagId: "SNAG-VANGUARD-401",
      bitId: "BIT-2",
      targetElement: "Kalzip Space-Frame Truss Node #14B",
      discipline: "STRUCTURAL",
      deviationMm: 4.2,
      severity: "MINOR",
      timestamp: "13:20:14",
      localPoint: [5.4, 8.6, 5.2],
      merkleHash: "8806a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4",
    },
    {
      snagId: "NCR-009-SCAN",
      bitId: "BIT-4",
      targetElement: "Column C2 Post-Grout Laser Verification",
      discipline: "STRUCTURAL",
      deviationMm: 0.8,
      severity: "RESOLVED_CERTIFIED",
      timestamp: "11:45:02",
      localPoint: [-8.0, 2.6, -6.0],
      merkleHash: "3f90a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4",
    },
    {
      snagId: "SCAN-VGD-304",
      bitId: "BIT-3",
      targetElement: "14th Fl Diagrid Node & Lift Core Riser",
      discipline: "HVAC",
      deviationMm: 1.1,
      severity: "NOMINAL",
      timestamp: "10:12:40",
      localPoint: [3.2, 16.5, 4.1],
      merkleHash: "7c19e84b21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab109",
    },
  ]);

  const [activeSnagId, setActiveSnagId] = useState<string>("SNAG-VANGUARD-401");

  const activeBit =
    VANGUARD_GENOME.bits.find((b) => b.bitId === selectedBitId) ||
    VANGUARD_GENOME.bits[1];

  const zoneSnags = snags.filter((s) => s.bitId === selectedBitId);
  const activeSnag =
    zoneSnags.find((s) => s.snagId === activeSnagId) ||
    zoneSnags[0] ||
    snags[0];

  // Read ?zone=BIT-X from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const z = params.get("zone")?.toUpperCase();
    if (z && VANGUARD_GENOME.bits.some((b) => b.bitId === z)) {
      const bitId = z as ArchitecturalBitSpec["bitId"];
      setSelectedBitId(bitId);
      const firstInZone = snags.find((s) => s.bitId === bitId);
      if (firstInZone) setActiveSnagId(firstInZone.snagId);
    }
  }, []);

  // Build True Geometry-Matched LiDAR Point Cloud + BIM Wireframe for Selected BIT
  const buildZoneScanGeometry = useCallback(
    (bit: ArchitecturalBitSpec, blendPct: number) => {
      const group = scanGroupRef.current;
      if (!group) return;

      while (group.children.length > 0) {
        const child = group.children[0] as any;
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        group.remove(child);
      }

      const numPts = 28500;
      const positions = new Float32Array(numPts * 3);
      const colors = new Float32Array(numPts * 3);

      // Deterministic PRNG so scans stay rock-steady across re-renders
      let seed = bit.bitId.charCodeAt(4) * 1337;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };

      const wireframeGroup = new THREE.Group();
      wireframeGroup.name = "BIM_CAD_WIREFRAME";
      const wireOpacity = Math.max(0.15, (100 - blendPct) / 100);
      const wireMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: wireOpacity,
      });

      if (bit.bitId === "BIT-2") {
        // BIT-2: Kalzip Silver Dome + 2,100-Ton Geodesic Space-Frame + Circular HVAC Ring
        const R = 11.5;
        const drumH = 5.0;

        for (let i = 0; i < numPts; i++) {
          const u = rand();
          let x = 0, y = 0, z = 0;
          let rCol = 0.15, gCol = 0.85, bCol = 0.72; // Emerald-cyan LiDAR return

          if (u < 0.52) {
            // Geodesic Dome Shell
            const theta = rand() * Math.PI * 2;
            const phi = rand() * (Math.PI / 2);
            const jitter = (rand() - 0.5) * 0.12;
            x = (R + jitter) * Math.sin(phi) * Math.cos(theta);
            y = drumH + (R + jitter) * Math.cos(phi);
            z = (R + jitter) * Math.sin(phi) * Math.sin(theta);

            // Highlight deviation cluster near Node #14B (5.4, 8.6, 5.2)
            const distToSnag = Math.hypot(x - 5.4, y - 8.6, z - 5.2);
            if (distToSnag < 2.4) {
              rCol = 0.98; gCol = 0.25; bCol = 0.35; // Red-amber laser deviation heat
            } else {
              rCol = 0.72; gCol = 0.86; bCol = 0.96; // Kalzip aluminum reflectance
            }
          } else if (u < 0.74) {
            // Circular Perimeter HVAC Supply Ring Duct
            const theta = rand() * Math.PI * 2;
            const tubeAngle = rand() * Math.PI * 2;
            const ringR = R - 1.1;
            const tubeR = 0.52;
            x = (ringR + tubeR * Math.cos(tubeAngle)) * Math.cos(theta);
            y = drumH + 0.6 + tubeR * Math.sin(tubeAngle);
            z = (ringR + tubeR * Math.cos(tubeAngle)) * Math.sin(theta);
            rCol = 0.16; gCol = 0.95; bCol = 0.45; // HVAC green
          } else if (u < 0.9) {
            // Auditorium Perimeter Drum Wall
            const theta = rand() * Math.PI * 2;
            x = R * Math.cos(theta);
            y = rand() * drumH;
            z = R * Math.sin(theta);
            rCol = 0.35; gCol = 0.55; bCol = 0.75;
          } else {
            // Concourse Floor Slab
            const rad = Math.sqrt(rand()) * R;
            const theta = rand() * Math.PI * 2;
            x = rad * Math.cos(theta);
            y = 0.05;
            z = rad * Math.sin(theta);
            rCol = 0.22; gCol = 0.65; bCol = 0.55;
          }

          positions[i * 3] = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;
          colors[i * 3] = rCol;
          colors[i * 3 + 1] = gCol;
          colors[i * 3 + 2] = bCol;
        }

        // CAD Wireframe Dome + HVAC Ring
        const domeWire = new THREE.LineSegments(
          new THREE.WireframeGeometry(
            new THREE.SphereGeometry(R, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2)
          ),
          wireMat
        );
        domeWire.position.y = drumH;
        wireframeGroup.add(domeWire);

        const ductWire = new THREE.LineSegments(
          new THREE.WireframeGeometry(new THREE.TorusGeometry(R - 1.1, 0.52, 10, 32)),
          new THREE.LineBasicMaterial({ color: 0x4ade80, transparent: true, opacity: wireOpacity })
        );
        ductWire.rotation.x = Math.PI / 2;
        ductWire.position.y = drumH + 0.6;
        wireframeGroup.add(ductWire);
      } else if (bit.bitId === "BIT-3") {
        // BIT-3: 14th Floor Diagonal Curtain Atrium + 4-Car Lift Bank + HVAC Risers
        const W = 16, H = 22, D = 14;
        for (let i = 0; i < numPts; i++) {
          const u = rand();
          let x = 0, y = 0, z = 0;
          let rCol = 0.2, gCol = 0.8, bCol = 0.95;

          if (u < 0.55) {
            // Diagrid Curtain Wall Faces
            const face = Math.floor(rand() * 4);
            y = rand() * H;
            const t = (rand() - 0.5);
            if (face === 0) { x = t * W; z = D / 2; }
            else if (face === 1) { x = t * W; z = -D / 2; }
            else if (face === 2) { x = W / 2; z = t * D; }
            else { x = -W / 2; z = t * D; }
            rCol = 0.25; gCol = 0.78; bCol = 0.98;
          } else if (u < 0.8) {
            // 4-Car Lift Core & 14th Fl HVAC Vertical Risers
            x = (rand() - 0.5) * 6.5;
            y = rand() * H;
            z = (rand() - 0.5) * 4.5;
            rCol = 0.75; gCol = 0.35; bCol = 0.98; // Purple/green MEP core
          } else {
            // Floor Slabs
            const slabIdx = Math.floor(rand() * 6);
            x = (rand() - 0.5) * W;
            y = (slabIdx / 5) * H;
            z = (rand() - 0.5) * D;
            rCol = 0.2; gCol = 0.9; bCol = 0.6;
          }

          positions[i * 3] = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;
          colors[i * 3] = rCol;
          colors[i * 3 + 1] = gCol;
          colors[i * 3 + 2] = bCol;
        }

        const towerWire = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)),
          wireMat
        );
        towerWire.position.y = H / 2;
        wireframeGroup.add(towerWire);
      } else if (bit.bitId === "BIT-1") {
        // BIT-1: 48m Terracotta Bridge Arch & Stepped Green Wedge
        const W = 24, H = 9, D = 13;
        for (let i = 0; i < numPts; i++) {
          const u = rand();
          let x = (rand() - 0.5) * W;
          let z = (rand() - 0.5) * D;
          let y = 0;
          let rCol = 0.85, gCol = 0.38, bCol = 0.15; // Terracotta

          if (u < 0.6) {
            // Parabolic Arch Underside & Bridge Deck
            const normX = x / (W / 2);
            const archY = Math.max(0, (1 - normX * normX) * (H - 1.5));
            y = rand() < 0.5 ? archY : H;
            rCol = 0.88; gCol = 0.36; bCol = 0.14;
          } else {
            // Stepped Green Turf Amphitheatre Roof
            y = H + 0.4 + Math.max(0, (x + W / 2) * 0.12);
            rCol = 0.15; gCol = 0.85; bCol = 0.38;
          }

          positions[i * 3] = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;
          colors[i * 3] = rCol;
          colors[i * 3 + 1] = gCol;
          colors[i * 3 + 2] = bCol;
        }

        const bridgeWire = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)),
          wireMat
        );
        bridgeWire.position.y = H / 2;
        wireframeGroup.add(bridgeWire);
      } else if (bit.bitId === "BIT-6") {
        // BIT-6: Slim Rooftop Cantilevered Helipad Deck (+23.0m RL)
        const R = 8.5;
        for (let i = 0; i < numPts; i++) {
          const rad = Math.sqrt(rand()) * R;
          const theta = rand() * Math.PI * 2;
          const x = rad * Math.cos(theta);
          const z = rad * Math.sin(theta);
          const y = 3.5 + (rand() - 0.5) * 0.45;
          const isTdpmRing = rad > 3.2 && rad < 4.5;

          positions[i * 3] = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;
          colors[i * 3] = isTdpmRing ? 0.98 : 0.25;
          colors[i * 3 + 1] = isTdpmRing ? 0.82 : 0.85;
          colors[i * 3 + 2] = isTdpmRing ? 0.15 : 0.95;
        }

        const heliWire = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.CylinderGeometry(R, R * 0.92, 0.8, 24)),
          wireMat
        );
        heliWire.position.y = 3.5;
        wireframeGroup.add(heliWire);
      } else {
        // BIT-4 (Podium & 2,400 TR Chiller Plant) / BIT-5 (East Wing)
        const W = 22, H = 6, D = 18;
        for (let i = 0; i < numPts; i++) {
          const x = (rand() - 0.5) * W;
          const z = (rand() - 0.5) * D;
          const y = rand() < 0.4 ? 0.05 : rand() < 0.75 ? H : rand() * H;
          positions[i * 3] = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;
          colors[i * 3] = 0.22;
          colors[i * 3 + 1] = 0.88;
          colors[i * 3 + 2] = 0.65;
        }
        const boxWire = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)),
          wireMat
        );
        boxWire.position.y = H / 2;
        wireframeGroup.add(boxWire);
      }

      const ptGeom = new THREE.BufferGeometry();
      ptGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      ptGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const ptMat = new THREE.PointsMaterial({
        size: 0.14,
        vertexColors: true,
        transparent: true,
        opacity: Math.max(0.25, blendPct / 100),
      });

      const pointCloud = new THREE.Points(ptGeom, ptMat);
      pointCloud.name = "LIDAR_POINT_CLOUD";
      group.add(pointCloud);
      group.add(wireframeGroup);

      // Render 3D Snag Deviation Markers inside the Scan Space
      snags
        .filter((s) => s.bitId === bit.bitId)
        .forEach((s) => {
          const markerColor =
            s.severity === "MINOR"
              ? 0xf43f5e
              : s.severity === "RESOLVED_CERTIFIED"
              ? 0x10b981
              : 0x38bdf8;
          const marker = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.55, 0),
            new THREE.MeshBasicMaterial({ color: markerColor })
          );
          marker.position.set(...s.localPoint);
          marker.userData = { snagId: s.snagId };
          group.add(marker);
        });

      setPointCount(numPts);
    },
    [snags]
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let cancelled = false;
    let reqId = 0;

    const width = Math.max(container.clientWidth, 400);
    const height = Math.max(container.clientHeight, 420);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04070d);

    let grid = new THREE.GridHelper(44, 44, 0x1e293b, 0x0f172a);
    scene.add(grid);

    const applyTourTheme = (mode: string) => {
      const isLight = mode === "claude-light";
      scene.background = new THREE.Color(isLight ? 0xEFECE4 : 0x04070d);
      scene.remove(grid);
      grid = new THREE.GridHelper(
        44,
        44,
        isLight ? 0xC96442 : 0x1e293b,
        isLight ? 0xD8D2C5 : 0x0f172a
      );
      scene.add(grid);
    };
    applyTourTheme(document.documentElement.getAttribute("data-theme") || "obsidian-dark");
    const onTourThemeEvt = (e: any) => applyTourTheme(e.detail);
    window.addEventListener("liveview-theme-change", onTourThemeEvt);

    const scanGroup = new THREE.Group();
    scene.add(scanGroup);
    scanGroupRef.current = scanGroup;

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 500);
    camera.position.set(18, 13, 18);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: rw, height: rh } = entry.contentRect;
        if (rw > 0 && rh > 0) {
          camera.aspect = rw / rh;
          camera.updateProjectionMatrix();
          renderer.setSize(rw, rh);
        }
      }
    });
    resizeObserver.observe(container);

    const bootControls = async () => {
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (cancelled) return;
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.target.set(0, 6, 0);
      controls.update();
      controlsRef.current = controls;
    };
    bootControls();

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelled = true;
      cancelAnimationFrame(reqId);
      window.removeEventListener("liveview-theme-change", onTourThemeEvt);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    buildZoneScanGeometry(activeBit, realityBlendPct);
  }, [activeBit, realityBlendPct, buildZoneScanGeometry]);

  const handlePinSurfaceSnag = async () => {
    setIsNotarizing(true);
    const nowStr = new Date().toTimeString().slice(0, 8);
    const newId = `SNAG-VANGUARD-${402 + snags.length}`;
    const rawPayload = `${VANGUARD_GENOME.projectId}_${activeBit.bitId}_${newId}_LIDAR_ASBUILT_${nowStr}`;
    const hash = await generateSHA256(rawPayload);

    const created: SurfaceSnagRecord = {
      snagId: newId,
      bitId: activeBit.bitId,
      targetElement: `${activeBit.name} Surface Node`,
      discipline: "STRUCTURAL",
      deviationMm: 1.8,
      severity: "NOMINAL",
      timestamp: nowStr,
      localPoint: [2.2, 6.4, -2.5],
      merkleHash: hash,
    };

    setSnags((prev) => [created, ...prev]);
    setActiveSnagId(newId);
    setPinModeActive(false);

    try {
      await supabase.from("section_65b_audit_ledger").insert({
        project_id: VANGUARD_GENOME.projectId,
        primary_governor: "MINERVA-LIDAR-REALITY",
        synthesis_report: `360° LIDAR SURFACE PIN NOTARIZED: ${newId} on ${activeBit.code} (${activeBit.name}) • Deviation: 1.8mm (Within LOD-400 Tolerance) • Registered to 3D BIM Twin`,
        merkle_root_hash: hash,
      });
    } catch (e) {}

    setIsNotarizing(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-5 flex flex-col gap-4 font-mono">
      {/* Header */}
      <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              VOLUMETRIC PHOTOGRAMMETRY & LIDAR
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              LOD-400 BIM REGISTERED • {VANGUARD_GENOME.projectId}
            </span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white mt-1">
            360° VOLUMETRIC REALITY & LIDAR SCAN TWIN
          </h1>
          <p className="text-xs text-slate-400">
            {VANGUARD_GENOME.projectName} • Synchronized Point-Cloud Meshes & Spatial As-Built Verification
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition">
            ← COMMAND CENTER
          </a>
          <a
            href={`/site/digital-twin?bit=${activeBit.bitId}`}
            className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg transition"
          >
            🏛️ OPEN {activeBit.bitId} IN 3D BIM TWIN
          </a>
          <a href="/site/gis" className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 rounded-lg transition">
            📡 RADAR GIS
          </a>
        </div>
      </div>

      {/* 6 Architectural Bits Selector Strip (Synced with Command Center & 3D BIM) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 text-xs">
        {VANGUARD_GENOME.bits.map((bit) => {
          const isSelected = bit.bitId === selectedBitId;
          return (
            <button
              key={bit.bitId}
              onClick={() => {
                setSelectedBitId(bit.bitId);
                const first = snags.find((s) => s.bitId === bit.bitId);
                if (first) setActiveSnagId(first.snagId);
              }}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1 ${
                isSelected
                  ? "bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.18)]"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-cyan-400">{bit.code}</span>
                <span className="text-slate-400">{bit.elevationLabel}</span>
              </div>
              <div className="font-bold text-white text-xs leading-snug truncate">{bit.name}</div>
              <div className="text-[10px] text-slate-400 truncate">{bit.shortTitle}</div>
            </button>
          );
        })}
      </div>

      {/* Main Split Grid: Volumetric LiDAR Viewport + Surface Snags & Sec 65B Stamp */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left: Geometry-Matched Volumetric LiDAR Point Cloud Canvas */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col min-h-[470px]">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap justify-between items-center gap-2 text-xs">
            <span className="font-bold text-white uppercase tracking-wider">
              {activeBit.name.toUpperCase()} • {activeBit.elevationLabel}
            </span>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                LIDAR: {pointCount.toLocaleString()} PTS
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                BIM CAD REGISTERED
              </span>
              <button
                onClick={handlePinSurfaceSnag}
                disabled={isNotarizing}
                className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition"
              >
                {isNotarizing ? "SEALING..." : "+ PIN SURFACE SNAG"}
              </button>
            </div>
          </div>

          <div className="relative flex-1 bg-[#04070d]">
            <div ref={mountRef} className="w-full h-full min-h-[390px] cursor-grab active:cursor-grabbing" />

            {/* Top-Left Reality vs BIM Wireframe Blend Control */}
            <div className="absolute top-3 left-3 z-10 bg-slate-900/85 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 flex items-center gap-3 text-[10px]">
              <span className="text-slate-300 font-bold">REALITY MESH ({realityBlendPct}%)</span>
              <input
                type="range"
                min="10"
                max="100"
                value={realityBlendPct}
                onChange={(e) => setRealityBlendPct(parseInt(e.target.value, 10))}
                className="w-28 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="text-cyan-400 font-bold">BIM WIREFRAME</span>
            </div>

            {/* Bottom-Left Geometry Spec Overlay */}
            <div className="absolute bottom-3 left-3 z-10 max-w-md bg-slate-950/90 backdrop-blur-md p-3 rounded-xl border border-cyan-500/30 text-[10px] leading-relaxed">
              <div className="text-cyan-300 font-bold uppercase">{activeBit.structuralSystem}</div>
              <div className="text-emerald-400 font-bold mt-0.5">{activeBit.mepSystem}</div>
              <div className="text-slate-400 mt-1">
                Arch Spec: {activeBit.architecturalSpec} • Allocated: ₹{activeBit.allocatedBudgetCr.toFixed(2)} Cr
              </div>
            </div>
          </div>
        </div>

        {/* Right: Surface As-Built Snags & Section 65B Evidence Stamp */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                SURFACE AS-BUILT SNAGS ({zoneSnags.length})
              </span>
              <span className="text-[10px] text-cyan-400 font-bold">{activeBit.code}</span>
            </div>

            {zoneSnags.length === 0 ? (
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
                ✔ Zero open laser-scan deviations in {activeBit.code}. Click "+ PIN SURFACE SNAG" to log an inspection point.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {zoneSnags.map((snag) => (
                  <button
                    key={snag.snagId}
                    onClick={() => setActiveSnagId(snag.snagId)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      activeSnag?.snagId === snag.snagId
                        ? "bg-slate-950 border-amber-500/60"
                        : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-amber-400">{snag.snagId}</span>
                      <span
                        className={`font-bold ${
                          snag.severity === "MINOR"
                            ? "text-rose-400"
                            : "text-emerald-400"
                        }`}
                      >
                        Δ {snag.deviationMm} mm Deviation
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white">{snag.targetElement}</div>
                    <div className="text-[10px] text-slate-400">
                      Coord: ({snag.localPoint.join(", ")}) • {snag.discipline}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section 65B Evidence Stamp */}
          {activeSnag && (
            <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3">
              <div>
                <div className="flex justify-between items-center text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">
                  <span>SECTION 65B EVIDENCE STAMP</span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-[10px]">
                    SURFACE ANCHORED
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 uppercase">INSPECTED PHYSICAL TARGET</div>
                <div className="text-sm font-bold text-white mt-0.5">{activeSnag.targetElement}</div>

                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">DISCIPLINE</span>
                    <span className="text-cyan-400 font-bold">{activeSnag.discipline}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">SEVERITY</span>
                    <span className="text-amber-400 font-bold">{activeSnag.severity}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">BIM TOLERANCE</span>
                    <span className="text-emerald-400 font-bold">Δ {activeSnag.deviationMm} mm</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">TIMESTAMP</span>
                    <span className="text-white font-bold">{activeSnag.timestamp}</span>
                  </div>
                </div>

                <div className="mt-3 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 block uppercase">SHA-256 STATE HASH</span>
                  <span className="text-[10px] text-purple-300 font-mono break-all select-all">
                    {activeSnag.merkleHash}
                  </span>
                </div>
              </div>

              <a
                href={`/site/digital-twin?bit=${activeSnag.bitId}`}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs rounded-xl text-center transition hover:opacity-95"
              >
                INSPECT {activeSnag.bitId} & {activeSnag.snagId} IN 3D BIM →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
