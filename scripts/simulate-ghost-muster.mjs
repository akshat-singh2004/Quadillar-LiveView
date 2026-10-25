// scripts/simulate-ghost-muster.mjs
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const PROJECT_ID = "GOMTI-NAGAR-PH1-FITOUT";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

async function triggerGhostMuster() {
  console.log("===========================================================================");
  console.log("  PLUTUS LABOR GOVERNOR: INGESTING BIOMETRIC TURNSTILE DISCREPANCY");
  console.log("  Project: " + PROJECT_ID + " | Statutory Act: BOCW Act 1996 / Minimum Wages");
  console.log("===========================================================================\n");

  const timestamp = new Date().toISOString();
  const shiftDate = timestamp.slice(0, 10);
  const musterCode = "MUST-2026-BOCW-014";
  const dailyWageRate = 850; // Skilled bar bender daily rate
  const statutoryFloor = 612; // UP BOCW statutory floor
  const claimedHeadcount = 38;
  const verifiedHeadcount = 26;
  const ghostWorkersCount = 12; // 12 Phantom badges detected
  const ghostWageDebit = ghostWorkersCount * dailyWageRate; // ₹10,200 non-compliance debit

  // 1. Ingest muster record matching all columns in labor-actions.ts
  const { data: musterRecord, error } = await supabase
    .from("daily_labor_muster_rolls")
    .insert({
      project_id: PROJECT_ID,
      muster_code: musterCode,
      contractor_agency: "Apex Infra Reinforcements Ltd",
      trade_classification: "STEEL_FIXER_BAR_BENDER",
      skill_tier: "SKILLED",
      claimed_headcount: claimedHeadcount,
      biometric_verified_headcount: verifiedHeadcount,
      ghost_workers_count: ghostWorkersCount,
      daily_wage_rate_inr: dailyWageRate,
      ghost_wage_debit_inr: ghostWageDebit,
      statutory_minimum_wage_inr: statutoryFloor,
      is_wage_compliant: true,
      shift_date: shiftDate,
      status: "GHOST_WORKERS_FLAGGED",
      created_at: timestamp,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to insert labor muster:", error.message);
    return;
  }

  console.log("-> Registered Biometric Turnstile Reconciliation Failure [" + musterCode + "]:");
  console.log("   Claimed: " + claimedHeadcount + " | Biometric Cleared: " + verifiedHeadcount + " | Ghost Headcount: " + ghostWorkersCount);
  console.log("   Commercial Debit Calculated: ₹" + ghostWageDebit.toLocaleString("en-IN") + " (12 workers @ ₹" + dailyWageRate + "/shift)");

  // 2. Notarize in Hermes Vault
  const auditPayload = {
    musterCode,
    contractorAgency: "Apex Infra Reinforcements Ltd",
    trade: "STEEL_FIXER_BAR_BENDER",
    claimedHeadcount,
    verifiedHeadcount,
    ghostCount: ghostWorkersCount,
    contraChargeDebitInr: ghostWageDebit,
    statutoryAct: "Building and Other Construction Workers (BOCW) Act 1996 Cl. 44",
    verdict: "COMMERCIAL_DEBIT_AND_SHOW_CAUSE_HOLD",
    timestamp,
  };
  const sealHash = crypto.createHash("sha256").update(JSON.stringify(auditPayload)).digest("hex");

  await supabase.from("immutable_audit_logs").insert({
    project_id: PROJECT_ID,
    action_title: "Plutus Labor Fraud Alert: 12 Ghost Workers Flagged on Muster " + musterCode,
    action_category: "LABOR_BOCW_MUSTER_AUDITED",
    module_ref: musterCode,
    details: auditPayload,
    signatory_name: "Agent Plutus (Labor & BOCW Governor)",
    signatory_role: "Autonomous Labor Welfare Auditor",
    severity: "critical",
    merkle_root_hash: sealHash,
    created_at: timestamp,
  });

  console.log("✓ Hermes Section 65B Audit Block Notarized: " + sealHash);
  console.log("\n===========================================================================");
  console.log("  INGESTION COMPLETE: PLUTUS ENGAGED ACTIVE_HOLD (₹10,200 Contra-Charge)");
  console.log("===========================================================================\n");
}

triggerGhostMuster().catch(console.error);
