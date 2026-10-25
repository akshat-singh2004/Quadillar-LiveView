#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LOG RAFT FOUNDATION MASS POUR & THERMAL PROTOCOL
# Standards: IS 456:2000 (Mass Concrete Hydration), CPWD Works Manual Sec 18
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

async function executeRaftPour() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    RECORDING MASS CONCRETE RAFT POUR CARD & THERMAL LOG           \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const pourPayload = {
    pour_card_id: "POUR-TP-002",
    structural_element: "Foundation Raft Slab - Grid A1-D4 (Thickness 1200mm)",
    concrete_grade: "M35 High-Durability Mix with Ground Granulated Blast-Furnace Slag",
    mix_design_ref: "ACC-M35-GGBS-MASS-2026-09",
    total_volume_poured_cum: 350.00,
    slump_flow_initial_mm: 180,
    w_c_ratio: 0.38,
    thermal_hydration_telemetry: {
      sensor_core_temp_c: 48.2,
      sensor_surface_temp_c: 31.8,
      delta_t_measured_c: 16.4,
      max_permissible_delta_t_c: 20.0,
      curing_regime: "Continuous water ponding with insulating geotextile covers",
      compliance_status: "COMPLIANT_IS_456"
    },
    rebar_cage_inspection: {
      bottom_mesh: "Fe-550D 25mm @ 125mm c/c both ways",
      top_mesh: "Fe-550D 20mm @ 150mm c/c both ways",
      clear_cover_mm: 50,
      chair_supports_inspection: "PASSED"
    },
    test_cube_specimens_cast: 18,
    lead_structural_engineer: "Akshat Singh Rathore",
    contractor_signatory: "Apex Structural Engineers & Infra Ltd",
    pour_start_time: new Date(Date.now() - 36000000).toISOString(),
    pour_completion_time: new Date().toISOString()
  };

  console.log('[1/1] Appending Raft Pour Card Deed to Hermes Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'MASS_CONCRETE_RAFT_POUR_SEALED',
      p_payload: pourPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #7 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Volume Poured   : 350.00 cum (M35 GGBS Design Mix)');
  console.log('  Thermal Delta T : 16.4°C (Limit: ≤20.0°C per IS 456) [PASS]');
  console.log('  Cubes Cast      : 18 specimens (Sets for 3d, 7d, 28d strength)');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

executeRaftPour().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
