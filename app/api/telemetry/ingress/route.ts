import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { jsonError, jsonOk } from "@/lib/server/http";
import {
  buildRateLimitHeaders,
  checkRateLimit,
  extractClientIp,
  rateLimitExceededResponse,
} from "@/lib/server/securityGuard";
import {
  SUPPORTED_IOT_CATEGORIES,
  evaluateHardwareBridge,
  extractWindMsFromWeatherPayload,
  getIotAuthStatus,
  verifyIotDeviceAuth,
} from "@/lib/domain/iotTelemetryBridge";
import { getGovernorState, saveGovernorState } from "@/lib/repositories/governorRepo";
import { appendGovernorEvent } from "@/lib/repositories/eventLedgerRepo";
import { logCubeCrushTest } from "@/app/actions/cube-actions";
import { logAtmosphericGasTest } from "@/app/actions/ptw-actions";
import { logHydrationReading } from "@/app/actions/hydration-actions";
import { recordTurnstilePunch } from "@/app/actions/labor-actions";
import { logAssetTelemetry } from "@/app/actions/fleet-actions";
import { CouncilSynapse } from "@/lib/agents/synapse";
import { SynapseDaemon } from "@/lib/agents/synapse-daemon";
import { HermesAgent } from "@/lib/agents/hermes";

export const dynamic = "force-dynamic";

const IOT_RATE_POLICY = {
  bucket: "iot_telemetry_ingress",
  limit: 120,
  windowSec: 60,
};

export async function GET() {
  return jsonOk({
    ok: true,
    service: "quadillar-iot-telemetry-ingress",
    version: "2.0.0",
    ...getIotAuthStatus(),
    rateLimitPolicy: IOT_RATE_POLICY,
    supportedCategories: SUPPORTED_IOT_CATEGORIES,
  });
}

