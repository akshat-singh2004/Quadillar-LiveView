#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo " 1. PURGING NEXT.JS CACHE..."
echo "============================================================"
rm -rf .next
rm -rf node_modules/.cache

echo "============================================================"
echo " 2. INJECTING JPNIC MEP, HVAC & ELEVATOR SYSTEMS..."
echo "============================================================"
mkdir -p components/bim

cat << 'ENGINE_EOF' > components/bim/FullBimSimulationEngine.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export type SelectionLevel = "ALL" | "L0_PODIUM" | "L1_MUSEUM" | "L1_HOTEL_TOWER" | "L2_HELIPAD";
export type SelectionZone = "ALL_ZONES" | "ZONE_WEDGE" | "ZONE_TOWER" | "ZONE_PLAZA";
export type RenderMode = "SOLID" | "CAD_EDGES" | "X_RAY" | "MEP_ISOLATION" | "THERMAL";

export interface SubComponent { id: string; name: string; type: string; status: string; weightOrVolume: string; }
export interface SelectedEntity {
  id: string; name: string; type: string; discipline: string;
  parentLevel: SelectionLevel; parentZone: SelectionZone; subComponents: SubComponent[];
}

export default function FullBimSimulationEngine() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [timelineWeek, setTimelineWeek] = useState<number>(26);
  const [renderMode, setRenderMode] = useState<RenderMode>("MEP_ISOLATION");
  
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, name: "", ifcType: "" });
  const [aiLogs, setAiLogs] = useState<{id: string, agent: string, msg: string, color: string}[]>([]);
  const [opsData, setOpsData] = useState({ occupancy: 1215, powerMw: 2.15, hvacLoad: 68 });

  const defaultEntity: SelectedEntity = {
    id: "ENTIRE_JPNIC", name: "JPNIC • Architectural & MEP Digital Twin", type: "LEVEL", discipline: "MULTI-DISCIPLINARY",
    parentLevel: "ALL", parentZone: "ALL_ZONES", 
    subComponents: [
      { id: "SYS-1", name: "HVAC: 800-Ton Chiller Plant & Risers", type: "MECHANICAL", status: "OPERATIONAL", weightOrVolume: "24,500 CFM" },
      { id: "SYS-2", name: "Vertical Trans: 4-Car High-Speed Elevators", type: "CIRCULATION", status: "ACTIVE", weightOrVolume: "2.5 m/s" },
      { id: "SYS-3", name: "Fire: Main Riser & Sprinkler Grid", type: "PLUMBING", status: "PRESSURIZED", weightOrVolume: "150 PSI" },
      { id: "BIT-3", name: "Arch: 18-Story Hotel Waffle Core", type: "STRUCTURAL", status: "INSTALLED", weightOrVolume: "96m Peak" },
      { id: "BIT-2", name: "Arch: Ellipsoidal Silver Auditorium Dome", type: "SPACE_FRAME", status: "INSTALLED", weightOrVolume: "2,100 Tons" },
      { id: "BIT-5", name: "Arch: 5 Swooping Terracotta Buttress Ribs", type: "CLADDING", status: "INSTALLED", weightOrVolume: "5 Units" }
    ]
  };
  
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(defaultEntity);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const archGroupRef = useRef<THREE.Group | null>(null);
  const mepGroupRef = useRef<THREE.Group | null>(null);
  const pickableMeshes = useRef<THREE.Mesh[]>([]);
  const lastInteractionTime = useRef<number>(Date.now());
  const elevatorsRef = useRef<{mesh: THREE.Mesh, offset: number, speed: number, base: number, range: number}[]>([]);

  const addAiLog = (agent: string, msg: string, color: string) => {
    setAiLogs(prev => {
      if (prev.some(log => log.msg === msg)) return prev;
      return [...prev.slice(-3), { id: Math.random().toString(36).substring(2, 11), agent, msg, color }];
    });
  };

  useEffect(() => {
    setIsHydrated(true);
    addAiLog("MEP_AGENT", "HVAC ducting, chillers, and fire suppression logic loaded.", "text-cyan-400");
    addAiLog("SYS_OPS", "Elevator kinematic physics engine engaged.", "text-emerald-400");
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const t = Date.now() / 1000;
      setOpsData({
        occupancy: Math.round(1200 + Math.sin(t * 0.5) * 45),
        powerMw: +(2.1 + Math.sin(t * 0.8) * 0.2).toFixed(2),
        hvacLoad: Math.round(65 + Math.cos(t * 0.3) * 5)
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isHydrated || !mountRef.current) return;
    const mount = mountRef.current;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.002);

    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 3000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    const dirLight = new THREE.DirectionalLight(0xfff4e6, 2.2);
    dirLight.position.set(140, 180, 120);
    dirLight.castShadow = true;
    const backLight = new THREE.DirectionalLight(0x38bdf8, 0.7);
    backLight.position.set(-120, 90, -140);
    scene.add(ambientLight, dirLight, backLight);

    const grid = new THREE.GridHelper(420, 140, 0x0ea5e9, 0x1e293b);
    scene.add(grid);

    const archGroup = new THREE.Group();
    const mepGroup = new THREE.Group();
    archGroupRef.current = archGroup;
    mepGroupRef.current = mepGroup;
    scene.add(archGroup);
    scene.add(mepGroup);
    pickableMeshes.current = [];
    elevatorsRef.current = [];

    // --- MATERIALS ---
    // Architecture
    const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xd94814, roughness: 0.55 });
    const terracottaDarkMat = new THREE.MeshStandardMaterial({ color: 0xa83208, roughness: 0.7 });
    const darkStructuralMat = new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.85 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.65, roughness: 0.3 });
    const lawnGreenMat = new THREE.MeshStandardMaterial({ color: 0x3f7d20, roughness: 0.9 });
    const glassCyanMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72, roughness: 0.1 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.32 });
    
    // MEP Systems
    const hvacMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.4 }); // Galvanized steel
    const fireMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.3, roughness: 0.4 }); // Red pipes
    const elecMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.2, roughness: 0.6 }); // Yellow trays
    const liftMat = new THREE.MeshStandardMaterial({ color: 0x2dd4bf, metalness: 0.9, roughness: 0.1, emissive: 0x115e59 }); // Cyan glowing elevators

    const addMesh = (mesh: THREE.Mesh, group: THREE.Group, id: string, name: string, isMEP: boolean = false) => {
      const mat = mesh.material as any;
      mesh.userData = {
        id, name, isMEP,
        origColor: mat.color ? mat.color.getHex() : 0xffffff,
        origOpacity: mat.opacity !== undefined ? mat.opacity : 1,
        origTransparent: mat.transparent || false,
      };
      
      if (!isMEP) {
        const edges = new THREE.EdgesGeometry(mesh.geometry, 25);
        const line = new THREE.LineSegments(edges, edgeMat);
        mesh.add(line);
        mesh.userData.edgeLine = line;
      }
      
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      pickableMeshes.current.push(mesh);
      group.add(mesh);
    };

    // =========================================================================
    // 1. ARCHITECTURAL SHELL (THE 6 BITS)
    // =========================================================================
    
    // Bit 1: Green Wedge & Arches
    const bridgeShape = new THREE.Shape();
    bridgeShape.moveTo(-48, 0); bridgeShape.lineTo(48, 0); bridgeShape.lineTo(48, 21); bridgeShape.lineTo(-48, 21); bridgeShape.lineTo(-48, 0);
    const bridgeHole = new THREE.Path(); bridgeHole.moveTo(-34, 0); bridgeHole.quadraticCurveTo(0, 18, 34, 0); bridgeHole.lineTo(-34, 0);
    bridgeShape.holes.push(bridgeHole);
    const bridgeMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(bridgeShape, { depth: 5, bevelEnabled: false }), terracottaMat.clone());
    bridgeMesh.position.set(0, 4, 35);
    addMesh(bridgeMesh, archGroup, "ARCH_BRIDGE", "Terracotta Bridge Arch");

    const greenSlope = new THREE.Mesh(new THREE.BoxGeometry(50, 3.2, 52), lawnGreenMat.clone());
    greenSlope.rotation.x = 0.25; greenSlope.position.set(0, 11.5, 63);
    addMesh(greenSlope, archGroup, "ARCH_WEDGE", "Green Amphitheatre Roof");

    // Bit 2: Silver Dome
    const silverDome = new THREE.Mesh(new THREE.SphereGeometry(21, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2), domeMat.clone());
    silverDome.scale.set(1.42, 0.56, 0.92); silverDome.position.set(0, 15.5, 17);
    addMesh(silverDome, archGroup, "ARCH_DOME", "Silver Ellipsoidal Dome");

    // Bit 3: Tower Core & Waffle
    const towerCore = new THREE.Mesh(new THREE.BoxGeometry(78, 76, 22), darkStructuralMat.clone());
    towerCore.position.set(0, 42, -12);
    addMesh(towerCore, archGroup, "ARCH_CORE", "18-Story Structural Core");

    for (let fl = 1; fl <= 8; fl++) {
      const slabBand = new THREE.Mesh(new THREE.BoxGeometry(76, 1.3, 2.5), terracottaDarkMat.clone());
      slabBand.position.set(0, 20 + fl * 7.2, -1.2);
      addMesh(slabBand, archGroup, "ARCH_WAFFLE", "Terracotta Floor Slab");
    }

    const diagGlassShape = new THREE.Shape();
    diagGlassShape.moveTo(-26, 31); diagGlassShape.lineTo(28, 31); diagGlassShape.lineTo(28, 67); diagGlassShape.lineTo(-26, 31);
    const diagGlassMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(diagGlassShape, { depth: 1.8, bevelEnabled: false }), glassCyanMat.clone());
    diagGlassMesh.position.set(0, 4, -0.8);
    addMesh(diagGlassMesh, archGroup, "ARCH_GLASS", "Diagonal Triangle Curtain Wall");

    // Bit 4 & 5: East Prow, Rear Ribs & Plant Box
    const prowShape = new THREE.Shape();
    prowShape.moveTo(2, 0); prowShape.lineTo(-56, 0); prowShape.lineTo(-14, 94); prowShape.lineTo(2, 94); prowShape.lineTo(2, 0);
    const prowGeo = new THREE.ExtrudeGeometry(prowShape, { depth: 9, bevelEnabled: false }); prowGeo.rotateY(Math.PI / 2);
    const prowMesh = new THREE.Mesh(prowGeo, terracottaMat.clone());
    prowMesh.position.set(36, 4, 0);
    addMesh(prowMesh, archGroup, "ARCH_PROW", "East Prow Wall");

    for (let r = 0; r < 5; r++) {
      const ribH = 78 + r * 3.2;
      const ribShape = new THREE.Shape();
      ribShape.moveTo(0, 0); ribShape.lineTo(26, 0); ribShape.bezierCurveTo(18, ribH * 0.35, 12, ribH * 0.58, 27, ribH * 0.84); ribShape.quadraticCurveTo(16, ribH * 1.02, 0, ribH); ribShape.lineTo(0, 0);
      const ribGeo = new THREE.ExtrudeGeometry(ribShape, { depth: 4.8, bevelEnabled: false }); ribGeo.rotateY(-Math.PI / 2);
      const ribMesh = new THREE.Mesh(ribGeo, terracottaMat.clone());
      ribMesh.position.set(-30 + r * 14.5, 4, -22);
      addMesh(ribMesh, archGroup, `ARCH_RIB_${r}`, "Swooping Buttress Rib");
    }

    const rearCantileverBox = new THREE.Mesh(new THREE.BoxGeometry(58, 16, 13), darkStructuralMat.clone());
    rearCantileverBox.position.set(-4, 24, -36);
    addMesh(rearCantileverBox, archGroup, "ARCH_PLANT_BOX", "Rear Cantilevered Plant Box");

    // Bit 6: Helipad
    const heliDisc = new THREE.Mesh(new THREE.CylinderGeometry(19, 17.5, 2.4, 48), concreteMat.clone());
    heliDisc.position.set(-10, 90.5, -12);
    addMesh(heliDisc, archGroup, "ARCH_HELIPAD", "Cantilevered Helipad");

    // =========================================================================
    // 2. MEP & HVAC INTERNAL SYSTEMS
    // =========================================================================
    
    // A. Vertical Circulation: High-Speed Elevators in the Core
    const elevatorCoreX = -12;
    for (let i = 0; i < 4; i++) {
      // Guide Rails
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 74, 0.6), hvacMat.clone());
      rail.position.set(elevatorCoreX + i * 5, 41, -14);
      addMesh(rail, mepGroup, "MEP_LIFT_RAIL", "Elevator Guide Rail", true);
      
      // Dynamic Elevator Cars
      const liftCar = new THREE.Mesh(new THREE.BoxGeometry(3.5, 4.5, 3.5), liftMat.clone());
      liftCar.position.set(elevatorCoreX + i * 5, 10, -14);
      addMesh(liftCar, mepGroup, "MEP_LIFT_CAR", `Passenger Elevator Car 0${i+1}`, true);
      
      // Store for animation: base height 40, travel range 34
      elevatorsRef.current.push({ mesh: liftCar, offset: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.4, base: 42, range: 32 });
    }

    // B. HVAC: Central Chillers & Ducts
    // Chiller units in the rear cantilever box
    for (let i = 0; i < 3; i++) {
      const chillerBase = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 4), hvacMat.clone());
      chillerBase.position.set(-18 + i * 12, 21, -36);
      const fan1 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1, 16), darkStructuralMat.clone());
      fan1.position.set(-18 + i * 12 - 2, 24.5, -36);
      const fan2 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1, 16), darkStructuralMat.clone());
      fan2.position.set(-18 + i * 12 + 2, 24.5, -36);
      addMesh(chillerBase, mepGroup, "MEP_CHILLER", `800-Ton VFD Chiller Unit 0${i+1}`, true);
      mepGroup.add(fan1); mepGroup.add(fan2);
    }

    // Main Vertical HVAC Riser Shaft
    const mainRiser = new THREE.Mesh(new THREE.BoxGeometry(3.5, 74, 4.5), hvacMat.clone());
    mainRiser.position.set(12, 41, -12);
    addMesh(mainRiser, mepGroup, "MEP_HVAC_RISER", "Primary Vertical AHU Supply Riser", true);

    // Floor-by-Floor Horizontal VAV Ducts (Running across the waffle grid)
    for (let fl = 1; fl <= 8; fl++) {
      const floorY = 20 + fl * 7.2;
      const horizDuct = new THREE.Mesh(new THREE.BoxGeometry(64, 1.2, 1.8), hvacMat.clone());
      horizDuct.position.set(0, floorY + 1.5, -6);
      addMesh(horizDuct, mepGroup, "MEP_HVAC_BRANCH", `Floor ${fl} VAV Distribution Duct`, true);
      
      // Connector from riser to branch
      const connector = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 6), hvacMat.clone());
      connector.position.set(12, floorY + 1.5, -9);
      mepGroup.add(connector);
    }

    // Specialized Acoustic HVAC Ring inside the Silver Dome
    const domeRingDuct = new THREE.Mesh(new THREE.TorusGeometry(12, 0.8, 16, 48), hvacMat.clone());
    domeRingDuct.rotation.x = Math.PI / 2;
    domeRingDuct.position.set(0, 16, 17);
    addMesh(domeRingDuct, mepGroup, "MEP_DOME_HVAC", "Auditorium Acoustic Air Supply Ring", true);

    // C. Fire Suppression (Plumbing)
    const fireRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 74, 16), fireMat.clone());
    fireRiser.position.set(-18, 41, -8);
    addMesh(fireRiser, mepGroup, "MEP_FIRE_RISER", "Primary Fire Suppression Water Riser", true);
    
    // Horizontal Fire Mains
    for (let fl = 1; fl <= 8; fl++) {
      const fireMain = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 68, 8), fireMat.clone());
      fireMain.rotation.z = Math.PI / 2;
      fireMain.position.set(0, 20 + fl * 7.2 + 2.5, -8);
      addMesh(fireMain, mepGroup, "MEP_FIRE_MAIN", `Floor ${fl} Sprinkler Main`, true);
    }

    // D. Electrical Trays
    const elecRiser = new THREE.Mesh(new THREE.BoxGeometry(1.5, 74, 1), elecMat.clone());
    elecRiser.position.set(-20, 41, -12);
    addMesh(elecRiser, mepGroup, "MEP_ELEC_RISER", "Main HT/LT Electrical Cable Tray", true);

    // --- CAMERA CONTROLS ---
    let isDragging = false, prevX = 0, prevY = 0;
    let sph = { r: 180, phi: Math.PI / 2.8, theta: -Math.PI / 6 };

    const updateCameraPos = () => {
      camera.position.x = sph.r * Math.sin(sph.phi) * Math.sin(sph.theta);
      camera.position.y = sph.r * Math.cos(sph.phi);
      camera.position.z = sph.r * Math.sin(sph.phi) * Math.cos(sph.theta);
      camera.lookAt(0, 38, 5);
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
      const hits = raycaster.intersectObjects(pickableMeshes.current.filter(m => m.visible), false);

      if (hits.length > 0 && !isDragging) {
        mount.style.cursor = "pointer";
        setTooltip({ visible: true, x: e.clientX, y: e.clientY, name: hits[0].object.userData.name, ifcType: hits[0].object.userData.id });
      } else {
        mount.style.cursor = isDragging ? "grabbing" : "grab";
        setTooltip(prev => ({ ...prev, visible: false }));
      }

      if (!isDragging) return;
      sph.theta -= (e.clientX - prevX) * 0.007;
      sph.phi = Math.max(0.12, Math.min(Math.PI / 2.05, sph.phi - (e.clientY - prevY) * 0.007));
      prevX = e.clientX; prevY = e.clientY;
      updateCameraPos();
    };

    mount.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    mount.addEventListener("wheel", (e) => {
      e.preventDefault(); lastInteractionTime.current = Date.now();
      sph.r = Math.max(55, Math.min(340, sph.r + e.deltaY * 0.12));
      updateCameraPos();
    }, { passive: false });

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
      
      // Animate Elevators
      elevatorsRef.current.forEach(e => {
        e.mesh.position.y = e.base + Math.sin(t * e.speed + e.offset) * e.range;
      });

      if (Date.now() - lastInteractionTime.current > 6000 && !isDragging) {
        sph.theta -= 0.0015; updateCameraPos();
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
      ro.disconnect();
      renderer.dispose();
    };
  }, [isHydrated]);

  useEffect(() => {
    if (!archGroupRef.current || !mepGroupRef.current || !isHydrated) return;

    // Architectural Shell Material Management
    archGroupRef.current.children.forEach((obj: THREE.Object3D) => {
      if(obj.type !== "Mesh") return;
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as any;
      const ud = mesh.userData;
      
      if (ud.edgeLine) ud.edgeLine.visible = renderMode === "SOLID" || renderMode === "CAD_EDGES" || renderMode === "X_RAY";
      
      if (renderMode === "MEP_ISOLATION") {
        // Ghost Mode for Architecture
        mat.transparent = true;
        mat.opacity = 0.06;
        mat.wireframe = false;
        mat.color.setHex(0x334155);
        mat.depthWrite = false;
      } else if (renderMode === "X_RAY") {
        mat.transparent = true;
        mat.opacity = 0.25;
        mat.wireframe = true;
        if (ud.origColor) mat.color.setHex(ud.origColor);
        mat.depthWrite = true;
      } else {
        // Solid Mode
        mat.transparent = ud.origTransparent;
        mat.opacity = ud.origOpacity;
        mat.wireframe = false;
        if (ud.origColor) mat.color.setHex(ud.origColor);
        mat.depthWrite = true;
      }
    });

    // MEP Systems Material Management
    mepGroupRef.current.children.forEach((obj: THREE.Object3D) => {
      if(obj.type !== "Mesh") return;
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as any;
      const ud = mesh.userData;
      
      if (renderMode === "SOLID" || renderMode === "CAD_EDGES") {
        // Hide MEP completely if architecture is solid
        mesh.visible = false;
      } else if (renderMode === "MEP_ISOLATION") {
        // Hero Mode for MEP
        mesh.visible = true;
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.wireframe = false;
      } else if (renderMode === "X_RAY") {
        mesh.visible = true;
        mat.transparent = true;
        mat.opacity = 0.8;
        mat.wireframe = false;
      }
    });

  }, [renderMode, isHydrated]);

  const setPresetAngle = (theta: number, phi: number, r: number) => {
    if (sceneRef.current && sceneRef.current.userData.sph) {
      sceneRef.current.userData.sph.theta = theta; sceneRef.current.userData.sph.phi = phi; sceneRef.current.userData.sph.r = r;
      sceneRef.current.userData.updateCameraPos();
      lastInteractionTime.current = Date.now();
    }
  };

  if (!isHydrated) return <div className="w-full h-[520px] bg-slate-950"></div>;

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl relative z-20">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-lg overflow-x-auto">
          {(["SOLID", "CAD_EDGES", "X_RAY", "MEP_ISOLATION"] as const).map((mode) => (
            <button key={mode} onClick={() => setRenderMode(mode)} className={`px-2.5 py-1 text-xs font-mono rounded font-semibold transition ${renderMode === mode ? (mode === "MEP_ISOLATION" ? "bg-red-500 text-white" : "bg-cyan-500 text-slate-950") : "text-slate-400 hover:text-slate-200"}`}>
              {mode.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <button onClick={() => setPresetAngle(-Math.PI * 0.78, Math.PI / 3.1, 200)} className="px-2.5 py-1 text-[11px] font-mono bg-orange-950/70 border border-orange-500/40 text-orange-300 rounded hover:bg-orange-900/60">
            📸 REAR PLANT BOX
          </button>
          <button onClick={() => setPresetAngle(Math.PI * 0.18, Math.PI / 3.4, 210)} className="px-2.5 py-1 text-[11px] font-mono bg-blue-950/70 border border-blue-500/40 text-blue-300 rounded hover:bg-blue-900/60">
            📸 DOME ACOUSTICS
          </button>
          <button onClick={() => setPresetAngle(0, Math.PI / 2.9, 175)} className="px-2.5 py-1 text-[11px] font-mono bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 rounded hover:bg-emerald-900/60">
            📸 FRONT HVAC GRID
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 relative h-[520px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
          {tooltip.visible && (
            <div style={{ left: tooltip.x + 15, top: tooltip.y + 15 }} className="fixed bg-slate-900/95 border border-slate-700 rounded p-2 pointer-events-none z-50 shadow-xl backdrop-blur-sm">
              <div className="text-xs font-bold text-white mb-0.5">{tooltip.name}</div>
              <div className="text-[10px] font-mono text-cyan-400">ID: {tooltip.ifcType}</div>
            </div>
          )}
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
          <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-slate-800 p-2.5 rounded-lg backdrop-blur-md w-80 pointer-events-none z-10 shadow-2xl">
            <div className="text-[10px] font-bold font-mono text-slate-400 mb-1 border-b border-slate-800 pb-0.5">MULTI-AGENT HIVE</div>
            <div className="flex flex-col gap-1 mt-1">
              {aiLogs.map((log) => (
                <div key={log.id} className="text-[10px] font-mono truncate"><span className="text-slate-500">[{log.agent}]</span> <span className={log.color}>{log.msg}</span></div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col h-[520px] overflow-hidden">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">Active Viewport Selection</div>
          <h3 className="text-sm font-bold text-white mb-3 truncate">{selectedEntity.name}</h3>
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
            {selectedEntity.subComponents.map(comp => (
              <div key={comp.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex justify-between items-center">
                <div>
                  <div className={`text-xs font-bold ${comp.type === "MECHANICAL" || comp.type === "PLUMBING" ? "text-red-300" : "text-slate-200"}`}>{comp.name}</div>
                  <div className="text-[10px] font-mono text-slate-500">{comp.type} • {comp.weightOrVolume}</div>
                </div>
                <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">{comp.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
ENGINE_EOF

echo "============================================================"
echo "✓ JPNIC MEP & ELEVATOR SYSTEMS INJECTED SUCESSFULLY!"
echo "============================================================"
