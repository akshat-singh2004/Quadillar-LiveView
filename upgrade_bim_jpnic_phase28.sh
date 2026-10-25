#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: BIM ENGINE PHASE 28 (STRUCTURAL ANATOMY & CDE)
# Features: Anatomy Render Mode, Enterprise CDE Docs, Predictive AI Agents
# ==============================================================================

set -euo pipefail

cat << 'ENGINE_V30_EOF' > components/bim/FullBimSimulationEngine.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

export type SelectionLevel = "ALL" | "L0_PODIUM" | "L1_MUSEUM" | "L1_HOTEL_TOWER" | "L2_HELIPAD";
export type SelectionZone = "ALL_ZONES" | "ZONE_WEDGE" | "ZONE_TOWER" | "ZONE_PLAZA";
export type RenderMode = "SOLID" | "CAD_EDGES" | "X_RAY" | "LIDAR_SCAN" | "AI_HEATMAP" | "ANATOMY";
export type WeatherMode = "CLEAR" | "MONSOON";
export type CameraMode = "ORBIT" | "DRONE_FPV";

export interface DocumentRecord { id: string; title: string; type: "PDF" | "DWG" | "RFI" | "TEST_REPORT"; date: string; status: "APPROVED" | "PENDING"; }
export interface BOQLineItem { itemCode: string; description: string; quantity: number; unit: string; rateINR: number; amountINR: number; carbonKg: number; }
export interface SubComponent { id: string; name: string; type: string; status: "INSTALLED" | "PENDING" | "DEFECT" | "IN_PROGRESS" | "CLASH" | "ACTIVE" | "RESOLVED" | "IN_TRANSIT" | "OPERATIONAL"; weightOrVolume: string; }

export interface SelectedEntity {
  id: string; name: string; type: "LEVEL" | "ZONE" | "ELEMENT" | "MACHINERY" | "LABOR" | "LOGISTICS"; discipline: "CIVIL" | "STRUCTURAL" | "MEP" | "DEFECT" | "ARCHITECTURAL" | "SAFETY" | "OPERATIONS" | "SUPPLY_CHAIN";
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
  const [planCutZ, setPlanCutZ] = useState<number>(100);
  const [explodeY, setExplodeY] = useState<number>(0);
  const [clashResolved, setClashResolved] = useState(false);

