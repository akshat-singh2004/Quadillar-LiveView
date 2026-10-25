#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LOG VITRIFIED FLOORING, WET AREA PROOFING & CEILING GRID
# Standards: IS 15622:2017, IS 1443:1972, IS 15477, CPWD Specifications Sec 11
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

async function logFlooringAndCeiling() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    RECORDING FLOORING, WET AREA PROOFING & CEILING GRID DEED      \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const executionPayload = {
    work_package: "WP-11-FLOORING-AND-CEILING-FRAMEWORKS",
    scope_description: "Double-Charged Vitrified Tiling, Wet Area Waterproofing/Dado & False Ceiling Sub-Grid",
    standards_applied: [
      "IS 15622:2017 (Pressed Ceramic Tiles - Group B1a)",
      "IS 1443:1972 (Laying and Finishing of Cement Concrete Flooring Tiles)",
      "IS 15477:2019 (Adhesives for Tile and Stone Installation)",
      "CPWD Specifications 2019 Sub-heads 11.0 & 12.0"
    ],
    technical_parameters: {
      total_flooring_area_sqm: 2200.0,
      breakdown_by_zone: {
        office_floor_plates_sqm: 1880.0,
        lift_lobbies_and_corridors_sqm: 220.0,
        toilet_clusters_and_pantries_sqm: 100.0
      },
      vitrified_tiling_specifications: {
        tile_dimensions_mm: "800 x 800 x 10",
        type: "Double-charged vitrified tile (Group B1a, water absorption < 0.08%)",
        mortar_bed: "40mm thick 1:4 cement-sand mortar with polymer adhesive slurry coat",
        joint_spacing_mm: 2.0,
        grout: "Stain-proof two-part epoxy grout",
        skirting: "100mm high vitrified tile skirting flush with finished plaster"
      },
      wet_area_toilet_waterproofing: {
        membrane_system: "2 coats acrylic polymer-modified elastomeric waterproof coating with fiber mesh reinforcement",
        coving_fillets: "50mm radius cement-polymer fillets at all sunken slab wall-floor junctions",
        hydrostatic_ponding_check: "24-hour standing water test completed with zero underside seepage",
        dado_tiling: "Full-height 300x600mm glazed ceramic tiles up to 2400mm false ceiling height"
      },
      false_ceiling_grid_framing: {
        grid_system: "Galvanized steel T-grid (15mm profile) suspended from soffit",
        suspension_hangers: "6mm GI adjustable rod hangers anchored with M6 expansion wedge anchors @ 1200mm c/c",
        level_tolerances_mm: 1.5,
        clearance_for_diffusers_and_luminaires: "Verified with MEP layout drawings M-301 & E-205"
      }
    },
    lead_structural_engineer: "Akshat Singh Rathore",
    chief_qa_inspection: "Apex Structural Engineers & Infra Ltd",
    verification_status: "PASSED_FIELD_INSPECTION",
    execution_completion_time: new Date().toISOString()
  };

  console.log('[1/1] Appending Flooring & Ceiling Grid Deed to Hermes Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'EXECUTION_FLOORING_AND_CEILING_GRID_SEALED',
      p_payload: executionPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #34 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Tiled Area      : 2,200.00 sq.m (800x800mm Double-Charged Vitrified, 2mm epoxy joints)');
  console.log('  Wet Area Seal   : Sunken slab elastomeric waterproofing + 24h ponding sign-off [PASS]');
  console.log('  Ceiling Grid    : Laser-aligned 15mm silhouette T-grid suspended on 6mm GI rods');
  console.log('  Skirting Details: 100mm flush vitrified perimeter skirting verified');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

logFlooringAndCeiling().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
