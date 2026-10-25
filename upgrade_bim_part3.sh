#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: BIM ENGINE PHASE 3 (REALITY CAPTURE & BOQ LEDGER)
# Features: 3D Camera Waypoints, Evidence Modals, and CPWD BOQ Itemization
# ==============================================================================

set -euo pipefail

cat << 'ENGINE_V5_EOF' > components/bim/FullBimSimulationEngine.tsx
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
}

export interface SubComponent {
  id: string;
  name: string;
  type: string;
  status: "INSTALLED" | "PENDING" | "DEFECT" | "IN_PROGRESS";
  weightOrVolume: string;
}

export interface SelectedEntity {
  id: string;
  name: string;
  type: "LEVEL" | "ZONE" | "ELEMENT";
  discipline: "CIVIL" | "STRUCTURAL" | "MEP" | "DEFECT";
  parentLevel: SelectionLevel;
  parentZone: SelectionZone;
  subComponents: SubComponent[];
  boqItems: BOQLineItem[];
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
  };
}

export default function FullBimSimulationEngine() {
  const mountRef = useRef<HTMLDivElement>(null);

  // --- STATE ---
  const [isHydrated, setIsHydrated] = useState(false);
  const [timelineWeek, setTimelineWeek] = useState<number>(22);
  const [timelineMode, setTimelineMode] = useState<"ACTUAL" | "PLANNED" | "VARIANCE">("ACTUAL");
  const [activeLevel, setActiveLevel] = useState<SelectionLevel>("ALL");
  const [activeZone, setActiveZone] = useState<SelectionZone>("ALL_ZONES");
  
  const [activeCamera, setActiveCamera] = useState<CameraWaypoint | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"SUB_COMPS" | "BOQ_LEDGER">("SUB_COMPS");

  const defaultEntity: SelectedEntity = {
    id: "ENTIRE_TOWER_A",
    name: "Tower A - Consolidated Facility",
    type: "LEVEL",
    discipline: "STRUCTURAL",
    parentLevel: "ALL",
    parentZone: "ALL_ZONES",
    subComponents: [],
    boqItems: [
      { itemCode: "CPWD-5.33", description: "M35 Grade Ready Mix Concrete", quantity: 1420.5, unit: "Cum", rateINR: 7600, amountINR: 10795800 },
      { itemCode: "CPWD-5.22A", description: "Fe500D TMT Reinforcement Steel", quantity: 118.4, unit: "MT", rateINR: 78500, amountINR: 9294400 },
      { itemCode: "CPWD-18.12", description: "Galvanized Sheet Metal Ducting", quantity: 3840.0, unit: "Sqm", rateINR: 1850, amountINR: 7104000 }
    ],
    boqSummary: { concrete_m3: 1420.5, steel_mt: 118.4, ductwork_m2: 3840.0, total_cost_inr: 49500000.0 }
  };
  
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(defaultEntity);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const elementsGroupRef = useRef<THREE.Group | null>(null);
  const pickableMeshes = useRef<THREE.Mesh[]>([]);

  // Camera Waypoints Data
  const cameraStations: CameraWaypoint[] = useMemo(() => [
    {
      id: "CAM-01-TOWER-NE",
      name: "Fixed CCTV Mast (NE Corner)",
      position: [22, 22, 18],
      type: "CCTV_FIXED",
      latestCapture: {
        timestamp: "2026-10-24 11:42:00 IST",
        sha256: "7f4c9a18d0e5124b89ec1104e12da8f448c3b211fae01934ba70114092b3c10a",
        verifiedDeviationMm: 1.8
      }
    },
    {
      id: "DRONE-WP-03",
      name: "Drone Photogrammetry (Level 1 MEP Corridor)",
      position: [8, 10, 10],
      type: "DRONE_PHOTOGRAMMETRY",
      latestCapture: {
        timestamp: "2026-10-24 09:15:22 IST",
        sha256: "5b8d8d4258fd1c6e9d8e360f88443faaabd16e01fc2ab3f44fd27600b1857a64",
        verifiedDeviationMm: 0.9
      }
    }
  ], []);

  // --- PERSISTENCE ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem("quadillar_bim_state_v3");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timelineWeek) setTimelineWeek(parsed.timelineWeek);
        if (parsed.timelineMode) setTimelineMode(parsed.timelineMode);
        if (parsed.activeLevel) setActiveLevel(parsed.activeLevel);
        if (parsed.activeZone) setActiveZone(parsed.activeZone);
      }
    } catch (e) {}
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("quadillar_bim_state_v3", JSON.stringify({
      timelineWeek, timelineMode, activeLevel, activeZone
    }));
  }, [timelineWeek, timelineMode, activeLevel, activeZone, isHydrated]);

  // --- 3D SCENE INITIALIZATION ---
  useEffect(() => {
    if (!isHydrated) return;
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xdbeafe, 1.4);
    dirLight.position.set(50, 75, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const grid = new THREE.GridHelper(70, 35, 0x00f0ff, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    const bimGroup = new THREE.Group();
    elementsGroupRef.current = bimGroup;
    scene.add(bimGroup);
    pickableMeshes.current = [];

    // Materials
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, metalness: 0.1 });
    const colMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.9 });
    const ductMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    const vavMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.8 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });
    const trayMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.8, roughness: 0.4 });

    const addBimMesh = (mesh: THREE.Mesh, entityId: string, name: string, level: SelectionLevel, zone: SelectionZone, minWeek: number, plannedWeek: number, subComponents: SubComponent[] = [], boqItems: BOQLineItem[] = []) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mesh.userData = { 
        entityId, name, level, zone, minWeek, plannedWeek, 
        originalColor: mat.color.getHex(),
        originalEmissive: mat.emissive ? mat.emissive.getHex() : 0x000000,
        originalEmissiveIntensity: mat.emissiveIntensity || 0,
        subComponents, boqItems
      };
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      pickableMeshes.current.push(mesh);
      bimGroup.add(mesh);
    };

    // 1. Structure
    const l0Mesh = new THREE.Mesh(new THREE.BoxGeometry(44, 1.4, 32), slabMat.clone());
    l0Mesh.position.set(0, 0.7, 0);
    addBimMesh(l0Mesh, "SLAB_L0", "Level 0 Foundation Raft", "L0_FOUNDATION", "ALL_ZONES", 1, 1, [], [{ itemCode: "CPWD-5.33", description: "M35 Concrete", quantity: 528, unit: "Cum", rateINR: 7600, amountINR: 4012800 }]);

    for (let x = -16; x <= 16; x += 11) {
      for (let z = -12; z <= 12; z += 8) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 7, 24), colMat.clone());
        col.position.set(x, 4.9, z);
        addBimMesh(col, `COL_L0_L1_${x}_${z}`, `Column Grid (${x > 0 ? "D" : "C"}-${z > 0 ? "4" : "1"})`, "L0_FOUNDATION", x > 0 ? "BAY_C3_D4" : "BAY_A1_B2", 4, 3, [
          { id: "REBAR", name: "Fe500D Rebar", type: "REBAR", status: "INSTALLED", weightOrVolume: "1.2 MT" }
        ], [{ itemCode: "CPWD-5.1.2", description: "M40 Concrete in Columns", quantity: 10.8, unit: "Cum", rateINR: 8400, amountINR: 90720 }]);
      }
    }

    const l1Mesh = new THREE.Mesh(new THREE.BoxGeometry(44, 0.8, 32), slabMat.clone());
    l1Mesh.position.set(0, 8.8, 0);
    addBimMesh(l1Mesh, "SLAB_L1", "Level 1 Post-Tensioned Slab", "L1_TYPICAL", "ALL_ZONES", 8, 8);

    // 2. MEP Complex
    const mainDuct = new THREE.Mesh(new THREE.BoxGeometry(32, 1.2, 1.8), ductMat.clone());
    mainDuct.position.set(2, 7.2, 3);
    addBimMesh(mainDuct, "MEP_TRUNK_DUCT_L1", "Main HVAC Supply Duct", "L1_TYPICAL", "BAY_A1_B2", 19, 18, [], [{ itemCode: "CPWD-18.12", description: "GI Sheet Ducting", quantity: 480, unit: "Sqm", rateINR: 1850, amountINR: 888000 }]);

    const chwSupply = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 34, 16), pipeMat.clone());
    chwSupply.rotation.z = Math.PI / 2;
    chwSupply.position.set(0, 7.5, 5);
    addBimMesh(chwSupply, "CHW_SUPPLY_L1", "Chilled Water Supply Main", "L1_TYPICAL", "ALL_ZONES", 20, 19, [
      { id: "PIPE_MS", name: "200mm MS Seamless Pipe", type: "PIPE", status: "INSTALLED", weightOrVolume: "34 RMT" }
    ], [{ itemCode: "CPWD-18.2", description: "MS Seamless Pipe", quantity: 34, unit: "RMT", rateINR: 3200, amountINR: 108800 }]);

    const cableTray = new THREE.Mesh(new THREE.BoxGeometry(28, 0.1, 0.8), trayMat.clone());
    cableTray.rotation.y = Math.PI / 2;
    cableTray.position.set(6, 7.0, 0);
    addBimMesh(cableTray, "ELEC_TRAY_HT", "Main HT Electrical Tray", "L1_TYPICAL", "ALL_ZONES", 21, 20);

    const vavBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 2.0), vavMat.clone());
    vavBox.position.set(12, 7.2, 8);
    addBimMesh(vavBox, "VAV-1-NW-04", "VAV Terminal Unit 1-NW-04", "L1_TYPICAL", "BAY_C3_D4", 20, 19, [
      { id: "VAV_ACTUATOR", name: "Belimo Modulating Actuator", type: "SENSOR", status: "DEFECT", weightOrVolume: "1 Unit" }
    ], [{ itemCode: "CPWD-18.4", description: "Pressure Independent VAV Box", quantity: 1, unit: "No", rateINR: 48500, amountINR: 48500 }]);

    // 3. Camera Waypoints (Reality Capture Frustums)
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
      camMesh.userData = { isCamera: true, cameraData: cam, name: cam.name };
      pickableMeshes.current.push(camMesh);
      bimGroup.add(camMesh);

      const wireGeo = new THREE.ConeGeometry(6, 12, 4, 1, true);
      const wireMat = new THREE.MeshBasicMaterial({
        color: cam.type === "CCTV_FIXED" ? 0x06b6d4 : 0xa855f7,
        wireframe: true, transparent: true, opacity: 0.15
      });
      const wireCone = new THREE.Mesh(wireGeo, wireMat);
      wireCone.position.set(...cam.position);
      wireCone.rotation.x = Math.PI;
      bimGroup.add(wireCone);
    });

    // Controls & Raycasting
    let isDragging = false, prevX = 0, prevY = 0;
    let sph = { r: 65, phi: Math.PI / 3.2, theta: Math.PI / 4 };

    const updateCameraPos = () => {
      camera.position.x = sph.r * Math.sin(sph.phi) * Math.sin(sph.theta);
      camera.position.y = sph.r * Math.cos(sph.phi);
      camera.position.z = sph.r * Math.sin(sph.phi) * Math.cos(sph.theta);
      camera.lookAt(0, 8.5, 0);
    };
    updateCameraPos();

    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const visibleMeshes = pickableMeshes.current.filter(m => m.visible);
      const hits = raycaster.intersectObjects(visibleMeshes, false);

      if (hits.length > 0) {
        mount.style.cursor = "pointer";
        setHoveredTag(hits[0].object.userData.name);
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
      const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const visibleMeshes = pickableMeshes.current.filter(m => m.visible);
      const hits = raycaster.intersectObjects(visibleMeshes, false);

      if (hits.length > 0) {
        const hit = hits[0].object.userData;
        if (hit.isCamera) {
          setActiveCamera(hit.cameraData);
        } else {
          setSelectedEntity({
            id: hit.entityId,
            name: hit.name,
            type: "ELEMENT",
            discipline: hit.entityId.includes("VAV") ? "DEFECT" : (hit.entityId.includes("COL") || hit.entityId.includes("SLAB") ? "STRUCTURAL" : "MEP"),
            parentLevel: hit.level,
            parentZone: hit.zone,
            subComponents: hit.subComponents || [],
            boqItems: hit.boqItems || [],
            boqSummary: {
              concrete_m3: hit.entityId.includes("COL") ? 10.8 : (hit.entityId.includes("SLAB") ? 350.0 : 0),
              steel_mt: hit.entityId.includes("COL") ? 1.4 : (hit.entityId.includes("SLAB") ? 31.6 : 0),
              ductwork_m2: hit.entityId.includes("DUCT") ? 480.0 : 0,
              total_cost_inr: (hit.boqItems || []).reduce((acc: number, item: any) => acc + item.amountINR, 0) || 850000.0
            }
          });
        }
      }
    };

    mount.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    mount.addEventListener("wheel", onWheel, { passive: false });
    mount.addEventListener("click", onClick);

    const ro = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) {
        camera.aspect = entry.contentRect.width / entry.contentRect.height;
        camera.updateProjectionMatrix();
        renderer.setSize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    ro.observe(mount);

    let animId: number;
    const animate = () => {
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
  }, [isHydrated, cameraStations]);

  // --- UPDATE VISIBILITY & VARIANCE ---
  useEffect(() => {
    if (!elementsGroupRef.current || !isHydrated) return;

    elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.userData || !mesh.material) return;

      if (mesh.userData.isCamera) return; // Cameras ignore timeline/variance filters

      const { minWeek, plannedWeek, level, zone, originalColor, originalEmissive, originalEmissiveIntensity, entityId } = mesh.userData;

      const isConstructed = timelineWeek >= minWeek;
      const levelMatches = activeLevel === "ALL" || level === activeLevel;
      const zoneMatches = activeZone === "ALL_ZONES" || zone === activeZone;
      mesh.visible = isConstructed && levelMatches && zoneMatches;

      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (timelineMode === "VARIANCE") {
        const delta = minWeek - plannedWeek;
        if (delta > 0) mat.color.setHex(0xef4444);
        else if (delta < 0) mat.color.setHex(0x10b981);
        else mat.color.setHex(0x0284c7);
      } else {
        mat.color.setHex(originalColor);
      }

      const isSelected = selectedEntity.id === entityId || (selectedEntity.type === "ZONE" && zone === selectedEntity.id.replace("ZONE_", ""));
      if (isSelected) {
        mat.emissive.setHex(0x0a5c7a);
        mat.emissiveIntensity = 0.6;
      } else {
        mat.emissive.setHex(originalEmissive);
        mat.emissiveIntensity = originalEmissiveIntensity;
      }
    });
  }, [timelineWeek, timelineMode, activeLevel, activeZone, selectedEntity, isHydrated]);

  if (!isHydrated) return <div className="w-full h-[520px] bg-slate-950"></div>;

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
                activeLevel === lvl ? "bg-cyan-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {lvl.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-lg">
          {(["ACTUAL", "PLANNED", "VARIANCE"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setTimelineMode(mode)}
              className={`px-2.5 py-0.5 text-[11px] font-mono rounded font-semibold transition ${
                timelineMode === mode ? (mode === "VARIANCE" ? "bg-amber-500 text-slate-950" : "bg-cyan-500 text-slate-950") : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 2. 3D WEBGL VIEWPORT */}
        <div className="lg:col-span-8 relative w-full h-[540px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
          
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
            <div className="px-2.5 py-1 bg-slate-900/90 border border-cyan-500/40 rounded text-xs font-mono text-cyan-300 flex items-center gap-2 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              WebGL Engine Phase 3: Cameras & BOQ
            </div>
            {hoveredTag && (
              <div className="px-2.5 py-1 bg-blue-950/90 border border-blue-400/50 rounded text-xs font-mono text-blue-200 backdrop-blur-md">
                {hoveredTag}
              </div>
            )}
          </div>
        </div>

        {/* 3. INSPECTOR PANEL (SUB-COMPONENTS & BOQ TABS) */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col h-[540px] overflow-hidden">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">Active Selection</div>
          <h3 className="text-base font-bold text-white mb-2">{selectedEntity.name}</h3>
          
          {/* Tabs */}
          <div className="flex border-b border-slate-800 mb-4">
            <button 
              onClick={() => setInspectorTab("SUB_COMPS")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${inspectorTab === "SUB_COMPS" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500 hover:text-slate-300"}`}
            >
              Sub-Components
            </button>
            <button 
              onClick={() => setInspectorTab("BOQ_LEDGER")}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${inspectorTab === "BOQ_LEDGER" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500 hover:text-slate-300"}`}
            >
              BOQ Ledger
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {inspectorTab === "SUB_COMPS" ? (
              selectedEntity.subComponents && selectedEntity.subComponents.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {selectedEntity.subComponents.map(sub => (
                    <div key={sub.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex flex-col gap-1.5">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-semibold text-slate-200">{sub.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          sub.status === "DEFECT" ? "bg-amber-950/50 text-amber-400 border border-amber-500/50" : "bg-emerald-950/50 text-emerald-400 border border-emerald-500/50"
                        }`}>
                          {sub.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-mono text-slate-500">
                        <span>Type: {sub.type}</span>
                        <span>Spec: {sub.weightOrVolume}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">
                  No granular sub-components tracked. Select an individual column, pipe, or VAV box.
                </div>
              )
            ) : (
              selectedEntity.boqItems && selectedEntity.boqItems.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {selectedEntity.boqItems.map(item => (
                    <div key={item.itemCode} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono font-bold text-cyan-400">{item.itemCode}</span>
                        <span className="text-xs font-bold text-amber-300">₹{item.amountINR.toLocaleString("en-IN")}</span>
                      </div>
                      <p className="text-xs text-slate-300">{item.description}</p>
                      <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800">
                        <span>Qty: {item.quantity} {item.unit}</span>
                        <span>Rate: ₹{item.rateINR.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-lg flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-300 uppercase">Total Valuation</span>
                    <span className="text-sm font-bold text-cyan-400">₹{selectedEntity.boqSummary.total_cost_inr.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">
                  No BOQ items assigned to this selection.
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* 4. REALITY CAPTURE MODAL */}
      {activeCamera && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">Field Reality Capture Feed</span>
                <h4 className="text-base font-bold text-white">{activeCamera.name}</h4>
              </div>
              <button onClick={() => setActiveCamera(null)} className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1">✕</button>
            </div>

            <div className="relative w-full h-56 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/40 via-transparent to-slate-900/50 pointer-events-none"></div>
              <div className="absolute top-3 left-3 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE SENSOR TELEMETRY
              </div>
              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-full border-2 border-purple-500/60 mx-auto flex items-center justify-center text-purple-300 mb-2">📷</div>
                <div className="text-xs text-slate-300 font-mono">Geofenced Computer Vision Capture</div>
                <div className="text-[10px] text-slate-500 mt-1">Laser Tolerance: ±1.2mm</div>
              </div>
            </div>

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
              <button onClick={() => setActiveCamera(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded transition">Close Viewport</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. 4D GANTT PROGRESS ENGINE SLIDER */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col gap-2.5">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200 uppercase tracking-wider">
              4D Construction Timeline Slider:
            </span>
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono font-bold rounded border border-blue-500/30">
              Week {timelineWeek} of 24
            </span>
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
          <span>W01: Substructure</span>
          <span>W08: L1 Slab</span>
          <span>W16: L2 Roof</span>
          <span>W20: MEP Network</span>
          <span className="text-amber-400 font-bold">W24: CPWD DLP Clause 17</span>
        </div>
      </div>
    </div>
  );
}
ENGINE_V5_EOF

echo "✓ Phase 3 Applied: Reality Capture Cameras & BOQ Itemization Engine"
