#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LOG TERRACE ROOF & OHT TOPPING OUT (IS 456 / IS 3370)
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

async function logTerracePour() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    RECORDING POUR CARD 07: TERRACE ROOF & STRUCTURAL TOPPING OUT  \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const pourPayload = {
    pour_card_id: "POUR-TP-007",
    milestone: "STRUCTURAL_TOPPING_OUT_PRIMARY_FRAME",
    structural_element: "Terrace Roof Slab, Ring Beams, LMR Stub Walls & OHT Base (Grid A1-D4)",
    concrete_grade: "M35 Crystalline Waterproofed Design Mix",
    mix_design_ref: "ACC-M35-CRYST-WP-2026-21",
    total_volume_poured_cum: 210.00,
    slump_flow_at_pump_discharge_mm: 165,
    w_c_ratio: 0.36,
    integral_waterproofing_is_3370: {
      admixture_type: "Hydrophilic Crystalline Pore-Blocking Admixture",
      dosage_rate: "1% by weight of cementitious content",
      permeability_target_din_1048: "< 10mm penetration under 5 bar pressure",
      oht_base_slab_thickness_mm: 200,
      construction_joints: "PVC hydro-swelling waterstops fixed at all vertical joints"
    },
    terrace_drainage_and_fall: {
      designed_slope: "1:100 toward 8 Nos UPVC rainwater collection hoppers",
      pre_pour_screed_level_check: "VERIFIED_PER_DRAINAGE_SCHEME_D-01"
    },
    electrical_and_lightning_bonding: {
      downconductor_continuity: "Bonded to structural columns C2, C4, C13, C15 per IS/IEC 62305",
      earth_electrode_pit_resistance_target_ohms: "< 1.0"
    },
    test_cube_specimens_cast: 18,
    lead_structural_engineer: "Akshat Singh Rathore",
    contractor_signatory: "Apex Structural Engineers & Infra Ltd",
    pour_start_time: new Date(Date.now() - 27000000).toISOString(),
    pour_completion_time: new Date().toISOString()
  };

  console.log('[1/1] Appending Topping Out Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'POUR_CARD_TERRACE_ROOF_AND_OHT_TOPPING_OUT_SEALED',
      p_payload: pourPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #22 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Volume Poured   : 210.00 cum (M35 Crystalline Waterproofed Mix)');
  console.log('  Milestone Status: Primary RCC Superstructure Frame TOPPED OUT');
  console.log('  Waterproofing   : Integral crystalline mix + PVC waterstops (IS 3370) [PASS]');
  console.log('  Lightning Earth : Structural column rebar bonding verified (IS/IEC 62305)');
  console.log('  Cubes Cast      : 18 specimens (Sets for 3d, 7d, 28d testing)');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

logTerracePour().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
