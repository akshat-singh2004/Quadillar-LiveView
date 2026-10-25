#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: RUNNING ACCOUNT BILLS SCHEMA INTROSPECTION
# ==============================================================================

set -euo pipefail

# 1. Load configurations cleanly from .env.local
if [ -f .env.local ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^#.* ]] && continue
    [[ -z "$line" ]] && continue
    export "$line"
  done < .env.local
fi

SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}}"

if [ -z "${SUPABASE_URL}" ] || [ -z "${SUPABASE_KEY}" ]; then
  echo -e "\033[0;31m[ERROR] SUPABASE_URL or SUPABASE_KEY is missing.\033[0m"
  exit 1
fi

echo -e "\033[0;34m====================================================================\033[0m"
echo -e "\033[0;36m    QUADILLAR LIVEVIEW: RUNNING ACCOUNT BILLS SCHEMA INTROSPECTION  \033[0m"
echo -e "\033[0;34m====================================================================\033[0m"

# 2. Query sample record from running_account_bills via stdin streaming
echo -e "\n[1/2] Fetching Sample Row from 'running_account_bills'..."
curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" \
  "${SUPABASE_URL}/rest/v1/running_account_bills?limit=1" | node -e '
const fs = require("fs");
try {
  const input = fs.readFileSync(0, "utf8");
  const records = JSON.parse(input);
  if (Array.isArray(records) && records.length > 0) {
    console.log("\x1b[32m✓ Found existing record in running_account_bills:\x1b[0m\n");
    console.log(JSON.stringify(records[0], null, 2));
    console.log("\n\x1b[36mColumn list:\x1b[0m", Object.keys(records[0]).join(", "));
  } else {
    console.log("\x1b[33m! Table returned 0 records or error:\x1b[0m", records);
  }
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to parse response:\x1b[0m", e.message);
}
'

# 3. Check for any other existing quality/concrete tables
echo -e "\n[2/2] Checking Substructure Quality Tables..."
curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" \
  "${SUPABASE_URL}/rest/v1/concrete_pour_cards?limit=1" | node -e '
const fs = require("fs");
try {
  const res = JSON.parse(fs.readFileSync(0, "utf8"));
  if (Array.isArray(res) && res.length > 0) {
    console.log("\x1b[32m✓ Table concrete_pour_cards exists with columns:\x1b[0m", Object.keys(res[0]).join(", "));
  } else if (Array.isArray(res)) {
    console.log("\x1b[33mTable concrete_pour_cards exists but is empty.\x1b[0m");
  } else {
    console.log("\x1b[33mTable concrete_pour_cards not created yet or accessible.\x1b[0m");
  }
} catch(e) {}
' || true

