#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: CERTIFY RA-13 (FINAL WORK SCOPE & FULL ADVANCE RECOVERY)
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

async function processRa13() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    CERTIFYING RA-13: MEP 2ND-FIX, FINISHES & ADVANCE CLOSURE      \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const grossWork = 5245000.00;
  const retentionAmt = 262250.00;        // 5% standard security deposit
  const advanceRecoveryAmt = 524500.00;  // 100% remaining balance of mobilization advance
  const netPayable = grossWork - retentionAmt - advanceRecoveryAmt; // ₹44,58,250.00

  // 1. Insert RA-13 into running_account_bills
  console.log('[1/2] Recording RA-13 in running_account_bills...');
  const billRes = await fetch(`${supabaseUrl}/rest/v1/running_account_bills`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      project_id: projectId,
      ra_bill_number: 'RA-13-MEP-SECOND-FIX-AND-FINISHES',
      bill_sequence_no: 13,
      gross_work_done: grossWork,
      retention_amount: retentionAmt,
      advance_recovery: advanceRecoveryAmt,
      net_payable_certified: netPayable,
      status: 'CERTIFIED',
      certified_at: new Date().toISOString()
    })
  });

  if (!billRes.ok) {
    throw new Error(`Failed to issue RA-13: ${await billRes.text()}`);
  }

  console.log('\x1b[32m✓ Bill RA-13 Certified:\x1b[0m');
  console.log(`  Gross Work Measured : INR ${grossWork.toLocaleString('en-IN')}`);
  console.log(`  Retention (5%)      : INR ${retentionAmt.toLocaleString('en-IN')}`);
  console.log(`  Advance Amortized   : INR ${advanceRecoveryAmt.toLocaleString('en-IN')} (Full Closure)`);
  console.log(`  Net Certified Sum   : INR ${netPayable.toLocaleString('en-IN')}`);

  // 2. Chaining Node #39 into Hermes Merkle Ledger
  console.log('\n[2/2] Appending RA-13 Audit Deed to Hermes Merkle Ledger...');
  const deedRes = await fetch(`${supabaseUrl}/rest/v1/rpc/hermes_record_immutable_deed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_project_id: projectId,
      p_action_category: 'RA_BILL_13_MEP_SECOND_FIX_AND_FINISHES_CERTIFIED',
      p_payload: {
        ra_bill_ref: 'RA-13-MEP-SECOND-FIX-AND-FINISHES',
        milestone_scope: 'Acoustic Ceilings (2100 sqm) + Electrical Fixtures/DBs + Sanitary Ware + Emulsion Painting (1950 sqm)',
        gross_work_certified: grossWork,
        deductions: {
          clause_1a_retention_5pct: retentionAmt,
          clause_10b_mobilization_recovery: advanceRecoveryAmt
        },
        net_payable_approved: netPayable,
        cumulative_contract_metrics: {
          total_sanctioned_contract_value: 45000000.00,
          total_certified_physical_work: 45000000.00,
          physical_progress_percentage: 100.00,
          total_retention_withheld_clause_1a: 2250000.00,
          total_mobilization_advance_cleared: 4500000.00,
          remaining_mobilization_advance_balance: 0.00,
          net_disbursed_to_contractor: 42750000.00
        },
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
  console.log(`\x1b[32m✓ Node #39 Chained into Merkle Ledger:\x1b[0m ${nodeHash}`);
  console.log('  Cumulative Progress : 100.00% Physical Execution Certified (INR 4.50 Cr)');
  console.log('  Advance Balance     : INR 0.00 (100% Amortized per CPWD Clause 10B)');
  console.log('  Total Retention     : INR 22,50,000.00 (5% DLP Security Deposit Locked)');
  console.log('  Clearance           : Authorized for Integrated Testing & Statutory Completion');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

processRa13().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
