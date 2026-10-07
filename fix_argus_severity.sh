#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Patching lib/agents/argus.ts audit severity to 'critical'...\033[0m"

cat << 'AGENT_ARGUS' > lib/agents/argus.ts
import { createClient } from "@supabase/supabase-js";
import { HermesAgent } from "@/lib/agents/hermes";

export interface WeatherCondition {
  windSpeedKmh: number;
  rainfallRateMmh: number;
  temperatureC: number;
}

export interface WeatherEvaluationResult {
  permitted: boolean;
  craneLockout: boolean;
  concretingSuspended: boolean;
  reasons: string[];
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Agent Argus.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export class ArgusAgent {
  /**
   * Evaluates site microclimate against statutory thresholds:
   * - IS 13367 / OSHA: Tower crane slewing locked if wind > 38 km/h
   * - IS 456 Cl. 13.3: Concreting prohibited during continuous heavy rain (> 5 mm/h)
   */
  static evaluateMicroclimate(conditions: WeatherCondition): WeatherEvaluationResult {
    const reasons: string[] = [];
    let craneLockout = false;
    let concretingSuspended = false;

    if (conditions.windSpeedKmh >= 38) {
      craneLockout = true;
      reasons.push(
        `HIGH WIND LOCKOUT (${conditions.windSpeedKmh} km/h >= 38 km/h limit per IS 13367). Hook loads suspended.`
      );
    }

    if (conditions.rainfallRateMmh >= 5.0) {
      concretingSuspended = true;
      reasons.push(
        `ADVERSE WEATHER CONCRETING STOPPAGE (${conditions.rainfallRateMmh} mm/h >= 5 mm/h per IS 456 Cl. 13.3).`
      );
    }

    return {
      permitted: !craneLockout && !concretingSuspended,
      craneLockout,
      concretingSuspended,
      reasons,
    };
  }

  /**
   * Broadcasts an environmental stop-work hold, logs to telemetry,
   * and notarizes via Hermes for contemporaneous delay protection.
   */
  static async issueEnvironmentalStoppage(params: {
    projectId: string;
    sensorLocation: string;
    windSpeedKmh: number;
    rainfallRateMmh: number;
    temperatureC: number;
  }) {
    const supabase = getSupabase();
    const evaluation = this.evaluateMicroclimate({
      windSpeedKmh: params.windSpeedKmh,
      rainfallRateMmh: params.rainfallRateMmh,
      temperatureC: params.temperatureC,
    });

    if (!evaluation.permitted) {
      await supabase.from("site_microclimate_telemetry").insert({
        project_id: params.projectId,
        sensor_location: params.sensorLocation,
        temperature_c: params.temperatureC,
        wind_speed_kmh: params.windSpeedKmh,
        rainfall_rate_mmh: params.rainfallRateMmh,
        humidity_pct: 75,
        stoppage_active: true,
        trigger_reasons: evaluation.reasons,
        recorded_at: new Date().toISOString(),
      });

      await HermesAgent.notarizeTransaction({
        projectId: params.projectId,
        actionTitle: `Argus Safety Lockout: ${evaluation.reasons[0]}`,
        actionCategory: "HSE_WEATHER_STOPPAGE",
        moduleRef: `WEATHER-${new Date().toISOString().slice(0, 10)}`,
        details: { evaluation, conditions: params },
        signatoryName: "Agent Argus (HSE Sentinel)",
        signatoryRole: "Autonomous Safety Officer",
        severity: "critical",
      });
    }

    return evaluation;
  }
}
AGENT_ARGUS

echo -e "\033[1;36m[+] Verifying TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Resolved cleanly. Zero TypeScript compilation errors remain.\033[0m"
