#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LOG SECOND FLOOR SLAB & BEAMS POUR CARD (IS 456 / IS 14687)
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

async function logSecondFloorSlabPour() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    RECORDING POUR CARD 06: SECOND FLOOR SLAB & SPANDREL BEAMS     \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const pourPayload = {
    pour_card_id: "POUR-TP-006",
    structural_element: "Second Floor Suspended Slab & Perimeter Beams (Grid A1-D4)",
    concrete_grade: "M35 Pumpable Design Mix",
    mix_design_ref: "ACC-M35-SLAB-PUMP-2026-19",
    total_volume_poured_cum: 240.00,
    slump_flow_at_pump_discharge_mm: 175,
    w_c_ratio: 0.38,
    staging_and_multitier_propping: {
      staging_system: "Cuplock Heavy-Duty System with Swivel Base Jacks",
      level_1_repropping_status: "Verified intact at 6.0m critical bay midspans",
      midspan_pre_camber_applied_mm: 18,
      calculated_camber_per_is_456_mm: 20,
      inspection_verdict: "PASSED_STAGING_STABILITY"
    },
    mep_and_bms_encapsulation: {
      bms_fiber_conduits: "16 Nos rigid heavy-duty conduits locked",
      fire_damper_wall_sleeves: "8 Nos 450x450mm openings reinforced with diagonal trims",
      sanitary_shaft_cutouts: "6 Nos edge-shuttered and verified against drawing M-201",
      mep_clearance_status: "PASSED_FOR_CASTING"
    },
    reinforcement_detailing: {
      bottom_mat: "10mm Fe-550D @ 150mm c/c both ways",
      top_negative_rebar: "12mm Fe-550D @ 125mm c/c over continuous supports",
      spandrel_beams: "25mm bottom tension + 20mm top hangers + 8mm stirrups @ 125mm c/c",
      spacers_and_cover: "25mm factory-moulded mortar cover blocks verified @ 1m spacing"
    },
    test_cube_specimens_cast: 18,
    lead_structural_engineer: "Akshat Singh Rathore",
    contractor_signatory: "Apex Structural Engineers & Infra Ltd",
    pour_start_time: new Date(Date.now() - 28800000).toISOString(),
    pour_completion_time: new Date().toISOString()
  };

  console.log('[1/1] Appending Pour Card 06 Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'POUR_CARD_SECOND_FLOOR_SLAB_SEALED',
      p_payload: pourPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #19 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Volume Poured   : 240.00 cum (M35 Pumpable Design Mix)');
  console.log('  Multi-Tier Check: Level 1 re-propping verified per IS 14687 [PASS]');
  console.log('  BMS & MEP       : Embedded smart conduit clearance complete');
  console.log('  Cubes Cast      : 18 specimens (Sets for 3d, 7d, 28d testing)');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

logSecondFloorSlabPour().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
