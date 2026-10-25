#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: CERTIFY RA-10 (AAC MASONRY ENVELOPE) & CLAUSE 10B RECOVERY
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

async function processRa10() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    CERTIFYING RA-10: AAC BLOCK MASONRY & SEISMIC BANDS ENVELOPE    \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const grossWork = 2850000.00;
  const retentionAmt = 142500.00;        // 5% standard security deposit
  const advanceRecoveryAmt = 285000.00;  // 10% pro-rata mobilization advance recovery
  const netPayable = grossWork - retentionAmt - advanceRecoveryAmt; // ₹24,22,500.00

  // 1. Insert RA-10 into running_account_bills
  console.log('[1/2] Recording RA-10 in running_account_bills...');
  const billRes = await fetch(`${supabaseUrl}/rest/v1/running_account_bills`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      project_id: projectId,
      ra_bill_number: 'RA-10-AAC-MASONRY-ENVELOPE',
      bill_sequence_no: 10,
      gross_work_done: grossWork,
      retention_amount: retentionAmt,
      advance_recovery: advanceRecoveryAmt,
      net_payable_certified: netPayable,
      status: 'CERTIFIED',
      certified_at: new Date().toISOString()
    })
  });

  if (!billRes.ok) {
    throw new Error(`Failed to issue RA-10: ${await billRes.text()}`);
  }

  console.log('\x1b[32m✓ Bill RA-10 Certified:\x1b[0m');
  console.log(`  Gross Work Measured : INR ${grossWork.toLocaleString('en-IN')}`);
  console.log(`  Retention (5%)      : INR ${retentionAmt.toLocaleString('en-IN')}`);
  console.log(`  Advance Amortized   : INR ${advanceRecoveryAmt.toLocaleString('en-IN')}`);
  console.log(`  Net Certified Sum   : INR ${netPayable.toLocaleString('en-IN')}`);

  // 2. Chaining Node #30 into Hermes Merkle Ledger
  console.log('\n[2/2] Appending RA-10 Audit Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'RA_BILL_10_AAC_MASONRY_AND_SEISMIC_BANDS_CERTIFIED',
      p_payload: {
        ra_bill_ref: 'RA-10-AAC-MASONRY-ENVELOPE',
        milestone_scope: 'AAC Block Masonry (1850 sqm across GF, L1, L2) + Continuous M20 Sill Bands & Lintels',
        gross_work_certified: grossWork,
        deductions: {
          clause_1a_retention_5pct: retentionAmt,
          clause_10b_mobilization_recovery_10pct: advanceRecoveryAmt
        },
        net_payable_approved: netPayable,
        cumulative_advance_recovered: 3107500.00 + advanceRecoveryAmt,
        unrecovered_advance_balance: 4500000.00 - (3107500.00 + advanceRecoveryAmt),
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
  console.log(`\x1b[32m✓ Node #30 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('\x1b[32m====================================================================\x1b[0m');
}

processRa10().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
