#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: DETECT PROJECTS SCHEMA & PATCH DLP STATUS
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

async function patchProjectStatus() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    INSPECTING & PATCHING PROJECTS TABLE STATUS                     \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  // 1. Fetch existing project record to detect column names
  const fetchRes = await fetch(`${supabaseUrl}/rest/v1/projects?limit=5`, { headers });
  if (!fetchRes.ok) {
    throw new Error(`Failed to fetch projects: ${await fetchRes.text()}`);
  }

  const rows = await fetchRes.json();
  if (!rows || rows.length === 0) {
    console.log('\x1b[33m[INFO]\x1b[0m No rows in projects table.');
    return;
  }

  const sample = rows[0];
  const columns = Object.keys(sample);
  console.log(`\x1b[33m[DETECTED SCHEMA]:\x1b[0m Columns: [${columns.join(', ')}]`);

  // Determine identifier column
  let idCol = 'id';
  if (columns.includes('project_id')) idCol = 'project_id';
  else if (columns.includes('code')) idCol = 'code';

  // Find target project matching TARGET_PROJECT_ID
  const targetRow = rows.find(r => 
    r.id === targetId || r.project_id === targetId || r.code === targetId || r.name?.includes('Technology Park')
  );

  const filterValue = targetRow ? targetRow[idCol] : targetId;
  console.log(`  Targeting Column: "${idCol}" = "${filterValue}"`);

  // Build clean payload using only columns that actually exist
  const updatePayload = {};
  if (columns.includes('status')) updatePayload.status = 'DLP_ACTIVE';
  if (columns.includes('updated_at')) updatePayload.updated_at = new Date().toISOString();
  if (columns.includes('current_phase')) updatePayload.current_phase = 'DEFECT_LIABILITY_PERIOD';
  if (columns.includes('metadata') && typeof targetRow?.metadata === 'object') {
    updatePayload.metadata = {
      ...(targetRow.metadata || {}),
      dlp_commenced_at: '2026-10-22',
      dlp_expires_at: '2027-10-21',
      retention_held_inr: 2250000.00,
      merkle_root: 'abea83a1e0686b8ebf58a2a2ada2c513fd0d1eeae25ce7bb9288dde0883348f0'
    };
  }

  console.log('  Applying payload:', JSON.stringify(updatePayload));

  const patchRes = await fetch(`${supabaseUrl}/rest/v1/projects?${idCol}=eq.${encodeURIComponent(filterValue)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updatePayload)
  });

  if (!patchRes.ok) {
    throw new Error(`Failed to update project: ${await patchRes.text()}`);
  }

  const updated = await patchRes.json();
  console.log('\x1b[32m✓ Project record successfully updated to DLP_ACTIVE:\x1b[0m');
  console.log(JSON.stringify(updated[0] || updatePayload, null, 2));
  console.log('\x1b[32m====================================================================\x1b[0m');
}

patchProjectStatus().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
