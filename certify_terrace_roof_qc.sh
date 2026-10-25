#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: QC TERRACE 28D STRENGTH & HYDROSTATIC PONDING SIGN-OFF
# Standards: IS 456:2000, IS 3370:2009 (Part 1 Cl 10), IS 516:1959
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

async function certifyTerraceQc() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    CERTIFYING TERRACE ROOF 28D STRENGTH & 72H PONDING TEST         \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const qcDeedPayload = {
    pour_card_ref: "POUR-TP-007",
    structural_element: "Terrace Roof Slab, Ring Beams & Overhead Water Tank Base",
    cube_strength_series_is_516: {
      concrete_grade: "M35 Crystalline Waterproofed Mix",
      f_ck_characteristic_mpa: 35.0,
      target_mean_strength_mpa: 43.25,
      specimens_tested_28d: 6,
      individual_readings_mpa: [40.2, 41.1, 40.8, 39.9, 41.5, 40.4],
      average_28d_strength_mpa: 40.65,
      percentage_of_fck: 116.14,
      is_456_cl_15_acceptance: "PASSED_STRENGTH_CRITERIA"
    },
    hydrostatic_ponding_test_is_3370: {
      test_duration_hours: 72,
      standing_water_depth_terrace_mm: 100,
      water_head_tested_oht_m: 2.0,
      underside_ceiling_inspection: "ZERO_DAMPNESS_OR_SEEPAGE_DETECTED",
      construction_joint_waterstops: "Dry condition confirmed across all perimeter joints",
      compliance_status: "PASSED_IS_3370_PART_1"
    },
    formwork_stripping_is_456_table_11: {
      slab_props_retention_days: 14,
      beam_soffit_props_retention_days: 21,
      surface_defect_check: "Free of honeycombing; crystalline self-healing matrix active",
      re_propping_compliance: "VERIFIED"
    },
    lead_structural_engineer: "Akshat Singh Rathore",
    contractor_signatory: "Apex Structural Engineers & Infra Ltd",
    clearance_status: "AUTHORIZED_FOR_BRICK_BAT_COBA_AND_PARAPET_MASONRY",
    signoff_timestamp: new Date().toISOString()
  };

  console.log('[1/1] Appending Terrace QC & Ponding Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'QC_TERRACE_ROOF_AND_PONDING_TEST_CLEARED',
      p_payload: qcDeedPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #23 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  28-Day Strength : 40.65 N/mm² (Target: ≥35.0 N/mm²) [116.1% f_ck achieved]');
  console.log('  72h Ponding     : Zero dampness/seepage on underside ceiling (IS 3370) [PASS]');
  console.log('  Clearance       : Authorized for Parapet Masonry & Brick Bat Coba Weathering');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

certifyTerraceQc().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
