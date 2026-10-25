#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: BIM ENGINE PHASE 20 (MULTI-AGENT HIVE & 6D CARBON)
# Features: AI Terminal Logs, 6D Embodied Carbon Tracking, Cinematic Idle Orbit
# ==============================================================================

set -euo pipefail

cat << 'ENGINE_V22_EOF' > components/bim/FullBimSimulationEngine.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

export type SelectionLevel = "ALL" | "L0_PODIUM" | "L1_MUSEUM" | "L1_HOTEL_TOWER" | "L2_HELIPAD";
export type SelectionZone = "ALL_ZONES" | "ZONE_WEDGE" | "ZONE_TOWER" | "ZONE_PLAZA";
export type ShiftMode = "DAY_SHIFT" | "NIGHT_SHIFT";
export type RenderMode = "SOLID" | "CAD_EDGES" | "X_RAY" | "LIDAR_SCAN" | "AI_HEATMAP";
export type WeatherMode = "CLEAR" | "MONSOON";

export interface BOQLineItem { itemCode: string; description: string; quantity: number; unit: string; rateINR: number; amountINR: number; carbonKg: number; }
export interface SubComponent { id: string; name: string; type: string; status: "INSTALLED" | "PENDING" | "DEFECT" | "IN_PROGRESS" | "CLASH" | "ACTIVE" | "RESOLVED" | "IN_TRANSIT"; weightOrVolume: string; }

export interface SelectedEntity {
  id: string; name: string; type: "LEVEL" | "ZONE" | "ELEMENT" | "MACHINERY" | "LABOR" | "LOGISTICS"; discipline: "CIVIL" | "STRUCTURAL" | "MEP" | "DEFECT" | "ARCHITECTURAL" | "SAFETY" | "OPERATIONS" | "SUPPLY_CHAIN";
  parentLevel: SelectionLevel; parentZone: SelectionZone; subComponents: SubComponent[]; boqItems: BOQLineItem[];
}

export interface CameraWaypoint { id: string; name: string; position: [number, number, number]; type: "CCTV_FIXED" | "DRONE_PHOTOGRAMMETRY" | "UG_SENSOR"; latestCapture: { timestamp: string; sha256: string; verifiedDeviationMm: number; }; }

