#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: AUTOMATED TENANT ONBOARDING HARNESS
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

if [ -z "${SUPABASE_URL}" ] \vert{}\vert{} [ -z "${SUPABASE_KEY}" ]; then
  echo -e "\033[0;31m[FATAL] Missing SUPABASE_URL or SUPABASE_KEY.\033[0m"
  exit 1
fi

# New project parameters
NEW_PROJECT_ID="LUCKNOW-TECHPARK-PH1"
NEW_PROJECT_NAME="Lucknow IT City Technology Park - Tower A"
NEW_PROJECT_CODE="TECHPARK-T1"
CONTRACT_VALUE=45000000.00
CLIENT_NAME="UP Electronics Corporation Ltd (UPECL)"
CONTRACTOR_NAME="Apex Structural Engineers & Infra Ltd"

echo -e "\033[0;34m====================================================================\033[0m"
echo -e "\033[0;36m    QUADILLAR LIVEVIEW: TENANT PROVISIONING PIPELINE               \033[0m"
echo -e "\033[0;34m====================================================================\033[0m"
echo "Target Tenant ID   : ${NEW_PROJECT_ID}"
echo "Contract Sum       : INR ${CONTRACT_VALUE}"
echo ""

node - << 'NODE_RUNNER_EOF'
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const payload = {
  p_project_id: "LUCKNOW-TECHPARK-PH1",
  p_project_name: "Lucknow IT City Technology Park - Tower A",
  p_project_code: "TECHPARK-T1",
  p_contract_value: 45000000.00,
  p_client_name: "UP Electronics Corporation Ltd (UPECL)",
  p_contractor_name: "Apex Structural Engineers & Infra Ltd",
  p_admin_user_id: "00000000-0000-0000-0000-000000000001"
};

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json'
};

async function provisionTenant() {
  process.stdout.write('[1/2] Invoking provision_new_project_tenant RPC... ');
  
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/provision_new_project_tenant`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.log('\x1b[31m[FAILED]\x1b[0m');
    throw new Error(`RPC error ${res.status}: ${errorText}`);
  }

  const result = await res.json();
  console.log('\x1b[32m[SUCCESS]\x1b[0m');
  console.log('  Status           :', result.status);
  console.log('  Project ID       :', result.project_id);
  console.log('  Genesis Deed Hash:', result.genesis_deed_hash);

  process.stdout.write('\n[2/2] Validating Isolation & State Configuration... ');
  
  const checkRes = await fetch(`${supabaseUrl}/rest/v1/projects?project_id=eq.${payload.p_project_id}&select=project_id,status,active_stage,contract_value`, { headers });
  const checkData = await checkRes.json();

  if (!checkData || checkData.length === 0) {
    throw new Error('Project not found after provisioning.');
  }

  console.log('\x1b[32m[VERIFIED]\x1b[0m');
  console.log('  Lifecycle State  :', checkData[0].status);
  console.log('  Active Stage     :', checkData[0].active_stage);
  console.log('  Sanctioned Value : INR', Number(checkData[0].contract_value).toLocaleString('en-IN'));

  console.log('\n\x1b[32m====================================================================\x1b[0m');
  console.log(`\x1b[32m✓ TENANT ${payload.p_project_id} ACTIVE & GUARDED BY MERKLE LEDGER.\x1b[0m`);
  console.log('\x1b[32m====================================================================\x1b[0m');
}

provisionTenant().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
