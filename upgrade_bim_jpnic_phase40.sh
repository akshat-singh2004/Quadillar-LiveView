#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: BIM ENGINE PHASE 40 (PORTFOLIO MATRIX & ENTERPRISE SCALE)
# Features: Multi-Project SaaS Dashboard, YC Pitch AI Integration
# ==============================================================================

set -euo pipefail

cat << 'ENGINE_V40_EOF' > components/bim/FullBimSimulationEngine.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

export type SelectionLevel = "ALL" | "L0_PODIUM" | "L1_MUSEUM" | "L1_HOTEL_TOWER" | "L2_HELIPAD";
export type SelectionZone = "ALL_ZONES" | "ZONE_WEDGE" | "ZONE_TOWER" | "ZONE_PLAZA";
export type RenderMode = "SOLID" | "CAD_EDGES" | "X_RAY" | "LIDAR_SCAN" | "ANATOMY" | "IOT_MESH" | "THERMAL";
export type WeatherMode = "CLEAR" | "MONSOON";
export type CameraMode = "ORBIT" | "DRONE_FPV" | "CRANE_CAM";
export type ToolMode = "SELECT" | "MEASURE";

export interface DocumentRecord { id: string; title: string; type: "PDF" | "DWG" | "RFI" | "TEST_REPORT"; date: string; status: "APPROVED" | "PENDING"; hash: string; }
export interface BOQLineItem { itemCode: string; description: string; quantity: number; unit: string; rateINR: number; amountINR: number; carbonKg: number; }
export interface SubComponent { id: string; name: string; type: string; status: "INSTALLED" | "PENDING" | "DEFECT" | "IN_PROGRESS" | "CLASH" | "ACTIVE" | "RESOLVED" | "IN_TRANSIT" | "OPERATIONAL"; weightOrVolume: string; }

export interface SelectedEntity {
  id: string; name: string; type: "LEVEL" | "ZONE" | "ELEMENT" | "MACHINERY" | "LABOR" | "LOGISTICS" | "IOT_NODE" | "DEFECT_TICKET"; discipline: "CIVIL" | "STRUCTURAL" | "MEP" | "DEFECT" | "ARCHITECTURAL" | "SAFETY" | "OPERATIONS" | "SUPPLY_CHAIN";
  parentLevel: SelectionLevel; parentZone: SelectionZone; subComponents: SubComponent[]; boqItems: BOQLineItem[]; cdeDocs: DocumentRecord[];
}

export interface CameraWaypoint { id: string; name: string; position: [number, number, number]; type: "CCTV_FIXED" | "DRONE_PHOTOGRAMMETRY" | "UG_SENSOR"; latestCapture: { timestamp: string; sha256: string; verifiedDeviationMm: number; }; }

