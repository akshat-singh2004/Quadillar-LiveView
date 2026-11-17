#!/usr/bin/env bash
set -euo pipefail

cat << 'PAGE_EOF' > app/site/digital-twin/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const BoxIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const RefreshIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface SpatialZone {
  id: string;
  name: string;
  altitude: string;
  footprint: string;
  description: string;
  status: string;
}

const VANGUARD_SPATIAL_ZONES: SpatialZone[] = [
  { id: "ZONE_A", name: "Zone A: Foundation & Subgrade", altitude: "0.0m - 2.5m RL", footprint: "1,200 m²", description: "Sub-grade concrete slabs, footing beams, dewatering, and ground anchor retention", status: "COMPLETED" },
  { id: "ZONE_B", name: "Zone B: Ground Level Podium", altitude: "2.5m - 6.5m RL", footprint: "1,200 m²", description: "Retail lobby, load bearing pillars, facade glazed structures, and parking apron", status: "ACTIVE" },
  { id: "ZONE_C", name: "Zone C: 3-Story Superstructure", altitude: "6.5m - 12.5m RL", footprint: "3,600 m²", description: "Steel H-Beam structural frameworks, reinforced floor slabs, and masonry core walls", status: "ACTIVE" },
  { id: "ZONE_D", name: "Zone D: Roof & Mechanical Plant", altitude: "12.5m - 15.0m RL", footprint: "1,200 m²", description: "HVAC chillers, overhanging safety canopy, solar panel layouts, and aviation beacons", status: "SCHEDULED" }
];

