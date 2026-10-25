#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: QC L2 COLUMNS, SHEAR CORE STRIPPING & COUPLER CERTIFICATION
# Standards: IS 516:1959, IS 16172:2014 (Rebar Couplers), IS 456:2000 Table 11
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

async function certifyL2ColumnsQc() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    CERTIFYING L2 COLUMNS STRIPPING & IS 16172 COUPLER TENSILE TEST \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const qcDeedPayload = {
    pour_card_ref: "POUR-TP-005",
    structural_element: "Second Floor Columns C1-C16 & Core Shear Walls SW1-SW2",
    cube_strength_series_is_516: {
      specimen_age_days: 7,
      concrete_grade: "M40 Self-Compacting Mix",
      f_ck_target_28d_mpa: 40.0,
      min_expected_7d_mpa: 28.0,
      specimen_readings_mpa: [32.9, 33.6, 33.1],
      average_7d_strength_mpa: 33.2,
      percentage_of_fck: 83.0,
      acceptance_status: "PASSED_STRENGTH_CRITERIA"
    },
    mechanical_coupler_test_is_16172: {
      coupler_type: "Class H Parallel-Threaded Mechanical Coupler",
      rebar_size_tested: "25mm Fe-550D",
      number_of_specimens_tested: 4,
      min_specified_tensile_strength_mpa: 687.5, // 1.25 * 550
      tested_tensile_values_mpa: [710.5, 715.0, 712.8, 718.5],
      average_tensile_strength_mpa: 714.2,
      failure_mode: "PARENT_BAR_DUCTILE_FRACTURE_OUTSIDE_COUPLER",
      test_outcome: "FULLY_COMPLIANT_IS_16172"
    },
    verticality_and_stripping_inspection: {
      stripping_elapsed_time_hours: 24,
      vertical_alignment_survey: "Total Station verified: Max deviation 1.8mm across 3.6m lift",
      surface_defect_check: "No honeycombing or cold joints detected in lift core shear walls",
      cover_blocks_intact: true
    },
    lead_structural_engineer: "Akshat Singh Rathore",
    testing_agency: "NABL Certified Testing Facility, Lucknow",
    contractor_signatory: "Apex Structural Engineers & Infra Ltd",
    clearance_status: "AUTHORIZED_FOR_SECOND_FLOOR_DECK_FORMWORK",
    signoff_timestamp: new Date().toISOString()
  };

  console.log('[1/1] Appending L2 QC & Coupler Certification Deed to Hermes Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'QC_L2_COLUMNS_AND_COUPLER_INTEGRITY_CLEARED',
      p_payload: qcDeedPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #17 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  7-Day Strength : 33.2 N/mm² (Target: ≥28.0 N/mm²) [83% f_ck achieved]');
  console.log('  IS 16172 Couplers: 714.2 N/mm² Tensile Strength (Parent bar rupture) [PASS]');
  console.log('  Alignment      : 1.8 mm max deviation (Tolerance: ±5.0 mm per IS 456) [PASS]');
  console.log('  Clearance      : Authorized for Second Floor Slab Cuplock Staging');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

certifyL2ColumnsQc().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
