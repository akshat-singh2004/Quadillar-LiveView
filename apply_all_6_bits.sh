#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo " 1. CLEARING STALE NEXT.JS BUILD CACHE..."
echo "============================================================"
rm -rf .next
rm -rf node_modules/.cache

echo "============================================================"
echo " 2. WRITING COMPONENTS/BIM/FULLBIMSIMULATIONENGINE.TSX..."
echo "============================================================"
mkdir -p components/bim

cat << 'ENGINE_EOF' > components/bim/FullBimSimulationEngine.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

export type SelectionLevel = "ALL" | "L0_PODIUM" | "L1_MUSEUM" | "L1_HOTEL_TOWER" | "L2_HELIPAD";
export type SelectionZone = "ALL_ZONES" | "ZONE_WEDGE" | "ZONE_TOWER" | "ZONE_PLAZA";
export type RenderMode = "SOLID" | "CAD_EDGES" | "X_RAY" | "LIDAR_SCAN" | "ANATOMY" | "IOT_MESH" | "THERMAL";
export type CameraMode = "ORBIT" | "DRONE_FPV" | "CRANE_CAM";

export interface DocumentRecord { id: string; title: string; type: "PDF" | "DWG" | "RFI"; date: string; status: "APPROVED" | "PENDING"; hash: string; }
export interface BOQLineItem { itemCode: string; description: string; quantity: number; unit: string; rateINR: number; amountINR: number; carbonKg: number; }
export interface SubComponent { id: string; name: string; type: string; status: "INSTALLED" | "OPERATIONAL" | "IN_PROGRESS"; weightOrVolume: string; }

export interface SelectedEntity {
  id: string; name: string; type: "LEVEL" | "ZONE" | "ELEMENT"; discipline: "CIVIL" | "STRUCTURAL" | "MEP" | "ARCHITECTURAL";
  parentLevel: SelectionLevel; parentZone: SelectionZone; subComponents: SubComponent[]; boqItems: BOQLineItem[]; cdeDocs: DocumentRecord[];
}

