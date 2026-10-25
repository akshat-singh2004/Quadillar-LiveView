#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LOG MEP SECOND-FIX, ACOUSTIC TILES & SANITARY FIXTURES
# Standards: IS 732:2019, IS 2065, IS 15489, CPWD Electrical Works Manual 2023
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

async function logMepSecondFix() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    RECORDING MEP SECOND-FIX, ACOUSTIC CEILINGS & SANITARY DEED     \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const executionPayload = {
    work_package: "WP-12-MEP-SECOND-FIX-AND-ARCHITECTURAL-FINISHES",
    scope_description: "Acoustic Ceiling Tiles, Electrical Wiring/Luminaires, Sanitaryware & Emulsion Painting",
    standards_applied: [
      "IS 732:2019 (Code of Practice for Electrical Wiring Installations)",
      "IS 2065:1983 (Code of Practice for Water Supply in Buildings)",
      "IS 15489:2004 (Specification for Plastic Emulsion Paint)",
      "CPWD Specifications 2019 Sub-head 13.0 (Finishing)",
      "CPWD General Specifications for Electrical Works Part I (2023)"
    ],
    technical_parameters: {
      acoustic_ceiling_tiles: {
        material: "Micro-perforated bio-soluble mineral fiber tiles",
        dimensions_mm: "600 x 600 x 15 (Tegular Edge)",
        installed_area_sqm: 2100.0,
        acoustic_properties: "NRC 0.70, CAC 35 dB, RH 95% humidity resistance"
      },
      electrical_second_fix: {
        wiring_profile: "FRLS copper flexible multi-strand (1.5 sq.mm light / 2.5 sq.mm power / 4.0 sq.mm AC)",
        distribution_boards_dressed: "6 Nos 12-way vertical TPN DBs with 30mA RCCB earth protection",
        luminaires_installed: "420 Nos 36W LED 600x600mm recessed troffers (UGR < 19, 120 lm/W)",
        modular_accessories: "Polycarbonate fire-retardant plates with silver alloy contact switches"
      },
      sanitary_fixtures_and_c_p_fittings: {
        ewc_units: "24 Nos vitreous china wall-hung closets with concealed dual-flush tanks",
        urinals: "18 Nos sensor-operated vitreous china urinals",
        cp_fittings: "Quarter-turn ceramic disc bib cocks and concealed stop valves",
        trap_seal_compliance: "Minimum 50mm water seal depth verified across all gully and P-traps"
      },
      internal_wall_painting: {
        wall_preparation: "2 coats acrylic wall putty followed by alkali-resistant primer",
        top_coat: "2 coats low-VOC washable premium acrylic emulsion (coverage 1950 sqm)"
      }
    },
    lead_structural_engineer: "Akshat Singh Rathore",
    chief_qa_inspection: "Apex Structural Engineers & Infra Ltd",
    verification_status: "PASSED_FIELD_INSPECTION",
    execution_completion_time: new Date().toISOString()
  };

  console.log('[1/1] Appending MEP Second-Fix Deed to Hermes Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'EXECUTION_MEP_SECOND_FIX_AND_ACOUSTIC_CEILINGS_SEALED',
      p_payload: executionPayload
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #37 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Acoustic Ceiling: 2,100 sq.m tegular mineral tiles placed (NRC 0.70 / RH 95)');
  console.log('  Electrical 2nd-Fix: 420 LED troffers + 6 dressed TPN DBs with 30mA RCCB protection');
  console.log('  Sanitary Fitment: 24 EWCs + 18 sensor urinals with ≥50mm trap seals verified');
  console.log('  Painting Envelope: 1,950 sq.m 2-coat low-VOC washable emulsion completed');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

logMepSecondFix().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
