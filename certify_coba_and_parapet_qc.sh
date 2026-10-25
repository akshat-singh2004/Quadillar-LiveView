#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: QC COBA 14D PONDING & PARAPET M25 STRENGTH CERTIFICATION
# Standards: CPWD Specifications Sub-head 12.11, IS 1346:1991, IS 516:1959
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

async function certifyCobaQc() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    CERTIFYING 14-DAY COBA PONDING & PARAPET M25 COMPRESSIVE STRENGTH\x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const qcDeedPayload = {
    work_package_ref: "WP-08-TERRACE-ENVELOPE-WEATHERPROOFING",
    structural_element: "Terrace Brick Bat Coba Insulation & 1200mm Perimeter Parapet",
    hydrostatic_ponding_test_cpwd_12_11: {
      continuous_ponding_duration_days: 14,
      water_head_maintained_mm: 100,
      treated_area_sqm: 1200.0,
      soffit_underside_inspection: "NO_DAMPNESS_OR_EFFLORESCENCE_OBSERVED",
      junction_coves_inspection: "All 180m perimeter vatas sound and uncracked",
      khurras_drainage_test: "Full gravity discharge confirmed across 8 rainwater hoppers",
      watertightness_status: "PASSED_CPWD_SPECIFICATION"
    },
    parapet_cube_test_series_is_516: {
      concrete_grade: "M25 Mix (Nominal 1:1:2 equivalent)",
      f_ck_characteristic_mpa: 25.0,
      specimens_tested_28d: 6,
      individual_readings_mpa: [30.4, 31.2, 30.8, 30.1, 31.5, 30.8],
      average_28d_strength_mpa: 30.8,
      percentage_of_fck: 123.2,
      compliance_verdict: "PASSED_IS_456_SECTION_15"
    },
    envelope_clearance: {
      drainage_status: "AUTHORIZED_FOR_WATER_DISCHARGE",
      subsequent_work_release: "AUTHORIZED_FOR_AAC_MASONRY_AND_MEP_VERTICAL_RISERS"
    },
    lead_structural_engineer: "Akshat Singh Rathore",
    contractor_signatory: "Apex Structural Engineers & Infra Ltd",
    certification_timestamp: new Date().toISOString()
  };

  console.log('[1/1] Appending Coba & Parapet QC Clearance Deed to Hermes Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'QC_TERRACE_COBA_AND_PARAPET_CLEARED',
      p_payload: qcDeedPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #26 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  14-Day Ponding  : 1,200 sq.m verified 100% watertight; zero underside dampness [PASS]');
  console.log('  Parapet Strength: 30.8 N/mm² (Target: ≥25.0 N/mm²) [123.2% f_ck achieved]');
  console.log('  Clearance       : Authorized for AAC Block Masonry & MEP Vertical Risers');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

certifyCobaQc().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
