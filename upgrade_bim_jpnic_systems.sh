#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: BIM ENGINE PHASE 12 (JPNIC SUBTERRANEAN SYSTEMS)
# Features: Real JPNIC MEP Data, B1/B2 Basements, STP Tanks, 800TR Chillers
# ==============================================================================

set -euo pipefail

cat << 'ENGINE_V14_EOF' > components/bim/FullBimSimulationEngine.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

export type SelectionLevel = "ALL" | "B2_MEP_PLANT" | "B1_PARKING" | "L0_PODIUM" | "L1_TOWER" | "L2_CANTILEVER";
export type SelectionZone = "ALL_ZONES" | "ZONE_CORE" | "ZONE_PERIMETER" | "ZONE_SUBTERRANEAN";
export type ShiftMode = "DAY_SHIFT" | "NIGHT_SHIFT";
export type RenderMode = "SOLID" | "CAD_EDGES" | "X_RAY";

export interface BOQLineItem { itemCode: string; description: string; quantity: number; unit: string; rateINR: number; amountINR: number; }
export interface SubComponent { id: string; name: string; type: string; status: "INSTALLED" | "PENDING" | "DEFECT" | "IN_PROGRESS" | "CLASH" | "ACTIVE"; weightOrVolume: string; }

export interface SelectedEntity {
  id: string; name: string; type: "LEVEL" | "ZONE" | "ELEMENT" | "MACHINERY"; discipline: "CIVIL" | "STRUCTURAL" | "MEP" | "DEFECT" | "ARCHITECTURAL" | "SAFETY";
  parentLevel: SelectionLevel; parentZone: SelectionZone; subComponents: SubComponent[]; boqItems: BOQLineItem[];
  boqSummary: { concrete_m3: number; steel_mt: number; ductwork_m2: number; total_cost_inr: number; };
}