export default function FullBimSimulationEngine() {
  const mountRef = useRef<HTMLDivElement>(null);

  const [isHydrated, setIsHydrated] = useState(false);
  const [timelineWeek, setTimelineWeek] = useState<number>(24);
  const [renderMode, setRenderMode] = useState<RenderMode>("SOLID");
  const [camMode, setCamMode] = useState<CameraMode>("ORBIT");
  
  const [tooltip, setTooltip] = useState<{visible: boolean, x: number, y: number, name: string, ifcType: string, week: number}>({
    visible: false, x: 0, y: 0, name: "", ifcType: "", week: 0
  });
  const [inspectorTab, setInspectorTab] = useState<"SUB_COMPS" | "BOQ_LEDGER" | "CDE_DOCS">("SUB_COMPS");
  const [aiLogs, setAiLogs] = useState<{id: string, agent: string, msg: string, color: string}[]>([]);
  const [opsData, setOpsData] = useState({ occupancy: 1215, powerMw: 2.15, hvacLoad: 68 });

  const defaultEntity: SelectedEntity = {
    id: "ENTIRE_JPNIC", name: "Jai Prakash Narayan International Centre (JPNIC)", type: "LEVEL", discipline: "ARCHITECTURAL",
    parentLevel: "ALL", parentZone: "ALL_ZONES", 
    subComponents: [
      { id: "BIT-1", name: "Bit 1: Stepped Green Wedge, Dual Arch Portals & Rotunda", type: "LANDSCAPE_PODIUM", status: "INSTALLED", weightOrVolume: "24,500 Sqm" },
      { id: "BIT-2", name: "Bit 2: Oblong Silver Auditorium Dome & Louvered Roof", type: "SPACE_FRAME", status: "INSTALLED", weightOrVolume: "2,100 Tons" },
      { id: "BIT-3", name: "Bit 3: 18-Story Hotel Waffle Core & Diagonal Glazing", type: "RCC_TOWER", status: "INSTALLED", weightOrVolume: "96m Peak" },
      { id: "BIT-4", name: "Bit 4: Razor-Sharp Triangular East Prow Wall", type: "TERRACOTTA_CLADDING", status: "INSTALLED", weightOrVolume: "18,450 Sqm" },
      { id: "BIT-5", name: "Bit 5: 5 Sculptural Swooping Buttress Ribs & Plant Box", type: "TERRACOTTA_BUTTRESS", status: "INSTALLED", weightOrVolume: "5 Units" },
      { id: "BIT-6", name: "Bit 6: Cantilevered Circular Helipad Disc & Crown Cage", type: "AVIATION_DECK", status: "OPERATIONAL", weightOrVolume: "38m Dia" }
    ],
    boqItems: [
      { itemCode: "TERRA-CLAD", description: "Terreal Red-Orange Terracotta Rain-Screen & Ribs", quantity: 18450, unit: "Sqm", rateINR: 5200, amountINR: 95940000, carbonKg: 3820000 },
      { itemCode: "DOME-ALUM", description: "Kalzip Standing Seam Ellipsoidal Acoustic Dome", quantity: 1, unit: "LS", rateINR: 42000000, amountINR: 42000000, carbonKg: 1450000 },
      { itemCode: "HELI-DECK", description: "Post-Tensioned Concrete Cantilever Helipad Disc", quantity: 1, unit: "LS", rateINR: 18500000, amountINR: 18500000, carbonKg: 620000 }
    ],
    cdeDocs: [
      { id: "DOC-001", title: "Archohm_JPNIC_Master_Elevation_GFC.dwg", type: "DWG", date: "2026-01-15", status: "APPROVED", hash: "8f4c9a1...3c10a" },
      { id: "DOC-002", title: "Terreal_Terracotta_Buttress_Rib_Detail.pdf", type: "PDF", date: "2026-03-12", status: "APPROVED", hash: "a1b2c3d...e4f5" }
    ]
  };
  
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(defaultEntity);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const elementsGroupRef = useRef<THREE.Group | null>(null);
  const pickableMeshes = useRef<THREE.Mesh[]>([]);
  const lastInteractionTime = useRef<number>(Date.now());
  const craneRef = useRef<THREE.Group | null>(null);
  const craneJibRef = useRef<THREE.Group | null>(null);

  const addAiLog = (agent: string, msg: string, color: string) => {
    setAiLogs(prev => {
      if (prev.some(log => log.msg === msg)) return prev;
      const uniqueId = Math.random().toString(36).substring(2, 11);
      return [...prev.slice(-4), { id: uniqueId, agent, msg, color }];
    });
  };

  const isHandover = timelineWeek >= 24;

  useEffect(() => {
    setIsHydrated(true);
    addAiLog("SYS", "True Studio Archohm JPNIC Geometry (6 Bits) initialized.", "text-cyan-400");
    addAiLog("CV_AGENT", "5 Buttress Ribs, Prow, Dome & Helipad verified against site telemetry.", "text-emerald-400");
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
    if (!isHydrated) return;
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.0015);
    scene.userData.activeCamMode = "ORBIT";

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 540;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 3000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    const dirLight = new THREE.DirectionalLight(0xfff4e6, 2.2);
    dirLight.position.set(140, 180, 120);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;

    const backLight = new THREE.DirectionalLight(0x38bdf8, 0.7);
    backLight.position.set(-120, 90, -140);
    scene.add(ambientLight, dirLight, backLight);

    const grid = new THREE.GridHelper(420, 140, 0x0ea5e9, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    const bimGroup = new THREE.Group();
    elementsGroupRef.current = bimGroup;
    scene.add(bimGroup);
    pickableMeshes.current = [];

    // --- ARCHITECTURAL MATERIAL PALETTE ---
    const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xd94814, roughness: 0.55, metalness: 0.12 });
    const terracottaDarkMat = new THREE.MeshStandardMaterial({ color: 0xa83208, roughness: 0.7, metalness: 0.1 });
    const darkStructuralMat = new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.85, metalness: 0.3 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    const foundationMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 1.0 });
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.65, roughness: 0.3 });
    const lawnGreenMat = new THREE.MeshStandardMaterial({ color: 0x3f7d20, roughness: 0.9 });
    const whiteStuccoMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
    const glassCyanMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72, roughness: 0.1, metalness: 0.85 });
    const steelWireMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3, wireframe: true });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.32 });

    const addBimMesh = (
      mesh: THREE.Mesh,
      entityId: string,
      name: string,
      level: SelectionLevel,
      zone: SelectionZone,
      minWeek: number,
      cdeDocs: DocumentRecord[] = []
    ) => {
      const mat = mesh.material as any;
      let thermalIndex = 0x0f172a;
      if (entityId.includes("GLZ") || entityId.includes("TOWER") || entityId.includes("HELIPAD")) thermalIndex = 0xef4444;
      else if (entityId.includes("RIB") || entityId.includes("PROW") || entityId.includes("DOME")) thermalIndex = 0xf59e0b;

      mesh.userData = {
        entityId, name, level, zone, minWeek,
        originalColor: mat.color ? mat.color.getHex() : 0xffffff,
        originalOpacity: mat.opacity !== undefined ? mat.opacity : 1,
        originalTransparent: mat.transparent || false,
        thermalColor: thermalIndex,
        cdeDocs
      };

      const edges = new THREE.EdgesGeometry(mesh.geometry, 25);
      const line = new THREE.LineSegments(edges, edgeMat);
      mesh.add(line);
      mesh.userData.edgeLine = line;

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      pickableMeshes.current.push(mesh);
      bimGroup.add(mesh);
    };

    // =========================================================================
    // BIT 0: BASE PLINTH & SUBTERRANEAN PILES (WEEK 1-3)
    // =========================================================================
    const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(116, 4, 150), foundationMat.clone());
    basePlinth.position.set(0, 2, 22);
    addBimMesh(basePlinth, "JPNIC_BASE_PLINTH", "Master Campus Concrete Raft & Podium", "L0_PODIUM", "ZONE_PLAZA", 1);

    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 14, 12), concreteMat.clone());
        pile.position.set(c * 20, -7, r * 24 + 10);
        addBimMesh(pile, "JPNIC_PILES", "Subterranean RCC Friction Piles", "L0_PODIUM", "ZONE_PLAZA", 1);
      }
    }

    // =========================================================================
    // BIT 1: STEPPED GREEN WEDGE, DUAL ARCH PORTALS & ROTUNDA (WEEK 4-7)
    // =========================================================================
    // 1A. Wide Terracotta Bridge Arch
    const bridgeShape = new THREE.Shape();
    bridgeShape.moveTo(-48, 0);
    bridgeShape.lineTo(48, 0);
    bridgeShape.lineTo(48, 21);
    bridgeShape.lineTo(-48, 21);
    bridgeShape.lineTo(-48, 0);

    const bridgeHole = new THREE.Path();
    bridgeHole.moveTo(-34, 0);
    bridgeHole.quadraticCurveTo(0, 18, 34, 0);
    bridgeHole.lineTo(-34, 0);
    bridgeShape.holes.push(bridgeHole);

    const bridgeGeo = new THREE.ExtrudeGeometry(bridgeShape, { depth: 5, bevelEnabled: false });
    const bridgeMesh = new THREE.Mesh(bridgeGeo, terracottaMat.clone());
    bridgeMesh.position.set(0, 4, 35);
    addBimMesh(bridgeMesh, "JPNIC_BRIDGE_ARCH", "Monumental Terracotta Bridge Archway", "L0_PODIUM", "ZONE_WEDGE", 5);

    // 1B. Sloped Green Landscaped Wedge Ramp
    const greenSlopeGeo = new THREE.BoxGeometry(50, 3.2, 52);
    const greenSlopeMesh = new THREE.Mesh(greenSlopeGeo, lawnGreenMat.clone());
    greenSlopeMesh.rotation.x = 0.25;
    greenSlopeMesh.position.set(0, 11.5, 63);
    addBimMesh(greenSlopeMesh, "JPNIC_GREEN_WEDGE", "Sloped Landscaped Green Amphitheatre Roof", "L0_PODIUM", "ZONE_WEDGE", 6);

    // 1C. Lower South Terracotta Tunnel Arch Portal
    const lowerArchShape = new THREE.Shape();
    lowerArchShape.moveTo(-24, 0);
    lowerArchShape.lineTo(24, 0);
    lowerArchShape.lineTo(24, 10);
    lowerArchShape.lineTo(-24, 10);
    lowerArchShape.lineTo(-24, 0);

    const lowerHole = new THREE.Path();
    lowerHole.moveTo(-14, 0);
    lowerHole.quadraticCurveTo(0, 8.5, 14, 0);
    lowerHole.lineTo(-14, 0);
    lowerArchShape.holes.push(lowerHole);

    const lowerArchGeo = new THREE.ExtrudeGeometry(lowerArchShape, { depth: 8, bevelEnabled: false });
    const lowerArchMesh = new THREE.Mesh(lowerArchGeo, terracottaMat.clone());
    lowerArchMesh.position.set(0, 4, 83);
    addBimMesh(lowerArchMesh, "JPNIC_LOWER_PORTAL", "South Amphitheatre Curved Tunnel Portal", "L0_PODIUM", "ZONE_WEDGE", 6);

    // 1D. Flanking Terraces & Outer Retaining Walls
    for (let side of [-1, 1]) {
      const stepDeck = new THREE.Mesh(new THREE.BoxGeometry(18, 12, 48), darkStructuralMat.clone());
      stepDeck.position.set(side * 34, 10, 62);
      addBimMesh(stepDeck, "JPNIC_SKYLIGHT_TERRACE", "Stepped Podium Skylight Louver Deck", "L0_PODIUM", "ZONE_WEDGE", 6);

      const outerWall = new THREE.Mesh(new THREE.BoxGeometry(3.5, 18, 92), terracottaMat.clone());
      outerWall.position.set(side * 46, 13, 38);
      addBimMesh(outerWall, "JPNIC_PERIMETER_WALL", "Terracotta Podium Retaining Wall", "L0_PODIUM", "ZONE_WEDGE", 5);
    }

    // 1E. White Cylindrical Museum Rotunda Drum
    const whiteRotunda = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 11.5, 11, 32), whiteStuccoMat.clone());
    whiteRotunda.position.set(-31, 9.5, 76);
    addBimMesh(whiteRotunda, "JPNIC_WHITE_ROTUNDA", "Museum Exhibition White Rotunda Drum", "L1_MUSEUM", "ZONE_WEDGE", 7);

    // =========================================================================
    // BIT 2: OBLONG SILVER ACOUSTIC DOME & TERRACOTTA LOUVERED ROOF (WEEK 8-11)
    // =========================================================================
    const domeBase = new THREE.Mesh(new THREE.BoxGeometry(88, 12, 38), darkStructuralMat.clone());
    domeBase.position.set(0, 10, 16);
    addBimMesh(domeBase, "JPNIC_MUSEUM_CONCOURSE", "Interpretation Centre Concourse Hall", "L1_MUSEUM", "ZONE_WEDGE", 8);

    const domeGeo = new THREE.SphereGeometry(21, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const silverDome = new THREE.Mesh(domeGeo, domeMat.clone());
    silverDome.scale.set(1.42, 0.56, 0.92);
    silverDome.position.set(0, 15.5, 17);
    addBimMesh(silverDome, "JPNIC_SILVER_DOME", "Kalzip Ellipsoidal Silver Auditorium Dome", "L1_MUSEUM", "ZONE_WEDGE", 9);

    for (let i = 0; i < 7; i++) {
      const louverWest = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 26), terracottaDarkMat.clone());
      louverWest.position.set(-41 + i * 2.2, 17, 16);
      addBimMesh(louverWest, "JPNIC_ROOF_LOUVERS", "Terracotta Acoustic Roof Louvers (West)", "L1_MUSEUM", "ZONE_WEDGE", 10);

      const louverEast = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 26), terracottaDarkMat.clone());
      louverEast.position.set(27 + i * 2.2, 17, 16);
      addBimMesh(louverEast, "JPNIC_ROOF_LOUVERS", "Terracotta Acoustic Roof Louvers (East)", "L1_MUSEUM", "ZONE_WEDGE", 10);
    }

    // =========================================================================
    // BIT 3: 18-STORY MAIN TOWER BLOCK, WAFFLE GRID & DIAGONAL GLASS (WEEK 12-16)
    // =========================================================================
    // 3A. Main Recessed Dark Structural Tower Core
    const towerCore = new THREE.Mesh(new THREE.BoxGeometry(78, 76, 22), darkStructuralMat.clone());
    towerCore.position.set(0, 42, -12);
    addBimMesh(towerCore, "JPNIC_TOWER_CORE", "18-Story Hotel & Convention Structural Core", "L1_HOTEL_TOWER", "ZONE_TOWER", 12);

    // 3B. Terracotta Waffle Grid Mullions & Slabs
    for (let fl = 1; fl <= 8; fl++) {
      const slabBand = new THREE.Mesh(new THREE.BoxGeometry(76, 1.3, 2.5), terracottaDarkMat.clone());
      slabBand.position.set(0, 20 + fl * 7.2, -1.2);
      addBimMesh(slabBand, "JPNIC_WAFFLE_GRID", "Front Facade Terracotta Brise-Soleil Grid", "L1_HOTEL_TOWER", "ZONE_TOWER", 13);
    }
    for (let col = -4; col <= 4; col++) {
      const colMullion = new THREE.Mesh(new THREE.BoxGeometry(1.2, 58, 2.2), terracottaDarkMat.clone());
      colMullion.position.set(col * 8.2, 49, -1.2);
      addBimMesh(colMullion, "JPNIC_WAFFLE_GRID", "Front Facade Vertical Structural Piers", "L1_HOTEL_TOWER", "ZONE_TOWER", 13);
    }

    // 3C. Diagonal Triangular Glass Curtain Wall
    const diagGlassShape = new THREE.Shape();
    diagGlassShape.moveTo(-26, 31);
    diagGlassShape.lineTo(28, 31);
    diagGlassShape.lineTo(28, 67);
    diagGlassShape.lineTo(-26, 31);
    const diagGlassGeo = new THREE.ExtrudeGeometry(diagGlassShape, { depth: 1.8, bevelEnabled: false });
    const diagGlassMesh = new THREE.Mesh(diagGlassGeo, glassCyanMat.clone());
    diagGlassMesh.position.set(0, 4, -0.8);
    addBimMesh(diagGlassMesh, "JPNIC_DIAGONAL_GLZ", "Atrium Diagonal Triangular Curtain Wall", "L1_HOTEL_TOWER", "ZONE_TOWER", 15);

    // 3D. West Structural Shear Wall Pier
    const westPier = new THREE.Mesh(new THREE.BoxGeometry(8, 78, 24), terracottaMat.clone());
    westPier.position.set(-41, 43, -12);
    addBimMesh(westPier, "JPNIC_WEST_PIER", "West Tower Structural Shear Wall Pier", "L1_HOTEL_TOWER", "ZONE_TOWER", 12);

    // =========================================================================
    // BIT 4: SHARP TRIANGULAR EAST PROW WALL & ASYMMETRIC PEAK (WEEK 14-17)
    // =========================================================================
    // 4A. Diagonal East Prow Wall
    const prowShape = new THREE.Shape();
    prowShape.moveTo(2, 0);
    prowShape.lineTo(-56, 0);
    prowShape.lineTo(-14, 94);
    prowShape.lineTo(2, 94);
    prowShape.lineTo(2, 0);

    const prowGeo = new THREE.ExtrudeGeometry(prowShape, { depth: 9, bevelEnabled: false });
    prowGeo.rotateY(Math.PI / 2);
    const prowMesh = new THREE.Mesh(prowGeo, terracottaMat.clone());
    prowMesh.position.set(36, 4, 0);
    addBimMesh(prowMesh, "JPNIC_EAST_PROW", "Signature Triangular East Terracotta Prow Wall", "L1_HOTEL_TOWER", "ZONE_TOWER", 14);

    // 4B. Asymmetric Triangular Roof Parapet
    const topWedgeShape = new THREE.Shape();
    topWedgeShape.moveTo(0, 76);
    topWedgeShape.lineTo(44, 76);
    topWedgeShape.lineTo(44, 94);
    topWedgeShape.lineTo(0, 76);
    const topWedgeGeo = new THREE.ExtrudeGeometry(topWedgeShape, { depth: 22, bevelEnabled: false });
    const topWedgeMesh = new THREE.Mesh(topWedgeGeo, terracottaMat.clone());
    topWedgeMesh.position.set(0, 4, -23);
    addBimMesh(topWedgeMesh, "JPNIC_ASYMMETRIC_CREST", "Asymmetric East Tower Crown Wedge", "L1_HOTEL_TOWER", "ZONE_TOWER", 16);

    // 4C. Lower East Services Annex
    const eastAnnex = new THREE.Mesh(new THREE.BoxGeometry(20, 34, 28), terracottaDarkMat.clone());
    eastAnnex.position.set(52, 21, 6);
    addBimMesh(eastAnnex, "JPNIC_EAST_ANNEX", "East Services & Vertical Circulation Block", "L1_MUSEUM", "ZONE_TOWER", 14);

    // =========================================================================
    // BIT 5: 5 SWOOPING REAR BUTTRESS RIBS & CANTILEVERED PLANT BOX (WEEK 16-20)
    // =========================================================================
    for (let r = 0; r < 5; r++) {
      const ribH = 78 + r * 3.2;
      const ribShape = new THREE.Shape();
      ribShape.moveTo(0, 0);
      ribShape.lineTo(26, 0);
      ribShape.bezierCurveTo(18, ribH * 0.35, 12, ribH * 0.58, 27, ribH * 0.84);
      ribShape.quadraticCurveTo(16, ribH * 1.02, 0, ribH);
      ribShape.lineTo(0, 0);

      const ribGeo = new THREE.ExtrudeGeometry(ribShape, { depth: 4.8, bevelEnabled: false });
      ribGeo.rotateY(-Math.PI / 2);
      const ribMesh = new THREE.Mesh(ribGeo, terracottaMat.clone());
      ribMesh.position.set(-30 + r * 14.5, 4, -22);
      addBimMesh(ribMesh, `JPNIC_REAR_RIB_0${r + 1}`, `Sculptural Swooping Terracotta Buttress Rib #${r + 1}`, "L1_HOTEL_TOWER", "ZONE_TOWER", 16 + (r % 3));
    }

    const rearCantileverBox = new THREE.Mesh(new THREE.BoxGeometry(58, 16, 13), darkStructuralMat.clone());
    rearCantileverBox.position.set(-4, 24, -36);
    addBimMesh(rearCantileverBox, "JPNIC_REAR_CANTILEVER_BOX", "Rear Facade Cantilevered Plant & Brise-Soleil Block", "L1_HOTEL_TOWER", "ZONE_TOWER", 18);

    // =========================================================================
    // BIT 6: CANTILEVERED CIRCULAR HELIPAD & ROOFTOP STEEL CROWN (WEEK 21-24)
    // =========================================================================
    const heliNeck = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 10, 24), darkStructuralMat.clone());
    heliNeck.position.set(-10, 84, -12);
    addBimMesh(heliNeck, "JPNIC_HELIPAD_CORE", "Rooftop Helipad Cylindrical Support Core", "L2_HELIPAD", "ZONE_TOWER", 21);

    const heliDisc = new THREE.Mesh(new THREE.CylinderGeometry(19, 17.5, 2.4, 48), concreteMat.clone());
    heliDisc.position.set(-10, 90.5, -12);
    addBimMesh(heliDisc, "JPNIC_HELIPAD_DECK", "Cantilevered Circular Rooftop Helipad (38m Dia)", "L2_HELIPAD", "ZONE_TOWER", 22);

    const heliRing = new THREE.Mesh(new THREE.TorusGeometry(20.2, 0.45, 8, 48), steelWireMat.clone());
    heliRing.rotation.x = Math.PI / 2;
    heliRing.position.set(-10, 91.5, -12);
    addBimMesh(heliRing, "JPNIC_HELIPAD_NET", "Helipad Perimeter Safety Netting Frame", "L2_HELIPAD", "ZONE_TOWER", 23);

    const crownCage = new THREE.Mesh(new THREE.BoxGeometry(15, 7.5, 16), steelWireMat.clone());
    crownCage.position.set(34, 101.5, -14);
    addBimMesh(crownCage, "JPNIC_CROWN_CAGE", "East Peak Steel Space-Frame Crown Enclosure", "L2_HELIPAD", "ZONE_TOWER", 23);

    // AUXILIARY LIEBHERR CRANE
    const craneGroup = new THREE.Group();
    craneGroup.position.set(-58, 0, -10);
    const craneYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.8 });
    const mast = new THREE.Mesh(new THREE.BoxGeometry(3, 115, 3), craneYellowMat);
    mast.position.y = 57.5;
    craneGroup.add(mast);
    const jibGroup = new THREE.Group();
    jibGroup.position.y = 115;
    craneGroup.add(jibGroup);
    craneJibRef.current = jibGroup;
    const jib = new THREE.Mesh(new THREE.BoxGeometry(80, 2.2, 2.2), craneYellowMat);
    jib.position.x = 32;
    jibGroup.add(jib);
    craneRef.current = craneGroup;
    scene.add(craneGroup);

    // --- ORBIT CONTROLS & CAMERA SYNCHRONIZATION ---
    let isDragging = false, prevX = 0, prevY = 0, prevDist = 0;
    let sph = { r: 215, phi: Math.PI / 3.1, theta: -Math.PI / 4.2 };

    const updateCameraPos = () => {
      camera.position.x = sph.r * Math.sin(sph.phi) * Math.sin(sph.theta);
      camera.position.y = sph.r * Math.cos(sph.phi);
      camera.position.z = sph.r * Math.sin(sph.phi) * Math.cos(sph.theta);
      camera.lookAt(0, 38, 5);
    };
    updateCameraPos();
    scene.userData.updateCameraPos = updateCameraPos;
    scene.userData.sph = sph;

    const handlePointerDown = (clientX: number, clientY: number) => {
      isDragging = true;
      prevX = clientX;
      prevY = clientY;
      lastInteractionTime.current = Date.now();
    };

    const handlePointerUp = () => {
      isDragging = false;
      lastInteractionTime.current = Date.now();
    };

    const handlePointerMove = (clientX: number, clientY: number) => {
      lastInteractionTime.current = Date.now();
      const rect = mount.getBoundingClientRect();
      const mouse = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(pickableMeshes.current.filter(m => m.visible), false);

      if (hits.length > 0 && !isDragging) {
        mount.style.cursor = "pointer";
        const hitData = hits[0].object.userData;
        setTooltip({ visible: true, x: clientX, y: clientY, name: hitData.name, ifcType: hitData.entityId, week: hitData.minWeek });
      } else {
        mount.style.cursor = isDragging ? "grabbing" : "grab";
        setTooltip(prev => ({ ...prev, visible: false }));
      }

      if (!isDragging) return;
      sph.theta -= (clientX - prevX) * 0.007;
      sph.phi = Math.max(0.12, Math.min(Math.PI / 2.05, sph.phi - (clientY - prevY) * 0.007));
      prevX = clientX;
      prevY = clientY;
      updateCameraPos();
    };

    const handlePointerClick = (clientX: number, clientY: number) => {
      const rect = mount.getBoundingClientRect();
      const mouse = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(pickableMeshes.current.filter(m => m.visible), false);

      if (hits.length > 0) {
        const hit = hits[0].object.userData;
        setSelectedEntity({
          id: hit.entityId,
          name: hit.name,
          type: "ELEMENT",
          discipline: "ARCHITECTURAL",
          parentLevel: hit.level,
          parentZone: hit.zone,
          subComponents: defaultEntity.subComponents,
          boqItems: defaultEntity.boqItems,
          cdeDocs: hit.cdeDocs && hit.cdeDocs.length > 0 ? hit.cdeDocs : defaultEntity.cdeDocs
        });
      }
    };

    const onMouseDown = (e: MouseEvent) => handlePointerDown(e.clientX, e.clientY);
    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onClick = (e: MouseEvent) => handlePointerClick(e.clientX, e.clientY);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      lastInteractionTime.current = Date.now();
      sph.r = Math.max(55, Math.min(340, sph.r + e.deltaY * 0.12));
      updateCameraPos();
    };

    mount.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("mousemove", onMouseMove);
    mount.addEventListener("click", onClick);
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
      if (craneRef.current && craneJibRef.current) {
        craneRef.current.visible = timelineWeek < 24;
        craneJibRef.current.rotation.y = Math.sin(t * 0.2) * 1.2;
      }
      if (Date.now() - lastInteractionTime.current > 8000 && !isDragging) {
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
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("mousemove", onMouseMove);
      mount.removeEventListener("click", onClick);
      mount.removeEventListener("wheel", onWheel);
      ro.disconnect();
      renderer.dispose();
    };
  }, [isHydrated]);

  useEffect(() => {
    if (!elementsGroupRef.current || !isHydrated) return;

    elementsGroupRef.current.children.forEach((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.userData || !mesh.material) return;
      const { minWeek, originalColor, originalOpacity, originalTransparent, thermalColor } = mesh.userData;
      const mat = mesh.material as any;

      mesh.visible = timelineWeek >= minWeek;
      if (mesh.userData.edgeLine) mesh.userData.edgeLine.visible = renderMode === "SOLID" || renderMode === "CAD_EDGES" || renderMode === "X_RAY";

      if (mesh.visible) {
        if (renderMode === "THERMAL") {
          mat.color.setHex(thermalColor || 0x0f172a);
          mat.wireframe = false;
        } else if (renderMode === "X_RAY") {
          mat.transparent = true;
          mat.opacity = 0.25;
          mat.wireframe = true;
        } else {
          mat.transparent = originalTransparent;
          mat.opacity = originalOpacity;
          mat.wireframe = false;
          if (mat.color && originalColor !== undefined) mat.color.setHex(originalColor);
        }
      }
    });
  }, [timelineWeek, renderMode, isHydrated]);

  const setPresetAngle = (theta: number, phi: number, r: number, label: string) => {
    if (sceneRef.current && sceneRef.current.userData.sph) {
      sceneRef.current.userData.sph.theta = theta;
      sceneRef.current.userData.sph.phi = phi;
      sceneRef.current.userData.sph.r = r;
      sceneRef.current.userData.updateCameraPos();
      lastInteractionTime.current = Date.now();
      addAiLog("CAM_SYNC", `Camera aligned to ${label}`, "text-cyan-400");
    }
  };

  if (!isHydrated) return <div className="w-full h-[520px] bg-slate-950"></div>;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* RENDER MODES & CAMERA ELEVATION PRESETS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl relative z-20">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-lg overflow-x-auto">
          {(["SOLID", "CAD_EDGES", "X_RAY", "THERMAL"] as const).map((mode) => (
            <button key={mode} onClick={() => setRenderMode(mode)} className={`px-2.5 py-1 text-xs font-mono rounded font-semibold transition ${renderMode === mode ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}>
              {mode}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <button onClick={() => setPresetAngle(-Math.PI * 0.78, Math.PI / 3.1, 200, "Rear 5-Ribs & Prow")} className="px-2.5 py-1 text-[11px] font-mono bg-orange-950/70 border border-orange-500/40 text-orange-300 rounded hover:bg-orange-900/60">
            📸 PHOTO 1/4: REAR RIBS & PROW
          </button>
          <button onClick={() => setPresetAngle(Math.PI * 0.18, Math.PI / 3.4, 210, "Dome & Helipad")} className="px-2.5 py-1 text-[11px] font-mono bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 rounded hover:bg-cyan-900/60">
            📸 PHOTO 2: DOME & HELIPAD
          </button>
          <button onClick={() => setPresetAngle(0, Math.PI / 2.9, 225, "Front Green Wedge & Glass Triangle")} className="px-2.5 py-1 text-[11px] font-mono bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 rounded hover:bg-emerald-900/60">
            📸 PHOTO 3: FRONT ELEVATION
          </button>
        </div>
      </div>

      {/* 3D VIEWPORT & INSPECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 relative h-[520px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
          {tooltip.visible && (
            <div style={{ left: tooltip.x + 15, top: tooltip.y + 15 }} className="fixed bg-slate-900/95 border border-slate-700 rounded p-2 pointer-events-none z-50 shadow-xl backdrop-blur-sm hidden md:block">
              <div className="text-xs font-bold text-white mb-0.5">{tooltip.name}</div>
              <div className="text-[10px] font-mono text-cyan-400 flex flex-col">
                <span>ID: {tooltip.ifcType}</span>
                <span>Milestone: Week {tooltip.week}</span>
              </div>
            </div>
          )}

          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* TELEMETRY OVERLAYS */}
          <div className="hidden sm:block absolute top-3 right-3 bg-slate-900/90 border border-slate-700 p-3 rounded-lg backdrop-blur-md w-60 pointer-events-none shadow-2xl z-10">
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1 border-b border-slate-700 pb-1">
              {isHandover ? "7D Facility Operations" : "6D Construction Phase"}
            </div>
            <div className="flex justify-between items-center text-xs text-slate-300 mb-1"><span>Campus Occupancy:</span><span className="font-mono text-cyan-400 font-bold">{opsData.occupancy}</span></div>
            <div className="flex justify-between items-center text-xs text-slate-300"><span>Grid Power:</span><span className="font-mono text-amber-400 font-bold">{opsData.powerMw} MW</span></div>
          </div>

          <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-slate-800 p-2.5 rounded-lg backdrop-blur-md w-80 pointer-events-none z-10 shadow-2xl">
            <div className="text-[10px] font-bold font-mono text-slate-400 mb-1 border-b border-slate-800 pb-0.5">MULTI-AGENT HIVE</div>
            <div className="flex flex-col gap-1 mt-1">
              {aiLogs.map((log) => (
                <div key={log.id} className="text-[10px] font-mono truncate"><span className="text-slate-500">[{log.agent}]</span> <span className={log.color}>{log.msg}</span></div>
              ))}
            </div>
          </div>
        </div>

        {/* COMPONENT INSPECTOR */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col h-[520px] overflow-hidden">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">Active Selection</div>
          <h3 className="text-sm font-bold text-white mb-3 truncate">{selectedEntity.name}</h3>

          <div className="flex border-b border-slate-800 mb-3 gap-2">
            <button onClick={() => setInspectorTab("SUB_COMPS")} className={`px-3 py-1.5 text-xs font-bold uppercase ${inspectorTab === "SUB_COMPS" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500"}`}>
              6 Modular Bits
            </button>
            <button onClick={() => setInspectorTab("BOQ_LEDGER")} className={`px-3 py-1.5 text-xs font-bold uppercase ${inspectorTab === "BOQ_LEDGER" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-500"}`}>
              BOQ Items
            </button>
            <button onClick={() => setInspectorTab("CDE_DOCS")} className={`px-3 py-1.5 text-xs font-bold uppercase ${inspectorTab === "CDE_DOCS" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-500"}`}>
              CDE Docs
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
            {inspectorTab === "SUB_COMPS" && selectedEntity.subComponents.map(comp => (
              <div key={comp.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-slate-200">{comp.name}</div>
                  <div className="text-[10px] font-mono text-slate-500">{comp.type} • {comp.weightOrVolume}</div>
                </div>
                <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">{comp.status}</span>
              </div>
            ))}

            {inspectorTab === "BOQ_LEDGER" && selectedEntity.boqItems.map(item => (
              <div key={item.itemCode} className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                  <span>{item.description}</span>
                  <span className="text-emerald-400 font-mono">₹{(item.amountINR / 10000000).toFixed(2)} Cr</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Qty: {item.quantity} {item.unit}</span>
                  <span>Rate: ₹{item.rateINR}</span>
                </div>
              </div>
            ))}

            {inspectorTab === "CDE_DOCS" && selectedEntity.cdeDocs.map(doc => (
              <div key={doc.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex flex-col gap-1">
                <span className="text-xs font-bold text-blue-300">{doc.title}</span>
                <span className="text-[10px] font-mono text-slate-500">SHA-256: {doc.hash}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4D TIMELINE SEQUENCER */}
      <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-slate-200 uppercase tracking-wider">4D Construction Sequence (Week {timelineWeek} / 26):</span>
          <span className="font-mono text-cyan-400">Drag to assemble all 6 JPNIC bits</span>
        </div>
        <input type="range" min="1" max="26" step="1" value={timelineWeek} onChange={(e) => setTimelineWeek(parseInt(e.target.value, 10))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
      </div>
    </div>
  );
}
ENGINE_EOF

echo "============================================================"
echo " 3. ENSURING CLIENT ROUTE: APP/SITE/DIGITAL-TWIN/PAGE.TSX..."
echo "============================================================"
mkdir -p app/site/digital-twin

cat << 'PAGE_EOF' > app/site/digital-twin/page.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";

const FullBimSimulationEngine = dynamic(
  () => import("@/components/bim/FullBimSimulationEngine"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] bg-slate-950 flex flex-col items-center justify-center border border-slate-800 rounded-xl">
        <div className="w-12 h-12 border-4 border-cyan-900 border-t-cyan-400 rounded-full animate-spin mb-3"></div>
        <div className="text-cyan-400 font-mono text-xs tracking-widest animate-pulse">
          INITIALIZING JPNIC 6D DIGITAL TWIN...
        </div>
      </div>
    ),
  }
);

export default function SiteDigitalTwinPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              JPNIC-ARCHOHM-LOD350.ifc
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              6 BITS ACTIVE
            </span>
          </div>
          <h1 className="text-lg font-bold tracking-tight mt-1">
            Jai Prakash Narayan International Centre (JPNIC) • 6D BIM Engine
          </h1>
        </div>
        <span className="px-3 py-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono rounded">
          Edge Stream: Optimal (60 FPS)
        </span>
      </div>
      <FullBimSimulationEngine />
    </div>
  );
}
PAGE_EOF

echo "============================================================"
echo " 4. SYNCING SANDBOX FALLBACK ROUTE..."
echo "============================================================"
mkdir -p app/sandbox/bim-twin
cp app/site/digital-twin/page.tsx app/sandbox/bim-twin/page.tsx

echo "============================================================"
echo "✓ ALL 6 JPNIC BITS + CAMERA CONTROLS DEPLOYED SUCCESSFULLY!"
echo "============================================================"
