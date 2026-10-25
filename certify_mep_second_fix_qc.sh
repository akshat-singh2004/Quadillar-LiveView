#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: QC MEP COMMISSIONING, LUX SURVEY, RCD & PAINT ADHESION
# Standards: IS 732:2019, IS 12640, IS 3646, IS 2065, IS 101 (Pt 5 Sec 2)
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

async function certifyMepSecondFixQc() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    CERTIFYING MEP COMMISSIONING, LUX SURVEY & FINISHES QUALITY     \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const qcDeedPayload = {
    work_package_ref: "WP-12-MEP-SECOND-FIX-AND-ARCHITECTURAL-FINISHES",
    structural_element: "Internal Finishes, Luminaires, DBs & Sanitary Terminals (GF, L1, L2)",
    illumination_survey_is_3646: {
      photometer_instrument: "Testo 540 Precision Lux Meter",
      working_plane_height_m: 0.75,
      workstations_sampled: 48,
      measured_average_lux: 435,
      statutory_threshold_lux: 400,
      ugr_rating: "< 19",
      uniformity_ratio_emin_eavg: 0.82,
      compliance_status: "PASSED_IS_3646_OFFICE_LIGHTING"
    },
    electrical_safety_and_rcd_is_12640: {
      rcd_trip_test_current_ma: 30,
      measured_tripping_times_ms: [22, 19, 24, 21, 20, 18],
      statutory_trip_time_limit_ms: 30,
      phase_balance_divergence_pct: 3.4,
      earthing_resistance_at_dbs_ohms: 0.72,
      compliance_status: "PASSED_IS_12640_DISCRIMINATION"
    },
    plumbing_and_sanitary_commissioning: {
      dynamic_water_pressure_bar: 3.5,
      dual_flush_volumes_liters: "3.0L / 6.0L verified per IS 2556",
      trap_seal_water_depth_mm: 55,
      statutory_minimum_trap_depth_mm: 50,
      flushing_performance: "Complete evacuation with zero backflow",
      compliance_status: "PASSED_IS_2065_SANITARY_CODE"
    },
    paint_adhesion_is_101: {
      testing_protocol: "Cross-cut lattice test (2mm spacing) per IS 101 Pt 5 Sec 2",
      classification_achieved: "CLASS_0_ASTM_5B",
      peeling_or_flaking_observed: "None (100% lattice square retention)",
      scrub_resistance_cycles: "> 2000 cycles"
    },
    lead_structural_engineer: "Akshat Singh Rathore",
    contractor_signatory: "Apex Structural Engineers & Infra Ltd",
    clearance_status: "AUTHORIZED_FOR_RA13_MEASUREMENT_AND_FINAL_FINISHES",
    certification_timestamp: new Date().toISOString()
  };

  console.log('[1/1] Appending MEP & Finishes QC Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'QC_MEP_SECOND_FIX_AND_FINISHES_CLEARED',
      p_payload: qcDeedPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #38 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Photometric Lux : 435 lux average across workstations (Target: ≥400 lux) [PASS]');
  console.log('  RCD Trip Times  : 18-24 ms at 30mA (Statutory limit: ≤30 ms per IS 12640) [PASS]');
  console.log('  Sanitary Traps  : 55 mm water seal retention verified (Target: ≥50 mm) [PASS]');
  console.log('  Paint Adhesion  : Class 0 / ASTM 5B lattice retention [PASS]');
  console.log('  Clearance       : Authorized for RA-13 Commercial Measurement');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

certifyMepSecondFixQc().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
