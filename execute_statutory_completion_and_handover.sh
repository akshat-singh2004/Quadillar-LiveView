#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: STATUTORY COMPLETION CERTIFICATE & HANDOVER
# Standards: CPWD GCC Clause 8/8A/17, NBC 2016, BSA 2023 Sec 63 (Electronic Records)
# ==============================================================================

set -euo pipefail

if [ -f .env.local ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^#.* ]] && continue
    [[ -z "$line" ]] && continue
    export "$line"
  done < .env.local
fi

export SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
export SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}}"
export TARGET_PROJECT_ID="LUCKNOW-TECHPARK-PH1"

node - << 'NODE_RUNNER_EOF'
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const projectId = process.env.TARGET_PROJECT_ID;

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json'
};

async function executeCompletionAndHandover() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    RECORDING STATUTORY COMPLETION CERTIFICATE & ASSET HANDOVER     \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const completionTimestamp = new Date().toISOString();
  const dlpExpiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const completionPayload = {
    certificate_reference: "CPWD-CC-LUCKNOW-TECHPARK-TOWER-A-2026",
    governing_clause: "CPWD General Conditions of Contract Clause 8 & 8A",
    project_metadata: {
      project_id: projectId,
      asset_name: "Lucknow IT City Technology Park - Tower A",
      total_builtup_area_sqm: 4850.0,
      structural_configuration: "G + 2 Floors + Central Shear Core + Terrace OHT",
      lead_contractor: "Apex Structural Engineers & Infra Ltd",
      telemetry_and_qc_authority: "Quadillar ConTech Pvt. Ltd.",
      principal_employer: "Uttar Pradesh Electronics Corporation Limited (UPECL)"
    },
    statutory_approvals_manifest: {
      up_fire_services_noc: "FS-UP-LKO-2026-NOC-4412 (Compliant with NBC 2016 Part 4)",
      electrical_inspectorate_ceig: "CEIG-LKO-FORM-A-APPROVED",
      lift_safety_licence: "UP-LIFT-REG-2026-8891 (3 Passenger Traction Lifts)",
      building_occupancy_clearance: "RECOMMENDED_FOR_FINAL_OCCUPANCY_CERTIFICATE"
    },
    financial_and_contractual_closure: {
      sanctioned_contract_value_inr: 45000000.00,
      final_gross_measured_value_inr: 45000000.00,
      completion_percentage: 100.00,
      mobilization_advance_amortized_pct: 100.00,
      remaining_advance_balance_inr: 0.00,
      security_retention_withheld_clause_1a_inr: 2250000.00,
      net_disbursed_to_date_inr: 42750000.00
    },
    defect_liability_period_clause_17: {
      dlp_duration_months: 12,
      commencement_date: completionTimestamp.split('T')[0],
      expiry_date: dlpExpiryDate,
      retention_release_condition: "Successful completion of 12-month DLP & issue of Final Maintenance Certificate"
    },
    digital_twin_and_bim_handover: {
      as_built_model_spec: "LOD 500 Asset Information Model (BIM)",
      platform_telemetry: "Quadillar LiveView Project Ledger fully synchronized",
      cryptographic_framework: "Hermes Merkle Ledger v2.4 (SHA-256 Chained)"
    },
    evidentiary_compliance_bsa_2023: {
      statutory_provision: "Section 63, Bharatiya Sakshya Adhiniyam, 2023",
      hash_algorithm: "SHA-256",
      chain_status: "CONTINUOUS_IMMUTABLE_CHAIN_FROM_GENESIS_TO_COMPLETION",
      certifier: "Akshat Singh Rathore, Lead Telemetry & Project Authority"
    },
    formal_signoff: {
      superintending_engineer: "Akshat Singh Rathore",
      contractor_representative: "Apex Structural Engineers & Infra Ltd",
      client_representative: "UPECL Competent Authority",
      signoff_timestamp: completionTimestamp
    }
  };

  // 1. Appending Final Completion Deed to Hermes Merkle Ledger
  console.log('[1/2] Sealing Final Completion Deed into Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'STATUTORY_COMPLETION_AND_HANDOVER_SEALED',
      p_payload: completionPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append completion deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #41 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);

  // 2. Fetch full ledger metrics to display final root status
  console.log('\n[2/2] Generating Section 63 BSA Digital Integrity Certificate...');
  const auditRes = await fetch(`${supabaseUrl}/rest/v1/hermes_audit_deeds?project_id=eq.${projectId}&order=sequence_number.asc`, {
    method: 'GET',
    headers
  });

  if (auditRes.ok) {
    const records = await auditRes.json();
    console.log(`  Total Blocks Anchored : ${records.length} Nodes (Genesis to Completion)`);
    console.log(`  Ledger Root Digest    : ${nodeHash}`);
    console.log(`  DLP Coverage Period   : ${completionTimestamp.split('T')[0]} to ${dlpExpiryDate}`);
    console.log(`  Retention in Escrow   : INR 22,50,000.00 (CPWD Clause 1A/17)`);
    console.log(`  Statutory Status      : ASSET HANDOVER COMPLETE - TOWER A OPERATIONAL`);
  }

  console.log('\x1b[32m====================================================================\x1b[0m');
}

executeCompletionAndHandover().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
