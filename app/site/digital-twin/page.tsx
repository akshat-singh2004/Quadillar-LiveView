// @refresh reset
"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import {
  VANGUARD_GENOME,
  ArchitecturalBitSpec,
  DisciplineId,
} from "@/lib/project/vanguardGenome";
import { BIM_ZONE_REGISTRY, findBimZone } from "@/lib/grounding/bimZoneRegistry";
import {
  evaluateCampusMultiRayFusion,
  RAY_MODALITY_META,
  RayModality,
  STRUCTURE_DATUM_SPEC,
} from "@/lib/spatial/multiRayFusionEngine";
import {
  buildRevitAsBuiltDeltaPacket,
  RevitAsBuiltDeltaPacket,
} from "@/lib/bim/revitDeltaSync";
import { supabase } from "@/lib/supabaseClient";
import { useActiveProject } from "@/context/ProjectContext";
import MillimeterHeatmapHud from "@/components/bim/MillimeterHeatmapHud";

interface DisciplineLayerUI {
  id: DisciplineId;
  label: string;
  colorHex: string;
  active: boolean;
  meshCount: number;
}

interface SelectedElementMeta {
  zoneId?: string;
  title: string;
  ifcClass: string;
  bitCode: string;
  discipline: string;
  spec: string;
  elevation: string;
  concreteGrade?: string;
  ncrStatus?: string;
  lienStatus?: string;
  budgetOrMetric: string;
  tourZone?: string;
  hasFieldDeviation?: boolean;
}

