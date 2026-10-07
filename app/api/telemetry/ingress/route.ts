import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logCubeCrushTest } from "@/app/actions/cube-actions";
import { logAtmosphericGasTest } from "@/app/actions/ptw-actions";
import { logHydrationReading } from "@/app/actions/hydration-actions";
import { recordTurnstilePunch } from "@/app/actions/labor-actions";
import { logAssetTelemetry } from "@/app/actions/fleet-actions";
import { CouncilSynapse } from "@/lib/agents/synapse";
import { SynapseDaemon } from "@/lib/agents/synapse-daemon";
import { HermesAgent } from "@/lib/agents/hermes";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-service-key-for-local-testing";
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const body = await req.json();

    const projectId = body.projectId || body.project_id || "GOMTI-NAGAR-PH1-FITOUT";
    const deviceId = body.deviceId || body.device_id || "EDGE-NODE-01";
    const protocol = body.protocol || "HTTP_REST";
    const category = body.category || body.telemetry_category;
    const payload = body.data || body.payload || {};

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Missing required 'category' in IoT payload." },
        { status: 400 }
      );
    }

    let routingTarget = "HERMES";
    let interlockTripped = false;
    let governorResult: any = null;

    // -------------------------------------------------------------------------
    // DISPATCH BASED ON HARDWARE CATEGORY
    // -------------------------------------------------------------------------
    switch (category) {
      // 1. DIGITAL CTM LOAD CELL (Aegis)
      case "CTM_LOAD_CELL": {
        routingTarget = "Aegis";
        governorResult = await logCubeCrushTest({
          projectId,
          pourCardId: payload.pourCardId || "PC-FIELD-SAMPLE",
          testingAgeDays: Number(payload.ageDays || 28),
          targetFckMpa: Number(payload.targetFckMpa || 35),
          failureLoadKn: Number(payload.failureLoadKn || 850),
          gridLocation: payload.gridLocation || "Tower Core Axis",
          testingMachineId: deviceId,
          operatorName: payload.operatorName || "CTM Digital Ingress",
        });

        const isAccepted = governorResult?.isBatchAccepted ?? governorResult?.proof?.isBatchAccepted ?? true;
        if (governorResult?.success && !isAccepted) {
          interlockTripped = true;
          await CouncilSynapse.dispatch({
            projectId,
            eventType: "STRUCTURAL_NCR_ISSUED",
            sourceAgent: "Aegis (Quality Governor)",
            targetAgent: "Midas (Commercial Governor)",
            payload: { deviceId, pourCardId: payload.pourCardId, proof: governorResult.proof },
            actionTaken: `Automated quality lien engaged from IoT CTM fracture breach.`,
          });
        }
        break;
      }

      // 2. ULTRASONIC WEATHER ANEMOMETER (Argus)
      case "WEATHER_ANEMOMETER": {
        routingTarget = "Argus";
        const windSpeed = Number(payload.windSpeedKmh || 0);
        const rainRate = Number(payload.rainfallRateMmh || 0);

        if (windSpeed > 38.0 || rainRate > 5.0) {
          interlockTripped = true;
          await CouncilSynapse.dispatch({
            projectId,
            eventType: "WEATHER_CUTOFF_TRIGGERED",
            sourceAgent: "Argus (HSE Governor)",
            targetAgent: "Ananke (Fleet Governor)",
            payload: { deviceId, windSpeedKmh: windSpeed, rainfallRateMmh: rainRate },
            actionTaken: `Automated crane weathervaning & height work stoppage triggered by IoT Anemometer.`,
          });
          await SynapseDaemon.processPendingEvents(projectId);
        }
        governorResult = { windSpeedKmh: windSpeed, rainfallRateMmh: rainRate, safe: !interlockTripped };
        break;
      }

      // 3. THERMOCOUPLE STRING RTD (Daedalus)
      case "THERMOCOUPLE_RTD": {
        routingTarget = "Daedalus";
        governorResult = await logHydrationReading({
          projectId,
          pourCardId: payload.pourCardId || "PC-MASS-POUR",
          structuralElement: payload.structuralElement || "Raft Foundation Section",
          sensorNodeCode: deviceId,
          coreTempC: Number(payload.coreTempC || 50),
          surfaceTempC: Number(payload.surfaceTempC || 36),
          ambientTempC: Number(payload.ambientTempC || 28),
          hoursSincePour: Number(payload.hoursSincePour || 36),
          targetFckMpa: Number(payload.targetFckMpa || 40),
        });

        if (governorResult.evalResult?.isThermalCrackRisk || governorResult.evalResult?.isDefRisk) {
          interlockTripped = true;
        }
        break;
      }

      // 4. BIOMETRIC TURNSTILE PUNCH (Plutus)
      case "BIOMETRIC_TURNSTILE": {
        routingTarget = "Plutus";
        governorResult = await recordTurnstilePunch(
          projectId,
          payload.workerPin || payload.worker_pin || "PIN-101",
          payload.punchType || payload.direction || "INGRESS"
        );
        break;
      }

      // 5. EQUIPMENT CAN-BUS TELEMATICS (Ananke)
      case "EQUIPMENT_CANBUS": {
        routingTarget = "Ananke";
        governorResult = await logAssetTelemetry({
          projectId,
          assetCode: payload.assetCode || deviceId,
          assetName: payload.assetName || "Plant Asset",
          category: payload.category || "TOWER_CRANE",
          plannedOperatingHours: Number(payload.plannedHours || 8),
          actualOperatingHours: Number(payload.actualHours || 7.5),
          idlingHours: Number(payload.idlingHours || 0.5),
          fuelConsumedLiters: Number(payload.fuelConsumedLiters || 90),
          oemRatedFuelBurnLph: Number(payload.oemRatedFuelBurnLph || 11),
          outputVolumeM3: Number(payload.outputVolumeM3 || 180),
          targetVolumeM3: Number(payload.targetVolumeM3 || 200),
          fitnessExpiryDateIso: payload.fitnessExpiryDateIso || "2026-12-31",
        });

        if (governorResult.finalStatus === "GROUNDED_SAFETY_HOLD" || governorResult.evalResult?.isFuelPilferageFlagged) {
          interlockTripped = true;
        }
        break;
      }

      // 6. ATMOSPHERIC 4-GAS SENSOR (Argus)
      case "ATMOSPHERIC_GAS_SENSOR": {
        routingTarget = "Argus";
        governorResult = await logAtmosphericGasTest({
          projectId,
          permitId: payload.permitId,
          oxygenPct: Number(payload.oxygenPct || 20.9),
          combustibleLelPct: Number(payload.combustibleLelPct || 0),
          h2sPpm: Number(payload.h2sPpm || 0),
          coPpm: Number(payload.coPpm || 0),
          testedBy: `IoT Telemetry (${deviceId})`,
        });

        if (!governorResult.isAtmosphereSafe) {
          interlockTripped = true;
        }
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unrecognized telemetry category: ${category}` },
          { status: 400 }
        );
    }

    // -------------------------------------------------------------------------
    // HERMES IMMUTABLE NOTARIZATION & RAW STREAM INGEST
    // -------------------------------------------------------------------------
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
        seor_signoff_hash: seal.blockHash,
      });
    } catch (dbErr: any) {
      console.warn("[iot_raw_telemetry_stream insert notice]:", dbErr.message);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      deviceId,
      governorRouted: routingTarget,
      interlockTripped,
      governorResult,
      merkleSealHash: seal.blockHash,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to process hardware telemetry ingress." },
      { status: 500 }
    );
  }
}
