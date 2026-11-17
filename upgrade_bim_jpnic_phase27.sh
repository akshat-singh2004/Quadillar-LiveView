#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: BIM ENGINE PHASE 27 (INVESTOR POLISH)
# Adds: 24-Hour Solar Simulation, First-Person Drone FPV, Aviation Beacons
# ==============================================================================

set -euo pipefail

cat << 'ENGINE_V29_EOF' > components/bim/FullBimSimulationEngine.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

export type SelectionLevel = "ALL" | "L0_PODIUM" | "L1_MUSEUM" | "L1_HOTEL_TOWER" | "L2_HELIPAD";
export type SelectionZone = "ALL_ZONES" | "ZONE_WEDGE" | "ZONE_TOWER" | "ZONE_PLAZA";
export type RenderMode = "SOLID" | "CAD_EDGES" | "X_RAY" | "LIDAR_SCAN" | "AI_HEATMAP";
export type WeatherMode = "CLEAR" | "MONSOON";
export type CameraMode = "ORBIT" | "DRONE_FPV";

export interface BOQLineItem { itemCode: string; description: string; quantity: number; unit: string; rateINR: number; amountINR: number; carbonKg: number; }
export interface SubComponent { id: string; name: string; type: string; status: "INSTALLED" | "PENDING" | "DEFECT" | "IN_PROGRESS" | "CLASH" | "ACTIVE" | "RESOLVED" | "IN_TRANSIT" | "OPERATIONAL"; weightOrVolume: string; }

export interface SelectedEntity {
  id: string; name: string; type: "LEVEL" | "ZONE" | "ELEMENT" | "MACHINERY" | "LABOR" | "LOGISTICS"; discipline: "CIVIL" | "STRUCTURAL" | "MEP" | "DEFECT" | "ARCHITECTURAL" | "SAFETY" | "OPERATIONS" | "SUPPLY_CHAIN";
  parentLevel: SelectionLevel; parentZone: SelectionZone; subComponents: SubComponent[]; boqItems: BOQLineItem[];
}

export interface CameraWaypoint { id: string; name: string; position: [number, number, number]; type: "CCTV_FIXED" | "DRONE_PHOTOGRAMMETRY" | "UG_SENSOR"; latestCapture: { timestamp: string; sha256: string; verifiedDeviationMm: number; }; }

