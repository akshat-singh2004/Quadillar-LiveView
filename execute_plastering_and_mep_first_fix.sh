#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LOG MEP FIRST-FIX & PLASTERING WITH AR-MESH INTERFACES
# Standards: IS 1661:1972, IS 2402:1963, CPWD Specifications Sub-head 11.1
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

async function logPlasteringAndMep() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    RECORDING MEP FIRST-FIX & EXTERNAL/INTERNAL PLASTERING DEED    \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const executionPayload = {
    work_package: "WP-10-PLASTERING-AND-MEP-FIRST-FIX",
    scope_description: "External 2-Coat Waterproof Plaster, Internal 12mm Plaster & MEP 1st Fix",
    standards_applied: [
      "IS 1661:1972 (Code of Practice for Application of Cement Plaster Finishes)",
      "IS 2402:1963 (Code of Practice for External Rendered Finishes)",
      "CPWD Specifications 2019 Sub-head 11.1 & 11.13",
      "NBC 2016 Part 8 (Building Services)"
    ],
    technical_parameters: {
      total_plastered_surface_sqm: 3400.0,
      breakdown_surface_area: {
        external_facade_sqm: 1450.0,
        internal_walls_and_shafts_sqm: 1950.0
      },
      joint_crack_mitigation: {
        mesh_type: "Alkali-Resistant (AR) Glass Fiber Mesh (145 g/m2)",
        placement_width_mm: 200,
        locations: "All RCC column-to-masonry and beam-to-masonry junctions",
        anchoring: "GI u-staples @ 250mm c/c embedded in polymer bonding coat"
      },
      external_plaster_specifications: {
        total_thickness_mm: 20,
        backing_coat: "14mm thick 1:4 cement-coarse sand with integral crystalline waterproofing",
        finishing_coat: "6mm thick 1:3 cement-fine sand sponge float finish",
        grooves_and_drips: "15x10mm architectural V-grooves at floor junction lines"
      },
      internal_plaster_specifications: {
        thickness_mm: 12,
        mix_ratio: "1:4 cement-screened sand mortar",
        surface_quality: "True to plumb within +/- 2mm over 2m straight edge; right angles confirmed at all internal corners"
      },
      mep_first_fix_verification: {
        electrical_conduits: "Heavy-duty 25mm FRLS UPVC embedded with GI modular junction boxes",
        hydrostatic_test_cpvc_piping: "Held at 10.0 kg/cm2 for 24 hours with zero pressure drop",
        conduit_chase_packing: "Non-shrink fiber-reinforced polymer repair mortar"
      },
      curing_regime: "Continuous water spray curing maintained for 10 calendar days"
    },
    lead_structural_engineer: "Akshat Singh Rathore",
    chief_qa_inspection: "Apex Structural Engineers & Infra Ltd",
    verification_status: "PASSED_FIELD_INSPECTION",
    execution_completion_time: new Date().toISOString()
  };

  console.log('[1/1] Appending Plastering & MEP First-Fix Deed to Hermes Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'EXECUTION_PLASTERING_AND_MEP_FIRST_FIX_SEALED',
      p_payload: executionPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #31 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Total Plaster   : 3,400.00 sq.m (1,450 sq.m External 20mm + 1,950 sq.m Internal 12mm)');
  console.log('  Crack Control   : 145 g/m² AR-glass fiber mesh stapled at all RCC-masonry joints [PASS]');
  console.log('  MEP Hydrostatic : CPVC loops held 10.0 kg/cm² pressure for 24 hours [PASS]');
  console.log('  Curing Protocol : 10-day wet spray curing underway');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

logPlasteringAndMep().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
