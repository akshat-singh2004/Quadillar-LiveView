#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: SYNC FINAL CLOSEOUT METADATA & MERKLE ROOT TO REGISTRY
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
const targetId = process.env.TARGET_PROJECT_ID;

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function finalizeCloseoutMetadata() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    ANCHORING MERKLE ROOT & STATUTORY COMPLETION DATES TO REGISTRY  \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const closeoutPayload = {
    active_stage: "HANDOVER_AND_DLP",
    target_completion_date: "2026-10-22",
    stipulated_completion_date: "2026-10-22",
    legal_deed_sha256: "abea83a1e0686b8ebf58a2a2ada2c513fd0d1eeae25ce7bb9288dde0883348f0",
    legal_deed_url: "hermes_ledger_manifest_LUCKNOW-TECHPARK-PH1.json",
    agreement_ref_no: "UPECL/TECHPARK/T-A/2026/01",
    updated_at: new Date().toISOString()
  };

  const patchRes = await fetch(
    `${supabaseUrl}/rest/v1/projects?project_id=eq.${encodeURIComponent(targetId)}`, 
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify(closeoutPayload)
    }
  );

  if (!patchRes.ok) {
    throw new Error(`Failed to update project metadata: ${await patchRes.text()}`);
  }

  const updatedRows = await patchRes.json();
  const row = updatedRows[0];

  console.log('\x1b[32m✓ Project Primary Registry Successfully Synchronized:\x1b[0m');
  console.log(`  Project ID        : ${row.project_id}`);
  console.log(`  Status            : ${row.status}`);
  console.log(`  Active Stage      : ${row.active_stage}`);
  console.log(`  Completion Date   : ${row.stipulated_completion_date}`);
  console.log(`  Agreement Ref     : ${row.agreement_ref_no}`);
  console.log(`  Merkle Root Hash  : ${row.legal_deed_sha256}`);
  console.log(`  Manifest Dossier  : ${row.legal_deed_url}`);
  console.log('\x1b[32m====================================================================\x1b[0m');
}

finalizeCloseoutMetadata().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