export default function FullBimSimulationEngine() {
  const mountRef = useRef<HTMLDivElement>(null);

  const [isHydrated, setIsHydrated] = useState(false);
  const [timelineWeek, setTimelineWeek] = useState<number>(1);
  const [isPlaying4D, setIsPlaying4D] = useState(false);
  const [timelineMode, setTimelineMode] = useState<"ACTUAL" | "PLANNED" | "VARIANCE">("ACTUAL");
  const [shiftMode, setShiftMode] = useState<ShiftMode>("DAY_SHIFT");
  const [renderMode, setRenderMode] = useState<RenderMode>("CAD_EDGES");
  const [weatherMode, setWeatherMode] = useState<WeatherMode>("CLEAR");
  
  const [planCutZ, setPlanCutZ] = useState<number>(100);
  const [explodeY, setExplodeY] = useState<number>(0);
  const [clashResolved, setClashResolved] = useState(false);

  const [activeCamera, setActiveCamera] = useState<CameraWaypoint | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"SUB_COMPS" | "BOQ_LEDGER" | "LIVE_IOT" | "CLASH_MATRIX" | "WORKFORCE" | "LOGISTICS">("SUB_COMPS");
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  
  // NEW: Multi-Agent AI Logs
  const [aiLogs, setAiLogs] = useState<{id: number, agent: string, msg: string, color: string}[]>([]);
  const logIdRef = useRef(0);

  const defaultEntity: SelectedEntity = {
    id: "ENTIRE_JPNIC", name: "JPNIC Full Campus Masterplan", type: "LEVEL", discipline: "ARCHITECTURAL",
    parentLevel: "ALL", parentZone: "ALL_ZONES", 
    subComponents: [
        { id: "ARCH", name: "Studio Archohm", type: "CONSULTANT", status: "ACTIVE", weightOrVolume: "Masterplan" },
        { id: "LSCAPE", name: "SJA Consultants", type: "CONSULTANT", status: "ACTIVE", weightOrVolume: "Landscape" }
    ],
    boqItems: [
      { itemCode: "CPWD-WEDGE", description: "Museum Wedge Structure", quantity: 12420, unit: "Cum", rateINR: 8400, amountINR: 104328000, carbonKg: 4968000 },
      { itemCode: "CPWD-TOWER", description: "Hotel Tower Core & Slab", quantity: 18500, unit: "Cum", rateINR: 8400, amountINR: 155400000, carbonKg: 7400000 },
      { itemCode: "TERREAL", description: "Terracotta Facade Louvers", quantity: 24000, unit: "Sqm", rateINR: 4500, amountINR: 108000000, carbonKg: 1200000 }
    ]
  };
  
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(defaultEntity);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const elementsGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);
  const clipPlaneRef = useRef<THREE.Plane | null>(null);
  const pickableMeshes = useRef<THREE.Mesh[]>([]);
  const rainGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const droneRef = useRef<THREE.Group | null>(null);
  const workersRef = useRef<THREE.InstancedMesh | null>(null);
  const workersData = useRef<{x: number, z: number, angle: number, speed: number, radius: number}[]>([]);
  const truckRef = useRef<THREE.Group | null>(null);
  const drumRef = useRef<THREE.Mesh | null>(null);
  
  // Idle Camera Ref
  const lastInteractionTime = useRef<number>(Date.now());

  const cameraStations: CameraWaypoint[] = useMemo(() => [
    { id: "CAM-01-PLAZA", name: "CCTV (Central Plaza)", position: [0, 8, 40], type: "CCTV_FIXED", latestCapture: { timestamp: "2026-10-24 11:42:00 IST", sha256: "7f4c9a18...3c10a", verifiedDeviationMm: 1.8 } },
    { id: "DRONE-WP-TOWER", name: "Drone (Tower Helipad)", position: [40, 85, 20], type: "DRONE_PHOTOGRAMMETRY", latestCapture: { timestamp: "2026-10-24 09:15:22 IST", sha256: "5b8d8d42...7a64", verifiedDeviationMm: 0.9 } }
  ], []);

  const addAiLog = (agent: string, msg: string, color: string) => {
    logIdRef.current += 1;
    setAiLogs(prev => [...prev.slice(-4), { id: logIdRef.current, agent, msg, color }]); // Keep last 5
  };

  // SMART EVM & 6D CARBON CALCULATION
  const evmStatus = useMemo(() => {
    const totalAllocated = 864000000; 
    let EV = 0, AC = 0, PV = 0, retained = 0, carbonTons = 0;
    PV = (timelineWeek / 24) * totalAllocated;
    
    // Simulate progression
    if (timelineWeek >= 4) { EV += 150000000; AC += 148000000; carbonTons += 2450; } 
    if (timelineWeek >= 10) { EV += 200000000; AC += 195000000; carbonTons += 4820; } 
    if (timelineWeek >= 16) { EV += 250000000; AC += 255000000; carbonTons += 8900; } 
    if (timelineWeek >= 20) { 
      carbonTons += 1240;
      if (clashResolved) { EV += 172500000; AC += 170000000; } 
      else { EV += 150000000; AC += 180000000; retained += 22500000; }
    } 
    const SPI = PV === 0 ? 1.0 : EV / PV;
    const CPI = AC === 0 ? 1.0 : EV / AC;
    return { allocated: totalAllocated, EV, AC, retained, SPI, CPI, carbonTons };
  }, [timelineWeek, clashResolved]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("quadillar_bim_state_jpnic_v20");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timelineWeek) setTimelineWeek(parsed.timelineWeek);
        if (parsed.renderMode) setRenderMode(parsed.renderMode);
        if (parsed.shiftMode) setShiftMode(parsed.shiftMode);
        if (parsed.weatherMode) setWeatherMode(parsed.weatherMode);
        if (parsed.planCutZ) setPlanCutZ(parsed.planCutZ);
        if (parsed.explodeY) setExplodeY(parsed.explodeY);
        if (parsed.clashResolved !== undefined) setClashResolved(parsed.clashResolved);
      }
    } catch (e) {}
    setIsHydrated(true);
    addAiLog("SYS", "Quadillar Multi-Agent Core Initialized.", "text-cyan-400");
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("quadillar_bim_state_jpnic_v20", JSON.stringify({ timelineWeek, renderMode, shiftMode, weatherMode, planCutZ, explodeY, clashResolved }));
  }, [timelineWeek, renderMode, shiftMode, weatherMode, planCutZ, explodeY, clashResolved, isHydrated]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying4D) {
      interval = setInterval(() => {
        setTimelineWeek(prev => {
          if (prev === 20 && !clashResolved) {
            setIsPlaying4D(false);
            setInspectorTab("CLASH_MATRIX");
            setSelectedEntity({
              id: "CLASH_NODE_01", name: "SPATIAL CLASH", type: "ELEMENT", discipline: "DEFECT",
              parentLevel: "L0_PODIUM", parentZone: "ZONE_PLAZA", subComponents: [], boqItems: []
            });
            addAiLog("MEP_AGENT", "CRITICAL: Hard spatial clash detected at Week 20.", "text-red-400");
            addAiLog("FIN_AGENT", "CPWD Clause 17 triggered. ₹2.25Cr locked in Escrow.", "text-amber-400");
            return 20;
          }
          if (prev >= 24) { setIsPlaying4D(false); return 24; }
          return prev + 1;
        });
      }, 800); 
    }
    return () => clearInterval(interval);
  }, [isPlaying4D, clashResolved]);

  // AI Agent Log triggers based on interactions
  useEffect(() => {
    if (!isHydrated) return;
    if (weatherMode === "MONSOON") addAiLog("ENV_AGENT", "Monsoon conditions active. De-rating crane SWL limits.", "text-blue-300");
    if (shiftMode === "NIGHT_SHIFT") addAiLog("SEC_AGENT", "Night shift protocols engaged. Perimeter CV tightened.", "text-indigo-300");
    if (renderMode === "LIDAR_SCAN") addAiLog("GEO_AGENT", "Drone Point-Cloud overlay mapped. Variance: < 1.2mm.", "text-emerald-400");
    if (clashResolved) addAiLog("SYS_COORD", "RFI #4490 Applied. Elevation corrected. Escrow unlocked.", "text-emerald-400");
  }, [weatherMode, shiftMode, renderMode, clashResolved, isHydrated]);

  // --- 3D SCENE INITIALIZATION ---
  useEffect(() => {
    if (!isHydrated) return;
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060a14);
    scene.fog = new THREE.FogExp2(0x060a14, 0.002);

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 540;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(130, 90, 160); 

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100); 
    clipPlaneRef.current = clipPlane;

    const lightsGroup = new THREE.Group();
    lightsGroupRef.current = lightsGroup;
    scene.add(lightsGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    const dirLight = new THREE.DirectionalLight(0xfff0dd, 1.6);
    dirLight.position.set(100, 150, 80);
    dirLight.castShadow = true;
    
    const spotLight1 = new THREE.SpotLight(0xfff5e6, 0); 
    spotLight1.position.set(60, 100, 60);
    lightsGroup.add(ambientLight, dirLight, spotLight1);

    const grid = new THREE.GridHelper(400, 200, 0x00f0ff, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    const bimGroup = new THREE.Group();
    elementsGroupRef.current = bimGroup;
    scene.add(bimGroup);
    pickableMeshes.current = [];

    // --- MATERIALS ---
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85, clippingPlanes: [clipPlane] });
    const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xaa4a2e, roughness: 0.9, clippingPlanes: [clipPlane] });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4, roughness: 0.1, clippingPlanes: [clipPlane] });
    const diagridMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, wireframe: true, clippingPlanes: [clipPlane] });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 1.0, clippingPlanes: [clipPlane] });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3, clippingPlanes: [clipPlane] });
    const clashMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xaa0000, emissiveIntensity: 0.9, wireframe: true });
    const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.7, transmission: 0.8, roughness: 0.05, metalness: 0.1, clippingPlanes: [clipPlane] });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.4 });
    const lidarMat = new THREE.PointsMaterial({ color: 0x10b981, size: 0.3, transparent: true, opacity: 0.8 });
    const laborCivilMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 }); 
    const laborMepMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });   

    const addBimMesh = (mesh: THREE.Mesh, entityId: string, name: string, level: SelectionLevel, zone: SelectionZone, minWeek: number, plannedWeek: number) => {
      const mat = mesh.material as any;
      mesh.userData = { 
        entityId, name, level, zone, minWeek, plannedWeek, 
        originalColor: mat.color ? mat.color.getHex() : 0xffffff,
        originalEmissive: mat.emissive ? mat.emissive.getHex() : 0x000000,
        originalOpacity: mat.opacity !== undefined ? mat.opacity : 1,
        originalTransparent: mat.transparent || false,
        originalY: mesh.position.y
      };
      
      if (!entityId.includes("LOUVER") && !entityId.includes("TREE") && !entityId.includes("WATER") && !entityId.includes("TRUCK")) {
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const line = new THREE.LineSegments(edges, edgeMat);
        mesh.add(line);
        mesh.userData.edgeLine = line; 
        const pts = new THREE.Points(mesh.geometry, lidarMat);
        mesh.add(pts);
        mesh.userData.pointsMesh = pts;
      }
      mesh.castShadow = true; mesh.receiveShadow = true;
      pickableMeshes.current.push(mesh);
      bimGroup.add(mesh);
    };

    // GIS Urban Context
    const cityGroup = new THREE.Group();
    const cityMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, wireframe: true, transparent: true, opacity: 0.3 });
    for(let i=0; i<60; i++) {
        const w = 15 + Math.random()*30; const d = 15 + Math.random()*30; const h = 5 + Math.random()*40;
        const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cityMat);
        const x = (Math.random() - 0.5) * 500; const z = (Math.random() - 0.5) * 500;
        if (Math.abs(x) < 90 && Math.abs(z) < 70) continue; 
        block.position.set(x, h/2, z);
        cityGroup.add(block);
    }
    cityGroup.userData = { isAuxiliary: true };
    bimGroup.add(cityGroup);

    // PODIUM
    const podiumGeo = new THREE.BoxGeometry(140, 4, 100, 10, 1, 10);
    const podiumMesh = new THREE.Mesh(podiumGeo, concreteMat.clone());
    podiumMesh.position.set(0, 2, 0);
    addBimMesh(podiumMesh, "JPNIC_PODIUM", "Campus Shared Podium", "L0_PODIUM", "ZONE_PLAZA", 1, 1);

    const waterGeo = new THREE.BoxGeometry(60, 0.5, 30);
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(20, 4.25, 25);
    addBimMesh(waterMesh, "JPNIC_WATER", "Plaza Reflecting Pool", "L0_PODIUM", "ZONE_PLAZA", 22, 22);

    // WEDGE
    const wedgeWidth = 50; const wedgeDepth = 60; const wedgeFrontHeight = 35; const wedgeBackHeight = 5;   
    const wedgeGeo = new THREE.BoxGeometry(wedgeWidth, wedgeFrontHeight, wedgeDepth, 15, 5, 15); 
    const pos = wedgeGeo.attributes.position;
    for(let i=0; i<pos.count; i++) {
       const y = pos.getY(i); const z = pos.getZ(i);
       if (y > 0) {
          const zPercent = (z + (wedgeDepth/2)) / wedgeDepth; 
          const newY = wedgeBackHeight + (wedgeFrontHeight - wedgeBackHeight) * zPercent;
          pos.setY(i, newY - (wedgeFrontHeight/2));
       }
    }
    wedgeGeo.computeVertexNormals();

    const museumBlock = new THREE.Mesh(wedgeGeo, concreteMat.clone());
    museumBlock.position.set(-30, 4 + wedgeFrontHeight/2, 0);
    addBimMesh(museumBlock, "JPNIC_WEDGE", "Museum of Socialism Wedge", "L1_MUSEUM", "ZONE_WEDGE", 6, 6);

    const archVoid = new THREE.Mesh(new THREE.BoxGeometry(18, 9, 20, 4,4,4), new THREE.MeshStandardMaterial({ color: 0x111111, clippingPlanes: [clipPlane] }));
    archVoid.position.set(-30, 4 + 4.5, wedgeDepth/2 + 0.1); 
    addBimMesh(archVoid, "JPNIC_GATE", "Gateway Entrance", "L1_MUSEUM", "ZONE_WEDGE", 8, 8);

    const louverCount = 100;
    const louverGeo = new THREE.BoxGeometry(0.3, wedgeFrontHeight, 0.4);
    const louverInstMesh = new THREE.InstancedMesh(louverGeo, terracottaMat, louverCount);
    const dummy = new THREE.Object3D();
    let lIndex = 0;
    for(let i=0; i<louverCount; i++) {
        const xPos = -wedgeWidth/2 + (i * (wedgeWidth / louverCount));
        if (xPos > -9 && xPos < 9) continue; 
        dummy.position.set(-30 + xPos, 4, wedgeDepth/2 + 0.5); 
        dummy.updateMatrix();
        louverInstMesh.setMatrixAt(lIndex++, dummy.matrix);
    }
    louverInstMesh.count = lIndex; louverInstMesh.instanceMatrix.needsUpdate = true;
    louverInstMesh.userData = { entityId: "JPNIC_LOUVERS", name: "Terracotta Facade", level: "L1_MUSEUM", zone: "ZONE_WEDGE", minWeek: 16, plannedWeek: 15, originalColor: 0xaa4a2e };
    pickableMeshes.current.push(louverInstMesh as any);
    bimGroup.add(louverInstMesh);

    // TOWER
    const towerRadius = 18; const towerHeight = 70;
    const towerCore = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, towerHeight, 32, 10), concreteMat.clone());
    towerCore.position.set(30, 4 + towerHeight/2, -10);
    addBimMesh(towerCore, "JPNIC_TOWER_CORE", "17-Story Hotel Tower Core", "L1_HOTEL_TOWER", "ZONE_TOWER", 8, 8);

    const towerDiagrid = new THREE.Mesh(new THREE.CylinderGeometry(towerRadius+0.5, towerRadius+0.5, towerHeight, 32, 12), diagridMat.clone());
    towerDiagrid.position.set(30, 4 + towerHeight/2, -10);
    addBimMesh(towerDiagrid, "JPNIC_DIAGRID", "Structural Steel Diagrid", "L1_HOTEL_TOWER", "ZONE_TOWER", 15, 15);

    const cantileverMesh = new THREE.Mesh(new THREE.BoxGeometry(45, 8, 20, 10,2,5), concreteMat.clone());
    cantileverMesh.position.set(30 + 15, 4 + towerHeight + 4, -10); 
    addBimMesh(cantileverMesh, "JPNIC_CANTILEVER", "Cantilevered Helipad", "L2_HELIPAD", "ZONE_TOWER", 18, 18);

    // MEP
    const chwPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 60, 16), pipeMat.clone());
    chwPipe.rotation.z = Math.PI / 2;
    chwPipe.position.set(0, 5.5, 5);
    addBimMesh(chwPipe, "CHW_MAIN", "Campus CHW Main Loop", "L0_PODIUM", "ZONE_PLAZA", 20, 20);

    const clashNode = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), clashMat.clone());
    clashNode.position.set(-5, 5.5, 5);
    addBimMesh(clashNode, "CLASH_NODE_01", "MEP Trench Clash", "L0_PODIUM", "ZONE_PLAZA", 20, 20);

    // RMC LOGISTICS TRUCK
    const truckGroup = new THREE.Group();
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 3), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    cab.position.set(0, 1.25, 1.5);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 4, 16), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    drum.rotation.x = Math.PI / 2; drum.rotation.z = Math.PI / 8; drum.position.set(0, 1.8, -1);
    drumRef.current = drum;
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    chassis.position.set(0, 0.25, -0.5);
    truckGroup.add(cab, drum, chassis);
    const truckHit = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 7), new THREE.MeshBasicMaterial({ visible: false }));
    truckHit.position.set(0, 2, 0);
    truckGroup.add(truckHit);
    truckGroup.position.set(80, 0, 80); 
    truckRef.current = truckGroup;
    addBimMesh(truckHit, "TRUCK_RMC_01", "Ready-Mix Concrete Transit Mixer (UP32-HZ-8821)", "L0_PODIUM", "ALL_ZONES", 1, 1);
    scene.add(truckGroup);

    // IOT WORKFORCE SWARM
    const laborCount = 150;
    const workerGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const workersMesh = new THREE.InstancedMesh(workerGeo, laborCivilMat, laborCount);
    const data = [];
    for(let i=0; i<laborCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 20 + Math.random() * 40;
        data.push({ x: 0, z: 0, angle, radius: r, speed: 0.2 + Math.random() * 0.5 });
        dummy.position.set(Math.cos(angle)*r, 4.4, Math.sin(angle)*r);
        dummy.updateMatrix();
        workersMesh.setMatrixAt(i, dummy.matrix);
        if (Math.random() > 0.7) workersMesh.setColorAt(i, new THREE.Color(0xf97316));
        else workersMesh.setColorAt(i, new THREE.Color(0x3b82f6));
    }
    workersMesh.instanceColor!.needsUpdate = true;
    workersMesh.userData = { entityId: "LABOR_SWARM", name: "IoT Smart Helmet Tracking", level: "L0_PODIUM", minWeek: 1 };
    workersRef.current = workersMesh;
    workersData.current = data;
    pickableMeshes.current.push(workersMesh as any);
    bimGroup.add(workersMesh);

    // AUTONOMOUS DRONE
    const drone = new THREE.Group();
    const droneBody = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    drone.add(droneBody);
    drone.userData = { isAuxiliary: true, isDrone: true };
    droneRef.current = drone;
    scene.add(drone);

    // WEATHER SYSTEM
    const rainCount = 15000;
    const rainGeo = new THREE.BufferGeometry();
    const rainArray = new Float32Array(rainCount * 3);
    for(let i=0; i<rainCount*3; i+=3) {
      rainArray[i] = (Math.random() - 0.5) * 300; 
      rainArray[i+1] = Math.random() * 200; 
      rainArray[i+2] = (Math.random() - 0.5) * 300; 
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainArray, 3));
    rainGeoRef.current = rainGeo;
    const rainParticleMat = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.5, transparent: true, opacity: 0.6 });
    const rainSystem = new THREE.Points(rainGeo, rainParticleMat);
    rainSystem.userData = { isWeather: true };
    scene.add(rainSystem);

    cameraStations.forEach((cam) => {
      const camMesh = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 16), new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2 }));
      camMesh.position.set(...cam.position);
      camMesh.rotation.x = Math.PI;
      camMesh.userData = { isCamera: true, cameraData: cam, name: cam.name, originalY: cam.position[1] };
      pickableMeshes.current.push(camMesh as any);
      bimGroup.add(camMesh);
    });

    let isDragging = false, prevX = 0, prevY = 0;
    let sph = { r: 160, phi: Math.PI / 3.0, theta: Math.PI / 6 };

    const updateCameraPos = () => {
      camera.position.x = sph.r * Math.sin(sph.phi) * Math.sin(sph.theta);
      camera.position.y = sph.r * Math.cos(sph.phi);
      camera.position.z = sph.r * Math.sin(sph.phi) * Math.cos(sph.theta);
      camera.lookAt(0, 20, 0); 
    };
    updateCameraPos();

    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; lastInteractionTime.current = Date.now(); };
    const onMouseUp = () => { isDragging = false; lastInteractionTime.current = Date.now(); };
    const onMouseMove = (e: MouseEvent) => {
      lastInteractionTime.current = Date.now();
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
      lastInteractionTime.current = Date.now();
      sph.r = Math.max(30, Math.min(300, sph.r + e.deltaY * 0.1));
      updateCameraPos();
    };

    const onClick = (e: MouseEvent) => {
      lastInteractionTime.current = Date.now();
      const rect = mount.getBoundingClientRect();
      const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(pickableMeshes.current.filter(m => m.visible), false);

      if (hits.length > 0) {
        const hit = hits[0].object.userData;
        if (hit.isCamera) {
          setActiveCamera(hit.cameraData);
          addAiLog("CV_AGENT", `Accessed ${hit.name} feed. Vision inference active.`, "text-cyan-400");
        } else {
          const isClash = hit.entityId.includes("CLASH");
          const isLabor = hit.entityId.includes("LABOR");
          const isTruck = hit.entityId.includes("TRUCK");
          
          if (isClash) setInspectorTab("CLASH_MATRIX");
          else if (isLabor) setInspectorTab("WORKFORCE");
          else if (isTruck) setInspectorTab("LOGISTICS");
          else setInspectorTab("SUB_COMPS");
          
          setSelectedEntity({
            id: hit.entityId, name: hit.name, type: isLabor ? "LABOR" : (isTruck ? "LOGISTICS" : "ELEMENT"),
            discipline: isLabor ? "OPERATIONS" : (isTruck ? "SUPPLY_CHAIN" : (isClash ? "DEFECT" : "STRUCTURAL")),
            parentLevel: hit.level, parentZone: hit.zone,
            subComponents: hit.subComponents || [], boqItems: hit.boqItems || []
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
      
      const water = pickableMeshes.current.find(m => m.userData.entityId === "JPNIC_WATER");
      if (water) water.position.y = 4.25 + Math.sin(t * 2) * 0.05;

      if (rainGeoRef.current) {
        const positions = rainGeoRef.current.attributes.position.array as Float32Array;
        for(let i=1; i<rainCount*3; i+=3) {
          positions[i] -= 2.0; 
          if (positions[i] < 0) positions[i] = 200; 
        }
        rainGeoRef.current.attributes.position.needsUpdate = true;
      }

      if (droneRef.current) {
        droneRef.current.position.set(30 + Math.cos(t) * 45, 60 + Math.sin(t*2)*5, -10 + Math.sin(t) * 45);
        droneRef.current.lookAt(30, 40, -10);
      }

      if (workersRef.current && workersData.current.length > 0) {
        workersData.current.forEach((w, i) => {
            w.angle += w.speed * 0.01;
            dummy.position.set(Math.cos(w.angle) * w.radius, 4.4, Math.sin(w.angle) * w.radius);
            dummy.updateMatrix();
            workersRef.current!.setMatrixAt(i, dummy.matrix);
        });
        workersRef.current.instanceMatrix.needsUpdate = true;
      }

      if (truckRef.current && drumRef.current) {
        drumRef.current.rotation.y += 0.02; 
        const targetZ = 30; 
        if (truckRef.current.position.z > targetZ) {
            truckRef.current.position.z -= 0.2; 
        }
      }

      // CINEMATIC IDLE ORBIT: If untouched for 5 seconds
      if (Date.now() - lastInteractionTime.current > 5000 && !isDragging) {
         sph.theta -= 0.0015; // Slow rotation
         updateCameraPos();
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

  // RFI RESOLUTION LOGIC
  useEffect(() => {
    if (!elementsGroupRef.current) return;
    const pipe = pickableMeshes.current.find(m => m.userData.entityId === "CHW_MAIN");
    if (pipe) { pipe.position.y = clashResolved ? 4.8 : 5.5; pipe.userData.originalY = clashResolved ? 4.8 : 5.5; }

    const clash = pickableMeshes.current.find(m => m.userData.entityId === "CLASH_NODE_01");
    if (clash) {
      const mat = clash.material as any;
      if (clashResolved) {
        mat.color.setHex(0x10b981); mat.emissive.setHex(0x059669);
        clash.userData.originalColor = 0x10b981; clash.userData.originalEmissive = 0x059669; clash.scale.setScalar(1); 
      } else {
        mat.color.setHex(0xff0000); mat.emissive.setHex(0xaa0000);
        clash.userData.originalColor = 0xff0000; clash.userData.originalEmissive = 0xaa0000;
      }
    }
  }, [clashResolved]);

  // WEATHER & LIGHTING
  useEffect(() => {
    if (!lightsGroupRef.current || !sceneRef.current) return;
    const isNight = shiftMode === "NIGHT_SHIFT";
    const isMonsoon = weatherMode === "MONSOON";
    
    if (sceneRef.current.fog) (sceneRef.current.fog as THREE.FogExp2).density = isMonsoon ? 0.008 : 0.002;
    const rainSystem = sceneRef.current.children.find(c => c.userData.isWeather);
    if (rainSystem) rainSystem.visible = isMonsoon;

    let bgColor = isNight ? 0x010308 : 0x060a14;
    if (isMonsoon && !isNight) bgColor = 0x1e293b; 
    sceneRef.current.background = new THREE.Color(bgColor);

    const lights = lightsGroupRef.current.children;
    const ambient = lights[0] as THREE.AmbientLight;
    const dir = lights[1] as THREE.DirectionalLight;
    const spot1 = lights[2] as THREE.SpotLight;
    
    if (isNight) { ambient.intensity = 0.1; dir.intensity = 0.1; spot1.intensity = 4000; } 
    else { ambient.intensity = isMonsoon ? 0.4 : 0.7; dir.intensity = isMonsoon ? 0.5 : 1.6; spot1.intensity = 0; }
  }, [shiftMode, weatherMode]);

  // Z-AXIS CLIP & EXPLODE
  useEffect(() => {
    if (clipPlaneRef.current) clipPlaneRef.current.constant = 80 * (planCutZ / 100);
    if (elementsGroupRef.current) {
      elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.userData && mesh.userData.originalY !== undefined) {
          const mult = mesh.userData.level === "L2_HELIPAD" ? 40 : mesh.userData.level === "L1_HOTEL_TOWER" ? 20 : mesh.userData.level === "L1_MUSEUM" ? 10 : 0;
          mesh.position.y = mesh.userData.originalY + (explodeY / 100) * mult;
        }
      });
    }
  }, [planCutZ, explodeY]);

  // RENDER MODE (Solid, Edges, X-Ray, LiDAR, AI Heatmap)
  useEffect(() => {
    if (!elementsGroupRef.current || !isHydrated) return;

    elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.userData || !mesh.material) return;
      if (mesh.userData.isCamera || mesh.userData.isAuxiliary) return;

      const { minWeek, plannedWeek, originalColor, originalOpacity, originalTransparent, entityId } = mesh.userData;
      const mat = mesh.material as any;
      
      mesh.visible = timelineWeek >= minWeek;

      if (mesh.userData.edgeLine) mesh.userData.edgeLine.visible = (renderMode === "CAD_EDGES" || renderMode === "X_RAY");
      if (mesh.userData.pointsMesh) mesh.userData.pointsMesh.visible = (renderMode === "LIDAR_SCAN");

      if (mesh.visible) {
        if (renderMode === "LIDAR_SCAN") {
            mat.visible = false; 
            if (mesh.userData.edgeLine) mesh.userData.edgeLine.visible = false;
        } else {
            mat.visible = true;
            mat.transparent = originalTransparent || renderMode === "X_RAY";
            mat.opacity = renderMode === "X_RAY" ? 0.2 : originalOpacity;
            mat.wireframe = renderMode === "X_RAY";
        }
      }

      if (mat.color && originalColor !== undefined && entityId !== "CLASH_NODE_01") {
        if (renderMode === "AI_HEATMAP") {
            const heatVal = minWeek / 24; 
            const r = heatVal; const g = 0.2; const b = 1 - heatVal;
            mat.color.setRGB(r, g, b);
        } else if (timelineMode === "VARIANCE") {
          const delta = minWeek - plannedWeek;
          if (delta > 0) mat.color.setHex(0xef4444);
          else if (delta < 0) mat.color.setHex(0x10b981);
          else mat.color.setHex(0x0284c7);
        } else mat.color.setHex(originalColor);
      }
    });

    if (droneRef.current) droneRef.current.visible = (renderMode === "LIDAR_SCAN");
  }, [timelineWeek, timelineMode, renderMode, isHydrated]);

  const ganttMilestones = useMemo(() => {
    return [
      { name: "Podium & Foundation Raft", plannedStart: 0, plannedDuration: 4, actualStart: 1, actualDuration: 3, status: "AHEAD", camRef: "CAM-01", hash: "7f4c9a18" },
      { name: "Museum Wedge & Tower Core", plannedStart: 4, plannedDuration: 6, actualStart: 4, actualDuration: 6, status: "ON_TIME", camRef: "DRONE-WP", hash: "5b8d8d42" },
      { name: "Diagrid & Facade Glazing", plannedStart: 10, plannedDuration: 6, actualStart: 12, actualDuration: 6, status: "DELAYED", camRef: "SITE_APP", hash: "a90e52a1" },
      { name: "Cantilever Helipad Push", plannedStart: 16, plannedDuration: 4, actualStart: 18, actualDuration: 4, status: "DELAYED", camRef: "DRONE-WP", hash: "8d22fe1a" },
      { name: "Campus MEP Trench Routing", plannedStart: 20, plannedDuration: 4, actualStart: 20, actualDuration: 4, status: clashResolved ? "RESOLVED" : "BLOCKED", camRef: "HERMES", hash: clashResolved ? "2b8a4f91" : "Pending" }
    ];
  }, [clashResolved]);

  if (!isHydrated) return <div className="w-full h-[520px] bg-slate-950"></div>;

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-lg">
          {(["SOLID", "CAD_EDGES", "X_RAY", "LIDAR_SCAN", "AI_HEATMAP"] as const).map((mode) => (
            <button key={mode} onClick={() => setRenderMode(mode)} className={`px-2.5 py-0.5 text-[11px] font-mono rounded font-semibold transition ${renderMode === mode ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}>{mode.replace("_", " ")}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setWeatherMode(weatherMode === "CLEAR" ? "MONSOON" : "CLEAR")} className={`px-3 py-1 text-xs font-bold uppercase rounded border transition-all ${weatherMode === "MONSOON" ? "bg-teal-900 border-teal-500 text-teal-200 shadow-md shadow-teal-500/20" : "bg-slate-800 border-slate-700 text-slate-300"}`}>
            {weatherMode === "MONSOON" ? "🌧️ Monsoon" : "☀️ Clear"}
          </button>
          <button onClick={() => setShiftMode(shiftMode === "DAY_SHIFT" ? "NIGHT_SHIFT" : "DAY_SHIFT")} className={`px-3 py-1 text-xs font-bold uppercase rounded border transition-all ${shiftMode === "NIGHT_SHIFT" ? "bg-indigo-900 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-500/20" : "bg-sky-900 border-sky-500 text-sky-200"}`}>
            {shiftMode === "NIGHT_SHIFT" ? "🌙 Night" : "☀️ Day"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="relative w-full h-[500px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            
            {/* ENHANCED 6D EVM HUD */}
            <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-700 p-3 rounded-lg backdrop-blur-md w-64 pointer-events-none shadow-2xl">
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-2 border-b border-slate-700 pb-1">6D EVM Analytics</div>
              <div className="flex justify-between items-center mb-1"><span className="text-xs text-slate-400">Earned Value (EV):</span><span className="text-xs font-bold font-mono text-emerald-400">₹{(evmStatus.EV / 10000000).toFixed(2)}Cr</span></div>
              <div className="flex justify-between items-center mb-2"><span className="text-xs text-slate-400">Actual Cost (AC):</span><span className={`text-xs font-bold font-mono ${evmStatus.CPI < 1 ? "text-red-400" : "text-emerald-400"}`}>₹{(evmStatus.AC / 10000000).toFixed(2)}Cr</span></div>
              
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800">
                <div className="bg-slate-950 p-1.5 rounded text-center"><div className="text-[9px] text-slate-500 uppercase">CPI (Cost)</div><div className={`text-xs font-bold font-mono ${evmStatus.CPI < 1.0 ? "text-red-500" : "text-emerald-500"}`}>{evmStatus.CPI.toFixed(2)}</div></div>
                <div className="bg-slate-950 p-1.5 rounded text-center"><div className="text-[9px] text-slate-500 uppercase">SPI (Schedule)</div><div className={`text-xs font-bold font-mono ${evmStatus.SPI < 1.0 ? "text-amber-500" : "text-emerald-500"}`}>{evmStatus.SPI.toFixed(2)}</div></div>
              </div>
              
              {/* NEW: 6D Sustainability Tracker */}
              <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[10px] text-slate-400">Embodied Carbon:</span>
                <span className="text-xs font-bold font-mono text-blue-400">{evmStatus.carbonTons.toLocaleString()} tCO₂e</span>
              </div>
            </div>

            {/* NEW: QUADILLAR AI AGENT HIVE (Terminal Logs) */}
            <div className="absolute bottom-3 left-3 bg-slate-950/80 border border-slate-800 p-2 rounded-lg backdrop-blur-md w-80 h-28 overflow-hidden pointer-events-none flex flex-col justify-end">
                <div className="text-[9px] font-bold font-mono text-slate-500 mb-1">QUADILLAR MULTI-AGENT HIVE</div>
                <div className="flex flex-col gap-0.5 justify-end">
                    {aiLogs.map((log) => (
                        <div key={log.id} className="text-[10px] font-mono leading-tight">
                            <span className="text-slate-500">[{log.agent}]</span> <span className={log.color}>{log.msg}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
              <div className="px-2.5 py-1 bg-slate-900/90 border border-cyan-500/40 rounded text-xs font-mono text-cyan-300 flex items-center gap-2 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> LiveView Phase 20: AI Copilot
              </div>
              {hoveredTag && <div className="px-2.5 py-1 bg-blue-950/90 border border-blue-400/50 rounded text-xs font-mono text-blue-200 backdrop-blur-md">{hoveredTag}</div>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center gap-4"><span className="text-[11px] font-bold text-slate-300 uppercase">Z-Axis Slicer:</span><input type="range" min="0" max="100" step="1" value={planCutZ} onChange={(e) => setPlanCutZ(parseInt(e.target.value, 10))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400" /></div>
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center gap-4"><span className="text-[11px] font-bold text-slate-300 uppercase">Y-Axis Explode:</span><input type="range" min="0" max="100" step="1" value={explodeY} onChange={(e) => setExplodeY(parseInt(e.target.value, 10))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400" /></div>
          </div>
        </div>

        {/* 3. INSPECTOR PANEL */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col h-[540px] overflow-hidden">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">Active Selection</div>
          <h3 className="text-base font-bold text-white mb-2">{selectedEntity.name}</h3>
          <div className="flex border-b border-slate-800 mb-4 overflow-x-auto">
            <button onClick={() => setInspectorTab("SUB_COMPS")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${inspectorTab === "SUB_COMPS" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500"}`}>Details</button>
            {selectedEntity.id === "CLASH_NODE_01" && (
              <button onClick={() => setInspectorTab("CLASH_MATRIX")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1 ${inspectorTab === "CLASH_MATRIX" ? (clashResolved ? "text-emerald-400 border-b-2 border-emerald-400" : "text-red-400 border-b-2 border-red-400") : "text-slate-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${clashResolved ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`}></span> {clashResolved ? "Resolved" : "Clash"}
              </button>
            )}
            {selectedEntity.id === "LABOR_SWARM" && (
              <button onClick={() => setInspectorTab("WORKFORCE")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1 ${inspectorTab === "WORKFORCE" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-500"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Workforce
              </button>
            )}
            {selectedEntity.id === "TRUCK_RMC_01" && (
              <button onClick={() => setInspectorTab("LOGISTICS")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1 ${inspectorTab === "LOGISTICS" ? "text-purple-400 border-b-2 border-purple-400" : "text-slate-500"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span> Logistics
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {inspectorTab === "SUB_COMPS" ? (
              <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">Select an element or click the workforce swarm to view details.</div>
            ) : inspectorTab === "CLASH_MATRIX" ? (
              <div className="flex flex-col gap-4">
                <div className={`${clashResolved ? "bg-emerald-950/30 border-emerald-500/40" : "bg-red-950/30 border-red-500/40"} border rounded-xl p-4 transition-all duration-500`}>
                  <div className={`text-[10px] font-mono ${clashResolved ? "text-emerald-400" : "text-red-400"} uppercase tracking-widest mb-3`}>{clashResolved ? "CLASH RESOLVED & CLOSED" : "AXIS SPATIAL LOCKOUT"}</div>
                  <h4 className="text-sm font-bold text-slate-200 mb-2">Hard Intersect: Campus MEP Trench</h4>
                  <p className="text-xs text-slate-400 mb-4">{clashResolved ? "RFI #4490 Approved. Central CHW pipe elevation successfully shifted down by 0.5m." : "Central Chilled Water pipe physically intersects with the HT Cable Tray at Elev: 5.5m."}</p>
                  <button onClick={() => setClashResolved(true)} disabled={clashResolved} className={`w-full py-2 font-bold text-xs rounded transition-all duration-300 ${clashResolved ? "bg-emerald-900/50 text-emerald-400 cursor-not-allowed border border-emerald-500/30" : "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]"}`}>
                    {clashResolved ? "✓ AI RFI Approved & Applied" : "Raise Coordination RFI & Auto-Fix"}
                  </button>
                </div>
              </div>
            ) : inspectorTab === "WORKFORCE" ? (
               <div className="flex flex-col gap-4">
                 <div className="bg-blue-950/30 border border-blue-500/40 rounded-xl p-4">
                   <div className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mb-3">Live IoT Helmet Tracking</div>
                   <div className="grid grid-cols-2 gap-3 mb-4">
                     <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-center"><div className="text-[10px] text-slate-400 uppercase">Civil/Struct</div><div className="text-xl font-bold font-mono text-blue-400 mt-1">105</div></div>
                     <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-center"><div className="text-[10px] text-slate-400 uppercase">MEP/HVAC</div><div className="text-xl font-bold font-mono text-orange-400 mt-1">45</div></div>
                   </div>
                 </div>
               </div>
            ) : inspectorTab === "LOGISTICS" ? (
               <div className="flex flex-col gap-4">
                 <div className="bg-purple-950/30 border border-purple-500/40 rounded-xl p-4">
                   <div className="text-[10px] font-mono text-purple-400 uppercase tracking-widest mb-3">Supply Chain Live Transit</div>
                   <h4 className="text-sm font-bold text-slate-200 mb-2">UP32-HZ-8821 (M40 RMC)</h4>
                   <div className="flex justify-between py-1 border-b border-slate-800/60"><span className="text-xs text-slate-400">Batching Plant:</span><span className="text-xs text-slate-200">Gomti Nagar Ext.</span></div>
                   <div className="flex justify-between py-1 border-b border-slate-800/60"><span className="text-xs text-slate-400">Transit Time:</span><span className="text-xs font-mono text-amber-400">22 Mins</span></div>
                   <div className="flex justify-between py-1"><span className="text-xs text-slate-400">Concrete Expiry:</span><span className="text-xs font-mono text-emerald-400">1H 38M Left</span></div>
                 </div>
               </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl flex flex-col gap-4">
        <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-200 uppercase tracking-wider">Visual 4D Schedule Analyzer:</span>
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono font-bold rounded border border-blue-500/30">Week {timelineWeek}</span>
            <button onClick={() => setIsPlaying4D(!isPlaying4D)} className={`ml-2 px-3 py-0.5 rounded text-[10px] font-bold uppercase transition ${isPlaying4D ? "bg-amber-500 text-slate-900" : "bg-cyan-600 text-white hover:bg-cyan-500"}`}>
              {isPlaying4D ? "⏸ PAUSE" : "▶ PLAY 4D"}
            </button>
          </div>
        </div>
        <input type="range" min="1" max="24" step="1" value={timelineWeek} onChange={(e) => { setTimelineWeek(parseInt(e.target.value, 10)); setIsPlaying4D(false); }} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 mb-2" />
        <div className="flex flex-col gap-3 mt-2">
          {ganttMilestones.map((ms, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="w-48 text-[11px] font-bold text-slate-300 truncate">{ms.name}</div>
              <div className="flex-1 relative h-6 bg-slate-950 border border-slate-800 rounded-md overflow-hidden flex flex-col justify-center gap-0.5 px-1">
                <div className="absolute h-1.5 bg-blue-500/60 rounded-full transition-all" style={{ left: `${(ms.plannedStart / 24) * 100}%`, width: `${(ms.plannedDuration / 24) * 100}%`, top: '4px' }}></div>
                {timelineWeek >= ms.actualStart && (
                  <div className={`absolute h-1.5 rounded-full transition-all ${ms.status === "DELAYED" || ms.status === "BLOCKED" ? "bg-red-500" : "bg-emerald-500"}`} style={{ left: `${(ms.actualStart / 24) * 100}%`, width: `${(Math.min(timelineWeek - ms.actualStart, ms.actualDuration) / 24) * 100}%`, bottom: '4px' }}></div>
                )}
                <div className="absolute top-0 bottom-0 w-px bg-cyan-400/50 z-10" style={{ left: `${(timelineWeek / 24) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {activeCamera && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div><span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">AI Computer Vision Feed</span><h4 className="text-base font-bold text-white">{activeCamera.name}</h4></div>
              <button onClick={() => setActiveCamera(null)} className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1">✕</button>
            </div>
            
            <div className="relative w-full h-64 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/40 via-transparent to-slate-900/50 pointer-events-none"></div>
              <div className="absolute top-3 left-3 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> AI INFERENCE ACTIVE</div>
              <div className="absolute top-[20%] left-[30%] w-16 h-20 border-2 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] flex items-start animate-pulse"><span className="bg-emerald-500 text-slate-900 text-[8px] font-bold px-1 mt-[-14px]">PPE: PASS</span></div>
              <div className="absolute top-[40%] right-[25%] w-24 h-12 border-2 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)] flex items-start"><span className="bg-purple-500 text-white text-[8px] font-bold px-1 mt-[-14px]">UP32-HZ-8821</span></div>
              <div className="text-center p-6 mt-4"><div className="text-4xl text-purple-400/50 mb-2">��️</div></div>
            </div>
            
            <div className="flex justify-end pt-2"><button onClick={() => setActiveCamera(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded transition">Close Feed</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
ENGINE_V22_EOF

echo "✓ Phase 20 Applied: Multi-Agent AI Hive, 6D Carbon Tracking & Cinematic Orbit"