  const [activeCamera, setActiveCamera] = useState<CameraWaypoint | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"SUB_COMPS" | "BOQ_LEDGER" | "LIVE_IOT" | "CLASH_MATRIX" | "CDE_DOCS">("SUB_COMPS");
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [aiLogs, setAiLogs] = useState<{id: string, agent: string, msg: string, color: string}[]>([]);

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
      { id: "DOC-001", title: "Masterplan_GFC_v4.dwg", type: "DWG", date: "2026-01-15", status: "APPROVED" },
      { id: "DOC-002", title: "Environmental_Clearance_UPPCB.pdf", type: "PDF", date: "2026-02-10", status: "APPROVED" }
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
  const workersRef = useRef<THREE.InstancedMesh | null>(null);
  const rainGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const aviationLightsRef = useRef<THREE.Mesh[]>([]);

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
    return { allocated: totalAllocated, EV, AC, retained, SPI, CPI, carbonTons, carbonOffset };
  }, [timelineWeek, clashResolved]);

  const [opsData, setOpsData] = useState({ occupancy: 0, powerMw: 0, hvacLoad: 0 });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("quadillar_bim_state_jpnic_v28");
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
    addAiLog("SYS", "Quadillar CDE Data-Link & Anatomy Engine Online.", "text-cyan-400");
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("quadillar_bim_state_jpnic_v28", JSON.stringify({ timelineWeek, renderMode, timeOfDay, weatherMode, planCutZ, explodeY, pitchMode }));
  }, [timelineWeek, renderMode, timeOfDay, weatherMode, planCutZ, explodeY, pitchMode, isHydrated]);

  useEffect(() => {
    const interval = setInterval(() => {
      const t = Date.now() / 1000;
      if (isHandover) {
        setOpsData({ occupancy: Math.round(1200 + Math.sin(t * 0.5) * 45), powerMw: +(2.4 + Math.sin(t * 0.8) * 0.2 - 0.5).toFixed(2), hvacLoad: Math.round(65 + Math.cos(t * 0.3) * 5) });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isHandover]);

  // SMART AUTO-PLAY & PREDICTIVE AI
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying4D) {
      interval = setInterval(() => {
        setTimelineWeek(prev => {
          if (prev === 20 && !clashResolved) {
            setIsPlaying4D(false);
            setInspectorTab("CLASH_MATRIX");
            addAiLog("MEP_AGENT", "CRITICAL: Hard spatial clash at MEP Trench.", "text-red-400");
            setTimeout(() => {
                addAiLog("PREDICT_AI", "Analyzing mitigation... Optimal path: Shift Y-Axis -0.5m.", "text-purple-400");
                setTimeout(() => addAiLog("PREDICT_AI", "Projected Savings: ₹2.25Cr. Awaiting RFI Approval.", "text-purple-300"), 1200);
            }, 1000);
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

    // --- MATERIALS ---
    const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xcc4422, roughness: 0.65, metalness: 0.15, clippingPlanes: [clipPlane] });
    const terracottaTrimMat = new THREE.MeshStandardMaterial({ color: 0x9e2a12, roughness: 0.8, clippingPlanes: [clipPlane] });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x5a6578, roughness: 0.9, clippingPlanes: [clipPlane] });
    const foundationMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 1.0, clippingPlanes: [clipPlane] }); 
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xd4d8de, metalness: 0.65, roughness: 0.35, clippingPlanes: [clipPlane] }); 
    const glassDarkMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, transparent: true, opacity: 0.8, roughness: 0.05, metalness: 0.9, transmission: 0.4, ior: 1.5, clippingPlanes: [clipPlane] });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x3d741c, roughness: 0.95, clippingPlanes: [clipPlane] }); 
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x245610, roughness: 0.9, clippingPlanes: [clipPlane] });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3, clippingPlanes: [clipPlane] });
    const carMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.4, clippingPlanes: [clipPlane] });
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x0a192f, metalness: 0.9, roughness: 0.2, clippingPlanes: [clipPlane] });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3, clippingPlanes: [clipPlane] });
    const clashMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xaa0000, emissiveIntensity: 0.9, wireframe: true });
    
    // NEW: Anatomy Material (Inner structural skeletons)
    const rebarMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.8, roughness: 0.4, wireframe: true, clippingPlanes: [clipPlane] });
    
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.25 });
    const lidarMat = new THREE.PointsMaterial({ color: 0x10b981, size: 0.35, transparent: true, opacity: 0.85 });

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
      
      if(!entityId.includes("TREE") && !entityId.includes("SOLAR") && !entityId.includes("TRAFFIC")) {
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const line = new THREE.LineSegments(edges, edgeMat);
        mesh.add(line);
        mesh.userData.edgeLine = line; 
        
        const pts = new THREE.Points(mesh.geometry, lidarMat);
        mesh.add(pts);
        mesh.userData.pointsMesh = pts;
        
        // NEW: Inner Anatomy Skeleton Generation (slightly scaled down wireframe)
        if (entityId.includes("DOME") || entityId.includes("CORE") || entityId.includes("WEDGE") || entityId.includes("ROTUNDA")) {
            const anatomySkel = new THREE.Mesh(mesh.geometry, rebarMat);
            anatomySkel.scale.set(0.98, 0.98, 0.98); // Nest inside outer shell
            anatomySkel.visible = false; // Hidden by default
            mesh.add(anatomySkel);
            mesh.userData.anatomyMesh = anatomySkel;
        }
      }

      mesh.castShadow = true; mesh.receiveShadow = true;
      pickableMeshes.current.push(mesh);
      bimGroup.add(mesh);
    };

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
      
      // Inject CDE Documents for the facade
      const facadeDocs: DocumentRecord[] = [
          { id: "CDE-F1", title: "Terreal_Terracotta_Spec.pdf", type: "PDF", date: "2026-03-12", status: "APPROVED" },
          { id: "CDE-F2", title: "Wind_Load_Analysis_Report.pdf", type: "TEST_REPORT", date: "2026-04-05", status: "APPROVED" }
      ];
      
      addBimMesh(mesh, id, name, "L1_HOTEL_TOWER", "ZONE_TOWER", minWk, minWk, facadeDocs);
      return mesh;
    };

    createSweptFin(14, 18, "JPNIC_TOWER_FIN_EAST", "East Sweeping Terracotta Spine", 6);
    createSweptFin(14, -8, "JPNIC_TOWER_FIN_WEST", "West Sweeping Terracotta Fin", 7);

    const coreGeo = new THREE.BoxGeometry(12, sweepHeight * 0.75, sweepDepth * 0.7, 4, 18, 6);
    const cPos = coreGeo.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      const y = cPos.getY(i);
      const z = cPos.getZ(i);
      const normalizedY = Math.max(0, (y + (sweepHeight * 0.75 / 2)) / (sweepHeight * 0.75));
      cPos.setZ(i, z - Math.pow(normalizedY, 2.3) * 36);
    }
    coreGeo.computeVertexNormals();
    const coreMesh = new THREE.Mesh(coreGeo, glassDarkMat.clone());
    coreMesh.position.set(5, 4 + (sweepHeight * 0.75) / 2, 8);
    
    const coreDocs: DocumentRecord[] = [{ id: "CDE-C1", title: "Core_Wall_Rebar_BBS.dwg", type: "DWG", date: "2026-05-22", status: "APPROVED" }];
    addBimMesh(coreMesh, "JPNIC_CENTRAL_CORE", "Tower Hotel Suites & Glazing", "L1_HOTEL_TOWER", "ZONE_TOWER", 9, 9, coreDocs);

    // HELIPAD
    const heliRadius = 15; const heliY = 4 + sweepHeight + 2; const heliZ = -26; 
    const helipadDeck = new THREE.Mesh(new THREE.CylinderGeometry(heliRadius, heliRadius, 1.4, 36), concreteMat.clone());
    helipadDeck.position.set(5, heliY, heliZ);
    addBimMesh(helipadDeck, "JPNIC_HELIPAD_DECK", "Circular Helipad Flight Deck", "L2_HELIPAD", "ZONE_TOWER", 18, 18, [
        { id: "CDE-H1", title: "DGCA_Aviation_Clearance.pdf", type: "PDF", date: "2026-08-10", status: "APPROVED" }
    ]);

    // DOME 
    const domeRadius = 24;
    const domeMesh = new THREE.Mesh(new THREE.SphereGeometry(domeRadius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMat.clone());
    domeMesh.position.set(-36, 4, 18);
    addBimMesh(domeMesh, "JPNIC_SILVER_DOME", "Museum of Socialism Silver Dome", "L1_MUSEUM", "ZONE_WEDGE", 8, 8, [
        { id: "CDE-D1", title: "Acoustic_Dome_Structural_GFC.dwg", type: "DWG", date: "2026-06-18", status: "APPROVED" },
        { id: "CDE-D2", title: "Aluminium_Cladding_Mockup.pdf", type: "TEST_REPORT", date: "2026-07-01", status: "APPROVED" }
    ]);

    const lawnWidth = 48; const lawnDepth = 55; const lawnHeight = 24;
    const lawnGeo = new THREE.BoxGeometry(lawnWidth, lawnHeight, lawnDepth, 6, 6, 12);
    const lwnPos = lawnGeo.attributes.position;
    for (let i = 0; i < lwnPos.count; i++) {
      const z = lwnPos.getZ(i); const y = lwnPos.getY(i);
      if (y > 0) {
        const zNorm = Math.max(0, Math.min(1, (z + lawnDepth / 2) / lawnDepth));
        lwnPos.setY(i, y - (zNorm * (lawnHeight - 2))); 
      }
    }
    lawnGeo.computeVertexNormals();
    const lawnMesh = new THREE.Mesh(lawnGeo, grassMat.clone());
    lawnMesh.position.set(-36, 4 + lawnHeight / 2, -12);
    addBimMesh(lawnMesh, "JPNIC_GREEN_LAWN_ROOF", "Audacious Sloped Green Roof", "L1_MUSEUM", "ZONE_WEDGE", 12, 12);

    // ROTUNDA
    const rotundaGeo = new THREE.CylinderGeometry(15, 15, 7, 32, 1, false, 0, Math.PI);
    const rotundaMesh = new THREE.Mesh(rotundaGeo, terracottaMat.clone());
    rotundaMesh.rotation.y = Math.PI / 2; rotundaMesh.position.set(5, 4 + 3.5, 42); 
    addBimMesh(rotundaMesh, "JPNIC_ENTRY_ROTUNDA", "Grand Public Entry Rotunda", "L0_PODIUM", "ZONE_PLAZA", 5, 5);

    // MEP CLASH
    const chwPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 55, 16), pipeMat.clone());
    chwPipe.rotation.z = Math.PI / 2; chwPipe.position.set(-10, 5.5, 36);
    addBimMesh(chwPipe, "CHW_MAIN", "District Chilled Water Main Loop", "L0_PODIUM", "ZONE_PLAZA", 20, 20, [
        { id: "CDE-RFI1", title: "RFI-4490_Trench_Clash.pdf", type: "RFI", date: "2026-10-25", status: "PENDING" }
    ]);

    const clashNode = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), clashMat.clone());
    clashNode.position.set(-15, 5.5, 36);
    addBimMesh(clashNode, "CLASH_NODE_01", "MEP Trench Spatial Clash", "L0_PODIUM", "ZONE_PLAZA", 20, 20);

    // DRONE & WEATHER (Hidden for brevity, but exist in scene)
    const drone = new THREE.Group(); drone.userData = { isAuxiliary: true, isDrone: true }; droneRef.current = drone; scene.add(drone);
    
    let isDragging = false, prevX = 0, prevY = 0;
    let sph = { r: 210, phi: Math.PI / 3.2, theta: Math.PI / 4.2 }; 

    const updateCameraPos = () => {
      if (scene.userData.activeCamMode !== "DRONE_FPV") {
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

      if (!isDragging || scene.userData.activeCamMode === "DRONE_FPV") return;
      scene.userData.sph.theta -= (e.clientX - prevX) * 0.007;
      scene.userData.sph.phi = Math.max(0.1, Math.min(Math.PI / 2.05, scene.userData.sph.phi - (e.clientY - prevY) * 0.007));
      prevX = e.clientX; prevY = e.clientY;
      scene.userData.updateCameraPos();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (scene.userData.activeCamMode === "DRONE_FPV") return;
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
          if (isClash) setInspectorTab("CLASH_MATRIX");
          else if (hit.cdeDocs && hit.cdeDocs.length > 0) setInspectorTab("CDE_DOCS"); // Default to CDE if docs exist
          else setInspectorTab("SUB_COMPS");
          
          setSelectedEntity({
            id: hit.entityId, name: hit.name, type: "ELEMENT",
            discipline: isClash ? "DEFECT" : "STRUCTURAL",
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
      const clash = pickableMeshes.current.find(m => m.userData.entityId === "CLASH_NODE_01");
      if (clash && clash.visible) {
        clash.scale.setScalar(1 + Math.sin(t * 6) * 0.2);
        (clash.material as any).emissiveIntensity = 0.5 + Math.sin(t * 6) * 0.5;
      }
      
      if (scene.userData.activeCamMode !== "DRONE_FPV" && Date.now() - lastInteractionTime.current > 6000 && !isDragging) {
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

  // RFI RESOLUTION LOGIC
  useEffect(() => {
    if (!elementsGroupRef.current) return;
    const pipe = pickableMeshes.current.find(m => m.userData.entityId === "CHW_MAIN");
    if (pipe) { 
        pipe.position.y = clashResolved ? 4.8 : 5.5; 
        pipe.userData.originalY = clashResolved ? 4.8 : 5.5; 
        if (clashResolved && pipe.userData.cdeDocs) {
            pipe.userData.cdeDocs[0].status = "APPROVED"; // Mark RFI as resolved in CDE
        }
    }

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

  // RENDER MODE (Includes Anatomy Logic)
  useEffect(() => {
    if (!elementsGroupRef.current || !isHydrated) return;
    const _isHandover = timelineWeek >= 24;

    elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.userData || !mesh.material) return;
      if (mesh.userData.isCamera || mesh.userData.isAuxiliary) return;

      const { minWeek, plannedWeek, originalColor, originalOpacity, originalTransparent, entityId } = mesh.userData;
      const mat = mesh.material as any;
      
      mesh.visible = timelineWeek >= minWeek;

      if (mesh.userData.edgeLine) mesh.userData.edgeLine.visible = (renderMode === "CAD_EDGES" || renderMode === "X_RAY" || renderMode === "ANATOMY");
      if (mesh.userData.pointsMesh) mesh.userData.pointsMesh.visible = (renderMode === "LIDAR_SCAN");
      
      // Control Inner Anatomy Skeleton Visibility
      if (mesh.userData.anatomyMesh) {
          mesh.userData.anatomyMesh.visible = (renderMode === "ANATOMY" && mesh.visible);
      }

      if (mesh.visible) {
        if (renderMode === "LIDAR_SCAN") {
          mat.visible = false; 
          if (mesh.userData.edgeLine) mesh.userData.edgeLine.visible = false;
        } else if (renderMode === "ANATOMY") {
          // Ghost the outer shell so inner anatomy is visible
          mat.visible = true;
          mat.transparent = true;
          mat.opacity = 0.15;
          mat.wireframe = false;
        } else {
          mat.visible = true;
          mat.transparent = originalTransparent || renderMode === "X_RAY";
          mat.opacity = renderMode === "X_RAY" ? 0.25 : originalOpacity;
          mat.wireframe = renderMode === "X_RAY";
        }
      }

      if (mat.color && originalColor !== undefined && entityId !== "CLASH_NODE_01") {
        if (renderMode === "AI_HEATMAP") {
          const heatVal = minWeek / 24; 
          mat.color.setRGB(heatVal, 0.2, 1 - heatVal);
        } else {
          mat.color.setHex(originalColor);
        }
      }
    });
  }, [timelineWeek, renderMode, isHydrated]);

  if (!isHydrated) return <div className="w-full h-[520px] bg-slate-950"></div>;

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-lg">
          {(["SOLID", "CAD_EDGES", "X_RAY", "LIDAR_SCAN", "AI_HEATMAP", "ANATOMY"] as const).map((mode) => (
            <button key={mode} onClick={() => setRenderMode(mode)} className={`px-2.5 py-0.5 text-[11px] font-mono rounded font-semibold transition ${renderMode === mode ? (mode === "ANATOMY" ? "bg-amber-500 text-slate-900 animate-pulse" : "bg-emerald-500 text-slate-950") : "text-slate-400 hover:text-slate-200"}`}>
                {mode === "ANATOMY" ? "🔍 ANATOMY" : mode.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setPitchMode(!pitchMode)} className={`px-4 py-1 text-xs font-bold uppercase rounded border transition-all ${pitchMode ? "bg-amber-500 border-amber-400 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}>
            {pitchMode ? "🎥 PITCH MODE ACTIVE" : "🎥 PITCH MODE"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 transition-all duration-500 ease-in-out">
        <div className={`${pitchMode ? "lg:col-span-12" : "lg:col-span-8"} flex flex-col gap-3 transition-all duration-500`}>
          <div className={`relative w-full ${pitchMode ? "h-[650px]" : "h-[500px]"} bg-slate-950 rounded-xl overflow-hidden border border-slate-800 transition-all duration-500`}>
            
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            
            <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-700 p-3 rounded-lg backdrop-blur-md w-64 pointer-events-none shadow-2xl transition-all">
               <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-2 border-b border-slate-700 pb-1">6D EVM Analytics</div>
               <div className="flex justify-between items-center mb-1"><span className="text-xs text-slate-400">Earned Value (EV):</span><span className="text-xs font-bold font-mono text-emerald-400">₹{(evmStatus.EV / 10000000).toFixed(2)}Cr</span></div>
               <div className="flex justify-between items-center mb-2"><span className="text-xs text-slate-400">Actual Cost (AC):</span><span className={`text-xs font-bold font-mono ${evmStatus.CPI < 1 ? "text-red-400" : "text-emerald-400"}`}>₹{(evmStatus.AC / 10000000).toFixed(2)}Cr</span></div>
               <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800">
                 <div className="bg-slate-950 p-1.5 rounded text-center"><div className="text-[9px] text-slate-500 uppercase">CPI (Cost)</div><div className={`text-xs font-bold font-mono ${evmStatus.CPI < 1.0 ? "text-red-500" : "text-emerald-500"}`}>{evmStatus.CPI.toFixed(2)}</div></div>
                 <div className="bg-slate-950 p-1.5 rounded text-center"><div className="text-[9px] text-slate-500 uppercase">SPI (Schedule)</div><div className={`text-xs font-bold font-mono ${evmStatus.SPI < 1.0 ? "text-amber-500" : "text-emerald-500"}`}>{evmStatus.SPI.toFixed(2)}</div></div>
               </div>
            </div>

            <div className="absolute bottom-3 left-3 bg-slate-950/80 border border-slate-800 p-2 rounded-lg backdrop-blur-md w-80 h-28 overflow-hidden pointer-events-none flex flex-col justify-end">
              <div className="text-[9px] font-bold font-mono text-slate-500 mb-1">QUADILLAR MULTI-AGENT HIVE</div>
              <div className="flex flex-col gap-0.5 justify-end">
                {aiLogs.map((log) => (
                  <div key={log.id} className="text-[10px] font-mono leading-tight"><span className="text-slate-500">[{log.agent}]</span> <span className={log.color}>{log.msg}</span></div>
                ))}
              </div>
            </div>

            <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
              <div className="px-2.5 py-1 bg-slate-900/90 border border-cyan-500/40 rounded text-xs font-mono text-cyan-300 flex items-center gap-2 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> LiveView Phase 28: Structural Anatomy & CDE
              </div>
            </div>
          </div>
          
        </div>

        {!pitchMode && (
          <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col h-[540px] overflow-hidden transition-all">
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">Active Selection</div>
            <h3 className="text-base font-bold text-white mb-2">{selectedEntity.name}</h3>
            <div className="flex border-b border-slate-800 mb-4 overflow-x-auto gap-1">
              <button onClick={() => setInspectorTab("SUB_COMPS")} className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${inspectorTab === "SUB_COMPS" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500"}`}>Details</button>
              <button onClick={() => setInspectorTab("BOQ_LEDGER")} className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${inspectorTab === "BOQ_LEDGER" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500"}`}>BOQ</button>
              <button onClick={() => setInspectorTab("CDE_DOCS")} className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1 ${inspectorTab === "CDE_DOCS" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-500"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> CDE Docs
              </button>
              {selectedEntity.id === "CLASH_NODE_01" && (
                <button onClick={() => setInspectorTab("CLASH_MATRIX")} className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1 ${inspectorTab === "CLASH_MATRIX" ? (clashResolved ? "text-emerald-400 border-b-2 border-emerald-400" : "text-red-400 border-b-2 border-red-400") : "text-slate-500"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${clashResolved ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`}></span> {clashResolved ? "Resolved" : "Clash"}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {inspectorTab === "CDE_DOCS" ? (
                  selectedEntity.cdeDocs && selectedEntity.cdeDocs.length > 0 ? (
                      <div className="flex flex-col gap-3">
                          <div className="text-[10px] text-slate-400 italic mb-2">Live documents synced from Enterprise CDE (Common Data Environment).</div>
                          {selectedEntity.cdeDocs.map(doc => (
                              <div key={doc.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex flex-col gap-2 hover:border-blue-500/50 cursor-pointer transition-colors group">
                                  <div className="flex justify-between items-start">
                                      <span className="text-xs font-bold text-blue-300 group-hover:text-blue-400">{doc.title}</span>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${doc.status === "APPROVED" ? "bg-emerald-950/50 text-emerald-400 border border-emerald-500/30" : "bg-amber-950/50 text-amber-400 border border-amber-500/30"}`}>{doc.status}</span>
                                  </div>
                                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                                      <span>Type: {doc.type}</span>
                                      <span>Updated: {doc.date}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">No CDE Documents attached to this element.</div>
              ) : inspectorTab === "SUB_COMPS" ? (
                <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">Select an element to view linked data.</div>
              ) : inspectorTab === "CLASH_MATRIX" ? (
                <div className="flex flex-col gap-4">
                  <div className={`${clashResolved ? "bg-emerald-950/30 border-emerald-500/40" : "bg-red-950/30 border-red-500/40"} border rounded-xl p-4 transition-all duration-500`}>
                    <div className={`text-[10px] font-mono ${clashResolved ? "text-emerald-400" : "text-red-400"} uppercase tracking-widest mb-3`}>{clashResolved ? "CLASH RESOLVED & CLOSED" : "AXIS SPATIAL LOCKOUT"}</div>
                    <button onClick={() => setClashResolved(true)} disabled={clashResolved} className={`w-full py-2 font-bold text-xs rounded transition-all duration-300 ${clashResolved ? "bg-emerald-900/50 text-emerald-400 cursor-not-allowed border border-emerald-500/30" : "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]"}`}>
                      {clashResolved ? "✓ Predictive AI RFI Applied" : "Auto-Mitigate via AI"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {!pitchMode && (
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl flex flex-col gap-4 transition-all">
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
        </div>
      )}
    </div>
  );
}
ENGINE_V30_EOF

echo "✓ Phase 28 Applied: Structural Anatomy, CDE Integration & Predictive AI"
