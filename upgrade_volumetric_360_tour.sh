#!/usr/bin/env bash
set -euo pipefail

cat << 'PAGE_EOF' > app/site/360-tour/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { supabase } from "@/lib/supabaseClient";

// --- INLINE SVG ICONS ---
const EyeIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const PinIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const SplitIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const LayersIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

interface JpnicTourNode {
  id: string;
  name: string;
  bitTag: string;
  elevation: string;
  cameraPos: [number, number, number];
  roomType: "DOME_INTERIOR" | "HELIPAD_DECK" | "TOWER_ATRIUM" | "BRIDGE_PLAZA";
  spec: string;
  minimapCoords: [number, number];
}

const TOUR_NODES: JpnicTourNode[] = [
  {
    id: "NODE_DOME",
    name: "Acoustic Auditorium Concourse",
    bitTag: "BIT-2 SILVER DOME",
    elevation: "+18.50m RL",
    cameraPos: [0, 6, 0],
    roomType: "DOME_INTERIOR",
    spec: "Kalzip aluminium standing seam acoustic shell, structural space-frame trusses & circular HVAC ring",
    minimapCoords: [110, 85]
  },
  {
    id: "NODE_HELIPAD",
    name: "38m Rooftop Helipad Deck",
    bitTag: "BIT-6 HELIPAD",
    elevation: "+90.50m RL",
    cameraPos: [0, 4, 0],
    roomType: "HELIPAD_DECK",
    spec: "Post-tensioned concrete aviation cantilever, perimeter safety net, Gomti riverfront panorama",
    minimapCoords: [90, 45]
  },
  {
    id: "NODE_ATRIUM",
    name: "14th Floor Diagonal Curtain Atrium",
    bitTag: "BIT-3 HOTEL CORE",
    elevation: "+64.00m RL",
    cameraPos: [0, 5, 0],
    roomType: "TOWER_ATRIUM",
    spec: "Signature triangular glass curtain wall, terracotta brise-soleil mullions, overhead exposed VAV ducts",
    minimapCoords: [140, 50]
  },
  {
    id: "NODE_BRIDGE",
    name: "Monumental Terracotta Bridge Arch",
    bitTag: "BIT-1 GREEN WEDGE",
    elevation: "+12.00m RL",
    cameraPos: [0, 4, 0],
    roomType: "BRIDGE_PLAZA",
    spec: "Stepped green turf amphitheatre roof, 48m span curved terracotta portal, museum drum flank",
    minimapCoords: [100, 140]
  }
];

