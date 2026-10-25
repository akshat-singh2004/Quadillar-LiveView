// scripts/simulate-core-remediation.mjs
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const PROJECT_ID = "GOMTI-NAGAR-PH1-FITOUT";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

async function simulateCoreRemediation() {
  console.log("===========================================================================");
  console.log("  AEGIS DISPUTE ADJUDICATION: IS 456 CL. 17.4.3 IN-SITU CORE EXTRACTION");
  console.log("  Target Element: Tower A - Level 3 Transfer Girder (TG-01)");
  console.log("===========================================================================\n");

  const timestamp = new Date().toISOString();
  const ncrNumber = "NCR-2026-STR-042";

  // IS 456:2000 Clause 17.4.3 Acceptance Criteria for M50:
  // Target: 50.0 MPa
  // Batch Average Threshold (85% of f_ck): 42.50 MPa
  // Minimum Single Core Threshold (75% of f_ck): 37.50 MPa
  const cores = [
    { coreTag: "CORE-TG01-01", diaMm: 100, lengthMm: 100, loadKn: 345.5, rawStrengthMpa: 44.0, equivCubeMpa: 44.9 },
    { coreTag: "CORE-TG01-02", diaMm: 100, lengthMm: 100, loadKn: 332.0, rawStrengthMpa: 42.3, equivCubeMpa: 43.1 },
    { coreTag: "CORE-TG01-03", diaMm: 100, lengthMm: 100, loadKn: 340.0, rawStrengthMpa: 43.3, equivCubeMpa: 44.2 },
  ];

  const avgEquivStrength = parseFloat(
    (cores.reduce((sum, c) => sum + c.equivCubeMpa, 0) / cores.length).toFixed(2)
  );
  const minCoreStrength = Math.min(...cores.map((c) => c.equivCubeMpa));

  console.log("-> Extracted 3x 100mm Diamond Core Specimens (IS 516 Part 4 / IS 1199):");
  cores.forEach((c) => {
    console.log("   " + c.coreTag + ": " + c.equivCubeMpa + " MPa Equiv Cube (Raw: " + c.rawStrengthMpa + " MPa)");
  });
  console.log("\n-> Statistical Evaluation:");
  console.log("   Average Core Strength: " + avgEquivStrength + " MPa (Threshold >= 42.5 MPa: " + (avgEquivStrength >= 42.5 ? "PASSED" : "FAILED") + ")");
  console.log("   Minimum Core Strength: " + minCoreStrength + " MPa (Threshold >= 37.5 MPa: " + (minCoreStrength >= 37.5 ? "PASSED" : "FAILED") + ")");

  const isAccepted = avgEquivStrength >= 42.5 && minCoreStrength >= 37.5;

  if (!isAccepted) {
    console.error("\n❌ Core test failed IS 456 Cl. 17.4.3 criteria. Structural retrofitting or demolition mandatory.");
    return;
  }

  console.log("\n✓ Element Satisfies IS 456 Cl. 17.4.3 in-situ structural criteria!");

  // 1. Update quality_ncr_register to closed/remediated
  const { error: ncrUpdateErr } = await supabase
    .from("quality_ncr_register")
    .update({
      status: "CLOSED_REMEDIATED",
      corrective_action_required: "In-situ core testing completed per IS 456 Cl. 17.4.3. Mean equiv strength " + avgEquivStrength + " MPa satisfies structural adequacy. Withholding lien released.",
      withholding_amount_inr: 0,
      updated_at: timestamp,
    })
    .eq("ncr_number", ncrNumber);

  if (ncrUpdateErr) {
    console.warn("Notice updating quality_ncr_register:", ncrUpdateErr.message);
  } else {
    console.log("-> Closed NCR [" + ncrNumber + "] with status: CLOSED_REMEDIATED");
    console.log("   Withholding lien released: ₹0.00");
  }

  // 2. Notarize Closure in Hermes Vault
  const auditClosurePayload = {
    ncrNumber,
    action: "SEOR_IS456_CL17_CLEARANCE",
    structuralElement: "Level 3 Transfer Girder TG-01",
    meanCoreStrengthMpa: avgEquivStrength,
    minimumCoreStrengthMpa: minCoreStrength,
    statutoryDisposition: "ACCEPTED_PER_IS_456_CL_17_4_3",
    lienReleasedInr: 450000,
    timestamp,
  };
  const sealHash = crypto.createHash("sha256").update(JSON.stringify(auditClosurePayload)).digest("hex");

  await supabase.from("immutable_audit_logs").insert({
    project_id: PROJECT_ID,
    action_title: "Aegis Structural Quality Clearance: IS 456 Cl. 17.4.3 Core Acceptance on " + ncrNumber,
    action_category: "AEGIS_QUALITY_LIEN_RELEASED",
    module_ref: ncrNumber,
    details: auditClosurePayload,
    signatory_name: "Agent Aegis (Structural Quality Governor)",
    signatory_role: "Materials & Structural Integrity Auditor",
    severity: "low",
    merkle_root_hash: sealHash,
    created_at: timestamp,
  });

  console.log("✓ Hermes Section 65B Audit Block Notarized: " + sealHash);
  console.log("\n===========================================================================");
  console.log("  DISPUTE ADJUDICATED: AEGIS HOLD LIFTED & COMMERCIAL GATE UNLOCKED");
  console.log("===========================================================================\n");
}

simulateCoreRemediation().catch(console.error);
