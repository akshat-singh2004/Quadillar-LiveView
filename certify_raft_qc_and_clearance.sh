#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: CERTIFY RAFT 28-DAY STRENGTH & NDT INTEGRITY (IS 516/13311)
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

async function certifyRaftQc() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    CERTIFYING 28-DAY COMPRESSIVE STRENGTH & UPV SCAN: RAFT SLAB    \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const qcDeedPayload = {
    pour_card_ref: "POUR-TP-002",
    structural_element: "Foundation Raft Slab (Grid A1-D4)",
    cube_test_series_is_516: {
      concrete_grade: "M35 Design Mix (GGBS replacement 35%)",
      target_mean_strength_mpa: 43.25,
      characteristic_strength_fck_mpa: 35.0,
      specimens_tested_28d: 6,
      individual_readings_mpa: [40.8, 41.5, 42.1, 40.5, 41.9, 40.6],
      average_28d_strength_mpa: 41.23,
      acceptance_criteria_is_456_cl_15: "PASSED (f_avg >= f_ck + 4 N/mm2; min >= f_ck - 4 N/mm2)"
    },
    ndt_ultrasonic_pulse_velocity_is_13311: {
      equipment_model: "Proceq Pundit PL-200",
      transducer_frequency_khz: 54,
      measured_pulse_velocity_km_s: 4.35,
      is_13311_grading: "EXCELLENT_QUALITY (> 4.0 km/s)",
      surface_crack_evaluation: "NO_THERMAL_MICROFISSURES_DETECTED"
    },
    curing_period_completed_days: 28,
    shuttering_and_load_release: "AUTHORIZED_FOR_SUPERSTRUCTURE_STAGGERING",
    certifying_qa_engineer: "Akshat Singh Rathore",
    chief_consultant_signoff: "Apex Structural Engineers & Infra Ltd",
    clearance_timestamp: new Date().toISOString()
  };

  console.log('[1/1] Appending QC Raft Clearance Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'QC_RAFT_STRENGTH_AND_NDT_CLEARED',
      p_payload: qcDeedPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #8 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  28-Day Strength : 41.23 N/mm² (Target: ≥35.0 N/mm²) [PASS]');
  console.log('  UPV Velocity    : 4.35 km/s (IS 13311: Excellent Concrete Quality)');
  console.log('  Clearance       : Authorized for Superstructure Column Starter Staggering');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

certifyRaftQc().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
