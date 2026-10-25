#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: BIM ENGINE PHASE 14 (FULL JPNIC CAMPUS MASTERPLAN)
# Features: Dual Structures (Wedge + Tower), Massive Scale, Instanced Trees
# ==============================================================================

set -euo pipefail

cat << 'ENGINE_V16_EOF' > components/bim/FullBimSimulationEngine.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

export type SelectionLevel = "ALL" | "L0_PODIUM" | "L1_MUSEUM" | "L1_HOTEL_TOWER" | "L2_HELIPAD";
export type SelectionZone = "ALL_ZONES" | "ZONE_WEDGE" | "ZONE_TOWER" | "ZONE_PLAZA";
export type ShiftMode = "DAY_SHIFT" | "NIGHT_SHIFT";
export type RenderMode = "SOLID" | "CAD_EDGES" | "X_RAY";

export interface BOQLineItem { itemCode: string; description: string; quantity: number; unit: string; rateINR: number; amountINR: number; }
export interface SubComponent { id: string; name: string; type: string; status: "INSTALLED" | "PENDING" | "DEFECT" | "IN_PROGRESS" | "CLASH" | "ACTIVE"; weightOrVolume: string; }

export interface SelectedEntity {
  id: string; name: string; type: "LEVEL" | "ZONE" | "ELEMENT" | "MACHINERY"; discipline: "CIVIL" | "STRUCTURAL" | "MEP" | "DEFECT" | "ARCHITECTURAL" | "SAFETY";
  parentLevel: SelectionLevel; parentZone: SelectionZone; subComponents: SubComponent[]; boqItems: BOQLineItem[];
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
    id: "ENTIRE_JPNIC", name: "JPNIC Full Campus Masterplan", type: "LEVEL", discipline: "ARCHITECTURAL",
    parentLevel: "ALL", parentZone: "ALL_ZONES", subComponents: [
        { id: "ARCH", name: "Studio Archohm", type: "CONSULTANT", status: "ACTIVE", weightOrVolume: "Masterplan" },
        { id: "LSCAPE", name: "SJA Consultants", type: "CONSULTANT", status: "ACTIVE", weightOrVolume: "Landscape 18.6 Acres" }
    ],
    boqItems: [
      { itemCode: "CPWD-WEDGE", description: "Museum Wedge Structure", quantity: 12420, unit: "Cum", rateINR: 8400, amountINR: 104328000 },
      { itemCode: "CPWD-TOWER", description: "Hotel Tower Core & Diagrid", quantity: 18500, unit: "Cum", rateINR: 8400, amountINR: 155400000 },
      { itemCode: "TERREAL", description: "Terracotta Facade & Glazing", quantity: 24000, unit: "Sqm", rateINR: 4500, amountINR: 108000000 }
    ]
  };
  
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(defaultEntity);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const elementsGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);
  const clipPlaneRef = useRef<THREE.Plane | null>(null);
  const pickableMeshes = useRef<THREE.Mesh[]>([]);

  const cameraStations: CameraWaypoint[] = useMemo(() => [
    { id: "CAM-01-PLAZA", name: "CCTV (Central Plaza)", position: [0, 8, 40], type: "CCTV_FIXED", latestCapture: { timestamp: "2026-10-24 11:42:00 IST", sha256: "7f4c9a18...3c10a", verifiedDeviationMm: 1.8 } },
    { id: "DRONE-WP-TOWER", name: "Drone (Tower Helipad)", position: [40, 85, 20], type: "DRONE_PHOTOGRAMMETRY", latestCapture: { timestamp: "2026-10-24 09:15:22 IST", sha256: "5b8d8d42...7a64", verifiedDeviationMm: 0.9 } }
  ], []);

  const escrowStatus = useMemo(() => {
    const totalAllocated = 864000000; // 86.4 Cr JPNIC Budget
    let cleared = 0, retained = 0;
    if (timelineWeek >= 4) cleared += 150000000; // Podium
    if (timelineWeek >= 10) cleared += 200000000; // Tower Core & Wedge Base
    if (timelineWeek >= 16) cleared += 250000000; // Facades & Diagrid
    if (timelineWeek >= 20) { cleared += 150000000; retained += 22500000; } // MEP & Finishes
    return { allocated: totalAllocated, cleared, retained, pending: totalAllocated - cleared - retained };
  }, [timelineWeek]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("quadillar_bim_state_jpnic_master");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timelineWeek) setTimelineWeek(parsed.timelineWeek);
        if (parsed.renderMode) setRenderMode(parsed.renderMode);
        if (parsed.shiftMode) setShiftMode(parsed.shiftMode);
        if (parsed.planCutZ) setPlanCutZ(parsed.planCutZ);
        if (parsed.explodeY) setExplodeY(parsed.explodeY);
      }
    } catch (e) {}
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("quadillar_bim_state_jpnic_master", JSON.stringify({ timelineWeek, renderMode, shiftMode, planCutZ, explodeY }));
  }, [timelineWeek, renderMode, shiftMode, planCutZ, explodeY, isHydrated]);

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
    // Pulled camera WAY back to see the entire campus
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(110, 80, 140);

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
    dirLight.shadow.camera.left = -80;
    dirLight.shadow.camera.right = 80;
    dirLight.shadow.camera.top = 80;
    dirLight.shadow.camera.bottom = -80;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    
    const spotLight1 = new THREE.SpotLight(0xfff5e6, 0); 
    spotLight1.position.set(60, 100, 60);
    
    lightsGroup.add(ambientLight, dirLight, spotLight1);

    const grid = new THREE.GridHelper(200, 100, 0x00f0ff, 0x1e293b);
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
    
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.4 });

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
      
      if (!entityId.includes("LOUVER") && !entityId.includes("TREE")) {
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

    // ==========================================
    // 1. THE CAMPUS PODIUM & PLAZA
    // ==========================================
    const podiumGeo = new THREE.BoxGeometry(140, 4, 100);
    const podiumMesh = new THREE.Mesh(podiumGeo, concreteMat.clone());
    podiumMesh.position.set(0, 2, 0);
    addBimMesh(podiumMesh, "JPNIC_PODIUM", "Campus Shared Podium", "L0_PODIUM", "ZONE_PLAZA", 1, 1);

    // ==========================================
    // 2. THE MUSEUM WEDGE (Left Side)
    // ==========================================
    const wedgeWidth = 50;
    const wedgeDepth = 60;
    const wedgeFrontHeight = 35; 
    const wedgeBackHeight = 5;   

    const wedgeGeo = new THREE.BoxGeometry(wedgeWidth, wedgeFrontHeight, wedgeDepth, 10, 5, 10);
    const pos = wedgeGeo.attributes.position;
    for(let i=0; i<pos.count; i++) {
       const y = pos.getY(i);
       const z = pos.getZ(i);
       if (y > 0) {
          const zPercent = (z + (wedgeDepth/2)) / wedgeDepth; 
          const newY = wedgeBackHeight + (wedgeFrontHeight - wedgeBackHeight) * zPercent;
          pos.setY(i, newY - (wedgeFrontHeight/2));
       }
    }
    wedgeGeo.computeVertexNormals();

    const museumBlock = new THREE.Mesh(wedgeGeo, concreteMat.clone());
    museumBlock.position.set(-30, 4 + wedgeFrontHeight/2, 0);
    addBimMesh(museumBlock, "JPNIC_WEDGE", "Museum of Socialism", "L1_MUSEUM", "ZONE_WEDGE", 6, 6);

    const archVoid = new THREE.Mesh(new THREE.BoxGeometry(18, 9, 20), new THREE.MeshStandardMaterial({ color: 0x111111, clippingPlanes: [clipPlane] }));
    archVoid.position.set(-30, 4 + 4.5, wedgeDepth/2 + 0.1); 
    addBimMesh(archVoid, "JPNIC_GATE", "Gateway Entrance", "L1_MUSEUM", "ZONE_WEDGE", 8, 8);

    // Wedge Louvers
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
    louverInstMesh.count = lIndex;
    louverInstMesh.instanceMatrix.needsUpdate = true;
    louverInstMesh.userData = { entityId: "JPNIC_LOUVERS", name: "Terracotta Facade", level: "L1_MUSEUM", minWeek: 16, plannedWeek: 15, originalColor: 0xaa4a2e };
    pickableMeshes.current.push(louverInstMesh as any);
    bimGroup.add(louverInstMesh);

    // ==========================================
    // 3. THE GUEST HOUSE TOWER (Right Side)
    // ==========================================
    const towerRadius = 18;
    const towerHeight = 70;
    
    const towerCore = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, towerHeight, 32), concreteMat.clone());
    towerCore.position.set(30, 4 + towerHeight/2, -10);
    addBimMesh(towerCore, "JPNIC_TOWER_CORE", "Hotel Tower Core", "L1_HOTEL_TOWER", "ZONE_TOWER", 8, 8);

    const towerGlass = new THREE.Mesh(new THREE.CylinderGeometry(towerRadius, towerRadius, towerHeight-2, 32), glassMat.clone());
    towerGlass.position.set(30, 4 + towerHeight/2, -10);
    addBimMesh(towerGlass, "JPNIC_TOWER_GLASS", "Tower Glazing", "L1_HOTEL_TOWER", "ZONE_TOWER", 14, 14);

    const towerDiagrid = new THREE.Mesh(new THREE.CylinderGeometry(towerRadius+0.5, towerRadius+0.5, towerHeight, 32, 12), diagridMat.clone());
    towerDiagrid.position.set(30, 4 + towerHeight/2, -10);
    addBimMesh(towerDiagrid, "JPNIC_DIAGRID", "Steel Diagrid", "L1_HOTEL_TOWER", "ZONE_TOWER", 15, 15);

    // Cantilever Helipad
    const cantileverMesh = new THREE.Mesh(new THREE.BoxGeometry(45, 8, 20), concreteMat.clone());
    cantileverMesh.position.set(30 + 15, 4 + towerHeight + 4, -10); 
    addBimMesh(cantileverMesh, "JPNIC_CANTILEVER", "Helipad & Skydeck", "L2_HELIPAD", "ZONE_TOWER", 18, 18);

    // ==========================================
    // 4. CAMPUS MEP & TREES
    // ==========================================
    // Chilled water pipe connecting Tower and Museum across the plaza
    const chwPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 60, 16), pipeMat.clone());
    chwPipe.rotation.z = Math.PI / 2;
    chwPipe.position.set(0, 5.5, 5);
    addBimMesh(chwPipe, "CHW_MAIN", "Campus CHW Main Loop", "L0_PODIUM", "ZONE_PLAZA", 20, 20);

    const clashNode = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), clashMat.clone());
    clashNode.position.set(-5, 5.5, 5);
    addBimMesh(clashNode, "CLASH_NODE_01", "MEP Trench Clash", "L0_PODIUM", "ZONE_PLAZA", 20, 20);

    // Instanced Trees
    const treeGeo = new THREE.ConeGeometry(1.5, 4, 8);
    const treeInstMesh = new THREE.InstancedMesh(treeGeo, grassMat, 200);
    let tIndex = 0;
    for(let i=0; i<150; i++) {
        const x = (Math.random() - 0.5) * 130;
        const z = (Math.random() - 0.5) * 90;
        // Keep trees away from the buildings
        if ((x > -55 && x < -5 && z > -30 && z < 30) || (x > 10 && x < 50 && z > -30 && z < 10)) continue;
        dummy.position.set(x, 6, z);
        dummy.updateMatrix();
        treeInstMesh.setMatrixAt(tIndex++, dummy.matrix);
    }
    treeInstMesh.count = tIndex;
    treeInstMesh.instanceMatrix.needsUpdate = true;
    treeInstMesh.userData = { entityId: "JPNIC_TREES", name: "SJA Landscape Trees", level: "L0_PODIUM", minWeek: 22, originalColor: 0x4d7c0f };
    pickableMeshes.current.push(treeInstMesh as any);
    bimGroup.add(treeInstMesh);

    // Cameras
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
      sph.r = Math.max(30, Math.min(300, sph.r + e.deltaY * 0.1));
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
          const isClash = hit.entityId.includes("CLASH");
          if (isClash) setInspectorTab("CLASH_MATRIX");
          else setInspectorTab("SUB_COMPS");
          
          setSelectedEntity({
            id: hit.entityId, name: hit.name, type: "ELEMENT",
            discipline: isClash ? "DEFECT" : "STRUCTURAL",
            parentLevel: hit.level, parentZone: hit.zone,
            subComponents: [], boqItems: []
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
    if (isNight) {
      ambient.intensity = 0.1; dir.intensity = 0.1; spot1.intensity = 4000;
    } else {
      ambient.intensity = 0.7; dir.intensity = 1.6; spot1.intensity = 0;
    }
  }, [shiftMode]);

  // Z-AXIS CLIP 
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

      if (mesh.userData.edgeLine) mesh.userData.edgeLine.visible = (renderMode === "CAD_EDGES" || renderMode === "X_RAY");

      if (mesh.visible) {
        mat.transparent = originalTransparent || renderMode === "X_RAY";
        mat.opacity = renderMode === "X_RAY" ? 0.2 : originalOpacity;
        mat.wireframe = renderMode === "X_RAY";
      }

      if (mat.color && originalColor !== undefined && entityId !== "CLASH_NODE_01") {
        if (timelineMode === "VARIANCE") {
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
          {(["SOLID", "CAD_EDGES", "X_RAY"] as const).map((mode) => (
            <button key={mode} onClick={() => setRenderMode(mode)} className={`px-2.5 py-0.5 text-[11px] font-mono rounded font-semibold transition ${renderMode === mode ? "bg-purple-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}>{mode.replace("_", " ")}</button>
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
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-2">JPNIC Smart Escrow</div>
              <div className="flex justify-between items-center mb-1.5"><span className="text-xs text-slate-400">Allocated:</span><span className="text-xs font-bold font-mono text-slate-200">₹{(escrowStatus.allocated / 10000000).toFixed(2)}Cr</span></div>
              <div className="flex justify-between items-center mb-1.5"><span className="text-xs text-slate-400">Cleared:</span><span className="text-xs font-bold font-mono text-emerald-400">₹{(escrowStatus.cleared / 10000000).toFixed(2)}Cr</span></div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden flex"><div className="h-full bg-emerald-500" style={{ width: `${(escrowStatus.cleared / escrowStatus.allocated) * 100}%` }}></div></div>
            </div>
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
              <div className="px-2.5 py-1 bg-slate-900/90 border border-cyan-500/40 rounded text-xs font-mono text-cyan-300 flex items-center gap-2 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> LiveView Phase 14: Campus Masterplan
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
              <button onClick={() => setInspectorTab("CLASH_MATRIX")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1 ${inspectorTab === "CLASH_MATRIX" ? "text-red-400 border-b-2 border-red-400" : "text-slate-500"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Clash
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {inspectorTab === "CLASH_MATRIX" ? (
              <div className="flex flex-col gap-4">
                <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-4">
                  <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-3">AXIS SPATIAL LOCKOUT</div>
                  <h4 className="text-sm font-bold text-slate-200 mb-2">Hard Intersect: Campus MEP Trench</h4>
                  <p className="text-xs text-slate-400 mb-4">Central Chilled Water pipe intersecting podium sub-structure.</p>
                  <button className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded transition">Raise Coordination RFI</button>
                </div>
              </div>
            ) : <div className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-lg text-center border border-slate-800 border-dashed">Select an element to view details.</div>}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl flex flex-col gap-4">
        <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3"><span className="font-bold text-slate-200 uppercase tracking-wider">Archohm Masterplan Schedule Analyzer:</span><span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono font-bold rounded border border-blue-500/30">Week {timelineWeek}</span></div>
        </div>
        <input type="range" min="1" max="24" step="1" value={timelineWeek} onChange={(e) => setTimelineWeek(parseInt(e.target.value, 10))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 mb-2" />
      </div>
    </div>
  );
}
ENGINE_V16_EOF

echo "✓ Phase 14 Applied: Full JPNIC Masterplan (Dual Structures & Landscape)"
