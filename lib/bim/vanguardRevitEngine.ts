import * as THREE from "three";
import { VANGUARD_GENOME, DisciplineId } from "@/lib/project/vanguardGenome";

export interface BimMolecularElement {
  guid: string;
  mark: string;
  name: string;
  revitFamily: string;
  revitType: string;
  ifcClass: string;
  discipline: DisciplineId;
  bitCode: string;
  zoneId: string;
  level: string;
  gridline: string;
  worldPos: [number, number, number];
  dimensionsMm: string;
  materialSpec: string;
  manufacturer: string;
  liveTelemetry: string;
  complianceStandard: string;
  boqRateInr: number;
  status: "VERIFIED_OK" | "WATCH_TOLERANCE" | "CRITICAL_HOLD";
  isOuterShell?: boolean;
}

export interface UnifiedRevitTwinHandle {
  rootGroup: THREE.Group;
  allMeshes: THREE.Mesh[];
  zoneMeshMap: Record<string, THREE.Mesh>;
  disciplineCounts: Record<DisciplineId, number>;
  totalSelectableCount: number;
  interiorFocusPos: [number, number, number];
  highlightElement: (mesh: THREE.Mesh | null) => void;
  setDisciplineVisibility: (discipline: DisciplineId, visible: boolean) => void;
  setXrayMode: (enabled: boolean) => void;
  registerExternalObject: (obj: THREE.Object3D, sourceFileName: string) => number;
  animate: (elapsedSec: number) => void;
  dispose: () => void;
}

function makeIfcGuid(prefix: string, idx: number): string {
  const hex = (((idx + 1) * 2654435761) >>> 0).toString(16).toUpperCase().padStart(8, "0");
  return `3V$${prefix}_${hex}`;
}

