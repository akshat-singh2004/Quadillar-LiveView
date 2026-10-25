#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LOG TERRACE BRICK BAT COBA & PARAPET ENVELOPE SEAL
# Standards: CPWD Specifications Sub-head 12.11, IS 1346:1991, IS 456:2000
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

async function logTerraceFinishes() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    RECORDING TERRACE BRICK BAT COBA & RCC PARAPET EXECUTION       \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const executionPayload = {
    work_package: "WP-08-TERRACE-ENVELOPE-WEATHERPROOFING",
    scope_description: "Brick Bat Coba System, Perimeter Parapets & Drainage Khurras",
    standards_applied: [
      "CPWD Specifications 2019 Sub-head 12.11",
      "IS 1346:1991 (Code of practice for waterproofing of roofs)",
      "IS 456:2000 (Plain and Reinforced Concrete)"
    ],
    technical_parameters: {
      treated_terrace_area_sqm: 1200.0,
      average_coba_thickness_mm: 120,
      gradient_achieved: "1:100 toward 8 peripheral drainage outlets",
      bonding_layer: "Polymer-modified cement slurry (1:4 with SBR latex @ 200 ml/bag)",
      grouting_mix: "1:5 cement-sand mortar with integral liquid waterproofing compound",
      surface_layer: "20mm 1:4 cement mortar with neat cement float & 300x300mm false joints",
      vata_junction_fillets: "75mm radius coving along entire 180m parapet periphery",
      khurras_installed: "8 Nos 600x600mm double-treated with GI lead flanges",
      curing_regime: "Continuous water ponding for 14 calendar days"
    },
    rcc_parapet_elements: {
      parapet_height_mm: 1200,
      parapet_thickness_mm: 150,
      concrete_grade: "M25 Reinforced Concrete",
      reinforcement_profile: "10mm Fe-550D @ 150mm c/c vertical & horizontal",
      coping_weather_drip_groove: "Provided on outer face to prevent streak stains"
    },
    lead_structural_engineer: "Akshat Singh Rathore",
    chief_qa_inspection: "Apex Structural Engineers & Infra Ltd",
    verification_status: "PASSED_FIELD_INSPECTION",
    execution_completion_time: new Date().toISOString()
  };

  console.log('[1/1] Appending Terrace Envelope Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'EXECUTION_TERRACE_WEATHERPROOFING_AND_PARAPET_SEALED',
      p_payload: executionPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #25 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Treated Area    : 1,200.00 sq.m (Brick Bat Coba, avg 120mm depth)');
  console.log('  Drainage Slope  : 1:100 uniform fall toward 8 rainwater khurras [PASS]');
  console.log('  Perimeter Wall  : 180 running meters of 1200mm M25 RCC parapet with drip coping');
  console.log('  Curing Protocol : 14-day ponding regime initiated');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

logTerraceFinishes().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
