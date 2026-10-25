#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: BIM ENGINE PHASE 9 (CRANE TELEMETRY & NIGHT SHIFT)
# Features: Animated Tower Crane, Safety Geofence, Day/Night Lighting Modes
# ==============================================================================

set -euo pipefail

cat << 'ENGINE_V11_EOF' > components/bim/FullBimSimulationEngine.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

export type SelectionLevel = "ALL" | "L0_FOUNDATION" | "L1_TYPICAL" | "L2_ROOF";
export type SelectionZone = "ALL_ZONES" | "BAY_A1_B2" | "BAY_C3_D4";
export type ShiftMode = "DAY_SHIFT" | "NIGHT_SHIFT";

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
      const saved = localStorage.getItem("quadillar_bim_state_v9");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timelineWeek) setTimelineWeek(parsed.timelineWeek);
        if (parsed.timelineMode) setTimelineMode(parsed.timelineMode);
        if (parsed.activeLevel) setActiveLevel(parsed.activeLevel);
        if (parsed.activeZone) setActiveZone(parsed.activeZone);
        if (parsed.planCutZ) setPlanCutZ(parsed.planCutZ);
        if (parsed.explodeY) setExplodeY(parsed.explodeY);
        if (parsed.shiftMode) setShiftMode(parsed.shiftMode);
      }
    } catch (e) {}
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("quadillar_bim_state_v9", JSON.stringify({ timelineWeek, timelineMode, activeLevel, activeZone, planCutZ, explodeY, shiftMode }));
  }, [timelineWeek, timelineMode, activeLevel, activeZone, planCutZ, explodeY, shiftMode, isHydrated]);

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

    // Lighting Group (For Day/Night Toggle)
    const lightsGroup = new THREE.Group();
    lightsGroupRef.current = lightsGroup;
    scene.add(lightsGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    const dirLight = new THREE.DirectionalLight(0xdbeafe, 1.4);
    dirLight.position.set(50, 75, 40);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;

    // Night Lights
    const spotLight1 = new THREE.SpotLight(0xfff5e6, 0); // Halogen warm white
    spotLight1.position.set(20, 40, 20);
    spotLight1.angle = Math.PI / 4;
    spotLight1.penumbra = 0.5;
    spotLight1.castShadow = true;
    
    const spotLight2 = new THREE.SpotLight(0xfff5e6, 0);
    spotLight2.position.set(-20, 40, -20);
    spotLight2.angle = Math.PI / 4;
    spotLight2.penumbra = 0.5;
    spotLight2.castShadow = true;

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
    const craneMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.6, metalness: 0.5 }); // Yellow machinery
    const hazardMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.05, side: THREE.DoubleSide }); // Safety geofence

    const addBimMesh = (mesh: THREE.Mesh, entityId: string, name: string, level: SelectionLevel, zone: SelectionZone, minWeek: number, plannedWeek: number, subComponents: SubComponent[] = [], boqItems: BOQLineItem[] = []) => {
      const mat = mesh.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
      mesh.userData = { 
        entityId, name, level, zone, minWeek, plannedWeek, 
        originalColor: (mat as any).color ? (mat as any).color.getHex() : 0xffffff,
        originalEmissive: (mat as any).emissive ? (mat as any).emissive.getHex() : 0x000000,
        originalEmissiveIntensity: (mat as any).emissiveIntensity || 0,
        originalOpacity: mat.opacity !== undefined ? mat.opacity : 1,
        originalTransparent: mat.transparent || false,
        originalY: mesh.position.y,
        subComponents, boqItems
      };
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

    const haloMesh = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.2, 32), new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
    haloMesh.rotation.x = Math.PI / 2;
    haloMesh.position.set(12, 5.8, 8);
    haloMesh.userData = { isAuxiliary: true, minWeek: 20, level: "L1_TYPICAL", originalY: 5.8 };
    bimGroup.add(haloMesh);

    // NEW: TOWER CRANE & SAFETY GEOFENCE
    const craneRoot = new THREE.Group();
    craneRoot.position.set(-28, 0, -18); // Outside Bay A1
    
    // Crane Mast
    const mast = new THREE.Mesh(new THREE.BoxGeometry(2, 36, 2), craneMat);
    mast.position.y = 18;
    craneRoot.add(mast);

    // Crane Jib (Rotating Part)
    const jibGroup = new THREE.Group();
    jibGroup.position.y = 36;
    craneJibRef.current = jibGroup;
    
    const jib = new THREE.Mesh(new THREE.BoxGeometry(45, 1.5, 1.5), craneMat);
    jib.position.x = 18; // Offset so it rotates around the mast
    
    const counterWeight = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 2), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    counterWeight.position.x = -6;
    
    jibGroup.add(jib);
    jibGroup.add(counterWeight);
    craneRoot.add(jibGroup);
    
    // Make crane interactive
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(3, 38, 3), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.y = 19;
    addBimMesh(hitBox, "CRANE_TC1", "Liebherr Tower Crane (TC-01)", "ALL", "ALL_ZONES", 1, 1, [
      { id: "HOOK_BLOCK", name: "Heavy Duty Hook Block", type: "EQUIPMENT", status: "ACTIVE", weightOrVolume: "SWL: 5.0T" }
    ]);
    craneRoot.add(hitBox);

    // Safety Geofence (Crane Swing Radius)
    const geofence = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 36, 32), hazardMat);
    geofence.position.y = 18;
    geofence.userData = { isAuxiliary: true, minWeek: 1, level: "ALL", originalY: 18 };
    craneRoot.add(geofence);

    bimGroup.add(craneRoot);

    // Cameras
    cameraStations.forEach((cam) => {
      const camMesh = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.8, 16), new THREE.MeshStandardMaterial({ color: cam.type === "CCTV_FIXED" ? 0x06b6d4 : 0xa855f7, emissive: cam.type === "CCTV_FIXED" ? 0x0891b2 : 0x7e22ce, emissiveIntensity: 0.6 }));
      camMesh.position.set(...cam.position);
      camMesh.rotation.x = Math.PI;
      const camLevel = cam.position[1] > 16 ? "L2_ROOF" : "L1_TYPICAL";
      camMesh.userData = { isCamera: true, cameraData: cam, name: cam.name, originalY: cam.position[1], level: camLevel };
      pickableMeshes.current.push(camMesh);
      bimGroup.add(camMesh);
    });

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
      
      haloMesh.scale.set(1 + Math.sin(t * 4) * 0.15, 1 + Math.sin(t * 4) * 0.15, 1);
      (haloMesh.material as any).opacity = 0.5 + Math.sin(t * 4) * 0.4;

      const clash = pickableMeshes.current.find(m => m.userData.entityId === "CLASH_NODE_01");
      if (clash && clash.visible) {
        clash.scale.setScalar(1 + Math.sin(t * 6) * 0.2);
        (clash.material as any).emissiveIntensity = 0.5 + Math.sin(t * 6) * 0.5;
      }

      // Rotate Crane Jib smoothly
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
  }, [isHydrated, cameraStations]);

  // UPDATE LIGHTING FOR DAY/NIGHT SHIFT
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

  // UPDATE Z-AXIS CLIP & Y-AXIS EXPLODE
  useEffect(() => {
    if (clipPlaneRef.current) {
      clipPlaneRef.current.constant = 25 * (planCutZ / 100);
    }
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

  // UPDATE VISIBILITY, GHOSTING & VARIANCE
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

      if (mesh.visible && !mesh.userData.entityId.includes("CRANE")) {
        if (!zoneMatches) {
          mat.transparent = true;
          mat.opacity = 0.1;
        } else {
          mat.transparent = originalTransparent;
          mat.opacity = originalOpacity;
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
  }, [timelineWeek, timelineMode, activeLevel, activeZone, selectedEntity, isHydrated]);

  const ganttMilestones = useMemo(() => {
    return [
      { name: "Substructure", plannedStart: 0, plannedDuration: 4, actualStart: 1, actualDuration: 3, status: "AHEAD", camRef: "CAM-01", hash: "7f4c9a18" },
      { name: "Level 1 PT Slab", plannedStart: 4, plannedDuration: 4, actualStart: 4, actualDuration: 4, status: "ON_TIME", camRef: "DRONE", hash: "5b8d8d42" },
      { name: "Level 2 Roof Slab", plannedStart: 8, plannedDuration: 7, actualStart: 8, actualDuration: 8, status: "DELAYED", camRef: "APP", hash: "a90e52a1" },
      { name: "MEP Routing (Clash)", plannedStart: 15, plannedDuration: 4, actualStart: 16, actualDuration: 4, status: "DELAYED", camRef: "DRONE", hash: "Pending" },
      { name: "CPWD Handover", plannedStart: 22, plannedDuration: 2, actualStart: 22, actualDuration: 2, status: "ON_TIME", camRef: "LEDGER", hash: "Pending" }
    ];
  }, []);

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
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Spatial Isolation:</span>
          <button onClick={() => setActiveZone("ALL_ZONES")} className={`px-2.5 py-1 text-xs font-mono rounded border ${activeZone === "ALL_ZONES" ? "bg-cyan-950/80 border-cyan-500 text-cyan-300" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}>All Bays</button>
          <button onClick={() => setActiveZone("BAY_A1_B2")} className={`px-2.5 py-1 text-xs font-mono rounded border ${activeZone === "BAY_A1_B2" ? "bg-cyan-950/80 border-cyan-500 text-cyan-300" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}>Bay A1-B2</button>
          <button onClick={() => setActiveZone("BAY_C3_D4")} className={`px-2.5 py-1 text-xs font-mono rounded border ${activeZone === "BAY_C3_D4" ? "bg-amber-950/90 border-amber-500 text-amber-300 font-bold shadow-sm shadow-amber-500/20" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}>Bay C3-D4</button>
        </div>
        <div className="flex items-center gap-3">
          {/* NEW: Shift Toggle */}
          <button 
            onClick={() => setShiftMode(shiftMode === "DAY_SHIFT" ? "NIGHT_SHIFT" : "DAY_SHIFT")}
            className={`px-3 py-1 text-xs font-bold uppercase rounded border transition-all ${shiftMode === "NIGHT_SHIFT" ? "bg-indigo-900 border-indigo-500 text-indigo-200" : "bg-sky-900 border-sky-500 text-sky-200"}`}
          >
            {shiftMode === "NIGHT_SHIFT" ? "🌙 Night Shift" : "☀️ Day Shift"}
          </button>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-lg">
            {(["ACTUAL", "PLANNED", "VARIANCE"] as const).map((mode) => (
              <button key={mode} onClick={() => setTimelineMode(mode)} className={`px-2.5 py-0.5 text-[11px] font-mono rounded font-semibold transition ${timelineMode === mode ? (mode === "VARIANCE" ? "bg-amber-500 text-slate-950" : "bg-cyan-500 text-slate-950") : "text-slate-400 hover:text-slate-200"}`}>
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 2. 3D WEBGL VIEWPORT & SLIDERS */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="relative w-full h-[500px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            
            <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-700 p-3 rounded-lg backdrop-blur-md w-64 pointer-events-none shadow-2xl">
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-2">Smart Escrow Ledger</div>
              <div className="flex justify-between items-center mb-1.5 border-b border-slate-800 pb-1.5">
                <span className="text-xs text-slate-400">Total Allocated:</span><span className="text-xs font-bold font-mono text-slate-200">₹{(escrowStatus.allocated / 100000).toFixed(2)}L</span>
              </div>
              <div className="flex justify-between items-center mb-1.5 border-b border-slate-800 pb-1.5">
                <span className="text-xs text-slate-400">Verified & Cleared:</span><span className="text-xs font-bold font-mono text-emerald-400">₹{(escrowStatus.cleared / 100000).toFixed(2)}L</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-400">Retained (CPWD Cl 17):</span><span className={`text-xs font-bold font-mono ${escrowStatus.retained > 0 ? "text-amber-400 animate-pulse" : "text-slate-500"}`}>₹{(escrowStatus.retained / 100000).toFixed(2)}L</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(escrowStatus.cleared / escrowStatus.allocated) * 100}%` }}></div>
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(escrowStatus.retained / escrowStatus.allocated) * 100}%` }}></div>
              </div>
            </div>

            <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
              <div className="px-2.5 py-1 bg-slate-900/90 border border-cyan-500/40 rounded text-xs font-mono text-cyan-300 flex items-center gap-2 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> LiveView Phase 9: Site Logistics
              </div>
              {hoveredTag && <div className="px-2.5 py-1 bg-blue-950/90 border border-blue-400/50 rounded text-xs font-mono text-blue-200 backdrop-blur-md">{hoveredTag}</div>}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center gap-4">
              <span className="text-[11px] font-bold text-slate-300 uppercase whitespace-nowrap">Z-Axis Slicer:</span>
              <input type="range" min="0" max="100" step="1" value={planCutZ} onChange={(e) => setPlanCutZ(parseInt(e.target.value, 10))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center gap-4">
              <span className="text-[11px] font-bold text-slate-300 uppercase whitespace-nowrap">Y-Axis Explode:</span>
              <input type="range" min="0" max="100" step="1" value={explodeY} onChange={(e) => setExplodeY(parseInt(e.target.value, 10))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400" />
            </div>
          </div>
        </div>

        {/* 3. INSPECTOR PANEL */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col h-[540px] overflow-hidden">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">Active Selection</div>
          <h3 className="text-base font-bold text-white mb-2">{selectedEntity.name}</h3>
          
          <div className="flex border-b border-slate-800 mb-4 overflow-x-auto">
            <button onClick={() => setInspectorTab("SUB_COMPS")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${inspectorTab === "SUB_COMPS" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500 hover:text-slate-300"}`}>Details</button>
            <button onClick={() => setInspectorTab("BOQ_LEDGER")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${inspectorTab === "BOQ_LEDGER" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500 hover:text-slate-300"}`}>BOQ</button>
            {(selectedEntity.discipline === "MEP" || selectedEntity.id === "VAV-1-NW-04") && (
              <button onClick={() => setInspectorTab("LIVE_IOT")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap flex items-center gap-1 ${inspectorTab === "LIVE_IOT" ? "text-amber-400 border-b-2 border-amber-400" : "text-slate-500 hover:text-slate-300"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> IoT
              </button>
            )}
            {selectedEntity.id === "CLASH_NODE_01" && (
              <button onClick={() => setInspectorTab("CLASH_MATRIX")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap flex items-center gap-1 ${inspectorTab === "CLASH_MATRIX" ? "text-red-400 border-b-2 border-red-400" : "text-slate-500 hover:text-slate-300"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Clash
              </button>
            )}
            {selectedEntity.discipline === "SAFETY" && (
              <button onClick={() => setInspectorTab("CRANE_SENSOR")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap flex items-center gap-1 ${inspectorTab === "CRANE_SENSOR" ? "text-yellow-400 border-b-2 border-yellow-400" : "text-slate-500 hover:text-slate-300"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span> Telemetry
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {inspectorTab === "SUB_COMPS" ? (
              selectedEntity.subComponents.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {selectedEntity.subComponents.map(sub => (
                    <div key={sub.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex flex-col gap-1.5">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-semibold text-slate-200">{sub.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${sub.status === "DEFECT" ? "bg-amber-950/50 text-amber-400 border border-amber-500/50" : sub.status === "CLASH" ? "bg-red-950/50 text-red-400 border border-red-500/50" : "bg-emerald-950/50 text-emerald-400 border border-emerald-500/50"}`}>{sub.status}</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono text-slate-500">
                        <span>Type: {sub.type}</span>
                        <span>Spec: {sub.weightOrVolume}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">Select an element to view details.</div>
            ) : inspectorTab === "BOQ_LEDGER" ? (
              selectedEntity.boqItems.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {selectedEntity.boqItems.map(item => (
                    <div key={item.itemCode} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono font-bold text-cyan-400">{item.itemCode}</span>
                        <span className="text-xs font-bold text-amber-300">₹{item.amountINR.toLocaleString("en-IN")}</span>
                      </div>
                      <p className="text-xs text-slate-300">{item.description}</p>
                    </div>
                  ))}
                </div>
              ) : <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">No BOQ items assigned.</div>
            ) : inspectorTab === "CLASH_MATRIX" ? (
              <div className="flex flex-col gap-4">
                <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-4">
                  <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-3">AXIS SPATIAL LOCKOUT</div>
                  <h4 className="text-sm font-bold text-slate-200 mb-2">Hard Intersect: MEP vs Electrical</h4>
                  <p className="text-xs text-slate-400 mb-4">The 200mm Chilled Water Pipe physically collides with the 600mm HT Cable Tray at Elev: 7.500m. Concreting suspended.</p>
                  <button className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded transition">Raise Coordination RFI</button>
                </div>
              </div>
            ) : inspectorTab === "CRANE_SENSOR" ? (
              <div className="flex flex-col gap-4">
                <div className="bg-yellow-950/30 border border-yellow-500/40 rounded-xl p-4">
                  <div className="text-[10px] font-mono text-yellow-400 uppercase tracking-widest mb-3 flex justify-between"><span>Machinery Telemetry</span><span>Tick #{liveSensor.tick}</span></div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-center">
                      <div className="text-[10px] text-slate-400 uppercase">Hook Load</div>
                      <div className="text-xl font-bold font-mono text-yellow-400 mt-1">{liveSensor.craneLoad} T</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">SWL: 5.0 Tons</div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-center">
                      <div className="text-[10px] text-slate-400 uppercase">Wind Speed</div>
                      <div className="text-xl font-bold font-mono text-slate-200 mt-1">{liveSensor.craneWind}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">km/h</div>
                    </div>
                  </div>
                  <div className="bg-slate-950 border border-yellow-500/30 p-3 rounded-lg">
                    <div className="text-xs font-bold text-yellow-400 uppercase mb-1">Geofence Active</div>
                    <div className="text-[10px] text-slate-400">Anti-collision swing radius enforced. Helmet tracking online.</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4">
                  <div className="text-[10px] font-mono text-amber-400 uppercase tracking-widest mb-3 flex justify-between"><span>Telemetry Loop</span><span>Tick #{liveSensor.tick}</span></div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-center">
                      <div className="text-[10px] text-slate-400 uppercase">Damper</div>
                      <div className="text-xl font-bold font-mono text-amber-400 mt-1">{liveSensor.damperAngle}°</div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-center">
                      <div className="text-[10px] text-slate-400 uppercase">Airflow</div>
                      <div className="text-xl font-bold font-mono text-slate-200 mt-1">{liveSensor.airflowCfm}</div>
                    </div>
                  </div>
                  <div className="bg-slate-950 border border-red-500/30 p-3 rounded-lg">
                    <div className="text-xs font-bold text-red-400 uppercase mb-1">CPWD Cl. 17 Breach</div>
                    <div className="text-[10px] text-slate-400">Escrow Risk: <strong className="text-slate-200">₹22,50,000.00</strong></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. VISUAL GANTT */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl flex flex-col gap-4">
        <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-200 uppercase tracking-wider">Visual 4D Schedule Analyzer:</span>
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono font-bold rounded border border-blue-500/30">Week {timelineWeek}</span>
          </div>
        </div>
        <input type="range" min="1" max="24" step="1" value={timelineWeek} onChange={(e) => setTimelineWeek(parseInt(e.target.value, 10))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 mb-2" />
      </div>
      
      {/* 5. REALITY CAPTURE MODAL */}
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
            <div className="flex justify-end pt-2"><button onClick={() => setActiveCamera(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded transition">Close Feed</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
ENGINE_V11_EOF

echo "✓ Phase 9 Applied: Animated Crane, Geofence & Day/Night Slicer"
