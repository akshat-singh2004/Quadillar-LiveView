#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: QC L2 SLAB 28D STRENGTH, DE-SHUTTERING & DEFLECTION SURVEY
# Standards: IS 456:2000 (Table 11 / Cl 23.2), IS 516:1959, CPWD Sec 18
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

async function certifyL2SlabQc() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    CERTIFYING L2 SLAB 28-DAY STRENGTH & DEFLECTION: TECHPARK       \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const qcDeedPayload = {
    pour_card_ref: "POUR-TP-006",
    structural_element: "Second Floor Suspended Slab & Perimeter Spandrels (Grid A1-D4)",
    cube_strength_series_is_516: {
      concrete_grade: "M35 Pumpable Mix",
      f_ck_characteristic_mpa: 35.0,
      target_mean_strength_mpa: 43.25,
      specimens_tested_28d: 6,
      individual_readings_mpa: [39.1, 40.4, 40.0, 39.5, 40.6, 39.5],
      average_28d_strength_mpa: 39.85,
      percentage_of_fck: 113.86,
      is_456_cl_15_acceptance: "PASSED_STRENGTH_CRITERIA"
    },
    formwork_stripping_is_456_table_11: {
      slab_soffit_props_retention_days: 14,
      beam_soffit_props_retention_days: 21,
      surface_defect_evaluation: "Monolithic, zero thermal fissures, no honeycombing, cover confirmed",
      re_propping_protocol: "COMPLIANT_WITH_IS_456"
    },
    optical_deflection_survey: {
      survey_instrument: "Leica TS16 Total Station",
      critical_bay_span_m: 6.0,
      permissible_limit_mm: 17.14,
      measured_residual_deflection_mm: 4.40,
      survey_verdict: "PASSED_SERVICEABILITY_CRITERIA"
    },
    lead_structural_engineer: "Akshat Singh Rathore",
    contractor_signatory: "Apex Structural Engineers & Infra Ltd",
    clearance_status: "AUTHORIZED_FOR_SECOND_FLOOR_BRICKWORK_AND_ROOF_STAGING",
    signoff_timestamp: new Date().toISOString()
  };

  console.log('[1/1] Appending L2 Slab QC Clearance Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'QC_SECOND_FLOOR_SLAB_STRENGTH_AND_DEFLECTION_CLEARED',
      p_payload: qcDeedPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #20 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  28-Day Strength : 39.85 N/mm² (Target: ≥35.0 N/mm²) [113.8% f_ck achieved]');
  console.log('  Laser Deflection: 4.40 mm (Permissible limit: ≤17.14 mm per IS 456) [PASS]');
  console.log('  Clearance       : Authorized for AAC Blockwork & Terrace Slab Staging');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

certifyL2SlabQc().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
