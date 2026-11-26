import crypto from "node:crypto";
import type { MolecularInput } from "@/lib/engines/molecularGovernor";
import {
  VANGUARD_CLEAN_POUR_FIXTURE,
  evaluateFiveWayTriangulation,
  type TriangulationInput,
  type TriangulationReport,
} from "@/lib/domain/triangulationEngine";

export const DEMO_DEFAULT_IOT_SECRET = "quadillar-edge-demo-key";
export const MAX_REPLAY_SKEW_SEC = 300; // 5-minute replay guard

export const SUPPORTED_IOT_CATEGORIES = [
  // 7 Legacy Hardware Streams (preserved for zero regression)
  "CTM_LOAD_CELL",
  "WEATHER_ANEMOMETER",
  "THERMOCOUPLE_RTD",
  "BIOMETRIC_TURNSTILE",
  "EQUIPMENT_CANBUS",
  "ATMOSPHERIC_GAS_SENSOR",
  "MULTI_RAY_SPATIAL_SENSOR",
  // 4 Sprint 14A Autonomous Palantir Field Streams
  "WEIGHBRIDGE_ANPR",
  "BATCHING_PLANT_PLC",
  "CRANE_LMI",
  "CURING_MATURITY_WIRE",
] as const;

export type IotTelemetryCategory = (typeof SUPPORTED_IOT_CATEGORIES)[number];

export interface DeviceAuthResult {
  authorized: boolean;
  authScheme: "hmac_sha256" | "gateway_key" | "none";
  keyMode: "production_env" | "demo_default";
  reason?: string;
}

