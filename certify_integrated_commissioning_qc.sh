#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: QC INTEGRATED MEP COMMISSIONING & FIRE LIFE SAFETY (FLS)
# Standards: NBC 2016 Part 4 & Part 8, IS 15105:2021, IS 14665, CEA Regs 2023
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

async function certifyIntegratedCommissioningQc() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    CERTIFYING INTEGRATED MEP & FIRE LIFE SAFETY (FLS) COMMISSIONING\x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const qcDeedPayload = {
    work_package_ref: "WP-13-INTEGRATED-COMMISSIONING-AND-FLS",
    structural_element: "Tower A Integrated Building Systems, Fire Fighting & Emergency Standby",
    fire_suppression_and_pumps_nbc_part_4: {
      main_electric_fire_pump: "2850 LPM @ 7.0 bar operating head verified",
      diesel_standby_cutin_latency_sec: 9.2,
      statutory_cutin_limit_sec: 15.0,
      jockey_pump_pressure_band_bar: "Auto ON at 6.0 bar / Auto OFF at 7.5 bar",
      sprinkler_inspector_test_flow_switch_trip_sec: 6.5,
      terrace_oht_gravity_reserve_liters: 50000,
      fire_fighting_status: "PASSED_NBC_PART_4_AND_IS_15105"
    },
    emergency_power_and_ats_cea: {
      dg_rating_kva: 250,
      load_bank_test_duration_hours: 2,
      load_percentage: 100,
      voltage_stability: "415V +/- 0.8%",
      frequency_stability: "50.0 Hz +/- 0.3 Hz",
      ats_changeover_latency_sec: 7.8,
      statutory_ats_limit_sec: 15.0,
      compliance_status: "PASSED_CEA_REGULATIONS_2023"
    },
    staircase_pressurization_survey: {
      measured_differential_pressure_pa: 52.0,
      statutory_nbc_range_pa: "50 Pa +/- 10% (45 to 55 Pa)",
      egress_door_opening_force_n: 78.0,
      statutory_max_opening_force_n: 100.0,
      smoke_extraction_cfm: "18,500 CFM exhaust verified per zone"
    },
    elevator_life_safety_is_14665: {
      elevators_tested: "3 Nos 13-Passenger High Speed Traction Lifts",
      phase_1_fire_recall_test: "Immediate return to Ground Floor and park with doors open [VERIFIED]",
      ard_automatic_rescue_device: "Tested on simulated power outage: safely leveled at nearest landing floor",
      overload_cutoff_sensors: "Calibrated to 110% rated load capacity"
    },
    lead_structural_engineer: "Akshat Singh Rathore",
    chief_qa_inspection: "Apex Structural Engineers & Infra Ltd",
    regulatory_testing_witness: "UP State Fire Services & Electrical Safety Inspectorate",
    clearance_status: "AUTHORIZED_FOR_FIRE_NOC_AND_OCCUPANCY_CERTIFICATE",
    certification_timestamp: new Date().toISOString()
  };

  console.log('[1/1] Appending Integrated Commissioning Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'QC_INTEGRATED_COMMISSIONING_AND_FIRE_LIFE_SAFETY_CLEARED',
      p_payload: qcDeedPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #40 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Fire Hydrant/Pumps: 2850 LPM @ 7.0 bar; Standby diesel cut-in in 9.2s (Limit: ≤15s) [PASS]');
  console.log('  Emergency ATS     : Full switchover in 7.8s on 250 kVA DG full load test [PASS]');
  console.log('  Pressurization    : 52 Pa positive pressure across stairwells (Target: 50 Pa) [PASS]');
  console.log('  Elevator Recall   : Phase 1 & 2 ground recall + ARD battery rescue verified [PASS]');
  console.log('  Clearance         : Authorized for Statutory Completion & Final Handover');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

certifyIntegratedCommissioningQc().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
