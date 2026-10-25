#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: TRANSITION TO EXECUTION & LOG POUR CARD 01
# Standards: IS 2911 (Part 1/Sec 2: Bored Cast In-Situ Piles), IS 456:2000
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

async function transitionStage() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    ADVANCING PROJECT STAGE & LOGGING TEST PILE POUR CARD          \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  // 1. Advance Project Active Stage to EXECUTION
  console.log('[1/2] Updating Project Active Stage to EXECUTION...');
  const projRes = await fetch(`${supabaseUrl}/rest/v1/projects?project_id=eq.${projectId}`, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      active_stage: 'EXECUTION',
      updated_at: new Date().toISOString()
    })
  });

  if (!projRes.ok) {
    throw new Error(`Failed to update project stage: ${await projRes.text()}`);
  }
  console.log('\x1b[32m✓ Active Stage updated to EXECUTION.\x1b[0m');

  // 2. Append Pour Card Deed to Hermes Audit Ledger (Node #4)
  console.log('\n[2/2] Chaining Pour Card 01 (Test Pile P-01) into Hermes Ledger...');
  const deedPayload = {
    pour_card_id: "POUR-TP-001",
    structural_element: "Initial Test Pile P-01 (Grid A1-Corner)",
    concrete_grade: "M35 Design Mix",
    mix_design_ref: "ACC-M35-DESIGN-2026-08",
    theoretical_volume_cum: 5.09,
    depth_m: 18.00,
    diameter_mm: 600,
    reinforcement_cage: "6 Nos 20mm dia main Fe-550D + 8mm helical ties @ 150mm c/c",
    slump_flow_mm: 175,
    bentonite_slurry_density_g_ml: 1.08,
    compliance_codes: ["IS 2911 (Part 1/Sec 2)", "IS 456:2000", "CPWD Works Manual Cl 18"],
    qc_inspector: "Akshat Singh Rathore",
    test_cubes_cast: 6,
    pour_timestamp: new Date().toISOString()
  };

  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'POUR_CARD_INITIALIZED_AND_SEALED',
      p_payload: deedPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to chain deed: ${await deedRes.text()}`);
  }
  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #4 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('\x1b[32m====================================================================\x1b[0m');
}

transitionStage().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
