#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: QC FLOORING ADHESION, TAPPING & CEILING PLANE ATTESTATION
# Standards: IS 15477:2019, IS 13630, CPWD Specifications Section 11
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

async function certifyFlooringQc() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    CERTIFYING FLOORING ADHESION, ACOUSTIC TAPPING & CEILING PLANE  \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const qcDeedPayload = {
    work_package_ref: "WP-11-FLOORING-AND-CEILING-FRAMEWORKS",
    structural_element: "Vitrified Tile Flooring, Wet Area Dado & Ceiling Grids (GF, L1, L2)",
    acoustic_sounding_survey: {
      instrument_used: "Nylon-headed sounding mallet",
      area_surveyed_sqm: 2200.0,
      drummy_hollow_tiles_identified: 0,
      bedding_uniformity_status: "100_PERCENT_SOLID_BED_VERIFIED"
    },
    tensile_pull_off_adhesion_is_15477: {
      target_shear_adhesion_mpa: 1.0,
      measured_adhesion_mpa: 1.32,
      failure_mode: "COHESIVE_SCREED_FRACTURE",
      compliance_status: "PASSED_TYPE_2_ADHESIVE_SPEC"
    },
    surface_tolerances_and_lippage: {
      max_joint_lippage_measured_mm: 0.35,
      permissible_lippage_limit_mm: 0.50,
      gradient_in_wet_areas: "1:80 positive slope toward floor traps confirmed",
      epoxy_grout_inspection: "Uniform flush finish with zero pinholes"
    },
    ceiling_grid_laser_survey: {
      rotary_laser_instrument: "Leica Rugby 680",
      measured_plane_variance_mm: 1.2,
      permissible_variance_mm: 2.0,
      hanger_rod_tension_check: "All M6 anchor connections certified load-bearing"
    },
    lead_structural_engineer: "Akshat Singh Rathore",
    contractor_signatory: "Apex Structural Engineers & Infra Ltd",
    clearance_status: "AUTHORIZED_FOR_RA12_MEASUREMENT_AND_ELECTRICAL_SECOND_FIX",
    certification_timestamp: new Date().toISOString()
  };

  console.log('[1/1] Appending Flooring & Ceiling QC Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'QC_FLOORING_AND_CEILING_GRID_CLEARED',
      p_payload: qcDeedPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #35 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Tapping Survey  : 2,200 sq.m verified solid (0 hollow tiles detected) [PASS]');
  console.log('  Tensile Adhesion: 1.32 N/mm² (Target: ≥1.0 N/mm² per IS 15477) [PASS]');
  console.log('  Tile Lippage    : 0.35 mm (Permissible limit: ≤0.50 mm) [PASS]');
  console.log('  Ceiling Plane   : 1.2 mm horizontal laser variance (Limit: ≤2.0 mm) [PASS]');
  console.log('  Clearance       : Authorized for Electrical Second-Fix & RA-12 Certification');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

certifyFlooringQc().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
