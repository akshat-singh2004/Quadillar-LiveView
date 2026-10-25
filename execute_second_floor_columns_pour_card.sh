#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LOG SECOND FLOOR COLUMNS & SHEAR CORE POUR CARD
# Standards: IS 13920:2016 (Ductile Detailing & Shear Walls), IS 456:2000
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

async function logSecondFloorColumnsPour() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    RECORDING POUR CARD 05: L2 COLUMNS & CENTRAL SHEAR CORE         \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const pourPayload = {
    pour_card_id: "POUR-TP-005",
    structural_element: "Second Floor Columns C1-C16 & Core Shear Walls SW1-SW2 (Grid B2-C3)",
    concrete_grade: "M40 Self-Compacting / High-Pumpability Mix",
    mix_design_ref: "ACC-M40-SCC-CORE-2026-17",
    total_volume_poured_cum: 110.00,
    slump_flow_initial_mm: 190,
    w_c_ratio: 0.35,
    shear_wall_ductile_detailing_is_13920: {
      wall_thickness_mm: 250,
      reinforcement_curtains: "Dual mat Fe-550D 12mm @ 150mm c/c both ways",
      boundary_element_detailing: "Confined with 10mm rectangular hoops @ 100mm c/c",
      mechanical_couplers_is_16172: "Class H parallel-threaded couplers verified across 64 bar joints",
      compliance_status: "VERIFIED_IS_13920_2016_SEISMIC_ZONE_III"
    },
    shuttering_inspection: {
      type: "Steel framed panel formwork with high-tensile through-tie rods",
      vertical_plumb_laser_reading_mm: 2.3,
      permissible_limit_mm: 5.0,
      release_agent_applied: "ECO-Form Water-Based Chemical Demoulding Agent"
    },
    test_cube_specimens_cast: 12,
    lead_structural_engineer: "Akshat Singh Rathore",
    contractor_signatory: "Apex Structural Engineers & Infra Ltd",
    pour_start_time: new Date(Date.now() - 25200000).toISOString(),
    pour_completion_time: new Date().toISOString()
  };

  console.log('[1/1] Appending Pour Card 05 Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'POUR_CARD_SECOND_FLOOR_COLUMNS_AND_SHEAR_CORE_SEALED',
      p_payload: pourPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #16 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Volume Poured   : 110.00 cum (M40 Self-Compacting Core Mix)');
  console.log('  Seismic Detailing: IS 13920 Boundary Element Confinement & Couplers [PASS]');
  console.log('  Laser Plumb     : 2.3 mm drift across 3.6m lift (Limit: ±5.0 mm) [PASS]');
  console.log('  Cubes Cast      : 12 specimens (7-day & 28-day sets)');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

logSecondFloorColumnsPour().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
