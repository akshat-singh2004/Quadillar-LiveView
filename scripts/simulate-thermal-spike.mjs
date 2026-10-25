// scripts/simulate-thermal-spike.mjs
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const PROJECT_ID = "GOMTI-NAGAR-PH1-FITOUT";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

async function triggerThermalSpike() {
  console.log("===========================================================================");
  console.log("  DAEDALUS QUALITY GOVERNOR: INGESTING WIRELESS RTD THERMOCOUPLE SPIKE");
  console.log("  Project: " + PROJECT_ID + " | Standard: ASTM C1074 / IS 456 Cl. 13.4");
  console.log("===========================================================================\n");

  const timestamp = new Date().toISOString();
  const pourLocation = "Tower A - Level 3 Transfer Girder (TG-01)";
  const pourCardId = "PC-2026-TG01";
  const coreTemp = 68.4;
  const surfaceTemp = 42.1;
  const ambientTemp = 31.0;
  const deltaT = Number((coreTemp - surfaceTemp).toFixed(1)); // 26.3°C > 20.0°C threshold

  // Ingest telemetry matching all 16 fields in app/actions/hydration-actions.ts
  const { data: telemetryRecord, error } = await supabase
    .from("concrete_hydration_telemetry")
    .insert({
      project_id: PROJECT_ID,
      pour_card_id: pourCardId,
      structural_element: pourLocation,
      sensor_node_code: "RTD-TG01-CORE-02",
      core_temp_c: coreTemp,
      surface_temp_c: surfaceTemp,
      ambient_temp_c: ambientTemp,
      hours_since_pour: 18,
      target_fck_mpa: 50,
      differential_temp_c: deltaT,
      maturity_index_deg_hrs: 685,
      estimated_strength_mpa: 22.5,
      is_def_risk: false,
      is_thermal_crack_risk: true,
      stripping_permitted: false,
      evaluation_verdict: "THERMAL_CRACK_RISK_HOLD",
      logged_at: timestamp,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to insert telemetry:", error.message);
    return;
  }

  console.log("-> Recorded Thermal Gradient Violation on " + pourLocation + ":");
  console.log("   T_core: " + coreTemp + "°C | T_surface: " + surfaceTemp + "°C | ΔT: " + deltaT + "°C (Statutory Limit: 20.0°C)");
  console.log("   Evaluation Verdict: THERMAL_CRACK_RISK_HOLD | Stripping Lock: ACTIVE");

  // Notarize in Hermes Vault
  const auditPayload = {
    pourCardId,
    structuralElement: pourLocation,
    sensorNode: "RTD-TG01-CORE-02",
    coreTempC: coreTemp,
    surfaceTempC: surfaceTemp,
    deltaTC: deltaT,
    thresholdC: 20.0,
    statutoryStandard: "ASTM C1074 / IS 456 Cl. 13.4 & Table 2",
    verdict: "THERMAL_CRACK_RISK_HOLD",
    timestamp,
  };
  const sealHash = crypto.createHash("sha256").update(JSON.stringify(auditPayload)).digest("hex");

  await supabase.from("immutable_audit_logs").insert({
    project_id: PROJECT_ID,
    action_title: "Daedalus Thermal Gradient Hold: ΔT " + deltaT + "°C (Girder TG-01)",
    action_category: "THERMAL_HYDRATION_HOLD_ENGAGED",
    module_ref: pourCardId,
    details: auditPayload,
    signatory_name: "Agent Daedalus",
    signatory_role: "Hydration & Curing Governor",
    severity: "warning",
    merkle_root_hash: sealHash,
    created_at: timestamp,
  });

  console.log("✓ Hermes Cryptographic Hold Notarized: " + sealHash);
  console.log("\n===========================================================================");
  console.log("  INGESTION COMPLETE: DAEDALUS TRIPPED TO ACTIVE_HOLD");
  console.log("===========================================================================\n");
}

triggerThermalSpike().catch(console.error);
