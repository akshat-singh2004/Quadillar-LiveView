// scripts/reset-zero-state.mjs
import { createClient } from "@supabase/supabase-js";

const PROJECT_ID = "GOMTI-NAGAR-PH1-FITOUT";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

async function resetZeroState() {
  console.log("===========================================================================");
  console.log("  LIVEVIEW.OS: RESETTING " + PROJECT_ID + " TO PRISTINE ZERO-STATE");
  console.log("===========================================================================\n");

  const tablesToPurge = [
    "running_account_bills",
    "quality_ncr_register",
    "bim_spatial_clashes",
    "concrete_hydration_telemetry",
    "daily_labor_muster_rolls",
    "plant_machinery_telematics",
    "site_hindrance_register",
    "immutable_audit_logs",
  ];

  for (const table of tablesToPurge) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .eq("project_id", PROJECT_ID);

    if (error) {
      console.warn(`⚠️ Could not purge ${table}: ${error.message}`);
    } else {
      console.log(`✓ Cleared ${count ?? 0} test row(s) from ${table}`);
    }
  }

  // Insert a single Genesis notarization block for Hermes
  const timestamp = new Date().toISOString();
  await supabase.from("immutable_audit_logs").insert({
    project_id: PROJECT_ID,
    action_title: "Project Initialized: Baseline Zero-State Established",
    action_category: "SYSTEM_GENESIS",
    module_ref: "CORE-INITIALIZATION",
    details: { baseline: "ZERO_STATE", status: "NOMINAL", initialized_at: timestamp },
    signatory_name: "Principal Architect & Lead SEOR",
    signatory_role: "System Authority",
    severity: "info",
    merkle_root_hash: "0000000000000000000000000000000000000000000000000000000000000000",
    created_at: timestamp,
  });
  console.log("✓ Minted Genesis Block in Hermes Evidentiary Vault (All Governors Nominal)\n");

  console.log("===========================================================================");
  console.log("  ZERO-STATE RESTORATION COMPLETE: PROJECT READY FOR LIVE INGESTION");
  console.log("===========================================================================\n");
}

resetZeroState().catch(console.error);
