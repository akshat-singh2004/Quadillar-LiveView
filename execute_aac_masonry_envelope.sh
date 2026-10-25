#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LOG AAC BLOCK MASONRY & SEISMIC BANDS EXECUTION
# Standards: IS 2185 (Pt 3), IS 1905, IS 4326 (Seismic Zone III), CPWD Sec 6
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

async function logMasonryEnvelope() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    RECORDING AAC BLOCK MASONRY & SEISMIC LINTEL/SILL BANDS         \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const executionPayload = {
    work_package: "WP-09-AAC-MASONRY-AND-SEISMIC-BANDS",
    scope_description: "Exterior Facade Infill & Internal Dividers across GF, L1, L2",
    standards_applied: [
      "IS 2185 (Part 3): 1984 - Autoclaved Cellular Concrete Blocks",
      "IS 1905: 1987 - Code of Practice for Structural Use of Masonry",
      "IS 4326: 2013 - Earthquake Resistant Design & Construction",
      "CPWD Specifications 2019 - Sub-head 6.0 (Masonry Works)"
    ],
    technical_parameters: {
      total_masonry_area_sqm: 1850.0,
      breakdown_by_level: {
        ground_floor_sqm: 620.0,
        first_floor_sqm: 615.0,
        second_floor_sqm: 615.0
      },
      block_type: "Grade 1 Aerated Autoclaved Concrete (Siporex / Magicrete)",
      block_dimensions: {
        external_walls_mm: "600 x 200 x 200 (Density: 580 kg/m3)",
        internal_partitions_mm: "600 x 200 x 100 / 150 (Density: 620 kg/m3)"
      },
      jointing_medium: "Polymer-modified dry-mix adhesive mortar (3mm joint thickness)",
      seismic_provisions_is_4326: {
        continuous_sill_band: "75mm thick M20 concrete band with 2 Nos 8mm Fe-550D rebar below window sills",
        rcc_lintels: "M20 concrete lintels (200mm depth) over door/window openings with 200mm minimum bearing",
        column_interface_anchorage: "GI butterfly wall-ties mechanically fastened every 600mm height"
      },
      expansion_isolation_joint: "15-20mm gap below soffits sealed with fire-rated low-expansion PU foam",
      plumb_and_alignment_survey: "Within +/- 3mm tolerance across all vertical runs"
    },
    lead_structural_engineer: "Akshat Singh Rathore",
    chief_qa_inspection: "Apex Structural Engineers & Infra Ltd",
    verification_status: "PASSED_FIELD_INSPECTION",
    execution_completion_time: new Date().toISOString()
  };

  console.log('[1/1] Appending AAC Masonry Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'EXECUTION_AAC_MASONRY_AND_SEISMIC_BANDS_SEALED',
      p_payload: executionPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #28 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Masonry Area    : 1,850.00 sq.m across Ground, First, and Second floors');
  console.log('  Adhesive Joint  : 3mm polymer thin-bed mortar verified (IS 2185 Part 3) [PASS]');
  console.log('  Seismic Bands   : 75mm M20 continuous sill bands + GI column ties (IS 4326) [PASS]');
  console.log('  Soffit Clearance: 15-20mm PU foam isolation joint verified to avoid dead loads');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

logMasonryEnvelope().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
