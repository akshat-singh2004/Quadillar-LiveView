#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: SEED FORM 23 EMB BASELINE (TECHPARK SUBSTRUCTURE)
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

const embLineItems = [
  {
    project_id: projectId,
    mb_item_code: "TECHPARK-SUB-001",
    sor_code: "CPWD-DSR-2.8.1",
    boq_item_ref: "BOQ-SUB-01",
    description: "Earth work in excavation by mechanical means in foundation trenches (depth up to 6.0m) including dressing of sides and ramming of bottoms.",
    trade_package: "Earthworks & Excavation",
    contractor_name: "Apex Structural Engineers & Infra Ltd",
    contractor_entity: "Apex Structural Engineers & Infra Ltd",
    structural_element: "FOUNDATION_PIT",
    formula_expression: "L * B * D",
    unit: "cum",
    total_quantity: 4500.00,
    unit_rate: 285.50,
    status: "BILLED",
    recorded_by: "Akshat Singh Rathore"
  },
  {
    project_id: projectId,
    mb_item_code: "TECHPARK-SUB-002",
    sor_code: "CPWD-DSR-4.1.8",
    boq_item_ref: "BOQ-SUB-02",
    description: "Providing and laying in position plain cement concrete (PCC) 1:4:8 under raft and pile caps including curing.",
    trade_package: "Plain Cement Concrete",
    contractor_name: "Apex Structural Engineers & Infra Ltd",
    contractor_entity: "Apex Structural Engineers & Infra Ltd",
    structural_element: "RAFT_SUBBASE",
    formula_expression: "L * B * D",
    unit: "cum",
    total_quantity: 650.00,
    unit_rate: 5450.00,
    status: "BILLED",
    recorded_by: "Akshat Singh Rathore"
  },
  {
    project_id: projectId,
    mb_item_code: "TECHPARK-SUB-003",
    sor_code: "CPWD-DSR-20.1.2",
    boq_item_ref: "BOQ-SUB-03",
    description: "Bored cast-in-situ RCC piles 600mm dia in M35 grade design mix concrete through soil and soft rock up to 18m depth.",
    trade_package: "Deep Piling Foundation",
    contractor_name: "Apex Structural Engineers & Infra Ltd",
    contractor_entity: "Apex Structural Engineers & Infra Ltd",
    structural_element: "FOUNDATION_PILES",
    formula_expression: "NOS * DEPTH",
    unit: "metre",
    total_quantity: 2160.00,
    unit_rate: 4200.00,
    status: "BILLED",
    recorded_by: "Akshat Singh Rathore"
  },
  {
    project_id: projectId,
    mb_item_code: "TECHPARK-SUB-004",
    sor_code: "CPWD-DSR-5.22.6",
    boq_item_ref: "BOQ-SUB-04",
    description: "Thermo-mechanically treated (TMT) steel reinforcement bars Fe-550D for foundation piling and raft.",
    trade_package: "Reinforcement Steel",
    contractor_name: "Apex Structural Engineers & Infra Ltd",
    contractor_entity: "Apex Structural Engineers & Infra Ltd",
    structural_element: "SUBSTRUCTURE_STEEL",
    formula_expression: "WEIGHT_SCHEDULE",
    unit: "kg",
    total_quantity: 185000.00,
    unit_rate: 74.50,
    status: "BILLED",
    recorded_by: "Akshat Singh Rathore"
  }
];

async function seedBaseline() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    ESTABLISHING EMB FORM 23 BASELINE: LUCKNOW-TECHPARK-PH1         \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  // 1. Insert EMB Line Items
  console.log('[1/2] Inserting Form 23 Items into electronic_measurement_book...');
  const embRes = await fetch(`${supabaseUrl}/rest/v1/electronic_measurement_book`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify(embLineItems)
  });

  if (!embRes.ok) {
    throw new Error(`Failed to insert EMB items: ${await embRes.text()}`);
  }
  const inserted = await embRes.json();
  console.log(`\x1b[32m✓ Seeded ${inserted.length} major substructure line items.\x1b[0m`);

  // 2. Chaining Node #3 into Hermes Audit Ledger
  console.log('\n[2/2] Appending Baseline Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'EMB_BASELINE_SPECIFICATIONS_SEALED',
      p_payload: {
        total_items: inserted.length,
        sor_reference: 'CPWD DSR 2023 Vol 1 & 2',
        substructure_wbs_scope: ['Excavation', 'PCC Blinding', 'Bored Piles 600mm', 'Fe-550D Reinforcement'],
        total_baseline_value: 27681750.00,
        signatory_engineer: 'Akshat Singh Rathore',
        compliance: 'CPWD Works Manual Clause 17 & IS 2911 (Part 1/Sec 2)'
      }
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }
  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #3 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('\x1b[32m====================================================================\x1b[0m');
}

seedBaseline().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