export interface HardwareEvaluationBridge {
  routingTarget: string;
  interlockTripped: boolean;
  governorPatch: Partial<MolecularInput> | null;
  triangulationReport: TriangulationReport | null;
  summary: string;
  metrics: Record<string, unknown>;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function getIotAuthStatus(): {
  authMode: "production_env" | "demo_default";
  customSecretConfigured: boolean;
  acceptedHeaders: string[];
  replayWindowSec: number;
} {
  const configured = Boolean(process.env.IOT_INGRESS_SECRET?.trim());
  return {
    authMode: configured ? "production_env" : "demo_default",
    customSecretConfigured: configured,
    acceptedHeaders: ["x-iot-signature + x-iot-timestamp (HMAC-SHA256)", "x-iot-key (Gateway Key)"],
    replayWindowSec: MAX_REPLAY_SKEW_SEC,
  };
}

export function signIotPayload(rawBody: string, timestampSec: number, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestampSec}.${rawBody}`)
    .digest("hex");
}

export function verifyIotDeviceAuth(params: {
  rawBody: string;
  signatureHeader?: string | null;
  timestampHeader?: string | null;
  gatewayKeyHeader?: string | null;
  nowMs?: number;
  overrideSecret?: string;
}): DeviceAuthResult {
  const envSecret = params.overrideSecret ?? process.env.IOT_INGRESS_SECRET?.trim();
  const keyMode: "production_env" | "demo_default" = envSecret ? "production_env" : "demo_default";
  const secret = envSecret || DEMO_DEFAULT_IOT_SECRET;
  const nowSec = Math.floor((params.nowMs ?? Date.now()) / 1000);

  // Scheme 1: Signed HMAC-SHA256 webhook with anti-replay timestamp
  const rawSig = (params.signatureHeader || "").trim().replace(/^sha256=/i, "");
  if (rawSig) {
    const tsSec = Number((params.timestampHeader || "").trim());
    if (!Number.isFinite(tsSec) || tsSec <= 0) {
      return {
        authorized: false,
        authScheme: "hmac_sha256",
        keyMode,
        reason: "Missing or invalid x-iot-timestamp (Unix epoch seconds required with x-iot-signature).",
      };
    }

    const skewSec = Math.abs(nowSec - tsSec);
    if (skewSec > MAX_REPLAY_SKEW_SEC) {
      return {
        authorized: false,
        authScheme: "hmac_sha256",
        keyMode,
        reason: `Stale or future x-iot-timestamp rejected (skew ${skewSec}s exceeds ${MAX_REPLAY_SKEW_SEC}s replay window).`,
      };
    }

    const expected = signIotPayload(params.rawBody, tsSec, secret);
    if (!timingSafeEqualStr(rawSig.toLowerCase(), expected)) {
      return {
        authorized: false,
        authScheme: "hmac_sha256",
        keyMode,
        reason: "Invalid HMAC-SHA256 x-iot-signature.",
      };
    }

    return { authorized: true, authScheme: "hmac_sha256", keyMode };
  }

  // Scheme 2: Lightweight static Gateway Key (for constrained Modbus/ESP32 bridges)
  const suppliedKey = (params.gatewayKeyHeader || "").trim();
  if (suppliedKey) {
    if (!timingSafeEqualStr(suppliedKey, secret)) {
      return {
        authorized: false,
        authScheme: "gateway_key",
        keyMode,
        reason: "Invalid x-iot-key gateway credential.",
      };
    }
    return { authorized: true, authScheme: "gateway_key", keyMode };
  }

  return {
    authorized: false,
    authScheme: "none",
    keyMode,
    reason: "Device authentication required via x-iot-signature + x-iot-timestamp or x-iot-key.",
  };
}

function numOr(val: unknown, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Evaluates the 4 new autonomous Palantir hardware streams + wind/spatial bridge rules.
 * Returns deterministic MolecularInput patches and/or 5-Way Triangulation reports.
 */
export function evaluateHardwareBridge(
  category: string,
  projectId: string,
  deviceId: string,
  payload: Record<string, unknown>
): HardwareEvaluationBridge | null {
  const zoneId = String(payload.zoneId || payload.bimZoneId || "BIT-4-TG03");

  switch (category) {
    case "WEIGHBRIDGE_ANPR": {
      const challanVolumeM3 = numOr(payload.challanVolumeM3, VANGUARD_CLEAN_POUR_FIXTURE.challanVolumeM3);
      const weighbridgeNetKg = numOr(payload.weighbridgeNetKg ?? payload.netWeightKg, challanVolumeM3 * 2400);
      const triInput: TriangulationInput = {
        ...VANGUARD_CLEAN_POUR_FIXTURE,
        projectId,
        zoneId,
        challanNo: String(payload.challanNo || `ANPR-${deviceId}`),
        vendorName: String(payload.vendorName || "Site Gate RMC Supplier"),
        challanVolumeM3,
        claimedGradeMpa: numOr(payload.claimedGradeMpa, 50),
        claimedCementBags: numOr(payload.claimedCementBags, Math.round(challanVolumeM3 * 8.4)),
        weighbridgeNetKg,
        plcBatchVolumeM3: numOr(payload.plcBatchVolumeM3, challanVolumeM3),
        plcCementKg: numOr(payload.plcCementKg, Math.round(challanVolumeM3 * 420)),
        plcWaterCementRatio: numOr(payload.plcWaterCementRatio, 0.4),
        bimDesignVolumeM3: numOr(payload.bimDesignVolumeM3, challanVolumeM3),
        inSituEstimatedMpa: numOr(payload.inSituEstimatedMpa, numOr(payload.claimedGradeMpa, 50)),
      };

      const report = evaluateFiveWayTriangulation(triInput);
      return {
        routingTarget: "Midas / Triangulation Correlator",
        interlockTripped: report.httpStatus === 422,
        governorPatch: null,
        triangulationReport: report,
        summary: report.summary,
        metrics: {
          vehiclePlate: String(payload.vehiclePlate || payload.anprPlate || "UP32-ANPR-LIVE"),
          weighbridgeNetKg,
          derivedVolumeM3: report.derivedMetrics.weighbridgeDerivedM3,
          ghostVolumeM3: report.derivedMetrics.ghostVolumeM3,
          trustScorePct: report.trustScorePct,
        },
      };
    }

    case "BATCHING_PLANT_PLC": {
      const plcBatchVolumeM3 = numOr(payload.plcBatchVolumeM3 ?? payload.batchVolumeM3, 38.0);
      const challanVolumeM3 = numOr(payload.challanVolumeM3, plcBatchVolumeM3);
      const triInput: TriangulationInput = {
        ...VANGUARD_CLEAN_POUR_FIXTURE,
        projectId,
        zoneId,
        challanNo: String(payload.challanNo || `PLC-${deviceId}`),
        vendorName: String(payload.vendorName || "On-Site Batching Plant PLC"),
        challanVolumeM3,
        claimedGradeMpa: numOr(payload.claimedGradeMpa, 50),
        claimedCementBags: numOr(payload.claimedCementBags, Math.round(challanVolumeM3 * 8.5)),
        weighbridgeNetKg: numOr(payload.weighbridgeNetKg, plcBatchVolumeM3 * 2400),
        plcBatchVolumeM3,
        plcCementKg: numOr(payload.plcCementKg, Math.round(plcBatchVolumeM3 * 420)),
        plcWaterCementRatio: numOr(payload.plcWaterCementRatio ?? payload.waterCementRatio, 0.4),
        bimDesignVolumeM3: numOr(payload.bimDesignVolumeM3, challanVolumeM3),
        inSituEstimatedMpa: numOr(payload.inSituEstimatedMpa, numOr(payload.claimedGradeMpa, 50)),
      };

      const report = evaluateFiveWayTriangulation(triInput);
      return {
        routingTarget: "Aegis / Batching PLC Governor",
        interlockTripped: report.httpStatus === 422,
        governorPatch: null,
        triangulationReport: report,
        summary: report.summary,
        metrics: {
          plcBatchVolumeM3,
          plcCementKg: triInput.plcCementKg,
          plcWaterCementRatio: triInput.plcWaterCementRatio,
          missingCementBags: report.derivedMetrics.missingCementBags,
          clause42PenaltyInr: report.recommendedClause42PenaltyInr,
        },
      };
    }

    case "CRANE_LMI": {
      const windSpeedMs = numOr(
        payload.windSpeedMs,
        payload.windSpeedKmh !== undefined ? Number(payload.windSpeedKmh) / 3.6 : 6.0
      );
      const swlLoadPct = numOr(payload.swlLoadPct ?? payload.loadPct, 62);
      const windLockout = windSpeedMs >= 15.0; // IS 875 crane safety threshold
      const overloadLockout = swlLoadPct > 95.0;
      const tripped = windLockout || overloadLockout;

      return {
        routingTarget: "Argus / Ananke (Crane LMI Interlock)",
        interlockTripped: tripped,
        governorPatch: {
          projectId,
          zoneId,
          windSpeedMs: Math.round(windSpeedMs * 100) / 100,
        },
        triangulationReport: null,
        summary: tripped
          ? `Crane LMI Lockout on ${deviceId}: wind=${windSpeedMs.toFixed(1)} m/s, SWL=${swlLoadPct.toFixed(1)}% -> PTW revoked.`
          : `Crane LMI nominal on ${deviceId}: wind=${windSpeedMs.toFixed(1)} m/s, SWL=${swlLoadPct.toFixed(1)}%.`,
        metrics: {
          windSpeedMs: Math.round(windSpeedMs * 100) / 100,
          swlLoadPct,
          windLockout,
          overloadLockout,
          boomRadiusM: numOr(payload.boomRadiusM, 28),
        },
      };
    }

    case "CURING_MATURITY_WIRE": {
      const coreTempC = numOr(payload.coreTempC, 54);
      const surfaceTempC = numOr(payload.surfaceTempC, 39);
      const thermalDeltaC = Math.round(Math.abs(coreTempC - surfaceTempC) * 100) / 100;
      const claimedGradeMpa = numOr(payload.claimedGradeMpa ?? payload.targetFckMpa, 50);
      const inSituEstimatedMpa = numOr(payload.inSituEstimatedMpa, claimedGradeMpa * 1.02);

      const thermalRisk = thermalDeltaC > 20.0 || coreTempC > 70.0;
      const report = evaluateFiveWayTriangulation({
        ...VANGUARD_CLEAN_POUR_FIXTURE,
        projectId,
        zoneId,
        challanNo: String(payload.challanNo || `MATURITY-${deviceId}`),
        claimedGradeMpa,
        inSituEstimatedMpa,
        coreTempPeakC: coreTempC,
      });

      const tripped = thermalRisk || report.httpStatus === 422;
      return {
        routingTarget: "Daedalus / Curing Maturity Governor",
        interlockTripped: tripped,
        governorPatch: null,
        triangulationReport: report,
        summary: tripped
          ? `Curing Wire Interlock on ${deviceId}: ΔT=${thermalDeltaC}°C, core=${coreTempC}°C, est=${inSituEstimatedMpa} MPa (target M${claimedGradeMpa}).`
          : `Curing Wire nominal on ${deviceId}: ΔT=${thermalDeltaC}°C, est=${inSituEstimatedMpa} MPa.`,
        metrics: {
          coreTempC,
          surfaceTempC,
          thermalDeltaC,
          thermalRisk,
          inSituEstimatedMpa,
          claimedGradeMpa,
        },
      };
    }

    default:
      return null;
  }
}

export function extractWindMsFromWeatherPayload(payload: Record<string, unknown>): number {
  if (payload.windSpeedMs !== undefined && Number.isFinite(Number(payload.windSpeedMs))) {
    return Math.round(Number(payload.windSpeedMs) * 100) / 100;
  }
  const kmh = numOr(payload.windSpeedKmh, 0);
  return Math.round((kmh / 3.6) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Sprint 15B: Server-Signed Hardware Probe Presets (for War Room BFF)
// ---------------------------------------------------------------------------
export type HardwareProbeType =
  | "CRANE_GUST_22MS"
  | "WEIGHBRIDGE_FRAUD_POUR"
  | "BATCHING_PLC_CEMENT_SHORTAGE"
  | "CRANE_NOMINAL_HEARTBEAT";

export interface HardwareProbePresetMeta {
  probeType: HardwareProbeType;
  label: string;
  category: IotTelemetryCategory;
  deviceId: string;
  expectedOutcome: string;
  severity: "CRITICAL" | "NOMINAL";
}

export const HARDWARE_PROBE_CATALOG: HardwareProbePresetMeta[] = [
  {
    probeType: "CRANE_GUST_22MS",
    label: "Crane LMI Cyclone Gust (22.5 m/s)",
    category: "CRANE_LMI",
    deviceId: "TC-LMI-WARROOM-01",
    expectedOutcome: "Trips IS 875 Crane Wind Lockout + seals IOT_INTERLOCK to hash-chain",
    severity: "CRITICAL",
  },
  {
    probeType: "WEIGHBRIDGE_FRAUD_POUR",
    label: "Weighbridge ANPR Ghost Volume Pour",
    category: "WEIGHBRIDGE_ANPR",
    deviceId: "WB-ANPR-GATE-02",
    expectedOutcome: "Catches 4.2 m³ ghost billing + grade dilution (HTTP 422) + seals TRIANGULATION_ALERT",
    severity: "CRITICAL",
  },
  {
    probeType: "BATCHING_PLC_CEMENT_SHORTAGE",
    label: "Batching PLC Clause 42 Cement Shortage",
    category: "BATCHING_PLANT_PLC",
    deviceId: "PLC-BATCH-UNIT-01",
    expectedOutcome: "Flags missing cement bags & high w/c ratio (HTTP 422) + Clause 42 recovery",
    severity: "CRITICAL",
  },
  {
    probeType: "CRANE_NOMINAL_HEARTBEAT",
    label: "Crane LMI Nominal Heartbeat (4.5 m/s)",
    category: "CRANE_LMI",
    deviceId: "TC-LMI-WARROOM-01",
    expectedOutcome: "Verifies signed HMAC ingress with zero interlock trip (HTTP 200)",
    severity: "NOMINAL",
  },
];

export function isValidHardwareProbeType(val: string | undefined | null): val is HardwareProbeType {
  return HARDWARE_PROBE_CATALOG.some((p) => p.probeType === val);
}

export function buildHardwareProbePayload(
  probeType: HardwareProbeType,
  projectId: string,
  applyToGovernor = true
): Record<string, unknown> {
  const stamp = Date.now().toString().slice(-5);
  switch (probeType) {
    case "CRANE_GUST_22MS":
      return {
        projectId,
        deviceId: "TC-LMI-WARROOM-01",
        protocol: "MQTT_BRIDGE",
        category: "CRANE_LMI",
        applyToGovernor,
        data: { windSpeedMs: 22.5, swlLoadPct: 78, boomRadiusM: 32 },
      };
    case "WEIGHBRIDGE_FRAUD_POUR":
      return {
        projectId,
        deviceId: "WB-ANPR-GATE-02",
        protocol: "MODBUS_TCP",
        category: "WEIGHBRIDGE_ANPR",
        applyToGovernor,
        data: {
          challanNo: `CHLN-WB-${stamp}`,
          vehiclePlate: "UP32-KT-4220",
          vendorName: "Avadh RMC Logistics",
          challanVolumeM3: 42.0,
          weighbridgeNetKg: 90720,
          inSituEstimatedMpa: 36.4,
        },
      };
    case "BATCHING_PLC_CEMENT_SHORTAGE":
      return {
        projectId,
        deviceId: "PLC-BATCH-UNIT-01",
        protocol: "OPC_UA",
        category: "BATCHING_PLANT_PLC",
        applyToGovernor,
        data: {
          challanNo: `PLC-BATCH-${stamp}`,
          challanVolumeM3: 40.0,
          plcBatchVolumeM3: 40.0,
          claimedCementBags: 340,
          plcCementKg: 13800,
          plcWaterCementRatio: 0.56,
          inSituEstimatedMpa: 41.0,
        },
      };
    case "CRANE_NOMINAL_HEARTBEAT":
      return {
        projectId,
        deviceId: "TC-LMI-WARROOM-01",
        protocol: "MQTT_BRIDGE",
        category: "CRANE_LMI",
        applyToGovernor: false,
        data: { windSpeedMs: 4.5, swlLoadPct: 44, boomRadiusM: 22 },
      };
  }
}