export default function FullBimSimulationEngine() {
  const mountRef = useRef<HTMLDivElement>(null);

  const [isHydrated, setIsHydrated] = useState(false);
  const [timelineWeek, setTimelineWeek] = useState<number>(24);
  const [isPlaying4D, setIsPlaying4D] = useState(false);
  const [timelineMode, setTimelineMode] = useState<"ACTUAL" | "PLANNED" | "VARIANCE">("ACTUAL");
  
  // NEW: 24-Hour Time of Day (0.0 to 24.0)
  const [timeOfDay, setTimeOfDay] = useState<number>(14); 
  
  const [renderMode, setRenderMode] = useState<RenderMode>("SOLID");
  const [weatherMode, setWeatherMode] = useState<WeatherMode>("CLEAR");
  const [camMode, setCamMode] = useState<CameraMode>("ORBIT");
  
  const [pitchMode, setPitchMode] = useState<boolean>(false);
  const [planCutZ, setPlanCutZ] = useState<number>(100);
  const [explodeY, setExplodeY] = useState<number>(0);
  const [clashResolved, setClashResolved] = useState(false);

  const [activeCamera, setActiveCamera] = useState<CameraWaypoint | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"SUB_COMPS" | "BOQ_LEDGER" | "LIVE_IOT" | "CLASH_MATRIX">("SUB_COMPS");
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
      const saved = localStorage.getItem("quadillar_bim_state_jpnic_v27");
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
    addAiLog("SYS", "Dynamic Solar Env & FPV Subsystems Online.", "text-cyan-400");
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("quadillar_bim_state_jpnic_v27", JSON.stringify({ timelineWeek, renderMode, timeOfDay, weatherMode, planCutZ, explodeY, pitchMode }));
  }, [timelineWeek, renderMode, timeOfDay, weatherMode, planCutZ, explodeY, pitchMode, isHydrated]);

  useEffect(() => {
    const interval = setInterval(() => {
      const t = Date.now() / 1000;
      if (isHandover) {
        setOpsData({
            occupancy: Math.round(1200 + Math.sin(t * 0.5) * 45),
            powerMw: +(2.4 + Math.sin(t * 0.8) * 0.2 - 0.5).toFixed(2), 
            hvacLoad: Math.round(65 + Math.cos(t * 0.3) * 5)
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isHandover]);

  // --- 3D SCENE INITIALIZATION ---
  useEffect(() => {
    if (!isHydrated) return;
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x87CEEB); // Default sky blue
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
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3, clippingPlanes: [clipPlane] });
    const carMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.4, clippingPlanes: [clipPlane] });
    
    const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x0284c7, transparent: true, opacity: 0.85, transmission: 0.2, roughness: 0.05, metalness: 0.1, clippingPlanes: [clipPlane] });
    const waterBaseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 1 });

    const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.25 });
    const lidarMat = new THREE.PointsMaterial({ color: 0x10b981, size: 0.35, transparent: true, opacity: 0.85 });

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
      
      if(!entityId.includes("TREE") && !entityId.includes("SOLAR") && !entityId.includes("TRAFFIC")) {
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

    // SUBTERRANEAN
    const pileCount = 144;
    const pileGeo = new THREE.CylinderGeometry(0.5, 0.5, 14, 8);
    const pileMesh = new THREE.InstancedMesh(pileGeo, foundationMat, pileCount);
    const dummy = new THREE.Object3D();
    let pIdx = 0;
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            dummy.position.set(10 + c*4, -7, -25 + r*4); 
            dummy.updateMatrix();
            pileMesh.setMatrixAt(pIdx++, dummy.matrix);
        }
    }
    for(let r=0; r<10; r++) {
        for(let c=0; c<8; c++) {
            dummy.position.set(-45 + c*4, -7, -15 + r*4);
            dummy.updateMatrix();
            pileMesh.setMatrixAt(pIdx++, dummy.matrix);
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

    const waterBase = new THREE.Mesh(new THREE.BoxGeometry(60, 0.4, 30), waterBaseMat);
    waterBase.position.set(20, 4.2, 25);
    scene.add(waterBase);
    const waterGeo = new THREE.BoxGeometry(60, 0.2, 30);
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(20, 4.4, 25);
    addBimMesh(waterMesh, "JPNIC_WATER", "Reflecting Pool", "L0_PODIUM", "ZONE_PLAZA", 22, 22);

    // SWEEPING SPINE
    const sweepHeight = 90;
    const sweepDepth = 75;
    const createSweptFin = (finWidth: number, offsetX: number, id: string, name: string, minWk: number) => {
      const geo = new THREE.BoxGeometry(finWidth, sweepHeight, sweepDepth, 6, 24, 10);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const normalizedY = Math.max(0, Math.min(1, (y + (sweepHeight / 2)) / sweepHeight));
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

    // AVIATION LIGHTS (Red Blinking LEDs)
    const avLightGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const avLightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const beacon1 = new THREE.Mesh(avLightGeo, avLightMat);
    beacon1.position.set(18, 4 + sweepHeight + 1, 8 - 48); // Top of East Fin
    const beacon2 = new THREE.Mesh(avLightGeo, avLightMat);
    beacon2.position.set(-8, 4 + sweepHeight + 1, 8 - 48); // Top of West Fin
    const beacon3 = new THREE.Mesh(avLightGeo, avLightMat);
    beacon3.position.set(5, 4 + sweepHeight + 3.5, -26); // Top of Helipad
    
    [beacon1, beacon2, beacon3].forEach(b => {
        b.userData = { isAviationLight: true, level: "L2_HELIPAD" };
        bimGroup.add(b);
        aviationLightsRef.current.push(b);
    });

    const coreGeo = new THREE.BoxGeometry(12, sweepHeight * 0.75, sweepDepth * 0.7, 4, 18, 6);
    const cPos = coreGeo.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      const y = cPos.getY(i);
      const z = cPos.getZ(i);
      const normalizedY = Math.max(0, Math.min(1, (y + (sweepHeight * 0.75 / 2)) / (sweepHeight * 0.75)));
      cPos.setZ(i, z - Math.pow(normalizedY, 2.3) * 36);
    }
    coreGeo.computeVertexNormals();
    const coreMesh = new THREE.Mesh(coreGeo, glassDarkMat.clone());
    coreMesh.position.set(5, 4 + (sweepHeight * 0.75) / 2, 8);
    addBimMesh(coreMesh, "JPNIC_CENTRAL_CORE", "Tower Hotel Suites & Glazing", "L1_HOTEL_TOWER", "ZONE_TOWER", 9, 9);

    for (let r = 0; r < 5; r++) {
      const bandY = 20 + r * 13;
      const band = new THREE.Mesh(new THREE.BoxGeometry(42, 1.2, sweepDepth * 0.85), terracottaTrimMat.clone());
      const bandNormY = Math.max(0, Math.min(1, bandY / sweepHeight));
      band.position.set(5, bandY, 8 - Math.pow(bandNormY, 2.3) * 38);
      addBimMesh(band, `JPNIC_FIN_REVEAL_${r}`, `Spine Articulation Band L${r + 1}`, "L1_HOTEL_TOWER", "ZONE_TOWER", 11 + r, 11 + r);
    }

    // HELIPAD
    const heliRadius = 15;
    const heliY = 4 + sweepHeight + 2;
    const heliZ = -26; 
    const helipadDeck = new THREE.Mesh(new THREE.CylinderGeometry(heliRadius, heliRadius, 1.4, 36), concreteMat.clone());
    helipadDeck.position.set(5, heliY, heliZ);
    addBimMesh(helipadDeck, "JPNIC_HELIPAD_DECK", "Circular Helipad Flight Deck", "L2_HELIPAD", "ZONE_TOWER", 18, 18);

    const heliCollar = new THREE.Mesh(new THREE.CylinderGeometry(7, 9, 8, 24), steelMat.clone());
    heliCollar.position.set(5, heliY - 4.5, heliZ);
    addBimMesh(heliCollar, "JPNIC_HELI_PEDESTAL", "Helipad Cantilever Collar", "L2_HELIPAD", "ZONE_TOWER", 17, 17);

    for (let a = 0; a < 6; a++) {
      const angle = (a * Math.PI) / 3;
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 12), steelMat.clone());
      strut.position.set(5 + Math.cos(angle) * 7, heliY - 3, heliZ + Math.sin(angle) * 7);
      strut.rotation.z = Math.cos(angle) * 0.55;
      strut.rotation.x = Math.sin(angle) * 0.55;
      addBimMesh(strut, `JPNIC_HELI_STRUT_${a}`, `Radial Support Strut #${a + 1}`, "L2_HELIPAD", "ZONE_TOWER", 17, 17);
    }

    // DOME & ROOF
    const domeRadius = 24;
    const domeMesh = new THREE.Mesh(new THREE.SphereGeometry(domeRadius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMat.clone());
    domeMesh.position.set(-36, 4, 18);
    addBimMesh(domeMesh, "JPNIC_SILVER_DOME", "Museum of Socialism Silver Dome", "L1_MUSEUM", "ZONE_WEDGE", 8, 8);

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

    for (let step = 0; step < 7; step++) {
      const stepY = 8 + step * 2.2; const stepZ = 8 - step * 4.5;
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(lawnWidth * 0.75, 1.2, 3.2), terracottaTrimMat.clone());
      stepMesh.position.set(-36, stepY, stepZ);
      addBimMesh(stepMesh, `JPNIC_ROOF_STEP_${step}`, `Roof Amphitheater Tier #${step + 1}`, "L1_MUSEUM", "ZONE_WEDGE", 13 + Math.floor(step / 2), 13 + Math.floor(step / 2));
    }

    // ROTUNDA
    const rotundaGeo = new THREE.CylinderGeometry(15, 15, 7, 32, 1, false, 0, Math.PI);
    const rotundaMesh = new THREE.Mesh(rotundaGeo, terracottaMat.clone());
    rotundaMesh.rotation.y = Math.PI / 2;
    rotundaMesh.position.set(5, 4 + 3.5, 42); 
    addBimMesh(rotundaMesh, "JPNIC_ENTRY_ROTUNDA", "Grand Public Entry Rotunda", "L0_PODIUM", "ZONE_PLAZA", 5, 5);
    const rotundaGlass = new THREE.Mesh(new THREE.CylinderGeometry(14.5, 14.5, 5.5, 32, 1, false, 0, Math.PI), glassDarkMat.clone());
    rotundaGlass.rotation.y = Math.PI / 2; rotundaGlass.position.set(5, 4 + 3.5, 42.2);
    addBimMesh(rotundaGlass, "JPNIC_ROTUNDA_GLZ", "Entry Rotunda Glazing", "L0_PODIUM", "ZONE_PLAZA", 7, 7);

    // GOMTI NAGAR TRAFFIC
    const carCount = 20;
    const trafficSwarm = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 1.2, 4), carMat, carCount);
    const tData = [];
    for(let i=0; i<carCount; i++) {
        const speed = 0.5 + Math.random() * 0.5;
        const dir = Math.random() > 0.5 ? 1 : -1;
        const zOff = dir === 1 ? 65 : 72; 
        const x = (Math.random() - 0.5) * 300;
        tData.push({ x, speed, zOff, dir });
        dummy.position.set(x, 0.6, zOff);
        dummy.rotation.y = dir === 1 ? 0 : Math.PI;
        dummy.updateMatrix();
        trafficSwarm.setMatrixAt(i, dummy.matrix);
        const colors = [0xe2e8f0, 0x1e293b, 0xdc2626, 0x2563eb, 0x475569];
        trafficSwarm.setColorAt(i, new THREE.Color(colors[Math.floor(Math.random() * colors.length)]));
    }
    if(trafficSwarm.instanceColor) trafficSwarm.instanceColor.needsUpdate = true;
    trafficSwarm.userData = { entityId: "GOMTI_TRAFFIC", name: "Live Gomti Nagar Traffic Feed", level: "L0_PODIUM", minWeek: 1 };
    trafficRef.current = trafficSwarm;
    trafficData.current = tData;
    pickableMeshes.current.push(trafficSwarm as any);
    scene.add(trafficSwarm);

    // AUTONOMOUS DRONE
    const drone = new THREE.Group();
    const droneBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 1.5), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    // Add glowing green lights to drone
    const dLight = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    dLight.position.set(0, 0.3, -0.8);
    drone.add(droneBody, dLight);
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

    let isDragging = false, prevX = 0, prevY = 0;
    let sph = { r: 210, phi: Math.PI / 3.2, theta: Math.PI / 4.2 }; 

    const updateCameraPos = () => {
      // In ORBIT mode, control the camera spherically
      if (scene.userData.activeCamMode !== "DRONE_FPV") {
          camera.position.x = sph.r * Math.sin(sph.phi) * Math.sin(sph.theta);
          camera.position.y = sph.r * Math.cos(sph.phi);
          camera.position.z = sph.r * Math.sin(sph.phi) * Math.cos(sph.theta);
          camera.lookAt(-5, 32, 0); 
      }
    };
    updateCameraPos();
    // Expose for access inside events
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
      prevX = e.clientX;
      prevY = e.clientY;
      scene.userData.updateCameraPos();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (scene.userData.activeCamMode === "DRONE_FPV") return;
      lastInteractionTime.current = Date.now();
      scene.userData.sph.r = Math.max(30, Math.min(320, scene.userData.sph.r + e.deltaY * 0.1));
      scene.userData.updateCameraPos();
    };

    mount.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    mount.addEventListener("wheel", onWheel, { passive: false });

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
      
      // Animate Traffic
      if (trafficRef.current && trafficRef.current.instanceMatrix && trafficData.current.length > 0) {
        trafficData.current.forEach((car, i) => {
            car.x += car.speed * car.dir;
            if (car.x > 150) car.x = -150;
            if (car.x < -150) car.x = 150;
            dummy.position.set(car.x, 0.6, car.zOff);
            dummy.rotation.y = car.dir === 1 ? 0 : Math.PI;
            dummy.updateMatrix();
            trafficRef.current!.setMatrixAt(i, dummy.matrix);
        });
        trafficRef.current.instanceMatrix.needsUpdate = true;
      }

      // Animate Drone Orbit
      if (droneRef.current) {
        const dx = 30 + Math.cos(t * 0.4) * 55;
        const dy = 65 + Math.sin(t * 0.8) * 4;
        const dz = -10 + Math.sin(t * 0.4) * 55;
        droneRef.current.position.set(dx, dy, dz);
        
        // Drone looks forward along its path
        const nx = 30 + Math.cos((t + 0.1) * 0.4) * 55;
        const nz = -10 + Math.sin((t + 0.1) * 0.4) * 55;
        droneRef.current.lookAt(nx, dy, nz);

        // FPV CAMERA OVERRIDE
        if (scene.userData.activeCamMode === "DRONE_FPV") {
            camera.position.set(dx, dy + 1, dz);
            // Look down slightly towards the tower
            camera.lookAt(30, 30, -10);
        }
      }

      // Blink Aviation Lights
      const blink = Math.sin(t * 8) > 0; // Rapid pulse
      aviationLightsRef.current.forEach(b => { b.visible = blink; });

      // CINEMATIC IDLE ORBIT
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
      ro.disconnect();
      renderer.dispose();
    };
  }, [isHydrated]);

  // TIME OF DAY & LIGHTING SIMULATION
  useEffect(() => {
    if (!lightsGroupRef.current || !sceneRef.current) return;
    
    // Convert 0-24 timeOfDay to angles and colors
    const isNight = timeOfDay < 6 || timeOfDay > 18;
    const isMonsoon = weatherMode === "MONSOON";
    const _isHandover = timelineWeek >= 24;

    const lights = lightsGroupRef.current.children;
    const ambient = lights[0] as THREE.AmbientLight;
    const dir = lights[1] as THREE.DirectionalLight;
    const spot1 = lights[2] as THREE.SpotLight;
    
    if (isMonsoon) {
        sceneRef.current.background = new THREE.Color(isNight ? 0x010308 : 0x1e293b);
        if (sceneRef.current.fog) (sceneRef.current.fog as THREE.FogExp2).density = 0.008;
        ambient.intensity = isNight ? 0.1 : 0.4;
        dir.intensity = isNight ? 0.1 : 0.5;
        spot1.intensity = isNight ? 4000 : 0;
    } else {
        // Dynamic Solar Arc
        const timeNorm = (timeOfDay - 6) / 12; // 6am = 0, 6pm = 1
        const sunAngle = timeNorm * Math.PI; // 0 to 180 degrees
        
        dir.position.set(Math.cos(sunAngle) * -150, Math.sin(sunAngle) * 150, 80);

        if (isNight) {
            sceneRef.current.background = new THREE.Color(0x060a14); // Dark night sky
            ambient.intensity = 0.15;
            dir.intensity = 0.1;
            spot1.intensity = 4000;
        } else {
            // Interpolate sky color: Morning(orange) -> Noon(blue) -> Evening(orange)
            const skyColor = new THREE.Color();
            if (timeOfDay < 8) skyColor.lerpColors(new THREE.Color(0xff8c00), new THREE.Color(0x87CEEB), (timeOfDay-6)/2);
            else if (timeOfDay > 16) skyColor.lerpColors(new THREE.Color(0x87CEEB), new THREE.Color(0xff4500), (timeOfDay-16)/2);
            else skyColor.setHex(0x87CEEB); // Noon blue

            sceneRef.current.background = skyColor;
            
            // Adjust fog color to match sky for horizon blending
            if (sceneRef.current.fog) {
                (sceneRef.current.fog as THREE.FogExp2).color = skyColor;
                (sceneRef.current.fog as THREE.FogExp2).density = 0.002;
            }
            
            ambient.intensity = 0.6 + Math.sin(sunAngle) * 0.3;
            dir.intensity = Math.max(0, Math.sin(sunAngle) * 2.0);
            
            // Warm sunset/sunrise lighting
            if (timeOfDay < 8 || timeOfDay > 16) dir.color.setHex(0xffaa55);
            else dir.color.setHex(0xffffff);

            spot1.intensity = 0;
        }
    }

    // Apply architectural interior illumination at night during Handover
    if (elementsGroupRef.current) {
        elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.userData || !mesh.material) return;
            const { originalEmissive, entityId } = mesh.userData;
            if (entityId && (entityId.includes("GLZ") || entityId.includes("CORE"))) {
                const mat = mesh.material as any;
                if (isNight && _isHandover && renderMode !== "X_RAY") {
                    mat.emissive.setHex(0xffaa55); 
                    mat.emissiveIntensity = 0.8;
                } else {
                    mat.emissive.setHex(originalEmissive);
                    mat.emissiveIntensity = 0;
                }
            }
        });
    }

    const rainSystem = sceneRef.current.children.find(c => c.userData.isWeather);
    if (rainSystem) rainSystem.visible = isMonsoon;

  }, [timeOfDay, weatherMode, timelineWeek, renderMode]);

  // CAMERA MODE OVERRIDE
  useEffect(() => {
    if (sceneRef.current) {
        sceneRef.current.userData.activeCamMode = camMode;
        // If returning to ORBIT, instantly force update the camera to the spherical coordinates
        if (camMode === "ORBIT" && sceneRef.current.userData.updateCameraPos) {
             sceneRef.current.userData.updateCameraPos();
        }
    }
  }, [camMode]);

  // Z-AXIS CLIP & EXPLODE
  useEffect(() => {
    if (clipPlaneRef.current) clipPlaneRef.current.constant = 80 * (planCutZ / 100);
    if (elementsGroupRef.current) {
      elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.userData && mesh.userData.originalY !== undefined) {
          const mult = mesh.userData.level === "L2_HELIPAD" ? 40 : mesh.userData.level === "L1_HOTEL_TOWER" ? 20 : mesh.userData.level === "L1_MUSEUM" ? 10 : 0;
          let yOff = 0;
          if (mesh.userData.entityId === "JPNIC_PILES" && planCutZ < 30) yOff = (30 - planCutZ) * 0.2; 
          mesh.position.y = mesh.userData.originalY + (explodeY / 100) * mult + yOff;
        }
      });
    }
  }, [planCutZ, explodeY]);

  // RENDER MODE
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

      if (mesh.userData.edgeLine) mesh.userData.edgeLine.visible = (renderMode === "CAD_EDGES" || renderMode === "X_RAY");
      if (mesh.userData.pointsMesh) mesh.userData.pointsMesh.visible = (renderMode === "LIDAR_SCAN");

      if (mesh.visible) {
        if (renderMode === "LIDAR_SCAN") {
          mat.visible = false; 
          if (mesh.userData.edgeLine) mesh.userData.edgeLine.visible = false;
        } else {
          mat.visible = true;
          mat.transparent = originalTransparent || renderMode === "X_RAY";
          mat.opacity = renderMode === "X_RAY" ? 0.25 : originalOpacity;
          mat.wireframe = renderMode === "X_RAY";
        }
      }

      if (mat.color && originalColor !== undefined) {
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
          {(["SOLID", "CAD_EDGES", "X_RAY", "LIDAR_SCAN", "AI_HEATMAP"] as const).map((mode) => (
            <button key={mode} onClick={() => setRenderMode(mode)} className={`px-2.5 py-0.5 text-[11px] font-mono rounded font-semibold transition ${renderMode === mode ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}>{mode.replace("_", " ")}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {/* CAMERA MODE TOGGLE */}
          <button onClick={() => { setCamMode(camMode === "ORBIT" ? "DRONE_FPV" : "ORBIT"); if(camMode === "ORBIT") addAiLog("DRONE_LINK", "Establishing FPV Video downlink...", "text-purple-400"); }} className={`px-3 py-1 text-xs font-bold uppercase rounded border transition-all ${camMode === "DRONE_FPV" ? "bg-purple-900 border-purple-500 text-purple-200 shadow-md shadow-purple-500/30 animate-pulse" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}>
            {camMode === "DRONE_FPV" ? "🚁 DRONE FPV ACTIVE" : "🚁 DRONE CAM"}
          </button>
          <button onClick={() => setPitchMode(!pitchMode)} className={`px-4 py-1 text-xs font-bold uppercase rounded border transition-all ${pitchMode ? "bg-amber-500 border-amber-400 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}>
            {pitchMode ? "🎥 PITCH MODE ACTIVE" : "🎥 PITCH MODE"}
          </button>
          <button onClick={() => setWeatherMode(weatherMode === "CLEAR" ? "MONSOON" : "CLEAR")} className={`px-3 py-1 text-xs font-bold uppercase rounded border transition-all ${weatherMode === "MONSOON" ? "bg-teal-900 border-teal-500 text-teal-200 shadow-md shadow-teal-500/20" : "bg-slate-800 border-slate-700 text-slate-300"}`}>
            {weatherMode === "MONSOON" ? "🌧️ Monsoon" : "☀️ Clear"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 transition-all duration-500 ease-in-out">
        <div className={`${pitchMode ? "lg:col-span-12" : "lg:col-span-8"} flex flex-col gap-3 transition-all duration-500`}>
          <div className={`relative w-full ${pitchMode ? "h-[650px]" : "h-[500px]"} bg-slate-950 rounded-xl overflow-hidden border border-slate-800 transition-all duration-500`}>
            
            {/* CROSSHAIR FOR FPV MODE */}
            {camMode === "DRONE_FPV" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-30">
                    <div className="w-16 h-16 border border-white rounded-full"></div>
                    <div className="absolute w-1 h-3 bg-white top-1/2 -mt-4 left-1/2 -ml-0.5"></div>
                    <div className="absolute w-1 h-3 bg-white bottom-1/2 -mb-4 left-1/2 -ml-0.5"></div>
                    <div className="absolute w-3 h-1 bg-white left-1/2 -ml-4 top-1/2 -mt-0.5"></div>
                    <div className="absolute w-3 h-1 bg-white right-1/2 -mr-4 top-1/2 -mt-0.5"></div>
                </div>
            )}

            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            
            <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-700 p-3 rounded-lg backdrop-blur-md w-64 pointer-events-none shadow-2xl transition-all">
              {isHandover ? (
                <>
                  <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-2 border-b border-slate-700 pb-1">7D Facility Operations</div>
                  <div className="flex justify-between items-center mb-1"><span className="text-xs text-slate-400">Campus Occupancy:</span><span className="text-xs font-bold font-mono text-cyan-400">{opsData.occupancy}</span></div>
                  <div className="flex justify-between items-center mb-2"><span className="text-xs text-slate-400">Grid Power Draw:</span><span className="text-xs font-bold font-mono text-amber-400">{opsData.powerMw} MW</span></div>
                  <div className="mt-2 pt-2 border-t border-slate-800 flex flex-col gap-1">
                    <div className="flex justify-between items-center"><span className="text-[10px] text-slate-400">Embodied Carbon:</span><span className="text-xs font-bold font-mono text-slate-300">{evmStatus.carbonTons.toLocaleString()} tCO₂e</span></div>
                    <div className="flex justify-between items-center"><span className="text-[10px] text-emerald-400">Solar PV Offset:</span><span className="text-xs font-bold font-mono text-emerald-400">-{evmStatus.carbonOffset.toLocaleString()} tCO₂e/yr</span></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-2 border-b border-slate-700 pb-1">6D EVM Analytics</div>
                  <div className="flex justify-between items-center mb-1"><span className="text-xs text-slate-400">Earned Value (EV):</span><span className="text-xs font-bold font-mono text-emerald-400">₹{(evmStatus.EV / 10000000).toFixed(2)}Cr</span></div>
                  <div className="flex justify-between items-center mb-2"><span className="text-xs text-slate-400">Actual Cost (AC):</span><span className={`text-xs font-bold font-mono ${evmStatus.CPI < 1 ? "text-red-400" : "text-emerald-400"}`}>₹{(evmStatus.AC / 10000000).toFixed(2)}Cr</span></div>
                  <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">Embodied Carbon:</span><span className="text-xs font-bold font-mono text-slate-300">{evmStatus.carbonTons.toLocaleString()} tCO₂e</span>
                  </div>
                </>
              )}
            </div>

            <div className="absolute bottom-3 left-3 bg-slate-950/80 border border-slate-800 p-2 rounded-lg backdrop-blur-md w-80 h-28 overflow-hidden pointer-events-none flex flex-col justify-end">
              <div className="text-[9px] font-bold font-mono text-slate-500 mb-1">QUADILLAR MULTI-AGENT HIVE</div>
              <div className="flex flex-col gap-0.5 justify-end">
                {aiLogs.map((log) => (
                  <div key={log.id} className="text-[10px] font-mono leading-tight"><span className="text-slate-500">[{log.agent}]</span> <span className={log.color}>{log.msg}</span></div>
                ))}
              </div>
            </div>
          </div>
          
          {/* NEW: TIME OF DAY SLIDER */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center gap-4">
              <span className="text-[11px] font-bold text-slate-300 uppercase whitespace-nowrap">Time of Day:</span>
              <input type="range" min="0" max="24" step="0.1" value={timeOfDay} onChange={(e) => setTimeOfDay(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400" />
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center gap-4">
              <span className="text-[11px] font-bold text-slate-300 uppercase whitespace-nowrap">Z-Slicer:</span>
              <input type="range" min="0" max="100" step="1" value={planCutZ} onChange={(e) => setPlanCutZ(parseInt(e.target.value, 10))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center gap-4">
              <span className="text-[11px] font-bold text-slate-300 uppercase whitespace-nowrap">Y-Explode:</span>
              <input type="range" min="0" max="100" step="1" value={explodeY} onChange={(e) => setExplodeY(parseInt(e.target.value, 10))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400" />
            </div>
          </div>
        </div>

        {/* ENGINEERING INSPECTOR PANEL (HIDDEN IN PITCH MODE) */}
        {!pitchMode && (
          <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col h-[540px] overflow-hidden transition-all">
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">Active Selection</div>
            <h3 className="text-base font-bold text-white mb-2">{selectedEntity.name}</h3>
            <div className="flex border-b border-slate-800 mb-4 overflow-x-auto">
              <button onClick={() => setInspectorTab("SUB_COMPS")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${inspectorTab === "SUB_COMPS" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500"}`}>Details</button>
              <button onClick={() => setInspectorTab("BOQ_LEDGER")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${inspectorTab === "BOQ_LEDGER" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500"}`}>BOQ</button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {inspectorTab === "SUB_COMPS" ? (
                <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">Select an element.</div>
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
                ) : <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">No BOQ data assigned.</div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* 4D GANTT (HIDDEN IN PITCH MODE) */}
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
ENGINE_V29_EOF

echo "✓ Phase 27 Applied: Dynamic Solar Time of Day, Aviation Lights, and FPV Drone Cam"
