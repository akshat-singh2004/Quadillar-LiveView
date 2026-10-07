"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const cube_actions_1 = require("@/app/actions/cube-actions");
const ptw_actions_1 = require("@/app/actions/ptw-actions");
const hydration_actions_1 = require("@/app/actions/hydration-actions");
const labor_actions_1 = require("@/app/actions/labor-actions");
const fleet_actions_1 = require("@/app/actions/fleet-actions");
const synapse_1 = require("@/lib/agents/synapse");
const synapse_daemon_1 = require("@/lib/agents/synapse-daemon");
const hermes_1 = require("@/lib/agents/hermes");
function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key)
        throw new Error("Missing Supabase credentials for IoT Ingress.");
    return (0, supabase_js_1.createClient)(url, key, { auth: { persistSession: false } });
}
async function POST(req) {
    try {
        const supabase = getSupabase();
        const body = await req.json();
        const projectId = body.projectId || body.project_id || "GOMTI-NAGAR-PH1-FITOUT";
        const deviceId = body.deviceId || body.device_id || "EDGE-NODE-01";
        const protocol = body.protocol || "HTTP_REST";
        const category = body.category || body.telemetry_category;
        const payload = body.data || body.payload || {};
        if (!category) {
            return server_1.NextResponse.json({ success: false, error: "Missing required 'category' in IoT payload." }, { status: 400 });
        }
        let routingTarget = "HERMES";
        let interlockTripped = false;
        let governorResult = null;
        // -------------------------------------------------------------------------
        // DISPATCHING ROUTE BASED ON HARDWARE CATEGORY
        // -------------------------------------------------------------------------
        switch (category) {
            // 1. DIGITAL CTM LOAD CELL (Aegis)
            case "CTM_LOAD_CELL": {
                routingTarget = "Aegis";
                governorResult = await (0, cube_actions_1.logCubeCrushTest)({
                    projectId,
                    pourCardId: payload.pourCardId || "PC-FIELD-SAMPLE",
                    testingAgeDays: Number(payload.ageDays || 28),
                    targetFckMpa: Number(payload.targetFckMpa || 35),
                    failureLoadKn: Number(payload.failureLoadKn || 850),
                    gridLocation: payload.gridLocation || "Tower Core Axis",
                    testingMachineId: deviceId,
                    operatorName: payload.operatorName || "CTM Digital Ingress",
                });
                if (!governorResult.isBatchAccepted) {
                    interlockTripped = true;
                    await synapse_1.CouncilSynapse.dispatch({
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
                    await synapse_1.CouncilSynapse.dispatch({
                        projectId,
                        eventType: "WEATHER_CUTOFF_TRIGGERED",
                        sourceAgent: "Argus (HSE Governor)",
                        targetAgent: "Ananke (Fleet Governor)",
                        payload: { deviceId, windSpeedKmh: windSpeed, rainfallRateMmh: rainRate },
                        actionTaken: `Automated crane weathervaning & height work stoppage triggered by IoT Anemometer.`,
                    });
                    // Process cascade synchronously for immediate physical safety
                    await synapse_daemon_1.SynapseDaemon.processPendingEvents(projectId);
                }
                governorResult = { windSpeedKmh: windSpeed, rainfallRateMmh: rainRate, safe: !interlockTripped };
                break;
            }
            // 3. THERMOCOUPLE STRING RTD (Daedalus)
            case "THERMOCOUPLE_RTD": {
                routingTarget = "Daedalus";
                governorResult = await (0, hydration_actions_1.logHydrationReading)({
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
                governorResult = await (0, labor_actions_1.recordTurnstilePunch)(projectId, payload.workerPin || payload.worker_pin || "PIN-101", payload.punchType || payload.direction || "INGRESS");
                break;
            }
            // 5. EQUIPMENT CAN-BUS TELEMATICS (Ananke)
            case "EQUIPMENT_CANBUS": {
                routingTarget = "Ananke";
                governorResult = await (0, fleet_actions_1.logAssetTelemetry)({
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
                governorResult = await (0, ptw_actions_1.logAtmosphericGasTest)({
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
                return server_1.NextResponse.json({ success: false, error: `Unrecognized telemetry category: ${category}` }, { status: 400 });
        }
        // -------------------------------------------------------------------------
        // HERMES IMMUTABLE NOTARIZATION & RAW STREAM INGEST
        // -------------------------------------------------------------------------
        const seal = await hermes_1.HermesAgent.notarizeTransaction({
            projectId,
            actionTitle: `IoT Ingress Processed: ${deviceId} [${category}]`,
            actionCategory: "IOT_TELEMETRY_INGRESS",
            moduleRef: deviceId,
            details: { deviceId, protocol, category, payload, interlockTripped },
            signatoryName: `Hardware Agent (${deviceId})`,
            signatoryRole: "Autonomous Telemetry Probe",
            severity: interlockTripped ? "critical" : "verified",
        });
        const { data: record, error: dbErr } = await supabase
            .from("iot_raw_telemetry_stream")
            .insert({
            project_id: projectId,
            device_id: deviceId,
            device_protocol: protocol,
            telemetry_category: category,
            raw_payload: payload,
            governor_routed: routingTarget,
            processed_success: true,
            interlock_tripped: interlockTripped,
            seor_signoff_hash: seal.blockHash,
        })
            .select()
            .single();
        if (dbErr) {
            console.warn("[iot_raw_telemetry_stream insert notice]:", dbErr.message);
        }
        return server_1.NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            recordId: record?.id,
            deviceId,
            governorRouted: routingTarget,
            interlockTripped,
            governorResult,
            merkleSealHash: seal.blockHash,
        });
    }
    catch (err) {
        return server_1.NextResponse.json({ success: false, error: err?.message || "Failed to process hardware telemetry ingress." }, { status: 500 });
    }
}