export default function DigitalTwinBimPage() {
  const { activeProject } = useActiveProject();
  const mountRef = useRef<HTMLDivElement>(null);
  const bimRootRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const zoneMeshMapRef = useRef<Record<string, THREE.Mesh>>({});
  const tweenFrameRef = useRef<number | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [xrayArch, setXrayArch] = useState(true);
  const [activeBitFocus, setActiveBitFocus] = useState<string>("ALL");
  const [activeZoneId, setActiveZoneId] = useState<string>("BIT-4-TG03");
  const [totalMeshes, setTotalMeshes] = useState(0);
  const [selectedMeta, setSelectedMeta] = useState<SelectedElementMeta | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [showSchematicDrawer, setShowSchematicDrawer] = useState(false);

  // Live NCR / Escrow Gate State (Synced with Step 3 Kill Switch)
  const [escrowLocked, setEscrowLocked] = useState<boolean>(true);
  const [escrowLienInr, setEscrowLienInr] = useState<number>(450000);
  const [activeNcrCode, setActiveNcrCode] = useState<string>("NCR-2026-STR-042");

  // Multi-Ray Sensor Fusion State (LiDAR + LWIR Thermal IR + mmWave Cavity Radar + Active NIR)
  const [deployedSensorsByZone, setDeployedSensorsByZone] = useState<
    Record<string, RayModality[]>
  >({});

  // As-Built Field Variation -> Revit / IFC Delta Write-Back State
  const [reconciledAsBuiltZones, setReconciledAsBuiltZones] = useState<
    Record<string, RevitAsBuiltDeltaPacket>
  >({});

  const multiRayStates = useMemo(
    () => evaluateCampusMultiRayFusion(deployedSensorsByZone),
    [deployedSensorsByZone]
  );

  const activeZoneFusion = useMemo(
    () =>
      multiRayStates.find((s) => s.zoneId === activeZoneId) || multiRayStates[0],
    [multiRayStates, activeZoneId]
  );

  const activeAdvisories = useMemo(
    () => multiRayStates.filter((s) => s.advisory !== null),
    [multiRayStates]
  );

  const [layers, setLayers] = useState<DisciplineLayerUI[]>([
    { id: "STRUCTURAL", label: "Structural Frame, Arch & Space-Frame", colorHex: "#38bdf8", active: true, meshCount: 0 },
    { id: "HVAC", label: "HVAC 2,400 TR Chillers & 14F Risers", colorHex: "#4ade80", active: true, meshCount: 0 },
    { id: "PLUMBING", label: "Fire Wet Risers & Siphonic Mains", colorHex: "#fbbf24", active: true, meshCount: 0 },
    { id: "ELECTRICAL", label: "4-Car Lift Core & 11kV Busducts", colorHex: "#c084fc", active: true, meshCount: 0 },
    { id: "ARCHITECTURE", label: "Diagrid Glass, Kalzip & Terracotta", colorHex: "#94a3b8", active: true, meshCount: 0 },
    { id: "SITE_PLANT", label: "Liebherr 280 EC-H Crane & Snag Pins", colorHex: "#f43f5e", active: true, meshCount: 0 },
  ]);

  // Smooth Camera Focus Tweening
  const focusCameraOn = useCallback((targetPos: [number, number, number], distance = 36) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (tweenFrameRef.current) cancelAnimationFrame(tweenFrameRef.current);

    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(targetPos[0], targetPos[1], targetPos[2]);
    const startCam = camera.position.clone();
    const endCam = new THREE.Vector3(
      targetPos[0] + distance * 0.85,
      targetPos[1] + distance * 0.65,
      targetPos[2] + distance * 0.95
    );

    let step = 0;
    const totalSteps = 28;
    const tick = () => {
      step += 1;
      const t = 1 - Math.pow(1 - step / totalSteps, 3);
      controls.target.lerpVectors(startTarget, endTarget, t);
      camera.position.lerpVectors(startCam, endCam, t);
      controls.update();
      if (step < totalSteps) {
        tweenFrameRef.current = requestAnimationFrame(tick);
      }
    };
    tweenFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const focusBimZone = useCallback(
    (zoneId: string, overrideNcr?: string) => {
      const zone = findBimZone(zoneId);
      setActiveZoneId(zone.zoneId);
      setActiveBitFocus(zone.bitId);
      focusCameraOn(zone.worldPos, 26);

      const isReconciled = Boolean(reconciledAsBuiltZones[zone.zoneId]);
      const isTg03 = zone.zoneId === "BIT-4-TG03";
      const ncrLabel =
        overrideNcr ||
        (isReconciled
          ? "AS-BUILT RECONCILED (REVIT SYNCED)"
          : isTg03
          ? escrowLocked
            ? `${activeNcrCode} • CRITICAL HOLD`
            : `${activeNcrCode} • IS 456 CLEARED`
          : zone.linkedNcrId || "NOMINAL • LOD-400 VERIFIED");

      const lienLabel =
        isTg03 && !isReconciled
          ? escrowLocked
            ? `LOCKED — ₹${escrowLienInr.toLocaleString("en-IN")} Lien Active`
            : "CLEARED — ₹0 Lien (44.07 MPa Verified)"
          : "UNLOCKED — ₹0 Lien";

      setSelectedMeta({
        zoneId: zone.zoneId,
        title: zone.label,
        ifcClass: "IfcBeam / IfcBuildingStorey",
        bitCode: zone.bitId,
        discipline: "STRUCTURAL",
        spec: zone.structuralElement,
        elevation: zone.elevationLabel,
        concreteGrade: zone.concreteGrade,
        ncrStatus: ncrLabel,
        lienStatus: lienLabel,
        budgetOrMetric: ncrLabel,
        tourZone: zone.bitId,
        hasFieldDeviation: (isTg03 && escrowLocked) || zone.zoneId === "BIT-2-DOME",
      });
    },
    [activeNcrCode, escrowLienInr, escrowLocked, focusCameraOn, reconciledAsBuiltZones]
  );

  const resetFullCampusView = useCallback(() => {
    setActiveBitFocus("ALL");
    focusCameraOn([0, 14, 0], 68);
  }, [focusCameraOn]);

  // Fetch initial Escrow Gate state & subscribe to Realtime updates
  useEffect(() => {
    const fetchGate = async () => {
      try {
        const res = await fetch("/api/escrow-gate", { cache: "no-store" });
        const data = await res.json();
        if (data?.ok && data.gate) {
          setEscrowLocked(data.gate.gate_status === "LOCKED");
          setEscrowLienInr(Number(data.gate.withholding_lien_inr ?? 0));
          setActiveNcrCode(data.gate.ncr_id || "NCR-2026-STR-042");
        }
      } catch {}
    };
    fetchGate();

    const channel = supabase
      .channel("bim-twin-escrow-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ncr_escrow_gates" },
        (payload) => {
          const row = payload.new as any;
          if (row) {
            setEscrowLocked(row.gate_status === "LOCKED");
            setEscrowLienInr(Number(row.withholding_lien_inr ?? 0));
            if (row.ncr_id) setActiveNcrCode(row.ncr_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Dynamically highlight Transfer Girder TG-03 / Node #14B based on Hold / Clearance / As-Built Sync
  useEffect(() => {
    const tg03Mesh = zoneMeshMapRef.current["BIT-4-TG03"];
    if (tg03Mesh) {
      const mat = tg03Mesh.material as THREE.MeshStandardMaterial;
      const isReconciled = Boolean(reconciledAsBuiltZones["BIT-4-TG03"]);
      if (isReconciled || !escrowLocked) {
        mat.color.setHex(0x10b981);
        mat.emissive.setHex(0x065f46);
        mat.emissiveIntensity = 0.55;
      } else {
        mat.color.setHex(0xef4444);
        mat.emissive.setHex(0x991b1b);
        mat.emissiveIntensity = 0.75;
      }
    }

    const domePin = zoneMeshMapRef.current["BIT-2-DOME"];
    if (domePin) {
      const mat = domePin.material as THREE.MeshStandardMaterial;
      if (reconciledAsBuiltZones["BIT-2-DOME"]) {
        mat.color.setHex(0x10b981);
        mat.emissive.setHex(0x065f46);
      } else {
        mat.color.setHex(0xef4444);
        mat.emissive.setHex(0x991b1b);
      }
    }
  }, [escrowLocked, reconciledAsBuiltZones, isLoaded]);

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
      rot: [number, number, number] = [0, 0, 0],
      registerZoneId?: string
    ) => {
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.rotation.set(rot[0], rot[1], rot[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = meta;
      if (registerZoneId) {
        mesh.name = `BIM_ZONE_${registerZoneId}`;
        zoneMeshMapRef.current[registerZoneId] = mesh;
      }
      groups[discipline].add(mesh);
      return mesh;
    };

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.15 });
    const columnSteelMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35, metalness: 0.65 });
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

    // 1. BIT-4: PODIUM TRANSFER DECK (+4.50m RL) & TRANSFER GIRDER TG-03 (NCR-2026-STR-042)
    addPart(
      "STRUCTURAL",
      new THREE.BoxGeometry(64, 1.2, 52),
      concreteMat,
      [0, 3.9, 0],
      {
        zoneId: "BIT-4-TG03",
        title: "Podium Transfer Slab (+4.50m RL)",
        ifcClass: "IfcSlab",
        bitCode: "BIT-4 PODIUM",
        discipline: "STRUCTURAL",
        spec: "M45 Post-Tensioned Transfer Deck (1,200mm thick)",
        elevation: "+4.50m RL",
        concreteGrade: "M45",
        budgetOrMetric: "₹132.20 Cr Package • 94% Complete",
        tourZone: "BIT-4",
      }
    );

    // Highlightable Transfer Girder TG-03 (Grid C2–C5, Level 3 Podium Deck)
    addPart(
      "STRUCTURAL",
      new THREE.BoxGeometry(16.0, 1.65, 2.2),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0x991b1b,
        emissiveIntensity: 0.75,
        roughness: 0.4,
      }),
      [-6.0, 4.8, -6.0],
      {
        zoneId: "BIT-4-TG03",
        title: "Tower A / BIT-4 – Level 3 Transfer Girder (TG-03)",
        ifcClass: "IfcBeam",
        bitCode: "BIT-4 PODIUM",
        discipline: "STRUCTURAL",
        spec: "M50 High-Strength Transfer Girder (Grid C2–C5) • IS 456:2000 Cl. 17.4.3 Gate",
        elevation: "+4.50m RL",
        concreteGrade: "M50",
        ncrStatus: "NCR-2026-STR-042",
        lienStatus: "LOCKED — ₹4,50,000 Lien Active",
        budgetOrMetric: "NCR-2026-STR-042 Linked",
        tourZone: "BIT-4",
        hasFieldDeviation: true,
      },
      [0, 0, 0],
      "BIT-4-TG03"
    );

    for (let gx = -28; gx <= 28; gx += 14) {
      for (let gz = -22; gz <= 22; gz += 11) {
        const isColC2 = gx === -14 && gz === -11;
        addPart(
          "STRUCTURAL",
          new THREE.BoxGeometry(0.9, 4.5, 0.9),
          isColC2 ? new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x064e3b }) : columnSteelMat,
          [gx, 2.25, gz],
          {
            zoneId: "BIT-4-TG03",
            title: isColC2 ? "Column C2 (NCR #009 Post-Grout Certified)" : `Podium Column Grid (${gx}, ${gz})`,
            ifcClass: "IfcColumn",
            bitCode: "BIT-4 PODIUM",
            discipline: "STRUCTURAL",
            spec: isColC2 ? "M35 RCC • SikaGrout 214 Remediated • SonReb 32.8 MPa" : "M45 Reinforced Concrete Column (900×900mm)",
            elevation: "0.00m to +4.50m RL",
            concreteGrade: isColC2 ? "M35" : "M45",
            budgetOrMetric: isColC2 ? "₹2,08,720 Lien Released" : "IS 456 / IS 2911 Pile Supported",
            tourZone: "BIT-4",
          }
        );
      }
    }

    [-4, 2, 8].forEach((cx, idx) => {
      addPart(
        "HVAC",
        new THREE.BoxGeometry(4.2, 2.4, 2.2),
        chillerMat,
        [cx, 1.4, -2],
        {
          zoneId: "BIT-4-TG03",
          title: `800-Ton VFD Centrifugal Chiller #0${idx + 1}`,
          ifcClass: "IfcChiller",
          bitCode: "BIT-4 PODIUM",
          discipline: "HVAC",
          spec: "800 TR Variable-Speed Magnetic Bearing Chiller (2,400 TR Plant)",
          elevation: "+0.20m RL",
          budgetOrMetric: "COP 6.45 • Primary Loop Balanced",
          tourZone: "BIT-4",
        }
      );
    });

    // 2. BIT-3: 14-STOREY COMMERCIAL & HOSPITALITY TOWER (+54.00m RL)
    const towerX = -10;
    const towerZ = -13;
    const towerW = 20;
    const towerD = 18;
    const floors = 14;
    const floorH = 3.5;

    addPart(
      "STRUCTURAL",
      new THREE.BoxGeometry(6.5, floors * floorH, 5.5),
      concreteMat,
      [towerX, 4.5 + (floors * floorH) / 2, towerZ],
      {
        zoneId: "BIT-3-CORE",
        title: "14-Storey RCC Central Shear Core",
        ifcClass: "IfcWall",
        bitCode: "BIT-3 HOTEL CORE",
        discipline: "STRUCTURAL",
        spec: "M50 High-Strength Reinforced Concrete Core Wall (450mm)",
        elevation: "+4.50m to +54.00m RL",
        concreteGrade: "M50",
        budgetOrMetric: "IS 1893 Seismic Zone III Compliant",
        tourZone: "BIT-3",
      },
      [0, 0, 0],
      "BIT-3-CORE"
    );

    for (let f = 1; f <= floors; f++) {
      const fy = 4.5 + f * floorH;
      addPart(
        "STRUCTURAL",
        new THREE.BoxGeometry(towerW, 0.32, towerD),
        concreteMat,
        [towerX, fy, towerZ],
        {
          zoneId: "BIT-3-CORE",
          title: `Tower Level ${f.toString().padStart(2, "0")} Floor Slab`,
          ifcClass: "IfcSlab",
          bitCode: "BIT-3 HOTEL CORE",
          discipline: "STRUCTURAL",
          spec: `Post-Tensioned Flat Slab • Level ${f} (+${fy.toFixed(1)}m RL)`,
          elevation: `+${fy.toFixed(1)}m RL`,
          concreteGrade: "M50",
          budgetOrMetric: "₹286.50 Cr Tower Package",
          tourZone: "BIT-3",
        }
      );
    }

    [-2.1, -0.7, 0.7, 2.1].forEach((lx, idx) => {
      addPart(
        "ELECTRICAL",
        new THREE.BoxGeometry(1.1, floors * floorH - 1, 1.3),
        elecLiftMat,
        [towerX + lx, 4.5 + (floors * floorH) / 2, towerZ + 3.4],
        {
          zoneId: "BIT-3-CORE",
          title: `High-Speed Passenger Lift Shaft #0${idx + 1}`,
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

    [-4.2, 4.2].forEach((hx, idx) => {
      addPart(
        "HVAC",
        new THREE.BoxGeometry(1.1, floors * floorH, 0.95),
        hvacDuctMat,
        [towerX + hx, 4.5 + (floors * floorH) / 2, towerZ + 3.4],
        {
          zoneId: "BIT-3-CORE",
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

    addPart(
      "PLUMBING",
      new THREE.CylinderGeometry(0.22, 0.22, floors * floorH, 12),
      firePipeMat,
      [towerX + 5.2, 4.5 + (floors * floorH) / 2, towerZ - 2.2],
      {
        zoneId: "BIT-3-CORE",
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

    addPart(
      "ARCHITECTURE",
      new THREE.BoxGeometry(towerW + 0.3, floors * floorH, towerD + 0.3),
      glassCurtainMat,
      [towerX, 4.5 + (floors * floorH) / 2, towerZ],
      {
        zoneId: "BIT-3-CORE",
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

    // 3. BIT-2: ACOUSTIC AUDITORIUM CONCOURSE & KALZIP SILVER DOME (+16.50m RL)
    const domeX = 14;
    const domeZ = 12;
    const domeR = 11.5;

    addPart(
      "STRUCTURAL",
      new THREE.CylinderGeometry(domeR, domeR + 0.6, 5.5, 32, 1, true),
      concreteMat,
      [domeX, 7.25, domeZ],
      {
        zoneId: "BIT-2-DOME",
        title: "Acoustic Auditorium Ring Beam & Perimeter Wall",
        ifcClass: "IfcWall",
        bitCode: "BIT-2 SILVER DOME",
        discipline: "STRUCTURAL",
        spec: "M45 Circular Tension Ring Beam supporting 2,100-Ton Dome",
        elevation: "+4.50m to +10.00m RL",
        concreteGrade: "M45",
        budgetOrMetric: "₹164.80 Cr Package • 85% Complete",
        tourZone: "BIT-2",
      }
    );

    addPart(
      "STRUCTURAL",
      new THREE.SphereGeometry(domeR, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, wireframe: true, roughness: 0.3 }),
      [domeX, 10.0, domeZ],
      {
        zoneId: "BIT-2-DOME",
        title: "2,100-Ton Space-Frame Truss Dome Lattice (Node #14B)",
        ifcClass: "IfcRoof",
        bitCode: "BIT-2 SILVER DOME",
        discipline: "STRUCTURAL",
        spec: "MERO-Type Spherical Node Space-Frame (Node #14B Δ 4.2mm Field Offset)",
        elevation: "+10.00m to +21.50m RL",
        concreteGrade: "Structural Steel E350",
        budgetOrMetric: "SNAG-VANGUARD-401 Active",
        tourZone: "BIT-2",
        hasFieldDeviation: true,
      }
    );

    addPart(
      "ARCHITECTURE",
      new THREE.SphereGeometry(domeR + 0.25, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2),
      kalzipShellMat,
      [domeX, 10.0, domeZ],
      {
        zoneId: "BIT-2-DOME",
        title: "Kalzip Standing-Seam Aluminum Acoustic Dome Shell",
        ifcClass: "IfcCovering",
        bitCode: "BIT-2 SILVER DOME",
        discipline: "ARCHITECTURE",
        spec: "Kalzip 65/400 Standing-Seam Roof + Gypsum Acoustic Soffit",
        elevation: "+16.50m RL Mean Datum",
        budgetOrMetric: "mmWave Plenum Radar Recommended",
        tourZone: "BIT-2",
      }
    );

    // 4. BIT-1: MONUMENTAL TERRACOTTA BRIDGE ARCH & GREEN WEDGE (+12.00m RL)
    const archX = -14;
    const archZ = 12;

    addPart(
      "STRUCTURAL",
      new THREE.BoxGeometry(24, 1.4, 14.0),
      concreteMat,
      [archX, 12.2, archZ],
      {
        zoneId: "BIT-1-ARCH",
        title: "48m Clear-Span Post-Tensioned Bridge Arch Deck",
        ifcClass: "IfcBeam",
        bitCode: "BIT-1 GREEN WEDGE",
        discipline: "STRUCTURAL",
        spec: "Post-Tensioned Box Girder supporting Stepped Green Amphitheatre",
        elevation: "+12.00m RL",
        concreteGrade: "M45",
        budgetOrMetric: "78% Complete",
        tourZone: "BIT-1",
      },
      [0, 0, 0],
      "BIT-1-ARCH"
    );

    addPart(
      "ARCHITECTURE",
      new THREE.BoxGeometry(24.4, 2.2, 14.4),
      terracottaMat,
      [archX, 11.4, archZ],
      {
        zoneId: "BIT-1-ARCH",
        title: "Extruded Terracotta Louver Facade Band",
        ifcClass: "IfcCurtainWall",
        bitCode: "BIT-1 GREEN WEDGE",
        discipline: "ARCHITECTURE",
        spec: "Ventilated Terracotta Baguette Rainscreen",
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
        zoneId: "BIT-1-ARCH",
        title: "Stepped Green Turf Amphitheatre Roof Deck",
        ifcClass: "IfcRoof",
        bitCode: "BIT-1 GREEN WEDGE",
        discipline: "ARCHITECTURE",
        spec: "Intensive Green Roof Retention Substrate",
        elevation: "+13.10m RL",
        budgetOrMetric: "GRIHA 5-Star Envelope",
        tourZone: "BIT-1",
      }
    );

    // 5. BIT-5 (EAST WING) & BIT-6 (SLIM HELIPAD DECK)
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
          zoneId: "BIT-5-WING",
          title: `East Innovation Wing Steel-Composite Deck L${ef}`,
          ifcClass: "IfcSlab",
          bitCode: "BIT-5 EAST WING",
          discipline: "STRUCTURAL",
          spec: `ISMB 450 Composite Frame Deck (+${ey.toFixed(1)}m RL)`,
          elevation: `+${ey.toFixed(1)}m RL`,
          concreteGrade: "M40 Composite",
          budgetOrMetric: "₹108.60 Cr Package",
          tourZone: "BIT-5",
        },
        [0, 0, 0],
        ef === 4 ? "BIT-5-WING" : undefined
      );
    }

    const heliY = 4.5 + eastFloors * 3.35 + 1.4;
    addPart(
      "STRUCTURAL",
      new THREE.CylinderGeometry(7.6, 7.2, 0.9, 24),
      columnSteelMat,
      [eastX, heliY, eastZ],
      {
        zoneId: "BIT-6-HELI",
        title: "BIT-6 Cantilevered Steel Box-Girder Helipad Deck",
        ifcClass: "IfcSlab",
        bitCode: "BIT-6 SLIM PAD",
        discipline: "STRUCTURAL",
        spec: "Structural Steel Cantilevered Helideck (Bell 429 / AW109 Rated)",
        elevation: "+23.00m / +29.3m RL",
        concreteGrade: "Structural Steel E350",
        budgetOrMetric: "₹54.00 Cr Package",
        tourZone: "BIT-6",
      },
      [0, 0, 0],
      "BIT-6-HELI"
    );

    // 6. SITE PLANT: LIEBHERR 280 EC-H TOWER CRANE + SNAG/NCR PINS
    const [cx, , cz] = VANGUARD_GENOME.craneTelemetry.basePos;
    const jibRad = (VANGUARD_GENOME.craneTelemetry.azimuthDeg * Math.PI) / 180;

    addPart(
      "SITE_PLANT",
      new THREE.BoxGeometry(2.0, 62, 2.0),
      craneYellowMat,
      [cx, 31, cz],
      {
        zoneId: "BIT-2-DOME",
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

    const jibGroup = new THREE.Group();
    jibGroup.position.set(cx, 60.5, cz);
    jibGroup.rotation.y = jibRad;
    groups.SITE_PLANT.add(jibGroup);

    const jibMesh = new THREE.Mesh(new THREE.BoxGeometry(54, 1.4, 1.4), craneYellowMat);
    jibMesh.position.set(16, 0, 0);
    jibGroup.add(jibMesh);

    VANGUARD_GENOME.spatialPins.forEach((pin) => {
      const pinColor =
        pin.severity === "MINOR"
          ? 0xef4444
          : pin.severity === "RESOLVED_CERTIFIED"
          ? 0x10b981
          : 0x38bdf8;

      const mappedZone =
        pin.bitId === "BIT-4"
          ? "BIT-4-TG03"
          : pin.bitId === "BIT-2"
          ? "BIT-2-DOME"
          : pin.bitId === "BIT-3"
          ? "BIT-3-CORE"
          : "BIT-1-ARCH";

      addPart(
        "SITE_PLANT",
        new THREE.OctahedronGeometry(1.25, 0),
        new THREE.MeshStandardMaterial({
          color: pinColor,
          emissive: pinColor,
          emissiveIntensity: 0.55,
        }),
        pin.worldPos,
        {
          zoneId: mappedZone,
          title: `${pin.pinId}: ${pin.title}`,
          ifcClass: "IfcSpatialAnnotation",
          bitCode: pin.bitId,
          discipline: pin.discipline,
          spec: pin.description,
          elevation: `Y = +${pin.worldPos[1].toFixed(1)}m RL`,
          ncrStatus: pin.pinId,
          budgetOrMetric: pin.metricLabel,
          tourZone: pin.bitId,
          hasFieldDeviation: pin.severity === "MINOR",
        },
        [0, 0, 0],
        pin.bitId === "BIT-2" ? "BIT-2-DOME" : undefined
      );
    });

    setLayers((prev) =>
      prev.map((l) => ({ ...l, meshCount: groups[l.id].children.length }))
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

    let grid = new THREE.GridHelper(120, 60, 0x1e293b, 0x0f172a);
    scene.add(grid);

    const applyThreeTheme = (mode: string) => {
      const isLight = mode === "claude-light";
      const bgHex = isLight ? 0xefece4 : 0x060911;
      scene.background = new THREE.Color(bgHex);
      scene.fog = new THREE.FogExp2(bgHex, isLight ? 0.0022 : 0.0032);
      scene.remove(grid);
      grid = new THREE.GridHelper(
        120,
        60,
        isLight ? 0xc96442 : 0x1e293b,
        isLight ? 0xd8d2c5 : 0x0f172a
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
    // Cap WebGL devicePixelRatio at 1.5 for smooth 60fps rendering on field laptops & tablets
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

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

    const params = new URLSearchParams(window.location.search);
    const requestedZone = params.get("zone");
    const requestedNcr = params.get("ncr") || undefined;
    const requestedBit = params.get("bit");

    const initControls = async () => {
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      if (cancelled) return;
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controlsRef.current = controls;

      if (requestedZone) {
        const zone = findBimZone(requestedZone);
        const [tx, ty, tz] = zone.worldPos;
        controls.target.set(tx, ty, tz);
        camera.position.set(tx + 22, ty + 16, tz + 24);
        controls.update();
        setActiveZoneId(zone.zoneId);
        setActiveBitFocus(zone.bitId);
        setSelectedMeta({
          zoneId: zone.zoneId,
          title: zone.label,
          ifcClass: "IfcBeam / IfcBuildingStorey",
          bitCode: zone.bitId,
          discipline: "STRUCTURAL",
          spec: zone.structuralElement,
          elevation: zone.elevationLabel,
          concreteGrade: zone.concreteGrade,
          ncrStatus: requestedNcr || zone.linkedNcrId || "ACTIVE TELEMETRY",
          lienStatus:
            zone.zoneId === "BIT-4-TG03"
              ? "LOCKED — ₹4,50,000 Lien Active"
              : "UNLOCKED — ₹0 Lien",
          budgetOrMetric: requestedNcr || zone.linkedNcrId || "LOD-400 Grounded",
          tourZone: zone.bitId,
          hasFieldDeviation: true,
        });
      } else if (requestedBit) {
        const matchedBit = VANGUARD_GENOME.bits.find(
          (b) => b.bitId === requestedBit.toUpperCase()
        );
        if (matchedBit) {
          const [tx, ty, tz] = matchedBit.worldPos;
          controls.target.set(tx, ty, tz);
          camera.position.set(tx + 28, ty + 20, tz + 30);
          controls.update();
          setActiveBitFocus(matchedBit.bitId);
        } else {
          controls.target.set(0, 14, 0);
          controls.update();
        }
      } else {
        controls.target.set(0, 14, 0);
        controls.update();
      }
      setIsLoaded(true);
    };
    initControls();

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
          const meta = mesh.userData as SelectedElementMeta;
          if (meta.zoneId) setActiveZoneId(meta.zoneId);
          setSelectedMeta(meta);
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
      if (tweenFrameRef.current) cancelAnimationFrame(tweenFrameRef.current);
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
    const matchingZone = BIM_ZONE_REGISTRY.find((z) => z.bitId === bit.bitId);
    if (matchingZone) setActiveZoneId(matchingZone.zoneId);
    focusCameraOn(bit.worldPos, Math.max(bit.dimensionsM[0], bit.dimensionsM[1]) * 1.15);
    setSelectedMeta({
      zoneId: matchingZone?.zoneId,
      title: `${bit.code}: ${bit.name}`,
      ifcClass: "IfcBuildingStorey / SpatialZone",
      bitCode: bit.bitId,
      discipline: "FEDERATED_LOD400",
      spec: `${bit.structuralSystem} • ${bit.mepSystem}`,
      elevation: bit.elevationLabel,
      concreteGrade: matchingZone?.concreteGrade || "M45",
      ncrStatus: bit.activeIssueId || "NOMINAL",
      lienStatus:
        bit.bitId === "BIT-4" && escrowLocked
          ? `LOCKED — ₹${escrowLienInr.toLocaleString("en-IN")} Lien Active`
          : "UNLOCKED — ₹0 Lien",
      budgetOrMetric: `₹${bit.allocatedBudgetCr.toFixed(2)} Cr • ${bit.completionPct}% Complete`,
      tourZone: bit.bitId,
      hasFieldDeviation: bit.status === "SNAG_FLAGGED" || (bit.bitId === "BIT-4" && escrowLocked),
    });
  };

  const handleDeployMissingRay = (zoneId: string, modality: RayModality) => {
    setDeployedSensorsByZone((prev) => {
      const existing = prev[zoneId] || [];
      if (existing.includes(modality)) return prev;
      return { ...prev, [zoneId]: [...existing, modality] };
    });
  };

  const handleApproveAsBuiltRevitSync = (zoneId: string) => {
    const zone = findBimZone(zoneId);
    const deltaMm: [number, number, number] =
      zoneId === "BIT-2-DOME" ? [4.2, -1.5, 0.0] : [0.0, -3.0, 2.5];
    const hash = Array.from({ length: 64 }, (_, i) =>
      ((i * 17 + zoneId.charCodeAt(i % zoneId.length)) % 16).toString(16)
    ).join("");

    const packet = buildRevitAsBuiltDeltaPacket({
      bimZoneId: zone.zoneId,
      bitCode: zone.bitId,
      ifcEntityClass: selectedMeta?.ifcClass || "IfcBeam",
      elementTitle: zone.label,
      deltaMm,
      justification:
        "Field deviation structurally verified via multi-ray fusion & engineer sign-off; committed to As-Built BIM baseline.",
      approvedBy: "CHIEF-STR-ENG-LKO",
      attestationHash: hash,
    });

    setReconciledAsBuiltZones((prev) => ({ ...prev, [zone.zoneId]: packet }));
    setSelectedMeta((prev) =>
      prev
        ? {
            ...prev,
            ncrStatus: "AS-BUILT RECONCILED (REVIT / IFC PATCH READY)",
            hasFieldDeviation: false,
          }
        : null
    );
  };

  const downloadRevitDeltaJson = (packet: RevitAsBuiltDeltaPacket) => {
    const blob = new Blob([JSON.stringify(packet, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revit_ifc_asbuilt_delta_${packet.bimZoneId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          setUploadStatus(`Mounted ${file.name} (Confined to Campus Datum)`);
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

  const activeReconciledPacket = reconciledAsBuiltZones[activeZoneId];

  return (
    <div className="min-h-screen h-screen bg-zinc-950 text-zinc-100 flex flex-col font-mono select-none overflow-hidden">
      <MillimeterHeatmapHud />
      {/* Top Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/95 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-900 text-zinc-200 border border-zinc-700 rounded">
              {activeProject.code} • {activeProject.projectId}
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded">
              LOD-400 • {totalMeshes} ELEMENTS • {STRUCTURE_DATUM_SPEC.datumLabel}
            </span>
          </div>
          <h1 className="text-sm font-bold text-white mt-1">
            {activeProject.name.toUpperCase()} — SPATIAL 3D BIM & MULTI-RAY DIGITAL TWIN
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => setShowSchematicDrawer((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg border font-bold transition ${
              showSchematicDrawer
                ? "bg-zinc-100 text-zinc-950 border-white"
                : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200"
            }`}
          >
            📐 SPATIAL SCHEMATIC & 1:1 VR REF
          </button>
          <button
            type="button"
            onClick={toggleXrayMode}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold transition"
          >
            {xrayArch ? "X-RAY ENVELOPE: ON" : "SOLID FACADE"}
          </button>
          <button
            type="button"
            onClick={resetFullCampusView}
            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg font-bold transition"
          >
            FULL CAMPUS
          </button>
          <label className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg cursor-pointer transition">
            + .IFC/.GLB
            <input type="file" accept=".ifc,.glb,.gltf" onChange={handleExternalModelUpload} className="hidden" />
          </label>
          <a
            href="/site/vr-walkthrough"
            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg font-bold transition"
          >
            �� QUEST 3S VR
          </a>
          <a
            href="/"
            className="px-2.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-lg transition"
          >
            ← COMMAND CENTER
          </a>
        </div>
      </div>

      {/* 6 Architectural Bits & Active Hold Ribbon */}
      <div className="border-b border-zinc-800/90 bg-zinc-900/70 px-4 py-1.5 flex items-center justify-between gap-2 overflow-x-auto shrink-0 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-400 font-bold uppercase shrink-0">
            BIM ZONES:
          </span>
          {VANGUARD_GENOME.bits.map((bit) => {
            const isBlockedBit = bit.bitId === "BIT-4" && escrowLocked && !reconciledAsBuiltZones["BIT-4-TG03"];
            return (
              <button
                key={bit.bitId}
                type="button"
                onClick={() => focusBit(bit)}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold shrink-0 transition flex items-center gap-1.5 ${
                  activeBitFocus === bit.bitId
                    ? "bg-zinc-100 border-white text-zinc-950"
                    : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <span>{bit.code}</span>
                {(bit.status === "SNAG_FLAGGED" || isBlockedBit) && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Sensor Blind-Spot Pill */}
        <div className="shrink-0 flex items-center gap-2 text-[10px]">
          {activeAdvisories.length > 0 ? (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold">
              ⚠ {activeAdvisories.length} SENSOR BLIND-SPOT ADVISORIES ACTIVE
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold">
              ✓ ALL 4 RAY SPECTRUMS VERIFIED ACROSS CAMPUS
            </span>
          )}
        </div>
      </div>

      {/* Main 3D WebGL Canvas & Overlays */}
      <div className="relative flex-1 w-full bg-[#060911] overflow-hidden">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {!isLoaded && (
          <div className="absolute inset-0 bg-zinc-950/90 flex items-center justify-center z-20 text-xs text-zinc-300 font-bold">
            Compiling LOD-400 Structural, MEP & Multi-Ray Campus Twin...
          </div>
        )}

        {/* Low-Bandwidth Spatial Zone Schematic & 1:1 VR Walkthrough Overlay */}
        {showSchematicDrawer && (
          <div className="absolute inset-x-4 top-4 z-30 bg-zinc-950/95 backdrop-blur-md border border-zinc-700 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div>
                <div className="text-[10px] font-bold uppercase text-zinc-400">
                  LOW-BANDWIDTH SPATIAL SCHEMATIC & 1:1 META QUEST 3 / 3S VR WALKTHROUGH REFERENCE
                </div>
                <div className="text-sm font-bold text-white">
                  Single-Structure Confinement: {STRUCTURE_DATUM_SPEC.envelopeMeters} • {STRUCTURE_DATUM_SPEC.datumLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSchematicDrawer(false)}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold"
              >
                Close Schematic ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {multiRayStates.map((st) => (
                <div
                  key={st.zoneId}
                  onClick={() => {
                    focusBimZone(st.zoneId);
                    setShowSchematicDrawer(false);
                  }}
                  className="p-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-600 cursor-pointer flex flex-col justify-between gap-2 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{st.zoneId}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        st.advisory
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      CONFIDENCE {st.compositeConfidencePct}%
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-300">{st.zoneLabel}</div>
                  <div className="text-[10px] text-zinc-400">
                    Coords: [{st.worldPos.join(", ")}]m • Residual: {st.datumResidualMm}mm • Lux: {st.ambientLux} lx
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-[10px]">
                    <span className="text-zinc-300">1:1 VR Ref: Enscape / Quest 3S</span>
                    <span className="text-emerald-400 font-bold">Focus Zone →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Left Discipline Toggle Matrix & Pinned Telemetry */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 w-72 bg-zinc-950/85 backdrop-blur-md p-3 rounded-2xl border border-zinc-800 shadow-2xl max-h-[calc(100%-24px)] overflow-y-auto">
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            FEDERATED BIM DISCIPLINES
          </span>
          <div className="flex flex-col gap-1">
            {layers.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => toggleLayer(layer.id)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition ${
                  layer.active
                    ? "bg-zinc-900 border-zinc-700 text-white"
                    : "bg-zinc-950/50 border-zinc-900 text-zinc-500"
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: layer.active ? layer.colorHex : "#52525b" }}
                  />
                  <span className="truncate">{layer.label}</span>
                </div>
                <span className="text-[10px] shrink-0 text-zinc-400">{layer.meshCount}</span>
              </button>
            ))}
          </div>

          {/* Bidirectional NCR & Spatial Telemetry Quick-Jump */}
          <div className="pt-2 mt-1 border-t border-zinc-800 flex flex-col gap-1.5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              PINNED NCR & SPATIAL TELEMETRY
            </span>

            <button
              type="button"
              onClick={() => focusBimZone("BIT-4-TG03", activeNcrCode)}
              className={`text-left px-2.5 py-2 rounded-xl border text-[10px] flex flex-col gap-0.5 transition ${
                escrowLocked && !reconciledAsBuiltZones["BIT-4-TG03"]
                  ? "bg-rose-500/15 border-rose-500/40 text-rose-200"
                  : "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
              }`}
            >
              <div className="flex justify-between items-center font-bold">
                <span>{activeNcrCode} (TG-03)</span>
                <span>{escrowLocked ? "₹4.50L HOLD" : "CLEARED"}</span>
              </div>
              <span className="text-[9px] text-zinc-400">
                Tower A / BIT-4 Level 3 Transfer Girder (M50)
              </span>
            </button>

            {VANGUARD_GENOME.spatialPins.map((pin) => {
              const targetZone =
                pin.bitId === "BIT-4"
                  ? "BIT-4-TG03"
                  : pin.bitId === "BIT-2"
                  ? "BIT-2-DOME"
                  : pin.bitId === "BIT-3"
                  ? "BIT-3-CORE"
                  : "BIT-1-ARCH";
              return (
                <button
                  key={pin.pinId}
                  type="button"
                  onClick={() => focusBimZone(targetZone, pin.pinId)}
                  className="text-left px-2.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 text-[10px] flex justify-between items-center"
                >
                  <span className="text-zinc-200 font-bold truncate pr-2">{pin.pinId}</span>
                  <span
                    className={
                      pin.severity === "MINOR"
                        ? "text-rose-400 font-bold"
                        : pin.severity === "RESOLVED_CERTIFIED"
                        ? "text-emerald-400 font-bold"
                        : "text-zinc-300"
                    }
                  >
                    {pin.metricLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Glassmorphic Telemetry HUD: Element Inspector + Multi-Ray Fusion + Revit As-Built Write-Back */}
        <div className="absolute top-3 right-3 z-10 w-96 max-w-[calc(100vw-24px)] bg-zinc-950/90 backdrop-blur-md p-3.5 rounded-2xl border border-zinc-800 shadow-2xl flex flex-col gap-3 text-xs max-h-[calc(100%-24px)] overflow-y-auto">
          {selectedMeta ? (
            <div className="flex flex-col gap-2 border-b border-zinc-800 pb-3">
              <div className="flex justify-between items-start gap-2">
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200 text-[10px] font-bold">
                  {selectedMeta.bitCode} • {selectedMeta.discipline}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMeta(null)}
                  className="text-zinc-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>
              <div className="text-sm font-bold text-white leading-snug">{selectedMeta.title}</div>
              <div className="text-[10px] text-zinc-400">
                IFC: {selectedMeta.ifcClass} • Grade: {selectedMeta.concreteGrade || "M45"} • {selectedMeta.elevation}
              </div>
              <div className="text-[11px] text-zinc-300 bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800 leading-relaxed">
                {selectedMeta.spec}
              </div>

              {selectedMeta.ncrStatus && (
                <div className="flex justify-between items-center text-[10px] bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-800">
                  <span className="text-zinc-400">NCR / QA GATE:</span>
                  <span
                    className={`font-bold ${
                      selectedMeta.ncrStatus.includes("HOLD") || selectedMeta.ncrStatus.includes("042")
                        ? escrowLocked && !activeReconciledPacket
                          ? "text-rose-400"
                          : "text-emerald-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {selectedMeta.ncrStatus}
                  </span>
                </div>
              )}

              {selectedMeta.lienStatus && (
                <div className="flex justify-between items-center text-[10px] bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-800">
                  <span className="text-zinc-400">ESCROW LIEN:</span>
                  <span
                    className={`font-bold ${
                      selectedMeta.lienStatus.startsWith("LOCKED")
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {selectedMeta.lienStatus}
                  </span>
                </div>
              )}

              {/* As-Built Field Deviation -> Revit / IFC Delta Write-Back */}
              {(selectedMeta.hasFieldDeviation || activeReconciledPacket) && (
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-zinc-100">
                      REVIT / IFC AS-BUILT RECONCILIATION LOOP
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {activeReconciledPacket ? "SYNCED" : "DELTA DETECTED"}
                    </span>
                  </div>
                  {!activeReconciledPacket ? (
                    <>
                      <p className="text-[10px] text-zinc-400 leading-relaxed">
                        If this on-site deviation is structurally workable, approve it as the new As-Built baseline and emit a Revit Dynamo / IFC patch so downstream MEP models stay synchronized.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleApproveAsBuiltRevitSync(activeZoneId)}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-[10px] transition"
                      >
                        Approve Field Variation & Write-Back to Revit/IFC
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1.5 text-[10px]">
                      <div className="text-emerald-400 font-bold">
                        ✓ As-Built Offset [{activeReconciledPacket.asBuiltDeviationDeltaMm.join(", ")}]mm Committed
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadRevitDeltaJson(activeReconciledPacket)}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] hover:bg-emerald-500/30 transition"
                      >
                        Download Revit Dynamo / IFC Delta Patch (.json)
                      </button>
                    </div>
                  )}
                </div>
              )}

              <a
                href={`/site/360-tour?zone=${selectedMeta.tourZone || "BIT-4"}`}
                className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-bold text-[10px] text-center transition"
              >
                OPEN 1:1 VR & 360° REALITY WALKTHROUGH ({selectedMeta.tourZone || "BIT-4"}) →
              </a>
            </div>
          ) : (
            <div className="text-[11px] text-zinc-400 border-b border-zinc-800 pb-2">
              Click any 3D structural member or NCR pin to inspect grade, escrow lien, and Revit As-Built delta.
            </div>
          )}

          {/* Multi-Ray Sensor Fusion & Active "Needs More Data" Advisory Engine */}
          {activeZoneFusion && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                  MULTI-RAY SENSOR FUSION ({activeZoneFusion.zoneId})
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    activeZoneFusion.compositeConfidencePct >= 85
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {activeZoneFusion.compositeConfidencePct}% MAPPED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                {(Object.keys(RAY_MODALITY_META) as RayModality[]).map((mod) => {
                  const cov = activeZoneFusion.rayCoverage[mod];
                  return (
                    <div
                      key={mod}
                      className={`p-2 rounded-xl border ${
                        cov.active
                          ? "bg-zinc-900/90 border-zinc-800 text-zinc-200"
                          : "bg-amber-500/10 border-amber-500/35 text-amber-200"
                      }`}
                    >
                      <div className="flex justify-between font-bold">
                        <span>{RAY_MODALITY_META[mod].shortLabel}</span>
                        <span>{cov.coveragePct}%</span>
                      </div>
                      <div className="text-[9px] text-zinc-400 truncate mt-0.5">
                        {cov.sourceTag}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Anti-Spoof Material & Curing Signature */}
              <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[10px] flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">MATERIAL & CURING TRUTH:</span>
                  <span
                    className={`font-bold ${
                      activeZoneFusion.materialSignature.antiSpoofVerified
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {activeZoneFusion.materialSignature.antiSpoofVerified
                      ? "BULK VERIFIED"
                      : "SPOOF RISK"}
                  </span>
                </div>
                <div className="text-zinc-200 font-bold">
                  {activeZoneFusion.materialSignature.detectedMaterial}
                </div>
                <div className="text-zinc-400">
                  Dielectric εr: {activeZoneFusion.materialSignature.dielectricEr} • Temp:{" "}
                  {activeZoneFusion.materialSignature.surfaceTempC}°C • Hydration:{" "}
                  {activeZoneFusion.materialSignature.curingHydrationPct}% • Lux:{" "}
                  {activeZoneFusion.ambientLux} lx
                </div>
              </div>

              {/* Active "Needs More Data" Sensor Prescription */}
              {activeZoneFusion.advisory && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 flex flex-col gap-2 text-[10px]">
                  <div className="font-bold text-amber-300">
                    ⚠ NEEDS MORE DATA: {activeZoneFusion.advisory.blindSpotType.replace(/_/g, " ")}
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    {activeZoneFusion.advisory.diagnosticReason}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleDeployMissingRay(
                        activeZoneFusion.zoneId,
                        activeZoneFusion.advisory!.missingModality
                      )
                    }
                    className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition"
                  >
                    + Deploy {RAY_MODALITY_META[activeZoneFusion.advisory.missingModality].shortLabel} to Close Blind Spot
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {uploadStatus && (
          <div className="absolute bottom-10 left-4 z-10 bg-zinc-900/95 border border-zinc-700 text-zinc-200 px-3 py-1.5 rounded-xl text-xs">
            {uploadStatus}
          </div>
        )}

        <div className="absolute bottom-3 right-3 z-10 text-[10px] text-zinc-400 bg-zinc-950/85 px-2.5 py-1 rounded-lg border border-zinc-800">
          DPR Capped 1.5× • SE(3) Datum Confined • Click Any Structural Member or Pin
        </div>
      </div>
    </div>
  );
}
