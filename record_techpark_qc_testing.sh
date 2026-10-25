#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: QC TESTING & NDT CERTIFICATION (IS 516 & IS 14893)
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

async function certifyQcResults() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    RECORDING QC COMPRESSION & NDT INTEGRITY CERTIFICATION         \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const qcPayload = {
    pour_card_ref: "POUR-TP-001",
    pile_identifier: "P-01 (Grid A1-Corner)",
    cube_testing_is_516: {
      curing_age_days: 7,
      concrete_grade: "M35",
      design_characteristic_strength_mpa: 35.0,
      min_expected_7d_strength_mpa: 24.5,
      specimen_results_mpa: [27.4, 28.1, 27.9],
      average_achieved_strength_mpa: 27.8,
      percentage_of_characteristic: 79.4,
      compliance_status: "PASSED_CRITERIA"
    },
    ndt_integrity_test_is_14893: {
      test_methodology: "Sonic Echo / Low-Strain Impact Pulse",
      instrument_serial: "PIT-QUAN-2024-91",
      wave_velocity_m_per_s: 3920,
      pile_length_tested_m: 18.0,
      toe_reflection_detected: true,
      shaft_integrity_status: "CATEGORY_A_UNIMPAIRED",
      anomalies_detected: "NONE"
    },
    testing_laboratory: "NABL Accredited Material Testing Lab, Lucknow",
    lab_report_ref: "NABL-LAB-2026-OCT-8842",
    superintending_engineer: "Akshat Singh Rathore",
    certified_at: new Date().toISOString()
  };

  console.log('[1/1] Appending QC Certification Deed to Hermes Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'QC_PILE_INTEGRITY_AND_STRENGTH_CERTIFIED',
      p_payload: qcPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #5 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  7-Day Strength : 27.8 N/mm² (Target: ≥24.5 N/mm²) [PASS]');
  console.log('  NDT Status     : Category A (Full 18.0m shaft integrity confirmed)');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

certifyQcResults().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
