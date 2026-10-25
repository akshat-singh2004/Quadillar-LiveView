#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: TECHPARK MOBILIZATION ADVANCE CERTIFICATION (CPWD 10B)
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

async function execute() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    RECORDING MOBILIZATION ADVANCE: LUCKNOW-TECHPARK-PH1           \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  // 1. Issue RA Bill 01 (10% Mobilization Advance = ₹45,00,000.00)
  console.log('[1/2] Generating RA-01 Advance Certification in Midas Billing...');
  const billRes = await fetch(`${supabaseUrl}/rest/v1/running_account_bills`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      project_id: projectId,
      ra_bill_number: 'RA-01-MOB-ADV',
      bill_sequence_no: 1,
      gross_work_done: 4500000.00,
      retention_amount: 0.00,
      advance_recovery: 0.00,
      net_payable_certified: 4500000.00,
      status: 'CERTIFIED',
      certified_at: new Date().toISOString()
    })
  });

  if (!billRes.ok) {
    throw new Error(`Failed to insert bill: ${await billRes.text()}`);
  }
  const billData = await billRes.json();
  console.log('\x1b[32m✓ Bill RA-01 Certified:\x1b[0m ₹45,00,000.00 against BG Ref: BG-2026-SBI-0091');

  // 2. Append deed to Hermes Merkle chain
  console.log('\n[2/2] Appending Milestone Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'MOBILIZATION_ADVANCE_CERTIFIED',
      p_payload: {
        ra_bill_ref: 'RA-01-MOB-ADV',
        gross_advance: 4500000.00,
        bank_guarantee_ref: 'BG-2026-SBI-0091',
        bank_name: 'State Bank of India, Main Branch, Lucknow',
        valid_until: '2027-10-31',
        interest_bearing_rate: '10% p.a. simple',
        certified_by: 'Akshat Singh Rathore'
      }
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }
  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #2 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('\x1b[32m====================================================================\x1b[0m');
}

execute().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
