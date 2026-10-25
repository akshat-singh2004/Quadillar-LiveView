#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: BIM ENGINE PHASE 30 (HEAVY MACHINERY & INVESTOR PITCH)
# Features: Dynamic Liebherr Crane, Crane Operator FPV, Pitch Watermark
# ==============================================================================

set -euo pipefail

cat << 'ENGINE_V32_EOF' > components/bim/FullBimSimulationEngine.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

export type SelectionLevel = "ALL" | "L0_PODIUM" | "L1_MUSEUM" | "L1_HOTEL_TOWER" | "L2_HELIPAD";
export type SelectionZone = "ALL_ZONES" | "ZONE_WEDGE" | "ZONE_TOWER" | "ZONE_PLAZA";
export type RenderMode = "SOLID" | "CAD_EDGES" | "X_RAY" | "LIDAR_SCAN" | "AI_HEATMAP" | "ANATOMY";
export type WeatherMode = "CLEAR" | "MONSOON";
export type CameraMode = "ORBIT" | "DRONE_FPV" | "CRANE_CAM";

export interface DocumentRecord { id: string; title: string; type: "PDF" | "DWG" | "RFI" | "TEST_REPORT"; date: string; status: "APPROVED" | "PENDING"; }
export interface BOQLineItem { itemCode: string; description: string; quantity: number; unit: string; rateINR: number; amountINR: number; carbonKg: number; }
export interface SubComponent { id: string; name: string; type: string; status: "INSTALLED" | "PENDING" | "DEFECT" | "IN_PROGRESS" | "CLASH" | "ACTIVE" | "RESOLVED" | "IN_TRANSIT" | "OPERATIONAL"; weightOrVolume: string; }

export interface SelectedEntity {
  id: string; name: string; type: "LEVEL" | "ZONE" | "ELEMENT" | "MACHINERY" | "LABOR" | "LOGISTICS" | "IOT_NODE"; discipline: "CIVIL" | "STRUCTURAL" | "MEP" | "DEFECT" | "ARCHITECTURAL" | "SAFETY" | "OPERATIONS" | "SUPPLY_CHAIN";
  parentLevel: SelectionLevel; parentZone: SelectionZone; subComponents: SubComponent[]; boqItems: BOQLineItem[]; cdeDocs: DocumentRecord[];
}

export interface CameraWaypoint { id: string; name: string; position: [number, number, number]; type: "CCTV_FIXED" | "DRONE_PHOTOGRAMMETRY" | "UG_SENSOR"; latestCapture: { timestamp: string; sha256: string; verifiedDeviationMm: number; }; }

