#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: QC COLUMN STRIPPING & 7-DAY STRENGTH (IS 456 / IS 516)
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

async function certifyColumnsQc() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    CERTIFYING GF COLUMNS STRIPPING INSPECTION & 7-DAY STRENGTH    \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const qcDeedPayload = {
    pour_card_ref: "POUR-TP-003",
    structural_element: "GF Columns C1-C16 & Plinth Tie Beams (Grid A1-D4)",
    formwork_stripping_is_456_table_11: {
      stripping_time_elapsed_hours: 24,
      vertical_surface_condition: "Smooth, zero honeycombing or segregation observed",
      effective_cover_verified_mm: 40,
      curing_methodology: "Hessian cloth wrapping with continuous automated drip sprinklers"
    },
    verticality_laser_survey: {
      instrument_used: "Leica Rugby Rotary Laser Level",
      max_measured_deviation_mm: 2.1,
      tolerance_limit_is_456_mm: 5.0,
      survey_verdict: "COMPLIANT_WITHIN_TOLERANCE"
    },
    cube_strength_series_is_516: {
      specimen_age_days: 7,
      concrete_grade: "M40 Design Mix",
      f_ck_target_28d_mpa: 40.0,
      min_expected_7d_mpa: 28.0,
      specimen_readings_mpa: [31.8, 33.1, 32.3],
      average_7d_strength_mpa: 32.4,
      percentage_of_fck: 81.0,
      acceptance_status: "PASSED_CRITERIA"
    },
    shuttering_release_authorized_by: "Akshat Singh Rathore",
    chief_qa_signoff: "Apex Structural Engineers & Infra Ltd",
    clearance_status: "AUTHORIZED_FOR_FIRST_FLOOR_DECKING_STAGING",
    signoff_timestamp: new Date().toISOString()
  };

  console.log('[1/1] Appending Column Stripping & QC Deed to Hermes Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'QC_COLUMNS_STRIPPING_AND_STRENGTH_SEALED',
      p_payload: qcDeedPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #11 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  7-Day Strength : 32.4 N/mm² (Target: ≥28.0 N/mm²) [81% f_ck achieved]');
  console.log('  Laser Plumb    : 2.1 mm max drift (Tolerance: ±5.0 mm per IS 456) [PASS]');
  console.log('  Clearance      : Authorized for First Floor Decking & Cuplock Falsework');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

certifyColumnsQc().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