export default function VanguardDigitalTwinPage() {
  const [modelStatus, setModelStatus] = useState<"LOADING" | "LOADED_FILE" | "LOADED_FALLBACK" | "ERROR">("LOADING");
  const [modelMetrics, setModelMetrics] = useState({ w: 40.0, h: 15.0, d: 30.0 });
  const [selectedZone, setSelectedZone] = useState<SpatialZone | null>(null);
  const [renderMode, setRenderMode] = useState<"REALISTIC" | "XRAY_WIREFRAME" | "MINERVA_CLASH">("REALISTIC");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              LOD-400 AS-BUILT TWIN (CDE)
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              AUTO-CENTERED & NORMALIZED
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            VANGUARD 3D DIGITAL TWIN (CDE)
          </h1>
          <p className="text-xs text-slate-400">
            Structural shell merged with procedurally generated internal MEP, HVAC, and Core layers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">NORMALIZED HEIGHT</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">{modelMetrics.h} m</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Absolute Y-Axis Elevation</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">NORMALIZED WIDTH</div>
          <div className="text-xl font-bold text-white mt-1">{modelMetrics.w} m</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Absolute X-Axis Scale</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">NORMALIZED DEPTH</div>
          <div className="text-xl font-bold text-white mt-1">{modelMetrics.d} m</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Absolute Z-Axis Space</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">PROCEDURAL MEP INJECTION</div>
          <div className="text-sm font-bold text-emerald-400 mt-1.5">INTERNALS SYNCED</div>
          <div className="text-[10px] text-slate-500 mt-0.5">HVAC & Core Initialized</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col min-h-[500px]">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <BoxIcon className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white uppercase tracking-wider">
                {selectedZone ? selectedZone.name : "COMPLETE 3D VANGUARD ENVELOPE"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <button onClick={() => setRenderMode("REALISTIC")} className={`px-2 py-0.5 rounded ${renderMode === "REALISTIC" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "text-slate-400"}`}>REALISTIC</button>
              <button onClick={() => setRenderMode("XRAY_WIREFRAME")} className={`px-2 py-0.5 rounded ${renderMode === "XRAY_WIREFRAME" ? "bg-purple-500/20 text-purple-400 border border-purple-500/40" : "text-slate-400"}`}>X-RAY BIM</button>
              <button onClick={() => setRenderMode("MINERVA_CLASH")} className={`px-2 py-0.5 rounded ${renderMode === "MINERVA_CLASH" ? "bg-red-500/20 text-red-400 border border-red-500/40" : "text-slate-400"}`}>CLASH DETECTION</button>
              
              <span className="h-3 w-px bg-slate-800 inline-block mx-1" />
              
              {modelStatus === "LOADING" && <span className="text-amber-400 flex items-center gap-1"><RefreshIcon className="animate-spin" /> LOADING MESH...</span>}
              {modelStatus === "LOADED_FILE" && <span className="text-emerald-400">GLB ACTIVE</span>}
            </div>
          </div>

          <div className="relative bg-slate-950 flex-1 overflow-hidden min-h-[460px]">
            <VanguardBimCanvas 
              selectedZone={selectedZone} 
              renderMode={renderMode} 
              onStatusChange={setModelStatus}
              onMetricsCalculated={setModelMetrics}
            />
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-white border-b border-slate-800 pb-2 uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block"></span>
              SPATIAL CALIBRATION ZONES
            </span>
            <div className="flex flex-col gap-2">
              {VANGUARD_SPATIAL_ZONES.map(zone => {
                const isSelected = selectedZone?.id === zone.id;
                return (
                  <div
                    key={zone.id}
                    onClick={() => setSelectedZone(isSelected ? null : zone)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                      isSelected 
                        ? "bg-slate-900 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-cyan-400">{zone.altitude}</span>
                      <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${zone.status === "COMPLETED" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20" : "bg-amber-950 text-amber-400 border border-amber-500/20"}`}>
                        {zone.status}
                      </span>
                    </div>
                    <div className="text-white font-semibold mt-1 text-xs">{zone.name}</div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-normal">{zone.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VanguardBimCanvas({
  selectedZone,
  renderMode,
  onStatusChange,
  onMetricsCalculated
}: {
  selectedZone: SpatialZone | null;
  renderMode: "REALISTIC" | "XRAY_WIREFRAME" | "MINERVA_CLASH";
  onStatusChange: (status: "LOADING" | "LOADED_FILE" | "LOADED_FALLBACK" | "ERROR") => void;
  onMetricsCalculated: (metrics: {w: number, h: number, d: number}) => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.012);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(24, 18, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff3e0, 1.8);
    sunLight.position.set(30, 45, 15);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const floorGrid = new THREE.GridHelper(120, 40, 0x1e293b, 0x0f172a);
    scene.add(floorGrid);

    const glbLoader = new GLTFLoader();
    
    // Store references to the external model and internal generated MEP
    let externalShell: THREE.Group | null = null;
    let internalBimGroup = new THREE.Group();
    scene.add(internalBimGroup);
    
    // Elements specifically grouped for clash rendering
    let clashNodes: THREE.Mesh[] = [];

    glbLoader.load(
      "/building.gltf",
      (gltf) => {
        externalShell = gltf.scene;
        const box = new THREE.Box3().setFromObject(externalShell);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 15 / maxDim;
        externalShell.scale.setScalar(scale);

        const scaledBox = new THREE.Box3().setFromObject(externalShell);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        const finalSize = scaledBox.getSize(new THREE.Vector3());
        
        externalShell.position.sub(scaledCenter);
        externalShell.position.y += (finalSize.y / 2);

        // Standardize materials so we can alter opacity dynamically
        externalShell.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            // Ensure materials can be made transparent
            if (Array.isArray(mesh.material)) {
               mesh.material.forEach(m => m.transparent = true);
            } else {
               mesh.material.transparent = true;
            }
          }
        });
        scene.add(externalShell);

        // ==========================================
        // PROCEDURAL MEP & INTERNAL INJECTION
        // ==========================================
        
        // 1. Concrete Elevator/Stair Core
        const coreGeo = new THREE.BoxGeometry(finalSize.x * 0.15, finalSize.y * 0.95, finalSize.z * 0.2);
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(0, finalSize.y / 2, 0);
        
        // Add wireframe to core
        const coreEdges = new THREE.LineSegments(
          new THREE.EdgesGeometry(coreGeo),
          new THREE.LineBasicMaterial({ color: 0x06b6d4, opacity: 0.5, transparent: true })
        );
        core.add(coreEdges);
        internalBimGroup.add(core);

        // 2. Primary HVAC Chilled Water Supply Ducts (Cyan)
        for (let i = 1; i <= 3; i++) {
          const ductLevelY = (finalSize.y / 4) * i;
          const duct = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, finalSize.x * 0.8),
            new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.6 })
          );
          duct.rotation.z = Math.PI / 2;
          duct.position.set(0, ductLevelY, finalSize.z * 0.15);
          internalBimGroup.add(duct);
        }

        // 3. Fire Suppression / Sprinkler Riser Pipes (Red)
        const firePipe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, finalSize.y * 0.9),
          new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8 })
        );
        firePipe.position.set(finalSize.x * 0.2, finalSize.y / 2, -finalSize.z * 0.1);
        internalBimGroup.add(firePipe);

        // 4. Clash Detection Spheres (intersecting the duct and core)
        const clashPoint = new THREE.Mesh(
          new THREE.SphereGeometry(0.7, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true })
        );
        clashPoint.position.set(finalSize.x * 0.075, finalSize.y / 4, finalSize.z * 0.15);
        clashNodes.push(clashPoint);
        internalBimGroup.add(clashPoint);

        onMetricsCalculated({ w: +finalSize.x.toFixed(1), h: +finalSize.y.toFixed(1), d: +finalSize.z.toFixed(1) });
        controls.target.set(0, finalSize.y / 2, 0);
        camera.position.set(finalSize.x * 1.5, finalSize.y * 1.5, finalSize.z * 1.8);
        
        onStatusChange("LOADED_FILE");
      },
      undefined,
      (err) => {
        console.error("GLTF Load Error", err);
        onStatusChange("ERROR");
      }
    );

    let animId: number;
    const animate = () => {
      controls.update();

      // Dynamic Render Mode Handling
      if (externalShell) {
        externalShell.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            
            mats.forEach(mat => {
              if (renderMode === "XRAY_WIREFRAME") {
                mat.opacity = 0.15;
                mat.wireframe = true;
              } else if (renderMode === "MINERVA_CLASH") {
                mat.opacity = 0.25;
                mat.wireframe = false;
              } else {
                mat.opacity = 1.0;
                mat.wireframe = false;
              }
            });
          }
        });
      }

      // Toggle visibility of our procedural internals
      if (renderMode === "REALISTIC") {
        internalBimGroup.visible = false;
      } else {
        internalBimGroup.visible = true;
        // Pulse the clash nodes if in Clash Mode
        clashNodes.forEach(node => {
          node.visible = renderMode === "MINERVA_CLASH";
          if (node.visible) {
            const scale = 1 + Math.sin(Date.now() * 0.005) * 0.2;
            node.scale.set(scale, scale, scale);
          }
        });
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    const resizeSub = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resizeSub);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resizeSub);
      controls.dispose();
      renderer.dispose();
    };
  }, [renderMode]);

  return <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />;
}
PAGE_EOF

cp app/site/digital-twin/page.tsx app/digital-twin/page.tsx
cp app/site/digital-twin/page.tsx app/site/bim/page.tsx

echo "============================================================"
echo "✓ Procedural MEP/HVAC successfully injected into GLB loader!"
echo "============================================================"
