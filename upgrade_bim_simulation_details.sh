#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: EXTENDED 4D BIM SIMULATION ENGINE (V2.0)
# Features: Sub-element selection, Reality capture cameras, Dual-track Gantt,
#           Granular BOQ itemization with CPWD DSR rate schedules.
# ==============================================================================

set -euo pipefail

cat << 'ENGINE_V2_EOF' > components/bim/FullBimSimulationEngine.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

// --- TYPES & INTERFACES ---
export type SelectionLevel = "ALL" | "L0_FOUNDATION" | "L1_TYPICAL" | "L2_ROOF";
export type SelectionZone = "ALL_ZONES" | "BAY_A1_B2" | "BAY_C3_D4";

export interface BOQLineItem {
  itemCode: string;
  description: string;
  quantity: number;
  unit: string;
  rateINR: number;
  amountINR: number;
  qualityStandard: string;
}

export interface SubElement {
  id: string;
  name: string;
  subType: "POUR_CARD" | "REBAR_CAGE" | "MEP_EQUIPMENT" | "POST_TENSIONING";
  status: "VERIFIED" | "IN_PROGRESS" | "LATENT_ANOMALY" | "PENDING_INSPECTION";
  pourCardRef?: string;
  cubeStrengthMpa?: number;
  varianceDays?: number;
  boqItems: BOQLineItem[];
}

export interface SelectedEntity {
  id: string;
  name: string;
  type: "LEVEL" | "ZONE" | "ELEMENT";
  discipline: "CIVIL" | "STRUCTURAL" | "MEP" | "DEFECT";
  parentLevel: SelectionLevel;
  parentZone: SelectionZone;
  subElements: SubElement[];
  boqSummary: {
    concrete_m3: number;
    steel_mt: number;
    ductwork_m2: number;
    total_cost_inr: number;
  };
}

export interface CameraWaypoint {
  id: string;
  name: string;
  position: [number, number, number];
  type: "CCTV_FIXED" | "DRONE_PHOTOGRAMMETRY";
  latestCapture: {
    timestamp: string;
    sha256: string;
    verifiedDeviationMm: number;
    pourCardMatch: boolean;
  };
}

