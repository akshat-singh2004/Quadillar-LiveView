#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LOG PLINTH BEAMS & GF COLUMNS POUR CARD (IS 13920 / IS 456)
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

async function logPlinthColumnsPour() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    RECORDING POUR CARD 03: PLINTH TIE BEAMS & GF COLUMNS           \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const pourPayload = {
    pour_card_id: "POUR-TP-003",
    structural_element: "Plinth Tie Beams & Ground Floor Columns C1-C16 (Grid A1-D4)",
    concrete_grade: "M40 Design Mix (Pumpable)",
    mix_design_ref: "ACC-M40-PUMP-2026-11",
    total_volume_poured_cum: 120.00,
    slump_flow_initial_mm: 165,
    w_c_ratio: 0.36,
    ductile_detailing_is_13920: {
      column_main_longitudinal_bars: "12 Nos 25mm dia Fe-550D",
      confinement_zone_lo_length_mm: 600,
      lateral_ties_spacing_confinement_mm: 100,
      lateral_ties_spacing_mid_height_mm: 150,
      seismic_cross_ties_hook_angle: "135 degrees with 10d extension",
      compliance_status: "VERIFIED_IS_13920_2016"
    },
    formwork_inspection_is_14687: {
      type: "12mm BWP Film-Faced Plywood with Cuplock Staging",
      verticality_plumb_check_tolerance_mm: 3,
      permissible_tolerance_mm: 5,
      cover_blocks: "40mm factory-cured concrete spacers",
      inspection_verdict: "PASSED"
    },
    test_cube_specimens_cast: 12,
    lead_structural_engineer: "Akshat Singh Rathore",
    contractor_signatory: "Apex Structural Engineers & Infra Ltd",
    pour_start_time: new Date(Date.now() - 21600000).toISOString(),
    pour_completion_time: new Date().toISOString()
  };

  console.log('[1/1] Appending Pour Card 03 Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'POUR_CARD_PLINTH_AND_COLUMNS_SEALED',
      p_payload: pourPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #10 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Volume Poured   : 120.00 cum (M40 High-Strength Design Mix)');
  console.log('  Ductile Seismic : 135° hooked confinement links verified (IS 13920)');
  console.log('  Cubes Cast      : 12 specimens (7-day & 28-day testing batches)');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

logPlinthColumnsPour().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
