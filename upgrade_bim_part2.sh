#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: BIM ENGINE PHASE 2 (COMPLEX MEP & RICH 4D GANTT)
# Features: CHW Pipes, Cable Trays, Advanced Gantt with Camera Inputs & Dates
# ==============================================================================

set -euo pipefail

cat << 'ENGINE_V4_EOF' > components/bim/FullBimSimulationEngine.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

// --- TYPES & INTERFACES ---
export type SelectionLevel = "ALL" | "L0_FOUNDATION" | "L1_TYPICAL" | "L2_ROOF";
export type SelectionZone = "ALL_ZONES" | "BAY_A1_B2" | "BAY_C3_D4";

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
  boqSummary: {
    concrete_m3: number;
    steel_mt: number;
    ductwork_m2: number;
    total_cost_inr: number;
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
  
  const defaultEntity: SelectedEntity = {
    id: "ENTIRE_TOWER_A",
    name: "Tower A - Consolidated Facility",
    type: "LEVEL",
    discipline: "STRUCTURAL",
    parentLevel: "ALL",
    parentZone: "ALL_ZONES",
    subComponents: [],
    boqSummary: {
      concrete_m3: 1420.5,
      steel_mt: 118.4,
      ductwork_m2: 3840.0,
      total_cost_inr: 49500000.0
    }
  };
  
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(defaultEntity);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const elementsGroupRef = useRef<THREE.Group | null>(null);
  const pickableMeshes = useRef<THREE.Mesh[]>([]);

  // --- PERSISTENCE ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem("quadillar_bim_state_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timelineWeek) setTimelineWeek(parsed.timelineWeek);
        if (parsed.timelineMode) setTimelineMode(parsed.timelineMode);
        if (parsed.activeLevel) setActiveLevel(parsed.activeLevel);
        if (parsed.activeZone) setActiveZone(parsed.activeZone);
        if (parsed.selectedEntity) setSelectedEntity(parsed.selectedEntity);
      }
    } catch (e) {}
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("quadillar_bim_state_v2", JSON.stringify({
      timelineWeek, timelineMode, activeLevel, activeZone, selectedEntity
    }));
  }, [timelineWeek, timelineMode, activeLevel, activeZone, selectedEntity, isHydrated]);

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
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 }); // Chilled Water
    const trayMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.8, roughness: 0.4 }); // Cable Tray

    const addBimMesh = (mesh: THREE.Mesh, entityId: string, name: string, level: SelectionLevel, zone: SelectionZone, minWeek: number, plannedWeek: number, subComponents: SubComponent[] = []) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mesh.userData = { 
        entityId, name, level, zone, minWeek, plannedWeek, 
        originalColor: mat.color.getHex(),
        originalEmissive: mat.emissive ? mat.emissive.getHex() : 0x000000,
        originalEmissiveIntensity: mat.emissiveIntensity || 0,
        subComponents
      };
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      pickableMeshes.current.push(mesh);
      bimGroup.add(mesh);
    };

    // Structural Elements
    const l0Mesh = new THREE.Mesh(new THREE.BoxGeometry(44, 1.4, 32), slabMat.clone());
    l0Mesh.position.set(0, 0.7, 0);
    addBimMesh(l0Mesh, "SLAB_L0", "Level 0 Foundation Raft", "L0_FOUNDATION", "ALL_ZONES", 1, 1, [
      { id: "L0_REBAR", name: "Raft Bottom Mesh Fe500D", type: "REBAR", status: "INSTALLED", weightOrVolume: "44.8 MT" },
      { id: "L0_CONC", name: "M35 Mass Concrete", type: "CONCRETE", status: "INSTALLED", weightOrVolume: "528 m³" }
    ]);

    for (let x = -16; x <= 16; x += 11) {
      for (let z = -12; z <= 12; z += 8) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 7, 24), colMat.clone());
        col.position.set(x, 4.9, z);
        addBimMesh(col, `COL_L0_L1_${x}_${z}`, `Column Grid (${x > 0 ? "D" : "C"}-${z > 0 ? "4" : "1"})`, "L0_FOUNDATION", "ALL_ZONES", 4, 3);
      }
    }

    const l1Mesh = new THREE.Mesh(new THREE.BoxGeometry(44, 0.8, 32), slabMat.clone());
    l1Mesh.position.set(0, 8.8, 0);
    addBimMesh(l1Mesh, "SLAB_L1", "Level 1 Post-Tensioned Slab", "L1_TYPICAL", "ALL_ZONES", 8, 8);

    // Secondary Beams (Level 1 Ceiling)
    for (let z = -8; z <= 8; z += 8) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(44, 0.6, 0.4), beamMat.clone());
      beam.position.set(0, 8.1, z);
      addBimMesh(beam, `BEAM_L1_${z}`, `Secondary Beam Grillage (Z:${z})`, "L1_TYPICAL", "ALL_ZONES", 7, 7);
    }

    for (let x = -16; x <= 16; x += 11) {
      for (let z = -12; z <= 12; z += 8) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 7, 24), colMat.clone());
        col.position.set(x, 12.7, z);
        addBimMesh(col, `COL_L1_L2_${x}_${z}`, `Column Grid L1-L2`, "L1_TYPICAL", "ALL_ZONES", 12, 11);
      }
    }

    const l2Mesh = new THREE.Mesh(new THREE.BoxGeometry(44, 0.8, 32), slabMat.clone());
    l2Mesh.position.set(0, 16.6, 0);
    addBimMesh(l2Mesh, "SLAB_L2", "Level 2 Roof Slab", "L2_ROOF", "ALL_ZONES", 16, 15);

    // MEP Elements
    const mainDuct = new THREE.Mesh(new THREE.BoxGeometry(32, 1.2, 1.8), ductMat.clone());
    mainDuct.position.set(2, 7.2, 3);
    addBimMesh(mainDuct, "MEP_TRUNK_DUCT_L1", "Main HVAC Supply Duct", "L1_TYPICAL", "BAY_A1_B2", 19, 18, [
      { id: "DUCT_GI", name: "0.8mm GI Sheet Factory Fabricated", type: "MATERIAL", status: "INSTALLED", weightOrVolume: "480 m²" },
      { id: "DUCT_INSUL", name: "Cross-Linked Polyethylene Insulation", type: "MATERIAL", status: "INSTALLED", weightOrVolume: "480 m²" }
    ]);

    // NEW: Chilled Water Pipe Network
    const pipeGeo = new THREE.CylinderGeometry(0.25, 0.25, 34, 16);
    const chwSupply = new THREE.Mesh(pipeGeo, pipeMat.clone());
    chwSupply.rotation.z = Math.PI / 2;
    chwSupply.position.set(0, 7.5, 5);
    addBimMesh(chwSupply, "CHW_SUPPLY_L1", "Chilled Water Supply Main (200mm)", "L1_TYPICAL", "ALL_ZONES", 20, 19, [
      { id: "CHW_PIPE_MS", name: "200mm MS Seamless Pipe IS:1239", type: "PIPE", status: "INSTALLED", weightOrVolume: "34 RMT" },
      { id: "CHW_INSUL", name: "50mm Nitrile Rubber Insulation", type: "MATERIAL", status: "INSTALLED", weightOrVolume: "34 RMT" },
      { id: "CHW_VALVE", name: "Motorized Butterfly Isolation Valve", type: "VALVE", status: "PENDING", weightOrVolume: "2 Nos" }
    ]);

    // NEW: High Tension Cable Tray Crossing
    const trayGeo = new THREE.BoxGeometry(28, 0.1, 0.8);
    const cableTray = new THREE.Mesh(trayGeo, trayMat.clone());
    cableTray.rotation.y = Math.PI / 2;
    cableTray.position.set(6, 7.0, 0); // Positioned to cross under the duct and pipes
    addBimMesh(cableTray, "ELEC_TRAY_HT", "Main HT Electrical Tray (600mm)", "L1_TYPICAL", "ALL_ZONES", 21, 20, [
      { id: "TRAY_GI", name: "600mm GI Perforated Ladder Tray", type: "TRAY", status: "INSTALLED", weightOrVolume: "28 RMT" },
      { id: "CABLE_11KV", name: "11kV XLPE Armoured Cable (3 Core)", type: "CABLE", status: "IN_PROGRESS", weightOrVolume: "84 RMT" },
      { id: "SUPPORTS", name: "Threaded Rod Hangers & Unistrut", type: "HARDWARE", status: "INSTALLED", weightOrVolume: "14 Sets" }
    ]);

    const vavBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 2.0), vavMat.clone());
    vavBox.position.set(12, 7.2, 8);
    addBimMesh(vavBox, "VAV-1-NW-04", "VAV Terminal Unit 1-NW-04", "L1_TYPICAL", "BAY_C3_D4", 20, 19, [
      { id: "VAV_ACTUATOR", name: "Belimo Modulating Actuator", type: "SENSOR", status: "DEFECT", weightOrVolume: "1 Unit" },
      { id: "VAV_CHW_COIL", name: "Chilled Water Cooling Coil", type: "PIPE", status: "INSTALLED", weightOrVolume: "2 Rows" }
    ]);

    // Orbit Controls
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
        setSelectedEntity({
          id: hit.entityId,
          name: hit.name,
          type: "ELEMENT",
          discipline: hit.entityId.includes("VAV") ? "DEFECT" : (hit.entityId.includes("COL") || hit.entityId.includes("SLAB") ? "STRUCTURAL" : "MEP"),
          parentLevel: hit.level,
          parentZone: hit.zone,
          subComponents: hit.subComponents || [],
          boqSummary: {
            concrete_m3: hit.entityId.includes("COL") ? 10.8 : (hit.entityId.includes("SLAB") ? 350.0 : 0),
            steel_mt: hit.entityId.includes("COL") ? 1.4 : (hit.entityId.includes("SLAB") ? 31.6 : 0),
            ductwork_m2: hit.entityId.includes("DUCT") ? 480.0 : 0,
            total_cost_inr: 850000.0
          }
        });
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
  }, [isHydrated]);

  // --- UPDATE VISIBILITY & VARIANCE ---
  useEffect(() => {
    if (!elementsGroupRef.current || !isHydrated) return;

    elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.userData || !mesh.material) return;

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

  // Milestone Matrix Logic for Gantt
  const ganttMilestones = useMemo(() => {
    const milestones = [
      { week: 1, name: "Substructure & Raft Foundation", planned: "01-May-2026", actual: "03-May-2026", source: "CCTV-NE Camera", status: "DELAYED_2D" },
      { week: 8, name: "Level 1 PT Slab Concrete Pour", planned: "15-Jun-2026", actual: "15-Jun-2026", source: "Drone Waypoint WP-03", status: "ON_TIME" },
      { week: 16, name: "Level 2 Roof Slab & Core Walls", planned: "10-Aug-2026", actual: "05-Aug-2026", source: "Site Engineer App", status: "AHEAD_5D" },
      { week: 20, name: "MEP CHW Pipes & HVAC Ducting", planned: "10-Sep-2026", actual: timelineWeek >= 20 ? "14-Sep-2026" : "Pending", source: "Drone Waypoint WP-04", status: timelineWeek >= 20 ? "DELAYED_4D" : "PENDING" },
      { week: 24, name: "CPWD Handover & DLP Start", planned: "15-Oct-2026", actual: timelineWeek >= 24 ? "15-Oct-2026" : "Pending", source: "Official Signoff", status: timelineWeek >= 24 ? "ON_TIME" : "PENDING" }
    ];
    return milestones.filter(m => m.week <= Math.max(timelineWeek + 4, 8)); // Show up to near future
  }, [timelineWeek]);

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
                activeLevel === lvl ? "bg-cyan-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-300"
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
              WebGL Engine Phase 2: Complex MEP
            </div>
            {hoveredTag && (
              <div className="px-2.5 py-1 bg-blue-950/90 border border-blue-400/50 rounded text-xs font-mono text-blue-200 backdrop-blur-md">
                {hoveredTag}
              </div>
            )}
          </div>
        </div>

        {/* 3. SUB-COMPONENT INSPECTOR PANEL */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col h-[540px] overflow-y-auto custom-scrollbar">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">Active Selection</div>
          <h3 className="text-base font-bold text-white mb-4">{selectedEntity.name}</h3>
          
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3">Granular Sub-Components</div>
          
          {selectedEntity.subComponents && selectedEntity.subComponents.length > 0 ? (
            <div className="flex flex-col gap-3">
              {selectedEntity.subComponents.map(sub => (
                <div key={sub.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex flex-col gap-1.5">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-semibold text-slate-200">{sub.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      sub.status === "DEFECT" ? "bg-amber-950/50 text-amber-400 border border-amber-500/50" : 
                      sub.status === "IN_PROGRESS" ? "bg-blue-950/50 text-blue-400 border border-blue-500/50" :
                      "bg-emerald-950/50 text-emerald-400 border border-emerald-500/50"
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
              Click on the Chilled Water Pipe, Cable Tray, or Columns in the 3D view to inspect sub-components.
            </div>
          )}
        </div>
      </div>

      {/* 4. ADVANCED 4D GANTT PROGRESS ENGINE (PLANNED VS ACTUAL) */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl flex flex-col gap-4">
        <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-200 uppercase tracking-wider">
              4D Schedule Analyzer:
            </span>
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono font-bold rounded border border-blue-500/30">
              Week {timelineWeek}
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
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 mb-2"
        />

        {/* Dynamic Milestone Matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Milestone Event</th>
                <th className="py-2.5 px-3">Planned (BIM Baseline)</th>
                <th className="py-2.5 px-3">Actual (Site Entry)</th>
                <th className="py-2.5 px-3">Verification Source</th>
                <th className="py-2.5 px-3 text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {ganttMilestones.map((ms, idx) => (
                <tr key={idx} className={`hover:bg-slate-900/60 transition ${ms.week === timelineWeek ? 'bg-cyan-950/20' : ''}`}>
                  <td className="py-2 px-3 text-slate-200 font-bold">{ms.name}</td>
                  <td className="py-2 px-3 text-slate-400">{ms.planned}</td>
                  <td className="py-2 px-3 text-slate-300">{ms.actual}</td>
                  <td className="py-2 px-3 text-purple-400">{ms.source}</td>
                  <td className={`py-2 px-3 text-right font-bold ${
                    ms.status.includes("DELAYED") ? "text-red-400" :
                    ms.status.includes("AHEAD") ? "text-emerald-400" :
                    ms.status === "PENDING" ? "text-slate-500" : "text-blue-400"
                  }`}>
                    {ms.status.replace("_", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
ENGINE_V4_EOF

echo "✓ Phase 2 Applied: Complex MEP (CHW/Trays) & Advanced 4D Gantt Matrix"
