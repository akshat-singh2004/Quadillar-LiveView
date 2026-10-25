// scripts/simulate-single-clash.mjs
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const PROJECT_ID = "GOMTI-NAGAR-PH1-FITOUT";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

async function triggerSingleClash() {
  console.log("===========================================================================");
  console.log("  MINERVA BIM GOVERNOR: INGESTING ISOLATED SPATIAL COLLISION");
  console.log("  Project: " + PROJECT_ID + " | Standard: ISO 19650 LOD 400");
  console.log("===========================================================================\n");

  const timestamp = new Date().toISOString();
  const clashCode = "CLASH-MEP-001";

  // Insert using the exact columns from app/actions/bim-actions.ts
  const { data: clashRecord, error } = await supabase
    .from("bim_spatial_clashes")
    .insert({
      project_id: PROJECT_ID,
      clash_code: clashCode,
      grid_location: "Grid F-8 Level 3",
      structural_element: "PT Beam Bay 2",
      mep_service_element: "150mm Chilled Water Pipe",
      clash_category: "HARD_CLASH",
      penetration_depth_mm: 125,
      seor_waiver_status: "UNAPPROVED_HOLD",
      pour_card_lock_engaged: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to insert clash:", error.message);
    return;
  }

  console.log(`-> Registered 125mm Penetration Clash [${clashCode}] (DB ID: ${clashRecord.id}) at Grid F-8 Level 3.`);

  // Notarize in Hermes Vault
  const auditPayload = {
    clashCode,
    dbId: clashRecord.id,
    gridLocation: "Grid F-8 Level 3",
    element: "150mm Chilled Water Pipe vs PT Beam Bay 2",
    penetrationMm: 125,
    timestamp,
  };
  const sealHash = crypto.createHash("sha256").update(JSON.stringify(auditPayload)).digest("hex");

  await supabase.from("immutable_audit_logs").insert({
    project_id: PROJECT_ID,
    action_title: "Minerva Spatial Hold Engaged: 150mm Pipe Pierces PT Beam Bay 2",
    action_category: "BIM_SPATIAL_COLLISION_LOGGED",
    module_ref: clashCode,
    details: auditPayload,
    signatory_name: "Agent Minerva",
    signatory_role: "BIM Coordination Governor",
    severity: "warning",
    merkle_root_hash: sealHash,
    created_at: timestamp,
  });

  console.log("✓ Hermes Cryptographic Hold Notarized: " + sealHash);
  console.log("\n===========================================================================");
  console.log("  INGESTION COMPLETE: MINERVA TRIPPED TO ACTIVE_HOLD (1 Open Clash)");
  console.log("===========================================================================\n");
}

triggerSingleClash().catch(console.error);
