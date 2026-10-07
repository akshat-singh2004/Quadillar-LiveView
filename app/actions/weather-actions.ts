"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { ChronosAgent, HindranceImpactAssessment } from "@/lib/agents/chronos";
import { HermesAgent } from "@/lib/agents/hermes";

export interface LogWeatherStoppagePayload {
    projectId: string;
    affectedTaskId?: string;
    location: string;
    temperatureC: number;
    windKmH: number;
    rainfallMmHr: number;
    humidityPercent: number;
    triggerDescriptions: string[];
    estimatedDelayDays?: number;
}

function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
        throw new Error("Missing Supabase credentials for weather actions.");
    }

    return createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

/**
 * Autonomous Weather Interceptor:
 * Converts adverse microclimate breaches into a formal CPWD/FIDIC Delay Event,
 * calculates CPM schedule float consumption via Chronos, and seals Section 65B Merkle hashes via Hermes.
 */
export async function logWeatherDelayHindrance(
    payload: LogWeatherStoppagePayload
): Promise<{
    success: boolean;
    assessment?: HindranceImpactAssessment;
    auditBlockId?: string;
    error?: string;
}> {
    try {
        const supabase = getSupabaseClient();
        const timestamp = new Date().toISOString();

        // 1. Resolve affected critical path task if none supplied
        let targetTaskId = payload.affectedTaskId;
        if (!targetTaskId) {
            const { nodes, result } = await ChronosAgent.solveScheduleGraph(payload.projectId);
            targetTaskId = result.criticalPathTaskIds[0] || "CRITICAL_PATH_SUPERSTRUCTURE";
        }

        const hindranceCategory = "UNWORKABLE_WEATHER";
        const delayDays = payload.estimatedDelayDays || 1;
        const clauseRef = "CPWD Cl. 5.1 / FIDIC Cl. 8.4(c) (Exceptionally Adverse Climatic Conditions)";

        // 2. Assess delay impact through Chronos (computes float consumption)
        const assessment = await ChronosAgent.assessHindranceImpact({
            projectId: payload.projectId,
            hindranceId: `WTH-${Date.now().toString(36).toUpperCase()}`,
            affectedTaskId: targetTaskId,
            delayDays,
            hindranceCategory,
            causeDescription: `Adverse microclimate stop at ${payload.location}: Wind ${payload.windKmH} km/h, Rain ${payload.rainfallMmHr} mm/h, Temp ${payload.temperatureC}°C, Humidity ${payload.humidityPercent}%. Triggers: ${payload.triggerDescriptions.join("; ")}`,
        });

        // 3. Persist sensor reading snapshot to site_microclimate_telemetry
        await supabase.from("site_microclimate_telemetry").insert({
            project_id: payload.projectId,
            sensor_location: payload.location,
            temperature_c: payload.temperatureC,
            wind_speed_kmh: payload.windKmH,
            rainfall_rate_mmh: payload.rainfallMmHr,
            humidity_pct: payload.humidityPercent,
            stoppage_active: true,
            linked_hindrance_code: assessment.hindranceNumber,
            trigger_reasons: payload.triggerDescriptions,
            recorded_at: timestamp,
            created_at: timestamp,
        });

        // 4. Seal Section 65B Electronic Evidence through Hermes
        const auditBlock = await HermesAgent.notarizeTransaction({
            projectId: payload.projectId,
            actionTitle: `Adverse Weather EOT Claim Created: ${assessment.hindranceNumber}`,
            actionCategory: "WEATHER_TELEMETRY_STOPPAGE",
            moduleRef: assessment.hindranceNumber,
            details: {
                location: payload.location,
                telemetry: {
                    windKmH: payload.windKmH,
                    rainfallMmHr: payload.rainfallMmHr,
                    temperatureC: payload.temperatureC,
                    humidityPercent: payload.humidityPercent,
                },
                cpmImpact: {
                    affectedTaskId: targetTaskId,
                    floatConsumed: assessment.consumedFloatDays,
                    criticalPathBreached: assessment.criticalPathImpacted,
                    slippageDays: assessment.projectCompletionSlippageDays,
                },
                clause: clauseRef,
            },
            signatoryName: "Agent Chronos & Site Safety Controller",
            signatoryRole: "Autonomous Weather Sentinel",
            severity: assessment.criticalPathImpacted ? "critical" : "warning",
        });

        revalidatePath("/site/weather");
        revalidatePath("/schedule");
        revalidatePath("/finance/ra-bills");
        revalidatePath("/");

        return {
            success: true,
            assessment,
            auditBlockId: auditBlock.id,
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to record adverse weather claim.";
        return { success: false, error: message };
    }
}