export default function FullBimSimulationEngine() {
  const mountRef = useRef<HTMLDivElement>(null);

  const [isHydrated, setIsHydrated] = useState(false);
  const [timelineWeek, setTimelineWeek] = useState<number>(18);
  const [isPlaying4D, setIsPlaying4D] = useState(false);
  
  const [timeOfDay, setTimeOfDay] = useState<number>(14); 
  const [renderMode, setRenderMode] = useState<RenderMode>("SOLID");
  const [weatherMode, setWeatherMode] = useState<WeatherMode>("CLEAR");
  const [camMode, setCamMode] = useState<CameraMode>("ORBIT");
  const [toolMode, setToolMode] = useState<ToolMode>("SELECT");
  
  const [pitchMode, setPitchMode] = useState<boolean>(false);
  const [vrMode, setVrMode] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [multiplayerSync, setMultiplayerSync] = useState<boolean>(false);
  const [isKioskMode, setIsKioskMode] = useState<boolean>(false);
  
  const [showPitchDeck, setShowPitchDeck] = useState<boolean>(false);
  const [vcLink, setVcLink] = useState<string | null>(null);
  
  // PHASE 40: Portfolio State
  const [showPortfolio, setShowPortfolio] = useState<boolean>(false);
  
  const [showQuadMax, setShowQuadMax] = useState<boolean>(false);
  const [quadMaxHistory, setQuadMaxHistory] = useState<{role: "user"|"ai", text: string}[]>([{ role: "ai", text: "QuadMax NLP Copilot online. How can I assist with the JPNIC Digital Twin?" }]);

  const [engineStats, setEngineStats] = useState({ fps: 60, drawCalls: 0, polygons: "0", memory: "0MB" });
  const [planCutZ, setPlanCutZ] = useState<number>(100);
  const [explodeY, setExplodeY] = useState<number>(0);
  const [clashResolved, setClashResolved] = useState(false);
  const [aiIsNegotiating, setAiIsNegotiating] = useState(false);

  const [tooltip, setTooltip] = useState<{visible: boolean, x: number, y: number, name: string, ifcType: string, week: number}>({visible: false, x: 0, y: 0, name: "", ifcType: "", week: 0});
  const [measurementPoints, setMeasurementPoints] = useState<THREE.Vector3[]>([]);
  const [measurementDistance, setMeasurementDistance] = useState<number | null>(null);

  const [inspectorTab, setInspectorTab] = useState<"SUB_COMPS" | "BOQ_LEDGER" | "LIVE_IOT" | "CLASH_MATRIX" | "CDE_DOCS" | "DLP_TICKET">("SUB_COMPS");
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [aiLogs, setAiLogs] = useState<{id: string, agent: string, msg: string, color: string}[]>([]);
  const [sensorData, setSensorData] = useState({ temp: 32.4, strength: 18.2, maturity: 65 });
  const [opsData, setOpsData] = useState({ occupancy: 0, powerMw: 0, hvacLoad: 0 });

  const defaultEntity: SelectedEntity = {
    id: "ENTIRE_JPNIC", name: "Jai Prakash Narayan International Centre (JPNIC)", type: "LEVEL", discipline: "ARCHITECTURAL",
    parentLevel: "ALL", parentZone: "ALL_ZONES", 
    subComponents: [ { id: "ARCH", name: "Studio Archohm", type: "CONSULTANT", status: "ACTIVE", weightOrVolume: "Lead Architect" } ],
    boqItems: [
      { itemCode: "TERRA-SPINE", description: "Terracotta Sweeping Spine & Fins", quantity: 18450, unit: "Sqm", rateINR: 5200, amountINR: 95940000, carbonKg: 3820000 },
      { itemCode: "DOME-SHELL", description: "Silver Acoustic Dome Structure", quantity: 1, unit: "Item", rateINR: 42000000, amountINR: 42000000, carbonKg: 1450000 }
    ],
    cdeDocs: [ { id: "DOC-001", title: "Masterplan_GFC_v4.dwg", type: "DWG", date: "2026-01-15", status: "APPROVED", hash: "8f4c9a1...3c10a" } ]
  };
  
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(defaultEntity);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const elementsGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);
  const clipPlaneRef = useRef<THREE.Plane | null>(null);
  const pickableMeshes = useRef<THREE.Mesh[]>([]);
  const lastInteractionTime = useRef<number>(Date.now());
  const framesRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(Date.now());
  
  const craneRef = useRef<THREE.Group | null>(null);
  const craneJibRef = useRef<THREE.Group | null>(null);
  const craneTrolleyRef = useRef<THREE.Mesh | null>(null);
  const measurementLineRef = useRef<THREE.Line | null>(null);
  const measurementSpheresRef = useRef<THREE.Mesh[]>([]);
  const coPilotRef = useRef<THREE.Group | null>(null);

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
    PV = (Math.min(timelineWeek, 24) / 24) * totalAllocated;
    if (timelineWeek >= 4) { EV += 150000000; AC += 148000000; carbonTons += 2450; } 
    if (timelineWeek >= 10) { EV += 200000000; AC += 195000000; carbonTons += 4820; } 
    if (timelineWeek >= 16) { EV += 250000000; AC += 255000000; carbonTons += 8900; } 
    if (timelineWeek >= 20) { 
      carbonTons += 1240;
      if (clashResolved) { EV += 172500000; AC += 170000000; } else { EV += 150000000; AC += 180000000; retained += 22500000; }
    } 
    if (timelineWeek >= 24) { EV = totalAllocated; AC = totalAllocated - 4500000; carbonTons += 500; carbonOffset = 120; }
    const SPI = PV === 0 ? 1.0 : EV / PV;
    const CPI = AC === 0 ? 1.0 : EV / AC;
    return { allocated: totalAllocated, EV, AC, PV, retained, SPI, CPI, carbonTons, carbonOffset };
  }, [timelineWeek, clashResolved]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("quadillar_bim_state_jpnic_v40");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timelineWeek) setTimelineWeek(parsed.timelineWeek);
        if (parsed.renderMode) setRenderMode(parsed.renderMode);
        if (parsed.timeOfDay !== undefined) setTimeOfDay(parsed.timeOfDay);
        if (parsed.planCutZ) setPlanCutZ(parsed.planCutZ);
        if (parsed.explodeY) setExplodeY(parsed.explodeY);
        if (parsed.pitchMode !== undefined) setPitchMode(parsed.pitchMode);
      }
    } catch (e) {}
    setIsHydrated(true);
    addAiLog("SYS", "Enterprise Portfolio Matrix Initialized.", "text-cyan-400");
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("quadillar_bim_state_jpnic_v40", JSON.stringify({ timelineWeek, renderMode, timeOfDay, planCutZ, explodeY, pitchMode }));
  }, [timelineWeek, renderMode, timeOfDay, planCutZ, explodeY, pitchMode, isHydrated]);

  useEffect(() => {
    const interval = setInterval(() => {
      const t = Date.now() / 1000;
      if (isHandover) { setOpsData({ occupancy: Math.round(1200 + Math.sin(t * 0.5) * 45), powerMw: +(2.4 + Math.sin(t * 0.8) * 0.2 - 0.5).toFixed(2), hvacLoad: Math.round(65 + Math.cos(t * 0.3) * 5) }); } 
      else { setSensorData({ temp: +(32.4 + Math.sin(t * 0.2) * 1.5).toFixed(1), strength: +(18.2 + (timelineWeek * 0.5) + Math.cos(t * 0.1) * 0.2).toFixed(1), maturity: Math.min(100, Math.round(45 + (timelineWeek * 2.5))) }); }
    }, 1000);
    return () => clearInterval(interval);
  }, [isHandover, timelineWeek]);

  // SMART AUTO-PLAY
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying4D && !isKioskMode) {
      interval = setInterval(() => {
        setTimelineWeek(prev => {
          if (prev === 20 && !clashResolved) {
            setIsPlaying4D(false);
            setInspectorTab("CLASH_MATRIX");
            setAiIsNegotiating(true);
            addAiLog("CV_AGENT", "As-built LIDAR delta > 50mm. Clash detected at MEP Trench.", "text-red-400");
            setTimeout(() => addAiLog("STRC_AGENT", "Constraint Flag: Foundation rebar lock. Cannot lower concrete trench.", "text-amber-400"), 1800);
            setTimeout(() => addAiLog("MEP_AGENT", "Mitigation Proposal: Route CHW pipe -0.5m Y-Axis to clear slab.", "text-cyan-400"), 3600);
            setTimeout(() => { addAiLog("COMM_AGENT", "Mitigation Approved. Target Escrow saved: ₹2.25Cr. WORM RFI Generated.", "text-emerald-400"); setAiIsNegotiating(false); }, 5400);
            return 20;
          }
          if (prev >= 26) { setIsPlaying4D(false); return 26; } 
          return prev + 1;
        });
      }, 1000); 
    }
    return () => clearInterval(interval);
  }, [isPlaying4D, clashResolved, isKioskMode]);

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
    const isMobile = window.innerWidth < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.shadowMap.enabled = !isMobile; 
    if (!isMobile) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;
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
    if(!isMobile) {
        dirLight.castShadow = true; dirLight.shadow.mapSize.width = 2048; dirLight.shadow.mapSize.height = 2048; dirLight.shadow.bias = -0.0005; 
    }
    
    const lightningLight = new THREE.PointLight(0xaabbff, 0, 800);
    lightningLight.position.set(-20, 250, 30);
    scene.userData.lightning = lightningLight;
    lightsGroup.add(ambientLight, dirLight, lightningLight);

    const grid = new THREE.GridHelper(400, 200, 0x00f0ff, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    const bimGroup = new THREE.Group();
    elementsGroupRef.current = bimGroup;
    scene.add(bimGroup);
    
    pickableMeshes.current = [];

    // --- MATERIALS ---
    const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xcc4422, roughness: 0.65, metalness: 0.15, clippingPlanes: [clipPlane] });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x5a6578, roughness: 0.9, clippingPlanes: [clipPlane] });
    const foundationMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 1.0, clippingPlanes: [clipPlane] }); 
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xd4d8de, metalness: 0.65, roughness: 0.35, clippingPlanes: [clipPlane] }); 
    const rebarMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.8, roughness: 0.4, wireframe: true, clippingPlanes: [clipPlane] });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.25 });
    const lidarMat = new THREE.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true, opacity: 0.9 });
    const meshLineMat = new THREE.LineBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.8 });

    const addBimMesh = (mesh: THREE.Mesh, entityId: string, name: string, level: SelectionLevel, zone: SelectionZone, minWeek: number, plannedWeek: number, cdeDocs: DocumentRecord[] = []) => {
      const mat = mesh.material as any;
      let heatIndex = 0x1e3a8a; 
      if (entityId.includes("GLZ") || entityId.includes("CORE")) heatIndex = 0xef4444; 
      else if (entityId.includes("FIN") || entityId.includes("DOME")) heatIndex = 0xf59e0b; 
      else if (entityId.includes("TREE") || entityId.includes("LAWN")) heatIndex = 0x0f172a; 

      mesh.userData = { 
        entityId, name, level, zone, minWeek, plannedWeek, 
        originalColor: mat.color ? mat.color.getHex() : 0xffffff,
        originalEmissive: mat.emissive ? mat.emissive.getHex() : 0x000000,
        originalOpacity: mat.opacity !== undefined ? mat.opacity : 1,
        originalTransparent: mat.transparent || false,
        originalY: mesh.position.y, thermalColor: heatIndex, cdeDocs: cdeDocs
      };
      
      if(!entityId.includes("TREE") && !entityId.includes("IOT") && !entityId.includes("CRANE") && !entityId.includes("DLP")) {
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const line = new THREE.LineSegments(edges, edgeMat); mesh.add(line); mesh.userData.edgeLine = line; 
        const dataLine = new THREE.LineSegments(edges, meshLineMat); dataLine.visible = false; mesh.add(dataLine); mesh.userData.dataLine = dataLine;
        const ptsGeo = mesh.geometry.clone(); const posAttr = ptsGeo.attributes.position; const colorArray = new Float32Array(posAttr.count * 3);
        
        for (let i = 0; i < posAttr.count; i++) {
            let r = 0.06, g = 0.72, b = 0.5; 
            const vx = posAttr.getX(i) + mesh.position.x; const vy = posAttr.getY(i) + mesh.position.y; const vz = posAttr.getZ(i) + mesh.position.z;
            const noise = Math.sin(vx * 0.2) * Math.cos(vy * 0.3) * Math.sin(vz * 0.1);
            if (noise > 0.85) { r = 0.93; g = 0.26; b = 0.26; } else if (noise > 0.6) { r = 0.92; g = 0.73; b = 0.03; }
            colorArray[i*3] = r; colorArray[i*3+1] = g; colorArray[i*3+2] = b;
        }
        ptsGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        const pts = new THREE.Points(ptsGeo, lidarMat); mesh.add(pts); mesh.userData.pointsMesh = pts;
        
        if (entityId.includes("DOME") || entityId.includes("CORE") || entityId.includes("WEDGE") || entityId.includes("ROTUNDA")) {
            const anatomySkel = new THREE.Mesh(mesh.geometry, rebarMat); anatomySkel.scale.set(0.98, 0.98, 0.98); anatomySkel.visible = false; mesh.add(anatomySkel); mesh.userData.anatomyMesh = anatomySkel;
        }
      }
      mesh.castShadow = true; mesh.receiveShadow = true;
      pickableMeshes.current.push(mesh); bimGroup.add(mesh);
    };

    // CRANE
    const craneGroup = new THREE.Group(); craneGroup.position.set(-25, 0, 35); 
    const craneYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.8 }); 
    const craneDarkMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const mast = new THREE.Mesh(new THREE.BoxGeometry(3, 110, 3), craneYellowMat); mast.position.y = 55; craneGroup.add(mast);
    const jibGroup = new THREE.Group(); jibGroup.position.y = 110; craneGroup.add(jibGroup); craneJibRef.current = jibGroup;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.5, 3.5), new THREE.MeshPhysicalMaterial({ color: 0x0f172a, transparent: true, opacity: 0.8 })); cabin.position.set(2, -1, 2); jibGroup.add(cabin);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(75, 2.5, 2.5), craneYellowMat); jib.position.x = 35; jibGroup.add(jib);
    const counterJib = new THREE.Mesh(new THREE.BoxGeometry(25, 2.5, 2.5), craneYellowMat); counterJib.position.x = -15; jibGroup.add(counterJib);
    const trolley = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 3), craneDarkMat); trolley.position.set(20, -1.5, 0); jibGroup.add(trolley); craneTrolleyRef.current = trolley;
    craneGroup.userData = { entityId: "MACHINERY_CRANE_01", isAuxiliary: true }; 
    addBimMesh(mast, "MACHINERY_CRANE_01", "Liebherr Tower Crane", "ALL", "ALL_ZONES", 1, 1);
    craneRef.current = craneGroup; scene.add(craneGroup);

    // PILES & PODIUM
    const pileCount = 144;
    const pileMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.5, 14, 8), foundationMat, pileCount);
    let pIdx = 0; const dummy = new THREE.Object3D();
    for(let r=0; r<8; r++) { for(let c=0; c<8; c++) { dummy.position.set(10 + c*4, -7, -25 + r*4); dummy.updateMatrix(); pileMesh.setMatrixAt(pIdx++, dummy.matrix); } }
    for(let r=0; r<10; r++) { for(let c=0; c<8; c++) { dummy.position.set(-45 + c*4, -7, -15 + r*4); dummy.updateMatrix(); pileMesh.setMatrixAt(pIdx++, dummy.matrix); } }
    if(pileMesh.instanceMatrix) pileMesh.instanceMatrix.needsUpdate = true;
    pileMesh.userData = { entityId: "JPNIC_PILES", name: "Subterranean Friction Piles", level: "L0_PODIUM", minWeek: 1, originalColor: 0x2d3748, thermalColor: 0x020617 };
    pickableMeshes.current.push(pileMesh as any); bimGroup.add(pileMesh);

    addBimMesh(new THREE.Mesh(new THREE.BoxGeometry(150, 4, 110), concreteMat.clone()).translateY(2), "JPNIC_PODIUM", "Campus Master Podium", "L0_PODIUM", "ZONE_PLAZA", 1, 1);

    // SPINE
    const sweepHeight = 90; const sweepDepth = 75;
    const createSweptFin = (finWidth: number, offsetX: number, id: string, name: string, minWk: number) => {
      const geo = new THREE.BoxGeometry(finWidth, sweepHeight, sweepDepth, 6, 24, 10);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i); const z = pos.getZ(i);
        const normalizedY = Math.max(0, (y + (sweepHeight / 2)) / sweepHeight); pos.setZ(i, z - Math.pow(normalizedY, 2.3) * 48);
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, terracottaMat.clone()); mesh.position.set(offsetX, 4 + sweepHeight / 2, 8);
      const facadeDocs: DocumentRecord[] = [ { id: "CDE-F1", title: "Terreal_Terracotta_Spec.pdf", type: "PDF", date: "2026-03-12", status: "APPROVED", hash: "a1b2c3d...e4f5" } ];
      addBimMesh(mesh, id, name, "L1_HOTEL_TOWER", "ZONE_TOWER", minWk, minWk, facadeDocs);
    };
    createSweptFin(14, 18, "JPNIC_TOWER_FIN_EAST", "East Sweeping Terracotta Spine", 6);
    createSweptFin(14, -8, "JPNIC_TOWER_FIN_WEST", "West Sweeping Terracotta Fin", 7);

    // DOME 
    const domeMesh = new THREE.Mesh(new THREE.SphereGeometry(24, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMat.clone());
    domeMesh.position.set(-36, 4, 18);
    addBimMesh(domeMesh, "JPNIC_SILVER_DOME", "Museum Silver Dome", "L1_MUSEUM", "ZONE_WEDGE", 8, 8, [ { id: "CDE-D1", title: "Acoustic_Dome_Structural_GFC.dwg", type: "DWG", date: "2026-06-18", status: "APPROVED", hash: "33h4j5k...l6m7" } ]);

    // MEP CLASH
    const chwPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 55, 16), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
    chwPipe.rotation.z = Math.PI / 2; chwPipe.position.set(-10, 5.5, 36);
    addBimMesh(chwPipe, "CHW_MAIN", "District Chilled Water Main Loop", "L0_PODIUM", "ZONE_PLAZA", 20, 20, [ { id: "CDE-RFI1", title: "RFI-4490_Trench_Clash.pdf", type: "RFI", date: "2026-10-25", status: "PENDING", hash: "pending..." } ]);
    const clashNode = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xaa0000, wireframe: true }));
    clashNode.position.set(-15, 5.5, 36);
    addBimMesh(clashNode, "CLASH_NODE_01", "MEP Trench Spatial Clash", "L0_PODIUM", "ZONE_PLAZA", 20, 20);

    let isDragging = false, prevX = 0, prevY = 0, prevDist = 0;
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

    const handlePointerDown = (clientX: number, clientY: number) => {
        if (scene.userData.toolMode === "MEASURE") return; 
        isDragging = true; prevX = clientX; prevY = clientY; lastInteractionTime.current = Date.now(); 
    };
    const handlePointerUp = () => { isDragging = false; lastInteractionTime.current = Date.now(); };
    
    const handlePointerMove = (clientX: number, clientY: number) => {
      lastInteractionTime.current = Date.now();
      const rect = mount.getBoundingClientRect();
      const mouse = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(pickableMeshes.current.filter(m => m.visible), false);

      if (hits.length > 0) {
        mount.style.cursor = scene.userData.toolMode === "MEASURE" ? "crosshair" : "pointer";
        const hitData = hits[0].object.userData;
        if (scene.userData.toolMode !== "MEASURE" && !isDragging && !isMobile) {
            setTooltip({ visible: true, x: clientX, y: clientY, name: hitData.name, ifcType: hitData.entityId, week: hitData.minWeek });
        } else { setTooltip(prev => ({...prev, visible: false})); }
      } else {
        mount.style.cursor = isDragging ? "grabbing" : (scene.userData.toolMode === "MEASURE" ? "crosshair" : "default");
        setTooltip(prev => ({...prev, visible: false}));
      }

      if (!isDragging || scene.userData.activeCamMode !== "ORBIT" || scene.userData.toolMode === "MEASURE") return;
      scene.userData.sph.theta -= (clientX - prevX) * 0.007;
      scene.userData.sph.phi = Math.max(0.1, Math.min(Math.PI / 2.05, scene.userData.sph.phi - (clientY - prevY) * 0.007));
      prevX = clientX; prevY = clientY;
      scene.userData.updateCameraPos();
    };

    const handlePointerClick = (clientX: number, clientY: number) => {
      lastInteractionTime.current = Date.now();
      const rect = mount.getBoundingClientRect();
      const mouse = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(pickableMeshes.current.filter(m => m.visible), false);

      if (hits.length > 0) {
        if (scene.userData.toolMode === "MEASURE") { const pt = hits[0].point; scene.userData.addMeasurementPoint(pt); return; }
        const hit = hits[0].object.userData; const isClash = hit.entityId.includes("CLASH"); const isDLP = hit.entityId.includes("DLP");
        if (isClash) setInspectorTab("CLASH_MATRIX"); else if (isDLP) setInspectorTab("DLP_TICKET"); else if (hit.cdeDocs && hit.cdeDocs.length > 0) setInspectorTab("CDE_DOCS"); else setInspectorTab("SUB_COMPS");
        setSelectedEntity({ id: hit.entityId, name: hit.name, type: (isDLP ? "DEFECT_TICKET" : "ELEMENT"), discipline: isClash || isDLP ? "DEFECT" : "STRUCTURAL", parentLevel: hit.level, parentZone: hit.zone, subComponents: hit.subComponents || [], boqItems: hit.boqItems || [], cdeDocs: hit.cdeDocs || [] });
      }
    };

    const onMouseDown = (e: MouseEvent) => handlePointerDown(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onClick = (e: MouseEvent) => handlePointerClick(e.clientX, e.clientY);
    const onTouchStart = (e: TouchEvent) => { if (e.touches.length === 1) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY); else if (e.touches.length === 2) { const dx = e.touches[0].clientX - e.touches[1].clientX; const dy = e.touches[0].clientY - e.touches[1].clientY; prevDist = Math.sqrt(dx*dx + dy*dy); } };
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); if (e.touches.length === 1) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY); else if (e.touches.length === 2 && scene.userData.activeCamMode === "ORBIT") { const dx = e.touches[0].clientX - e.touches[1].clientX; const dy = e.touches[0].clientY - e.touches[1].clientY; const dist = Math.sqrt(dx*dx + dy*dy); scene.userData.sph.r = Math.max(30, Math.min(320, scene.userData.sph.r + (prevDist - dist) * 0.5)); scene.userData.updateCameraPos(); prevDist = dist; } };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); if (scene.userData.activeCamMode === "DRONE_FPV") return; lastInteractionTime.current = Date.now(); scene.userData.sph.r = Math.max(30, Math.min(320, scene.userData.sph.r + e.deltaY * 0.1)); scene.userData.updateCameraPos(); };

    mount.addEventListener("mousedown", onMouseDown); window.addEventListener("mouseup", handlePointerUp); mount.addEventListener("mousemove", onMouseMove); mount.addEventListener("click", onClick); mount.addEventListener("wheel", onWheel, { passive: false });
    mount.addEventListener("touchstart", onTouchStart, { passive: false }); window.addEventListener("touchend", handlePointerUp); mount.addEventListener("touchmove", onTouchMove, { passive: false });

    const ro = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) { camera.aspect = entry.contentRect.width / entry.contentRect.height; camera.updateProjectionMatrix(); renderer.setSize(entry.contentRect.width, entry.contentRect.height); }
    });
    ro.observe(mount);

    let animId: number;
    const animate = () => {
      const t = Date.now() * 0.001;
      
      framesRef.current++;
      if (Date.now() - lastFpsTimeRef.current > 1000) {
          setEngineStats({ fps: framesRef.current, drawCalls: rendererRef.current?.info?.render.calls || 0, polygons: (((rendererRef.current?.info?.render.triangles || 0) / 1000000).toFixed(2)) + "M", memory: "142MB" });
          framesRef.current = 0; lastFpsTimeRef.current = Date.now();
      }

      if (scene.userData.lightning && scene.userData.weatherMode === "MONSOON") {
          if (Math.random() > 0.985) { scene.userData.lightning.intensity = 50000 + Math.random() * 50000; scene.userData.lightning.position.set((Math.random() - 0.5) * 200, 200, (Math.random() - 0.5) * 200);
          } else if (scene.userData.lightning.intensity > 0) { scene.userData.lightning.intensity = Math.max(0, scene.userData.lightning.intensity - 8000); }
      } else if (scene.userData.lightning) { scene.userData.lightning.intensity = 0; }

      if (craneRef.current && craneJibRef.current && craneTrolleyRef.current) {
          if (scene.userData.timelineWeek < 24) {
              craneRef.current.visible = true; const jibAngle = Math.sin(t * 0.15) * 1.5; craneJibRef.current.rotation.y = jibAngle; craneTrolleyRef.current.position.x = 15 + Math.abs(Math.sin(t * 0.3)) * 40;
              if (scene.userData.activeCamMode === "CRANE_CAM") {
                  const cx = craneRef.current.position.x + Math.cos(jibAngle)*2; const cz = craneRef.current.position.z - Math.sin(jibAngle)*2;
                  camera.position.set(cx, 110, cz); camera.lookAt(craneRef.current.position.x + Math.cos(jibAngle)*50, 20, craneRef.current.position.z - Math.sin(jibAngle)*50);
              }
          } else { craneRef.current.visible = false; if (scene.userData.activeCamMode === "CRANE_CAM") scene.userData.setCamMode("ORBIT"); }
      }

      if (scene.userData.showPitchDeck && scene.userData.activeCamMode === "ORBIT") {
          scene.userData.sph.theta -= 0.002; scene.userData.updateCameraPos();
          scene.userData.timeLapseCycle = (scene.userData.timeLapseCycle || 14) + 0.015; if (scene.userData.timeLapseCycle > 24) scene.userData.timeLapseCycle = 0;
          if (scene.userData.setTimeOfDayCallback) scene.userData.setTimeOfDayCallback(scene.userData.timeLapseCycle);
      } else if (scene.userData.isKioskMode && scene.userData.activeCamMode === "ORBIT") {
          scene.userData.sph.theta -= 0.003; scene.userData.updateCameraPos();
      } else if (scene.userData.activeCamMode === "ORBIT" && Date.now() - lastInteractionTime.current > 6000 && !isDragging) {
         scene.userData.sph.theta -= 0.0012; scene.userData.updateCameraPos();
      }

      renderer.render(scene, camera); animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      mount.removeEventListener("mousedown", onMouseDown); window.removeEventListener("mouseup", handlePointerUp); mount.removeEventListener("mousemove", onMouseMove); mount.removeEventListener("click", onClick); mount.removeEventListener("wheel", onWheel);
      mount.removeEventListener("touchstart", onTouchStart); window.removeEventListener("touchend", handlePointerUp); mount.removeEventListener("touchmove", onTouchMove);
      ro.disconnect(); renderer.dispose();
    };
  }, [isHydrated]);

  useEffect(() => { if (sceneRef.current) { sceneRef.current.userData.setTimeOfDayCallback = setTimeOfDay; } }, [setTimeOfDay]);

  useEffect(() => {
    if (!lightsGroupRef.current || !sceneRef.current) return;
    const isNight = timeOfDay < 6 || timeOfDay > 18; const isMonsoon = weatherMode === "MONSOON"; const _isHandover = timelineWeek >= 24;
    const lights = lightsGroupRef.current.children; const ambient = lights[0] as THREE.AmbientLight; const dir = lights[1] as THREE.DirectionalLight; const spot1 = lights[2] as THREE.SpotLight;
    
    if (isMonsoon) {
        sceneRef.current.background = new THREE.Color(isNight ? 0x010308 : 0x1e293b); if (sceneRef.current.fog) (sceneRef.current.fog as THREE.FogExp2).density = 0.008;
        ambient.intensity = isNight ? 0.1 : 0.4; dir.intensity = isNight ? 0.1 : 0.5; spot1.intensity = isNight ? 4000 : 0;
    } else {
        const timeNorm = (timeOfDay - 6) / 12; const sunAngle = timeNorm * Math.PI; 
        dir.position.set(Math.cos(sunAngle) * -150, Math.sin(sunAngle) * 150, 80);
        if (isNight) {
            sceneRef.current.background = new THREE.Color(0x060a14); ambient.intensity = 0.15; dir.intensity = 0.1; spot1.intensity = 4000;
        } else {
            const skyColor = new THREE.Color();
            if (timeOfDay < 8) skyColor.lerpColors(new THREE.Color(0xff8c00), new THREE.Color(0x87CEEB), (timeOfDay-6)/2);
            else if (timeOfDay > 16) skyColor.lerpColors(new THREE.Color(0x87CEEB), new THREE.Color(0xff4500), (timeOfDay-16)/2);
            else skyColor.setHex(0x87CEEB); 
            sceneRef.current.background = skyColor;
            if (sceneRef.current.fog) { (sceneRef.current.fog as THREE.FogExp2).color = skyColor; (sceneRef.current.fog as THREE.FogExp2).density = 0.002; }
            ambient.intensity = 0.6 + Math.sin(sunAngle) * 0.3; dir.intensity = Math.max(0, Math.sin(sunAngle) * 2.0);
            if (timeOfDay < 8 || timeOfDay > 16) dir.color.setHex(0xffaa55); else dir.color.setHex(0xffffff);
            spot1.intensity = 0;
        }
    }

    if (elementsGroupRef.current) {
        elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
            const mesh = obj as THREE.Mesh; if (!mesh.userData || !mesh.material) return;
            const { originalEmissive, entityId } = mesh.userData;
            if (entityId && (entityId.includes("GLZ") || entityId.includes("CORE"))) {
                const mat = mesh.material as any;
                if (isNight && _isHandover && renderMode !== "X_RAY") { mat.emissive.setHex(0xffaa55); mat.emissiveIntensity = 0.8; } 
                else { mat.emissive.setHex(originalEmissive); mat.emissiveIntensity = 0; }
            }
        });
    }
  }, [timeOfDay, weatherMode, timelineWeek, renderMode]);

  useEffect(() => { if (sceneRef.current) { sceneRef.current.userData.weatherMode = weatherMode; } }, [weatherMode]);
  useEffect(() => { if (sceneRef.current) { sceneRef.current.userData.isKioskMode = isKioskMode; } }, [isKioskMode]);
  useEffect(() => { if (sceneRef.current) { sceneRef.current.userData.showPitchDeck = showPitchDeck; } }, [showPitchDeck]);

  useEffect(() => {
    if (!elementsGroupRef.current) return;
    const pipe = pickableMeshes.current.find(m => m.userData.entityId === "CHW_MAIN");
    if (pipe) { 
        pipe.position.y = clashResolved ? 4.8 : 5.5; pipe.userData.originalY = clashResolved ? 4.8 : 5.5; 
        if (clashResolved && pipe.userData.cdeDocs) {
            pipe.userData.cdeDocs[0].status = "APPROVED"; pipe.userData.cdeDocs[0].hash = "6x9c22b...a1b2c"; 
            if (!pipe.userData.cdeDocs.some((d: any) => d.id === "CDE-RFI-RES")) { pipe.userData.cdeDocs.push({ id: "CDE-RFI-RES", title: "RFI-4490_AI_Mitigation_Plan.pdf", type: "PDF", date: new Date().toISOString().split('T')[0], status: "APPROVED", hash: "9f3a11b...4d2x9" }); }
        }
    }
  }, [clashResolved]);

  useEffect(() => {
    if (!elementsGroupRef.current || !isHydrated) return;
    elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh; if (!mesh.userData || !mesh.material) return; if (mesh.userData.isCamera || mesh.userData.isAuxiliary) return;
      const { minWeek, originalColor, originalOpacity, originalTransparent, entityId, thermalColor } = mesh.userData; const mat = mesh.material as any;
      
      mesh.visible = timelineWeek >= minWeek;
      if (mesh.userData.edgeLine) mesh.userData.edgeLine.visible = (renderMode === "CAD_EDGES" || renderMode === "X_RAY" || renderMode === "ANATOMY");
      if (mesh.userData.pointsMesh) mesh.userData.pointsMesh.visible = (renderMode === "LIDAR_SCAN");
      if (mesh.userData.dataLine) mesh.userData.dataLine.visible = (renderMode === "IOT_MESH");
      if (mesh.userData.anatomyMesh) mesh.userData.anatomyMesh.visible = (renderMode === "ANATOMY" && mesh.visible);

      if (mesh.visible) {
        if (renderMode === "LIDAR_SCAN") { mat.visible = false; 
        } else if (renderMode === "ANATOMY") { mat.visible = true; mat.transparent = true; mat.opacity = entityId.includes("IOT") ? 1.0 : 0.15; mat.wireframe = false;
        } else if (renderMode === "IOT_MESH") {
          mat.visible = true; mat.transparent = true;
          if (entityId.includes("IOT") || entityId.includes("CLASH") || entityId.includes("DLP")) { mat.opacity = 1.0; mat.wireframe = false; } 
          else { mat.opacity = 0.85; mat.color.setHex(0x020617); mat.wireframe = false; }
        } else if (renderMode === "THERMAL") {
          mat.visible = true; mat.transparent = false; mat.wireframe = false;
          if (entityId.includes("IOT") || entityId.includes("CLASH") || entityId.includes("DLP")) mat.color.setHex(originalColor);
          else mat.color.setHex(thermalColor || 0x1e3a8a);
        } else {
          mat.visible = true; mat.transparent = originalTransparent || renderMode === "X_RAY"; mat.opacity = renderMode === "X_RAY" ? 0.25 : originalOpacity; mat.wireframe = renderMode === "X_RAY";
        }
      }
      if (renderMode !== "IOT_MESH" && renderMode !== "AI_HEATMAP" && renderMode !== "THERMAL") {
          if (mat.color && originalColor !== undefined && !entityId.includes("CLASH") && !entityId.includes("DLP")) mat.color.setHex(originalColor);
      }
    });

    if (sceneRef.current) {
        if (renderMode === "IOT_MESH") { sceneRef.current.background = new THREE.Color(0x020617); if(sceneRef.current.fog) (sceneRef.current.fog as THREE.FogExp2).density = 0.005;
        } else if (renderMode === "THERMAL") { sceneRef.current.background = new THREE.Color(0x0f172a); if(sceneRef.current.fog) (sceneRef.current.fog as THREE.FogExp2).density = 0.005; }
    }
  }, [timelineWeek, renderMode, isHydrated]);

  const cycleCameraMode = () => {
      if (camMode === "ORBIT") { setCamMode("DRONE_FPV"); addAiLog("DRONE_LINK", "Establishing Drone FPV Video downlink...", "text-purple-400"); }
      else if (camMode === "DRONE_FPV" && timelineWeek < 24) { setCamMode("CRANE_CAM"); addAiLog("MACHINERY", "Accessing Crane Operator Cabin Cam...", "text-amber-400"); }
      else setCamMode("ORBIT");
  };

  const handleQuadMaxSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const input = (e.currentTarget.elements.namedItem('qInput') as HTMLInputElement).value;
      if(!input.trim()) return;
      
      setQuadMaxHistory(prev => [...prev, { role: "user", text: input }]);
      (e.currentTarget.elements.namedItem('qInput') as HTMLInputElement).value = '';

      setTimeout(() => {
          // PHASE 40: YC PITCH GENERATOR AI EASTER EGG
          if (input.toLowerCase().includes("yc pitch") || input.toLowerCase().includes("draft yc") || input.toLowerCase().includes("apply to yc")) {
              setQuadMaxHistory(prev => [...prev, { role: "ai", text: "Generating 50-word YC Application summary..." }]);
              setTimeout(() => {
                  setQuadMaxHistory(prev => [...prev, { role: "ai", text: "Quadillar ConTech builds end-to-end 6D digital twins for commercial construction. We replace fragmented spreadsheets and 2D CAD with a single WebGL platform that tracks geometry, escrow financials, IoT hardware, and multi-agent clash resolution in real-time, saving enterprise contractors millions in defect liability and timeline delays." }]);
              }, 600);
          } else if (input.toLowerCase().includes("clash")) {
              setQuadMaxHistory(prev => [...prev, { role: "ai", text: "Isolating spatial defect. Found [1] Hard Clash in MEP Trench. Scanning to Week 20." }]);
              setTimelineWeek(20); setRenderMode("IOT_MESH"); setClashResolved(false);
          } else {
              setQuadMaxHistory(prev => [...prev, { role: "ai", text: "I am actively parsing that spatial query against the CDE ledger. Please specify the element ID." }]);
          }
      }, 800);
  };

  if (!isHydrated) return <div className="w-full h-[520px] bg-slate-950"></div>;

  return (
    <div className={`w-full flex flex-col gap-5 ${vrMode ? "fixed inset-0 z-50 bg-slate-950 p-6" : ""}`}>
      
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl relative z-50">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-lg overflow-x-auto w-full md:w-auto custom-scrollbar">
          {(["SOLID", "CAD_EDGES", "X_RAY", "LIDAR_SCAN", "ANATOMY", "IOT_MESH", "THERMAL"] as const).map((mode) => (
            <button key={mode} onClick={() => setRenderMode(mode)} className={`px-2.5 py-0.5 text-[11px] font-mono rounded font-semibold transition whitespace-nowrap ${renderMode === mode ? (mode === "LIDAR_SCAN" ? "bg-teal-500 text-slate-900" : mode === "ANATOMY" ? "bg-amber-500 text-slate-900 animate-pulse" : mode === "IOT_MESH" ? "bg-blue-500 text-slate-900 shadow-[0_0_10px_rgba(59,130,246,0.6)]" : mode === "THERMAL" ? "bg-red-500 text-slate-900 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-emerald-500 text-slate-950") : "text-slate-400 hover:text-slate-200"}`}>
                {mode === "ANATOMY" ? "🔍 ANATOMY" : mode === "IOT_MESH" ? "📡 IOT MESH" : mode === "THERMAL" ? "🔥 THERMAL" : mode.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          
          {/* PHASE 40: PORTFOLIO BUTTON */}
          <button onClick={() => setShowPortfolio(!showPortfolio)} className={`px-4 py-1.5 text-[11px] font-bold uppercase rounded border transition-all whitespace-nowrap ${showPortfolio ? "bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] border-cyan-400" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}>
            {showPortfolio ? "🏢 CLOSE PORTFOLIO" : "🏢 PORTFOLIO"}
          </button>
          
          <button onClick={() => { setShowPitchDeck(!showPitchDeck); if(!showPitchDeck) { setPitchMode(true); setTimelineWeek(24); setRenderMode("SOLID"); } else setPitchMode(false); }} className={`px-4 py-1.5 text-[11px] font-bold uppercase rounded border transition-all whitespace-nowrap ${showPitchDeck ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.6)] animate-pulse border-cyan-300" : "bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700 text-cyan-400 hover:border-cyan-500"}`}>
            {showPitchDeck ? "⏹ CLOSE DECK" : "🚀 YC PITCH DECK"}
          </button>
          <button onClick={cycleCameraMode} className={`px-3 py-1 text-xs font-bold uppercase rounded border transition-all whitespace-nowrap ${camMode === "DRONE_FPV" ? "bg-purple-900 border-purple-500 text-purple-200" : camMode === "CRANE_CAM" ? "bg-amber-900 border-amber-500 text-amber-200" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}>
            {camMode === "DRONE_FPV" ? "🚁 FPV" : camMode === "CRANE_CAM" ? "🏗️ CRANE" : "🎥 CAM"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 transition-all duration-500 ease-in-out h-full relative">
        
        {/* PHASE 40: ENTERPRISE PORTFOLIO OVERLAY */}
        {showPortfolio && (
            <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-xl rounded-xl p-6 md:p-8 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-white tracking-widest">QUADILLAR COMMAND CENTER</h1>
                        <p className="text-xs md:text-sm text-cyan-400 font-mono mt-1">Global Enterprise Portfolio Matrix</p>
                    </div>
                    <div className="text-right hidden md:block">
                        <div className="text-2xl font-black text-emerald-400 font-mono">₹2,159.5 Cr</div>
                        <div className="text-xs text-slate-400 uppercase tracking-widest">Total Asset Value Monitored</div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* JPNIC (Active) */}
                    <div onClick={() => setShowPortfolio(false)} className="bg-slate-900 border border-cyan-500/50 p-5 rounded-xl cursor-pointer hover:bg-slate-800 transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-base font-bold text-white leading-tight">Jai Prakash Narayan Centre</h3>
                            <span className="bg-emerald-900/50 text-emerald-400 text-[9px] font-bold px-2 py-1 rounded border border-emerald-500/30 animate-pulse">LIVE</span>
                        </div>
                        <div className="h-32 bg-slate-950 rounded border border-slate-800 mb-4 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500 to-transparent"></div>
                            <span className="text-cyan-500 text-xs font-mono font-bold relative z-10">Active Viewport</span>
                        </div>
                        <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
                            <div className="flex justify-between text-xs font-mono text-slate-400"><span>Asset Value:</span><span className="text-white">₹864.0Cr</span></div>
                            <div className="flex justify-between text-xs font-mono text-slate-400"><span>Phase:</span><span className="text-emerald-400">7D Facility Ops</span></div>
                            <div className="flex justify-between text-xs font-mono text-slate-400"><span>Sensors:</span><span className="text-cyan-400">12 Active Nodes</span></div>
                        </div>
                    </div>

                    {/* TechPark */}
                    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl opacity-70 cursor-not-allowed">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-base font-bold text-slate-300 leading-tight">Lucknow IT City TechPark</h3>
                            <span className="bg-amber-900/30 text-amber-500 text-[9px] font-bold px-2 py-1 rounded border border-amber-500/20">PHASE 2</span>
                        </div>
                        <div className="h-32 bg-slate-950 rounded border border-slate-800 border-dashed mb-4 flex items-center justify-center">
                            <span className="text-slate-600 text-[10px] font-mono">LOD-300 Model Loading...</span>
                        </div>
                        <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
                            <div className="flex justify-between text-xs font-mono text-slate-500"><span>Asset Value:</span><span className="text-slate-300">₹1,250.0Cr</span></div>
                            <div className="flex justify-between text-xs font-mono text-slate-500"><span>Phase:</span><span className="text-amber-500">Foundation Piling</span></div>
                            <div className="flex justify-between text-xs font-mono text-slate-500"><span>Contractor:</span><span className="text-slate-400">Anandeshwar Ent.</span></div>
                        </div>
                    </div>

                    {/* ZeeroBills HQ */}
                    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl opacity-70 cursor-not-allowed">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-base font-bold text-slate-300 leading-tight">ZeeroBills Healthcare HQ</h3>
                            <span className="bg-purple-900/30 text-purple-400 text-[9px] font-bold px-2 py-1 rounded border border-purple-500/20">DESIGN</span>
                        </div>
                        <div className="h-32 bg-slate-950 rounded border border-slate-800 border-dashed mb-4 flex items-center justify-center">
                            <span className="text-slate-600 text-[10px] font-mono">Awaiting IFC Sync</span>
                        </div>
                        <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
                            <div className="flex justify-between text-xs font-mono text-slate-500"><span>Asset Value:</span><span className="text-slate-300">₹45.5Cr</span></div>
                            <div className="flex justify-between text-xs font-mono text-slate-500"><span>Phase:</span><span className="text-purple-400">Generative Massing</span></div>
                            <div className="flex justify-between text-xs font-mono text-slate-500"><span>Client:</span><span className="text-slate-400">ZeeroBills India</span></div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className={`${pitchMode || vrMode ? "lg:col-span-12" : "lg:col-span-8"} flex flex-col gap-3 transition-all duration-500 h-full relative`}>
          
          <div className={`relative w-full ${pitchMode || vrMode ? "h-[85vh] md:h-[75vh]" : "h-[450px] md:h-[500px]"} bg-slate-950 rounded-xl overflow-hidden border border-slate-800 transition-all duration-500 touch-none`}>
            
            {/* PITCH DECK OVERLAY */}
            {showPitchDeck && (
                <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center p-4 md:p-8 bg-slate-950/20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-7xl h-full md:h-auto overflow-y-auto md:overflow-visible custom-scrollbar">
                        <div className="bg-slate-900/70 border border-cyan-500/30 backdrop-blur-xl p-4 md:p-6 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.15)] flex flex-col gap-3 pointer-events-auto">
                            <div className="text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase border-b border-cyan-500/30 pb-2 mb-2">The Company</div>
                            <h2 className="text-xl md:text-2xl font-black text-white leading-tight">QUADILLAR CONTECH PVT. LTD.</h2>
                            <p className="text-xs md:text-sm text-slate-300">End-to-end Construction Technology and 6D Digital Twin platform.</p>
                            <div className="mt-2 md:mt-4 bg-slate-950/50 p-3 rounded-lg border border-slate-700">
                                <div className="text-[10px] text-slate-400 uppercase mb-1">Incubation HQ</div>
                                <div className="text-xs font-mono text-emerald-400">NIC Incubation 1, Cell 4</div>
                                <div className="text-xs text-white mt-1">Faculty of Architecture and Planning, Dr. A.P.J. Abdul Kalam Technical University (AKTU)</div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 border border-blue-500/30 backdrop-blur-xl p-4 md:p-6 rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.15)] flex flex-col gap-3 pointer-events-auto">
                            <div className="text-blue-400 text-xs font-mono font-bold tracking-widest uppercase border-b border-blue-500/30 pb-2 mb-2">The Execution Engine</div>
                            <div className="flex flex-col gap-2 md:gap-4 mt-2">
                                <div className="bg-blue-950/30 p-2 md:p-3 rounded-lg border border-blue-500/20">
                                    <div className="text-base md:text-lg font-bold text-white">Akshat Singh Rathore</div>
                                    <div className="flex justify-between items-center mt-1"><div className="text-[10px] md:text-xs text-blue-300">Founder & CEO</div><div className="text-[10px] md:text-xs font-mono bg-blue-900/50 px-2 py-0.5 rounded text-blue-200">Equity: 51%</div></div>
                                </div>
                                <div className="bg-blue-950/30 p-2 md:p-3 rounded-lg border border-blue-500/20">
                                    <div className="text-base md:text-lg font-bold text-white">Aryan Singh</div>
                                    <div className="flex justify-between items-center mt-1"><div className="text-[10px] md:text-xs text-blue-300">Co-Founder, Dir. Civil Ops</div><div className="text-[10px] md:text-xs font-mono bg-blue-900/50 px-2 py-0.5 rounded text-blue-200">Equity: 49%</div></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/70 border border-purple-500/30 backdrop-blur-xl p-4 md:p-6 rounded-2xl shadow-[0_0_40px_rgba(168,85,247,0.15)] flex flex-col gap-3 pointer-events-auto">
                            <div className="text-purple-400 text-xs font-mono font-bold tracking-widest uppercase border-b border-purple-500/30 pb-2 mb-2">Core Proprietary Tech</div>
                            <ul className="flex flex-col gap-3 md:gap-4 mt-2">
                                <li className="flex items-start gap-3"><span className="text-lg">🤖</span><div><div className="text-xs md:text-sm font-bold text-white">Multi-Agent AI Hive</div><div className="text-[10px] md:text-xs text-slate-400">Automated spatial clash resolution.</div></div></li>
                                <li className="flex items-start gap-3"><span className="text-lg">⛓️</span><div><div className="text-xs md:text-sm font-bold text-white">WORM Cryptographic Ledger</div><div className="text-[10px] md:text-xs text-slate-400">SHA-256 sealed CDE documentation.</div></div></li>
                            </ul>
                            
                            <div className="mt-auto pt-4 border-t border-purple-500/30">
                                {vcLink ? (
                                    <div className="bg-purple-950/50 border border-purple-500/50 p-2 rounded flex flex-col gap-1">
                                        <div className="text-[9px] text-purple-300 uppercase tracking-widest">Secure Room Link (Expires 24h)</div>
                                        <div className="text-[9px] md:text-[10px] font-mono text-white select-all break-all">{vcLink}</div>
                                    </div>
                                ) : (
                                    <button onClick={() => setVcLink('https://liveview.quadillar.com/pitch/yc-fall26?token=8f4c9a1b2c3d4f5')} className="w-full bg-purple-900/50 hover:bg-purple-800/60 border border-purple-500/40 text-purple-200 py-2 rounded-lg text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2">
                                        <span>🔗</span> GENERATE VC ACCESS LINK
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {tooltip.visible && !pitchMode && !showPitchDeck && (
                <div style={{ left: tooltip.x + 15, top: tooltip.y + 15 }} className="fixed bg-slate-900/95 border border-slate-700 rounded p-2 pointer-events-none z-50 shadow-xl backdrop-blur-sm hidden md:block">
                    <div className="text-xs font-bold text-white mb-0.5">{tooltip.name}</div>
                    <div className="text-[10px] font-mono text-cyan-400 flex flex-col"><span>Class: {tooltip.ifcType}</span><span>Install: Wk {tooltip.week}</span></div>
                </div>
            )}

            {camMode !== "ORBIT" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-40">
                    <div className="w-12 h-12 md:w-16 md:h-16 border-2 border-white rounded-full"></div>
                    <div className="absolute w-1 h-1 md:w-2 md:h-2 bg-red-500 rounded-full"></div>
                </div>
            )}

            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            
            {/* HIDE HUDs DURING PITCH DECK MODE */}
            {!showPitchDeck && !showPortfolio && (
                <>
                    <div className="hidden sm:block absolute top-3 right-3 bg-slate-900/90 border border-slate-700 p-2 md:p-3 rounded-lg backdrop-blur-md w-56 md:w-72 pointer-events-none shadow-2xl transition-all z-20">
                       <div className="text-[9px] md:text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1 md:mb-2 border-b border-slate-700 pb-1">
                           {isHandover ? "7D Facility Operations" : "6D EVM Analytics"}
                       </div>
                       {isHandover ? (
                           <>
                               <div className="flex justify-between items-center mb-1"><span className="text-[10px] md:text-xs text-slate-400">Campus Occupancy:</span><span className="text-[10px] md:text-xs font-bold font-mono text-cyan-400">{opsData.occupancy}</span></div>
                               <div className="flex justify-between items-center mb-2"><span className="text-[10px] md:text-xs text-slate-400">Grid Power Draw:</span><span className="text-[10px] md:text-xs font-bold font-mono text-amber-400">{opsData.powerMw} MW</span></div>
                           </>
                       ) : (
                           <>
                               <div className="flex justify-between items-center mb-1"><span className="text-[10px] md:text-xs text-slate-400">Planned Value:</span><span className="text-[10px] md:text-xs font-bold font-mono text-slate-300">₹{(evmStatus.PV / 10000000).toFixed(2)}Cr</span></div>
                               <div className="flex justify-between items-center mb-1"><span className="text-[10px] md:text-xs text-slate-400">Earned Value:</span><span className="text-[10px] md:text-xs font-bold font-mono text-emerald-400">₹{(evmStatus.EV / 10000000).toFixed(2)}Cr</span></div>
                           </>
                       )}
                    </div>
                    
                    <div className={`absolute bottom-3 left-3 bg-slate-950/90 border border-slate-800 p-2 md:p-2.5 rounded-lg backdrop-blur-md w-64 md:w-[22rem] h-24 md:h-36 overflow-hidden pointer-events-none flex flex-col justify-end z-20 shadow-2xl transition-opacity duration-300 ${showQuadMax ? "opacity-0" : "opacity-100"}`}>
                      <div className="text-[9px] md:text-[10px] font-bold font-mono text-slate-400 mb-1 flex items-center justify-between border-b border-slate-800 pb-1">
                          <span>MULTI-AGENT HIVE</span>
                          {aiIsNegotiating && <span className="text-[8px] md:text-[9px] text-amber-400 animate-pulse">NEGOTIATING...</span>}
                      </div>
                      <div className="flex flex-col gap-0.5 md:gap-1 justify-end mt-1">
                        {aiLogs.map((log) => (
                          <div key={log.id} className="text-[8px] md:text-[10px] font-mono leading-relaxed truncate"><span className="text-slate-500">[{log.agent}]</span> <span className={log.color}>{log.msg}</span></div>
                        ))}
                      </div>
                    </div>
                </>
            )}

            {showQuadMax && !showPitchDeck && !showPortfolio && (
                <div className="absolute bottom-16 right-4 w-72 md:w-96 bg-slate-900/95 border border-cyan-500/50 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-xl z-30 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
                    <div className="bg-slate-950 px-3 md:px-4 py-2 md:py-3 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div><span className="text-[10px] md:text-xs font-bold text-white tracking-widest uppercase">QuadMax AI Copilot</span></div>
                        <button onClick={() => setShowQuadMax(false)} className="text-slate-500 hover:text-white">✕</button>
                    </div>
                    <div className="p-3 md:p-4 h-48 md:h-64 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
                        {quadMaxHistory.map((msg, i) => (
                            <div key={i} className={`text-[10px] md:text-xs p-2 md:p-2.5 rounded-lg max-w-[85%] ${msg.role === 'user' ? 'bg-cyan-900/40 border border-cyan-500/30 text-cyan-50 self-end rounded-tr-sm' : 'bg-slate-800/60 border border-slate-700 text-slate-300 self-start rounded-tl-sm'}`}>{msg.text}</div>
                        ))}
                    </div>
                    <form onSubmit={handleQuadMaxSubmit} className="p-2 md:p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
                        <input name="qInput" type="text" placeholder="Ask the Digital Twin..." className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 md:py-2 text-[10px] md:text-xs text-white focus:outline-none focus:border-cyan-500" autoComplete="off" />
                        <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1.5 md:px-3 md:py-2 rounded text-[10px] md:text-xs font-bold">→</button>
                    </form>
                </div>
            )}

            {!pitchMode && !showPitchDeck && !showPortfolio && (
                <button onClick={() => setShowQuadMax(!showQuadMax)} className="absolute bottom-4 right-4 z-20 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30 rounded-full px-3 py-1.5 md:px-4 md:py-2 flex items-center gap-2 transition-all hover:scale-105 border border-cyan-400/50">
                    <span className="text-xs md:text-sm">✨</span><span className="text-[10px] md:text-xs font-bold tracking-widest uppercase">QuadMax AI</span>
                </button>
            )}
          </div>
          
        </div>

        {!pitchMode && !vrMode && !showPortfolio && (
          <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col h-[400px] md:h-[540px] overflow-hidden transition-all">
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">Active Selection</div>
            <h3 className="text-sm md:text-base font-bold text-white mb-2 truncate">{selectedEntity.name}</h3>
            <div className="flex border-b border-slate-800 mb-4 overflow-x-auto gap-1 custom-scrollbar pb-1">
              <button onClick={() => setInspectorTab("SUB_COMPS")} className={`px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${inspectorTab === "SUB_COMPS" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500"}`}>Details</button>
              <button onClick={() => setInspectorTab("CDE_DOCS")} className={`px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-wider transition flex items-center gap-1 whitespace-nowrap ${inspectorTab === "CDE_DOCS" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-500"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> CDE Docs
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {inspectorTab === "CDE_DOCS" ? (
                  selectedEntity.cdeDocs && selectedEntity.cdeDocs.length > 0 ? (
                      <div className="flex flex-col gap-3">
                          <div className="text-[9px] md:text-[10px] text-slate-400 italic mb-2">Immutable Document Ledger (WORM Compliant).</div>
                          {selectedEntity.cdeDocs.map(doc => (
                              <div key={doc.id} className="bg-slate-950 border border-slate-800 p-2 md:p-3 rounded-lg flex flex-col gap-2">
                                  <div className="flex justify-between items-start">
                                      <span className="text-[10px] md:text-xs font-bold text-blue-300">{doc.title}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : <div className="text-[10px] md:text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">No CDE Documents attached.</div>
              ) : inspectorTab === "SUB_COMPS" ? (
                <div className="text-[10px] md:text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">Select an element to view linked data.</div>
              ) : null}
            </div>
          </div>
        )}
      </div>
      
      {!pitchMode && !vrMode && !showPortfolio && (
        <div className="bg-slate-900/90 border border-slate-800 p-4 md:p-5 rounded-xl flex flex-col gap-3 md:gap-4 transition-all">
          <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2 md:pb-3">
            <div className="flex items-center gap-2 md:gap-3">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px] md:text-xs">Visual 4D Analyzer:</span>
              <button onClick={() => setIsPlaying4D(!isPlaying4D)} className={`ml-1 md:ml-2 px-2 md:px-3 py-0.5 rounded text-[9px] md:text-[10px] font-bold uppercase transition ${isPlaying4D ? "bg-amber-500 text-slate-900" : "bg-cyan-600 text-white hover:bg-cyan-500"}`}>
                {isPlaying4D ? "⏸ PAUSE" : "▶ PLAY"}
              </button>
            </div>
          </div>
          <input type="range" min="1" max="26" step="1" value={timelineWeek} onChange={(e) => { setTimelineWeek(parseInt(e.target.value, 10)); setIsPlaying4D(false); }} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 mb-1" />
        </div>
      )}
    </div>
  );
}
ENGINE_V40_EOF

echo "✓ Phase 40 Applied: Enterprise Portfolio Matrix & YC AI Pitch Ready."
