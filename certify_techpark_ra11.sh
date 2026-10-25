#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: CERTIFY RA-11 (PLASTERING & MEP 1ST FIX) & CLAUSE 10B
# Standards: CPWD Works Manual Sec 19, CPWD GCC Clause 1A & Clause 10B
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

async function processRa11() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    CERTIFYING RA-11: PLASTERING FINISHES & MEP FIRST-FIX EMBEDMENT \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const grossWork = 2680000.00;
  const retentionAmt = 134000.00;        // 5% standard security deposit
  const advanceRecoveryAmt = 268000.00;  // 10% pro-rata mobilization advance recovery
  const netPayable = grossWork - retentionAmt - advanceRecoveryAmt; // ₹22,78,000.00

  // 1. Insert RA-11 into running_account_bills
  console.log('[1/2] Recording RA-11 in running_account_bills...');
  const billRes = await fetch(`${supabaseUrl}/rest/v1/running_account_bills`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      project_id: projectId,
      ra_bill_number: 'RA-11-PLASTERING-MEP-FIRST-FIX',
      bill_sequence_no: 11,
      gross_work_done: grossWork,
      retention_amount: retentionAmt,
      advance_recovery: advanceRecoveryAmt,
      net_payable_certified: netPayable,
      status: 'CERTIFIED',
      certified_at: new Date().toISOString()
    })
  });

  if (!billRes.ok) {
    throw new Error(`Failed to issue RA-11: ${await billRes.text()}`);
  }

  console.log('\x1b[32m✓ Bill RA-11 Certified:\x1b[0m');
  console.log(`  Gross Work Measured : INR ${grossWork.toLocaleString('en-IN')}`);
  console.log(`  Retention (5%)      : INR ${retentionAmt.toLocaleString('en-IN')}`);
  console.log(`  Advance Amortized   : INR ${advanceRecoveryAmt.toLocaleString('en-IN')}`);
  console.log(`  Net Certified Sum   : INR ${netPayable.toLocaleString('en-IN')}`);

  // 2. Chaining Node #33 into Hermes Merkle Ledger
  console.log('\n[2/2] Appending RA-11 Audit Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'RA_BILL_11_PLASTERING_AND_MEP_FIRST_FIX_CERTIFIED',
      p_payload: {
        ra_bill_ref: 'RA-11-PLASTERING-MEP-FIRST-FIX',
        milestone_scope: 'External 20mm Plaster (1450 sqm) + Internal 12mm Plaster (1950 sqm) + AR-Glass Mesh + MEP 1st Fix',
        gross_work_certified: grossWork,
        deductions: {
          clause_1a_retention_5pct: retentionAmt,
          clause_10b_mobilization_recovery_10pct: advanceRecoveryAmt
        },
        net_payable_approved: netPayable,
        cumulative_advance_recovered: 3392500.00 + advanceRecoveryAmt,
        unrecovered_advance_balance: 4500000.00 - (3392500.00 + advanceRecoveryAmt),
        superintending_engineer: 'Akshat Singh Rathore',
        contractor_accepted: 'Apex Structural Engineers & Infra Ltd',
        approval_timestamp: new Date().toISOString()
      }
    })
  });

  if (!deedRes.ok) {
    throw new Error(`Failed to append deed: ${await deedRes.text()}`);
  }

  const nodeHash = await deedRes.json();
  console.log(`\x1b[32m✓ Node #33 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('\x1b[32m====================================================================\x1b[0m');
}

processRa11().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