export function buildUnifiedVanguardRevitTwin(scene: THREE.Scene): UnifiedRevitTwinHandle {
  const existing = scene.getObjectByName("VANGUARD_UNIFIED_REVIT_LOD400");
  if (existing) scene.remove(existing);

  const rootGroup = new THREE.Group();
  rootGroup.name = "VANGUARD_UNIFIED_REVIT_LOD400";

  const disciplineGroups: Record<DisciplineId, THREE.Group> = {
    STRUCTURAL: new THREE.Group(),
    ARCHITECTURE: new THREE.Group(),
    HVAC: new THREE.Group(),
    PLUMBING: new THREE.Group(),
    ELECTRICAL: new THREE.Group(),
    SITE_PLANT: new THREE.Group(),
  };

  (Object.keys(disciplineGroups) as DisciplineId[]).forEach((k) => {
    disciplineGroups[k].name = `LAYER_${k}`;
    rootGroup.add(disciplineGroups[k]);
  });

  const allMeshes: THREE.Mesh[] = [];
  const zoneMeshMap: Record<string, THREE.Mesh> = {};
  const outerShellMeshes: THREE.Mesh[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // Shared High-Precision Architectural, Structural & MEP PBR Materials
  const matConcreteSlab = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.72, metalness: 0.15 })
  );
  const matSteelColumn = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35, metalness: 0.65 })
  );
  const matCertifiedGreen = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x064e3b,
      emissiveIntensity: 0.45,
      roughness: 0.35,
    })
  );
  const matCriticalRed = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.72,
      roughness: 0.35,
    })
  );
  const matPartitionGypsum = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      emissive: 0x1e293b,
      emissiveIntensity: 0.18,
      roughness: 0.55,
      metalness: 0.08,
    })
  );
  const matGlassPartition = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      emissive: 0x0284c7,
      emissiveIntensity: 0.22,
      transparent: true,
      opacity: 0.46,
      roughness: 0.1,
      metalness: 0.2,
      side: THREE.DoubleSide,
    })
  );
  const matFalseCeiling = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x475569,
      emissiveIntensity: 0.25,
      roughness: 0.42,
      metalness: 0.2,
    })
  );
  const matLedTroffer = trackMat(
    new THREE.MeshStandardMaterial({
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      color: 0xffffff,
      emissive: 0xbae6fd,
      emissiveIntensity: 0.95,
      roughness: 0.2,
    })
  );
  const matPelmetVeneer = trackMat(
    new THREE.MeshStandardMaterial({
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      color: 0xf59e0b,
      emissive: 0x92400e,
      emissiveIntensity: 0.42,
      roughness: 0.35,
      metalness: 0.25,
    })
  );
  const matAlumMullion = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 })
  );
  const matCurtainGlass = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      roughness: 0.12,
      metalness: 0.2,
      side: THREE.DoubleSide,
    })
  );
  const matFireDoor = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      emissive: 0x334155,
      emissiveIntensity: 0.22,
      metalness: 0.45,
      roughness: 0.35,
    })
  );
  const matBrassHardware = trackMat(
    new THREE.MeshStandardMaterial({
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      color: 0xfbbf24,
      emissive: 0xb45309,
      emissiveIntensity: 0.35,
      metalness: 0.85,
      roughness: 0.2,
    })
  );
  const matHvacDuct = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x15803d,
      emissiveIntensity: 0.32,
      metalness: 0.72,
      roughness: 0.28,
    })
  );
  const matAcUnit = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0x334155,
      emissiveIntensity: 0.22,
      metalness: 0.35,
      roughness: 0.35,
    })
  );
  const matDarkFan = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.75, roughness: 0.3 })
  );
  const matFireRed = trackMat(
    new THREE.MeshStandardMaterial({
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.45,
      metalness: 0.45,
      roughness: 0.28,
    })
  );
  const matElecPurple = trackMat(
    new THREE.MeshStandardMaterial({
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      color: 0xa855f7,
      emissive: 0x581c87,
      emissiveIntensity: 0.4,
      metalness: 0.65,
      roughness: 0.3,
    })
  );
  const matCableTray = trackMat(
    new THREE.MeshStandardMaterial({
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      color: 0xc084fc,
      emissive: 0x6b21a8,
      emissiveIntensity: 0.35,
      metalness: 0.7,
      roughness: 0.3,
    })
  );
  const matKalzipShell = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      roughness: 0.25,
      metalness: 0.85,
      side: THREE.DoubleSide,
    })
  );
  const matTerracotta = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.65, metalness: 0.1 })
  );
  const matGreenTurf = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 })
  );
  const matCraneYellow = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0x854d0e,
      emissiveIntensity: 0.28,
      metalness: 0.5,
      roughness: 0.32,
    })
  );
  const matCraneDark = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.25 })
  );
  const matBallastConcrete = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.78 })
  );

  let guidCounter = 1;
  const registerElement = (
    mesh: THREE.Mesh,
    meta: Omit<BimMolecularElement, "guid">,
    registerZoneId?: string
  ) => {
    const guid = makeIfcGuid(meta.discipline.slice(0, 3), guidCounter++);
    const fullMeta: BimMolecularElement = { ...meta, guid };
    mesh.userData = {
      bimElement: fullMeta,
      zoneId: meta.zoneId,
      title: `${meta.mark}: ${meta.name}`,
      ifcClass: meta.ifcClass,
      bitCode: meta.bitCode,
      discipline: meta.discipline,
      spec: `${meta.revitFamily} • ${meta.materialSpec}`,
      elevation: meta.level,
      concreteGrade: "M50",
      ncrStatus: meta.status === "CRITICAL_HOLD" ? "NCR-2026-STR-042 • HOLD" : "LOD-400 VERIFIED",
      lienStatus:
        meta.status === "CRITICAL_HOLD"
          ? "LOCKED — ₹4,50,000 Lien Active"
          : "UNLOCKED — ₹0 Lien",
      budgetOrMetric: `BOQ ₹${meta.boqRateInr.toLocaleString("en-IN")}`,
      tourZone: meta.bitCode.split(" ")[0],
      hasFieldDeviation: meta.status === "CRITICAL_HOLD",
    };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    disciplineGroups[meta.discipline].add(mesh);
    allMeshes.push(mesh);
    if (meta.isOuterShell) outerShellMeshes.push(mesh);
    if (registerZoneId) {
      mesh.name = `BIM_ZONE_${registerZoneId}`;
      zoneMeshMap[registerZoneId] = mesh;
    }
    return mesh;
  };

  // =========================================================================
  // 1. BIT-4: PODIUM TRANSFER DECK (+4.50m RL), TRANSFER GIRDER TG-03 & CHILLERS
  // =========================================================================
  const podiumSlab = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(64, 1.2, 52)), matConcreteSlab);
  podiumSlab.position.set(0, 3.9, 0);
  registerElement(podiumSlab, {
    mark: "SLB-POD-01",
    name: "Podium Post-Tensioned Transfer Deck (+4.50m RL)",
    revitFamily: "M_Floor_PT_Transfer_1200mm",
    revitType: "1200mm_M45_PostTensioned_Deck",
    ifcClass: "IfcSlab",
    discipline: "STRUCTURAL",
    bitCode: "BIT-4 PODIUM",
    zoneId: "BIT-4-TG03",
    level: "+4.50m RL",
    gridline: "Campus Podium A1–H8",
    worldPos: [0, 3.9, 0],
    dimensionsMm: "64000 × 52000 × 1200 mm",
    materialSpec: "M45 Post-Tensioned Concrete Deck on 600mm Bored Piles (IS 2911)",
    manufacturer: "Quadillar Structural",
    liveTelemetry: "Slab Laser Flatness: FF48 / FL38 • Strain Gauge: Nominal",
    complianceStandard: "IS 456:2000 & IS 1343",
    boqRateInr: 13220000,
    status: "VERIFIED_OK",
  });

  // Critical Hold Element: Transfer Girder TG-03 (NCR-2026-STR-042)
  const tg03Mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(16.0, 1.65, 2.2)), matCriticalRed);
  tg03Mesh.position.set(-6.0, 4.8, -6.0);
  registerElement(
    tg03Mesh,
    {
      mark: "TG-03",
      name: "Tower A / BIT-4 Level 3 Transfer Girder (NCR-2026-STR-042)",
      revitFamily: "M_Concrete_Transfer_Girder_M50",
      revitType: "2200x1650mm_HeavyRebar_M50",
      ifcClass: "IfcBeam",
      discipline: "STRUCTURAL",
      bitCode: "BIT-4 PODIUM",
      zoneId: "BIT-4-TG03",
      level: "+4.50m RL (Grid C2–C5)",
      gridline: "Grid C2–C5 Transfer Spine",
      worldPos: [-6.0, 4.8, -6.0],
      dimensionsMm: "16000 × 2200 × 1650 mm",
      materialSpec: "M50 High-Strength Concrete • IS 456:2000 Cl. 17.4.3 Core Gate",
      manufacturer: "Quadillar Structural",
      liveTelemetry: "28-Day Cube: 41.2 MPa (< 46.0 MPa) • Escrow Hold: ₹4,50,000 Locked",
      complianceStandard: "IS 456:2000 Clause 17.4.3",
      boqRateInr: 450000,
      status: "CRITICAL_HOLD",
    },
    "BIT-4-TG03"
  );

  // Podium Grid Columns
  const podColGeo = trackGeo(new THREE.BoxGeometry(0.9, 4.5, 0.9));
  for (let gx = -28; gx <= 28; gx += 14) {
    for (let gz = -22; gz <= 22; gz += 11) {
      const isColC2 = gx === -14 && gz === -11;
      const colMesh = new THREE.Mesh(podColGeo, isColC2 ? matCertifiedGreen : matSteelColumn);
      colMesh.position.set(gx, 2.25, gz);
      registerElement(colMesh, {
        mark: isColC2 ? "COL-C2-CERT" : `COL-POD-${gx}_${gz}`,
        name: isColC2 ? "Column C2 (NCR #009 Post-Grout Certified)" : `Podium Structural Column (${gx}, ${gz})`,
        revitFamily: "M_Concrete_Column_Rectangular",
        revitType: "900x900mm_M45_RCC",
        ifcClass: "IfcColumn",
        discipline: "STRUCTURAL",
        bitCode: "BIT-4 PODIUM",
        zoneId: "BIT-4-TG03",
        level: "0.00m to +4.50m RL",
        gridline: `Grid (${gx}, ${gz})`,
        worldPos: [gx, 2.25, gz],
        dimensionsMm: "900 × 900 × 4500 mm",
        materialSpec: isColC2
          ? "M35 RCC • SikaGrout 214 Remediated • SonReb 32.8 MPa"
          : "M45 Reinforced Concrete Column",
        manufacturer: "Quadillar Structural",
        liveTelemetry: isColC2 ? "UPV Velocity: 4.25 km/s • Lien Released" : "Vertical Plumbness: 0.02°",
        complianceStandard: "IS 456:2000",
        boqRateInr: 145000,
        status: "VERIFIED_OK",
      });
    }
  }

  // 3 x 800-Ton VFD Centrifugal Chillers in Podium Plant Room
  const chillerGeo = trackGeo(new THREE.BoxGeometry(4.2, 2.4, 2.2));
  [-4, 2, 8].forEach((cx, idx) => {
    const ch = new THREE.Mesh(chillerGeo, matHvacDuct);
    ch.position.set(cx, 1.4, -2);
    registerElement(ch, {
      mark: `CHLR-0${idx + 1}`,
      name: `800-Ton VFD Magnetic-Bearing Centrifugal Chiller #0${idx + 1}`,
      revitFamily: "M_Chiller_WaterCooled_800TR",
      revitType: "800TR_VFD_COP6.45_R134a",
      ifcClass: "IfcChiller",
      discipline: "HVAC",
      bitCode: "BIT-4 PODIUM",
      zoneId: "BIT-4-TG03",
      level: "Plant Room +0.20m RL",
      gridline: `Chiller Bay CH-0${idx + 1}`,
      worldPos: [cx, 1.4, -2],
      dimensionsMm: "4200 × 2200 × 2400 mm",
      materialSpec: "800 TR Variable-Speed Centrifugal Compressor + AHRI Certified Evaporator",
      manufacturer: "Trane / Carrier India",
      liveTelemetry: "COP: 6.45 • Leaving CHW: 6.7°C • Load: 78% Balanced",
      complianceStandard: "ASHRAE 90.1 & ECBC",
      boqRateInr: 1450000,
      status: "VERIFIED_OK",
    });
  });

  // =========================================================================
  // 2. HELPER: BUILD FULL REVIT LOD-400 INTERIOR + MEP FIT-OUT INSIDE ANY TOWER
  //    (Floor Slabs, Room Partitions, Suspended False Ceilings, Cove & Window
  //     Pelmets, Interior Doorways, Low-E Windows, HVAC Ducts, VRV AC Condenser
  //     Units, Fire Hydrant Cabinets, Wet Risers, Electrical DBs & Cable Trays)
  // =========================================================================
  const spinningFans: THREE.Mesh[] = [];

  const populateBuildingRevitLod400 = (cfg: {
    prefix: string;
    bitCode: string;
    zoneId: string;
    centerX: number;
    centerZ: number;
    widthX: number;
    depthZ: number;
    baseY: number;
    floors: number;
    floorH: number;
    hasCoreAndLifts: boolean;
    registerMainZone?: string;
  }) => {
    const {
      prefix,
      bitCode,
      zoneId,
      centerX,
      centerZ,
      widthX,
      depthZ,
      baseY,
      floors,
      floorH,
      hasCoreAndLifts,
      registerMainZone,
    } = cfg;
    const totalH = floors * floorH;

    // Central RCC Shear Core (for main 14-storey tower)
    if (hasCoreAndLifts) {
      const coreMesh = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(5.6, totalH, 4.8)),
        matConcreteSlab
      );
      coreMesh.position.set(centerX, baseY + totalH / 2, centerZ);
      registerElement(
        coreMesh,
        {
          mark: `${prefix}-CORE`,
          name: "14-Storey RCC Central Shear Core & Lift Shaft Wall",
          revitFamily: "M_Shear_Wall_Core_M50",
          revitType: "450mm_M50_SeismicZoneIII",
          ifcClass: "IfcWall",
          discipline: "STRUCTURAL",
          bitCode,
          zoneId,
          level: `+${baseY.toFixed(1)}m to +${(baseY + totalH).toFixed(1)}m RL`,
          gridline: "Central Core Grid C3–E5",
          worldPos: [centerX, baseY + totalH / 2, centerZ],
          dimensionsMm: `5600 × 4800 × ${Math.round(totalH * 1000)} mm`,
          materialSpec: "M50 Reinforced Concrete Shear Wall (Fe550D Rebar)",
          manufacturer: "Quadillar Structural",
          liveTelemetry: "Core Plumbness: 1.1 mm RMS • IS 1893 Seismic Compliant",
          complianceStandard: "IS 1893 & IS 13920",
          boqRateInr: 4200000,
          status: "VERIFIED_OK",
        },
        registerMainZone
      );

      // 4 High-Speed Gearless Lift Shafts
      const liftGeo = trackGeo(new THREE.BoxGeometry(0.95, totalH - 0.6, 1.1));
      [-1.8, -0.6, 0.6, 1.8].forEach((lx, idx) => {
        const lift = new THREE.Mesh(liftGeo, matElecPurple);
        lift.position.set(centerX + lx, baseY + totalH / 2, centerZ + 2.95);
        registerElement(lift, {
          mark: `${prefix}-LIFT-0${idx + 1}`,
          name: `High-Speed Gearless Passenger Lift Shaft #0${idx + 1}`,
          revitFamily: "M_Elevator_Shaft_3.5mps",
          revitType: "20_Passenger_1360kg_Gearless",
          ifcClass: "IfcTransportElement",
          discipline: "ELECTRICAL",
          bitCode,
          zoneId,
          level: "All Floors (L01–L14)",
          gridline: `Lift Bank L-0${idx + 1}`,
          worldPos: [centerX + lx, baseY + totalH / 2, centerZ + 2.95],
          dimensionsMm: `950 × 1100 × ${Math.round(totalH * 1000)} mm`,
          materialSpec: "3.5 m/s Gearless PM Synchronous Traction Drive",
          manufacturer: "Mitsubishi / Schindler",
          liveTelemetry: "Car Speed: 3.5 m/s • MINERVA Clash Status: 0 Clashes",
          complianceStandard: "IS 14665 & NBC Part 8",
          boqRateInr: 1850000,
          status: "VERIFIED_OK",
        });
      });

      // Vertical HVAC Supply & Return Riser Shafts
      const riserDuctGeo = trackGeo(new THREE.BoxGeometry(0.95, totalH, 0.85));
      [-3.6, 3.6].forEach((hx, idx) => {
        const rDuct = new THREE.Mesh(riserDuctGeo, matHvacDuct);
        rDuct.position.set(centerX + hx, baseY + totalH / 2, centerZ + 2.95);
        registerElement(rDuct, {
          mark: `${prefix}-RISER-HVAC-0${idx + 1}`,
          name: idx === 0 ? "Vertical Main Supply Air Riser Duct" : "Vertical Main Return Air Riser Duct",
          revitFamily: "M_Vertical_Duct_Riser_18G",
          revitType: "950x850mm_18G_AcousticLined",
          ifcClass: "IfcDuctSegment",
          discipline: "HVAC",
          bitCode,
          zoneId,
          level: "All Floors",
          gridline: idx === 0 ? "Shaft S-West" : "Shaft S-East",
          worldPos: [centerX + hx, baseY + totalH / 2, centerZ + 2.95],
          dimensionsMm: `950 × 850 × ${Math.round(totalH * 1000)} mm`,
          materialSpec: "18 Gauge Galvanized Steel + 25mm Acoustic Nitrile Lining",
          manufacturer: "Zeco Aircon",
          liveTelemetry: "Airflow: 28,400 CFM • Clearance Conflict: 0 mm",
          complianceStandard: "SMACNA & IS 655",
          boqRateInr: 620000,
          status: "VERIFIED_OK",
        });
      });
    }

    // Vertical Pressurized Fire Wet Riser Pipe
    const wetPipe = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.16, 0.16, totalH, 12)),
      matFireRed
    );
    wetPipe.position.set(centerX + widthX * 0.34, baseY + totalH / 2, centerZ + depthZ * 0.28);
    registerElement(wetPipe, {
      mark: `${prefix}-WET-RISER`,
      name: "DN150 Heavy-Duty Pressurized Fire Wet Riser Main",
      revitFamily: "M_Fire_Wet_Riser_IS1239",
      revitType: "DN150_Schedule40_MS_Red",
      ifcClass: "IfcPipeSegment",
      discipline: "PLUMBING",
      bitCode,
      zoneId,
      level: "Full Height Stack",
      gridline: "Fire Shaft FS-01",
      worldPos: [centerX + widthX * 0.34, baseY + totalH / 2, centerZ + depthZ * 0.28],
      dimensionsMm: `Ø165.1 mm OD × ${Math.round(totalH * 1000)} mm`,
      materialSpec: "IS 1239 Heavy Class MS Pipe • Hydro-Tested at 14.0 kg/cm²",
      manufacturer: "Tata Pipes / Jindal",
      liveTelemetry: "Static Header Pressure: 7.4 bar • Zero Pressure Drop",
      complianceStandard: "NBC 2016 Part 4 & IS 3844",
      boqRateInr: 340000,
      status: "VERIFIED_OK",
    });

    // Shared Floor-Level Geometries
    const slabGeo = trackGeo(new THREE.BoxGeometry(widthX, 0.24, depthZ));
    const wallH = floorH * 0.68;
    const partLongGeo = trackGeo(new THREE.BoxGeometry(widthX * 0.3, wallH, 0.14));
    const partCrossGeo = trackGeo(new THREE.BoxGeometry(0.14, wallH, depthZ * 0.32));
    const glassPartGeo = trackGeo(new THREE.BoxGeometry(widthX * 0.26, wallH * 0.96, 0.08));

    const falseCeilGeo = trackGeo(new THREE.BoxGeometry(widthX * 0.32, 0.08, depthZ * 0.3));
    const ledTrofferGeo = trackGeo(new THREE.BoxGeometry(widthX * 0.24, 0.04, 0.14));
    const covePelmetGeo = trackGeo(new THREE.BoxGeometry(widthX * 0.34, 0.2, 0.2));
    const winPelmetGeo = trackGeo(new THREE.BoxGeometry(widthX * 0.24, 0.2, 0.26));

    const winW = widthX * 0.23;
    const winH = floorH * 0.5;
    const winGlassGeo = trackGeo(new THREE.BoxGeometry(winW, winH, 0.08));
    const winMullionGeo = trackGeo(new THREE.BoxGeometry(0.09, winH + 0.12, 0.18));
    const winFrameBarGeo = trackGeo(new THREE.BoxGeometry(winW + 0.14, 0.09, 0.18));

    const doorH = floorH * 0.58;
    const doorLeafGeo = trackGeo(new THREE.BoxGeometry(0.95, doorH, 0.09));
    const doorJambSideGeo = trackGeo(new THREE.BoxGeometry(0.08, doorH + 0.08, 0.18));
    const doorJambTopGeo = trackGeo(new THREE.BoxGeometry(1.1, 0.08, 0.18));
    const doorHandleGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.05, 0.14));

    const ductTrunkGeo = trackGeo(new THREE.BoxGeometry(widthX * 0.74, 0.3, 0.52));
    const vavDiffuserGeo = trackGeo(new THREE.BoxGeometry(0.7, 0.1, 0.7));
    const acCondenserGeo = trackGeo(new THREE.BoxGeometry(1.1, 0.8, 0.45));
    const acFanGeo = trackGeo(new THREE.CylinderGeometry(0.27, 0.27, 0.09, 12));
    const hydrantBoxGeo = trackGeo(new THREE.BoxGeometry(0.7, 1.15, 0.32));
    const hydrantWheelGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.14, 0.07, 12));
    const elecDbGeo = trackGeo(new THREE.BoxGeometry(0.95, floorH * 0.52, 0.48));
    const cableTrayGeo = trackGeo(new THREE.BoxGeometry(widthX * 0.72, 0.08, 0.42));

    // Populate Every Floor with Full Molecular Revit Architecture & MEP
    for (let f = 1; f <= floors; f++) {
      const slabY = baseY + (f - 1) * floorH;
      const lvlTag = `L${String(f).padStart(2, "0")}`;
      const lvlLabel = `Level ${String(f).padStart(2, "0")} (+${slabY.toFixed(1)}m RL)`;
      const ceilY = slabY + floorH * 0.75;
      const plenumY = slabY + floorH * 0.87;
      const partCenterY = slabY + 0.12 + wallH * 0.5;

      // 1. Floor Slab
      const slab = new THREE.Mesh(slabGeo, matConcreteSlab);
      slab.position.set(centerX, slabY, centerZ);
      registerElement(
        slab,
        {
          mark: `${prefix}-SLB-${lvlTag}`,
          name: `Post-Tensioned Floor Slab Plate (${lvlTag})`,
          revitFamily: "M_Floor_PT_Concrete_240mm",
          revitType: "240mm_M50_PostTensioned",
          ifcClass: "IfcSlab",
          discipline: "STRUCTURAL",
          bitCode,
          zoneId,
          level: lvlLabel,
          gridline: `Floor Plate ${lvlTag}`,
          worldPos: [centerX, slabY, centerZ],
          dimensionsMm: `${Math.round(widthX * 1000)} × ${Math.round(depthZ * 1000)} × 240 mm`,
          materialSpec: "M50 Post-Tensioned Concrete Slab",
          manufacturer: "Quadillar Structural",
          liveTelemetry: "Deflection: L/480 • Laser Flatness: FF45",
          complianceStandard: "IS 456:2000",
          boqRateInr: 485000,
          status: "VERIFIED_OK",
        },
        !hasCoreAndLifts && f === 4 ? registerMainZone : undefined
      );

      // Populate full interior partitions, false ceilings, pelmets, doorways, windows & MEP
      // on key showcase floors (every floor for 7-floor wing, and L01–L06 + L10 + L14 for 14-floor tower for 60fps smoothness)
      const isDetailedFloor = floors <= 8 || f <= 6 || f === 10 || f === 14;
      if (!isDetailedFloor) continue;

      // 2. Room Partitions (Executive Suites, Boardroom Glass Front & Lift Lobby Spine)
      const partitions = [
        {
          mark: `${prefix}-PRT-${lvlTag}-EXEC-W`,
          name: `Executive Cabin Acoustic Gypsum Partition (West)`,
          geo: partLongGeo,
          mat: matPartitionGypsum,
          pos: [centerX - widthX * 0.26, partCenterY, centerZ - depthZ * 0.16] as [number, number, number],
          spec: "Double-Layer 12.5mm Fireline Gypsum + 50mm Rockwool (STC 52)",
          boq: 64500,
        },
        {
          mark: `${prefix}-PRT-${lvlTag}-EXEC-E`,
          name: `Director Office Acoustic Gypsum Partition (East)`,
          geo: partLongGeo,
          mat: matPartitionGypsum,
          pos: [centerX + widthX * 0.26, partCenterY, centerZ - depthZ * 0.16] as [number, number, number],
          spec: "Double-Layer 12.5mm Fireline Gypsum + Acoustic Perimeter Seal",
          boq: 64500,
        },
        {
          mark: `${prefix}-PRT-${lvlTag}-LOBBY`,
          name: `Core Lobby & MEP Corridor Fire Partition Wall`,
          geo: partCrossGeo,
          mat: matPartitionGypsum,
          pos: [centerX - widthX * 0.18, partCenterY, centerZ + depthZ * 0.16] as [number, number, number],
          spec: "120-Min Fire-Rated Shaftwall Partition (IS 3614)",
          boq: 72000,
        },
        {
          mark: `${prefix}-PRT-${lvlTag}-CONF`,
          name: `Frameless Acoustic Double-Glazed Conference Partition`,
          geo: glassPartGeo,
          mat: matGlassPartition,
          pos: [centerX + widthX * 0.2, partCenterY, centerZ + depthZ * 0.2] as [number, number, number],
          spec: "12mm Toughened Laminated Acoustic Glass in Slimline Anodized Track",
          boq: 94000,
        },
      ];

      partitions.forEach((p) => {
        const pm = new THREE.Mesh(p.geo, p.mat);
        pm.position.set(...p.pos);
        registerElement(pm, {
          mark: p.mark,
          name: p.name,
          revitFamily: "M_Basic_Wall_Interior_Partition",
          revitType: "125mm_Acoustic_STC52_2HrFire",
          ifcClass: "IfcWall",
          discipline: "ARCHITECTURE",
          bitCode,
          zoneId,
          level: lvlLabel,
          gridline: `Interior Partition ${lvlTag}`,
          worldPos: p.pos,
          dimensionsMm: `${Math.round(widthX * 300)} × ${Math.round(wallH * 1000)} × 125 mm`,
          materialSpec: p.spec,
          manufacturer: "Saint-Gobain Gyproc India",
          liveTelemetry: "Laser Plumbness: ±0.7 mm • Acoustic Isolation: 52 dB",
          complianceStandard: "NBC 2016 Part 4 & ASTM E90",
          boqRateInr: p.boq,
          status: "VERIFIED_OK",
        });
      });

      // 3. Suspended False Ceilings (2 Islands + Recessed LED Troffers) + Cove Lighting Pelmets
      [
        { dx: -widthX * 0.25, side: "West" },
        { dx: widthX * 0.25, side: "East" },
      ].forEach((fc, idx) => {
        const fcX = centerX + fc.dx;
        const fcZ = centerZ + depthZ * 0.04;
        const ceilMesh = new THREE.Mesh(falseCeilGeo, matFalseCeiling);
        ceilMesh.position.set(fcX, ceilY, fcZ);

        const led = new THREE.Mesh(ledTrofferGeo, matLedTroffer);
        led.position.set(0, -0.045, 0);
        ceilMesh.add(led);

        registerElement(ceilMesh, {
          mark: `${prefix}-FC-${lvlTag}-0${idx + 1}`,
          name: `Suspended Modular Acoustic Grid False Ceiling (${fc.side} Bay)`,
          revitFamily: "M_Compound_Ceiling_600x600_TGrid",
          revitType: "12.5mm_Gyproc_MF_Grid_RecessedLED",
          ifcClass: "IfcCovering",
          discipline: "ARCHITECTURE",
          bitCode,
          zoneId,
          level: lvlLabel,
          gridline: `${fc.side} Ceiling Grid`,
          worldPos: [fcX, ceilY, fcZ],
          dimensionsMm: `${Math.round(widthX * 320)} × ${Math.round(depthZ * 300)} × 80 mm`,
          materialSpec: "GI Perimeter Channels + 600×600mm Acoustic Tiles + DALI LED Troffers",
          manufacturer: "Armstrong / Saint-Gobain Gyproc",
          liveTelemetry: "Soffit Drop: 550 mm • Desk Illumination: 485 Lux (DALI 78%)",
          complianceStandard: "ECBC Lighting Power Density & IS 2441",
          boqRateInr: 86000,
          status: "VERIFIED_OK",
        });

        // Cove Lighting Pelmet along False Ceiling Drop Bulkhead
        const covePelmet = new THREE.Mesh(covePelmetGeo, matPelmetVeneer);
        covePelmet.position.set(fcX, ceilY - 0.11, fcZ - depthZ * 0.15);
        registerElement(covePelmet, {
          mark: `${prefix}-PLM-COVE-${lvlTag}-0${idx + 1}`,
          name: `Architectural Gypsum & Veneer Cove Lighting Pelmet (${fc.side})`,
          revitFamily: "M_Ceiling_Cove_Pelmet_Bulkhead",
          revitType: "200x200mm_Indirect_LED_Cove",
          ifcClass: "IfcCovering",
          discipline: "ARCHITECTURE",
          bitCode,
          zoneId,
          level: lvlLabel,
          gridline: `${fc.side} Cove Bulkhead`,
          worldPos: [fcX, ceilY - 0.11, fcZ - depthZ * 0.15],
          dimensionsMm: `${Math.round(widthX * 340)} × 200 × 200 mm`,
          materialSpec: "MR-Grade Plywood + 12.5mm Gypsum Fascia + 3000K Warm COB LED",
          manufacturer: "Custom Architectural Millwork",
          liveTelemetry: "LED Driver Temp: 33.8°C • Warm Cove Dimming: 85%",
          complianceStandard: "IS 303 & NEC Class 2",
          boqRateInr: 32500,
          status: "VERIFIED_OK",
        });
      });

      // 4. Perimeter Low-E Glazed Windows + Motorized Window Blind/Curtain Pelmets
      [-widthX * 0.31, 0, widthX * 0.31].forEach((dx, wIdx) => {
        [
          { dz: depthZ * 0.48, face: "North", pelmetShift: -0.18 },
          { dz: -depthZ * 0.48, face: "South", pelmetShift: 0.18 },
        ].forEach((side) => {
          const wx = centerX + dx;
          const wz = centerZ + side.dz;
          const wy = slabY + floorH * 0.44;

          const topBar = new THREE.Mesh(winFrameBarGeo, matAlumMullion);
          topBar.position.set(wx, wy + winH * 0.5 + 0.04, wz);
          const botBar = new THREE.Mesh(winFrameBarGeo, matAlumMullion);
          botBar.position.set(wx, wy - winH * 0.5 - 0.04, wz);
          const midMul = new THREE.Mesh(winMullionGeo, matAlumMullion);
          midMul.position.set(wx, wy, wz);
          disciplineGroups.ARCHITECTURE.add(topBar, botBar, midMul);

          const winGlass = new THREE.Mesh(winGlassGeo, matCurtainGlass);
          winGlass.position.set(wx, wy, wz);
          registerElement(winGlass, {
            mark: `${prefix}-WIN-${lvlTag}-${side.face[0]}0${wIdx + 1}`,
            name: `${side.face} Facade Unitized Double-Glazed Low-E Window`,
            revitFamily: "M_Curtain_Wall_DGU_Unit",
            revitType: "LowE_6-12-6mm_Argon_Anodized",
            ifcClass: "IfcWindow",
            discipline: "ARCHITECTURE",
            bitCode,
            zoneId,
            level: lvlLabel,
            gridline: `${side.face} Bay 0${wIdx + 1}`,
            worldPos: [wx, wy, wz],
            dimensionsMm: `${Math.round(winW * 1000)} × ${Math.round(winH * 1000)} × 24 mm`,
            materialSpec: "Saint-Gobain SKN 154 Solar Low-E DGU + Thermal-Break Al 6063-T6",
            manufacturer: "Schüco / Saint-Gobain India",
            liveTelemetry: "U-Value: 1.6 W/m²K • Acoustic STC: 38 dB • Seal: 100%",
            complianceStandard: "ECBC 2017 & NBC Part 8",
            boqRateInr: 42500,
            status: "VERIFIED_OK",
            isOuterShell: true,
          });

          const winPelmet = new THREE.Mesh(winPelmetGeo, matPelmetVeneer);
          winPelmet.position.set(wx, wy + winH * 0.5 + 0.15, wz + side.pelmetShift);
          registerElement(winPelmet, {
            mark: `${prefix}-PLM-WIN-${lvlTag}-${side.face[0]}0${wIdx + 1}`,
            name: `${side.face} Window Motorized Roller-Blind & Curtain Pelmet Box`,
            revitFamily: "M_Window_Pelmet_Motorized_Track",
            revitType: "Veneer_Box_DualTrack_Somfy",
            ifcClass: "IfcCovering",
            discipline: "ARCHITECTURE",
            bitCode,
            zoneId,
            level: lvlLabel,
            gridline: `${side.face} Window Head 0${wIdx + 1}`,
            worldPos: [wx, wy + winH * 0.5 + 0.15, wz + side.pelmetShift],
            dimensionsMm: `${Math.round(widthX * 240)} × 200 × 260 mm`,
            materialSpec: "Teak Veneer HDHMR Pelmet + Dual Curtain & Somfy Motorized Blind Track",
            manufacturer: "Somfy / Custom Architectural Millwork",
            liveTelemetry: "Glare Sensor: ACTIVE • Motorized Blind Drop: 30% Open",
            complianceStandard: "ECBC Daylighting Control",
            boqRateInr: 24800,
            status: "VERIFIED_OK",
          });
        });
      });

      // 5. Interior Fire-Rated Doorways with Frames & Brass Lever Handles
      [
        { dx: -widthX * 0.26, dz: -depthZ * 0.34, rotY: Math.PI / 2, room: "Executive West" },
        { dx: widthX * 0.26, dz: -depthZ * 0.34, rotY: Math.PI / 2, room: "Director East" },
        { dx: -widthX * 0.18, dz: -depthZ * 0.04, rotY: Math.PI / 2, room: "Lift Lobby" },
        { dx: widthX * 0.2, dz: depthZ * 0.36, rotY: Math.PI / 2, room: "Conference Suite" },
      ].forEach((d, dIdx) => {
        const dxPos = centerX + d.dx;
        const dzPos = centerZ + d.dz;
        const dyPos = slabY + 0.12 + doorH * 0.5;

        const frameGrp = new THREE.Group();
        frameGrp.position.set(dxPos, dyPos, dzPos);
        frameGrp.rotation.y = d.rotY;
        const lJamb = new THREE.Mesh(doorJambSideGeo, matAlumMullion);
        lJamb.position.x = -0.51;
        const rJamb = new THREE.Mesh(doorJambSideGeo, matAlumMullion);
        rJamb.position.x = 0.51;
        const tJamb = new THREE.Mesh(doorJambTopGeo, matAlumMullion);
        tJamb.position.y = doorH * 0.5 + 0.04;
        const handle = new THREE.Mesh(doorHandleGeo, matBrassHardware);
        handle.position.set(0.35, -0.04, 0.06);
        frameGrp.add(lJamb, rJamb, tJamb, handle);
        disciplineGroups.ARCHITECTURE.add(frameGrp);

        const leaf = new THREE.Mesh(doorLeafGeo, matFireDoor);
        leaf.position.set(dxPos, dyPos, dzPos);
        leaf.rotation.y = d.rotY;
        registerElement(leaf, {
          mark: `${prefix}-DR-${lvlTag}-0${dIdx + 1}`,
          name: `120-Min Fire-Rated Hollow Metal Doorway (${d.room})`,
          revitFamily: "M_Single_Flush_Fire_Door_IS3614",
          revitType: "950x2100mm_FD120_PanicHardware",
          ifcClass: "IfcDoor",
          discipline: "ARCHITECTURE",
          bitCode,
          zoneId,
          level: lvlLabel,
          gridline: `${d.room} Entry`,
          worldPos: [dxPos, dyPos, dzPos],
          dimensionsMm: `950 × ${Math.round(doorH * 1000)} × 55 mm`,
          materialSpec: "1.6mm GPSP Sheet + Rockwool Core (96 kg/m³) + Intumescent Smoke Seal",
          manufacturer: "Shakti Hormann Fire Doors",
          liveTelemetry: "Electromagnetic Hold-Open: ARMED • Frame Gap: 3.0 mm",
          complianceStandard: "IS 3614 Part 2 & NBC 2016 Part 4",
          boqRateInr: 36800,
          status: "VERIFIED_OK",
        });
      });

      // 6. HVAC: Overhead Plenum Duct Trunk, VAV Ceiling Diffusers & Exterior VRV AC Condenser Units
      const duct = new THREE.Mesh(ductTrunkGeo, matHvacDuct);
      duct.position.set(centerX, plenumY, centerZ - depthZ * 0.08);
      registerElement(duct, {
        mark: `${prefix}-DCT-${lvlTag}-01`,
        name: `Main Supply Air Rectangular GI Duct Trunk (Plenum)`,
        revitFamily: "M_Rectangular_Duct_TDF_Flange",
        revitType: "520x300mm_22G_AcousticLined",
        ifcClass: "IfcDuctSegment",
        discipline: "HVAC",
        bitCode,
        zoneId,
        level: lvlLabel,
        gridline: "Plenum Spine B1–B6",
        worldPos: [centerX, plenumY, centerZ - depthZ * 0.08],
        dimensionsMm: `${Math.round(widthX * 740)} × 520 × 300 mm`,
        materialSpec: "22 Gauge GI Sheet (120 GSM Zinc) + 19mm Nitrile Acoustic Lining",
        manufacturer: "Zeco Aircon / Rolastar",
        liveTelemetry: "Airflow: 4,620 CFM • Static Pressure: 238 Pa • Supply Air: 13.8°C",
        complianceStandard: "SMACNA & IS 655:2006",
        boqRateInr: 118500,
        status: "VERIFIED_OK",
      });

      [-widthX * 0.25, widthX * 0.25].forEach((dx, vIdx) => {
        const vav = new THREE.Mesh(vavDiffuserGeo, matAcUnit);
        vav.position.set(centerX + dx, ceilY - 0.05, centerZ + depthZ * 0.04);
        registerElement(vav, {
          mark: `${prefix}-VAV-${lvlTag}-0${vIdx + 1}`,
          name: `4-Way Louvered Supply Air Ceiling Diffuser`,
          revitFamily: "M_Supply_Diffuser_4Way_Square",
          revitType: "600x600mm_PowderCoated_Al",
          ifcClass: "IfcAirTerminal",
          discipline: "HVAC",
          bitCode,
          zoneId,
          level: lvlLabel,
          gridline: vIdx === 0 ? "West Ceiling Grid" : "East Ceiling Grid",
          worldPos: [centerX + dx, ceilY - 0.05, centerZ + depthZ * 0.04],
          dimensionsMm: "700 × 700 × 100 mm",
          materialSpec: "Extruded Aluminum RAL 9016 + Opposed Blade Volume Damper",
          manufacturer: "Systemair / Caryaire",
          liveTelemetry: "Throw Velocity: 2.1 m/s • Zone Temp: 22.4°C",
          complianceStandard: "ASHRAE 55",
          boqRateInr: 14500,
          status: "VERIFIED_OK",
        });
      });

      [-widthX * 0.36, widthX * 0.36].forEach((dx, acIdx) => {
        const acX = centerX + dx;
        const acZ = centerZ + depthZ * 0.51;
        const ac = new THREE.Mesh(acCondenserGeo, matAcUnit);
        ac.position.set(acX, slabY + 0.52, acZ);

        const fan = new THREE.Mesh(acFanGeo, matDarkFan);
        fan.rotation.x = Math.PI / 2;
        fan.position.set(0.22, 0, 0.23);
        ac.add(fan);
        spinningFans.push(fan);

        registerElement(ac, {
          mark: `${prefix}-ACU-${lvlTag}-0${acIdx + 1}`,
          name: `12 HP Inverter VRV Outdoor AC Condenser Unit`,
          revitFamily: "M_VRV_Outdoor_Condenser_Unit",
          revitType: "33.5kW_R410A_TwinRotary",
          ifcClass: "IfcUnitaryEquipment",
          discipline: "HVAC",
          bitCode,
          zoneId,
          level: lvlLabel,
          gridline: acIdx === 0 ? "North Ledge West" : "North Ledge East",
          worldPos: [acX, slabY + 0.52, acZ],
          dimensionsMm: "1100 × 800 × 450 mm",
          materialSpec: "Hydrophilic Blue-Fin Copper Coil + R410A Hermetic Inverter Compressor",
          manufacturer: "Daikin VRV X Series",
          liveTelemetry: "Compressor: 68 Hz • Suction: 8.2 bar • Power: 7.4 kW (COP 4.12)",
          complianceStandard: "BEE 5-Star & IS 1391",
          boqRateInr: 245000,
          status: "VERIFIED_OK",
        });
      });

      // 7. Fire Hydrant Landing Valve & Hose Reel Cabinet
      const hyd = new THREE.Mesh(hydrantBoxGeo, matFireRed);
      hyd.position.set(centerX + widthX * 0.34 + 0.45, slabY + 0.7, centerZ + depthZ * 0.28);
      const wheel = new THREE.Mesh(hydrantWheelGeo, matBrassHardware);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(0, 0.2, 0.18);
      hyd.add(wheel);
      registerElement(hyd, {
        mark: `${prefix}-FHR-${lvlTag}-01`,
        name: `Internal Fire Hydrant Landing Valve & Hose Reel Cabinet`,
        revitFamily: "M_Fire_Hydrant_Cabinet_IS5290",
        revitType: "Gunmetal_DN65_30m_RRL_Hose",
        ifcClass: "IfcFireSuppressionTerminal",
        discipline: "PLUMBING",
        bitCode,
        zoneId,
        level: lvlLabel,
        gridline: "Fire Lobby F-01",
        worldPos: [centerX + widthX * 0.34 + 0.45, slabY + 0.7, centerZ + depthZ * 0.28],
        dimensionsMm: "700 × 1150 × 320 mm",
        materialSpec: "IS 5290 LTB-2 Gunmetal Landing Valve + 16G Powder-Coated CRCA Box",
        manufacturer: "NewAge Fire Protection",
        liveTelemetry: "Static Pressure: 7.4 bar • Tamper Switch: CLOSED • Hose: READY",
        complianceStandard: "IS 5290 & UP Fire Safety Act",
        boqRateInr: 38400,
        status: "VERIFIED_OK",
      });

      // 8. Electrical Floor Distribution Board (MDB) & Perforated Cable Tray
      const dbPanel = new THREE.Mesh(elecDbGeo, matElecPurple);
      dbPanel.position.set(centerX - widthX * 0.36, slabY + 0.12 + floorH * 0.26, centerZ - depthZ * 0.32);
      registerElement(dbPanel, {
        mark: `${prefix}-EL-DB-${lvlTag}`,
        name: `415V Floor Main Distribution Board (MDB)`,
        revitFamily: "M_Electrical_Switchboard_IEC61439",
        revitType: "400A_TPN_MCCB_Form4B_IP54",
        ifcClass: "IfcElectricDistributionBoard",
        discipline: "ELECTRICAL",
        bitCode,
        zoneId,
        level: lvlLabel,
        gridline: "Electrical Room EL-01",
        worldPos: [centerX - widthX * 0.36, slabY + 0.12 + floorH * 0.26, centerZ - depthZ * 0.32],
        dimensionsMm: `950 × ${Math.round(floorH * 520)} × 480 mm`,
        materialSpec: "2.0mm CRCA Steel + Electrolytic Copper Busbar + Schneider NSX MCCBs",
        manufacturer: "Schneider Electric / ABB",
        liveTelemetry: "Load: 142.8 A (3-Ph) • Voltage: 414.6 V • PF: 0.99 • Bus Temp: 36.2°C",
        complianceStandard: "IEC 61439-2 & IS 8623",
        boqRateInr: 174000,
        status: "VERIFIED_OK",
      });

      const tray = new THREE.Mesh(cableTrayGeo, matCableTray);
      tray.position.set(centerX, plenumY - 0.05, centerZ - depthZ * 0.24);
      registerElement(tray, {
        mark: `${prefix}-TRY-${lvlTag}`,
        name: `300mm Perforated Hot-Dip GI Power & Fiber Cable Tray`,
        revitFamily: "M_Cable_Tray_Perforated_HDG",
        revitType: "300x50mm_HotDipGalvanized",
        ifcClass: "IfcCableCarrierSegment",
        discipline: "ELECTRICAL",
        bitCode,
        zoneId,
        level: lvlLabel,
        gridline: "Plenum Electrical Spine",
        worldPos: [centerX, plenumY - 0.05, centerZ - depthZ * 0.24],
        dimensionsMm: `${Math.round(widthX * 720)} × 300 × 50 mm`,
        materialSpec: "IS 2629 Hot-Dip Galvanized Steel (80 Micron) + XLPE FRLS Cables",
        manufacturer: "Profab / OBO Bettermann",
        liveTelemetry: "Tray Fill Ratio: 42% (< 50% NEC Limit) • Earth Continuity: 0.14 Ω",
        complianceStandard: "IS 732 & NEC 2023",
        boqRateInr: 54000,
        status: "VERIFIED_OK",
      });
    }
  };

  // Populate BIT-3 (14-Storey Commercial & Hospitality Tower at [-10, y, -13])
  populateBuildingRevitLod400({
    prefix: "T3",
    bitCode: "BIT-3 HOTEL CORE",
    zoneId: "BIT-3-CORE",
    centerX: -10,
    centerZ: -13,
    widthX: 20,
    depthZ: 18,
    baseY: 4.5,
    floors: 14,
    floorH: 3.5,
    hasCoreAndLifts: true,
    registerMainZone: "BIT-3-CORE",
  });

  // Populate BIT-5 (7-Storey East Innovation Wing at [18, y, -12])
  populateBuildingRevitLod400({
    prefix: "E5",
    bitCode: "BIT-5 EAST WING",
    zoneId: "BIT-5-WING",
    centerX: 18,
    centerZ: -12,
    widthX: 17,
    depthZ: 17,
    baseY: 4.5,
    floors: 7,
    floorH: 3.35,
    hasCoreAndLifts: false,
    registerMainZone: "BIT-5-WING",
  });

  // BIT-6: Cantilevered Steel Helipad Deck atop BIT-5
  const heliY = 4.5 + 7 * 3.35 + 1.4;
  const helipadMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(7.6, 7.2, 0.9, 24)),
    matSteelColumn
  );
  helipadMesh.position.set(18, heliY, -12);
  registerElement(
    helipadMesh,
    {
      mark: "HELI-01",
      name: "BIT-6 Cantilevered Steel Box-Girder Helipad Deck",
      revitFamily: "M_Helideck_Steel_BoxGirder",
      revitType: "15m_Dia_ICAO_H_Rated",
      ifcClass: "IfcSlab",
      discipline: "STRUCTURAL",
      bitCode: "BIT-6 SLIM PAD",
      zoneId: "BIT-6-HELI",
      level: "+29.30m RL",
      gridline: "East Wing Crown",
      worldPos: [18, heliY, -12],
      dimensionsMm: "15200 × 15200 × 900 mm",
      materialSpec: "Structural Steel E350 Box-Girder + Non-Skid Aluminum Planking",
      manufacturer: "Quadillar Structural",
      liveTelemetry: "Bell 429 / AW109 Load Rated • Perimeter Beacons: ACTIVE",
      complianceStandard: "ICAO Annex 14 & DGCA CAR",
      boqRateInr: 5400000,
      status: "VERIFIED_OK",
    },
    "BIT-6-HELI"
  );

  // =========================================================================
  // 3. BIT-2: ACOUSTIC AUDITORIUM CONCOURSE & KALZIP SILVER DOME ([14, y, 12])
  // =========================================================================
  const domeRing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(11.5, 12.1, 5.5, 32, 1, true)),
    matConcreteSlab
  );
  domeRing.position.set(14, 7.25, 12);
  registerElement(domeRing, {
    mark: "DOME-RING-01",
    name: "Acoustic Auditorium Tension Ring Beam & Perimeter Wall",
    revitFamily: "M_Circular_Ring_Beam_M45",
    revitType: "23m_Dia_M45_TensionRing",
    ifcClass: "IfcWall",
    discipline: "STRUCTURAL",
    bitCode: "BIT-2 SILVER DOME",
    zoneId: "BIT-2-DOME",
    level: "+4.50m to +10.00m RL",
    gridline: "Auditorium Grid D1–D12",
    worldPos: [14, 7.25, 12],
    dimensionsMm: "Ø23000 × 5500 mm",
    materialSpec: "M45 Circular Tension Ring Beam supporting 2,100-Ton Dome",
    manufacturer: "Quadillar Structural",
    liveTelemetry: "Hoop Tension Strain: Nominal • Ring Settlement: 0.0 mm",
    complianceStandard: "IS 456:2000",
    boqRateInr: 3200000,
    status: "VERIFIED_OK",
  });

  const domeTruss = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(11.5, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x38bdf8, wireframe: true, roughness: 0.3 }))
  );
  domeTruss.position.set(14, 10.0, 12);
  registerElement(domeTruss, {
    mark: "DOME-TRUSS-14B",
    name: "2,100-Ton Geodesic Space-Frame Truss Lattice (Node #14B)",
    revitFamily: "M_MERO_SpaceFrame_Dome_Truss",
    revitType: "E350_Tubular_Struts_SphericalNodes",
    ifcClass: "IfcRoof",
    discipline: "STRUCTURAL",
    bitCode: "BIT-2 SILVER DOME",
    zoneId: "BIT-2-DOME",
    level: "+10.00m to +21.50m RL",
    gridline: "Space-Frame Node #14B",
    worldPos: [14, 10.0, 12],
    dimensionsMm: "Ø23000 × 11500 mm Dome",
    materialSpec: "E350 Structural Steel Space-Frame (Node #14B Δ 4.2mm Offset)",
    manufacturer: "MERO / Hindustan Dorr-Oliver",
    liveTelemetry: "Node #14B Laser Scan: +4.2 mm Offset (SNAG-VANGUARD-401)",
    complianceStandard: "IS 800:2007",
    boqRateInr: 8900000,
    status: "VERIFIED_OK",
  });

  const kalzipRoof = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(11.75, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2)),
    matKalzipShell
  );
  kalzipRoof.position.set(14, 10.0, 12);
  registerElement(kalzipRoof, {
    mark: "KALZIP-SHELL-01",
    name: "Kalzip Standing-Seam Aluminum Acoustic Dome Cladding",
    revitFamily: "M_Kalzip_65_400_StandingSeam",
    revitType: "0.9mm_AlMg2_Acoustic_Soffit",
    ifcClass: "IfcCovering",
    discipline: "ARCHITECTURE",
    bitCode: "BIT-2 SILVER DOME",
    zoneId: "BIT-2-DOME",
    level: "+16.50m RL Mean Datum",
    gridline: "Auditorium Roof Envelope",
    worldPos: [14, 10.0, 12],
    dimensionsMm: "Ø23500 mm Standing-Seam Shell",
    materialSpec: "Kalzip 65/400 Aluminum Standing-Seam + Acoustic Rockwool Liner",
    manufacturer: "Kalzip India",
    liveTelemetry: "Seam Zipping: 92% • mmWave Plenum Radar Advisory Active",
    complianceStandard: "EN 14782 & NBC Acoustics",
    boqRateInr: 4380000,
    status: "VERIFIED_OK",
    isOuterShell: true,
  });

  // =========================================================================
  // 4. BIT-1: MONUMENTAL TERRACOTTA BRIDGE ARCH & GREEN WEDGE ([-14, y, 12])
  // =========================================================================
  const archDeck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(24, 1.4, 14.0)), matConcreteSlab);
  archDeck.position.set(-14, 12.2, 12);
  registerElement(
    archDeck,
    {
      mark: "ARCH-DECK-01",
      name: "48m Clear-Span Post-Tensioned Bridge Arch Deck",
      revitFamily: "M_Bridge_BoxGirder_M45",
      revitType: "48m_ClearSpan_PT_BoxGirder",
      ifcClass: "IfcBeam",
      discipline: "STRUCTURAL",
      bitCode: "BIT-1 GREEN WEDGE",
      zoneId: "BIT-1-ARCH",
      level: "+12.00m RL",
      gridline: "Bridge Span W1–W6",
      worldPos: [-14, 12.2, 12],
      dimensionsMm: "24000 × 14000 × 1400 mm",
      materialSpec: "M45 Post-Tensioned Box Girder supporting Green Amphitheatre",
      manufacturer: "Quadillar Structural",
      liveTelemetry: "Mid-Span Camber: +6.5 mm • Tendon Stress: 1,395 MPa",
      complianceStandard: "IRC:112 & IS 1343",
      boqRateInr: 6840000,
      status: "VERIFIED_OK",
    },
    "BIT-1-ARCH"
  );

  const terracottaBand = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(24.4, 2.2, 14.4)),
    matTerracotta
  );
  terracottaBand.position.set(-14, 11.4, 12);
  registerElement(terracottaBand, {
    mark: "CLAD-TC-01",
    name: "Extruded Terracotta Baguette Rainscreen Facade",
    revitFamily: "M_Terracotta_Louvers_Rainscreen",
    revitType: "50x100mm_Extruded_Clay_Baguette",
    ifcClass: "IfcCurtainWall",
    discipline: "ARCHITECTURE",
    bitCode: "BIT-1 GREEN WEDGE",
    zoneId: "BIT-1-ARCH",
    level: "+11.40m RL",
    gridline: "South-West Bridge Facade",
    worldPos: [-14, 11.4, 12],
    dimensionsMm: "24400 × 14400 × 2200 mm",
    materialSpec: "Ventilated Terracotta Rainscreen on Anodized Aluminum Sub-Frame",
    manufacturer: "Hunter Douglas / NBK Terracotta",
    liveTelemetry: "CPWD Cladding Ledger Reconciled • Thermal Shading: 68%",
    complianceStandard: "ECBC & IS 875 Wind Load",
    boqRateInr: 2950000,
    status: "VERIFIED_OK",
  });

  const greenRoof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(23.5, 0.7, 13.5)), matGreenTurf);
  greenRoof.position.set(-14, 13.1, 12);
  registerElement(greenRoof, {
    mark: "ROOF-GRN-01",
    name: "Stepped Green Turf Amphitheatre Intensive Roof Deck",
    revitFamily: "M_Green_Roof_Intensive_Substrate",
    revitType: "350mm_RootBarrier_DrainCell_Turf",
    ifcClass: "IfcRoof",
    discipline: "ARCHITECTURE",
    bitCode: "BIT-1 GREEN WEDGE",
    zoneId: "BIT-1-ARCH",
    level: "+13.10m RL",
    gridline: "Green Wedge Amphitheatre",
    worldPos: [-14, 13.1, 12],
    dimensionsMm: "23500 × 13500 × 700 mm",
    materialSpec: "EPDM Waterproofing + Geotextile Drain Cell + Intensive Turf",
    manufacturer: "ZinCo Green Roof Systems",
    liveTelemetry: "Soil Moisture: 34% • GRIHA 5-Star Heat Island Reduction",
    complianceStandard: "GRIHA v2019 & NBC Part 11",
    boqRateInr: 2050000,
    status: "VERIFIED_OK",
  });

  // =========================================================================
  // 5. SINGLE UNIFIED ARTICULATED LIEBHERR 280 EC-H TOWER CRANE ([-24, 0, 14])
  //    (8 Lattice Mast Sections, LiCAB Operator Cabin, Counter-Jib Ballast,
  //     65m Truss Jib Boom, Apex Cathead, Animated Trolley & 4-Fall Hook Block)
  // =========================================================================
  const [craneX, , craneZ] = VANGUARD_GENOME.craneTelemetry.basePos;
  const craneFooting = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.2, 1.2, 5.2)),
    matConcreteSlab
  );
  craneFooting.position.set(craneX, 0.6, craneZ);
  registerElement(craneFooting, {
    mark: "CRN-FTG-01",
    name: "Liebherr 280 EC-H Reinforced Concrete Ballast Foundation Pad",
    revitFamily: "M_Crane_Foundation_Pad_M45",
    revitType: "5200x5200x1200mm_CastInSitu_Anchors",
    ifcClass: "IfcFooting",
    discipline: "SITE_PLANT",
    bitCode: "CRANE-01",
    zoneId: "BIT-2-DOME",
    level: "0.00m RL Ground Pad",
    gridline: "Crane Pad CP-01",
    worldPos: [craneX, 0.6, craneZ],
    dimensionsMm: "5200 × 5200 × 1200 mm",
    materialSpec: "M45 Reinforced Concrete Pad with 16 × M48 High-Tensile Anchor Bolts",
    manufacturer: "Liebherr / Quadillar Structural",
    liveTelemetry: "Base Moment: 1,840 kNm • Foundation Tilt: 0.01°",
    complianceStandard: "EN 14439 & IS 4573",
    boqRateInr: 420000,
    status: "VERIFIED_OK",
  });

  const mastBayCount = 8;
  const mastBayH = 7.5;
  const mastTotalH = mastBayCount * mastBayH; // 60m clear above 54m tower roof!
  const mastBayGeo = trackGeo(new THREE.BoxGeometry(2.1, mastBayH - 0.18, 2.1));

  for (let b = 0; b < mastBayCount; b++) {
    const by = 1.2 + mastBayH * (b + 0.5);
    const bay = new THREE.Mesh(mastBayGeo, matCraneYellow);
    bay.position.set(craneX, by, craneZ);
    registerElement(bay, {
      mark: `CRN-MAST-0${b + 1}`,
      name: `Liebherr 280 EC-H High-Top Lattice Mast Section #0${b + 1}`,
      revitFamily: "M_Tower_Crane_Mast_256HC",
      revitType: "2100x2100x7500mm_S355J2_Steel",
      ifcClass: "IfcTransportElement",
      discipline: "SITE_PLANT",
      bitCode: "CRANE-01",
      zoneId: "BIT-2-DOME",
      level: `Mast Bay +${by.toFixed(1)}m RL`,
      gridline: "Crane Pad CP-01",
      worldPos: [craneX, by, craneZ],
      dimensionsMm: "2100 × 2100 × 7500 mm",
      materialSpec: "S355J2 High-Tensile Structural Steel Lattice + Pre-Tensioned Pins",
      manufacturer: "Liebherr-Werk Biberach GmbH",
      liveTelemetry: "Vertical Plumbness: 0.03° • Wind Load Strain: Nominal",
      complianceStandard: "EN 14439 & IS 4573",
      boqRateInr: 310000,
      status: "VERIFIED_OK",
    });
  }

  // Slewing Upper Assembly Pivot at +61.2m RL
  const cranePivotY = 1.2 + mastTotalH;
  const cranePivot = new THREE.Group();
  cranePivot.position.set(craneX, cranePivotY, craneZ);
  cranePivot.rotation.y = (VANGUARD_GENOME.craneTelemetry.azimuthDeg * Math.PI) / 180;
  disciplineGroups.SITE_PLANT.add(cranePivot);

  // Apex Cathead Tower Top
  const apexMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.35, 1.4, 6.2, 4)),
    matCraneYellow
  );
  apexMesh.position.set(0, 3.6, 0);
  registerElement(apexMesh, {
    mark: "CRN-APEX-01",
    name: "Liebherr 280 EC-H Cathead Apex & Pendant Tie-Bar Anchor",
    revitFamily: "M_Crane_Cathead_Apex_Assembly",
    revitType: "6.2m_HighTop_Pendant_Head",
    ifcClass: "IfcTransportElement",
    discipline: "SITE_PLANT",
    bitCode: "CRANE-01",
    zoneId: "BIT-2-DOME",
    level: `+${(cranePivotY + 3.6).toFixed(1)}m RL`,
    gridline: "Crane Apex",
    worldPos: [craneX, cranePivotY + 3.6, craneZ],
    dimensionsMm: "2800 × 2800 × 6200 mm",
    materialSpec: "S355J2 Welded Cathead + Dual High-Tensile Pendant Tie Bars",
    manufacturer: "Liebherr",
    liveTelemetry: "Pendant Tie Tension: 412 kN (Balanced)",
    complianceStandard: "EN 14439",
    boqRateInr: 280000,
    status: "VERIFIED_OK",
  });
  disciplineGroups.SITE_PLANT.remove(apexMesh);
  cranePivot.add(apexMesh);

  // Panoramic LiCAB Operator Cabin
  const cabinMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.85, 2.3, 1.9)),
    matCraneYellow
  );
  cabinMesh.position.set(1.4, 0.6, 1.45);
  registerElement(cabinMesh, {
    mark: "CRN-CAB-01",
    name: "Liebherr LiCAB Panoramic Operator Cabin & Anti-Collision Radar",
    revitFamily: "M_Crane_Operator_Cabin_LiCAB",
    revitType: "EMS_Joystick_Anemometer_ARGUS_Radar",
    ifcClass: "IfcTransportElement",
    discipline: "SITE_PLANT",
    bitCode: "CRANE-01",
    zoneId: "BIT-2-DOME",
    level: `+${cranePivotY.toFixed(1)}m RL Slewing Deck`,
    gridline: "Crane Cab CP-01",
    worldPos: [craneX + 1.4, cranePivotY + 0.6, craneZ + 1.45],
    dimensionsMm: "1850 × 1900 × 2300 mm",
    materialSpec: "Laminated Tinted Safety Glass + ARGUS Ultrasonic Anti-Collision Radar",
    manufacturer: "Liebherr",
    liveTelemetry: "Wind: 18.4 km/h (Safe < 72 km/h) • ARGUS Radar: 12ms Active",
    complianceStandard: "EN 14439 & BOCW Rules",
    boqRateInr: 490000,
    status: "VERIFIED_OK",
  });
  disciplineGroups.SITE_PLANT.remove(cabinMesh);
  cranePivot.add(cabinMesh);

  // 54m Modular Triangular Main Jib Boom
  const jibMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(52, 1.45, 1.45)), matCraneYellow);
  jibMesh.position.set(22, 1.2, 0);
  registerElement(jibMesh, {
    mark: "CRN-JIB-01",
    name: "280 EC-H 65m Modular Triangular Truss Jib Boom",
    revitFamily: "M_Crane_Jib_Truss_Assembly",
    revitType: "MaxTipLoad_2800kg_MaxCapacity_12000kg",
    ifcClass: "IfcTransportElement",
    discipline: "SITE_PLANT",
    bitCode: "CRANE-01",
    zoneId: "BIT-2-DOME",
    level: `+${(cranePivotY + 1.2).toFixed(1)}m RL Jib Boom`,
    gridline: "Swing Radius 65m",
    worldPos: [craneX + 22, cranePivotY + 1.2, craneZ],
    dimensionsMm: "52000 × 1450 × 1450 mm",
    materialSpec: "Tubular Steel Chord Truss + Dual Pendant Tie Bars",
    manufacturer: "Liebherr",
    liveTelemetry: "Load Moment Limiter: 62% Capacity • Azimuth: 38.5°",
    complianceStandard: "EN 14439",
    boqRateInr: 840000,
    status: "VERIFIED_OK",
  });
  disciplineGroups.SITE_PLANT.remove(jibMesh);
  cranePivot.add(jibMesh);

  // Counter-Jib & 18.4-Ton Precast Concrete Ballast Blocks
  const ballastMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(11.5, 1.8, 1.9)),
    matBallastConcrete
  );
  ballastMesh.position.set(-7.5, 1.1, 0);
  registerElement(ballastMesh, {
    mark: "CRN-BAL-01",
    name: "Precast Reinforced Concrete Counterweight Ballast Pack (18.4 Ton)",
    revitFamily: "M_Crane_Counterweight_Ballast",
    revitType: "M40_Precast_4x4600kg_Blocks",
    ifcClass: "IfcTransportElement",
    discipline: "SITE_PLANT",
    bitCode: "CRANE-01",
    zoneId: "BIT-2-DOME",
    level: `+${(cranePivotY + 1.1).toFixed(1)}m RL Counter-Jib`,
    gridline: "Counter-Jib Tail",
    worldPos: [craneX - 7.5, cranePivotY + 1.1, craneZ],
    dimensionsMm: "11500 × 1900 × 1800 mm",
    materialSpec: "M40 High-Density Precast Concrete Ballast Blocks with Steel Lugs",
    manufacturer: "Liebherr / L&T Yard",
    liveTelemetry: "Counter-Moment Balance: 100% Calibrated",
    complianceStandard: "IS 4573",
    boqRateInr: 165000,
    status: "VERIFIED_OK",
  });
  disciplineGroups.SITE_PLANT.remove(ballastMesh);
  cranePivot.add(ballastMesh);

  // Motorized Hoist Trolley + Wire Rope + 4-Fall Hook Block
  const trolleyMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.9, 0.75, 1.7)), matCraneDark);
  trolleyMesh.position.set(28, 0.35, 0);
  const hoistWire = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.06, 0.06, 16, 8)),
    matCraneDark
  );
  hoistWire.position.set(0, -8, 0);
  const hookBlock = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.85, 1.1, 0.7)),
    matBrassHardware
  );
  hookBlock.position.set(0, -16.2, 0);
  trolleyMesh.add(hoistWire, hookBlock);

  registerElement(trolleyMesh, {
    mark: "CRN-TRL-01",
    name: "Frequency-Controlled Hoist Trolley & 4-Fall Ramshorn Hook Block",
    revitFamily: "M_Crane_Trolley_Hook_Assembly",
    revitType: "12T_4Fall_LoadCell_Telemetry",
    ifcClass: "IfcTransportElement",
    discipline: "SITE_PLANT",
    bitCode: "CRANE-01",
    zoneId: "BIT-2-DOME",
    level: "Variable Rigging Elevation (+45.0m RL)",
    gridline: "Active Hook Zone (Silver Dome)",
    worldPos: [craneX + 28, cranePivotY - 16, craneZ],
    dimensionsMm: "1900 × 1700 × 750 mm",
    materialSpec: "Forged Alloy Steel Ramshorn Hook + Non-Rotating 18mm Wire Rope",
    manufacturer: "Liebherr",
    liveTelemetry: "Hook Load: 2.35 Ton (Kalzip Panel Pack) • Radius: 34.0m • Hoist: 28 m/min",
    complianceStandard: "IS 3815 & EN 14439",
    boqRateInr: 275000,
    status: "VERIFIED_OK",
  });
  disciplineGroups.SITE_PLANT.remove(trolleyMesh);
  cranePivot.add(trolleyMesh);

  // Spatial Snag & Telemetry Pins
  VANGUARD_GENOME.spatialPins.forEach((pin, idx) => {
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

    const pinMesh = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(1.15, 0)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: pinColor,
          emissive: pinColor,
          emissiveIntensity: 0.6,
        })
      )
    );
    pinMesh.position.set(...pin.worldPos);
    registerElement(
      pinMesh,
      {
        mark: pin.pinId,
        name: pin.title,
        revitFamily: "M_Spatial_QA_Telemetry_Marker",
        revitType: pin.type,
        ifcClass: "IfcSpatialAnnotation",
        discipline: "SITE_PLANT",
        bitCode: pin.bitId,
        zoneId: mappedZone,
        level: `Y = +${pin.worldPos[1].toFixed(1)}m RL`,
        gridline: `Pin #0${idx + 1}`,
        worldPos: pin.worldPos,
        dimensionsMm: "1150 × 1150 × 1150 mm Marker",
        materialSpec: pin.description,
        manufacturer: "QUADMAX Spatial Cortex",
        liveTelemetry: pin.metricLabel,
        complianceStandard: "ISO 19650 & IS 456",
        boqRateInr: 0,
        status: pin.severity === "MINOR" ? "WATCH_TOLERANCE" : "VERIFIED_OK",
      },
      pin.bitId === "BIT-2" ? "BIT-2-DOME" : undefined
    );
  });

  scene.add(rootGroup);

  // Selection Highlighting
  let selectedMesh: THREE.Mesh | null = null;
  let originalMat: THREE.Material | THREE.Material[] | null = null;
  const highlightMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x10b981,
      emissiveIntensity: 0.9,
      metalness: 0.4,
      roughness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );

  const highlightElement = (mesh: THREE.Mesh | null) => {
    if (selectedMesh && originalMat) {
      selectedMesh.material = originalMat;
    }
    selectedMesh = mesh;
    if (mesh) {
      originalMat = mesh.material;
      mesh.material = highlightMat;
    } else {
      originalMat = null;
    }
  };

  const setDisciplineVisibility = (discipline: DisciplineId, visible: boolean) => {
    if (disciplineGroups[discipline]) {
      disciplineGroups[discipline].visible = visible;
    }
  };

  const setXrayMode = (enabled: boolean) => {
    outerShellMeshes.forEach((m) => {
      const targetMat =
        m === selectedMesh && originalMat && !Array.isArray(originalMat)
          ? originalMat
          : m.material;
      if (targetMat === highlightMat) return;
      const mat = targetMat as THREE.MeshStandardMaterial;
      if (mat && "transparent" in mat) {
        mat.transparent = true;
        mat.opacity = enabled ? 0.2 : 0.85;
        mat.depthWrite = !enabled;
        mat.needsUpdate = true;
      }
    });
  };

  const registerExternalObject = (obj: THREE.Object3D, sourceFileName: string): number => {
    let added = 0;
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const wp = new THREE.Vector3();
        child.getWorldPosition(wp);
        const box = new THREE.Box3().setFromObject(child);
        const sz = new THREE.Vector3();
        box.getSize(sz);
        added++;
        const meta: BimMolecularElement = {
          guid: makeIfcGuid("IFC", guidCounter++),
          mark: `EXT-${String(added).padStart(3, "0")}`,
          name: child.name || `${sourceFileName} Element #${added}`,
          revitFamily: `Imported_${sourceFileName}`,
          revitType: "External_IFC_GLB_Entity",
          ifcClass: "IfcBuildingElementProxy",
          discipline: "ARCHITECTURE",
          bitCode: "IMPORTED BIM",
          zoneId: "BIT-4-TG03",
          level: `Elevation +${wp.y.toFixed(1)}m RL`,
          gridline: `X:${wp.x.toFixed(1)} Z:${wp.z.toFixed(1)}`,
          worldPos: [Number(wp.x.toFixed(2)), Number(wp.y.toFixed(2)), Number(wp.z.toFixed(2))],
          dimensionsMm: `${Math.round(sz.x * 1000)} × ${Math.round(sz.y * 1000)} × ${Math.round(sz.z * 1000)} mm`,
          materialSpec: `Hydrated from ${sourceFileName}`,
          manufacturer: "External BIM Upload",
          liveTelemetry: "SE(3) Datum Grounded • Selectable Molecular Node",
          complianceStandard: "ISO 19650 IFC4",
          boqRateInr: 125000,
          status: "VERIFIED_OK",
        };
        child.userData = {
          bimElement: meta,
          zoneId: meta.zoneId,
          title: `${meta.mark}: ${meta.name}`,
          ifcClass: meta.ifcClass,
          bitCode: meta.bitCode,
          discipline: meta.discipline,
          spec: meta.materialSpec,
          elevation: meta.level,
          budgetOrMetric: sourceFileName,
          tourZone: "BIT-4",
        };
        allMeshes.push(child);
      }
    });
    rootGroup.add(obj);
    return added;
  };

  const baseAzimuth = (VANGUARD_GENOME.craneTelemetry.azimuthDeg * Math.PI) / 180;
  const animate = (elapsedSec: number) => {
    cranePivot.rotation.y = baseAzimuth + Math.sin(elapsedSec * 0.18) * 0.35;
    trolleyMesh.position.x = 26 + Math.sin(elapsedSec * 0.32) * 14;
    for (let i = 0; i < spinningFans.length; i++) {
      spinningFans[i].rotation.y = elapsedSec * 10.0;
    }
  };

  const dispose = () => {
    highlightElement(null);
    scene.remove(rootGroup);
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  };

  const disciplineCounts = {
    STRUCTURAL: disciplineGroups.STRUCTURAL.children.length,
    ARCHITECTURE: disciplineGroups.ARCHITECTURE.children.length,
    HVAC: disciplineGroups.HVAC.children.length,
    PLUMBING: disciplineGroups.PLUMBING.children.length,
    ELECTRICAL: disciplineGroups.ELECTRICAL.children.length,
    SITE_PLANT: disciplineGroups.SITE_PLANT.children.length,
  };

  return {
    rootGroup,
    allMeshes,
    zoneMeshMap,
    disciplineCounts,
    totalSelectableCount: allMeshes.length,
    interiorFocusPos: [-10, 14.5, -13],
    highlightElement,
    setDisciplineVisibility,
    setXrayMode,
    registerExternalObject,
    animate,
    dispose,
  };
}
