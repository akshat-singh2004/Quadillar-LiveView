import { BIM_ZONE_REGISTRY, BimZoneTarget } from "@/lib/grounding/bimZoneRegistry";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

export type RayModality =
  | "LIDAR_905NM"
  | "LWIR_THERMAL_IR"
  | "MMWAVE_CAVITY_RADAR"
  | "ACTIVE_NIR_LOWLUX";

export const RAY_MODALITY_META: Record<
  RayModality,
  { shortLabel: string; spectrum: string; penetrates: string }
> = {
  LIDAR_905NM: {
    shortLabel: "LiDAR 905nm",
    spectrum: "905nm ToF Laser",
    penetrates: "Line-of-sight surface geometry (±4mm)",
  },
  LWIR_THERMAL_IR: {
    shortLabel: "LWIR Thermal IR",
    spectrum: "8–14µm Infrared",
    penetrates: "Curing hydration heat, moisture & thermal effusivity",
  },
  MMWAVE_CAVITY_RADAR: {
    shortLabel: "mmWave Cavity Radar",
    spectrum: "24GHz FMCW / GPR",
    penetrates: "Gypsum false-ceiling joints, concealed rebar & hollow spoofs",
  },
  ACTIVE_NIR_LOWLUX: {
    shortLabel: "Active NIR 850nm",
    spectrum: "850nm Structured IR",
    penetrates: "0-lux dark basements, lift shafts & soffit shadows",
  },
};

export interface SensorGapAdvisory {
  advisoryId: string;
  zoneId: string;
  bitId: string;
  zoneLabel: string;
  blindSpotType:
    | "GYPSUM_PLENUM_CAVITY"
    | "LOW_LUX_DETAIL_DEFICIENCY"
    | "MATERIAL_SPOOF_RISK"
    | "CURING_THERMAL_GAP";
  missingModality: RayModality;
  recommendedHardware: string;
  diagnosticReason: string;
  confidencePct: number;
}

export interface ZoneMultiRayState {
  zoneId: string;
  bitId: string;
  zoneLabel: string;
  worldPos: [number, number, number];
  datumConfined: boolean;
  datumResidualMm: number;
  ambientLux: number;
  rayCoverage: Record<
    RayModality,
    { active: boolean; coveragePct: number; sourceTag: string }
  >;
  compositeConfidencePct: number;
  materialSignature: {
    claimedMaterial: string;
    detectedMaterial: string;
    dielectricEr: number;
    surfaceTempC: number;
    curingHydrationPct: number;
    antiSpoofVerified: boolean;
  };
  advisory: SensorGapAdvisory | null;
}

export function confinePointToStructureDatum(worldPos: [number, number, number]): {
  confined: boolean;
  clampedPos: [number, number, number];
  distanceFromDatumCenterM: number;
} {
  const [x, y, z] = worldPos;
  const inBounds = x >= -65 && x <= 65 && y >= -18 && y <= 72 && z >= -55 && z <= 55;
  const clampedPos: [number, number, number] = [
    Math.max(-65, Math.min(65, x)),
    Math.max(-18, Math.min(72, y)),
    Math.max(-55, Math.min(55, z)),
  ];
  return {
    confined: inBounds,
    clampedPos,
    distanceFromDatumCenterM: Number(Math.hypot(x, y, z).toFixed(2)),
  };
}

