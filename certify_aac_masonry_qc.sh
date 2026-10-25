#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: QC AAC MASONRY, JOINT ADHESION & SILL BAND COMPRESSIVE TEST
# Standards: IS 2185 (Pt 3), IS 1905, IS 516:1959, CPWD Specifications Sec 6
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

async function certifyMasonryQc() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    CERTIFYING AAC BLOCK STRENGTH, JOINT BOND & SILL BAND QC       \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const qcDeedPayload = {
    work_package_ref: "WP-09-AAC-MASONRY-AND-SEISMIC-BANDS",
    structural_element: "AAC Block Masonry Envelope & Seismic Bands (GF, L1, L2)",
    aac_block_testing_is_2185_pt3: {
      specimens_tested: 12,
      target_compressive_strength_mpa: 4.0,
      tested_strengths_mpa: [4.5, 4.8, 4.6, 4.7, 4.5, 4.8, 4.6, 4.7, 4.5, 4.6, 4.7, 4.8],
      average_compressive_strength_mpa: 4.65,
      dry_density_kg_m3: 585.0,
      moisture_content_pct: 6.2,
      grading_verdict: "GRADE_1_COMPLIANT"
    },
    joint_adhesion_and_shear_test: {
      testing_protocol: "Direct pull-off test on 3mm thin-bed polymer adhesive joint",
      target_tensile_adhesion_mpa: 0.50,
      measured_adhesion_mpa: 0.68,
      failure_pattern: "COHESIVE_SUBSTRATE_FRACTURE_IN_BLOCK",
      adhesion_status: "PASSED_BOND_CRITERIA"
    },
    seismic_band_cube_test_is_516: {
      concrete_grade: "M20 Mix for Continuous Sill Bands and Lintels",
      f_ck_characteristic_mpa: 20.0,
      specimens_tested_28d: 6,
      individual_readings_mpa: [24.5, 25.1, 24.8, 24.2, 25.4, 24.8],
      average_28d_strength_mpa: 24.8,
      compliance_status: "PASSED_IS_456_SECTION_15"
    },
    laser_alignment_and_chasing_clearance: {
      max_measured_vertical_deviation_mm: 2.3,
      permissible_limit_mm: 3.0,
      beam_soffit_isolation_gap_inspection: "PU foam compression gap intact across all bays",
      chasing_authorization: "AUTHORIZED_FOR_TWIN_BLADE_WALL_CHASERS_ONLY"
    },
    lead_structural_engineer: "Akshat Singh Rathore",
    contractor_signatory: "Apex Structural Engineers & Infra Ltd",
    certification_timestamp: new Date().toISOString()
  };

  console.log('[1/1] Appending AAC Masonry QC Deed to Hermes Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'QC_AAC_MASONRY_AND_SILL_BANDS_CLEARED',
      p_payload: qcDeedPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #29 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Block Strength  : 4.65 N/mm² (Target: ≥4.0 N/mm²) [Grade 1 Pass]');
  console.log('  Joint Adhesion  : 0.68 N/mm² pull-off tensile bond [PASS]');
  console.log('  Sill Band M20   : 24.8 N/mm² (Target: ≥20.0 N/mm²) [124% f_ck achieved]');
  console.log('  Chasing Status  : Cleared for twin-blade mechanical wall grooving');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

certifyMasonryQc().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