export async function POST(req: Request) {
  const rl = await checkRateLimit(extractClientIp(req), IOT_RATE_POLICY);
  if (!rl.allowed) return rateLimitExceededResponse(rl);
  const rlHeaders = buildRateLimitHeaders(rl);

  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch {
    return jsonError("Unable to read request body.", 400);
  }

  // Fail-closed device authentication (HMAC-SHA256 + 5-min replay guard OR Gateway Key)
  const auth = verifyIotDeviceAuth({
    rawBody,
    signatureHeader: req.headers.get("x-iot-signature"),
    timestampHeader: req.headers.get("x-iot-timestamp"),
    gatewayKeyHeader: req.headers.get("x-iot-key"),
  });

  if (!auth.authorized) {
    return jsonOk(
      {
        success: false,
        ok: false,
        error: auth.reason || "Unauthorized IoT telemetry device.",
        authScheme: auth.authScheme,
        keyMode: auth.keyMode,
      },
      401,
      rlHeaders
    );
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON payload.", 400);
  }

  try {
    const supabase = getSupabaseAdmin();
    const projectId = String(body.projectId || body.project_id || "VANGUARD-LKO-01").trim();
    const deviceId = String(body.deviceId || body.device_id || "EDGE-NODE-01").trim();
    const protocol = String(body.protocol || "HTTP_REST").trim();
    const category = String(body.category || body.telemetry_category || "").trim();
    const payload =
      (body.data && typeof body.data === "object"
        ? (body.data as Record<string, unknown>)
        : body.payload && typeof body.payload === "object"
        ? (body.payload as Record<string, unknown>)
        : {}) as Record<string, unknown>;
    const applyToGovernor = body.applyToGovernor !== false;

    if (!category) {
      return jsonError("Missing required 'category' in IoT payload.", 400);
    }

    let routingTarget = "HERMES";
    let interlockTripped = false;
    let governorResult: unknown = null;
    let triangulationReport: unknown = null;
    let governorEscalation: {
      applied: boolean;
      httpStatus: number;
      frozenInr: number;
      violationCount: number;
      storageMode: string;
    } | null = null;
    let ledgerReceipt: { seq: number; chainHash: string; storageMode: string } | null = null;

    // 1. Check the 4 Sprint 14A Autonomous Palantir Hardware Bridges first
    const bridge = evaluateHardwareBridge(category, projectId, deviceId, payload);
    if (bridge) {
      routingTarget = bridge.routingTarget;
      interlockTripped = bridge.interlockTripped;
      governorResult = {
        summary: bridge.summary,
        metrics: bridge.metrics,
      };
      triangulationReport = bridge.triangulationReport;

      if (applyToGovernor && bridge.governorPatch) {
        const current = await getGovernorState(projectId);
        const saved = await saveGovernorState({
          projectId,
          mode: "custom",
          input: { ...current.input, ...bridge.governorPatch },
        });
        governorEscalation = {
          applied: true,
          httpStatus: saved.snapshot.escrow.httpStatus,
          frozenInr: saved.snapshot.escrow.frozenInr,
          violationCount: saved.snapshot.violations.length,
          storageMode: saved.storageMode,
        };
      }
    } else {
      // 2. Preserve all 7 Legacy Hardware Streams cleanly
      switch (category) {
        case "CTM_LOAD_CELL": {
          routingTarget = "Aegis";
          const res = await logCubeCrushTest({
            projectId,
            pourCardId: String(payload.pourCardId || "PC-FIELD-SAMPLE"),
            testingAgeDays: Number(payload.ageDays || 28),
            targetFckMpa: Number(payload.targetFckMpa || 35),
            failureLoadKn: Number(payload.failureLoadKn || 850),
            gridLocation: String(payload.gridLocation || "Tower Core Axis"),
            testingMachineId: deviceId,
            operatorName: String(payload.operatorName || "CTM Digital Ingress"),
          });
          governorResult = res;
          const isAccepted =
            (res as { isBatchAccepted?: boolean; proof?: { isBatchAccepted?: boolean } })
              ?.isBatchAccepted ??
            (res as { proof?: { isBatchAccepted?: boolean } })?.proof?.isBatchAccepted ??
            true;
          if ((res as { success?: boolean })?.success && !isAccepted) {
            interlockTripped = true;
            await CouncilSynapse.dispatch({
              projectId,
              eventType: "STRUCTURAL_NCR_ISSUED",
              sourceAgent: "Aegis (Quality Governor)",
              targetAgent: "Midas (Commercial Governor)",
              payload: { deviceId, pourCardId: payload.pourCardId, proof: (res as { proof?: unknown }).proof },
              actionTaken: "Automated quality lien engaged from IoT CTM fracture breach.",
            });
          }
          break;
        }

        case "WEATHER_ANEMOMETER": {
          routingTarget = "Argus";
          const windSpeedMs = extractWindMsFromWeatherPayload(payload);
          const windSpeedKmh = Math.round(windSpeedMs * 3.6 * 10) / 10;
          const rainRate = Number(payload.rainfallRateMmh || 0);

          if (windSpeedMs >= 15.0 || windSpeedKmh > 38.0 || rainRate > 5.0) {
            interlockTripped = true;
            try {
              await CouncilSynapse.dispatch({
                projectId,
                eventType: "WEATHER_CUTOFF_TRIGGERED",
                sourceAgent: "Argus (HSE Governor)",
                targetAgent: "Ananke (Fleet Governor)",
                payload: { deviceId, windSpeedMs, windSpeedKmh, rainfallRateMmh: rainRate },
                actionTaken: "Automated crane weathervaning & height work stoppage triggered by IoT Anemometer.",
              });
              await SynapseDaemon.processPendingEvents(projectId);
            } catch {
              // Non-blocking legacy synapse mirror
            }
          }

          if (applyToGovernor && windSpeedMs > 0) {
            const current = await getGovernorState(projectId);
            const saved = await saveGovernorState({
              projectId,
              mode: "custom",
              input: { ...current.input, windSpeedMs },
            });
            governorEscalation = {
              applied: true,
              httpStatus: saved.snapshot.escrow.httpStatus,
              frozenInr: saved.snapshot.escrow.frozenInr,
              violationCount: saved.snapshot.violations.length,
              storageMode: saved.storageMode,
            };
          }

          governorResult = { windSpeedMs, windSpeedKmh, rainfallRateMmh: rainRate, safe: !interlockTripped };
          break;
        }

        case "THERMOCOUPLE_RTD": {
          routingTarget = "Daedalus";
          const res = await logHydrationReading({
            projectId,
            pourCardId: String(payload.pourCardId || "PC-MASS-POUR"),
            structuralElement: String(payload.structuralElement || "Raft Foundation Section"),
            sensorNodeCode: deviceId,
            coreTempC: Number(payload.coreTempC || 50),
            surfaceTempC: Number(payload.surfaceTempC || 36),
            ambientTempC: Number(payload.ambientTempC || 28),
            hoursSincePour: Number(payload.hoursSincePour || 36),
            targetFckMpa: Number(payload.targetFckMpa || 40),
          });
          governorResult = res;
          if (res.evalResult?.isThermalCrackRisk || res.evalResult?.isDefRisk) {
            interlockTripped = true;
          }
          break;
        }

        case "BIOMETRIC_TURNSTILE": {
          routingTarget = "Plutus";
          governorResult = await recordTurnstilePunch(
            projectId,
            String(payload.workerPin || payload.worker_pin || "PIN-101"),
            String(payload.punchType || payload.direction || "INGRESS") as "INGRESS" | "EGRESS"
          );
          break;
        }

        case "EQUIPMENT_CANBUS": {
          routingTarget = "Ananke";
          const res = await logAssetTelemetry({
            projectId,
            assetCode: String(payload.assetCode || deviceId),
            assetName: String(payload.assetName || "Plant Asset"),
            category: String(payload.category || "TOWER_CRANE") as "TOWER_CRANE",
            plannedOperatingHours: Number(payload.plannedHours || 8),
            actualOperatingHours: Number(payload.actualHours || 7.5),
            idlingHours: Number(payload.idlingHours || 0.5),
            fuelConsumedLiters: Number(payload.fuelConsumedLiters || 90),
            oemRatedFuelBurnLph: Number(payload.oemRatedFuelBurnLph || 11),
            outputVolumeM3: Number(payload.outputVolumeM3 || 180),
            targetVolumeM3: Number(payload.targetVolumeM3 || 200),
            fitnessExpiryDateIso: String(payload.fitnessExpiryDateIso || "2026-12-31"),
          });
          governorResult = res;
          if (res.finalStatus === "GROUNDED_SAFETY_HOLD" || res.evalResult?.isFuelPilferageFlagged) {
            interlockTripped = true;
          }
          break;
        }

        case "ATMOSPHERIC_GAS_SENSOR": {
          routingTarget = "Argus";
          const res = await logAtmosphericGasTest({
            projectId,
            permitId: String(payload.permitId || "PTW-CONFINED-01"),
            oxygenPct: Number(payload.oxygenPct || 20.9),
            combustibleLelPct: Number(payload.combustibleLelPct || 0),
            h2sPpm: Number(payload.h2sPpm || 0),
            coPpm: Number(payload.coPpm || 0),
            testedBy: `IoT Telemetry (${deviceId})`,
          });
          governorResult = res;
          if (!res.isAtmosphereSafe) {
            interlockTripped = true;
          }
          break;
        }

        case "MULTI_RAY_SPATIAL_SENSOR": {
          routingTarget = "Argus / Minerva";
          const deltaMm = Number(payload.gridlineDeltaMm ?? payload.deltaMm ?? 1.8);
          const dielectricEr = Number(payload.gprDielectricEr ?? 7.1);
          const isSpoofOrDrift = deltaMm > 10.0 || dielectricEr < 2.5;
          if (isSpoofOrDrift) interlockTripped = true;
          governorResult = {
            bimZoneId: String(payload.bimZoneId || "BIT-4-TG03"),
            gridlineDeltaMm: deltaMm,
            thermalC: Number(payload.thermalC ?? 31.4),
            gprDielectricEr: dielectricEr,
            spoofOrDriftFlagged: isSpoofOrDrift,
          };
          break;
        }

        default:
          return jsonError(`Unrecognized telemetry category: ${category}`, 400);
      }
    }

    // 3. Seal tripped hardware interlocks into append-only BSA Sec 63 hash-chain
    if (interlockTripped) {
      const tri = bridge?.triangulationReport;
      const appended = await appendGovernorEvent({
        projectId,
        eventType: tri ? "TRIANGULATION_ALERT" : "IOT_INTERLOCK",
        actor: `iot-device:${deviceId}`,
        source: `/api/telemetry/ingress:${category}`,
        mode: interlockTripped ? "interlock_422" : "nominal",
        httpStatus: 422,
        frozenInr: tri?.recommendedEscrowHoldInr ?? governorEscalation?.frozenInr ?? 0,
        netReleaseInr: 0,
        violationCount: tri?.discrepancies.length ?? governorEscalation?.violationCount ?? 1,
        diffJson: {
          deviceId,
          protocol,
          category,
          authScheme: auth.authScheme,
          routingTarget,
          interlockTripped,
          discrepancyCodes: tri?.discrepancies.map((d) => d.code) ?? [],
        },
        snapshotHash: `IOT:${deviceId}:${category}:${Date.now()}`,
      });
      ledgerReceipt = {
        seq: appended.event.seq,
        chainHash: appended.event.chainHash,
        storageMode: appended.storageMode,
      };
    }

    // 4. Non-blocking legacy Hermes notarization & raw stream archive
    let merkleSealHash = ledgerReceipt?.chainHash || "NOTARIZED_BY_LEDGER";
    try {
      const seal = await HermesAgent.notarizeTransaction({
        projectId,
        actionTitle: `IoT Ingress Processed: ${deviceId} [${category}]`,
        actionCategory: "IOT_TELEMETRY_INGRESS",
        moduleRef: deviceId,
        details: { deviceId, protocol, category, payload, interlockTripped } as unknown as Record<string, unknown>,
        signatoryName: `Hardware Agent (${deviceId})`,
        signatoryRole: "Autonomous Telemetry Probe",
        severity: interlockTripped ? "critical" : "verified",
      });
      merkleSealHash = seal.blockHash;
    } catch {
      // Non-blocking fallback when legacy Hermes table isn't provisioned
    }

    if (supabase) {
      try {
        await supabase.from("iot_raw_telemetry_stream").insert({
          project_id: projectId,
          device_id: deviceId,
          device_protocol: protocol,
          telemetry_category: category,
          raw_payload: payload,
          governor_routed: routingTarget,
          processed_success: true,
          interlock_tripped: interlockTripped,
          seor_signoff_hash: merkleSealHash,
        });
      } catch {
        // Non-blocking raw stream archive
      }
    }

    return jsonOk(
      {
        success: true,
        ok: true,
        timestamp: new Date().toISOString(),
        projectId,
        deviceId,
        category,
        authScheme: auth.authScheme,
        governorRouted: routingTarget,
        interlockTripped,
        governorResult,
        governorEscalation,
        triangulationReport,
        ledgerReceipt,
        merkleSealHash,
      },
      200,
      {
        ...rlHeaders,
        ...(ledgerReceipt ? { "X-BSA-Sec63-Hash": ledgerReceipt.chainHash } : {}),
      }
    );
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Failed to process hardware telemetry ingress.",
      500
    );
  }
}