export function evaluateCampusMultiRayFusion(
  deployedSensorsByZone: Record<string, RayModality[]> = {}
): ZoneMultiRayState[] {
  return BIM_ZONE_REGISTRY.map((zone: BimZoneTarget) => {
    const deployed = new Set<RayModality>(deployedSensorsByZone[zone.zoneId] || []);
    const datumCheck = confinePointToStructureDatum(zone.worldPos);

    if (zone.zoneId === "BIT-4-TG03") {
      const hasThermal = deployed.has("LWIR_THERMAL_IR");
      const hasNir = deployed.has("ACTIVE_NIR_LOWLUX");
      const hasRadar = deployed.has("MMWAVE_CAVITY_RADAR");
      const confidence = Math.min(99, 64 + (hasThermal ? 18 : 0) + (hasNir ? 11 : 0) + (hasRadar ? 6 : 0));

      return {
        zoneId: zone.zoneId,
        bitId: zone.bitId,
        zoneLabel: zone.label,
        worldPos: datumCheck.clampedPos,
        datumConfined: datumCheck.confined,
        datumResidualMm: 2.1,
        ambientLux: 18,
        rayCoverage: {
          LIDAR_905NM: { active: true, coveragePct: 72, sourceTag: "Terrestrial Scan #04" },
          LWIR_THERMAL_IR: {
            active: hasThermal,
            coveragePct: hasThermal ? 96 : 0,
            sourceTag: hasThermal ? "FLIR-A700 Node Active" : "Sensor Missing",
          },
          MMWAVE_CAVITY_RADAR: { active: true, coveragePct: 91, sourceTag: "24GHz Rebar Cover Sweep" },
          ACTIVE_NIR_LOWLUX: {
            active: hasNir,
            coveragePct: hasNir ? 94 : 28,
            sourceTag: hasNir ? "850nm IR Illuminator" : "Low-Lux Shadow (18 lx)",
          },
        },
        compositeConfidencePct: confidence,
        materialSignature: {
          claimedMaterial: "M50 RCC Transfer Girder (28d Curing)",
          detectedMaterial: hasThermal
            ? "M50 Dense RCC (Hydration Verified)"
            : "M50 RCC — Unverified Sub-Surface Curing",
          dielectricEr: 7.8,
          surfaceTempC: hasThermal ? 31.4 : 27.0,
          curingHydrationPct: hasThermal ? 94 : 68,
          antiSpoofVerified: true,
        },
        advisory: hasThermal
          ? null
          : {
              advisoryId: "ADV-TG03-IR",
              zoneId: zone.zoneId,
              bitId: zone.bitId,
              zoneLabel: zone.label,
              blindSpotType: "CURING_THERMAL_GAP",
              missingModality: "LWIR_THERMAL_IR",
              recommendedHardware:
                "Mount LWIR Thermal IR node (8–14µm) + 850nm NIR illuminator on Grid C2–C5 soffit",
              diagnosticReason:
                "Under-deck ambient light is 18 lux (detail deficiency) and optical LiDAR cannot verify M50 exothermic curing hydration or sub-surface honeycombing.",
              confidencePct: confidence,
            },
      };
    }

    if (zone.zoneId === "BIT-2-DOME") {
      const hasRadar = deployed.has("MMWAVE_CAVITY_RADAR");
      const hasThermal = deployed.has("LWIR_THERMAL_IR");
      const confidence = Math.min(99, 61 + (hasRadar ? 26 : 0) + (hasThermal ? 11 : 0));

      return {
        zoneId: zone.zoneId,
        bitId: zone.bitId,
        zoneLabel: zone.label,
        worldPos: datumCheck.clampedPos,
        datumConfined: datumCheck.confined,
        datumResidualMm: 2.8,
        ambientLux: 145,
        rayCoverage: {
          LIDAR_905NM: { active: true, coveragePct: 79, sourceTag: "Dome Tripod LiDAR" },
          LWIR_THERMAL_IR: {
            active: hasThermal,
            coveragePct: hasThermal ? 92 : 35,
            sourceTag: hasThermal ? "Thermal Seam Audit" : "Partial IR",
          },
          MMWAVE_CAVITY_RADAR: {
            active: hasRadar,
            coveragePct: hasRadar ? 97 : 0,
            sourceTag: hasRadar ? "24GHz Plenum Radar" : "Occluded Gypsum Cavity",
          },
          ACTIVE_NIR_LOWLUX: { active: true, coveragePct: 88, sourceTag: "NIR Node #14B" },
        },
        compositeConfidencePct: confidence,
        materialSignature: {
          claimedMaterial: "12.5mm Fire-Rated Gypsum Acoustic Soffit + GI Grid",
          detectedMaterial: hasRadar
            ? "Gypsum Board + Verified 0.9mm GI Framing"
            : "Surface Gypsum Only — Plenum Cavity Unmapped",
          dielectricEr: hasRadar ? 2.7 : 2.4,
          surfaceTempC: 26.8,
          curingHydrationPct: 100,
          antiSpoofVerified: hasRadar,
        },
        advisory: hasRadar
          ? null
          : {
              advisoryId: "ADV-BIT2-PLENUM",
              zoneId: zone.zoneId,
              bitId: zone.bitId,
              zoneLabel: zone.label,
              blindSpotType: "GYPSUM_PLENUM_CAVITY",
              missingModality: "MMWAVE_CAVITY_RADAR",
              recommendedHardware:
                "Deploy 24GHz mmWave Cavity Radar sweep across BIT-2 gypsum ceiling joints",
              diagnosticReason:
                "Optical 905nm LiDAR stops at outer gypsum face; joint seams create an occluded cavity hiding GI suspension hangers and HVAC clearance.",
              confidencePct: confidence,
            },
      };
    }

    if (zone.zoneId === "BIT-5-WING") {
      const hasRadar = deployed.has("MMWAVE_CAVITY_RADAR");
      const hasThermal = deployed.has("LWIR_THERMAL_IR");
      const confidence = Math.min(99, 58 + (hasRadar ? 24 : 0) + (hasThermal ? 16 : 0));

      return {
        zoneId: zone.zoneId,
        bitId: zone.bitId,
        zoneLabel: zone.label,
        worldPos: datumCheck.clampedPos,
        datumConfined: datumCheck.confined,
        datumResidualMm: 1.9,
        ambientLux: 92,
        rayCoverage: {
          LIDAR_905NM: { active: true, coveragePct: 95, sourceTag: "LiDAR Edge Geometry" },
          LWIR_THERMAL_IR: {
            active: hasThermal,
            coveragePct: hasThermal ? 94 : 0,
            sourceTag: hasThermal ? "Thermal Effusivity Lock" : "Sensor Missing",
          },
          MMWAVE_CAVITY_RADAR: {
            active: hasRadar,
            coveragePct: hasRadar ? 96 : 0,
            sourceTag: hasRadar ? "Dielectric Bulk Scan" : "Surface-Only Risk",
          },
          ACTIVE_NIR_LOWLUX: { active: true, coveragePct: 90, sourceTag: "NIR Edge Scanner" },
        },
        compositeConfidencePct: confidence,
        materialSignature: {
          claimedMaterial: "200mm AAC Block Masonry Partition (Bay E4)",
          detectedMaterial:
            hasRadar || hasThermal
              ? "Verified AAC Masonry (εr = 6.9, High Thermal Mass)"
              : "SPOOF ALERT: Low-Density Hollow Edge (εr = 1.6 — Cardboard/Board Masking)",
          dielectricEr: hasRadar || hasThermal ? 6.9 : 1.6,
          surfaceTempC: 28.9,
          curingHydrationPct: 91,
          antiSpoofVerified: hasRadar || hasThermal,
        },
        advisory:
          hasRadar || hasThermal
            ? null
            : {
                advisoryId: "ADV-BIT5-SPOOF",
                zoneId: zone.zoneId,
                bitId: zone.bitId,
                zoneLabel: zone.label,
                blindSpotType: "MATERIAL_SPOOF_RISK",
                missingModality: "MMWAVE_CAVITY_RADAR",
                recommendedHardware:
                  "Trigger 24GHz Dielectric + LWIR Thermal Effusivity check on Bay E4 wall edge",
                diagnosticReason:
                  "LiDAR shows crisp 90° edges (Δ < 2mm), but hollow dielectric signature (εr 1.6) flags potential folded cardboard/plywood edge masking.",
                confidencePct: confidence,
              },
      };
    }

    return {
      zoneId: zone.zoneId,
      bitId: zone.bitId,
      zoneLabel: zone.label,
      worldPos: datumCheck.clampedPos,
      datumConfined: datumCheck.confined,
      datumResidualMm: 1.7,
      ambientLux: 310,
      rayCoverage: {
        LIDAR_905NM: { active: true, coveragePct: 96, sourceTag: "Drone + Tripod LiDAR" },
        LWIR_THERMAL_IR: { active: true, coveragePct: 93, sourceTag: "LWIR Array Online" },
        MMWAVE_CAVITY_RADAR: { active: true, coveragePct: 92, sourceTag: "mmWave Sweep Verified" },
        ACTIVE_NIR_LOWLUX: { active: true, coveragePct: 95, sourceTag: "NIR Core Node" },
      },
      compositeConfidencePct: 95,
      materialSignature: {
        claimedMaterial: zone.concreteGrade,
        detectedMaterial: `${zone.concreteGrade} Verified (Multi-Ray Consensus)`,
        dielectricEr: 7.4,
        surfaceTempC: 29.2,
        curingHydrationPct: 96,
        antiSpoofVerified: true,
      },
      advisory: null,
    };
  });
}

export const STRUCTURE_DATUM_SPEC = {
  projectId: VANGUARD_GENOME.projectId,
  datumLabel: "Lucknow Survey Datum +112.40m RL (SE(3) Locked)",
  envelopeMeters: "130m (X) × 90m (Y) × 110m (Z)",
};
