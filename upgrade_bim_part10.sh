#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: BIM ENGINE PHASE 10 (PRECISION CAD & INSTANCED MESHES)
# Features: CAD Edges, High-FPS Instanced Scaffolding, X-Ray Rendering Modes
# ==============================================================================

set -euo pipefail

cat << 'ENGINE_V12_EOF' > components/bim/FullBimSimulationEngine.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

export type SelectionLevel = "ALL" | "L0_FOUNDATION" | "L1_TYPICAL" | "L2_ROOF";
export type SelectionZone = "ALL_ZONES" | "BAY_A1_B2" | "BAY_C3_D4";
export type ShiftMode = "DAY_SHIFT" | "NIGHT_SHIFT";
export type RenderMode = "SOLID" | "CAD_EDGES" | "X_RAY";

export interface BOQLineItem { itemCode: string; description: string; quantity: number; unit: string; rateINR: number; amountINR: number; }
export interface SubComponent { id: string; name: string; type: string; status: "INSTALLED" | "PENDING" | "DEFECT" | "IN_PROGRESS" | "CLASH" | "ACTIVE"; weightOrVolume: string; }

export interface SelectedEntity {
  id: string; name: string; type: "LEVEL" | "ZONE" | "ELEMENT" | "MACHINERY"; discipline: "CIVIL" | "STRUCTURAL" | "MEP" | "DEFECT" | "ARCHITECTURAL" | "SAFETY";
  parentLevel: SelectionLevel; parentZone: SelectionZone; subComponents: SubComponent[]; boqItems: BOQLineItem[];
  boqSummary: { concrete_m3: number; steel_mt: number; ductwork_m2: number; total_cost_inr: number; };
}

export interface CameraWaypoint { id: string; name: string; position: [number, number, number]; type: "CCTV_FIXED" | "DRONE_PHOTOGRAMMETRY"; latestCapture: { timestamp: string; sha256: string; verifiedDeviationMm: number; }; }

