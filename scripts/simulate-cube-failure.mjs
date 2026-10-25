// scripts/simulate-cube-failure.mjs
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const PROJECT_ID = "GOMTI-NAGAR-PH1-FITOUT";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

async function simulateCubeFailure() {
  console.log("===========================================================================");
  console.log("  AEGIS QUALITY GOVERNOR: INGESTING IS 516 / IS 456 CUBE BREAK FAILURE");
  console.log("  Project: " + PROJECT_ID + " | Target Grade: M50 (50 MPa Target)");
  console.log("===========================================================================\n");

  const timestamp = new Date().toISOString();
  const castingDate = new Date(Date.now() - 28 * 86400000).toISOString();
  const pourCardId = "PC-2026-TG01";
  const gridLocation = "Tower A - Level 3 Transfer Girder (TG-01)";
  const ncrNumber = "NCR-2026-STR-042";
  const withholdingLienInr = 450000;

  // 1. Ingest Triplicate Specimen Record into concrete_cube_tests
  // Triggers automated DB action in non_conformance_reports
  const cubePayload = {
    project_id: PROJECT_ID,
    sample_tag: "CUBE-TG01-28D-SET",
    pour_card_ref: pourCardId,
    structural_element: "Level 3 Post-Tensioned Transfer Girder TG-01",
    location_grid: gridLocation,
    concrete_grade: "M50",
    target_fck_mpa: 50.0,
    casting_date: castingDate,
    testing_date: timestamp,
    test_age: "28_DAYS",
    specimen_1_weight_kg: 8.24,
    specimen_1_load_kn: 760.5,
    specimen_1_strength_mpa: 33.8,
    specimen_2_weight_kg: 8.21,
    specimen_2_load_kn: 776.25,
    specimen_2_strength_mpa: 34.5,
    specimen_3_weight_kg: 8.26,
    specimen_3_load_kn: 769.5,
    specimen_3_strength_mpa: 34.2,
    average_strength_mpa: 34.17,
    average_density_kg_cum: 2440.0,
    variation_pct: 2.1,
    status: "CRITICAL_FAILURE_NCR",
    failure_pattern: "Satisfactory pyramidal break under IS 516 Cl. 15.3, but statistical mean failed IS 456 Table 11",
    ctm_machine_id: "CTM-DIGITAL-01",
    tested_by: "QA Materials Specialist (IS 516 Certified)",
    witnessed_by: "Lead SEOR & Aegis Sentinel",
  };

  const { error: cubeErr } = await supabase.from("concrete_cube_tests").insert([cubePayload]);
  if (cubeErr) {
    console.error("Notice on concrete_cube_tests insert:", cubeErr.message);
  } else {
    console.log("-> Registered 28-Day Triplicate Batch into concrete_cube_tests:");
    console.log("   Specimen Breaks: 33.8 MPa, 34.5 MPa, 34.2 MPa (Mean: 34.17 MPa vs 50.0 MPa target)");
    console.log("   Trigger fired: autonomous non_conformance_reports entry created.");
  }

  // 2. Insert Structural NCR with CPWD Cl. 14 Financial Withholding Lien
  // Omit status to let Postgres apply table default constraint
  const ncrPayload = {
    project_id: PROJECT_ID,
    ncr_number: ncrNumber,
    drawing_code: "DWG-STR-L03-401",
    grid_location: gridLocation,
    severity: "MAJOR_STRUCTURAL",
    issue_description: "IS 456 Table 11 Compressive Failure: 28-day mean strength achieved is 34.2 MPa against specified M50 target (31.6% deficit).",
    corrective_action_required: "Execute in-situ non-destructive testing (UPV + Rebound Hammer) or diamond core extraction per IS 456 Cl. 17.4.3.",
    withholding_amount_inr: withholdingLienInr,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const { data: ncrData, error: ncrErr } = await supabase
    .from("quality_ncr_register")
    .insert(ncrPayload)
    .select("ncr_number, severity, status, withholding_amount_inr")
    .single();

  if (ncrErr) {
    console.error("Failed to insert quality NCR:", ncrErr.message);
    return;
  }

  console.log("\n-> Issued Structural Non-Conformance Report [" + ncrData.ncr_number + "]:");
  console.log("   Severity: " + ncrData.severity);
  console.log("   Status: " + ncrData.status);
  console.log("   Location: " + gridLocation);
  console.log("   Financial Lien: ₹" + withholdingLienInr.toLocaleString("en-IN") + " (CPWD Cl. 14 Withholding)");

  // 3. Notarize Section 65B Audit Block in Hermes Vault
  const auditPayload = {
    ncrNumber,
    pourCardId,
    gridLocation,
    targetGrade: "M50",
    meanAchievedStrengthMpa: 34.17,
    deficitMpa: 15.83,
    statutoryClause: "IS 456:2000 Table 11 / IS 516 / CPWD Cl. 14",
    withholdingLienInr,
    actionRequired: "IN_SITU_CORE_OR_NDT_MANDATE",
    timestamp,
  };
  const sealHash = crypto.createHash("sha256").update(JSON.stringify(auditPayload)).digest("hex");

  await supabase.from("immutable_audit_logs").insert({
    project_id: PROJECT_ID,
    action_title: "Aegis Structural Quality Hold: IS 456 Table 11 Cube Failure on " + ncrNumber,
    action_category: "AEGIS_QUALITY_LIEN_ENGAGED",
    module_ref: ncrNumber,
    details: auditPayload,
    signatory_name: "Agent Aegis (Structural Quality Governor)",
    signatory_role: "Materials & Structural Integrity Auditor",
    severity: "critical",
    merkle_root_hash: sealHash,
    created_at: timestamp,
  });

  console.log("✓ Hermes Section 65B Audit Block Notarized: " + sealHash);
  console.log("\n===========================================================================");
  console.log("  INGESTION COMPLETE: AEGIS ENGAGED ACTIVE_HOLD (₹4,50,000 Lien Locked)");
  console.log("===========================================================================\n");
}

simulateCubeFailure().catch(console.error);
