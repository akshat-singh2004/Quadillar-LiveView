#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: BIM ENGINE PHASE 23 (TRUE JPNIC MASSING)
# Replaces generic blocks with the Sweeping Terracotta Facade, Central Dome,
# and Circular Helipad based on real-world drone imagery.
# ==============================================================================

set -euo pipefail

cat << 'ENGINE_V25_EOF' > components/bim/FullBimSimulationEngine.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

export type SelectionLevel = "ALL" | "L0_PODIUM" | "L1_MUSEUM" | "L1_HOTEL_TOWER" | "L2_HELIPAD";
export type SelectionZone = "ALL_ZONES" | "ZONE_WEDGE" | "ZONE_TOWER" | "ZONE_PLAZA";
export type ShiftMode = "DAY_SHIFT" | "NIGHT_SHIFT";
export type RenderMode = "SOLID" | "CAD_EDGES" | "X_RAY" | "LIDAR_SCAN" | "AI_HEATMAP";
export type WeatherMode = "CLEAR" | "MONSOON";

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
  
  const [aiLogs, setAiLogs] = useState<{id: string, agent: string, msg: string, color: string}[]>([]);

  const defaultEntity: SelectedEntity = {
    id: "ENTIRE_JPNIC", name: "Jai Prakash Narayan International Centre", type: "LEVEL", discipline: "ARCHITECTURAL",
    parentLevel: "ALL", parentZone: "ALL_ZONES", 
    subComponents: [
        { id: "ARCH", name: "Studio Archohm", type: "CONSULTANT", status: "ACTIVE", weightOrVolume: "Masterplan" }
    ],
    boqItems: [
      { itemCode: "CPWD-WEDGE", description: "Terracotta Sweeping Facade", quantity: 12420, unit: "Cum", rateINR: 8400, amountINR: 104328000, carbonKg: 4968000 },
      { itemCode: "CPWD-TOWER", description: "Central Museum Dome", quantity: 18500, unit: "Cum", rateINR: 8400, amountINR: 155400000, carbonKg: 7400000 }
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
  const lastInteractionTime = useRef<number>(Date.now());

  const cameraStations: CameraWaypoint[] = useMemo(() => [
    { id: "CAM-01-PLAZA", name: "CCTV (Central Plaza)", position: [0, 8, 40], type: "CCTV_FIXED", latestCapture: { timestamp: "2026-10-24 11:42:00 IST", sha256: "7f4c9a18...3c10a", verifiedDeviationMm: 1.8 } },
    { id: "DRONE-WP-TOWER", name: "Drone (Helipad)", position: [40, 85, 20], type: "DRONE_PHOTOGRAMMETRY", latestCapture: { timestamp: "2026-10-24 09:15:22 IST", sha256: "5b8d8d42...7a64", verifiedDeviationMm: 0.9 } }
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
    let EV = 0, AC = 0, PV = 0, retained = 0, carbonTons = 0;
    PV = (timelineWeek / 24) * totalAllocated;
    
    if (timelineWeek >= 4) { EV += 150000000; AC += 148000000; carbonTons += 2450; } 
    if (timelineWeek >= 10) { EV += 200000000; AC += 195000000; carbonTons += 4820; } 
    if (timelineWeek >= 16) { EV += 250000000; AC += 255000000; carbonTons += 8900; } 
    if (timelineWeek >= 20) { 
      carbonTons += 1240;
      if (clashResolved) { EV += 172500000; AC += 170000000; } 
      else { EV += 150000000; AC += 180000000; retained += 22500000; }
    } 
    if (timelineWeek >= 24) { EV = totalAllocated; AC = totalAllocated - 4500000; carbonTons += 500; }
    
    const SPI = PV === 0 ? 1.0 : EV / PV;
    const CPI = AC === 0 ? 1.0 : EV / AC;
    return { allocated: totalAllocated, EV, AC, retained, SPI, CPI, carbonTons };
  }, [timelineWeek, clashResolved]);

  const [opsData, setOpsData] = useState({ occupancy: 0, powerMw: 0, hvacLoad: 0 });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("quadillar_bim_state_jpnic_v23");
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
    addAiLog("SYS", "True JPNIC Massing Model Loaded.", "text-cyan-400");
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("quadillar_bim_state_jpnic_v23", JSON.stringify({ timelineWeek, renderMode, shiftMode, weatherMode, planCutZ, explodeY, clashResolved }));
  }, [timelineWeek, renderMode, shiftMode, weatherMode, planCutZ, explodeY, clashResolved, isHydrated]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying4D) {
      interval = setInterval(() => {
        setTimelineWeek(prev => {
          if (prev === 20 && !clashResolved) {
            setIsPlaying4D(false);
            setInspectorTab("CLASH_MATRIX");
            addAiLog("MEP_AGENT", "CRITICAL: Hard spatial clash detected at Week 20.", "text-red-400");
            return 20;
          }
          if (prev >= 24) { setIsPlaying4D(false); return 24; }
          return prev + 1;
        });
      }, 800); 
    }
    return () => clearInterval(interval);
  }, [isPlaying4D, clashResolved]);

  useEffect(() => {
    const interval = setInterval(() => {
      const t = Date.now() / 1000;
      if (isHandover) {
        setOpsData({
            occupancy: Math.round(1200 + Math.sin(t * 0.5) * 45),
            powerMw: +(2.4 + Math.sin(t * 0.8) * 0.2).toFixed(2),
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    const dirLight = new THREE.DirectionalLight(0xfff0dd, 1.8);
    dirLight.position.set(100, 150, 80);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.001; 
    
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

    // --- ACCURATE JPNIC MATERIALS ---
    const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xd95030, roughness: 0.8, clippingPlanes: [clipPlane] }); // Iconic Red/Orange
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, clippingPlanes: [clipPlane] });
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.5, roughness: 0.4, clippingPlanes: [clipPlane] }); // Silver Dome
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x111111, transparent: true, opacity: 0.7, roughness: 0.1, clippingPlanes: [clipPlane] }); // Dark windows
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 1.0, clippingPlanes: [clipPlane] });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3, clippingPlanes: [clipPlane] });
    const clashMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xaa0000, emissiveIntensity: 0.9, wireframe: true });
    
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.3 });
    const lidarMat = new THREE.PointsMaterial({ color: 0x10b981, size: 0.3, transparent: true, opacity: 0.8 });

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
      
      if (!entityId.includes("TREE") && !entityId.includes("TRUCK")) {
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

    // PODIUM
    const podiumGeo = new THREE.BoxGeometry(140, 4, 100);
    const podiumMesh = new THREE.Mesh(podiumGeo, concreteMat.clone());
    podiumMesh.position.set(0, 2, 0);
    addBimMesh(podiumMesh, "JPNIC_PODIUM", "Campus Podium", "L0_PODIUM", "ZONE_PLAZA", 1, 1);

    // ==========================================
    // TRUE JPNIC ARCHITECTURE (BIT 1)
    // ==========================================

    // 1. THE SWEEPING TERRACOTTA FACADE
    // Deforming a box to create the sweeping parabolic curve
    const sweepHeight = 85;
    const sweepDepth = 70;
    const sweepGeo = new THREE.BoxGeometry(25, sweepHeight, sweepDepth, 10, 30, 10);
    const pos = sweepGeo.attributes.position;
    for(let i=0; i<pos.count; i++) {
       const y = pos.getY(i);
       const normalizedY = (y + (sweepHeight/2)) / sweepHeight; // 0 (bottom) to 1 (top)
       const z = pos.getZ(i);
       // Push the top backwards logarithmically to create the iconic sweep
       pos.setZ(i, z - Math.pow(normalizedY, 2.5) * 45);
    }
    sweepGeo.computeVertexNormals();

    const sweepingFacade = new THREE.Mesh(sweepGeo, terracottaMat.clone());
    sweepingFacade.position.set(10, 4 + sweepHeight/2, 10);
    addBimMesh(sweepingFacade, "JPNIC_SWEEP_FACADE", "Sweeping Terracotta Facade", "L1_HOTEL_TOWER", "ZONE_TOWER", 6, 6);

    // Add a secondary sweeping fin parallel to the first
    const secondarySweep = new THREE.Mesh(sweepGeo, terracottaMat.clone());
    secondarySweep.position.set(-10, 4 + sweepHeight/2, 10);
    addBimMesh(secondarySweep, "JPNIC_SWEEP_FACADE_2", "Secondary Terracotta Fin", "L1_HOTEL_TOWER", "ZONE_TOWER", 7, 7);

    // Connecting dark louver block between the fins
    const louverBlockGeo = new THREE.BoxGeometry(20, sweepHeight * 0.7, sweepDepth * 0.8, 5, 20, 5);
    const lPos = louverBlockGeo.attributes.position;
    for(let i=0; i<lPos.count; i++) {
       const y = lPos.getY(i);
       const normalizedY = (y + (sweepHeight*0.7/2)) / (sweepHeight*0.7);
       const z = lPos.getZ(i);
       lPos.setZ(i, z - Math.pow(normalizedY, 2.5) * 35);
    }
    louverBlockGeo.computeVertexNormals();
    const louverBlock = new THREE.Mesh(louverBlockGeo, glassMat.clone());
    louverBlock.position.set(0, 4 + (sweepHeight*0.7)/2, 10);
    addBimMesh(louverBlock, "JPNIC_DARK_LOUVERS", "Facade Louvers/Glazing", "L1_HOTEL_TOWER", "ZONE_TOWER", 10, 10);


    // 2. THE MASSIVE SILVER DOME
    // A sphere cut in half, sitting on the podium
    const domeGeo = new THREE.SphereGeometry(22, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMesh = new THREE.Mesh(domeGeo, domeMat.clone());
    domeMesh.position.set(-30, 4, 15); // Nestled next to the sweeping structure
    addBimMesh(domeMesh, "JPNIC_DOME", "Museum of Socialism Dome", "L1_MUSEUM", "ZONE_WEDGE", 8, 8);

    // Sloped Green Roof wrapping the dome
    const slopeGeo = new THREE.BoxGeometry(40, 20, 50);
    const slopePos = slopeGeo.attributes.position;
    for(let i=0; i<slopePos.count; i++) {
        const z = slopePos.getZ(i);
        const y = slopePos.getY(i);
        if (y > 0) {
            const zNorm = (z + 25) / 50; 
            slopePos.setY(i, y - (zNorm * 18)); // Slope down towards front
        }
    }
    slopeGeo.computeVertexNormals();
    const slopeMesh = new THREE.Mesh(slopeGeo, grassMat.clone());
    slopeMesh.position.set(-30, 4 + 10, -10);
    addBimMesh(slopeMesh, "JPNIC_GREEN_ROOF", "Sloped Green Roof", "L1_MUSEUM", "ZONE_WEDGE", 12, 12);


    // 3. THE CIRCULAR HELIPAD
    const helipadGeo = new THREE.CylinderGeometry(14, 14, 1, 32);
    const helipadMesh = new THREE.Mesh(helipadGeo, concreteMat.clone());
    // Positioned jutting out from the swept back top
    helipadMesh.position.set(0, 4 + sweepHeight, -20);
    addBimMesh(helipadMesh, "JPNIC_HELIPAD", "Circular Cantilevered Helipad", "L2_HELIPAD", "ZONE_TOWER", 16, 16);


    // MEP CLASH
    const chwPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 60, 16), pipeMat.clone());
    chwPipe.rotation.z = Math.PI / 2;
    chwPipe.position.set(0, 5.5, 30);
    addBimMesh(chwPipe, "CHW_MAIN", "Campus CHW Main Loop", "L0_PODIUM", "ZONE_PLAZA", 20, 20);

    const clashNode = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), clashMat.clone());
    clashNode.position.set(-5, 5.5, 30);
    addBimMesh(clashNode, "CLASH_NODE_01", "MEP Trench Clash", "L0_PODIUM", "ZONE_PLAZA", 20, 20);

    cameraStations.forEach((cam) => {
      const camMesh = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 16), new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2 }));
      camMesh.position.set(...cam.position);
      camMesh.rotation.x = Math.PI;
      camMesh.userData = { isCamera: true, cameraData: cam, name: cam.name, originalY: cam.position[1] };
      pickableMeshes.current.push(camMesh as any);
      bimGroup.add(camMesh);
    });

    let isDragging = false, prevX = 0, prevY = 0;
    let sph = { r: 180, phi: Math.PI / 3.0, theta: Math.PI / 4 }; // Adjusted default angle to see dome and sweep

    const updateCameraPos = () => {
      camera.position.x = sph.r * Math.sin(sph.phi) * Math.sin(sph.theta);
      camera.position.y = sph.r * Math.cos(sph.phi);
      camera.position.z = sph.r * Math.sin(sph.phi) * Math.cos(sph.theta);
      camera.lookAt(0, 25, 0); 
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
        } else {
          const isClash = hit.entityId.includes("CLASH");
          
          if (isClash) setInspectorTab("CLASH_MATRIX");
          else setInspectorTab("SUB_COMPS");
          
          setSelectedEntity({
            id: hit.entityId, name: hit.name, type: "ELEMENT",
            discipline: isClash ? "DEFECT" : "STRUCTURAL",
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

      if (Date.now() - lastInteractionTime.current > 5000 && !isDragging) {
         sph.theta -= 0.0015; 
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

  }, [timelineWeek, timelineMode, renderMode, isHydrated]);

  if (!isHydrated) return <div className="w-full h-[520px] bg-slate-950"></div>;

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-lg">
          {(["SOLID", "CAD_EDGES", "X_RAY", "LIDAR_SCAN", "AI_HEATMAP"] as const).map((mode) => (
            <button key={mode} onClick={() => setRenderMode(mode)} className={`px-2.5 py-0.5 text-[11px] font-mono rounded font-semibold transition ${renderMode === mode ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}>{mode.replace("_", " ")}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="relative w-full h-[500px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
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
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> LiveView Phase 23: True Architectural Massing
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col h-[540px] overflow-hidden">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">Active Selection</div>
          <h3 className="text-base font-bold text-white mb-2">{selectedEntity.name}</h3>
          <div className="flex border-b border-slate-800 mb-4 overflow-x-auto">
            <button onClick={() => setInspectorTab("SUB_COMPS")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${inspectorTab === "SUB_COMPS" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500"}`}>Details</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {inspectorTab === "SUB_COMPS" ? (
               <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">Select the dome, sweeping facade, or helipad.</div>
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
      </div>
    </div>
  );
}
ENGINE_V25_EOF

echo "✓ Phase 23 Applied: True JPNIC Architecture (Sweeping Terracotta Facade, Dome & Helipad)"