export default function FullBimSimulationEngine() {
  const mountRef = useRef<HTMLDivElement>(null);

  const [isHydrated, setIsHydrated] = useState(false);
  const [timelineWeek, setTimelineWeek] = useState<number>(24);
  const [timelineMode, setTimelineMode] = useState<"ACTUAL" | "PLANNED" | "VARIANCE">("ACTUAL");
  const [shiftMode, setShiftMode] = useState<ShiftMode>("DAY_SHIFT");
  const [renderMode, setRenderMode] = useState<RenderMode>("CAD_EDGES");
  const [activeLevel, setActiveLevel] = useState<SelectionLevel>("ALL");
  const [activeZone, setActiveZone] = useState<SelectionZone>("ALL_ZONES");
  
  const [planCutZ, setPlanCutZ] = useState<number>(100);
  const [explodeY, setExplodeY] = useState<number>(0);
  
  const [activeCamera, setActiveCamera] = useState<CameraWaypoint | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"SUB_COMPS" | "BOQ_LEDGER" | "LIVE_IOT" | "CLASH_MATRIX" | "CRANE_SENSOR">("SUB_COMPS");

  const [liveSensor, setLiveSensor] = useState({ damperAngle: 45.0, airflowCfm: 450, craneLoad: 2.1, craneWind: 14.5, tick: 0 });

  const defaultEntity: SelectedEntity = {
    id: "ENTIRE_TOWER_A", name: "Tower A - Consolidated Facility", type: "LEVEL", discipline: "STRUCTURAL",
    parentLevel: "ALL", parentZone: "ALL_ZONES", subComponents: [],
    boqItems: [
      { itemCode: "CPWD-5.33", description: "M35 Grade Ready Mix Concrete", quantity: 1420.5, unit: "Cum", rateINR: 7600, amountINR: 10795800 },
      { itemCode: "CPWD-5.22A", description: "Fe500D TMT Reinforcement Steel", quantity: 118.4, unit: "MT", rateINR: 78500, amountINR: 9294400 }
    ],
    boqSummary: { concrete_m3: 1420.5, steel_mt: 118.4, ductwork_m2: 3840.0, total_cost_inr: 49500000.0 }
  };
  
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(defaultEntity);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const elementsGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);
  const craneJibRef = useRef<THREE.Group | null>(null);
  const clipPlaneRef = useRef<THREE.Plane | null>(null);
  const pickableMeshes = useRef<THREE.Mesh[]>([]);

  const cameraStations: CameraWaypoint[] = useMemo(() => [
    { id: "CAM-01-TOWER-NE", name: "Fixed CCTV Mast (NE Corner)", position: [22, 22, 18], type: "CCTV_FIXED", latestCapture: { timestamp: "2026-10-24 11:42:00 IST", sha256: "7f4c9a18...3c10a", verifiedDeviationMm: 1.8 } },
    { id: "DRONE-WP-03", name: "Drone Photogrammetry (Level 1)", position: [8, 10, 10], type: "DRONE_PHOTOGRAMMETRY", latestCapture: { timestamp: "2026-10-24 09:15:22 IST", sha256: "5b8d8d42...7a64", verifiedDeviationMm: 0.9 } }
  ], []);

  const escrowStatus = useMemo(() => {
    const totalAllocated = 49500000;
    let cleared = 0, retained = 0;
    if (timelineWeek >= 4) cleared += 12500000;
    if (timelineWeek >= 8) cleared += 11800000;
    if (timelineWeek >= 16) cleared += 12400000;
    if (timelineWeek >= 20) { cleared += 8500000; retained += 2250000; }
    return { allocated: totalAllocated, cleared, retained, pending: totalAllocated - cleared - retained };
  }, [timelineWeek]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("quadillar_bim_state_v10");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timelineWeek) setTimelineWeek(parsed.timelineWeek);
        if (parsed.timelineMode) setTimelineMode(parsed.timelineMode);
        if (parsed.activeLevel) setActiveLevel(parsed.activeLevel);
        if (parsed.activeZone) setActiveZone(parsed.activeZone);
        if (parsed.planCutZ) setPlanCutZ(parsed.planCutZ);
        if (parsed.explodeY) setExplodeY(parsed.explodeY);
        if (parsed.shiftMode) setShiftMode(parsed.shiftMode);
        if (parsed.renderMode) setRenderMode(parsed.renderMode);
      }
    } catch (e) {}
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("quadillar_bim_state_v10", JSON.stringify({ timelineWeek, timelineMode, activeLevel, activeZone, planCutZ, explodeY, shiftMode, renderMode }));
  }, [timelineWeek, timelineMode, activeLevel, activeZone, planCutZ, explodeY, shiftMode, renderMode, isHydrated]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveSensor(prev => {
        const t = Date.now() / 1000;
        return {
          damperAngle: +(45.0 + Math.sin(t * 1.5) * 0.5 + 1.8).toFixed(2),
          airflowCfm: Math.round(450 + Math.cos(t * 1.2) * 5 - 42),
          craneLoad: +(2.1 + Math.sin(t * 0.8) * 0.4).toFixed(2),
          craneWind: +(14.5 + Math.cos(t * 0.5) * 2.5).toFixed(1),
          tick: prev.tick + 1
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
    camera.position.set(48, 38, 62);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 20);
    clipPlaneRef.current = clipPlane;

    const lightsGroup = new THREE.Group();
    lightsGroupRef.current = lightsGroup;
    scene.add(lightsGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    const dirLight = new THREE.DirectionalLight(0xdbeafe, 1.4);
    dirLight.position.set(50, 75, 40);
    dirLight.castShadow = true;
    
    const spotLight1 = new THREE.SpotLight(0xfff5e6, 0); 
    spotLight1.position.set(20, 40, 20);
    spotLight1.angle = Math.PI / 4;
    
    const spotLight2 = new THREE.SpotLight(0xfff5e6, 0);
    spotLight2.position.set(-20, 40, -20);
    spotLight2.angle = Math.PI / 4;

    lightsGroup.add(ambientLight, dirLight, spotLight1, spotLight2);

    const grid = new THREE.GridHelper(70, 35, 0x00f0ff, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    const bimGroup = new THREE.Group();
    elementsGroupRef.current = bimGroup;
    scene.add(bimGroup);
    pickableMeshes.current = [];

    const slabMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, clippingPlanes: [clipPlane] });
    const colMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8, clippingPlanes: [clipPlane] });
    const ductMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25, clippingPlanes: [clipPlane] });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3, clippingPlanes: [clipPlane] });
    const trayMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.8, roughness: 0.4, clippingPlanes: [clipPlane] });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.95, clippingPlanes: [clipPlane] });
    const vavMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.8, clippingPlanes: [clipPlane] });
    const clashMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xaa0000, emissiveIntensity: 0.9, wireframe: true });
    const craneMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.6, metalness: 0.5 });
    const hazardMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.05, side: THREE.DoubleSide });

    const edgeMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.4 });

    const addBimMesh = (mesh: THREE.Mesh, entityId: string, name: string, level: SelectionLevel, zone: SelectionZone, minWeek: number, plannedWeek: number, subComponents: SubComponent[] = [], boqItems: BOQLineItem[] = []) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mesh.userData = { 
        entityId, name, level, zone, minWeek, plannedWeek, 
        originalColor: mat.color ? mat.color.getHex() : 0xffffff,
        originalEmissive: mat.emissive ? mat.emissive.getHex() : 0x000000,
        originalEmissiveIntensity: mat.emissiveIntensity || 0,
        originalOpacity: mat.opacity !== undefined ? mat.opacity : 1,
        originalTransparent: mat.transparent || false,
        originalY: mesh.position.y,
        subComponents, boqItems
      };
      
      // NEW: CAD Edge Geometry overlay for Precision Rendering
      if (entityId.includes("SLAB") || entityId.includes("COL") || entityId.includes("WALL") || entityId.includes("DUCT")) {
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const line = new THREE.LineSegments(edges, edgeMat);
        mesh.add(line);
        mesh.userData.edgeLine = line; // Store ref to toggle visibility
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      pickableMeshes.current.push(mesh);
      bimGroup.add(mesh);
    };

    // Building
    const l0Mesh = new THREE.Mesh(new THREE.BoxGeometry(44, 1.4, 32), slabMat.clone());
    l0Mesh.position.set(0, 0.7, 0);
    addBimMesh(l0Mesh, "SLAB_L0", "Level 0 Foundation Raft", "L0_FOUNDATION", "ALL_ZONES", 1, 1);

    for (let x = -16; x <= 16; x += 11) {
      for (let z = -12; z <= 12; z += 8) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 7, 24), colMat.clone());
        col.position.set(x, 4.9, z);
        addBimMesh(col, `COL_L0_L1_${x}_${z}`, `Column (${x > 0 ? "D" : "C"}-${z > 0 ? "4" : "1"})`, "L0_FOUNDATION", x > 0 ? "BAY_C3_D4" : "BAY_A1_B2", 4, 3);
      }
    }

    const l1Mesh = new THREE.Mesh(new THREE.BoxGeometry(44, 0.8, 32), slabMat.clone());
    l1Mesh.position.set(0, 8.8, 0);
    addBimMesh(l1Mesh, "SLAB_L1", "Level 1 PT Slab", "L1_TYPICAL", "ALL_ZONES", 8, 8);

    const l2Mesh = new THREE.Mesh(new THREE.BoxGeometry(44, 0.8, 32), slabMat.clone());
    l2Mesh.position.set(0, 16.6, 0);
    addBimMesh(l2Mesh, "SLAB_L2", "Level 2 Roof Slab", "L2_ROOF", "ALL_ZONES", 16, 15);

    const drywall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 32), wallMat.clone());
    drywall.position.set(0, 12.7, 0);
    addBimMesh(drywall, "WALL_GYP_L1", "120mm Gypsum Partition", "L1_TYPICAL", "ALL_ZONES", 22, 21);

    const mainDuct = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 1.8), ductMat.clone());
    mainDuct.position.set(8, 7.2, 3);
    addBimMesh(mainDuct, "MEP_TRUNK_DUCT_L1", "Main HVAC Duct", "L1_TYPICAL", "BAY_C3_D4", 19, 18);

    const chwSupply = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 34, 16), pipeMat.clone());
    chwSupply.rotation.z = Math.PI / 2;
    chwSupply.position.set(0, 7.5, 0);
    addBimMesh(chwSupply, "CHW_SUPPLY_L1", "Chilled Water Main", "L1_TYPICAL", "BAY_A1_B2", 20, 19);

    const cableTray = new THREE.Mesh(new THREE.BoxGeometry(28, 0.1, 0.8), trayMat.clone());
    cableTray.rotation.y = Math.PI / 2;
    cableTray.position.set(6, 7.5, 0);
    addBimMesh(cableTray, "ELEC_TRAY_HT", "Main HT Electrical Tray", "L1_TYPICAL", "ALL_ZONES", 21, 20);

    const clashNode = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), clashMat.clone());
    clashNode.position.set(0, 7.5, 0);
    addBimMesh(clashNode, "CLASH_NODE_01", "SPATIAL CLASH", "L1_TYPICAL", "BAY_A1_B2", 21, 20);

    const vavBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 2.0), vavMat.clone());
    vavBox.position.set(12, 7.2, 8);
    addBimMesh(vavBox, "VAV-1-NW-04", "VAV Terminal Unit 1-NW-04", "L1_TYPICAL", "BAY_C3_D4", 20, 19);

    // NEW: INSTANCED MESH FOR HIGH-FPS SCAFFOLDING
    // Generate 1,000 scaffold tubes around Level 1 without tanking FPS
    const scaffoldCount = 1000;
    const scaffoldGeo = new THREE.CylinderGeometry(0.04, 0.04, 7.5, 6);
    const scaffoldInstMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3, clippingPlanes: [clipPlane] });
    const scaffoldInstMesh = new THREE.InstancedMesh(scaffoldGeo, scaffoldInstMat, scaffoldCount);
    
    const dummy = new THREE.Object3D();
    let idx = 0;
    // Create a grid of scaffolding in Bay C3-D4
    for(let x = 6; x <= 20; x += 1.5) {
      for(let z = 2; z <= 14; z += 1.5) {
        if (idx >= scaffoldCount) break;
        dummy.position.set(x, 4.9, z); // From ground to L1
        dummy.updateMatrix();
        scaffoldInstMesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    scaffoldInstMesh.instanceMatrix.needsUpdate = true;
    scaffoldInstMesh.userData = { isAuxiliary: true, minWeek: 2, level: "L0_FOUNDATION", isScaffold: true };
    bimGroup.add(scaffoldInstMesh);

    // TOWER CRANE
    const craneRoot = new THREE.Group();
    craneRoot.position.set(-28, 0, -18);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(2, 36, 2), craneMat);
    mast.position.y = 18;
    craneRoot.add(mast);

    const jibGroup = new THREE.Group();
    jibGroup.position.y = 36;
    craneJibRef.current = jibGroup;
    
    const jib = new THREE.Mesh(new THREE.BoxGeometry(45, 1.5, 1.5), craneMat);
    jib.position.x = 18;
    const counterWeight = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 2), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    counterWeight.position.x = -6;
    jibGroup.add(jib);
    jibGroup.add(counterWeight);
    craneRoot.add(jibGroup);
    
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(3, 38, 3), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.y = 19;
    addBimMesh(hitBox, "CRANE_TC1", "Liebherr Tower Crane (TC-01)", "ALL", "ALL_ZONES", 1, 1);
    craneRoot.add(hitBox);

    const geofence = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 36, 32), hazardMat);
    geofence.position.y = 18;
    geofence.userData = { isAuxiliary: true, minWeek: 1, level: "ALL", originalY: 18 };
    craneRoot.add(geofence);

    bimGroup.add(craneRoot);

    let isDragging = false, prevX = 0, prevY = 0;
    let sph = { r: 75, phi: Math.PI / 3.2, theta: Math.PI / 4 };

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
      sph.r = Math.max(16, Math.min(150, sph.r + e.deltaY * 0.06));
      updateCameraPos();
    };

    const onClick = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(pickableMeshes.current.filter(m => m.visible), false);

      if (hits.length > 0) {
        const hit = hits[0].object.userData;
        if (hit.isCamera) {
          setActiveCamera(hit.cameraData);
        } else {
          const isDefect = hit.entityId.includes("VAV");
          const isClash = hit.entityId.includes("CLASH");
          const isCrane = hit.entityId.includes("CRANE");
          
          if (isDefect) setInspectorTab("LIVE_IOT");
          else if (isClash) setInspectorTab("CLASH_MATRIX");
          else if (isCrane) setInspectorTab("CRANE_SENSOR");
          else setInspectorTab("SUB_COMPS");
          
          setSelectedEntity({
            id: hit.entityId, name: hit.name, type: isCrane ? "MACHINERY" : "ELEMENT",
            discipline: isCrane ? "SAFETY" : (isClash ? "DEFECT" : (isDefect ? "DEFECT" : (hit.entityId.includes("COL") ? "STRUCTURAL" : "MEP"))),
            parentLevel: hit.level, parentZone: hit.zone,
            subComponents: hit.subComponents || [], boqItems: hit.boqItems || [],
            boqSummary: { concrete_m3: 10, steel_mt: 1, ductwork_m2: 0, total_cost_inr: 50000 }
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
      const t = Date.now() * 0.001;
      
      const clash = pickableMeshes.current.find(m => m.userData.entityId === "CLASH_NODE_01");
      if (clash && clash.visible) {
        clash.scale.setScalar(1 + Math.sin(t * 6) * 0.2);
        (clash.material as any).emissiveIntensity = 0.5 + Math.sin(t * 6) * 0.5;
      }

      if (craneJibRef.current) {
        craneJibRef.current.rotation.y = Math.sin(t * 0.2) * 0.5 + Math.PI / 4;
      }

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

  // LIGHTING FOR DAY/NIGHT SHIFT
  useEffect(() => {
    if (!lightsGroupRef.current || !sceneRef.current) return;
    const isNight = shiftMode === "NIGHT_SHIFT";
    sceneRef.current.background = new THREE.Color(isNight ? 0x010308 : 0x060a14);
    
    const lights = lightsGroupRef.current.children;
    const ambient = lights[0] as THREE.AmbientLight;
    const dir = lights[1] as THREE.DirectionalLight;
    const spot1 = lights[2] as THREE.SpotLight;
    const spot2 = lights[3] as THREE.SpotLight;

    if (isNight) {
      ambient.intensity = 0.1;
      dir.intensity = 0.1;
      spot1.intensity = 2000;
      spot2.intensity = 2000;
    } else {
      ambient.intensity = 0.8;
      dir.intensity = 1.4;
      spot1.intensity = 0;
      spot2.intensity = 0;
    }
  }, [shiftMode]);

  // Z-AXIS CLIP & Y-AXIS EXPLODE
  useEffect(() => {
    if (clipPlaneRef.current) clipPlaneRef.current.constant = 25 * (planCutZ / 100);
    if (elementsGroupRef.current) {
      elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.userData && mesh.userData.originalY !== undefined) {
          const levelMultiplier = mesh.userData.level === "L2_ROOF" ? 14 : mesh.userData.level === "L1_TYPICAL" ? 7 : 0;
          mesh.position.y = mesh.userData.originalY + (explodeY / 100) * levelMultiplier;
        }
      });
    }
  }, [planCutZ, explodeY]);

  // --- RENDER MODE (SOLID / CAD / X-RAY) & VISIBILITY ---
  useEffect(() => {
    if (!elementsGroupRef.current || !isHydrated) return;

    elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.userData || !mesh.material) return;
      if (mesh.userData.isCamera || mesh.userData.isAuxiliary) return;

      const { minWeek, plannedWeek, level, zone, originalColor, originalEmissive, originalEmissiveIntensity, originalOpacity, originalTransparent, entityId } = mesh.userData;
      const mat = mesh.material as any;

      const isConstructed = timelineWeek >= minWeek;
      const levelMatches = activeLevel === "ALL" || level === activeLevel;
      const zoneMatches = activeZone === "ALL_ZONES" || zone === activeZone;
      
      mesh.visible = isConstructed && levelMatches;

      // Handle CAD Edges & X-Ray Mode
      if (mesh.userData.edgeLine) {
        mesh.userData.edgeLine.visible = (renderMode === "CAD_EDGES" || renderMode === "X_RAY");
      }

      if (mesh.visible && !mesh.userData.entityId.includes("CRANE")) {
        if (!zoneMatches) {
          mat.transparent = true;
          mat.opacity = 0.1;
          mat.wireframe = false;
        } else {
          mat.transparent = originalTransparent || renderMode === "X_RAY";
          mat.opacity = renderMode === "X_RAY" ? 0.2 : originalOpacity;
          mat.wireframe = renderMode === "X_RAY";
        }
      }

      if (mat.color && originalColor !== undefined && entityId !== "CLASH_NODE_01") {
        if (timelineMode === "VARIANCE") {
          const delta = minWeek - plannedWeek;
          if (delta > 0) mat.color.setHex(0xef4444);
          else if (delta < 0) mat.color.setHex(0x10b981);
          else mat.color.setHex(0x0284c7);
        } else {
          mat.color.setHex(originalColor);
        }
      }

      if (mat.emissive && originalEmissive !== undefined) {
        const isSelected = selectedEntity.id === entityId || (selectedEntity.type === "ZONE" && zone === selectedEntity.id.replace("ZONE_", ""));
        if (isSelected && entityId !== "CLASH_NODE_01") {
          mat.emissive.setHex(0x0a5c7a);
          mat.emissiveIntensity = 0.6;
        } else if (entityId !== "CLASH_NODE_01") {
          mat.emissive.setHex(originalEmissive);
          mat.emissiveIntensity = originalEmissiveIntensity;
        }
      }
    });

    // Handle Instanced Scaffolding Visibility
    const scaffold = elementsGroupRef.current.children.find((m: any) => m.userData && m.userData.isScaffold);
    if (scaffold) {
      scaffold.visible = (timelineWeek >= 2 && timelineWeek <= 7) && activeLevel === "ALL" && (renderMode !== "X_RAY");
    }
  }, [timelineWeek, timelineMode, activeLevel, activeZone, selectedEntity, renderMode, isHydrated]);

  if (!isHydrated) return <div className="w-full h-[520px] bg-slate-950"></div>;

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Level:</span>
          {(["ALL", "L0_FOUNDATION", "L1_TYPICAL", "L2_ROOF"] as SelectionLevel[]).map((lvl) => (
            <button key={lvl} onClick={() => setActiveLevel(lvl)} className={`px-3 py-1 text-xs font-mono rounded transition-all ${activeLevel === lvl ? "bg-cyan-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
              {lvl.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* NEW: RENDER MODE TOGGLES */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-lg">
          {(["SOLID", "CAD_EDGES", "X_RAY"] as const).map((mode) => (
            <button key={mode} onClick={() => setRenderMode(mode)} className={`px-2.5 py-0.5 text-[11px] font-mono rounded font-semibold transition ${renderMode === mode ? "bg-purple-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}>
              {mode.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShiftMode(shiftMode === "DAY_SHIFT" ? "NIGHT_SHIFT" : "DAY_SHIFT")} className={`px-3 py-1 text-xs font-bold uppercase rounded border transition-all ${shiftMode === "NIGHT_SHIFT" ? "bg-indigo-900 border-indigo-500 text-indigo-200" : "bg-sky-900 border-sky-500 text-sky-200"}`}>
            {shiftMode === "NIGHT_SHIFT" ? "🌙 Night Shift" : "☀️ Day Shift"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 2. 3D WEBGL VIEWPORT */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="relative w-full h-[500px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
              <div className="px-2.5 py-1 bg-slate-900/90 border border-cyan-500/40 rounded text-xs font-mono text-cyan-300 flex items-center gap-2 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> LiveView Phase 10: Precision Engineering
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center gap-4"><span className="text-[11px] font-bold text-slate-300 uppercase whitespace-nowrap">Z-Axis Slicer:</span><input type="range" min="0" max="100" step="1" value={planCutZ} onChange={(e) => setPlanCutZ(parseInt(e.target.value, 10))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400" /></div>
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center gap-4"><span className="text-[11px] font-bold text-slate-300 uppercase whitespace-nowrap">Y-Axis Explode:</span><input type="range" min="0" max="100" step="1" value={explodeY} onChange={(e) => setExplodeY(parseInt(e.target.value, 10))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400" /></div>
          </div>
        </div>

        {/* 3. INSPECTOR PANEL */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col h-[540px] overflow-hidden">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">Active Selection</div>
          <h3 className="text-base font-bold text-white mb-2">{selectedEntity.name}</h3>
          
          <div className="flex border-b border-slate-800 mb-4 overflow-x-auto">
            <button onClick={() => setInspectorTab("SUB_COMPS")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${inspectorTab === "SUB_COMPS" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500 hover:text-slate-300"}`}>Details</button>
            <button onClick={() => setInspectorTab("BOQ_LEDGER")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${inspectorTab === "BOQ_LEDGER" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500 hover:text-slate-300"}`}>BOQ</button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {inspectorTab === "SUB_COMPS" ? (
              selectedEntity.subComponents.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {selectedEntity.subComponents.map(sub => (
                    <div key={sub.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex flex-col gap-1.5">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-semibold text-slate-200">{sub.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-500/50`}>{sub.status}</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono text-slate-500"><span>Type: {sub.type}</span><span>Spec: {sub.weightOrVolume}</span></div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">Select an element to view details.</div>
            ) : <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">No BOQ items assigned.</div>}
          </div>
        </div>
      </div>
      
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl flex flex-col gap-4">
        <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3"><span className="font-bold text-slate-200 uppercase tracking-wider">Visual 4D Schedule Analyzer:</span><span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono font-bold rounded border border-blue-500/30">Week {timelineWeek}</span></div>
        </div>
        <input type="range" min="1" max="24" step="1" value={timelineWeek} onChange={(e) => setTimelineWeek(parseInt(e.target.value, 10))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 mb-2" />
      </div>
    </div>
  );
}
ENGINE_V12_EOF

echo "✓ Phase 10 Applied: CAD Edges, X-Ray Modes, and Instanced Scaffolding"
