// @refresh reset
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  VANGUARD_GENOME,
  ArchitecturalBitSpec,
  DisciplineId,
} from "@/lib/project/vanguardGenome";

interface DisciplineLayerUI {
  id: DisciplineId;
  label: string;
  colorHex: string;
  active: boolean;
  meshCount: number;
}

interface SelectedElementMeta {
  title: string;
  ifcClass: string;
  bitCode: string;
  discipline: string;
  spec: string;
  elevation: string;
  budgetOrMetric: string;
  tourZone?: string;
}

export default function DigitalTwinBimPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const bimRootRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [xrayArch, setXrayArch] = useState(true);
  const [activeBitFocus, setActiveBitFocus] = useState<string>("ALL");
  const [totalMeshes, setTotalMeshes] = useState(0);
  const [selectedMeta, setSelectedMeta] = useState<SelectedElementMeta | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const [layers, setLayers] = useState<DisciplineLayerUI[]>([
    { id: "STRUCTURAL", label: "Structural Frame, Arch & Space-Frame", colorHex: "#38bdf8", active: true, meshCount: 0 },
    { id: "HVAC", label: "HVAC 2,400 TR Chillers & 14F Risers", colorHex: "#4ade80", active: true, meshCount: 0 },
    { id: "PLUMBING", label: "Fire Wet Risers & Siphonic Mains", colorHex: "#fbbf24", active: true, meshCount: 0 },
    { id: "ELECTRICAL", label: "4-Car Lift Core & 11kV Busducts", colorHex: "#c084fc", active: true, meshCount: 0 },
    { id: "ARCHITECTURE", label: "Diagrid Glass, Kalzip & Terracotta", colorHex: "#94a3b8", active: true, meshCount: 0 },
    { id: "SITE_PLANT", label: "Liebherr 280 EC-H Crane & Snag Pins", colorHex: "#f43f5e", active: true, meshCount: 0 },
  ]);

  const focusCameraOn = useCallback((targetPos: [number, number, number], distance = 45) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const [tx, ty, tz] = targetPos;
    controls.target.set(tx, ty, tz);
    camera.position.set(tx + distance * 0.85, ty + distance * 0.65, tz + distance * 0.95);
    controls.update();
  }, []);

  const resetFullCampusView = useCallback(() => {
    setActiveBitFocus("ALL");
    focusCameraOn([0, 14, 0], 68);
  }, [focusCameraOn]);

  // Build True LOD-400 Parametric Multi-Discipline Model of Project Vanguard Commercial Hub
  const buildVanguardCampusBim = useCallback((root: THREE.Group) => {
    const groups: Record<DisciplineId, THREE.Group> = {
      STRUCTURAL: new THREE.Group(),
      HVAC: new THREE.Group(),
      PLUMBING: new THREE.Group(),
      ELECTRICAL: new THREE.Group(),
      ARCHITECTURE: new THREE.Group(),
      SITE_PLANT: new THREE.Group(),
    };

    (Object.keys(groups) as DisciplineId[]).forEach((key) => {
      groups[key].name = `LAYER_${key}`;
      root.add(groups[key]);
    });

    const addPart = (
      discipline: DisciplineId,
      geom: THREE.BufferGeometry,
      mat: THREE.Material,
      pos: [number, number, number],
      meta: SelectedElementMeta,
      rot: [number, number, number] = [0, 0, 0]
    ) => {
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.rotation.set(rot[0], rot[1], rot[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = meta;
      groups[discipline].add(mesh);
      return mesh;
    };

    // Shared PBR Materials
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.15 });
    const columnSteelMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35, metalness: 0.65 });
    const spaceFrameMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.3, metalness: 0.75 });
    const glassCurtainMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.28,
      roughness: 0.12,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    const kalzipShellMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0.42,
      roughness: 0.25,
      metalness: 0.85,
      side: THREE.DoubleSide,
    });
    const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.65, metalness: 0.1 });
    const greenTurfMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
    const hvacDuctMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.3, metalness: 0.6 });
    const chillerMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.25, metalness: 0.7 });
    const firePipeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.5 });
    const elecLiftMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.3, metalness: 0.6 });
    const craneYellowMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4, metalness: 0.5 });

    // -------------------------------------------------------------------------
    // 1. BIT-4: PODIUM TRANSFER DECK (+4.50m RL), BORED PILES & 2,400 TR PLANT
    // -------------------------------------------------------------------------
    addPart(
      "STRUCTURAL",
      new THREE.BoxGeometry(64, 1.2, 52),
      concreteMat,
      [0, 3.9, 0],
      {
        title: "Podium Transfer Slab (+4.50m RL)",
        ifcClass: "IfcSlab",
        bitCode: "BIT-4 PODIUM",
        discipline: "STRUCTURAL",
        spec: "M45 Post-Tensioned Transfer Deck (1,200mm thick)",
        elevation: "+4.50m RL",
        budgetOrMetric: "₹132.20 Cr Package • 94% Complete",
        tourZone: "BIT-4",
      }
    );

    // Podium Grid Columns & Foundation Pile Caps (including Column C2)
    for (let gx = -28; gx <= 28; gx += 14) {
      for (let gz = -22; gz <= 22; gz += 11) {
        const isColC2 = gx === -14 && gz === -11;
        addPart(
          "STRUCTURAL",
          new THREE.BoxGeometry(0.9, 4.5, 0.9),
          isColC2 ? new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x064e3b }) : columnSteelMat,
          [gx, 2.25, gz],
          {
            title: isColC2 ? "Column C2 (NCR #009 Post-Grout Certified)" : `Podium Column Grid (${gx}, ${gz})`,
            ifcClass: "IfcColumn",
            bitCode: "BIT-4 PODIUM",
            discipline: "STRUCTURAL",
            spec: isColC2 ? "M35 RCC • SikaGrout 214 Remediated • SonReb 32.8 MPa" : "M45 Reinforced Concrete Column (900×900mm)",
            elevation: "0.00m to +4.50m RL",
            budgetOrMetric: isColC2 ? "₹2,08,720 Lien Released" : "IS 456 / IS 2911 Pile Supported",
            tourZone: "BIT-4",
          }
        );
      }
    }

    // 3 × 800-Ton VFD Water-Cooled Chillers (2,400 TR Central Plant)
    [-4, 2, 8].forEach((cx, idx) => {
      addPart(
        "HVAC",
        new THREE.BoxGeometry(4.2, 2.4, 2.2),
        chillerMat,
        [cx, 1.4, -2],
        {
          title: `800-Ton VFD Centrifugal Chiller #0${idx + 1}`,
          ifcClass: "IfcChiller",
          bitCode: "BIT-4 PODIUM",
          discipline: "HVAC",
          spec: "800 TR Variable-Speed Magnetic Bearing Chiller (Part of 2,400 TR Plant)",
          elevation: "+0.20m RL (Plant Room)",
          budgetOrMetric: "COP 6.45 • Primary Loop Balanced",
          tourZone: "BIT-4",
        }
      );
    });

    // Primary Chilled Water Supply Header Trunk
    addPart(
      "HVAC",
      new THREE.CylinderGeometry(0.42, 0.42, 26, 16),
      hvacDuctMat,
      [2, 3.1, -6],
      {
        title: "DN600 Primary Chilled Water Header",
        ifcClass: "IfcPipeSegment",
        bitCode: "BIT-4 PODIUM",
        discipline: "HVAC",
        spec: "Schedule 40 MS Chilled Water Header feeding Tower & Dome Risers",
        elevation: "+3.10m RL",
        budgetOrMetric: "2,400 TR Distribution",
        tourZone: "BIT-4",
      },
      [0, 0, Math.PI / 2]
    );

    // -------------------------------------------------------------------------
    // 2. BIT-3: 14-STOREY COMMERCIAL & HOSPITALITY TOWER (+54.00m RL)
    // -------------------------------------------------------------------------
    const towerX = -10;
    const towerZ = -13;
    const towerW = 20;
    const towerD = 18;
    const floors = 14;
    const floorH = 3.5; // 14 * 3.5 = 49m above +5m podium = +54.0m RL

    // Concrete Shear Core
    addPart(
      "STRUCTURAL",
      new THREE.BoxGeometry(6.5, floors * floorH, 5.5),
      concreteMat,
      [towerX, 4.5 + (floors * floorH) / 2, towerZ],
      {
        title: "14-Storey RCC Central Shear Core",
        ifcClass: "IfcWall",
        bitCode: "BIT-3 HOTEL CORE",
        discipline: "STRUCTURAL",
        spec: "M50 High-Strength Reinforced Concrete Core Wall (450mm)",
        elevation: "+4.50m to +54.00m RL",
        budgetOrMetric: "IS 1893 Seismic Zone III Compliant",
        tourZone: "BIT-3",
      }
    );

    // 14 Floor Plates + Perimeter Diagrid Columns
    for (let f = 1; f <= floors; f++) {
      const fy = 4.5 + f * floorH;
      addPart(
        "STRUCTURAL",
        new THREE.BoxGeometry(towerW, 0.32, towerD),
        concreteMat,
        [towerX, fy, towerZ],
        {
          title: `Tower Level ${f.toString().padStart(2, "0")} Floor Slab`,
          ifcClass: "IfcSlab",
          bitCode: "BIT-3 HOTEL CORE",
          discipline: "STRUCTURAL",
          spec: `Post-Tensioned Flat Slab • Level ${f} (+${fy.toFixed(1)}m RL)`,
          elevation: `+${fy.toFixed(1)}m RL`,
          budgetOrMetric: "₹286.50 Cr Tower Package",
          tourZone: "BIT-3",
        }
      );

      // Diagonal Exoskeleton Bracing Struts on Front/Rear Facades
      if (f % 2 === 1) {
        [-6, 0, 6].forEach((dx) => {
          addPart(
            "STRUCTURAL",
            new THREE.CylinderGeometry(0.24, 0.24, 7.6, 10),
            columnSteelMat,
            [towerX + dx, fy + floorH * 0.5, towerZ + towerD / 2],
            {
              title: `Diagrid Exoskeleton Node L${f}-${f + 1}`,
              ifcClass: "IfcMember",
              bitCode: "BIT-3 HOTEL CORE",
              discipline: "STRUCTURAL",
              spec: "Concrete-Filled Tubular Steel Diagrid (Fe 550D / E350)",
              elevation: `+${fy.toFixed(1)}m RL`,
              budgetOrMetric: "Wind Drift < H/500 Verified",
              tourZone: "BIT-3",
            },
            [0, 0, 0.42]
          );
        });
      }
    }

    // 4-Car High-Speed Lift Bank (Electrical/Vertical Transport)
    [-2.1, -0.7, 0.7, 2.1].forEach((lx, idx) => {
      addPart(
        "ELECTRICAL",
        new THREE.BoxGeometry(1.1, floors * floorH - 1, 1.3),
        elecLiftMat,
        [towerX + lx, 4.5 + (floors * floorH) / 2, towerZ + 3.4],
        {
          title: `High-Speed Passenger Lift Shaft #0${idx + 1} (4-Car Bank)`,
          ifcClass: "IfcTransportElement",
          bitCode: "BIT-3 HOTEL CORE",
          discipline: "ELECTRICAL",
          spec: "3.5 m/s Gearless Traction Lift • Zero Clash with 14F HVAC Risers",
          elevation: "+4.50m to +54.00m RL",
          budgetOrMetric: "MINERVA LOD-400 Clash-Free",
          tourZone: "BIT-3",
        }
      );
    });

    // 14th-Floor Vertical HVAC Supply & Return Risers
    [-4.2, 4.2].forEach((hx, idx) => {
      addPart(
        "HVAC",
        new THREE.BoxGeometry(1.1, floors * floorH, 0.95),
        hvacDuctMat,
        [towerX + hx, 4.5 + (floors * floorH) / 2, towerZ + 3.4],
        {
          title: idx === 0 ? "14th Fl Vertical HVAC Supply Riser" : "14th Fl Vertical HVAC Return Riser",
          ifcClass: "IfcDuctSegment",
          bitCode: "BIT-3 HOTEL CORE",
          discipline: "HVAC",
          spec: "Galvanized 18G Acoustic Insulated Main Riser Shaft",
          elevation: "+4.50m to +54.00m RL",
          budgetOrMetric: "0mm Clearance Conflict",
          tourZone: "BIT-3",
        }
      );
    });

    // Fire Wet Riser Stack (Plumbing)
    addPart(
      "PLUMBING",
      new THREE.CylinderGeometry(0.22, 0.22, floors * floorH, 12),
      firePipeMat,
      [towerX + 5.2, 4.5 + (floors * floorH) / 2, towerZ - 2.2],
      {
        title: "DN150 Pressurized Fire Wet Riser Stack",
        ifcClass: "IfcPipeSegment",
        bitCode: "BIT-3 HOTEL CORE",
        discipline: "PLUMBING",
        spec: "IS 3844 Heavy-Duty GI Fire Hydrant & Sprinkler Riser",
        elevation: "+4.50m to +54.00m RL",
        budgetOrMetric: "Hydro-tested at 14 bar",
        tourZone: "BIT-3",
      }
    );

    // Diagonal Curtain Wall Envelope (Architecture)
    addPart(
      "ARCHITECTURE",
      new THREE.BoxGeometry(towerW + 0.3, floors * floorH, towerD + 0.3),
      glassCurtainMat,
      [towerX, 4.5 + (floors * floorH) / 2, towerZ],
      {
        title: "14th Floor Diagonal Curtain Wall Atrium Envelope",
        ifcClass: "IfcCurtainWall",
        bitCode: "BIT-3 HOTEL CORE",
        discipline: "ARCHITECTURE",
        spec: "Unitized Double-Glazed Low-E Diagrid Curtain Wall",
        elevation: "+54.00m RL Crown",
        budgetOrMetric: "U-Value 1.6 W/m²K",
        tourZone: "BIT-3",
      }
    );

    // -------------------------------------------------------------------------
    // 3. BIT-2: ACOUSTIC AUDITORIUM CONCOURSE & KALZIP SILVER DOME (+16.50m RL)
    // -------------------------------------------------------------------------
    const domeX = 14;
    const domeZ = 12;
    const domeR = 11.5;

    // Auditorium Drum Base
    addPart(
      "STRUCTURAL",
      new THREE.CylinderGeometry(domeR, domeR + 0.6, 5.5, 32, 1, true),
      concreteMat,
      [domeX, 7.25, domeZ],
      {
        title: "Acoustic Auditorium Ring Beam & Perimeter Wall",
        ifcClass: "IfcWall",
        bitCode: "BIT-2 SILVER DOME",
        discipline: "STRUCTURAL",
        spec: "M45 Circular Tension Ring Beam supporting 2,100-Ton Dome",
        elevation: "+4.50m to +10.00m RL",
        budgetOrMetric: "₹164.80 Cr Package • 85% Complete",
        tourZone: "BIT-2",
      }
    );

    // 2,100-Ton Space-Frame Geodesic Dome Lattice (Structural)
    addPart(
      "STRUCTURAL",
      new THREE.SphereGeometry(domeR, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        wireframe: true,
        roughness: 0.3,
      }),
      [domeX, 10.0, domeZ],
      {
        title: "2,100-Ton Space-Frame Truss Dome Lattice",
        ifcClass: "IfcRoof",
        bitCode: "BIT-2 SILVER DOME",
        discipline: "STRUCTURAL",
        spec: "MERO-Type Spherical Node Space-Frame (Node #14B Flagged Δ 4.2mm)",
        elevation: "+10.00m to +21.50m RL",
        budgetOrMetric: "SNAG-VANGUARD-401 Active",
        tourZone: "BIT-2",
      }
    );

    // Circular Perimeter HVAC Supply Ring Duct inside Dome
    addPart(
      "HVAC",
      new THREE.TorusGeometry(domeR - 1.1, 0.52, 14, 36),
      hvacDuctMat,
      [domeX, 10.6, domeZ],
      {
        title: "Circular Auditorium HVAC Supply Ring Duct",
        ifcClass: "IfcDuctSegment",
        bitCode: "BIT-2 SILVER DOME",
        discipline: "HVAC",
        spec: "42,000 CFM Acoustic Spiral Jet-Nozzle Ring Duct",
        elevation: "+10.60m RL",
        budgetOrMetric: "NC-25 Acoustic Rating",
        tourZone: "BIT-2",
      },
      [Math.PI / 2, 0, 0]
    );

    // Kalzip Aluminum Standing-Seam Acoustic Shell (Architecture)
    addPart(
      "ARCHITECTURE",
      new THREE.SphereGeometry(domeR + 0.25, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2),
      kalzipShellMat,
      [domeX, 10.0, domeZ],
      {
        title: "Kalzip Standing-Seam Aluminum Acoustic Dome Shell",
        ifcClass: "IfcCovering",
        bitCode: "BIT-2 SILVER DOME",
        discipline: "ARCHITECTURE",
        spec: "Kalzip 65/400 Standing-Seam Roof • Seam Tolerance < 1.5mm Certified",
        elevation: "+16.50m RL Mean Datum",
        budgetOrMetric: "Sec 65B Certified",
        tourZone: "BIT-2",
      }
    );

    // -------------------------------------------------------------------------
    // 4. BIT-1: MONUMENTAL TERRACOTTA BRIDGE ARCH & GREEN WEDGE (+12.00m RL)
    // -------------------------------------------------------------------------
    const archX = -14;
    const archZ = 12;

    // Arch Abutment Piers
    [-10, 10].forEach((ox, idx) => {
      addPart(
        "STRUCTURAL",
        new THREE.BoxGeometry(3.6, 8.0, 14.0),
        concreteMat,
        [archX + ox, 8.5, archZ],
        {
          title: `Terracotta Bridge Arch Thrust Pier #0${idx + 1}`,
          ifcClass: "IfcFooting",
          bitCode: "BIT-1 GREEN WEDGE",
          discipline: "STRUCTURAL",
          spec: "48m Span Post-Tensioned Arch Abutment Pier",
          elevation: "+4.50m to +12.50m RL",
          budgetOrMetric: "₹118.40 Cr Package",
          tourZone: "BIT-1",
        }
      );
    });

    // Spanning Post-Tensioned Bridge Arch Deck
    addPart(
      "STRUCTURAL",
      new THREE.BoxGeometry(24, 1.4, 14.0),
      concreteMat,
      [archX, 12.2, archZ],
      {
        title: "48m Clear-Span Post-Tensioned Bridge Arch Deck",
        ifcClass: "IfcBeam",
        bitCode: "BIT-1 GREEN WEDGE",
        discipline: "STRUCTURAL",
        spec: "Post-Tensioned Box Girder supporting Stepped Green Amphitheatre",
        elevation: "+12.00m RL",
        budgetOrMetric: "78% Complete",
        tourZone: "BIT-1",
      }
    );

    // Terracotta Cladding Fins & Stepped Green Turf Roof (Architecture)
    addPart(
      "ARCHITECTURE",
      new THREE.BoxGeometry(24.4, 2.2, 14.4),
      terracottaMat,
      [archX, 11.4, archZ],
      {
        title: "Extruded Terracotta Louver Facade Band",
        ifcClass: "IfcCurtainWall",
        bitCode: "BIT-1 GREEN WEDGE",
        discipline: "ARCHITECTURE",
        spec: "Ventilated Terracotta Baguette Rainscreen (MIDAS Reconciled)",
        elevation: "+11.40m RL",
        budgetOrMetric: "CPWD Cladding Ledger OK",
        tourZone: "BIT-1",
      }
    );

    addPart(
      "ARCHITECTURE",
      new THREE.BoxGeometry(23.5, 0.7, 13.5),
      greenTurfMat,
      [archX, 13.1, archZ],
      {
        title: "Stepped Green Turf Amphitheatre Roof Deck",
        ifcClass: "IfcRoof",
        bitCode: "BIT-1 GREEN WEDGE",
        discipline: "ARCHITECTURE",
        spec: "Intensive Green Roof Retention Substrate & Amphitheatre Seating",
        elevation: "+13.10m RL",
        budgetOrMetric: "GRIHA 5-Star Envelope",
        tourZone: "BIT-1",
      }
    );

    // -------------------------------------------------------------------------
    // 5. BIT-5 (EAST WING +28.0m RL) & BIT-6 (SLIM HELIPAD DECK +23.0m/+29m RL)
    // -------------------------------------------------------------------------
    const eastX = 18;
    const eastZ = -12;
    const eastFloors = 7;

    for (let ef = 1; ef <= eastFloors; ef++) {
      const ey = 4.5 + ef * 3.35;
      addPart(
        "STRUCTURAL",
        new THREE.BoxGeometry(17, 0.28, 17),
        columnSteelMat,
        [eastX, ey, eastZ],
        {
          title: `East Innovation Wing Steel-Composite Deck L${ef}`,
          ifcClass: "IfcSlab",
          bitCode: "BIT-5 EAST WING",
          discipline: "STRUCTURAL",
          spec: `ISMB 450 Composite Frame Deck (+${ey.toFixed(1)}m RL)`,
          elevation: `+${ey.toFixed(1)}m RL`,
          budgetOrMetric: "₹108.60 Cr Package",
          tourZone: "BIT-5",
        }
      );
    }

    addPart(
      "ARCHITECTURE",
      new THREE.BoxGeometry(17.3, eastFloors * 3.35, 17.3),
      glassCurtainMat,
      [eastX, 4.5 + (eastFloors * 3.35) / 2, eastZ],
      {
        title: "East Innovation Wing Glazed & Terracotta Envelope",
        ifcClass: "IfcCurtainWall",
        bitCode: "BIT-5 EAST WING",
        discipline: "ARCHITECTURE",
        spec: "Unitized Curtain Wall with Terracotta Brise-Soleil",
        elevation: "+28.00m RL",
        budgetOrMetric: "58% Complete",
        tourZone: "BIT-5",
      }
    );

    // BIT-6: Cantilevered Steel Helipad Deck
    const heliY = 4.5 + eastFloors * 3.35 + 1.4;
    addPart(
      "STRUCTURAL",
      new THREE.CylinderGeometry(7.6, 7.2, 0.9, 24),
      columnSteelMat,
      [eastX, heliY, eastZ],
      {
        title: "BIT-6 Cantilevered Steel Box-Girder Helipad Deck",
        ifcClass: "IfcSlab",
        bitCode: "BIT-6 SLIM PAD",
        discipline: "STRUCTURAL",
        spec: "Structural Steel Cantilevered Helideck (Bell 429 / AW109 Rated)",
        elevation: "+23.00m / +29.3m RL",
        budgetOrMetric: "₹54.00 Cr Package",
        tourZone: "BIT-6",
      }
    );

    addPart(
      "ARCHITECTURE",
      new THREE.RingGeometry(2.2, 5.8, 32),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, side: THREE.DoubleSide }),
      [eastX, heliY + 0.48, eastZ],
      {
        title: "ICAO Touchdown & Positioning Circle (TDPM)",
        ifcClass: "IfcAnnotation",
        bitCode: "BIT-6 SLIM PAD",
        discipline: "ARCHITECTURE",
        spec: "Non-Skid Aluminum Deck Planking with Perimeter LED Beacons",
        elevation: "+23.00m RL",
        budgetOrMetric: "72% Complete",
        tourZone: "BIT-6",
      },
      [-Math.PI / 2, 0, 0]
    );

    // -------------------------------------------------------------------------
    // 6. SITE PLANT & TELEMETRY: LIEBHERR 280 EC-H TOWER CRANE + SNAG/NCR PINS
    // -------------------------------------------------------------------------
    const [cx, , cz] = VANGUARD_GENOME.craneTelemetry.basePos;
    const jibRad = (VANGUARD_GENOME.craneTelemetry.azimuthDeg * Math.PI) / 180;

    // Crane Mast (64m high)
    addPart(
      "SITE_PLANT",
      new THREE.BoxGeometry(2.0, 62, 2.0),
      craneYellowMat,
      [cx, 31, cz],
      {
        title: "Liebherr 280 EC-H High-Top Tower Crane Mast",
        ifcClass: "IfcBuildingElementProxy",
        bitCode: "CRANE-01",
        discipline: "SITE_PLANT",
        spec: "Liebherr 280 EC-H • 65m Jib • Locked over Green Wedge & Silver Dome",
        elevation: "+62.00m Hook Height",
        budgetOrMetric: "ARGUS Radar Active (12ms)",
        tourZone: "BIT-2",
      }
    );

    // Crane Slewing Jib Boom
    const jibGroup = new THREE.Group();
    jibGroup.position.set(cx, 60.5, cz);
    jibGroup.rotation.y = jibRad;
    groups.SITE_PLANT.add(jibGroup);

    const jibMesh = new THREE.Mesh(new THREE.BoxGeometry(54, 1.4, 1.4), craneYellowMat);
    jibMesh.position.set(16, 0, 0);
    jibMesh.userData = {
      title: "Liebherr 280 EC-H 65m Slewing Jib (Azimuth 38.5°)",
      ifcClass: "IfcBuildingElementProxy",
      bitCode: "CRANE-01",
      discipline: "SITE_PLANT",
      spec: "Slewing over BIT-1 Green Wedge & BIT-2 Kalzip Silver Dome",
      elevation: "+60.50m RL",
      budgetOrMetric: "Anti-Collision Zone Enforced",
      tourZone: "BIT-2",
    };
    jibGroup.add(jibMesh);

    // 3D Spatial Telemetry Markers for Snags & Certified NCRs
    VANGUARD_GENOME.spatialPins.forEach((pin) => {
      const pinColor =
        pin.severity === "MINOR"
          ? 0xf43f5e
          : pin.severity === "RESOLVED_CERTIFIED"
          ? 0x10b981
          : 0x38bdf8;

      addPart(
        "SITE_PLANT",
        new THREE.OctahedronGeometry(1.15, 0),
        new THREE.MeshStandardMaterial({
          color: pinColor,
          emissive: pinColor,
          emissiveIntensity: 0.45,
        }),
        pin.worldPos,
        {
          title: `${pin.pinId}: ${pin.title}`,
          ifcClass: "IfcSpatialAnnotation",
          bitCode: pin.bitId,
          discipline: pin.discipline,
          spec: pin.description,
          elevation: `Y = +${pin.worldPos[1].toFixed(1)}m RL`,
          budgetOrMetric: pin.metricLabel,
          tourZone: pin.bitId,
        }
      );
    });

    // Update live mesh counts per layer
    setLayers((prev) =>
      prev.map((l) => ({
        ...l,
        meshCount: groups[l.id].children.length,
      }))
    );

    let total = 0;
    (Object.keys(groups) as DisciplineId[]).forEach((k) => {
      total += groups[k].children.length;
    });
    setTotalMeshes(total);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let cancelled = false;
    let reqId = 0;

    const width = Math.max(container.clientWidth, 400);
    const height = Math.max(container.clientHeight, 450);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060911);
    scene.fog = new THREE.FogExp2(0x060911, 0.0032);

    // Campus Ground Grid (120m x 120m)
    let grid = new THREE.GridHelper(120, 60, 0x1e293b, 0x0f172a);
    scene.add(grid);

    const applyThreeTheme = (mode: string) => {
      const isLight = mode === "claude-light";
      const bgHex = isLight ? 0xEFECE4 : 0x060911;
      scene.background = new THREE.Color(bgHex);
      scene.fog = new THREE.FogExp2(bgHex, isLight ? 0.0022 : 0.0032);
      scene.remove(grid);
      grid = new THREE.GridHelper(
        120,
        60,
        isLight ? 0xC96442 : 0x1e293b,
        isLight ? 0xD8D2C5 : 0x0f172a
      );
      scene.add(grid);
    };
    applyThreeTheme(document.documentElement.getAttribute("data-theme") || "obsidian-dark");
    const onThemeEvt = (e: any) => applyThreeTheme(e.detail);
    window.addEventListener("liveview-theme-change", onThemeEvt);

    const bimRoot = new THREE.Group();
    bimRoot.name = "VANGUARD_LOD400_CAMPUS";
    scene.add(bimRoot);
    bimRootRef.current = bimRoot;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.2, 1000);
    camera.position.set(58, 44, 62);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Studio Architectural Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.45);
    sunLight.position.set(60, 90, 50);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const skyFill = new THREE.DirectionalLight(0x38bdf8, 0.55);
    skyFill.position.set(-50, 35, -45);
    scene.add(skyFill);

    buildVanguardCampusBim(bimRoot);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: rw, height: rh } = entry.contentRect;
        if (rw > 0 && rh > 0) {
          camera.aspect = rw / rh;
          camera.updateProjectionMatrix();
          renderer.setSize(rw, rh);
        }
      }
    });
    resizeObserver.observe(container);

    // Sync initial camera focus if opened via ?bit=BIT-X from Command Center or 360 Tour
    const params = new URLSearchParams(window.location.search);
    const requestedBit = params.get("bit");
    const matchedBit = requestedBit
      ? VANGUARD_GENOME.bits.find((b) => b.bitId === requestedBit.toUpperCase())
      : null;

    const initControls = async () => {
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (cancelled) return;
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controlsRef.current = controls;
      if (matchedBit) {
        const dist = Math.max(matchedBit.dimensionsM[0], matchedBit.dimensionsM[1]) * 1.15;
        const [tx, ty, tz] = matchedBit.worldPos;
        controls.target.set(tx, ty, tz);
        camera.position.set(tx + dist * 0.85, ty + dist * 0.65, tz + dist * 0.95);
        controls.update();
        setActiveBitFocus(matchedBit.bitId);
        setSelectedMeta({
          title: `${matchedBit.code}: ${matchedBit.name}`,
          ifcClass: "IfcBuildingStorey / SpatialZone",
          bitCode: matchedBit.bitId,
          discipline: "FEDERATED_LOD400",
          spec: `${matchedBit.structuralSystem} • ${matchedBit.mepSystem}`,
          elevation: matchedBit.elevationLabel,
          budgetOrMetric: `₹${matchedBit.allocatedBudgetCr.toFixed(2)} Cr • ${matchedBit.completionPct}% Complete`,
          tourZone: matchedBit.bitId,
        });
      } else {
        controls.target.set(0, 14, 0);
        controls.update();
      }
      setIsLoaded(true);
    };
    initControls();

    // Raycast Element Inspector
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let highlighted: THREE.Mesh | null = null;
    let prevEmissive: THREE.Color | null = null;

    const onPointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(bimRoot.children, true);

      if (highlighted && prevEmissive) {
        const oldMat = highlighted.material as THREE.MeshStandardMaterial;
        if (oldMat?.emissive) oldMat.emissive.copy(prevEmissive);
        highlighted = null;
      }

      if (hits.length > 0) {
        const mesh = hits[0].object as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat?.emissive) {
          highlighted = mesh;
          prevEmissive = mat.emissive.clone();
          mat.emissive.setHex(0x0284c7);
        }
        if (mesh.userData?.title) {
          setSelectedMeta(mesh.userData as SelectedElementMeta);
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelled = true;
      cancelAnimationFrame(reqId);
      window.removeEventListener("liveview-theme-change", onThemeEvt);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.dispose();
    };
  }, [buildVanguardCampusBim]);

  const toggleLayer = (id: DisciplineId) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const next = !l.active;
          const grp = bimRootRef.current?.getObjectByName(`LAYER_${id}`);
          if (grp) grp.visible = next;
          return { ...l, active: next };
        }
        return l;
      })
    );
  };

  const toggleXrayMode = () => {
    const nextXray = !xrayArch;
    setXrayArch(nextXray);
    const archGrp = bimRootRef.current?.getObjectByName("LAYER_ARCHITECTURE");
    archGrp?.traverse((obj: any) => {
      if (obj.isMesh && obj.material && obj.material.transparent) {
        obj.material.opacity = nextXray ? 0.28 : 0.85;
        obj.material.needsUpdate = true;
      }
    });
  };

  const focusBit = (bit: ArchitecturalBitSpec) => {
    setActiveBitFocus(bit.bitId);
    focusCameraOn(bit.worldPos, Math.max(bit.dimensionsM[0], bit.dimensionsM[1]) * 1.15);
    setSelectedMeta({
      title: `${bit.code}: ${bit.name}`,
      ifcClass: "IfcBuildingStorey / SpatialZone",
      bitCode: bit.bitId,
      discipline: "FEDERATED_LOD400",
      spec: `${bit.structuralSystem} • ${bit.mepSystem}`,
      elevation: bit.elevationLabel,
      budgetOrMetric: `₹${bit.allocatedBudgetCr.toFixed(2)} Cr • ${bit.completionPct}% Complete`,
      tourZone: bit.bitId,
    });
  };

  // Optional external .IFC / .GLB overlay loader
  const handleExternalModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const bimRoot = bimRootRef.current;
    if (!file || !bimRoot) return;

    setUploadStatus(`Parsing ${file.name}...`);
    try {
      const buffer = await file.arrayBuffer();
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "glb" || ext === "gltf") {
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const loader = new GLTFLoader();
        loader.parse(buffer, "", (gltf) => {
          gltf.scene.name = `UPLOAD_${Date.now()}`;
          bimRoot.add(gltf.scene);
          setUploadStatus(`Mounted ${file.name}`);
        });
      } else if (ext === "ifc") {
        const WebIFC = await import("web-ifc");
        const ifcApi = new WebIFC.IfcAPI();
        const cdnBase = `https://unpkg.com/web-ifc@0.0.78/`;
        (ifcApi as any).SetWasmPath(cdnBase, true);
        await (ifcApi as any).Init((p: string) => `${cdnBase}${p}`);
        const modelID = ifcApi.OpenModel(new Uint8Array(buffer));
        const customGroup = new THREE.Group();
        ifcApi.StreamAllMeshes(modelID, (flatMesh: any) => {
          const geoms = flatMesh.geometries;
          for (let i = 0; i < geoms.size(); i++) {
            const placed = geoms.get(i);
            const g = ifcApi.GetGeometry(modelID, placed.geometryExpressID);
            const v = ifcApi.GetVertexArray(g.GetVertexData(), g.GetVertexDataSize());
            const idx = ifcApi.GetIndexArray(g.GetIndexData(), g.GetIndexDataSize());
            if (v.length && idx.length) {
              const vc = v.length / 6;
              const pos = new Float32Array(vc * 3);
              const norm = new Float32Array(vc * 3);
              for (let k = 0; k < vc; k++) {
                pos[k * 3] = v[k * 6];
                pos[k * 3 + 1] = v[k * 6 + 1];
                pos[k * 3 + 2] = v[k * 6 + 2];
                norm[k * 3] = v[k * 6 + 3];
                norm[k * 3 + 1] = v[k * 6 + 4];
                norm[k * 3 + 2] = v[k * 6 + 5];
              }
              const bg = new THREE.BufferGeometry();
              bg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
              bg.setAttribute("normal", new THREE.BufferAttribute(norm, 3));
              bg.setIndex(new THREE.BufferAttribute(idx, 1));
              const m = new THREE.Mesh(
                bg,
                new THREE.MeshStandardMaterial({ color: 0x22d3ee, side: THREE.DoubleSide })
              );
              m.applyMatrix4(new THREE.Matrix4().fromArray(placed.flatTransformation));
              customGroup.add(m);
            }
          }
        });
        ifcApi.CloseModel(modelID);
        bimRoot.add(customGroup);
        setUploadStatus(`Mounted IFC: ${file.name}`);
      }
    } catch (err: any) {
      setUploadStatus(`Upload error: ${err?.message || "Invalid file"}`);
    }
  };

  return (
    <div className="min-h-screen h-screen bg-slate-950 text-slate-100 flex flex-col font-mono select-none overflow-hidden">
      {/* Top Header */}
      <div className="border-b border-slate-800 bg-slate-950/95 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              {VANGUARD_GENOME.projectId}
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              LOD-400 • 6 BITS • {totalMeshes} BIM ELEMENTS • ₹{VANGUARD_GENOME.financials.epcBaselineCr.toFixed(2)} Cr
            </span>
          </div>
          <h1 className="text-base font-bold text-white mt-1">
            {VANGUARD_GENOME.projectName.toUpperCase()} — FEDERATED 3D BIM TWIN
          </h1>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={toggleXrayMode}
            className={`px-3 py-1.5 rounded-lg border font-bold transition ${
              xrayArch
                ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300"
                : "bg-slate-900 border-slate-700 text-slate-300"
            }`}
          >
            {xrayArch ? "👁 X-RAY ENVELOPE: ON" : "🏢 SOLID FACADE"}
          </button>
          <button
            onClick={resetFullCampusView}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 rounded-lg transition"
          >
            ⌖ FULL CAMPUS
          </button>
          <label className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg cursor-pointer transition">
            + .IFC/.GLB
            <input type="file" accept=".ifc,.glb,.gltf" onChange={handleExternalModelUpload} className="hidden" />
          </label>
          <a
            href="/site/360-tour"
            className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 rounded-lg transition"
          >
            🌐 360° LIDAR TOUR
          </a>
          <a
            href="/"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition"
          >
            ← COMMAND CENTER
          </a>
        </div>
      </div>

      {/* 6 Architectural Bits Quick-Focus Ribbon (Synced with Command Center & 360° Tour) */}
      <div className="border-b border-slate-800/80 bg-slate-900/70 px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0 text-xs">
        <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">
          6 ARCHITECTURAL BITS:
        </span>
        {VANGUARD_GENOME.bits.map((bit) => (
          <button
            key={bit.bitId}
            onClick={() => focusBit(bit)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold shrink-0 transition flex items-center gap-1.5 ${
              activeBitFocus === bit.bitId
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600"
            }`}
          >
            <span>{bit.code}</span>
            <span className="text-[10px] text-slate-400">({bit.elevationLabel})</span>
            {bit.status === "SNAG_FLAGGED" && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Main 3D WebGL Canvas & Overlays */}
      <div className="relative flex-1 w-full bg-[#060911] overflow-hidden">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {!isLoaded && (
          <div className="absolute inset-0 bg-slate-950/85 flex items-center justify-center z-20 text-xs text-cyan-400 font-bold">
            Compiling LOD-400 Structural, MEP & Architectural Geometry...
          </div>
        )}

        {/* Left Discipline Toggle Matrix */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 w-72 bg-slate-900/85 backdrop-blur-md p-3 rounded-2xl border border-slate-800 shadow-2xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            FEDERATED BIM DISCIPLINES
          </span>
          <div className="flex flex-col gap-1.5">
            {layers.map((layer) => (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs font-bold transition ${
                  layer.active
                    ? "bg-slate-950 border-cyan-500/50 text-white"
                    : "bg-slate-950/40 border-slate-800/60 text-slate-500"
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: layer.active ? layer.colorHex : "#475569" }}
                  />
                  <span className="truncate">{layer.label}</span>
                </div>
                <span className="text-[10px] font-mono shrink-0 text-slate-400">
                  {layer.meshCount} • {layer.active ? "ON" : "OFF"}
                </span>
              </button>
            ))}
          </div>

          {/* Spatial Telemetry Pins Quick-Jump */}
          <div className="pt-2 mt-1 border-t border-slate-800 flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              PINNED SITE TELEMETRY & SNAGS
            </span>
            {VANGUARD_GENOME.spatialPins.map((pin) => (
              <button
                key={pin.pinId}
                onClick={() => {
                  focusCameraOn(pin.worldPos, 24);
                  setSelectedMeta({
                    title: `${pin.pinId}: ${pin.title}`,
                    ifcClass: "IfcSpatialAnnotation",
                    bitCode: pin.bitId,
                    discipline: pin.discipline,
                    spec: pin.description,
                    elevation: `Y = +${pin.worldPos[1].toFixed(1)}m RL`,
                    budgetOrMetric: pin.metricLabel,
                    tourZone: pin.bitId,
                  });
                }}
                className="text-left px-2 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-[10px] flex justify-between items-center"
              >
                <span className="text-slate-200 font-bold truncate pr-2">{pin.pinId}</span>
                <span
                  className={
                    pin.severity === "MINOR"
                      ? "text-rose-400 font-bold"
                      : pin.severity === "RESOLVED_CERTIFIED"
                      ? "text-emerald-400 font-bold"
                      : "text-cyan-400"
                  }
                >
                  {pin.metricLabel}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Selected Element BIM & Governance Inspector */}
        {selectedMeta && (
          <div className="absolute top-4 right-4 z-10 w-80 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-cyan-500/50 shadow-2xl flex flex-col gap-2 text-xs">
            <div className="flex justify-between items-start gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                {selectedMeta.bitCode} • {selectedMeta.discipline}
              </span>
              <button
                onClick={() => setSelectedMeta(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="text-sm font-bold text-white leading-snug">{selectedMeta.title}</div>
            <div className="text-[10px] text-slate-400 font-mono">IFC Entity: {selectedMeta.ifcClass}</div>
            <div className="text-[11px] text-slate-300 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 leading-relaxed">
              {selectedMeta.spec}
            </div>
            <div className="flex justify-between text-[11px] pt-1">
              <span className="text-slate-400">Elevation:</span>
              <span className="text-white font-bold">{selectedMeta.elevation}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Governance Status:</span>
              <span className="text-emerald-400 font-bold">{selectedMeta.budgetOrMetric}</span>
            </div>
            {selectedMeta.tourZone && (
              <a
                href={`/site/360-tour?zone=${selectedMeta.tourZone}`}
                className="mt-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-[11px] text-center transition hover:opacity-95"
              >
                OPEN {selectedMeta.tourZone} IN 360° LIDAR TOUR →
              </a>
            )}
          </div>
        )}

        {uploadStatus && (
          <div className="absolute bottom-12 left-4 z-10 bg-slate-900/90 border border-cyan-500/40 text-cyan-300 px-3 py-1.5 rounded-xl text-xs">
            {uploadStatus}
          </div>
        )}

        <div className="absolute bottom-4 right-4 z-10 text-[10px] text-slate-400 font-mono bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
          Left Drag: Rotate • Right Drag: Pan • Scroll: Zoom • Click Any Structural/MEP Element or Pin to Inspect
        </div>
      </div>
    </div>
  );
}