export default function FullBimSimulationEngine() {
  const mountRef = useRef<HTMLDivElement>(null);

  // --- STATE ---
  const [timelineWeek, setTimelineWeek] = useState<number>(20);
  const [timelineMode, setTimelineMode] = useState<"ACTUAL" | "PLANNED" | "VARIANCE">("ACTUAL");
  const [activeLevel, setActiveLevel] = useState<SelectionLevel>("ALL");
  const [activeZone, setActiveZone] = useState<SelectionZone>("ALL_ZONES");
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  // Reality Capture Camera Inspector Modal
  const [activeCamera, setActiveCamera] = useState<CameraWaypoint | null>(null);

  // Sub-element active selection inside a zone
  const [selectedSubElementId, setSelectedSubElementId] = useState<string | null>("VAV-1-NW-04");

  // Master Entity Selection
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>({
    id: "ZONE_BAY_C3_D4",
    name: "Level 1 / Bay C3-D4 (Open Workstation & Air Distribution)",
    type: "ZONE",
    discipline: "MEP",
    parentLevel: "L1_TYPICAL",
    parentZone: "BAY_C3_D4",
    boqSummary: {
      concrete_m3: 142.5,
      steel_mt: 12.8,
      ductwork_m2: 840.0,
      total_cost_inr: 4850000.0
    },
    subElements: [
      {
        id: "VAV-1-NW-04",
        name: "VAV Terminal Unit 1-NW-04 (Belimo AFB24)",
        subType: "MEP_EQUIPMENT",
        status: "LATENT_ANOMALY",
        varianceDays: 0,
        boqItems: [
          {
            itemCode: "CPWD-DSR-18.4",
            description: "Pressure Independent VAV Terminal Box with 24V modulating actuator",
            quantity: 1,
            unit: "No",
            rateINR: 48500,
            amountINR: 48500,
            qualityStandard: "IS:655 / ASHRAE 90.1"
          },
          {
            itemCode: "CPWD-DSR-18.12",
            description: "Factory fabricated G.I. sheet metal ducting 0.80mm thick Class 2",
            quantity: 48,
            unit: "Sqm",
            rateINR: 1850,
            amountINR: 88800,
            qualityStandard: "IS:277 / IS:655:2006"
          }
        ]
      },
      {
        id: "PC-L1-BAY-C3-SLAB",
        name: "Pour Card #PC-2026-L1-04 (PT Flat Slab Bay C3)",
        subType: "POUR_CARD",
        status: "VERIFIED",
        pourCardRef: "PC-2026-L1-04",
        cubeStrengthMpa: 39.4,
        varianceDays: -1,
        boqItems: [
          {
            itemCode: "CPWD-DSR-5.33",
            description: "Ready Mix Concrete M35 grade with fly ash replacement conforming to IS:4926",
            quantity: 142.5,
            unit: "Cum",
            rateINR: 7600,
            amountINR: 1083000,
            qualityStandard: "IS:456:2000 Cl. 15.3"
          },
          {
            itemCode: "CPWD-DSR-5.22A",
            description: "Thermo-Mechanically Treated bars Fe-500D for RCC work cut and placed",
            quantity: 12.8,
            unit: "MT",
            rateINR: 78500,
            amountINR: 1004800,
            qualityStandard: "IS:1786:2008"
          }
        ]
      },
      {
        id: "COL-D4-01",
        name: "Column Cage COL-D4 (750mm Dia Circular M40)",
        subType: "REBAR_CAGE",
        status: "VERIFIED",
        cubeStrengthMpa: 43.1,
        varianceDays: 0,
        boqItems: [
          {
            itemCode: "CPWD-DSR-5.1.2",
            description: "Reinforced cement concrete M40 in column up to floor 2 level",
            quantity: 11.2,
            unit: "Cum",
            rateINR: 8400,
            amountINR: 94080,
            qualityStandard: "IS:456:2000"
          }
        ]
      }
    ]
  });

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const elementsGroupRef = useRef<THREE.Group | null>(null);
  const camerasGroupRef = useRef<THREE.Group | null>(null);
  const pickableMeshes = useRef<THREE.Mesh[]>([]);

  // Camera Waypoints on Site
  const cameraStations: CameraWaypoint[] = useMemo(() => [
    {
      id: "CAM-01-TOWER-NE",
      name: "Mast CCTV Cam 01 (North-East Crane Mast)",
      position: [24, 22, 22],
      type: "CCTV_FIXED",
      latestCapture: {
        timestamp: "2026-10-24 11:42:00 IST",
        sha256: "7f4c9a18d0e5124b89ec1104e12da8f448c3b211fae01934ba70114092b3c10a",
        verifiedDeviationMm: 1.8,
        pourCardMatch: true
      }
    },
    {
      id: "DRONE-STATION-L1",
      name: "Autonomous Drone Waypoint WP-03 (Level 1 MEP Corridor)",
      position: [12, 11, 14],
      type: "DRONE_PHOTOGRAMMETRY",
      latestCapture: {
        timestamp: "2026-10-24 09:15:22 IST",
        sha256: "5b8d8d4258fd1c6e9d8e360f88443faaabd16e01fc2ab3f44fd27600b1857a64",
        verifiedDeviationMm: 0.9,
        pourCardMatch: true
      }
    }
  ], []);

  // 3D Scene Initialization
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060a14);

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 540;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(44, 30, 52);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xdbeafe, 1.4);
    dirLight.position.set(50, 75, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const cyanRim = new THREE.DirectionalLight(0x00f0ff, 0.5);
    cyanRim.position.set(-40, 20, -30);
    scene.add(cyanRim);

    // Grid Floor Datum
    const grid = new THREE.GridHelper(70, 35, 0x00f0ff, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    // Groups
    const bimGroup = new THREE.Group();
    elementsGroupRef.current = bimGroup;
    scene.add(bimGroup);

    const camGroup = new THREE.Group();
    camerasGroupRef.current = camGroup;
    scene.add(camGroup);

    pickableMeshes.current = [];

    // --- MATERIALS ---
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, metalness: 0.1 });
    const colMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const ductMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.2, transmission: 0.7 });
    const vavMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.8 });

    // Helper to register interactive 3D elements
    const addBimMesh = (mesh: THREE.Mesh, entityId: string, level: SelectionLevel, zone: SelectionZone, minWeek: number, plannedWeek: number) => {
      mesh.userData = { entityId, level, zone, minWeek, plannedWeek };
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      pickableMeshes.current.push(mesh);
      bimGroup.add(mesh);
    };

    // A. Level 0 Foundation Raft (W01 - W04)
    const l0Mesh = new THREE.Mesh(new THREE.BoxGeometry(44, 1.4, 32), slabMat.clone());
    l0Mesh.position.set(0, 0.7, 0);
    addBimMesh(l0Mesh, "SLAB_L0", "L0_FOUNDATION", "ALL_ZONES", 1, 1);

    // B. L0 to L1 Columns
    for (let x = -16; x <= 16; x += 11) {
      for (let z = -12; z <= 12; z += 8) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 7, 24), colMat.clone());
        col.position.set(x, 4.9, z);
        const zone = x > 0 ? "BAY_C3_D4" : "BAY_A1_B2";
        addBimMesh(col, `COL_L0_L1_${x}_${z}`, "L0_FOUNDATION", zone, 4, 3);
      }
    }

    // C. Level 1 Typical Slab (W08)
    const l1Mesh = new THREE.Mesh(new THREE.BoxGeometry(44, 0.8, 32), slabMat.clone());
    l1Mesh.position.set(0, 8.8, 0);
    addBimMesh(l1Mesh, "SLAB_L1", "L1_TYPICAL", "ALL_ZONES", 8, 8);

    // D. L1 to L2 Columns
    for (let x = -16; x <= 16; x += 11) {
      for (let z = -12; z <= 12; z += 8) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 7, 24), colMat.clone());
        col.position.set(x, 12.7, z);
        const zone = x > 0 ? "BAY_C3_D4" : "BAY_A1_B2";
        addBimMesh(col, `COL_L1_L2_${x}_${z}`, "L1_TYPICAL", zone, 12, 11);
      }
    }

    // E. Level 2 Roof Slab (W16)
    const l2Mesh = new THREE.Mesh(new THREE.BoxGeometry(44, 0.8, 32), slabMat.clone());
    l2Mesh.position.set(0, 16.6, 0);
    addBimMesh(l2Mesh, "SLAB_L2", "L2_ROOF", "ALL_ZONES", 16, 15);

    // F. MEP Air Distribution Trunk & VAV Box (W20)
    const mainDuct = new THREE.Mesh(new THREE.BoxGeometry(32, 1.2, 1.8), ductMat.clone());
    mainDuct.position.set(2, 7.2, 3);
    addBimMesh(mainDuct, "MEP_TRUNK_DUCT_L1", "L1_TYPICAL", "BAY_A1_B2", 19, 18);

    const vavBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 2.0), vavMat.clone());
    vavBox.position.set(12, 7.2, 8);
    addBimMesh(vavBox, "VAV-1-NW-04", "L1_TYPICAL", "BAY_C3_D4", 20, 19);

    // Halo around VAV Box
    const haloGeo = new THREE.RingGeometry(1.8, 2.2, 32);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.rotation.x = Math.PI / 2;
    haloMesh.position.set(12, 5.8, 8);
    bimGroup.add(haloMesh);

    // Facade
    const glassFacade = new THREE.Mesh(new THREE.BoxGeometry(44.2, 17.5, 32.2), glassMat);
    glassFacade.position.set(0, 9.2, 0);
    glassFacade.userData = { minWeek: 18, plannedWeek: 17 };
    bimGroup.add(glassFacade);

    // G. REALITY CAPTURE CAMERA FRUSTUMS IN 3D
    cameraStations.forEach((cam) => {
      const camMarkerGeo = new THREE.ConeGeometry(0.8, 1.8, 16);
      const camMarkerMat = new THREE.MeshStandardMaterial({
        color: cam.type === "CCTV_FIXED" ? 0x06b6d4 : 0xa855f7,
        emissive: cam.type === "CCTV_FIXED" ? 0x0891b2 : 0x7e22ce,
        emissiveIntensity: 0.6
      });
      const camMesh = new THREE.Mesh(camMarkerGeo, camMarkerMat);
      camMesh.position.set(...cam.position);
      camMesh.rotation.x = Math.PI;
      camMesh.userData = { isCamera: true, cameraData: cam };
      pickableMeshes.current.push(camMesh);
      camGroup.add(camMesh);

      // Frustum Wireframe representation
      const wireGeo = new THREE.ConeGeometry(6, 12, 4, 1, true);
      const wireMat = new THREE.MeshBasicMaterial({
        color: cam.type === "CCTV_FIXED" ? 0x06b6d4 : 0xa855f7,
        wireframe: true,
        transparent: true,
        opacity: 0.15
      });
      const wireCone = new THREE.Mesh(wireGeo, wireMat);
      wireCone.position.set(...cam.position);
      wireCone.rotation.x = Math.PI;
      camGroup.add(wireCone);
    });

    // 5. Orbit Mouse Controls
    let isDragging = false;
    let prevX = 0, prevY = 0;
    let sph = { r: 72, phi: Math.PI / 3.2, theta: Math.PI / 4 };

    const updateCameraPos = () => {
      camera.position.x = sph.r * Math.sin(sph.phi) * Math.sin(sph.theta);
      camera.position.y = sph.r * Math.cos(sph.phi);
      camera.position.z = sph.r * Math.sin(sph.phi) * Math.cos(sph.theta);
      camera.lookAt(0, 8.5, 0);
    };
    updateCameraPos();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onMouseUp = () => { isDragging = false; };

    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const visibleMeshes = pickableMeshes.current.filter(m => m.visible);
      const hits = raycaster.intersectObjects(visibleMeshes, false);

      if (hits.length > 0) {
        mount.style.cursor = "pointer";
        const hitData = hits[0].object.userData;
        setHoveredTag(hitData.isCamera ? `Inspection Point: ${hitData.cameraData.name}` : `Element: ${hitData.entityId || "BIM Mesh"}`);
      } else {
        mount.style.cursor = isDragging ? "grabbing" : "default";
        setHoveredTag(null);
      }

      if (!isDragging) return;
      sph.theta -= (e.clientX - prevX) * 0.007;
      sph.phi = Math.max(0.1, Math.min(Math.PI / 2.05, sph.phi - (e.clientY - prevY) * 0.007));
      prevX = e.clientX;
      prevY = e.clientY;
      updateCameraPos();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      sph.r = Math.max(16, Math.min(140, sph.r + e.deltaY * 0.06));
      updateCameraPos();
    };

    const onClick = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const visibleMeshes = pickableMeshes.current.filter(m => m.visible);
      const hits = raycaster.intersectObjects(visibleMeshes, false);

      if (hits.length > 0) {
        const hit = hits[0].object.userData;
        if (hit.isCamera) {
          setActiveCamera(hit.cameraData);
        } else if (hit.zone === "BAY_C3_D4" || hit.entityId === "VAV-1-NW-04") {
          setActiveZone("BAY_C3_D4");
          setSelectedSubElementId("VAV-1-NW-04");
        } else if (hit.zone === "BAY_A1_B2") {
          setActiveZone("BAY_A1_B2");
        }
      }
    };

    mount.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    mount.addEventListener("wheel", onWheel, { passive: false });
    mount.addEventListener("click", onClick);

    // Resize Observer
    const ro = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) {
        camera.aspect = entry.contentRect.width / entry.contentRect.height;
        camera.updateProjectionMatrix();
        renderer.setSize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    ro.observe(mount);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      haloMesh.scale.set(1 + Math.sin(t * 4) * 0.15, 1 + Math.sin(t * 4) * 0.15, 1);
      haloMat.opacity = 0.5 + Math.sin(t * 4) * 0.4;
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      mount.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      mount.removeEventListener("wheel", onWheel);
      mount.removeEventListener("click", onClick);
      ro.disconnect();
      renderer.dispose();
    };
  }, [cameraStations]);

  // Update Geometry Visibility & Visual Variance based on 4D Timeline Mode
  useEffect(() => {
    if (!elementsGroupRef.current) return;

    elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.userData) return;

      const minWeek = mesh.userData.minWeek ?? 0;
      const plannedWeek = mesh.userData.plannedWeek ?? 0;

      // 4D Filter
      const isConstructed = timelineWeek >= minWeek;
      const levelMatches = activeLevel === "ALL" || mesh.userData.level === activeLevel;
      const zoneMatches = activeZone === "ALL_ZONES" || mesh.userData.zone === activeZone || mesh.userData.zone === "ALL_ZONES";

      mesh.visible = isConstructed && levelMatches && zoneMatches;

      // Color coding based on Timeline mode (Actual vs Planned vs Variance)
      if (mesh.material && !Array.isArray(mesh.material) && mesh.type !== "RingGeometry") {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (timelineMode === "VARIANCE") {
          const delta = minWeek - plannedWeek;
          if (delta > 0) {
            mat.color.setHex(0xef4444); // Delayed (Red)
          } else if (delta < 0) {
            mat.color.setHex(0x10b981); // Ahead (Green)
          } else {
            mat.color.setHex(0x0284c7); // On Schedule (Blue)
          }
        }
      }
    });
  }, [timelineWeek, timelineMode, activeLevel, activeZone]);

  // Active Sub-Element resolution
  const activeSubElement = useMemo(() => {
    return selectedEntity.subElements.find(s => s.id === selectedSubElementId) || selectedEntity.subElements[0];
  }, [selectedEntity, selectedSubElementId]);

  return (
    <div className="w-full flex flex-col gap-5">
      {/* 1. TOP DUAL-TRACK TIMELINE & LEVEL FILTER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Level:</span>
          {(["ALL", "L0_FOUNDATION", "L1_TYPICAL", "L2_ROOF"] as SelectionLevel[]).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setActiveLevel(lvl)}
              className={`px-3 py-1 text-xs font-mono rounded transition-all ${
                activeLevel === lvl
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {lvl.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Spatial Bay:</span>
          <button
            onClick={() => setActiveZone("ALL_ZONES")}
            className={`px-2.5 py-1 text-xs font-mono rounded border ${
              activeZone === "ALL_ZONES"
                ? "bg-cyan-950/80 border-cyan-500 text-cyan-300"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
          >
            All Bays
          </button>
          <button
            onClick={() => setActiveZone("BAY_A1_B2")}
            className={`px-2.5 py-1 text-xs font-mono rounded border ${
              activeZone === "BAY_A1_B2"
                ? "bg-cyan-950/80 border-cyan-500 text-cyan-300"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Bay A1-B2 (Core)
          </button>
          <button
            onClick={() => {
              setActiveZone("BAY_C3_D4");
              setSelectedSubElementId("VAV-1-NW-04");
            }}
            className={`px-2.5 py-1 text-xs font-mono rounded border ${
              activeZone === "BAY_C3_D4"
                ? "bg-amber-950/90 border-amber-500 text-amber-300 font-bold shadow-sm shadow-amber-500/20"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Bay C3-D4 (DLP Snag)
          </button>
        </div>

        {/* 4D Simulation Mode Toggles */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-lg">
          {(["ACTUAL", "PLANNED", "VARIANCE"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setTimelineMode(mode)}
              className={`px-2.5 py-0.5 text-[11px] font-mono rounded font-semibold transition ${
                timelineMode === mode
                  ? mode === "VARIANCE"
                    ? "bg-amber-500 text-slate-950"
                    : "bg-cyan-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* 2. 3D WEBGL VIEWPORT WITH FLOATING HUDS */}
      <div className="relative w-full h-[520px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating Top Left HUD */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
          <div className="px-2.5 py-1 bg-slate-900/90 border border-cyan-500/40 rounded text-xs font-mono text-cyan-300 flex items-center gap-2 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            LOD 500 Parametric Matrix: 60 FPS
          </div>
          {hoveredTag && (
            <div className="px-2.5 py-1 bg-blue-950/90 border border-blue-400/50 rounded text-xs font-mono text-blue-200 backdrop-blur-md">
              {hoveredTag}
            </div>
          )}
        </div>

        {/* Floating Camera Reality Capture Badges */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {cameraStations.map((cam) => (
            <button
              key={cam.id}
              onClick={() => setActiveCamera(cam)}
              className="px-2.5 py-1 bg-slate-900/90 border border-purple-500/50 hover:border-purple-400 text-purple-300 rounded text-xs font-mono flex items-center gap-1.5 backdrop-blur-md transition shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              {cam.id.includes("DRONE") ? "Drone Feed" : "CCTV NE"}
            </button>
          ))}
        </div>

        {/* Bottom Helper Hint */}
        <div className="absolute bottom-3 left-3 text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 pointer-events-none">
          [Left Click + Drag: Orbit 360°] • [Scroll: Zoom] • [Purple Cones: Click for Field Camera Proof]
        </div>
      </div>

      {/* 3. 4D GANTT PROGRESS ENGINE SLIDER (SITE INPUTS VS SCHEDULE) */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col gap-2.5">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200 uppercase tracking-wider">
              4D Construction Progression Slider:
            </span>
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono font-bold rounded border border-blue-500/30">
              Week {timelineWeek} of 24
            </span>
            <span className="text-slate-400">| Mode: <strong className="text-cyan-400 font-mono">{timelineMode}</strong></span>
          </div>

          <div className="text-xs font-mono text-slate-400">
            {timelineWeek <= 4 && "Stage 1: Raft Pouring (Fe500D Rebar Binding & Geotagged Pour Cards)"}
            {timelineWeek > 4 && timelineWeek <= 10 && "Stage 2: Level 1 Suspended Post-Tensioned Flat Slab"}
            {timelineWeek > 10 && timelineWeek <= 16 && "Stage 3: Level 2 Roof & Central Plant Platform Casting"}
            {timelineWeek > 16 && timelineWeek <= 22 && "Stage 4: Overhead MEP Ductwork & VAV Terminal Actuators"}
            {timelineWeek > 22 && "Stage 5: Statutory Handover Complete • DLP Guarantee Escrow Locked"}
          </div>
        </div>

        <input
          type="range"
          min="1"
          max="24"
          step="1"
          value={timelineWeek}
          onChange={(e) => setTimelineWeek(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />

        <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
          <span>W01: Substructure (PC-L0-01)</span>
          <span>W08: L1 Slab (PC-L1-04)</span>
          <span>W16: L2 Roof (PC-L2-01)</span>
          <span>W20: MEP Air Network</span>
          <span className="text-amber-400 font-bold">W24: CPWD DLP Clause 17</span>
        </div>
      </div>

      {/* 4. GRANULAR SUB-ELEMENT SELECTOR & QUALITY CERTIFICATION */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase">Active Spatial Zone</div>
            <h3 className="text-base font-bold text-white mt-0.5">{selectedEntity.name}</h3>
          </div>

          {/* Sub-element Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold mr-1">Sub-Elements:</span>
            {selectedEntity.subElements.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubElementId(sub.id)}
                className={`px-3 py-1 text-xs font-mono rounded transition-all flex items-center gap-1.5 ${
                  activeSubElement.id === sub.id
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  sub.status === "LATENT_ANOMALY" ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                }`}></span>
                {sub.id}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Sub-Element Quality & Telemetry Specs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Sub-Element Name</div>
            <div className="text-sm font-bold text-slate-200 mt-1 truncate">{activeSubElement.name}</div>
            <div className="text-[10px] text-cyan-400 font-mono mt-0.5">{activeSubElement.subType}</div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Verification Status</div>
            <div className={`text-sm font-bold font-mono mt-1 ${
              activeSubElement.status === "LATENT_ANOMALY" ? "text-amber-400" : "text-emerald-400"
            }`}>
              {activeSubElement.status}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {activeSubElement.cubeStrengthMpa ? `Cube Compressive Strength: ${activeSubElement.cubeStrengthMpa} MPa (Target: 35)` : "Telemetry SLA Window Active"}
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Schedule Variance</div>
            <div className={`text-sm font-bold font-mono mt-1 ${
              (activeSubElement.varianceDays ?? 0) <= 0 ? "text-emerald-400" : "text-red-400"
            }`}>
              {(activeSubElement.varianceDays ?? 0) === 0 ? "0 Days (On Target)" : `${activeSubElement.varianceDays} Days Ahead`}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Pour Card Geofence: Cleared (3.2m)</div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Certified BOQ Valuation</div>
            <div className="text-sm font-bold font-mono text-amber-300 mt-1">
              ₹{activeSubElement.boqItems.reduce((acc, i) => acc + i.amountINR, 0).toLocaleString("en-IN")}.00
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">CPWD DSR Itemized Rate Ledger</div>
          </div>
        </div>

        {/* 5. GRANULAR BOQ ITEMIZATION TABLE */}
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Item Code</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3 text-right">CPWD Rate (₹)</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3">Quality Standard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {activeSubElement.boqItems.map((item) => (
                <tr key={item.itemCode} className="hover:bg-slate-900/60 transition">
                  <td className="py-2 px-3 text-cyan-400 font-bold">{item.itemCode}</td>
                  <td className="py-2 px-3 text-slate-300">{item.description}</td>
                  <td className="py-2 px-3 text-right text-slate-200">{item.quantity.toLocaleString("en-IN")}</td>
                  <td className="py-2 px-3 text-slate-400">{item.unit}</td>
                  <td className="py-2 px-3 text-right text-slate-300">₹{item.rateINR.toLocaleString("en-IN")}</td>
                  <td className="py-2 px-3 text-right text-amber-300 font-bold">₹{item.amountINR.toLocaleString("en-IN")}</td>
                  <td className="py-2 px-3 text-emerald-400">{item.qualityStandard}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. REALITY CAPTURE CAMERA EVIDENCE MODAL */}
      {activeCamera && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">Field Reality Capture Feed</span>
                <h4 className="text-base font-bold text-white">{activeCamera.name}</h4>
              </div>
              <button
                onClick={() => setActiveCamera(null)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Simulated Live Camera Frame */}
            <div className="relative w-full h-56 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/40 via-transparent to-slate-900/50 pointer-events-none"></div>
              {/* Telemetry Reticle */}
              <div className="absolute top-3 left-3 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE SENSOR TELEMETRY (26.7794°N, 80.9982°E)
              </div>
              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-full border-2 border-purple-500/60 mx-auto flex items-center justify-center text-purple-300 mb-2">
                  📷
                </div>
                <div className="text-xs text-slate-300 font-mono">Geofenced Computer Vision Capture</div>
                <div className="text-[10px] text-slate-500 mt-1">Laser Tolerance: ±1.2mm • Pour Card `#PC-2026-L1-04` Verified</div>
              </div>
            </div>

            {/* Evidence Specs */}
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Capture Timestamp:</span>
                <span className="text-slate-200">{activeCamera.latestCapture.timestamp}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Deviation from 3D BIM:</span>
                <span className="text-emerald-400 font-bold">{activeCamera.latestCapture.verifiedDeviationMm} mm (Tolerance: ±5.0mm)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Hermes Ledger Hash:</span>
                <span className="text-cyan-400 truncate max-w-xs">{activeCamera.latestCapture.sha256}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveCamera(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded transition"
              >
                Close Viewport
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
ENGINE_V2_EOF

echo "✓ Upgraded components/bim/FullBimSimulationEngine.tsx with Sub-Element BOQ & Dual-Track 4D"