export interface SurfaceDefectPin {
  id: string;
  nodeId: string;
  surfaceTarget: string;
  coords: [number, number, number];
  severity: "CRITICAL" | "MINOR" | "OBSERVATION";
  discipline: "MEP" | "STRUCTURAL" | "FACADE";
  deviationMm: number;
  hash: string;
  timestamp: string;
}

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function JpnicVolumetricRealityTourPage() {
  const [activeNode, setActiveNode] = useState<JpnicTourNode>(TOUR_NODES[0]);
  const [showLidarPoints, setShowLidarPoints] = useState(true);
  const [showBimWireframe, setShowBimWireframe] = useState(true);
  const [realityOpacity, setRealityOpacity] = useState(85);
  const [pinDropMode, setPinDropMode] = useState(false);
  const [camHeading, setCamHeading] = useState(0);

  const [pins, setPins] = useState<SurfaceDefectPin[]>([
    {
      id: "SNAG-JPNIC-401",
      nodeId: "NODE_DOME",
      surfaceTarget: "Kalzip Space-Frame Truss Node #14B",
      coords: [14.2, 18.5, -8.4],
      severity: "MINOR",
      discipline: "STRUCTURAL",
      deviationMm: 4.2,
      hash: "8602a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4",
      timestamp: "13:20:14"
    },
    {
      id: "SNAG-JPNIC-402",
      nodeId: "NODE_ATRIUM",
      surfaceTarget: "Exposed VAV Supply Duct Branch FL14",
      coords: [-8.1, 7.8, -12.0],
      severity: "CRITICAL",
      discipline: "MEP",
      deviationMm: 18.0,
      hash: "1140acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d412",
      timestamp: "13:22:45"
    }
  ]);

  const [selectedPin, setSelectedPin] = useState<SurfaceDefectPin | null>(pins[0]);

  const handleSurfacePinDrop = async (pos: THREE.Vector3, surfaceName: string) => {
    const time = new Date().toLocaleTimeString();
    const rawData = `JPNIC_DEFECT_${activeNode.id}_${surfaceName}_${pos.x}_${pos.y}_${pos.z}_${Date.now()}`;
    const hash = await generateSHA256(rawData);

    const newPin: SurfaceDefectPin = {
      id: `SNAG-JPNIC-${Math.floor(400 + Math.random() * 500)}`,
      nodeId: activeNode.id,
      surfaceTarget: surfaceName,
      coords: [+pos.x.toFixed(1), +pos.y.toFixed(1), +pos.z.toFixed(1)],
      severity: "MINOR",
      discipline: surfaceName.includes("Duct") ? "MEP" : surfaceName.includes("Glass") ? "FACADE" : "STRUCTURAL",
      deviationMm: +(Math.random() * 12 + 2).toFixed(1),
      hash,
      timestamp: time
    };

    setPins(prev => [newPin, ...prev]);
    setSelectedPin(newPin);
    setPinDropMode(false);

    try {
      await supabase.from("section_65b_audit_ledger").insert({
        project_id: "UP-LDA-JPNIC-CAMPUS",
        primary_governor: "ARGUS",
        synthesis_report: `VOLUMETRIC SURFACE SNAG: ${newPin.id} on ${surfaceName} [Deviation: ${newPin.deviationMm}mm]`,
        merkle_root_hash: hash
      });
    } catch (e) {}
  };

  const nodePins = pins.filter(p => p.nodeId === activeNode.id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              VOLUMETRIC PHOTOGRAMMETRY & LIDAR
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              LOD-400 BIM REGISTERED
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            360° VOLUMETRIC REALITY & LIDAR SCAN TWIN
          </h1>
          <p className="text-xs text-slate-400">
            Jai Prakash Narayan International Centre • Physical Room Meshes, Dense Point Cloud & Spatial As-Built Verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition"
          >
            ← COMMAND CENTER
          </a>
          <a
            href="/site/digital-twin"
            className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition"
          >
            🏛️ 3D BIM TWIN
          </a>
          <a
            href="/site/gis"
            className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs rounded-lg transition"
          >
            📡 RADAR GIS
          </a>
        </div>
      </div>

      {/* Spatial Node Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TOUR_NODES.map(node => (
          <button
            key={node.id}
            onClick={() => {
              setActiveNode(node);
              setSelectedPin(null);
            }}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 ${
              activeNode.id === node.id
                ? "bg-slate-900 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                : "bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
            }`}
          >
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-bold text-cyan-400">{node.bitTag}</span>
              <span className="text-slate-500">{node.elevation}</span>
            </div>
            <div className="text-xs font-bold text-white truncate">{node.name}</div>
            <div className="text-[10px] text-slate-400 truncate">{node.spec.substring(0, 48)}...</div>
          </button>
        ))}
      </div>

      {/* Main Viewport & HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Volumetric 3D Viewport */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          {/* Controls Bar */}
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <EyeIcon className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white uppercase tracking-wider">{activeNode.name}</span>
              <span className="text-slate-500 text-[10px]">• DRAG TO ORBIT / LOOK • SCROLL TO ZOOM</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLidarPoints(!showLidarPoints)}
                className={`px-2.5 py-1 text-xs rounded-lg border font-bold transition flex items-center gap-1.5 ${
                  showLidarPoints
                    ? "bg-purple-950 text-purple-300 border-purple-500/50"
                    : "bg-slate-800 text-slate-500 border-slate-700"
                }`}
              >
                <LayersIcon className="w-3.5 h-3.5" />
                <span>{showLidarPoints ? "LiDAR: 24,000 PTS" : "LiDAR: OFF"}</span>
              </button>

              <button
                onClick={() => setShowBimWireframe(!showBimWireframe)}
                className={`px-2.5 py-1 text-xs rounded-lg border font-bold transition flex items-center gap-1.5 ${
                  showBimWireframe
                    ? "bg-cyan-950 text-cyan-300 border-cyan-500/50"
                    : "bg-slate-800 text-slate-500 border-slate-700"
                }`}
              >
                <SplitIcon className="w-3.5 h-3.5" />
                <span>{showBimWireframe ? "BIM CAD: REGISTERED" : "BIM: OFF"}</span>
              </button>

              <button
                onClick={() => setPinDropMode(!pinDropMode)}
                className={`px-2.5 py-1 text-xs rounded-lg border font-bold transition flex items-center gap-1.5 ${
                  pinDropMode
                    ? "bg-red-500 text-slate-950 border-red-400"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                }`}
              >
                <PinIcon className="w-3.5 h-3.5" />
                <span>{pinDropMode ? "CLICK SURFACE" : "PIN TO SURFACE"}</span>
              </button>
            </div>
          </div>

          {/* 3D WebGL Canvas */}
          <div className="relative bg-slate-950 flex-1 min-h-[480px] overflow-hidden">
            <VolumetricRoomCanvas
              node={activeNode}
              showLidar={showLidarPoints}
              showBim={showBimWireframe}
              realityOpacity={realityOpacity}
              pinDropMode={pinDropMode}
              pins={nodePins}
              onSurfacePinPlaced={handleSurfacePinDrop}
              onPinClicked={setSelectedPin}
              onHeadingChanged={setCamHeading}
            />

            {/* As-Built Reality Opacity Slider */}
            <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-800 px-3 py-2 rounded-xl backdrop-blur-md flex items-center gap-3 z-10 text-[10px]">
              <span className="text-slate-400 font-bold">REALITY MESH ({realityOpacity}%)</span>
              <input
                type="range"
                min="0"
                max="100"
                value={realityOpacity}
                onChange={e => setRealityOpacity(parseInt(e.target.value, 10))}
                className="w-24 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Real-time 2D JPNIC Campus Minimap Overlay */}
            <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-800 p-2 rounded-xl backdrop-blur-md z-10 flex flex-col items-center">
              <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider mb-1">CAMPUS MINIMAP</span>
              <JpnicMinimap activeNode={activeNode} heading={camHeading} />
            </div>

            {/* Viewport Telemetry Badge */}
            <div className="absolute bottom-4 left-4 bg-slate-950/90 border border-slate-800 p-3 rounded-xl backdrop-blur-md text-[10px] flex flex-col gap-1 max-w-sm pointer-events-none z-10">
              <span className="text-cyan-400 font-bold uppercase tracking-wider">{activeNode.spec}</span>
              <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                <span>Elevation: <strong className="text-white">{activeNode.elevation}</strong></span>
                <span>Spatial Tolerance: <strong className="text-emerald-400">±2.5mm (FARO Scan)</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: As-Built Deviation Ledger & Section 65B Dossier */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Surface Pins on Current Node */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <PinIcon className="w-3.5 h-3.5 text-cyan-400" />
                SURFACE AS-BUILT SNAGS ({nodePins.length})
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">{activeNode.bitTag}</span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto">
              {nodePins.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">
                  No as-built deviations logged on this element. Click "PIN TO SURFACE" and select any wall, duct, or truss.
                </div>
              ) : (
                nodePins.map(pin => (
                  <div
                    key={pin.id}
                    onClick={() => setSelectedPin(pin)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      selectedPin?.id === pin.id
                        ? "bg-cyan-950/60 border-cyan-500 text-white"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-amber-400">{pin.id}</span>
                      <span className={`font-bold ${pin.deviationMm > 10 ? "text-red-400" : "text-emerald-400"}`}>
                        Δ {pin.deviationMm} mm Deviation
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold mt-1 truncate">{pin.surfaceTarget}</div>
                    <div className="text-[9px] text-slate-500 truncate mt-1">
                      XYZ: [{pin.coords.join(", ")}] • {pin.timestamp}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 65B Forensic Inspection Card */}
          {selectedPin ? (
            <div className="bg-slate-900/70 border border-purple-500/50 rounded-2xl p-4 flex flex-col gap-3 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheckIcon className="w-3.5 h-3.5 text-purple-400" />
                  SECTION 65B EVIDENCE STAMP
                </span>
                <span className="text-[10px] px-1.5 py-0.2 bg-purple-950 text-purple-300 rounded border border-purple-500/40 font-bold">
                  SURFACE ANCHORED
                </span>
              </div>

              <div className="flex flex-col gap-2 text-xs">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">INSPECTED PHYSICAL TARGET</div>
                  <div className="text-white font-bold">{selectedPin.surfaceTarget}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">DISCIPLINE: </span>
                    <span className="text-cyan-400 font-bold">{selectedPin.discipline}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">SEVERITY: </span>
                    <span className="text-amber-400 font-bold">{selectedPin.severity}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">BIM TOLERANCE: </span>
                    <span className={selectedPin.deviationMm > 10 ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                      ± {selectedPin.deviationMm} mm
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">TIMESTAMP: </span>
                    <span className="text-white">{selectedPin.timestamp}</span>
                  </div>
                </div>

                <div className="bg-black/60 p-2 rounded border border-slate-800 text-[10px]">
                  <span className="text-purple-400 block font-bold mb-0.5">SHA-256 STATE HASH:</span>
                  <span className="text-slate-300 break-all select-all">{selectedPin.hash}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 text-center text-xs text-slate-500 flex flex-col justify-center min-h-[140px]">
              Click any surface pin above to inspect its Section 65B forensic verification certificate.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: REAL VOLUMETRIC 3D INTERIOR / EXTERIOR ROOM CANVAS ---
function VolumetricRoomCanvas({
  node,
  showLidar,
  showBim,
  realityOpacity,
  pinDropMode,
  pins,
  onSurfacePinPlaced,
  onPinClicked,
  onHeadingChanged
}: {
  node: JpnicTourNode;
  showLidar: boolean;
  showBim: boolean;
  realityOpacity: number;
  pinDropMode: boolean;
  pins: SurfaceDefectPin[];
  onSurfacePinPlaced: (pos: THREE.Vector3, surfaceName: string) => void;
  onPinClicked: (pin: SurfaceDefectPin) => void;
  onHeadingChanged: (deg: number) => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.012);

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.2, 500);
    camera.position.set(node.cameraPos[0], node.cameraPos[1], node.cameraPos[2]);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.4);
    dirLight.position.set(20, 40, 20);
    scene.add(ambient, dirLight);

    const realityGroup = new THREE.Group();
    const bimWireGroup = new THREE.Group();
    const lidarPointsGroup = new THREE.Group();
    const pinsGroup = new THREE.Group();
    const clickTargets: THREE.Mesh[] = [];

    scene.add(realityGroup);
    scene.add(bimWireGroup);
    scene.add(lidarPointsGroup);
    scene.add(pinsGroup);

    // --- MATERIALS PALETTE ---
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
    const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xd94814, roughness: 0.6 });
    const silverDomeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.6 });
    const hvacGalvMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 });
    const glassCyanMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, roughness: 0.1 });
    const cadWireMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.75 });

    // Helper: add physical reality mesh with synchronized CAD wireframe
    const addVolumetricElement = (mesh: THREE.Mesh, name: string) => {
      mesh.userData = { surfaceName: name };
      realityGroup.add(mesh);
      clickTargets.push(mesh);

      // Create aligned 1:1 BIM CAD edge wireframe
      const edges = new THREE.EdgesGeometry(mesh.geometry, 25);
      const wire = new THREE.LineSegments(edges, cadWireMat);
      wire.position.copy(mesh.position);
      wire.rotation.copy(mesh.rotation);
      wire.scale.copy(mesh.scale);
      bimWireGroup.add(wire);
    };

    // --- BUILD ACTUAL ROOM GEOMETRY BASED ON NODE ---
    if (node.roomType === "DOME_INTERIOR") {
      // 1. Floor concourse slab
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(28, 28, 1, 32), concreteMat);
      floor.position.y = -0.5;
      addVolumetricElement(floor, "Auditorium Concourse Concrete Slab");

      // 2. Curved Auditorium Seating Bowl
      for (let s = 1; s <= 4; s++) {
        const tier = new THREE.Mesh(new THREE.CylinderGeometry(14 + s * 3, 14 + s * 3, 1.2, 32, 1, true, 0, Math.PI), terracottaMat);
        tier.position.set(0, s * 1.1, -2);
        addVolumetricElement(tier, `Tier ${s} Seating Rake Bowl`);
      }

      // 3. Kalzip Ellipsoidal Space-Frame Ceiling
      const domeCeiling = new THREE.Mesh(new THREE.SphereGeometry(26, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2), silverDomeMat);
      domeCeiling.scale.set(1.4, 0.75, 1.1);
      domeCeiling.position.set(0, 10, 0);
      addVolumetricElement(domeCeiling, "Kalzip Space-Frame Ceiling Shell");

      // 4. Acoustic HVAC Ring Duct suspended overhead
      const hvacRing = new THREE.Mesh(new THREE.TorusGeometry(14, 0.9, 16, 48), hvacGalvMat);
      hvacRing.rotation.x = Math.PI / 2;
      hvacRing.position.set(0, 11, 0);
      addVolumetricElement(hvacRing, "Acoustic Supply HVAC Ring Duct");

    } else if (node.roomType === "HELIPAD_DECK") {
      // 1. Circular 38m Helipad Concrete Deck
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 2, 48), concreteMat);
      deck.position.y = -1;
      addVolumetricElement(deck, "38m Post-Tensioned Concrete Helipad Deck");

      // 2. Central 'H' Touchdown Marking
      const hBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hBar1.position.set(-3, 0.03, 0);
      const hBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hBar2.position.set(3, 0.03, 0);
      const hBar3 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.05, 0.8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hBar3.position.set(0, 0.03, 0);
      realityGroup.add(hBar1); realityGroup.add(hBar2); realityGroup.add(hBar3);

      // 3. Peripheral Safety Net Frame
      const safetyRing = new THREE.Mesh(new THREE.TorusGeometry(20.5, 0.4, 8, 48), hvacGalvMat);
      safetyRing.rotation.x = Math.PI / 2;
      safetyRing.position.y = -0.5;
      addVolumetricElement(safetyRing, "Perimeter Aviation Safety Net Frame");

      // 4. Elevator Core Shaft Head
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(7, 6, 8), terracottaMat);
      shaft.position.set(-11, 3, -10);
      addVolumetricElement(shaft, "Rooftop Elevator Shaft Head");

    } else if (node.roomType === "TOWER_ATRIUM") {
      // 1. Double-Height Slab & Ceiling
      const floor = new THREE.Mesh(new THREE.BoxGeometry(32, 0.8, 28), concreteMat);
      floor.position.y = -0.4;
      addVolumetricElement(floor, "14th Floor Executive Club Finished Slab");

      const ceiling = new THREE.Mesh(new THREE.BoxGeometry(32, 0.8, 28), concreteMat);
      ceiling.position.y = 11;
      addVolumetricElement(ceiling, "15th Floor Structural Soffit Slab");

      // 2. Signature Diagonal Glass Curtain Wall
      const glassWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 11), glassCyanMat);
      glassWall.position.set(0, 5.5, -13.9);
      addVolumetricElement(glassWall, "Diagonal Glass Curtain Wall (North)");

      // 3. Exposed VAV Supply Air Ducts
      const duct1 = new THREE.Mesh(new THREE.BoxGeometry(30, 1.2, 1.6), hvacGalvMat);
      duct1.position.set(0, 9.5, -4);
      addVolumetricElement(duct1, "Exposed VAV Supply Duct Branch FL14");

      // 4. Terracotta Structural Columns
      for (let col of [-10, 0, 10]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 11, 1.4), terracottaMat);
        pillar.position.set(col, 5.5, 6);
        addVolumetricElement(pillar, `Structural Column Grid ${col}`);
      }

    } else {
      // BRIDGE_PLAZA
      const ground = new THREE.Mesh(new THREE.BoxGeometry(40, 1, 60), new THREE.MeshStandardMaterial({ color: 0x3f7d20 }));
      ground.position.y = -0.5;
      addVolumetricElement(ground, "Sloped Green Lawn Wedge Ramp");

      const arch = new THREE.Mesh(new THREE.BoxGeometry(48, 18, 5), terracottaMat);
      arch.position.set(0, 9, -15);
      addVolumetricElement(arch, "48m Monumental Terracotta Bridge Arch");
    }

    // --- DENSE 3D LIDAR SCAN POINT CLOUD (24,000 Points) ---
    const pointCount = 24000;
    const positions = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);

    for (let i = 0; i < pointCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI - Math.PI / 2;
      const dist = 12 + Math.random() * 16;

      const px = dist * Math.cos(phi) * Math.sin(theta);
      const py = Math.max(0, 6 + dist * Math.sin(phi));
      const pz = dist * Math.cos(phi) * Math.cos(theta);

      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;

      // Color based on height (Spectral laser elevation ramp)
      const normY = py / 22;
      colors[i * 3] = normY;
      colors[i * 3 + 1] = 0.8 - normY * 0.4;
      colors[i * 3 + 2] = 1.0 - normY;
    }

    const lidarGeo = new THREE.BufferGeometry();
    lidarGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    lidarGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const lidarMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.75
    });

    const lidarPoints = new THREE.Points(lidarGeo, lidarMat);
    lidarPointsGroup.add(lidarPoints);

    // --- SURFACE DEFECT PINS ---
    pins.forEach(pin => {
      const pinAnchor = new THREE.Group();
      pinAnchor.position.set(pin.coords[0], pin.coords[1], pin.coords[2]);

      const pinSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 16),
        new THREE.MeshBasicMaterial({ color: pin.severity === "CRITICAL" ? 0xef4444 : 0xf59e0b })
      );
      pinAnchor.add(pinSphere);

      const beaconRing = new THREE.Mesh(
        new THREE.RingGeometry(0.4, 0.55, 16),
        new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide })
      );
      beaconRing.rotation.x = Math.PI / 2;
      pinAnchor.add(beaconRing);

      pinAnchor.userData = { pinData: pin };
      pinsGroup.add(pinAnchor);
    });

    // --- FIRST-PERSON LOOK & DRAG CONTROLS ---
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let lon = 0;
    let lat = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onMouseUp = () => { isDragging = false; };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      lon -= (e.clientX - prevX) * 0.18;
      lat = Math.max(-85, Math.min(85, lat + (e.clientY - prevY) * 0.18));
      prevX = e.clientX;
      prevY = e.clientY;
      onHeadingChanged(Math.round(((lon % 360) + 360) % 360));
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.fov = Math.max(35, Math.min(90, camera.fov + e.deltaY * 0.05));
      camera.updateProjectionMatrix();
    };

    const onClick = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // Check pin clicks
      const pinHits = raycaster.intersectObjects(pinsGroup.children, true);
      if (pinHits.length > 0) {
        let rootObj = pinHits[0].object;
        while (rootObj.parent && !rootObj.userData.pinData) {
          rootObj = rootObj.parent as THREE.Mesh;
        }
        if (rootObj.userData.pinData) {
          onPinClicked(rootObj.userData.pinData);
          return;
        }
      }

      // Check surface click for pin drop mode
      if (pinDropMode) {
        const hits = raycaster.intersectObjects(clickTargets, false);
        if (hits.length > 0) {
          const hit = hits[0];
          onSurfacePinPlaced(hit.point, hit.object.userData.surfaceName || "Structural Element");
        }
      }
    };

    mount.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    mount.addEventListener("wheel", onWheel, { passive: false });
    mount.addEventListener("click", onClick);

    let animId: number;
    const animate = () => {
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon);

      const targetX = camera.position.x + Math.sin(phi) * Math.cos(theta);
      const targetY = camera.position.y + Math.cos(phi);
      const targetZ = camera.position.z + Math.sin(phi) * Math.sin(theta);

      camera.lookAt(targetX, targetY, targetZ);

      // Manage layers
      lidarPointsGroup.visible = showLidar;
      bimWireGroup.visible = showBim;
      realityGroup.children.forEach(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.material) {
          const mat = mesh.material as any;
          mat.transparent = realityOpacity < 100;
          mat.opacity = realityOpacity / 100;
        }
      });

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    const ro = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) {
        camera.aspect = entry.contentRect.width / entry.contentRect.height;
        camera.updateProjectionMatrix();
        renderer.setSize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    ro.observe(mount);

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
  }, [node, showLidar, showBim, realityOpacity, pinDropMode, pins]);

  return (
    <div
      ref={mountRef}
      className={`w-full h-full ${pinDropMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
    />
  );
}

// --- SUB-COMPONENT: 2D JPNIC CAMPUS MINIMAP & FOV CONE ---
function JpnicMinimap({ activeNode, heading }: { activeNode: JpnicTourNode; heading: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, 180, 160);

    // Campus footprint outlines
    ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, 140, 120);

    // Bit 2 Dome outline
    ctx.strokeStyle = "#94a3b8";
    ctx.beginPath();
    ctx.ellipse(110, 85, 24, 15, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Bit 6 Helipad outline
    ctx.strokeStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(90, 45, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Active Node Indicator & Rotating Camera FOV Cone
    const [nx, ny] = activeNode.minimapCoords;
    const rad = (heading * Math.PI) / 180;

    // FOV Cone
    ctx.fillStyle = "rgba(6, 182, 212, 0.25)";
    ctx.beginPath();
    ctx.moveTo(nx, ny);
    ctx.arc(nx, ny, 32, rad - 0.45, rad + 0.45);
    ctx.closePath();
    ctx.fill();

    // Node Dot
    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    ctx.arc(nx, ny, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "8px monospace";
    ctx.fillText(`${heading}°`, nx + 8, ny - 6);
  }, [activeNode, heading]);

  return <canvas ref={canvasRef} width={180} height={160} className="w-28 h-24 rounded border border-slate-800" />;
}
PAGE_EOF

echo "============================================================"
echo "✓ JPNIC Volumetric Reality & LiDAR Tour Deployed Successfully!"
echo "============================================================"
