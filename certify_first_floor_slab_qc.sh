#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: QC SLAB STRENGTH, DE-SHUTTERING & DEFLECTION SIGN-OFF
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

async function certifySlabQc() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    CERTIFYING 28-DAY STRENGTH, DE-SHUTTERING & DEFLECTION SURVEY   \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const qcDeedPayload = {
    pour_card_ref: "POUR-TP-004",
    structural_element: "First Floor Suspended Slab & Spandrel Beams (Grid A1-D4)",
    cube_strength_series_is_516: {
      concrete_grade: "M35 Pumpable Mix",
      f_ck_characteristic_mpa: 35.0,
      target_mean_strength_mpa: 43.25,
      specimens_tested_28d: 6,
      individual_readings_mpa: [38.7, 39.5, 40.2, 38.9, 39.8, 39.3],
      average_28d_strength_mpa: 39.4,
      percentage_of_fck: 112.57,
      is_456_cl_15_acceptance: "PASSED_STRENGTH_CRITERIA"
    },
    formwork_stripping_is_456_table_11: {
      slab_soffit_props_retention_days: 14,
      beam_soffit_props_retention_days: 21,
      concrete_surface_inspection: "Sound finish, no thermal cracks, no honeycombing, cover uniform",
      re_propping_adherence: "COMPLIANT_WITH_IS_456"
    },
    optical_deflection_survey: {
      survey_instrument: "Leica TS16 Total Station",
      critical_bay_span_m: 6.0,
      permissible_limit_mm: 17.14, // Span / 350
      measured_residual_deflection_mm: 4.60,
      survey_verdict: "PASSED_WELL_BELOW_SERVICEABILITY_LIMIT"
    },
    lead_structural_engineer: "Akshat Singh Rathore",
    contractor_signatory: "Apex Structural Engineers & Infra Ltd",
    clearance_status: "AUTHORIZED_FOR_FIRST_FLOOR_BRICKWORK_AND_L2_STAGING",
    signoff_timestamp: new Date().toISOString()
  };

  console.log('[1/1] Appending QC Slab Clearance Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'QC_FIRST_FLOOR_SLAB_STRENGTH_AND_DEFLECTION_CLEARED',
      p_payload: qcDeedPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #14 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  28-Day Strength : 39.4 N/mm² (Target: ≥35.0 N/mm²) [PASS]');
  console.log('  Laser Deflection: 4.60 mm (Permissible limit: ≤17.14 mm per IS 456) [PASS]');
  console.log('  Clearance       : Authorized for Brickwork & Second Floor Staging');
  console.log('\x1b[34m====================================================================\x1b[0m');
}

certifySlabQc().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
