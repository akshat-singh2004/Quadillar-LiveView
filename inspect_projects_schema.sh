#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: PROJECTS SCHEMA & RECORD INTROSPECTION
# ==============================================================================

set -euo pipefail

# 1. Load configurations from .env.local
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
echo -e "\033[0;36m    QUADILLAR LIVEVIEW: MASTER PROJECTS TABLE INTROSPECTION         \033[0m"
echo -e "\033[0;34m====================================================================\033[0m"

# 2. Query OpenAPI Spec for exact schema definition of 'projects'
echo -e "\n[1/3] Fetching OpenAPI Table Definitions for 'projects'..."
curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" \
  "${SUPABASE_URL}/rest/v1/" | node -e '
let spec;
try {
  spec = JSON.parse(process.argv[1]);
  const schema = spec.definitions && spec.definitions.projects;
  if (schema) {
    console.log("\x1b[32m✓ Found schema definition for table: projects\x1b[0m");
    console.log("-----------------------------------------------------------------------------------");
    console.log("| Column Name                  | Type        | Format      | Required?            |");
    console.log("-----------------------------------------------------------------------------------");
    const requiredCols = schema.required || [];
    for (const [col, prop] of Object.entries(schema.properties || {})) {
      const isReq = requiredCols.includes(col) ? "\x1b[31mREQUIRED\x1b[0m" : "OPTIONAL";
      console.log("| " + col.padEnd(28) + " | " + (prop.type || "").padEnd(11) + " | " + (prop.format || "").padEnd(11) + " | " + isReq.padEnd(20) + " |");
    }
    console.log("-----------------------------------------------------------------------------------");
  } else {
    console.log("\x1b[33m! OpenAPI definition for projects not found in root spec.\x1b[0m");
  }
} catch (e) {
  console.log("\x1b[31m[ERROR] Could not parse OpenAPI schema:\x1b[0m", e.message);
}
' "$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${SUPABASE_URL}/rest/v1/")"

# 3. Query existing records in 'projects' to inspect live values
echo -e "\n[2/3] Inspecting Existing Records in 'projects'..."
curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" \
  "${SUPABASE_URL}/rest/v1/projects?select=*&limit=2" | node -e '
try {
  const records = JSON.parse(process.argv[1]);
  if (Array.isArray(records) && records.length > 0) {
    console.log("\x1b[32m✓ Existing Project Records Found (" + records.length + "):\x1b[0m\n");
    console.log(JSON.stringify(records[0], null, 2));
  } else {
    console.log("\x1b[33m! Table projects returned 0 records or empty array.\x1b[0m Response:", records);
  }
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to query /rest/v1/projects:\x1b[0m", e.message);
}
'

# 4. Check existing foreign key references to 'projects'
echo -e "\n[3/3] Ready to map Phase 2 tenant baseline."