export default function FullBimSimulationEngine() {
  const mountRef = useRef<HTMLDivElement>(null);

  const [isHydrated, setIsHydrated] = useState(false);
  const [timelineWeek, setTimelineWeek] = useState<number>(24);
  const [isPlaying4D, setIsPlaying4D] = useState(false);
  
  const [timeOfDay, setTimeOfDay] = useState<number>(14); 
  const [renderMode, setRenderMode] = useState<RenderMode>("SOLID");
  const [weatherMode, setWeatherMode] = useState<WeatherMode>("CLEAR");
  const [camMode, setCamMode] = useState<CameraMode>("ORBIT");
  
  const [pitchMode, setPitchMode] = useState<boolean>(false);
  const [vrMode, setVrMode] = useState<boolean>(false);
  const [planCutZ, setPlanCutZ] = useState<number>(100);
  const [explodeY, setExplodeY] = useState<number>(0);
  const [clashResolved, setClashResolved] = useState(false);

  const [activeCamera, setActiveCamera] = useState<CameraWaypoint | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"SUB_COMPS" | "BOQ_LEDGER" | "LIVE_IOT" | "CLASH_MATRIX" | "CDE_DOCS">("SUB_COMPS");
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [aiLogs, setAiLogs] = useState<{id: string, agent: string, msg: string, color: string}[]>([]);

  const [sensorData, setSensorData] = useState({ temp: 32.4, strength: 18.2, maturity: 65 });

  const defaultEntity: SelectedEntity = {
    id: "ENTIRE_JPNIC", name: "Jai Prakash Narayan International Centre (JPNIC)", type: "LEVEL", discipline: "ARCHITECTURAL",
    parentLevel: "ALL", parentZone: "ALL_ZONES", 
    subComponents: [
        { id: "ARCH", name: "Studio Archohm", type: "CONSULTANT", status: "ACTIVE", weightOrVolume: "Lead Architect" }
    ],
    boqItems: [
      { itemCode: "TERRA-SPINE", description: "Terracotta Sweeping Spine & Fins", quantity: 18450, unit: "Sqm", rateINR: 5200, amountINR: 95940000, carbonKg: 3820000 },
      { itemCode: "DOME-SHELL", description: "Silver Acoustic Dome Structure", quantity: 1, unit: "Item", rateINR: 42000000, amountINR: 42000000, carbonKg: 1450000 }
    ],
    cdeDocs: [
      { id: "DOC-001", title: "Masterplan_GFC_v4.dwg", type: "DWG", date: "2026-01-15", status: "APPROVED" }
    ]
  };
  
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(defaultEntity);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const elementsGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);
  const clipPlaneRef = useRef<THREE.Plane | null>(null);
  const pickableMeshes = useRef<THREE.Mesh[]>([]);
  const lastInteractionTime = useRef<number>(Date.now());
  
  const trafficData = useRef<{x: number, speed: number, zOff: number, dir: number}[]>([]);
  const trafficRef = useRef<THREE.InstancedMesh | null>(null);
  const droneRef = useRef<THREE.Group | null>(null);
  
  // NEW PHASE 30 REFS
  const iotSensorsRef = useRef<THREE.Mesh[]>([]);
  const aviationLightsRef = useRef<THREE.Mesh[]>([]);
  const rainGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const craneRef = useRef<THREE.Group | null>(null);
  const craneJibRef = useRef<THREE.Group | null>(null);
  const craneTrolleyRef = useRef<THREE.Mesh | null>(null);

  const cameraStations: CameraWaypoint[] = useMemo(() => [
    { id: "CAM-01-PLAZA", name: "CCTV (Central Plaza)", position: [0, 8, 45], type: "CCTV_FIXED", latestCapture: { timestamp: "2026-10-24 11:42:00 IST", sha256: "7f4c9a18...3c10a", verifiedDeviationMm: 1.8 } },
    { id: "DRONE-WP-TOWER", name: "Drone (Helipad Inspection)", position: [25, 95, 10], type: "DRONE_PHOTOGRAMMETRY", latestCapture: { timestamp: "2026-10-24 09:15:22 IST", sha256: "5b8d8d42...7a64", verifiedDeviationMm: 0.9 } }
  ], []);

  const addAiLog = (agent: string, msg: string, color: string) => {
    setAiLogs(prev => {
      if (prev.some(log => log.msg === msg)) return prev;
      const uniqueId = Math.random().toString(36).substring(2, 11);
      return [...prev.slice(-4), { id: uniqueId, agent, msg, color }];
    });
  };

  const isHandover = timelineWeek >= 24;

  const evmStatus = useMemo(() => {
    const totalAllocated = 864000000; 
    let EV = 0, AC = 0, PV = 0, retained = 0, carbonTons = 0, carbonOffset = 0;
    PV = (timelineWeek / 24) * totalAllocated;
    
    if (timelineWeek >= 4) { EV += 150000000; AC += 148000000; carbonTons += 2450; } 
    if (timelineWeek >= 10) { EV += 200000000; AC += 195000000; carbonTons += 4820; } 
    if (timelineWeek >= 16) { EV += 250000000; AC += 255000000; carbonTons += 8900; } 
    if (timelineWeek >= 20) { 
      carbonTons += 1240;
      if (clashResolved) { EV += 172500000; AC += 170000000; } 
      else { EV += 150000000; AC += 180000000; retained += 22500000; }
    } 
    if (timelineWeek >= 24) { EV = totalAllocated; AC = totalAllocated - 4500000; carbonTons += 500; carbonOffset = 120; }
    
    const SPI = PV === 0 ? 1.0 : EV / PV;
    const CPI = AC === 0 ? 1.0 : EV / AC;
    return { allocated: totalAllocated, EV, AC, PV, retained, SPI, CPI, carbonTons, carbonOffset };
  }, [timelineWeek, clashResolved]);

  const [opsData, setOpsData] = useState({ occupancy: 0, powerMw: 0, hvacLoad: 0 });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("quadillar_bim_state_jpnic_v30");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timelineWeek) setTimelineWeek(parsed.timelineWeek);
        if (parsed.renderMode) setRenderMode(parsed.renderMode);
        if (parsed.timeOfDay !== undefined) setTimeOfDay(parsed.timeOfDay);
        if (parsed.weatherMode) setWeatherMode(parsed.weatherMode);
        if (parsed.planCutZ) setPlanCutZ(parsed.planCutZ);
        if (parsed.explodeY) setExplodeY(parsed.explodeY);
        if (parsed.pitchMode !== undefined) setPitchMode(parsed.pitchMode);
      }
    } catch (e) {}
    setIsHydrated(true);
    addAiLog("SYS", "Heavy Machinery Telemetry (Tower Crane) Online.", "text-cyan-400");
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("quadillar_bim_state_jpnic_v30", JSON.stringify({ timelineWeek, renderMode, timeOfDay, weatherMode, planCutZ, explodeY, pitchMode }));
  }, [timelineWeek, renderMode, timeOfDay, weatherMode, planCutZ, explodeY, pitchMode, isHydrated]);

  useEffect(() => {
    const interval = setInterval(() => {
      const t = Date.now() / 1000;
      if (isHandover) {
        setOpsData({ occupancy: Math.round(1200 + Math.sin(t * 0.5) * 45), powerMw: +(2.4 + Math.sin(t * 0.8) * 0.2 - 0.5).toFixed(2), hvacLoad: Math.round(65 + Math.cos(t * 0.3) * 5) });
      } else {
        setSensorData({
            temp: +(32.4 + Math.sin(t * 0.2) * 1.5).toFixed(1),
            strength: +(18.2 + (timelineWeek * 0.5) + Math.cos(t * 0.1) * 0.2).toFixed(1),
            maturity: Math.min(100, Math.round(45 + (timelineWeek * 2.5)))
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isHandover, timelineWeek]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying4D) {
      interval = setInterval(() => {
        setTimelineWeek(prev => {
          if (prev === 20 && !clashResolved) {
            setIsPlaying4D(false);
            setInspectorTab("CLASH_MATRIX");
            addAiLog("MEP_AGENT", "CRITICAL: Hard spatial clash at MEP Trench.", "text-red-400");
            setTimeout(() => { addAiLog("PREDICT_AI", "Analyzing mitigation... Shift Y-Axis -0.5m.", "text-purple-400"); }, 1000);
            return 20;
          }
          if (prev >= 24) { setIsPlaying4D(false); return 24; }
          return prev + 1;
        });
      }, 1000); 
    }
    return () => clearInterval(interval);
  }, [isPlaying4D, clashResolved]);

  // --- 3D SCENE INITIALIZATION ---
  useEffect(() => {
    if (!isHydrated) return;
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x87CEEB); 
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.002);

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 540;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 3000);
    camera.position.set(125, 80, 140); 

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 120); 
    clipPlaneRef.current = clipPlane;

    const lightsGroup = new THREE.Group();
    lightsGroupRef.current = lightsGroup;
    scene.add(lightsGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    const dirLight = new THREE.DirectionalLight(0xfff3e0, 2.0); 
    dirLight.position.set(100, 150, 80);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005; 
    
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
    aviationLightsRef.current = [];
    iotSensorsRef.current = [];

    // --- MATERIALS ---
    const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xcc4422, roughness: 0.65, metalness: 0.15, clippingPlanes: [clipPlane] });
    const terracottaTrimMat = new THREE.MeshStandardMaterial({ color: 0x9e2a12, roughness: 0.8, clippingPlanes: [clipPlane] });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x5a6578, roughness: 0.9, clippingPlanes: [clipPlane] });
    const foundationMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 1.0, clippingPlanes: [clipPlane] }); 
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xd4d8de, metalness: 0.65, roughness: 0.35, clippingPlanes: [clipPlane] }); 
    const glassDarkMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, transparent: true, opacity: 0.8, roughness: 0.05, metalness: 0.9, transmission: 0.4, ior: 1.5, clippingPlanes: [clipPlane] });
    const rebarMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.8, roughness: 0.4, wireframe: true, clippingPlanes: [clipPlane] });
    const iotMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.0, clippingPlanes: [clipPlane] });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.25 });
    const lidarMat = new THREE.PointsMaterial({ color: 0x10b981, size: 0.35, transparent: true, opacity: 0.85 });
    
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x3d741c, roughness: 0.95, clippingPlanes: [clipPlane] }); 
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x245610, roughness: 0.9, clippingPlanes: [clipPlane] });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3, clippingPlanes: [clipPlane] });
    const carMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.4, clippingPlanes: [clipPlane] });
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x0a192f, metalness: 0.9, roughness: 0.2, clippingPlanes: [clipPlane] });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3, clippingPlanes: [clipPlane] });
    const clashMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xaa0000, emissiveIntensity: 0.9, wireframe: true });
    const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x0284c7, transparent: true, opacity: 0.85, transmission: 0.2, roughness: 0.05, metalness: 0.1, clippingPlanes: [clipPlane] });
    const waterBaseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 1 });

    const addBimMesh = (mesh: THREE.Mesh, entityId: string, name: string, level: SelectionLevel, zone: SelectionZone, minWeek: number, plannedWeek: number, cdeDocs: DocumentRecord[] = []) => {
      const mat = mesh.material as any;
      mesh.userData = { 
        entityId, name, level, zone, minWeek, plannedWeek, 
        originalColor: mat.color ? mat.color.getHex() : 0xffffff,
        originalEmissive: mat.emissive ? mat.emissive.getHex() : 0x000000,
        originalOpacity: mat.opacity !== undefined ? mat.opacity : 1,
        originalTransparent: mat.transparent || false,
        originalY: mesh.position.y,
        cdeDocs: cdeDocs
      };
      
      if(!entityId.includes("TREE") && !entityId.includes("SOLAR") && !entityId.includes("TRAFFIC") && !entityId.includes("IOT") && !entityId.includes("CRANE")) {
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const line = new THREE.LineSegments(edges, edgeMat);
        mesh.add(line);
        mesh.userData.edgeLine = line; 
        
        const pts = new THREE.Points(mesh.geometry, lidarMat);
        mesh.add(pts);
        mesh.userData.pointsMesh = pts;
        
        if (entityId.includes("DOME") || entityId.includes("CORE") || entityId.includes("WEDGE") || entityId.includes("ROTUNDA")) {
            const anatomySkel = new THREE.Mesh(mesh.geometry, rebarMat);
            anatomySkel.scale.set(0.98, 0.98, 0.98); 
            anatomySkel.visible = false; 
            mesh.add(anatomySkel);
            mesh.userData.anatomyMesh = anatomySkel;
        }
      }

      mesh.castShadow = true; mesh.receiveShadow = true;
      pickableMeshes.current.push(mesh);
      bimGroup.add(mesh);
    };

    // 0. LIEBHERR TOWER CRANE (PHASE 30)
    const craneGroup = new THREE.Group();
    craneGroup.position.set(-25, 0, 35); // Base of crane next to tower
    
    const craneYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.8 }); // Safety Yellow
    const craneDarkMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    // Crane Mast
    const mast = new THREE.Mesh(new THREE.BoxGeometry(3, 110, 3), craneYellowMat);
    mast.position.y = 55;
    craneGroup.add(mast);

    // Rotating Jib Group
    const jibGroup = new THREE.Group();
    jibGroup.position.y = 110;
    craneGroup.add(jibGroup);
    craneJibRef.current = jibGroup;

    // Operator Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.5, 3.5), glassDarkMat);
    cabin.position.set(2, -1, 2);
    jibGroup.add(cabin);

    // Forward Jib
    const jib = new THREE.Mesh(new THREE.BoxGeometry(75, 2.5, 2.5), craneYellowMat);
    jib.position.x = 35;
    jibGroup.add(jib);

    // Counter Jib
    const counterJib = new THREE.Mesh(new THREE.BoxGeometry(25, 2.5, 2.5), craneYellowMat);
    counterJib.position.x = -15;
    jibGroup.add(counterJib);

    // Trolley
    const trolley = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 3), craneDarkMat);
    trolley.position.set(20, -1.5, 0);
    jibGroup.add(trolley);
    craneTrolleyRef.current = trolley;

    craneGroup.userData = { entityId: "MACHINERY_CRANE_01", isAuxiliary: true }; // Hide from regular processing
    addBimMesh(mast, "MACHINERY_CRANE_01", "Liebherr 280 HC-L Tower Crane", "ALL", "ALL_ZONES", 1, 1);
    craneRef.current = craneGroup;
    scene.add(craneGroup);


    // URBAN FOREST
    const treeCount = 800;
    const treeGeo = new THREE.ConeGeometry(2, 6, 8);
    const forestMesh = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
    const dummy = new THREE.Object3D();
    let tIndex = 0;
    for(let i=0; i<1200; i++) {
        if(tIndex >= treeCount) break;
        const x = (Math.random() - 0.5) * 350; const z = (Math.random() - 0.5) * 350;
        if (Math.abs(x) < 85 && Math.abs(z) < 65) continue; 
        const scale = 0.8 + Math.random() * 0.6;
        dummy.position.set(x, (6 * scale)/2, z); dummy.scale.set(scale, scale, scale); dummy.updateMatrix();
        forestMesh.setMatrixAt(tIndex++, dummy.matrix);
    }
    forestMesh.count = tIndex; if(forestMesh.instanceMatrix) forestMesh.instanceMatrix.needsUpdate = true;
    forestMesh.castShadow = true; forestMesh.userData = { entityId: "JPNIC_URBAN_FOREST", name: "Surrounding Urban Greenery", level: "L0_PODIUM", minWeek: 1, originalColor: 0x245610 };
    pickableMeshes.current.push(forestMesh as any);
    bimGroup.add(forestMesh);

    // SUBTERRANEAN
    const pileCount = 144;
    const pileGeo = new THREE.CylinderGeometry(0.5, 0.5, 14, 8);
    const pileMesh = new THREE.InstancedMesh(pileGeo, foundationMat, pileCount);
    let pIdx = 0;
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            dummy.position.set(10 + c*4, -7, -25 + r*4); dummy.updateMatrix(); pileMesh.setMatrixAt(pIdx++, dummy.matrix);
        }
    }
    for(let r=0; r<10; r++) {
        for(let c=0; c<8; c++) {
            dummy.position.set(-45 + c*4, -7, -15 + r*4); dummy.updateMatrix(); pileMesh.setMatrixAt(pIdx++, dummy.matrix);
        }
    }
    if(pileMesh.instanceMatrix) pileMesh.instanceMatrix.needsUpdate = true;
    pileMesh.userData = { entityId: "JPNIC_PILES", name: "Subterranean Friction Piles (15m)", level: "L0_PODIUM", minWeek: 1, originalColor: 0x2d3748 };
    pickableMeshes.current.push(pileMesh as any);
    bimGroup.add(pileMesh);

    // PODIUM
    const podiumGeo = new THREE.BoxGeometry(150, 4, 110);
    const podiumMesh = new THREE.Mesh(podiumGeo, concreteMat.clone());
    podiumMesh.position.set(0, 2, 0);
    addBimMesh(podiumMesh, "JPNIC_PODIUM", "Campus Master Podium", "L0_PODIUM", "ZONE_PLAZA", 1, 1);

    // SWEEPING SPINE
    const sweepHeight = 90;
    const sweepDepth = 75;
    const createSweptFin = (finWidth: number, offsetX: number, id: string, name: string, minWk: number) => {
      const geo = new THREE.BoxGeometry(finWidth, sweepHeight, sweepDepth, 6, 24, 10);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const normalizedY = Math.max(0, (y + (sweepHeight / 2)) / sweepHeight);
        pos.setZ(i, z - Math.pow(normalizedY, 2.3) * 48);
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, terracottaMat.clone());
      mesh.position.set(offsetX, 4 + sweepHeight / 2, 8);
      addBimMesh(mesh, id, name, "L1_HOTEL_TOWER", "ZONE_TOWER", minWk, minWk);
      return mesh;
    };
    createSweptFin(14, 18, "JPNIC_TOWER_FIN_EAST", "East Sweeping Terracotta Spine", 6);
    createSweptFin(14, -8, "JPNIC_TOWER_FIN_WEST", "West Sweeping Terracotta Fin", 7);

    // DOME 
    const domeRadius = 24;
    const domeMesh = new THREE.Mesh(new THREE.SphereGeometry(domeRadius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMat.clone());
    domeMesh.position.set(-36, 4, 18);
    addBimMesh(domeMesh, "JPNIC_SILVER_DOME", "Museum Silver Dome", "L1_MUSEUM", "ZONE_WEDGE", 8, 8, [
        { id: "CDE-D1", title: "Acoustic_Dome_Structural_GFC.dwg", type: "DWG", date: "2026-06-18", status: "APPROVED" }
    ]);

    // IOT CONCRETE SENSORS
    const iotGeo = new THREE.SphereGeometry(0.8, 12, 12);
    const sensor1 = new THREE.Mesh(iotGeo, iotMat.clone()); sensor1.position.set(-30, 4.5, 30);
    const sensor2 = new THREE.Mesh(iotGeo, iotMat.clone()); sensor2.position.set(5, 12, 0); 
    const sensor3 = new THREE.Mesh(iotGeo, iotMat.clone()); sensor3.position.set(5, 4 + sweepHeight, -26); 
    [sensor1, sensor2, sensor3].forEach((s, idx) => { addBimMesh(s, `IOT_NODE_0${idx+1}`, `Concrete Curing Sensor Node 0${idx+1}`, "ALL", "ALL_ZONES", 2, 2); iotSensorsRef.current.push(s); });

    // DRONE
    const drone = new THREE.Group(); drone.userData = { isAuxiliary: true, isDrone: true }; droneRef.current = drone; scene.add(drone);
    
    let isDragging = false, prevX = 0, prevY = 0;
    let sph = { r: 210, phi: Math.PI / 3.2, theta: Math.PI / 4.2 }; 

    const updateCameraPos = () => {
      if (scene.userData.activeCamMode === "ORBIT") {
          camera.position.x = sph.r * Math.sin(sph.phi) * Math.sin(sph.theta);
          camera.position.y = sph.r * Math.cos(sph.phi);
          camera.position.z = sph.r * Math.sin(sph.phi) * Math.cos(sph.theta);
          camera.lookAt(-5, 32, 0); 
      }
    };
    updateCameraPos();
    scene.userData.updateCameraPos = updateCameraPos;
    scene.userData.sph = sph;

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

      if (!isDragging || scene.userData.activeCamMode !== "ORBIT") return;
      scene.userData.sph.theta -= (e.clientX - prevX) * 0.007;
      scene.userData.sph.phi = Math.max(0.1, Math.min(Math.PI / 2.05, scene.userData.sph.phi - (e.clientY - prevY) * 0.007));
      prevX = e.clientX;
      prevY = e.clientY;
      scene.userData.updateCameraPos();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (scene.userData.activeCamMode !== "ORBIT") return;
      lastInteractionTime.current = Date.now();
      scene.userData.sph.r = Math.max(30, Math.min(320, scene.userData.sph.r + e.deltaY * 0.1));
      scene.userData.updateCameraPos();
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
        } else {
          const isClash = hit.entityId.includes("CLASH");
          const isIoT = hit.entityId.includes("IOT");
          
          if (isClash) setInspectorTab("CLASH_MATRIX");
          else if (isIoT) setInspectorTab("LIVE_IOT");
          else if (hit.cdeDocs && hit.cdeDocs.length > 0) setInspectorTab("CDE_DOCS"); 
          else setInspectorTab("SUB_COMPS");
          
          setSelectedEntity({
            id: hit.entityId, name: hit.name, type: isIoT ? "MACHINERY" : "ELEMENT",
            discipline: isClash ? "DEFECT" : (isIoT ? "OPERATIONS" : "STRUCTURAL"),
            parentLevel: hit.level, parentZone: hit.zone,
            subComponents: hit.subComponents || [], boqItems: hit.boqItems || [], cdeDocs: hit.cdeDocs || []
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
      
      iotSensorsRef.current.forEach((s, idx) => {
          const scale = 1 + Math.sin(t * 4 + idx) * 0.2;
          s.scale.setScalar(scale);
          (s.material as any).emissiveIntensity = 0.5 + Math.sin(t * 4 + idx) * 0.5;
      });

      // DRONE ANIMATION
      if (droneRef.current) {
        const dx = 30 + Math.cos(t * 0.4) * 55;
        const dy = 65 + Math.sin(t * 0.8) * 4;
        const dz = -10 + Math.sin(t * 0.4) * 55;
        droneRef.current.position.set(dx, dy, dz);
        const nx = 30 + Math.cos((t + 0.1) * 0.4) * 55;
        const nz = -10 + Math.sin((t + 0.1) * 0.4) * 55;
        droneRef.current.lookAt(nx, dy, nz);

        if (scene.userData.activeCamMode === "DRONE_FPV") {
            camera.position.set(dx, dy + 1, dz);
            camera.lookAt(30, 30, -10);
        }
      }

      // TOWER CRANE ANIMATION & FPV
      if (craneRef.current && craneJibRef.current && craneTrolleyRef.current) {
          if (scene.userData.timelineWeek < 24) {
              craneRef.current.visible = true;
              
              // Slew (Rotate) Jib
              const jibAngle = Math.sin(t * 0.15) * 1.5;
              craneJibRef.current.rotation.y = jibAngle;
              
              // Move Trolley along Jib
              craneTrolleyRef.current.position.x = 15 + Math.abs(Math.sin(t * 0.3)) * 40;

              if (scene.userData.activeCamMode === "CRANE_CAM") {
                  // Sit inside the operator cabin
                  const cx = craneRef.current.position.x + Math.cos(jibAngle)*2;
                  const cz = craneRef.current.position.z - Math.sin(jibAngle)*2;
                  camera.position.set(cx, 110, cz);
                  
                  // Look down the jib towards the ground
                  const lx = craneRef.current.position.x + Math.cos(jibAngle)*50;
                  const lz = craneRef.current.position.z - Math.sin(jibAngle)*50;
                  camera.lookAt(lx, 20, lz);
              }
          } else {
              craneRef.current.visible = false;
              // If we are in Crane Cam during handover, auto-switch to orbit
              if (scene.userData.activeCamMode === "CRANE_CAM") {
                  scene.userData.setCamMode("ORBIT");
              }
          }
      }

      if (scene.userData.activeCamMode === "ORBIT" && Date.now() - lastInteractionTime.current > 6000 && !isDragging) {
         scene.userData.sph.theta -= 0.0012; 
         scene.userData.updateCameraPos();
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

  // TIME OF DAY & WEATHER
  useEffect(() => {
    if (!lightsGroupRef.current || !sceneRef.current) return;
    const isNight = timeOfDay < 6 || timeOfDay > 18;
    const isMonsoon = weatherMode === "MONSOON";
    
    const lights = lightsGroupRef.current.children;
    const ambient = lights[0] as THREE.AmbientLight;
    const dir = lights[1] as THREE.DirectionalLight;
    
    if (isMonsoon) {
        sceneRef.current.background = new THREE.Color(isNight ? 0x010308 : 0x1e293b);
        if (sceneRef.current.fog) (sceneRef.current.fog as THREE.FogExp2).density = 0.008;
        ambient.intensity = isNight ? 0.1 : 0.4;
        dir.intensity = isNight ? 0.1 : 0.5;
    } else {
        const timeNorm = (timeOfDay - 6) / 12; 
        const sunAngle = timeNorm * Math.PI; 
        dir.position.set(Math.cos(sunAngle) * -150, Math.sin(sunAngle) * 150, 80);

        if (isNight) {
            sceneRef.current.background = new THREE.Color(0x060a14); 
            ambient.intensity = 0.15;
            dir.intensity = 0.1;
        } else {
            const skyColor = new THREE.Color();
            if (timeOfDay < 8) skyColor.lerpColors(new THREE.Color(0xff8c00), new THREE.Color(0x87CEEB), (timeOfDay-6)/2);
            else if (timeOfDay > 16) skyColor.lerpColors(new THREE.Color(0x87CEEB), new THREE.Color(0xff4500), (timeOfDay-16)/2);
            else skyColor.setHex(0x87CEEB); 

            sceneRef.current.background = skyColor;
            if (sceneRef.current.fog) {
                (sceneRef.current.fog as THREE.FogExp2).color = skyColor;
                (sceneRef.current.fog as THREE.FogExp2).density = 0.002;
            }
            ambient.intensity = 0.6 + Math.sin(sunAngle) * 0.3;
            dir.intensity = Math.max(0, Math.sin(sunAngle) * 2.0);
            if (timeOfDay < 8 || timeOfDay > 16) dir.color.setHex(0xffaa55);
            else dir.color.setHex(0xffffff);
        }
    }
  }, [timeOfDay, weatherMode]);

  // CAMERA MODE SYNC
  useEffect(() => {
    if (sceneRef.current) {
        sceneRef.current.userData.activeCamMode = camMode;
        sceneRef.current.userData.setCamMode = setCamMode;
        if (camMode === "ORBIT" && sceneRef.current.userData.updateCameraPos) {
             sceneRef.current.userData.updateCameraPos();
        }
    }
  }, [camMode]);

  // TIMELINE SYNC FOR CRANE
  useEffect(() => {
      if (sceneRef.current) {
          sceneRef.current.userData.timelineWeek = timelineWeek;
      }
  }, [timelineWeek]);

  // RENDER MODE
  useEffect(() => {
    if (!elementsGroupRef.current || !isHydrated) return;
    elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.userData || !mesh.material) return;
      if (mesh.userData.isCamera || mesh.userData.isAuxiliary) return;

      const { minWeek, plannedWeek, originalColor, originalOpacity, originalTransparent, entityId } = mesh.userData;
      const mat = mesh.material as any;
      
      mesh.visible = timelineWeek >= minWeek;

      if (mesh.userData.edgeLine) mesh.userData.edgeLine.visible = (renderMode === "CAD_EDGES" || renderMode === "X_RAY" || renderMode === "ANATOMY");
      
      if (mesh.userData.anatomyMesh) {
          mesh.userData.anatomyMesh.visible = (renderMode === "ANATOMY" && mesh.visible);
      }

      if (mesh.visible) {
        if (renderMode === "LIDAR_SCAN") {
          mat.visible = false; 
          if (mesh.userData.edgeLine) mesh.userData.edgeLine.visible = false;
        } else if (renderMode === "ANATOMY") {
          mat.visible = true;
          mat.transparent = true;
          mat.opacity = entityId.includes("IOT") ? 1.0 : 0.15;
          mat.wireframe = false;
        } else {
          mat.visible = true;
          mat.transparent = originalTransparent || renderMode === "X_RAY";
          mat.opacity = renderMode === "X_RAY" ? 0.25 : originalOpacity;
          mat.wireframe = renderMode === "X_RAY";
        }
      }
    });
  }, [timelineWeek, renderMode, isHydrated]);

  // CYCLE CAMERA HELPER
  const cycleCameraMode = () => {
      if (camMode === "ORBIT") { setCamMode("DRONE_FPV"); addAiLog("DRONE_LINK", "Establishing Drone FPV Video downlink...", "text-purple-400"); }
      else if (camMode === "DRONE_FPV" && timelineWeek < 24) { setCamMode("CRANE_CAM"); addAiLog("MACHINERY", "Accessing Crane Operator Cabin Cam...", "text-amber-400"); }
      else setCamMode("ORBIT");
  };

  if (!isHydrated) return <div className="w-full h-[520px] bg-slate-950"></div>;

  return (
    <div className={`w-full flex flex-col gap-5 ${vrMode ? "fixed inset-0 z-50 bg-slate-950 p-6" : ""}`}>
      
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-lg">
          {(["SOLID", "CAD_EDGES", "X_RAY", "LIDAR_SCAN", "AI_HEATMAP", "ANATOMY"] as const).map((mode) => (
            <button key={mode} onClick={() => setRenderMode(mode)} className={`px-2.5 py-0.5 text-[11px] font-mono rounded font-semibold transition ${renderMode === mode ? (mode === "ANATOMY" ? "bg-amber-500 text-slate-900 animate-pulse" : "bg-emerald-500 text-slate-950") : "text-slate-400 hover:text-slate-200"}`}>
                {mode === "ANATOMY" ? "🔍 ANATOMY" : mode.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={cycleCameraMode} className={`px-3 py-1 text-xs font-bold uppercase rounded border transition-all ${camMode === "DRONE_FPV" ? "bg-purple-900 border-purple-500 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.4)]" : camMode === "CRANE_CAM" ? "bg-amber-900 border-amber-500 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.4)]" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}>
            {camMode === "DRONE_FPV" ? "🚁 DRONE FPV" : camMode === "CRANE_CAM" ? "🏗️ CRANE CAM" : "🎥 CAM: ORBIT"}
          </button>
          <button onClick={() => { setVrMode(!vrMode); if(!vrMode) { setPitchMode(true); addAiLog("XR_AGENT", "Initiating WebXR Session for Meta Quest...", "text-teal-400"); } else setPitchMode(false); }} className={`px-4 py-1 text-xs font-bold uppercase rounded border transition-all ${vrMode ? "bg-teal-500 border-teal-400 text-slate-900 shadow-[0_0_15px_rgba(20,184,166,0.5)] animate-pulse" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}>
            {vrMode ? "🥽 EXIT VR MODE" : "🥽 ENTER VR"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 transition-all duration-500 ease-in-out h-full">
        <div className={`${pitchMode || vrMode ? "lg:col-span-12" : "lg:col-span-8"} flex flex-col gap-3 transition-all duration-500 h-full`}>
          <div className={`relative w-full ${pitchMode || vrMode ? "h-[75vh]" : "h-[500px]"} bg-slate-950 rounded-xl overflow-hidden border border-slate-800 transition-all duration-500`}>
            
            {/* CROSSHAIR FOR FPV / CRANE MODES */}
            {camMode !== "ORBIT" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-40">
                    <div className="w-16 h-16 border-2 border-white rounded-full"></div>
                    <div className="absolute w-2 h-2 bg-red-500 rounded-full"></div>
                    <div className="absolute w-1 h-3 bg-white top-1/2 -mt-4 left-1/2 -ml-0.5"></div>
                    <div className="absolute w-1 h-3 bg-white bottom-1/2 -mb-4 left-1/2 -ml-0.5"></div>
                    <div className="absolute w-3 h-1 bg-white left-1/2 -ml-4 top-1/2 -mt-0.5"></div>
                    <div className="absolute w-3 h-1 bg-white right-1/2 -mr-4 top-1/2 -mt-0.5"></div>
                </div>
            )}

            {/* INVESTOR WATERMARK (ONLY IN PITCH MODE) */}
            {pitchMode && (
                <div className="absolute bottom-4 right-4 text-[9px] font-mono text-white/30 tracking-[0.2em] pointer-events-none z-20 text-right">
                    CONFIDENTIAL - INVESTOR PREVIEW<br/>
                    QUADILLAR CONTECH | YC FALL '26
                </div>
            )}

            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            
            {/* ENHANCED EVM HUD WITH S-CURVE */}
            <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-700 p-3 rounded-lg backdrop-blur-md w-72 pointer-events-none shadow-2xl transition-all z-20">
               <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-2 border-b border-slate-700 pb-1">6D EVM Analytics</div>
               <div className="flex justify-between items-center mb-1"><span className="text-xs text-slate-400">Planned Value (PV):</span><span className="text-xs font-bold font-mono text-slate-300">₹{(evmStatus.PV / 10000000).toFixed(2)}Cr</span></div>
               <div className="flex justify-between items-center mb-1"><span className="text-xs text-slate-400">Earned Value (EV):</span><span className="text-xs font-bold font-mono text-emerald-400">₹{(evmStatus.EV / 10000000).toFixed(2)}Cr</span></div>
               <div className="flex justify-between items-center mb-2"><span className="text-xs text-slate-400">Actual Cost (AC):</span><span className={`text-xs font-bold font-mono ${evmStatus.CPI < 1 ? "text-red-400" : "text-emerald-400"}`}>₹{(evmStatus.AC / 10000000).toFixed(2)}Cr</span></div>
               
               <div className="w-full h-12 border-b border-l border-slate-700 relative mb-3 mt-1">
                   <div className="absolute bottom-0 left-0 h-full w-full flex items-end">
                       <svg className="w-full h-full" preserveAspectRatio="none">
                           <path d={`M0 48 Q 50 48, 100 24 T ${Math.min(200, (timelineWeek/24)*200)} ${Math.max(0, 48 - (evmStatus.EV/evmStatus.allocated)*48)}`} fill="none" stroke="#10b981" strokeWidth="2" />
                           <path d={`M0 48 Q 50 48, 100 24 T 200 0`} fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4" />
                       </svg>
                   </div>
               </div>
            </div>

            <div className="absolute bottom-3 left-3 bg-slate-950/80 border border-slate-800 p-2 rounded-lg backdrop-blur-md w-80 h-28 overflow-hidden pointer-events-none flex flex-col justify-end z-20">
              <div className="text-[9px] font-bold font-mono text-slate-500 mb-1">QUADILLAR MULTI-AGENT HIVE</div>
              <div className="flex flex-col gap-0.5 justify-end">
                {aiLogs.map((log) => (
                  <div key={log.id} className="text-[10px] font-mono leading-tight"><span className="text-slate-500">[{log.agent}]</span> <span className={log.color}>{log.msg}</span></div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center gap-4">
              <span className="text-[11px] font-bold text-slate-300 uppercase whitespace-nowrap">Time of Day:</span>
              <input type="range" min="0" max="24" step="0.1" value={timeOfDay} onChange={(e) => setTimeOfDay(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400" />
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center gap-4">
              <span className="text-[11px] font-bold text-slate-300 uppercase whitespace-nowrap">Z-Slicer:</span>
              <input type="range" min="0" max="100" step="1" value={planCutZ} onChange={(e) => setPlanCutZ(parseInt(e.target.value, 10))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
            </div>
          </div>
        </div>

        {!pitchMode && !vrMode && (
          <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col h-[540px] overflow-hidden transition-all">
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">Active Selection</div>
            <h3 className="text-base font-bold text-white mb-2">{selectedEntity.name}</h3>
            <div className="flex border-b border-slate-800 mb-4 overflow-x-auto gap-1">
              <button onClick={() => setInspectorTab("SUB_COMPS")} className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${inspectorTab === "SUB_COMPS" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500"}`}>Details</button>
              <button onClick={() => setInspectorTab("CDE_DOCS")} className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1 ${inspectorTab === "CDE_DOCS" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-500"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> CDE Docs
              </button>
              {selectedEntity.id.includes("IOT") && (
                <button onClick={() => setInspectorTab("LIVE_IOT")} className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1 ${inspectorTab === "LIVE_IOT" ? "text-sky-400 border-b-2 border-sky-400" : "text-slate-500"}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span> Hardware IoT
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {inspectorTab === "CDE_DOCS" ? (
                  selectedEntity.cdeDocs && selectedEntity.cdeDocs.length > 0 ? (
                      <div className="flex flex-col gap-3">
                          {selectedEntity.cdeDocs.map(doc => (
                              <div key={doc.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex flex-col gap-2 hover:border-blue-500/50 cursor-pointer transition-colors group">
                                  <div className="flex justify-between items-start">
                                      <span className="text-xs font-bold text-blue-300 group-hover:text-blue-400">{doc.title}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">No CDE Documents attached.</div>
              ) : inspectorTab === "LIVE_IOT" ? (
                  <div className="flex flex-col gap-4">
                     <div className="bg-sky-950/30 border border-sky-500/40 rounded-xl p-4">
                       <div className="text-[10px] font-mono text-sky-400 uppercase tracking-widest mb-3">Hardware Sensor Telemetry</div>
                       <div className="grid grid-cols-2 gap-3 mb-4">
                         <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-center"><div className="text-[10px] text-slate-400 uppercase">Internal Temp</div><div className="text-xl font-bold font-mono text-amber-400 mt-1">{sensorData.temp}°C</div></div>
                         <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-center"><div className="text-[10px] text-slate-400 uppercase">Est. Strength</div><div className="text-xl font-bold font-mono text-emerald-400 mt-1">{sensorData.strength} MPa</div></div>
                       </div>
                     </div>
                  </div>
              ) : inspectorTab === "SUB_COMPS" ? (
                <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">Select an element to view linked data.</div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {!pitchMode && !vrMode && (
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl flex flex-col gap-4 transition-all">
          <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-200 uppercase tracking-wider">Visual 4D Schedule Analyzer:</span>
              <button onClick={() => setIsPlaying4D(!isPlaying4D)} className={`ml-2 px-3 py-0.5 rounded text-[10px] font-bold uppercase transition ${isPlaying4D ? "bg-amber-500 text-slate-900" : "bg-cyan-600 text-white hover:bg-cyan-500"}`}>
                {isPlaying4D ? "⏸ PAUSE" : "▶ PLAY 4D"}
              </button>
            </div>
          </div>
          <input type="range" min="1" max="24" step="1" value={timelineWeek} onChange={(e) => { setTimelineWeek(parseInt(e.target.value, 10)); setIsPlaying4D(false); }} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 mb-2" />
        </div>
      )}
    </div>
  );
}
ENGINE_V32_EOF

echo "✓ Phase 30 Applied: Dynamic Tower Crane Telemetry, Operator FPV & Investor Branding"
