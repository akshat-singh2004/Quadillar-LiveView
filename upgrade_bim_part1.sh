#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: BIM ENGINE PHASE 1 (STATE FIXES & HIGHLIGHTING)
# Fixes: Variance color toggle, localStorage persistence, mesh highlighting.
# ==============================================================================

set -euo pipefail

cat << 'ENGINE_V3_EOF' > components/bim/FullBimSimulationEngine.tsx
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

export interface SubComponent {
  id: string;
  name: string;
  type: "REBAR" | "CONCRETE" | "FORMWORK" | "PIPE" | "DUCT" | "SENSOR";
  status: "INSTALLED" | "PENDING" | "DEFECT";
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
  const [timelineWeek, setTimelineWeek] = useState<number>(20);
  const [timelineMode, setTimelineMode] = useState<"ACTUAL" | "PLANNED" | "VARIANCE">("ACTUAL");
  const [activeLevel, setActiveLevel] = useState<SelectionLevel>("ALL");
  const [activeZone, setActiveZone] = useState<SelectionZone>("ALL_ZONES");
  
  // Default mock entity for demonstration
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

  // --- PERSISTENCE: LOAD ON MOUNT ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem("quadillar_bim_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timelineWeek) setTimelineWeek(parsed.timelineWeek);
        if (parsed.timelineMode) setTimelineMode(parsed.timelineMode);
        if (parsed.activeLevel) setActiveLevel(parsed.activeLevel);
        if (parsed.activeZone) setActiveZone(parsed.activeZone);
        if (parsed.selectedEntity) setSelectedEntity(parsed.selectedEntity);
      }
    } catch (e) {
      console.warn("Could not parse saved BIM state");
    }
    setIsHydrated(true);
  }, []);

  // --- PERSISTENCE: SAVE ON CHANGE ---
  useEffect(() => {
    if (!isHydrated) return;
    const stateToSave = {
      timelineWeek,
      timelineMode,
      activeLevel,
      activeZone,
      selectedEntity
    };
    localStorage.setItem("quadillar_bim_state", JSON.stringify(stateToSave));
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

    pickableMeshes.current = [];

    // Materials
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, metalness: 0.1 });
    const colMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const ductMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    const vavMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.8 });

    // Helper to register interactive 3D elements and store original colors for Variance toggling
    const addBimMesh = (mesh: THREE.Mesh, entityId: string, name: string, level: SelectionLevel, zone: SelectionZone, minWeek: number, plannedWeek: number, subComponents: SubComponent[] = []) => {
      // Store original color for variance reset
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const originalColor = mat.color.getHex();
      const originalEmissive = mat.emissive ? mat.emissive.getHex() : 0x000000;
      const originalEmissiveIntensity = mat.emissiveIntensity || 0;

      mesh.userData = { 
        entityId, 
        name,
        level, 
        zone, 
        minWeek, 
        plannedWeek, 
        originalColor,
        originalEmissive,
        originalEmissiveIntensity,
        subComponents
      };
      
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      pickableMeshes.current.push(mesh);
      bimGroup.add(mesh);
    };

    // A. Foundation Raft
    const l0Mesh = new THREE.Mesh(new THREE.BoxGeometry(44, 1.4, 32), slabMat.clone());
    l0Mesh.position.set(0, 0.7, 0);
    addBimMesh(l0Mesh, "SLAB_L0", "Level 0 Foundation Raft", "L0_FOUNDATION", "ALL_ZONES", 1, 1);

    // B. L0 to L1 Columns (Example with Sub-Components)
    for (let x = -16; x <= 16; x += 11) {
      for (let z = -12; z <= 12; z += 8) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 7, 24), colMat.clone());
        col.position.set(x, 4.9, z);
        const zone = x > 0 ? "BAY_C3_D4" : "BAY_A1_B2";
        const id = `COL_L0_L1_${x}_${z}`;
        
        // Mock sub-components for structural columns
        const subComps: SubComponent[] = [
          { id: `${id}_REBAR`, name: "Fe500D Reinforcement Cage", type: "REBAR", status: "INSTALLED", weightOrVolume: "1.2 MT" },
          { id: `${id}_CONC`, name: "M40 Grade Concrete Pour", type: "CONCRETE", status: "INSTALLED", weightOrVolume: "2.8 m³" }
        ];
        addBimMesh(col, id, `Column Grid (${x > 0 ? "D" : "C"}-${z > 0 ? "4" : "1"}) [L0-L1]`, "L0_FOUNDATION", zone, 4, 3, subComps);
      }
    }

    // C. Level 1 Typical Slab
    const l1Mesh = new THREE.Mesh(new THREE.BoxGeometry(44, 0.8, 32), slabMat.clone());
    l1Mesh.position.set(0, 8.8, 0);
    addBimMesh(l1Mesh, "SLAB_L1", "Level 1 Post-Tensioned Slab", "L1_TYPICAL", "ALL_ZONES", 8, 8);

    // D. L1 to L2 Columns
    for (let x = -16; x <= 16; x += 11) {
      for (let z = -12; z <= 12; z += 8) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 7, 24), colMat.clone());
        col.position.set(x, 12.7, z);
        const zone = x > 0 ? "BAY_C3_D4" : "BAY_A1_B2";
        addBimMesh(col, `COL_L1_L2_${x}_${z}`, `Column Grid (${x > 0 ? "D" : "C"}-${z > 0 ? "4" : "1"}) [L1-L2]`, "L1_TYPICAL", zone, 12, 11);
      }
    }

    // E. Level 2 Roof Slab
    const l2Mesh = new THREE.Mesh(new THREE.BoxGeometry(44, 0.8, 32), slabMat.clone());
    l2Mesh.position.set(0, 16.6, 0);
    addBimMesh(l2Mesh, "SLAB_L2", "Level 2 Roof Slab", "L2_ROOF", "ALL_ZONES", 16, 15);

    // F. MEP Air Distribution Trunk
    const mainDuct = new THREE.Mesh(new THREE.BoxGeometry(32, 1.2, 1.8), ductMat.clone());
    mainDuct.position.set(2, 7.2, 3);
    addBimMesh(mainDuct, "MEP_TRUNK_DUCT_L1", "Main HVAC Supply Duct", "L1_TYPICAL", "BAY_A1_B2", 19, 18);

    // G. VAV Box
    const vavBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 2.0), vavMat.clone());
    vavBox.position.set(12, 7.2, 8);
    
    const vavSubComps: SubComponent[] = [
      { id: "VAV_ACTUATOR", name: "Belimo Modulating Actuator", type: "SENSOR", status: "DEFECT", weightOrVolume: "N/A" },
      { id: "VAV_CHW_COIL", name: "Chilled Water Cooling Coil", type: "PIPE", status: "INSTALLED", weightOrVolume: "2 Rows" }
    ];
    addBimMesh(vavBox, "VAV-1-NW-04", "VAV Terminal Unit 1-NW-04", "L1_TYPICAL", "BAY_C3_D4", 20, 19, vavSubComps);

    // Orbit Controls (Mouse)
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
        // Construct the selection object
        setSelectedEntity({
          id: hit.entityId,
          name: hit.name,
          type: "ELEMENT",
          discipline: hit.entityId.includes("VAV") ? "DEFECT" : "STRUCTURAL",
          parentLevel: hit.level,
          parentZone: hit.zone,
          subComponents: hit.subComponents || [],
          boqSummary: {
            concrete_m3: hit.entityId.includes("COL") ? 10.8 : 350.0,
            steel_mt: hit.entityId.includes("COL") ? 1.4 : 31.6,
            ductwork_m2: hit.entityId.includes("DUCT") ? 480.0 : 0,
            total_cost_inr: 320000.0
          }
        });
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

    // Render Loop
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

  // --- UPDATE VISIBILITY, VARIANCE COLORS & HIGHLIGHTING ---
  useEffect(() => {
    if (!elementsGroupRef.current || !isHydrated) return;

    elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.userData || !mesh.material) return;

      const { minWeek, plannedWeek, level, zone, originalColor, originalEmissive, originalEmissiveIntensity, entityId } = mesh.userData;

      // 1. Visibility Filters
      const isConstructed = timelineWeek >= minWeek;
      const levelMatches = activeLevel === "ALL" || level === activeLevel;
      const zoneMatches = activeZone === "ALL_ZONES" || zone === activeZone;
      mesh.visible = isConstructed && levelMatches && zoneMatches;

      // 2. Color Resolution (Variance vs Original)
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (timelineMode === "VARIANCE") {
        const delta = minWeek - plannedWeek;
        if (delta > 0) mat.color.setHex(0xef4444); // Delayed (Red)
        else if (delta < 0) mat.color.setHex(0x10b981); // Ahead (Green)
        else mat.color.setHex(0x0284c7); // On Schedule (Blue)
      } else {
        // Reset to architectural original color
        mat.color.setHex(originalColor);
      }

      // 3. Selection Highlighting
      const isSelected = selectedEntity.id === entityId || (selectedEntity.type === "ZONE" && zone === selectedEntity.id.replace("ZONE_", ""));
      if (isSelected) {
        mat.emissive.setHex(0x0a5c7a); // Cyan Glow
        mat.emissiveIntensity = 0.6;
      } else {
        mat.emissive.setHex(originalEmissive);
        mat.emissiveIntensity = originalEmissiveIntensity;
      }
    });
  }, [timelineWeek, timelineMode, activeLevel, activeZone, selectedEntity, isHydrated]);

  if (!isHydrated) return <div className="w-full h-[520px] flex items-center justify-center bg-slate-950 text-cyan-500 font-mono text-sm border border-slate-800 rounded-xl">INITIALIZING BIM ENGINE...</div>;

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 2. 3D WEBGL VIEWPORT (Spans 8 cols) */}
        <div className="lg:col-span-8 relative w-full h-[540px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
          
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
            <div className="px-2.5 py-1 bg-slate-900/90 border border-cyan-500/40 rounded text-xs font-mono text-cyan-300 flex items-center gap-2 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              WebGL Engine Phase 1
            </div>
            {hoveredTag && (
              <div className="px-2.5 py-1 bg-blue-950/90 border border-blue-400/50 rounded text-xs font-mono text-blue-200 backdrop-blur-md">
                {hoveredTag}
              </div>
            )}
          </div>
        </div>

        {/* 3. SUB-COMPONENT INSPECTOR PANEL (Spans 4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col h-[540px] overflow-y-auto custom-scrollbar">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">Active Selection</div>
          <h3 className="text-base font-bold text-white mb-4">{selectedEntity.name}</h3>
          
          <div className="text-xs font-mono text-slate-400 border-b border-slate-800 pb-2 mb-4">
            ID: {selectedEntity.id} | Type: {selectedEntity.type}
          </div>

          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3">Sub-Component Breakdown</div>
          
          {selectedEntity.subComponents && selectedEntity.subComponents.length > 0 ? (
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
              No granular sub-components tracked for this macro selection. Click a specific column or VAV box in the 3D model.
            </div>
          )}
        </div>
      </div>

      {/* 4. 4D GANTT PROGRESS ENGINE SLIDER */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col gap-2.5">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200 uppercase tracking-wider">
              4D Construction Progression Slider:
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
          <span>W20: MEP Air Network</span>
          <span className="text-amber-400 font-bold">W24: CPWD DLP Clause 17</span>
        </div>
      </div>
    </div>
  );
}
ENGINE_V3_EOF

echo "✓ Phase 1 Enhancements Applied: components/bim/FullBimSimulationEngine.tsx"