export interface CameraWaypoint { id: string; name: string; position: [number, number, number]; type: "CCTV_FIXED" | "DRONE_PHOTOGRAMMETRY" | "UG_SENSOR"; latestCapture: { timestamp: string; sha256: string; verifiedDeviationMm: number; }; }

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

  const [liveSensor, setLiveSensor] = useState({ damperAngle: 45.0, airflowCfm: 450, craneLoad: 4.2, craneWind: 18.5, stpLevel: 65, chillerTemp: 7.2, tick: 0 });

  const defaultEntity: SelectedEntity = {
    id: "ENTIRE_JPNIC", name: "JPNIC - Jai Prakash Narayan International Centre", type: "LEVEL", discipline: "STRUCTURAL",
    parentLevel: "ALL", parentZone: "ALL_ZONES", subComponents: [
        { id: "ARCH", name: "Studio Archohm (Sourabh Gupta)", type: "CONSULTANT", status: "ACTIVE", weightOrVolume: "Lead Architect" },
        { id: "STRC", name: "ROARK Consulting", type: "CONSULTANT", status: "ACTIVE", weightOrVolume: "Structural Eng." },
        { id: "MEP", name: "Sunil Nayyar Consultants", type: "CONSULTANT", status: "ACTIVE", weightOrVolume: "HVAC & Plumbing" }
    ],
    boqItems: [
      { itemCode: "CPWD-5.33", description: "M40 Grade RMC for Core Walls", quantity: 8420.5, unit: "Cum", rateINR: 8400, amountINR: 70732200 },
      { itemCode: "CPWD-5.22A", description: "Fe500D TMT Reinforcement Steel", quantity: 1818.4, unit: "MT", rateINR: 78500, amountINR: 142744400 }
    ],
    boqSummary: { concrete_m3: 8420.5, steel_mt: 1818.4, ductwork_m2: 12840.0, total_cost_inr: 890500000.0 }
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
    { id: "CAM-01-PODIUM", name: "Fixed CCTV (Podium Entrance)", position: [30, 15, 30], type: "CCTV_FIXED", latestCapture: { timestamp: "2026-10-24 11:42:00 IST", sha256: "7f4c9a18...3c10a", verifiedDeviationMm: 1.8 } },
    { id: "DRONE-WP-CANTILEVER", name: "Drone Inspect (Cantilever Block)", position: [35, 45, 0], type: "DRONE_PHOTOGRAMMETRY", latestCapture: { timestamp: "2026-10-24 09:15:22 IST", sha256: "5b8d8d42...7a64", verifiedDeviationMm: 0.9 } },
    { id: "UG-SENSOR-PLANT", name: "IoT Flow Sensor (B2 Chiller Plant)", position: [-15, -10, -10], type: "UG_SENSOR", latestCapture: { timestamp: "2026-10-24 14:01:10 IST", sha256: "9c3e2b10...f881b", verifiedDeviationMm: 0.0 } }
  ], []);

  const escrowStatus = useMemo(() => {
    const totalAllocated = 890500000;
    let cleared = 0, retained = 0;
    if (timelineWeek >= 4) cleared += 225000000; 
    if (timelineWeek >= 12) cleared += 318000000; 
    if (timelineWeek >= 18) cleared += 224000000; 
    if (timelineWeek >= 20) { cleared += 85000000; retained += 22500000; }
    return { allocated: totalAllocated, cleared, retained, pending: totalAllocated - cleared - retained };
  }, [timelineWeek]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("quadillar_bim_state_jpnic_ug");
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
    localStorage.setItem("quadillar_bim_state_jpnic_ug", JSON.stringify({ timelineWeek, timelineMode, activeLevel, activeZone, planCutZ, explodeY, shiftMode, renderMode }));
  }, [timelineWeek, timelineMode, activeLevel, activeZone, planCutZ, explodeY, shiftMode, renderMode, isHydrated]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveSensor(prev => {
        const t = Date.now() / 1000;
        return {
          damperAngle: +(45.0 + Math.sin(t * 1.5) * 0.5 + 1.8).toFixed(2),
          airflowCfm: Math.round(450 + Math.cos(t * 1.2) * 5 - 42),
          craneLoad: +(4.2 + Math.sin(t * 0.8) * 0.4).toFixed(2),
          craneWind: +(18.5 + Math.cos(t * 0.5) * 2.5).toFixed(1),
          stpLevel: Math.round(65 + Math.sin(t * 0.1) * 5),
          chillerTemp: +(7.2 + Math.cos(t * 0.2) * 0.3).toFixed(1),
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
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(70, 50, 90);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    // Set clipping plane to handle underground geometries (-20m to +60m)
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 60); 
    clipPlaneRef.current = clipPlane;

    const lightsGroup = new THREE.Group();
    lightsGroupRef.current = lightsGroup;
    scene.add(lightsGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    const dirLight = new THREE.DirectionalLight(0xdbeafe, 1.4);
    dirLight.position.set(80, 100, 60);
    dirLight.castShadow = true;
    
    const spotLight1 = new THREE.SpotLight(0xfff5e6, 0); 
    spotLight1.position.set(40, 80, 40);
    
    const spotLight2 = new THREE.SpotLight(0xfff5e6, 0);
    spotLight2.position.set(-40, 80, -40);

    lightsGroup.add(ambientLight, dirLight, spotLight1, spotLight2);

    // Ground Grid & Subterranean Guide
    const grid = new THREE.GridHelper(120, 60, 0x00f0ff, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);
    
    const ugGrid = new THREE.GridHelper(120, 60, 0xff00ff, 0x3f003f); // Purple underground grid
    ugGrid.position.y = -12;
    scene.add(ugGrid);

    const bimGroup = new THREE.Group();
    elementsGroupRef.current = bimGroup;
    scene.add(bimGroup);
    pickableMeshes.current = [];

    // Materials
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, clippingPlanes: [clipPlane] });
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, clippingPlanes: [clipPlane] });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.2, transmission: 0.6, roughness: 0.1, clippingPlanes: [clipPlane] });
    const diagridMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2, clippingPlanes: [clipPlane] });
    
    const ductMat = new THREE.MeshStandardMaterial({ color: 0xa1a1aa, metalness: 0.7, clippingPlanes: [clipPlane] });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3, clippingPlanes: [clipPlane] });
    const stpMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, metalness: 0.4, roughness: 0.6, clippingPlanes: [clipPlane] }); // Green for STP tanks
    
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
      
      if (entityId.includes("SLAB") || entityId.includes("CORE") || entityId.includes("CANTILEVER") || entityId.includes("PODIUM") || entityId.includes("UG_")) {
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const line = new THREE.LineSegments(edges, edgeMat);
        mesh.add(line);
        mesh.userData.edgeLine = line; 
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      pickableMeshes.current.push(mesh);
      bimGroup.add(mesh);
    };

    // --- SUBTERRANEAN JPNIC ---

    // B2: Deep MEP Plant & STP (Elev: -12m)
    const ugPlantBox = new THREE.Mesh(new THREE.BoxGeometry(40, 6, 25), concreteMat.clone());
    ugPlantBox.position.set(-5, -9, -5);
    addBimMesh(ugPlantBox, "UG_PLANT_ROOM", "B2 Central Plant Room", "B2_MEP_PLANT", "ZONE_SUBTERRANEAN", 1, 1, [
        { id: "ELEC_7152KV", name: "7152 KV Main Electrical Sub-Station", type: "EQUIPMENT", status: "INSTALLED", weightOrVolume: "7152 KV" },
        { id: "DG_SETS", name: "1500 KVA Diesel Generators (x4)", type: "EQUIPMENT", status: "INSTALLED", weightOrVolume: "6000 KVA Total" }
    ]);

    // STP Tanks (200 KLD)
    const stpTank1 = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 5, 16), stpMat.clone());
    stpTank1.position.set(-15, -9.5, -10);
    addBimMesh(stpTank1, "UG_STP_TANK_1", "200 KLD Sewage Treatment Plant", "B2_MEP_PLANT", "ZONE_SUBTERRANEAN", 2, 2, [], [
        { itemCode: "MEP-STP-01", description: "200 KLD MBBR STP Plant", quantity: 1, unit: "Set", rateINR: 4500000, amountINR: 4500000 }
    ]);

    // 800 TR Chiller Plants (x3)
    for(let i=0; i<3; i++) {
        const chiller = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 8), pipeMat.clone());
        chiller.position.set(2 + (i*6), -10.5, 0);
        addBimMesh(chiller, `UG_CHILLER_${i}`, `800 TR Water Cooled Chiller #${i+1}`, "B2_MEP_PLANT", "ZONE_SUBTERRANEAN", 3, 2, [
            { id: `CH_${i}`, name: "Sunil Nayyar Consult. HVAC Design", type: "SPEC", status: "ACTIVE", weightOrVolume: "800 TR" }
        ]);
    }

    // B1: Multi-Level Car Parking (Elev: -4m)
    const ugParking = new THREE.Mesh(new THREE.BoxGeometry(70, 4, 60), concreteMat.clone());
    ugParking.position.set(0, -4, 0);
    addBimMesh(ugParking, "UG_MLCP", "B1 Multi-Level Car Parking (600 Cars)", "B1_PARKING", "ZONE_SUBTERRANEAN", 2, 2);

    // --- SUPERSTRUCTURE JPNIC ---

    const podiumGeo = new THREE.CylinderGeometry(35, 35, 8, 64);
    const podiumMesh = new THREE.Mesh(podiumGeo, concreteMat.clone());
    podiumMesh.position.set(0, 4, 0);
    addBimMesh(podiumMesh, "JPNIC_PODIUM", "Convention Centre Podium", "L0_PODIUM", "ALL_ZONES", 4, 4);

    const coreGeo = new THREE.CylinderGeometry(8, 8, 48, 32);
    const coreMesh = new THREE.Mesh(coreGeo, coreMat.clone());
    coreMesh.position.set(0, 32, 0);
    addBimMesh(coreMesh, "JPNIC_CORE", "Central Elevator & Shear Wall Core", "L1_TOWER", "ZONE_CORE", 6, 6);

    for(let y = 12; y <= 40; y += 4) {
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 0.8, 64), concreteMat.clone());
      floor.position.set(0, y, 0);
      addBimMesh(floor, `JPNIC_SLAB_EL${y}`, `Circular Slab Level Elev:${y}m`, "L1_TOWER", "ZONE_PERIMETER", Math.floor(y/2), Math.floor(y/2)-1);
    }

    const diagridGeo = new THREE.CylinderGeometry(20.5, 20.5, 36, 32, 8);
    const diagridMesh = new THREE.Mesh(diagridGeo, new THREE.MeshStandardMaterial({ color: 0x94a3b8, wireframe: true, clippingPlanes: [clipPlane] }));
    diagridMesh.position.set(0, 26, 0);
    addBimMesh(diagridMesh, "JPNIC_DIAGRID", "Steel Diagrid Exoskeleton", "L1_TOWER", "ZONE_PERIMETER", 18, 17);

    const cantileverGeo = new THREE.BoxGeometry(45, 8, 20);
    const cantileverMesh = new THREE.Mesh(cantileverGeo, concreteMat.clone());
    cantileverMesh.position.set(12, 48, 0); 
    addBimMesh(cantileverMesh, "JPNIC_CANTILEVER", "Cantilevered Skydeck & Helipad", "L2_CANTILEVER", "ALL_ZONES", 20, 19, [
      { id: "CANT_PT", name: "Post-Tensioned Truss Anchor", type: "STRUCTURAL", status: "INSTALLED", weightOrVolume: "64 Strands" }
    ]);

    const cantGlassGeo = new THREE.BoxGeometry(45.2, 8.2, 20.2);
    const cantGlass = new THREE.Mesh(cantGlassGeo, glassMat.clone());
    cantGlass.position.set(12, 48, 0);
    addBimMesh(cantGlass, "JPNIC_CANT_GLASS", "Skydeck Facade Glazing", "L2_CANTILEVER", "ALL_ZONES", 22, 21);

    // --- MEP INTERNALS ---
    const mainDuct = new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, 1.8), ductMat.clone());
    mainDuct.position.set(8, 10, 6);
    addBimMesh(mainDuct, "MEP_TRUNK_DUCT_L1", "Main HVAC Duct", "L1_TOWER", "ZONE_PERIMETER", 15, 14);

    const chwSupply = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 24, 16), pipeMat.clone());
    chwSupply.rotation.z = Math.PI / 2;
    chwSupply.position.set(0, 10.5, 8);
    addBimMesh(chwSupply, "CHW_SUPPLY_L1", "Chilled Water Main Ring", "L1_TOWER", "ZONE_CORE", 16, 15);

    const cableTray = new THREE.Mesh(new THREE.BoxGeometry(18, 0.1, 0.8), trayMat.clone());
    cableTray.rotation.y = Math.PI / 2;
    cableTray.position.set(4, 10.5, 8);
    addBimMesh(cableTray, "ELEC_TRAY_HT", "Main HT Electrical Tray", "L1_TOWER", "ZONE_PERIMETER", 16, 15);

    const clashNode = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), clashMat.clone());
    clashNode.position.set(4, 10.5, 8);
    addBimMesh(clashNode, "CLASH_NODE_01", "SPATIAL CLASH", "L1_TOWER", "ALL_ZONES", 16, 15);

    const vavBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 2.0), vavMat.clone());
    vavBox.position.set(12, 10, 6);
    addBimMesh(vavBox, "VAV-1-NW-04", "VAV Terminal Unit", "L1_TOWER", "ZONE_PERIMETER", 16, 15);

    const haloMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const haloMesh = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.6, 32), haloMat);
    haloMesh.rotation.x = Math.PI / 2;
    haloMesh.position.set(12, 8.5, 6);
    haloMesh.userData = { isAuxiliary: true, minWeek: 16, level: "L1_TOWER", originalY: 8.5 };
    bimGroup.add(haloMesh);

    // --- TOWER CRANE ---
    const craneRoot = new THREE.Group();
    craneRoot.position.set(-40, 0, -20);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(2.5, 75, 2.5), craneMat);
    mast.position.y = 37.5;
    craneRoot.add(mast);

    const jibGroup = new THREE.Group();
    jibGroup.position.y = 75;
    craneJibRef.current = jibGroup;
    
    const jib = new THREE.Mesh(new THREE.BoxGeometry(60, 2, 2), craneMat);
    jib.position.x = 25;
    const counterWeight = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 3), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    counterWeight.position.x = -10;
    jibGroup.add(jib);
    jibGroup.add(counterWeight);
    craneRoot.add(jibGroup);
    
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(4, 80, 4), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.y = 40;
    addBimMesh(hitBox, "CRANE_TC1", "Liebherr Heavy Duty Crane", "ALL", "ALL_ZONES", 1, 1);
    craneRoot.add(hitBox);

    const geofence = new THREE.Mesh(new THREE.CylinderGeometry(55, 55, 70, 32), hazardMat);
    geofence.position.y = 35;
    geofence.userData = { isAuxiliary: true, minWeek: 1, level: "ALL", originalY: 35 };
    craneRoot.add(geofence);

    bimGroup.add(craneRoot);

    // Cameras
    cameraStations.forEach((cam) => {
      const isSensor = cam.type === "UG_SENSOR";
      const camMesh = new THREE.Mesh(
          isSensor ? new THREE.BoxGeometry(1.5,1.5,1.5) : new THREE.ConeGeometry(1.5, 3, 16), 
          new THREE.MeshStandardMaterial({ color: cam.type === "CCTV_FIXED" ? 0x06b6d4 : (isSensor ? 0x10b981 : 0xa855f7), emissive: cam.type === "CCTV_FIXED" ? 0x0891b2 : (isSensor ? 0x059669 : 0x7e22ce), emissiveIntensity: 0.6 })
      );
      camMesh.position.set(...cam.position);
      if(!isSensor) camMesh.rotation.x = Math.PI;
      const camLevel = cam.position[1] < 0 ? "B2_MEP_PLANT" : (cam.position[1] > 30 ? "L2_CANTILEVER" : "L0_PODIUM");
      camMesh.userData = { isCamera: true, cameraData: cam, name: cam.name, originalY: cam.position[1], level: camLevel };
      pickableMeshes.current.push(camMesh);
      bimGroup.add(camMesh);
    });

    let isDragging = false, prevX = 0, prevY = 0;
    let sph = { r: 120, phi: Math.PI / 2.5, theta: Math.PI / 4 }; // Adjusted for UG view

    const updateCameraPos = () => {
      camera.position.x = sph.r * Math.sin(sph.phi) * Math.sin(sph.theta);
      camera.position.y = sph.r * Math.cos(sph.phi);
      camera.position.z = sph.r * Math.sin(sph.phi) * Math.cos(sph.theta);
      camera.lookAt(0, 10, 0); 
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
      sph.phi = Math.max(0.1, Math.min(Math.PI / 1.1, sph.phi - (e.clientY - prevY) * 0.007)); // Allow camera to look from BELOW
      prevX = e.clientX;
      prevY = e.clientY;
      updateCameraPos();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      sph.r = Math.max(20, Math.min(250, sph.r + e.deltaY * 0.08));
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
          const isUG = hit.entityId.includes("UG_");
          
          if (isDefect) setInspectorTab("LIVE_IOT");
          else if (isClash) setInspectorTab("CLASH_MATRIX");
          else if (isCrane) setInspectorTab("CRANE_SENSOR");
          else setInspectorTab("SUB_COMPS");
          
          setSelectedEntity({
            id: hit.entityId, name: hit.name, type: isCrane ? "MACHINERY" : "ELEMENT",
            discipline: isCrane ? "SAFETY" : (isClash ? "DEFECT" : (isDefect ? "DEFECT" : (hit.entityId.includes("CORE") || hit.entityId.includes("SLAB") || hit.entityId.includes("PODIUM") || hit.entityId.includes("UG_MLCP") || hit.entityId.includes("UG_PLANT") ? "STRUCTURAL" : "MEP"))),
            parentLevel: hit.level, parentZone: hit.zone,
            subComponents: hit.subComponents || [], boqItems: hit.boqItems || [],
            boqSummary: { concrete_m3: 150, steel_mt: 12, ductwork_m2: 0, total_cost_inr: 850000 }
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
      spot1.intensity = 3000;
      spot2.intensity = 3000;
    } else {
      ambient.intensity = 0.8;
      dir.intensity = 1.4;
      spot1.intensity = 0;
      spot2.intensity = 0;
    }
  }, [shiftMode]);

  // Z-AXIS CLIP (-20% to 100% to allow subterranean view) & Y-AXIS EXPLODE
  useEffect(() => {
    if (clipPlaneRef.current) {
      // Mapping: 100% = +60m, 0% = 0m, -20% = -16m
      const heightRange = 80; // Total height span to clip
      const offset = -16; // Bottom of underground
      clipPlaneRef.current.constant = offset + (heightRange * ((planCutZ + 20) / 120));
    }
    if (elementsGroupRef.current) {
      elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.userData && mesh.userData.originalY !== undefined) {
          let levelMultiplier = 0;
          if(mesh.userData.level === "L2_CANTILEVER") levelMultiplier = 35;
          if(mesh.userData.level === "L1_TOWER") levelMultiplier = 15;
          if(mesh.userData.level === "B1_PARKING") levelMultiplier = -10;
          if(mesh.userData.level === "B2_MEP_PLANT") levelMultiplier = -20;
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
      const zoneMatches = activeZone === "ALL_ZONES" || zone === activeZone || zone === "ZONE_SUBTERRANEAN"; // Ensure underground shows in all zones mode
      
      mesh.visible = isConstructed && levelMatches;

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
  }, [timelineWeek, timelineMode, activeLevel, activeZone, selectedEntity, renderMode, isHydrated]);

  const ganttMilestones = useMemo(() => {
    return [
      { name: "UG B1 & B2 Foundation", plannedStart: 0, plannedDuration: 4, actualStart: 1, actualDuration: 3, status: "AHEAD", camRef: "UG-SENSOR", hash: "9c3e2b10" },
      { name: "Podium & Convention Base", plannedStart: 4, plannedDuration: 4, actualStart: 4, actualDuration: 4, status: "ON_TIME", camRef: "CAM-01", hash: "7f4c9a18" },
      { name: "Tower Core Slipform", plannedStart: 8, plannedDuration: 8, actualStart: 8, actualDuration: 8, status: "ON_TIME", camRef: "DRONE", hash: "5b8d8d42" },
      { name: "Cantilever Helipad Push", plannedStart: 18, plannedDuration: 4, actualStart: 18, actualDuration: 4, status: "ON_TIME", camRef: "DRONE", hash: "8d22fe1a" },
      { name: "UG MEP / Clashes Resolved", plannedStart: 20, plannedDuration: 4, actualStart: 20, actualDuration: 4, status: "PENDING", camRef: "LEDGER", hash: "Pending" }
    ];
  }, []);

  if (!isHydrated) return <div className="w-full h-[520px] bg-slate-950"></div>;

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Structure:</span>
          {(["ALL", "B2_MEP_PLANT", "B1_PARKING", "L0_PODIUM", "L1_TOWER", "L2_CANTILEVER"] as SelectionLevel[]).map((lvl) => (
            <button key={lvl} onClick={() => setActiveLevel(lvl)} className={`px-3 py-1 text-xs font-mono rounded transition-all ${activeLevel === lvl ? "bg-cyan-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
              {lvl.replace("L0_", "").replace("L1_", "").replace("L2_", "").replace("B1_", "").replace("B2_", "").replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-lg">
          {(["SOLID", "CAD_EDGES", "X_RAY"] as const).map((mode) => (
            <button key={mode} onClick={() => setRenderMode(mode)} className={`px-2.5 py-0.5 text-[11px] font-mono rounded font-semibold transition ${renderMode === mode ? "bg-purple-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}>
              {mode.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShiftMode(shiftMode === "DAY_SHIFT" ? "NIGHT_SHIFT" : "DAY_SHIFT")} className={`px-3 py-1 text-xs font-bold uppercase rounded border transition-all ${shiftMode === "NIGHT_SHIFT" ? "bg-indigo-900 border-indigo-500 text-indigo-200" : "bg-sky-900 border-sky-500 text-sky-200"}`}>
            {shiftMode === "NIGHT_SHIFT" ? "🌙 Night" : "☀️ Day"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="relative w-full h-[500px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            
            <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-700 p-3 rounded-lg backdrop-blur-md w-64 pointer-events-none shadow-2xl">
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-2">JPNIC Smart Escrow Ledger</div>
              <div className="flex justify-between items-center mb-1.5 border-b border-slate-800 pb-1.5"><span className="text-xs text-slate-400">Total Allocated:</span><span className="text-xs font-bold font-mono text-slate-200">₹{(escrowStatus.allocated / 10000000).toFixed(2)}Cr</span></div>
              <div className="flex justify-between items-center mb-1.5 border-b border-slate-800 pb-1.5"><span className="text-xs text-slate-400">Verified & Cleared:</span><span className="text-xs font-bold font-mono text-emerald-400">₹{(escrowStatus.cleared / 10000000).toFixed(2)}Cr</span></div>
              <div className="flex justify-between items-center mb-1"><span className="text-xs text-slate-400">Retained Cl 17:</span><span className={`text-xs font-bold font-mono ${escrowStatus.retained > 0 ? "text-amber-400 animate-pulse" : "text-slate-500"}`}>₹{(escrowStatus.retained / 10000000).toFixed(2)}Cr</span></div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(escrowStatus.cleared / escrowStatus.allocated) * 100}%` }}></div>
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(escrowStatus.retained / escrowStatus.allocated) * 100}%` }}></div>
              </div>
            </div>

            <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
              <div className="px-2.5 py-1 bg-slate-900/90 border border-cyan-500/40 rounded text-xs font-mono text-cyan-300 flex items-center gap-2 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> LiveView Phase 12: Subterranean MEP Data
              </div>
              {hoveredTag && <div className="px-2.5 py-1 bg-blue-950/90 border border-blue-400/50 rounded text-xs font-mono text-blue-200 backdrop-blur-md">{hoveredTag}</div>}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center gap-4"><span className="text-[11px] font-bold text-slate-300 uppercase whitespace-nowrap">Z-Axis Depth (-20m):</span><input type="range" min="-20" max="100" step="1" value={planCutZ} onChange={(e) => setPlanCutZ(parseInt(e.target.value, 10))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400" /></div>
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
                      <div className="flex justify-between text-xs font-mono text-slate-500"><span>Type: {sub.type}</span><span>Spec: {sub.weightOrVolume}</span></div>
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
            ) : inspectorTab === "LIVE_IOT" ? (
              <div className="flex flex-col gap-4">
                <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4">
                  <div className="text-[10px] font-mono text-amber-400 uppercase tracking-widest mb-3 flex justify-between"><span>UG Plant Telemetry</span><span>Tick #{liveSensor.tick}</span></div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-center"><div className="text-[10px] text-slate-400 uppercase">Chiller Temp</div><div className="text-xl font-bold font-mono text-cyan-400 mt-1">{liveSensor.chillerTemp}°C</div></div>
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-center"><div className="text-[10px] text-slate-400 uppercase">STP Level</div><div className="text-xl font-bold font-mono text-emerald-400 mt-1">{liveSensor.stpLevel}%</div></div>
                  </div>
                  <div className="bg-slate-950 border border-emerald-500/30 p-3 rounded-lg"><div className="text-xs font-bold text-emerald-400 uppercase mb-1">STP Operational</div><div className="text-[10px] text-slate-400">200 KLD Plant running optimally.</div></div>
                </div>
              </div>
            ) : null }
          </div>
        </div>
      </div>

      {/* 4. VISUAL GANTT */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl flex flex-col gap-4">
        <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3"><span className="font-bold text-slate-200 uppercase tracking-wider">JPNIC 4D Schedule Analyzer:</span><span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono font-bold rounded border border-blue-500/30">Week {timelineWeek}</span></div>
        </div>
        <input type="range" min="1" max="24" step="1" value={timelineWeek} onChange={(e) => setTimelineWeek(parseInt(e.target.value, 10))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 mb-2" />
        <div className="flex flex-col gap-3 mt-2">
          {ganttMilestones.map((ms, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="w-48 text-[11px] font-bold text-slate-300 truncate">{ms.name}</div>
              <div className="flex-1 relative h-6 bg-slate-950 border border-slate-800 rounded-md overflow-hidden flex flex-col justify-center gap-0.5 px-1">
                <div className="absolute h-1.5 bg-blue-500/60 rounded-full transition-all" style={{ left: `${(ms.plannedStart / 24) * 100}%`, width: `${(ms.plannedDuration / 24) * 100}%`, top: '4px' }}></div>
                {timelineWeek >= ms.actualStart && (
                  <div className={`absolute h-1.5 rounded-full transition-all ${ms.status === "DELAYED" ? "bg-red-500" : "bg-emerald-500"}`} style={{ left: `${(ms.actualStart / 24) * 100}%`, width: `${(Math.min(timelineWeek - ms.actualStart, ms.actualDuration) / 24) * 100}%`, bottom: '4px' }}></div>
                )}
                <div className="absolute top-0 bottom-0 w-px bg-cyan-400/50 z-10" style={{ left: `${(timelineWeek / 24) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 5. REALITY CAPTURE MODAL */}
      {activeCamera && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div><span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">Field Reality Capture Feed</span><h4 className="text-base font-bold text-white">{activeCamera.name}</h4></div>
              <button onClick={() => setActiveCamera(null)} className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1">✕</button>
            </div>
            <div className="relative w-full h-56 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/40 via-transparent to-slate-900/50 pointer-events-none"></div>
              <div className="absolute top-3 left-3 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> LIVE CAMERA SENSOR</div>
              <div className="text-center p-6"><div className="w-12 h-12 rounded-full border-2 border-purple-500/60 mx-auto flex items-center justify-center text-purple-300 mb-2">📷</div></div>
            </div>
            <div className="flex justify-end pt-2"><button onClick={() => setActiveCamera(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded transition">Close Feed</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
ENGINE_V14_EOF

echo "✓ Phase 12 Applied: JPNIC Underground Systems & Deep Slicing"
