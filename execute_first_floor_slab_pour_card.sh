#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LOG FIRST FLOOR SLAB & BEAMS POUR CARD (IS 456 / IS 14687)
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

async function logFirstFloorSlabPour() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    RECORDING POUR CARD 04: FIRST FLOOR SLAB & SPANDREL BEAMS      \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const pourPayload = {
    pour_card_id: "POUR-TP-004",
    structural_element: "First Floor Suspended Slab & Spandrel Beams (Grid A1-D4)",
    concrete_grade: "M35 Pumpable Design Mix",
    mix_design_ref: "ACC-M35-SLAB-PUMP-2026-14",
    total_volume_poured_cum: 240.00,
    slump_flow_at_pump_discharge_mm: 170,
    w_c_ratio: 0.38,
    staging_and_falsework_is_14687: {
      system_type: "Cuplock Heavy-Duty Modular Staging with U-Head Jacks",
      prop_spacing_m: 1.0,
      diagonal_bracing: "Cross-braced every 3rd bay in both directions",
      camber_applied_at_midspan_mm: 18,
      calculated_camber_per_is_456_mm: 20,
      inspection_verdict: "PASSED_STRUCTURAL_STABILITY"
    },
    mep_sleeve_conduit_clearance: {
      electrical_junction_boxes: "64 Nos verified per drawing E-102",
      firefighting_sprinkler_sleeves: "16 Nos GI sleeves sleeved and foam-plugged",
      hvac_duct_openings: "4 Nos 600x400mm trimmed with diagonal extra rebar",
      signoff_by_mep_consultant: "PASSED_FOR_CONCRETE_ENCAPSULATION"
    },
    reinforcement_inspection: {
      bottom_mat: "10mm Fe-550D @ 150mm c/c both directions",
      top_negative_bars: "12mm Fe-550D @ 125mm c/c over continuous supports",
      beam_cages: "25mm bottom tension + 20mm top hangers + 8mm 2-legged stirrups @ 125mm c/c",
      clear_cover_slabs_mm: 25,
      clear_cover_beams_mm: 35
    },
    test_cube_specimens_cast: 18,
    lead_structural_engineer: "Akshat Singh Rathore",
    contractor_signatory: "Apex Structural Engineers & Infra Ltd",
    pour_start_time: new Date(Date.now() - 28800000).toISOString(),
    pour_completion_time: new Date().toISOString()
  };

  console.log('[1/1] Appending Pour Card 04 Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'POUR_CARD_FIRST_FLOOR_SLAB_SEALED',
      p_payload: pourPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #13 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Volume Poured   : 240.00 cum (M35 Pumpable Design Mix)');
  console.log('  Falsework Camber: 18 mm upward camber applied (IS 456 Cl 12.3) [PASS]');
  console.log('  MEP Clearance   : HVAC, fire sprinkler, and electrical drop-ins verified');
  console.log('  Cubes Cast      : 18 specimens (Sets for 3d, 7d, 28d testing)');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

logFirstFloorSlabPour().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
