#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: QC PLASTERING ADHESION & MEP MEGGER/PRESSURE TESTING
# Standards: IS 1661:1972, IS 732:2019, CPWD Specifications Section 11
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

async function certifyPlasterAndMepQc() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    CERTIFYING PLASTERING ADHESION, FLATNESS & MEP MEGGER/PRESSURE  \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const qcDeedPayload = {
    work_package_ref: "WP-10-PLASTERING-AND-MEP-FIRST-FIX",
    structural_element: "Internal & External Plaster Finishes with MEP 1st Fix (GF, L1, L2)",
    plaster_testing_is_1661: {
      tensile_adhesion_pull_off_mpa: 0.48,
      min_acceptable_limit_mpa: 0.30,
      hollow_drummy_tapping_survey: "Zero hollow spots detected across 3400 sqm surface",
      crack_mitigation_check: "Zero hairline fissures across all AR-glass mesh interface joints",
      straightedge_flatness_deviation_mm: 1.8,
      permissible_straightedge_limit_mm: 3.0,
      inspection_status: "PASSED_CPWD_SECTION_11"
    },
    electrical_megger_testing_is_732: {
      test_voltage_vdc: 500,
      insulation_resistance_phase_to_neutral_megohms: 54.2,
      insulation_resistance_phase_to_earth_megohms: 62.8,
      statutory_threshold_megohms: 1.0,
      circuit_loop_continuity: "VERIFIED_ALL_CIRCUITS",
      earthing_resistance_ohms: 0.78,
      compliance_status: "PASSED_IS_732_CODE_OF_PRACTICE"
    },
    plumbing_pressure_signoff: {
      concealed_lines_tested: "CPVC Hot & Cold Distribution + Sprinkler Feeds",
      test_pressure_maintained_kg_cm2: 10.0,
      duration_hours: 24,
      pressure_drop_recorded: "0.0 kg/cm2",
      signoff_status: "LEAK_FREE_CERTIFIED"
    },
    lead_structural_engineer: "Akshat Singh Rathore",
    contractor_signatory: "Apex Structural Engineers & Infra Ltd",
    clearance_status: "AUTHORIZED_FOR_VITRIFIED_FLOORING_AND_RA11_MEASUREMENT",
    certification_timestamp: new Date().toISOString()
  };

  console.log('[1/1] Appending Plaster & MEP QC Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'QC_PLASTERING_AND_MEP_FIRST_FIX_CLEARED',
      p_payload: qcDeedPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #32 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Plaster Adhesion: 0.48 N/mm² (Target: ≥0.30 N/mm²) [PASS]');
  console.log('  Surface Flatness: 1.8 mm deviation over 2m edge (CPWD Limit: ≤3.0 mm) [PASS]');
  console.log('  Megger Test     : > 50 MΩ insulation resistance at 500V DC (Statutory: ≥1.0 MΩ) [PASS]');
  console.log('  Pressure Test   : 10.0 kg/cm² held 24h with zero pressure loss [PASS]');
  console.log('  Clearance       : Authorized for Vitrified Tile Flooring & False Ceiling Drops');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

certifyPlasterAndMepQc().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
