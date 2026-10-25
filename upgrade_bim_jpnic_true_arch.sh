#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: JPNIC TRUE ARCHITECTURE REWRITE (PHASE 13)
# Scrapping generic cylinders for the true Archohm Wedge, Terracotta Facade, 
# and Sloped Green Roof using custom vertex deformation.
# ==============================================================================

set -euo pipefail

cat << 'ENGINE_V15_EOF' > components/bim/FullBimSimulationEngine.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

export type SelectionLevel = "ALL" | "UG_BASEMENT" | "L1_MUSEUM" | "L5_GREEN_ROOF";
export type SelectionZone = "ALL_ZONES" | "ZONE_GATEWAY" | "ZONE_EXHIBIT";
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
  const [renderMode, setRenderMode] = useState<RenderMode>("SOLID");
  const [activeLevel, setActiveLevel] = useState<SelectionLevel>("ALL");
  const [activeZone, setActiveZone] = useState<SelectionZone>("ALL_ZONES");
  
  const [planCutZ, setPlanCutZ] = useState<number>(100);
  const [explodeY, setExplodeY] = useState<number>(0);
  
  const [activeCamera, setActiveCamera] = useState<CameraWaypoint | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"SUB_COMPS" | "BOQ_LEDGER" | "LIVE_IOT" | "CLASH_MATRIX" | "CRANE_SENSOR">("SUB_COMPS");

  const [liveSensor, setLiveSensor] = useState({ damperAngle: 45.0, airflowCfm: 450, craneLoad: 4.2, craneWind: 18.5, stpLevel: 65, chillerTemp: 7.2, tick: 0 });

  const defaultEntity: SelectedEntity = {
    id: "ENTIRE_JPNIC", name: "JPNIC Museum of Socialism", type: "LEVEL", discipline: "ARCHITECTURAL",
    parentLevel: "ALL", parentZone: "ALL_ZONES", subComponents: [
        { id: "ARCH", name: "Studio Archohm (Sourabh Gupta)", type: "CONSULTANT", status: "ACTIVE", weightOrVolume: "Lead Architect" },
        { id: "STRC", name: "ROARK Consulting", type: "CONSULTANT", status: "ACTIVE", weightOrVolume: "Structural Eng." },
        { id: "MEP", name: "Sunil Nayyar Consultants", type: "CONSULTANT", status: "ACTIVE", weightOrVolume: "HVAC & Plumbing" }
    ],
    boqItems: [
      { itemCode: "TERREAL-01", description: "Imported Terracotta Cladding Louvers", quantity: 18500, unit: "Sqm", rateINR: 4200, amountINR: 77700000 },
      { itemCode: "CPWD-5.33", description: "M40 Grade RMC for Museum Wedge", quantity: 12420.5, unit: "Cum", rateINR: 8400, amountINR: 104332200 }
    ],
    boqSummary: { concrete_m3: 12420.5, steel_mt: 2818.4, ductwork_m2: 12840.0, total_cost_inr: 864000000.0 }
  };
  
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(defaultEntity);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const elementsGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);
  const clipPlaneRef = useRef<THREE.Plane | null>(null);
  const pickableMeshes = useRef<THREE.Mesh[]>([]);

  const cameraStations: CameraWaypoint[] = useMemo(() => [
    { id: "CAM-01-ARCH", name: "CCTV (Gateway Arch)", position: [0, 5, 22], type: "CCTV_FIXED", latestCapture: { timestamp: "2026-10-24 11:42:00 IST", sha256: "7f4c9a18...3c10a", verifiedDeviationMm: 1.8 } },
    { id: "DRONE-WP-ROOF", name: "Drone (Sweeping Green Roof)", position: [15, 25, -10], type: "DRONE_PHOTOGRAMMETRY", latestCapture: { timestamp: "2026-10-24 09:15:22 IST", sha256: "5b8d8d42...7a64", verifiedDeviationMm: 0.9 } }
  ], []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("quadillar_bim_state_jpnic_true");
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
    localStorage.setItem("quadillar_bim_state_jpnic_true", JSON.stringify({ timelineWeek, timelineMode, activeLevel, activeZone, planCutZ, explodeY, shiftMode, renderMode }));
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
    camera.position.set(70, 40, 80);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 60); 
    clipPlaneRef.current = clipPlane;

    const lightsGroup = new THREE.Group();
    lightsGroupRef.current = lightsGroup;
    scene.add(lightsGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    const dirLight = new THREE.DirectionalLight(0xfff0dd, 1.5); // Warm sun
    dirLight.position.set(80, 100, 60);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    
    lightsGroup.add(ambientLight, dirLight);

    const grid = new THREE.GridHelper(120, 60, 0x00f0ff, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    const bimGroup = new THREE.Group();
    elementsGroupRef.current = bimGroup;
    scene.add(bimGroup);
    pickableMeshes.current = [];

    // --- ARCHOHM JPNIC MATERIALS ---
    const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xaa4a2e, roughness: 0.9, metalness: 0.1, clippingPlanes: [clipPlane] }); // Iconic Terracotta
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85, clippingPlanes: [clipPlane] });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 1.0, clippingPlanes: [clipPlane] }); // Sweeping Forest Roof
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.3, transmission: 0.6, roughness: 0.1, clippingPlanes: [clipPlane] });
    const ductMat = new THREE.MeshStandardMaterial({ color: 0xa1a1aa, metalness: 0.7, clippingPlanes: [clipPlane] });
    const clashMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xaa0000, emissiveIntensity: 0.9, wireframe: true });
    
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.6 });

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
      
      if (!entityId.includes("LOUVER")) {
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
    // PHASE 13: TRUE JPNIC WEDGE ARCHITECTURE
    // ==========================================

    // 1. The Monumental Wedge Base (Deformed BoxGeometry to create the slope)
    const wedgeWidth = 70;
    const wedgeDepth = 50;
    const wedgeFrontHeight = 35; // 5 stories high at the front
    const wedgeBackHeight = 5;   // Sweeps down to the park at the back

    const wedgeGeo = new THREE.BoxGeometry(wedgeWidth, wedgeFrontHeight, wedgeDepth, 10, 5, 10);
    const pos = wedgeGeo.attributes.position;
    for(let i=0; i<pos.count; i++) {
       const y = pos.getY(i);
       const z = pos.getZ(i);
       // If top vertex, slope it down towards the back (-z)
       if (y > 0) {
          // Map z from +25 (front) to -25 (back)
          const zPercent = (z + (wedgeDepth/2)) / wedgeDepth; // 0 at back, 1 at front
          const newY = wedgeBackHeight + (wedgeFrontHeight - wedgeBackHeight) * zPercent;
          pos.setY(i, newY - (wedgeFrontHeight/2)); // Adjust for centered origin
       }
    }
    wedgeGeo.computeVertexNormals();

    const museumBlock = new THREE.Mesh(wedgeGeo, concreteMat.clone());
    museumBlock.position.set(0, wedgeFrontHeight/2, 0);
    addBimMesh(museumBlock, "JPNIC_MUSEUM_WEDGE", "Museum of Socialism (Interpretation Centre)", "L1_MUSEUM", "ALL_ZONES", 1, 1, [], [
        { itemCode: "STRC-WEDGE", description: "M40 Mass Concrete for Monumental Wedge", quantity: 12420, unit: "Cum", rateINR: 8400, amountINR: 104328000 }
    ]);

    // 2. The Sweeping Green Roof (Sloped Forest)
    const roofGeo = new THREE.PlaneGeometry(wedgeWidth + 0.2, wedgeDepth + 0.2);
    const roofMesh = new THREE.Mesh(roofGeo, grassMat.clone());
    // Calculate angle of slope
    const angle = Math.atan2(wedgeFrontHeight - wedgeBackHeight, wedgeDepth);
    roofMesh.rotation.x = -Math.PI / 2 + angle;
    roofMesh.position.set(0, (wedgeFrontHeight + wedgeBackHeight)/2 + 0.1, 0); // Position at center of slope height
    addBimMesh(roofMesh, "JPNIC_GREEN_ROOF", "Audacious Lifted Forest (5th Floor Green Roof)", "L5_GREEN_ROOF", "ALL_ZONES", 12, 11, [
        { id: "SJA_LSCAPE", name: "SJA Consultants Landscape Matrix", type: "SPEC", status: "ACTIVE", weightOrVolume: "18.6 Acres Total" }
    ]);

    // 3. The Grand Gateway Void (The 20m span Arch)
    // To simulate the arch carved out of the wedge, we will place a dark "void" block that acts as the gateway entrance.
    const archVoidGeo = new THREE.BoxGeometry(20, 9, 20); // 20m span, 9m height
    const archVoidMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0, clippingPlanes: [clipPlane] });
    const archVoid = new THREE.Mesh(archVoidGeo, archVoidMat);
    archVoid.position.set(0, 4.5, wedgeDepth/2 + 0.1); // Front and center
    addBimMesh(archVoid, "JPNIC_GATEWAY_ARCH", "Grand Gateway Arch (20m Span, 9m Height)", "L1_MUSEUM", "ZONE_GATEWAY", 8, 8, [
        { id: "VOID_GATE", name: "Framed Entrance Void", type: "ARCHITECTURAL", status: "INSTALLED", weightOrVolume: "20m x 9m" }
    ]);

    // 4. Instanced Terracotta Facade Louvers
    // Archohm used vertical terracotta bars to create JP's image via voids.
    const louverCount = 120;
    const louverGeo = new THREE.BoxGeometry(0.3, wedgeFrontHeight, 0.4);
    const louverInstMesh = new THREE.InstancedMesh(louverGeo, terracottaMat, louverCount);
    
    const dummy = new THREE.Object3D();
    let lIndex = 0;
    const spacing = wedgeWidth / louverCount;
    for(let i=0; i<louverCount; i++) {
        // Skip louvers in the middle to create the Arch void
        const xPos = -wedgeWidth/2 + (i * spacing);
        if (xPos > -10 && xPos < 10) continue; // 20m span hole

        dummy.position.set(xPos, 0, wedgeDepth/2 + 0.5); // Place slightly in front of concrete
        dummy.updateMatrix();
        louverInstMesh.setMatrixAt(lIndex++, dummy.matrix);
    }
    louverInstMesh.count = lIndex; // Update actual rendered count
    louverInstMesh.instanceMatrix.needsUpdate = true;
    louverInstMesh.castShadow = true;
    
    // Wrap instance in a Mesh-like object for raycasting logic in this engine
    louverInstMesh.userData = { 
        entityId: "JPNIC_TERRACOTTA_FACADE", name: "Terreal Terracotta Facade Louvers", 
        level: "L1_MUSEUM", zone: "ALL_ZONES", minWeek: 16, plannedWeek: 15,
        originalColor: 0xaa4a2e, originalEmissive: 0x000000, originalEmissiveIntensity: 0,
        subComponents: [ { id: "CLAD_01", name: "Indigenous Earth-Friendly Terracotta", type: "MATERIAL", status: "INSTALLED", weightOrVolume: "Terreal Specs" } ],
        boqItems: [ { itemCode: "TERREAL-01", description: "Terracotta Cladding", quantity: 18500, unit: "Sqm", rateINR: 4200, amountINR: 77700000 } ]
    };
    pickableMeshes.current.push(louverInstMesh as any);
    bimGroup.add(louverInstMesh);

    // --- MEP INTERNALS (Hidden inside the wedge, visible with Slicer/X-Ray) ---
    const mainDuct = new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, 1.8), ductMat.clone());
    mainDuct.position.set(-15, 12, 10);
    addBimMesh(mainDuct, "MEP_HVAC_DUCT", "Museum Gallery HVAC Duct", "L1_MUSEUM", "ZONE_EXHIBIT", 14, 14);

    const clashNode = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), clashMat.clone());
    clashNode.position.set(-15, 12, 10);
    addBimMesh(clashNode, "CLASH_NODE_01", "SPATIAL CLASH: Duct vs Structural Beam", "L1_MUSEUM", "ZONE_EXHIBIT", 14, 14, [
        { id: "CLASH_1", name: "HVAC Ducting", type: "DUCT", status: "CLASH", weightOrVolume: "Elev: 12.0m" },
        { id: "CLASH_2", name: "Sloped Structural Rib", type: "CONCRETE", status: "CLASH", weightOrVolume: "Elev: 12.0m" }
    ]);


    // Cameras
    cameraStations.forEach((cam) => {
      const isSensor = cam.type === "UG_SENSOR";
      const camMesh = new THREE.Mesh(
          isSensor ? new THREE.BoxGeometry(1.5,1.5,1.5) : new THREE.ConeGeometry(1.5, 3, 16), 
          new THREE.MeshStandardMaterial({ color: cam.type === "CCTV_FIXED" ? 0x06b6d4 : (isSensor ? 0x10b981 : 0xa855f7), emissive: cam.type === "CCTV_FIXED" ? 0x0891b2 : (isSensor ? 0x059669 : 0x7e22ce), emissiveIntensity: 0.6 })
      );
      camMesh.position.set(...cam.position);
      if(!isSensor) camMesh.rotation.x = Math.PI;
      const camLevel = "L1_MUSEUM";
      camMesh.userData = { isCamera: true, cameraData: cam, name: cam.name, originalY: cam.position[1], level: camLevel };
      pickableMeshes.current.push(camMesh as any);
      bimGroup.add(camMesh);
    });

    let isDragging = false, prevX = 0, prevY = 0;
    let sph = { r: 120, phi: Math.PI / 3.0, theta: Math.PI / 5 };

    const updateCameraPos = () => {
      camera.position.x = sph.r * Math.sin(sph.phi) * Math.sin(sph.theta);
      camera.position.y = sph.r * Math.cos(sph.phi);
      camera.position.z = sph.r * Math.sin(sph.phi) * Math.cos(sph.theta);
      camera.lookAt(0, 15, 0); 
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
          const isClash = hit.entityId.includes("CLASH");
          if (isClash) setInspectorTab("CLASH_MATRIX");
          else setInspectorTab("SUB_COMPS");
          
          setSelectedEntity({
            id: hit.entityId, name: hit.name, type: "ELEMENT",
            discipline: isClash ? "DEFECT" : (hit.entityId.includes("TERRACOTTA") || hit.entityId.includes("ROOF") ? "ARCHITECTURAL" : "STRUCTURAL"),
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

  // Z-AXIS CLIP 
  useEffect(() => {
    if (clipPlaneRef.current) {
      clipPlaneRef.current.constant = 40 * (planCutZ / 100);
    }
  }, [planCutZ]);

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
      const zoneMatches = activeZone === "ALL_ZONES" || zone === activeZone || zone === "ZONE_SUBTERRANEAN"; 
      
      mesh.visible = isConstructed && levelMatches;

      if (mesh.userData.edgeLine) {
        mesh.userData.edgeLine.visible = (renderMode === "CAD_EDGES" || renderMode === "X_RAY");
      }

      if (mesh.visible) {
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
        const isSelected = selectedEntity.id === entityId;
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
      { name: "Museum Wedge Foundation", plannedStart: 0, plannedDuration: 4, actualStart: 1, actualDuration: 3, status: "AHEAD", camRef: "CAM-01", hash: "7f4c9a18" },
      { name: "Sloped Concrete Formwork", plannedStart: 4, plannedDuration: 8, actualStart: 4, actualDuration: 8, status: "ON_TIME", camRef: "DRONE", hash: "5b8d8d42" },
      { name: "Terracotta Facade & Green Roof", plannedStart: 12, plannedDuration: 6, actualStart: 14, actualDuration: 6, status: "DELAYED", camRef: "APP", hash: "a90e52a1" },
      { name: "MEP / Interior Clashes", plannedStart: 20, plannedDuration: 4, actualStart: 20, actualDuration: 4, status: "PENDING", camRef: "LEDGER", hash: "Pending" }
    ];
  }, []);

  if (!isHydrated) return <div className="w-full h-[520px] bg-slate-950"></div>;

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Structure:</span>
          {(["ALL", "L1_MUSEUM", "L5_GREEN_ROOF"] as SelectionLevel[]).map((lvl) => (
            <button key={lvl} onClick={() => setActiveLevel(lvl)} className={`px-3 py-1 text-xs font-mono rounded transition-all ${activeLevel === lvl ? "bg-cyan-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
              {lvl.replace("L1_", "").replace("L5_", "").replace("_", " ")}
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="relative w-full h-[500px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            
            <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-700 p-3 rounded-lg backdrop-blur-md w-64 pointer-events-none shadow-2xl">
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-2">JPNIC Smart Escrow Ledger</div>
              <div className="flex justify-between items-center mb-1.5 border-b border-slate-800 pb-1.5"><span className="text-xs text-slate-400">Total Allocated:</span><span className="text-xs font-bold font-mono text-slate-200">₹{(escrowStatus.allocated / 10000000).toFixed(2)}Cr</span></div>
              <div className="flex justify-between items-center mb-1.5 border-b border-slate-800 pb-1.5"><span className="text-xs text-slate-400">Verified & Cleared:</span><span className="text-xs font-bold font-mono text-emerald-400">₹{(escrowStatus.cleared / 10000000).toFixed(2)}Cr</span></div>
            </div>

            <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
              <div className="px-2.5 py-1 bg-slate-900/90 border border-cyan-500/40 rounded text-xs font-mono text-cyan-300 flex items-center gap-2 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> LiveView Phase 13: True JPNIC Architecture
              </div>
              {hoveredTag && <div className="px-2.5 py-1 bg-blue-950/90 border border-blue-400/50 rounded text-xs font-mono text-blue-200 backdrop-blur-md">{hoveredTag}</div>}
            </div>
          </div>
          
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center gap-4"><span className="text-[11px] font-bold text-slate-300 uppercase whitespace-nowrap">Z-Axis Slicer:</span><input type="range" min="0" max="100" step="1" value={planCutZ} onChange={(e) => setPlanCutZ(parseInt(e.target.value, 10))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400" /></div>
        </div>

        {/* 3. INSPECTOR PANEL */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col h-[540px] overflow-hidden">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">Active Selection</div>
          <h3 className="text-base font-bold text-white mb-2">{selectedEntity.name}</h3>
          
          <div className="flex border-b border-slate-800 mb-4 overflow-x-auto">
            <button onClick={() => setInspectorTab("SUB_COMPS")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${inspectorTab === "SUB_COMPS" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500 hover:text-slate-300"}`}>Details</button>
            <button onClick={() => setInspectorTab("BOQ_LEDGER")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${inspectorTab === "BOQ_LEDGER" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500 hover:text-slate-300"}`}>BOQ</button>
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
            ) : inspectorTab === "CLASH_MATRIX" ? (
              <div className="flex flex-col gap-4">
                <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-4">
                  <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-3">AXIS SPATIAL LOCKOUT</div>
                  <h4 className="text-sm font-bold text-slate-200 mb-2">Hard Intersect: Museum HVAC Duct</h4>
                  <p className="text-xs text-slate-400 mb-4">The HVAC duct illegally intersects with the sloped architectural concrete rib. Formwork suspended.</p>
                  <button className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded transition">Raise Coordination RFI</button>
                </div>
              </div>
            ) : null }
          </div>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl flex flex-col gap-4">
        <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3"><span className="font-bold text-slate-200 uppercase tracking-wider">Archohm Schedule Analyzer:</span><span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono font-bold rounded border border-blue-500/30">Week {timelineWeek}</span></div>
        </div>
        <input type="range" min="1" max="24" step="1" value={timelineWeek} onChange={(e) => setTimelineWeek(parseInt(e.target.value, 10))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 mb-2" />
      </div>
    </div>
  );
}
ENGINE_V15_EOF

echo "✓ Phase 13 Applied: True Archohm JPNIC Architecture (Sloped Wedge, Gateway & Terracotta)"
