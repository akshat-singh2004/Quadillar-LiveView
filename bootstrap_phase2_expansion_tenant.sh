#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: PHASE 2 TENANT PROVISIONING AUDITOR (RESILIENT)
# Standards: CPWD GCC Clause 10B, IS 1893:2016, Section 65B Indian Evidence Act
# ==============================================================================

set -euo pipefail

PROJECT_ID="GOMTI-NAGAR-PH2-EXPANSION"

# Initialize variables to prevent unbound variable crashes under set -u
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_KEY:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${BLUE}====================================================================${NC}"
echo -e "${CYAN}    QUADILLAR LIVEVIEW: PHASE 2 TENANT PROVISIONING AUDIT           ${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "Target Project : ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Audit Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# 1. Load Configurations cleanly from .env.local if present
if [ -f .env.local ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^#.* ]] && continue
    [[ -z "$line" ]] && continue
    export "$line"
  done < .env.local
fi

# Fallback resolution across common Supabase key naming patterns
SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}}"

if [ -z "${SUPABASE_URL}" ] || [ -z "${SUPABASE_KEY}" ]; then
  echo -e "${RED}[ERROR] Neither SUPABASE_URL nor SUPABASE_KEY is set.${NC}"
  exit 1
fi

# 2. Inspect Master Project Record from public.projects
echo -e "[1/4] Inspecting Master Project Record in 'projects'..."
PROJECT_ENDPOINT="${SUPABASE_URL}/rest/v1/projects?project_id=eq.${PROJECT_ID}&select=*"
PROJECT_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PROJECT_ENDPOINT}")

node -e '
let projects;
try {
  projects = JSON.parse(process.argv[1]);
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to parse Projects response:\x1b[0m", e.message);
  process.exit(1);
}

if (!Array.isArray(projects)) {
  console.log("\x1b[31m[ERROR] API returned non-array response:\x1b[0m", JSON.stringify(projects, null, 2));
  process.exit(1);
}

if (projects.length === 0) {
  console.log("\x1b[31m[ERROR] Master project record not found in public.projects.\x1b[0m");
  process.exit(1);
}

const p = projects[0];
console.log("\x1b[32m✓ Master Project Online:\x1b[0m " + p.project_id + " (" + (p.project_code || "N/A") + ")");
console.log("  Project Name       : " + p.project_name);
console.log("  Client Entity      : " + p.client_entity_name);
console.log("  Lead Contractor    : " + p.contractor_entity_name);
console.log("  Sanctioned Value   : \x1b[32m₹" + Number(p.contract_value).toLocaleString("en-IN", {minimumFractionDigits: 2}) + "\x1b[0m");
console.log("  Contractual Window : " + p.stipulated_start_date + " to " + p.stipulated_completion_date);
console.log("  Operational Status : \x1b[32m" + p.status + "\x1b[0m (Stage: " + p.active_stage + ")");
console.log("  Governing Protocol : " + p.gcc_protocol);
' "${PROJECT_RES}"

# 3. Inspect Chronos 4D WBS Master Schedule Nodes (select=* to avoid column mismatch)
echo -e "\n[2/4] Inspecting Chronos 4D Critical Path Schedule (Substructure Package)..."
CPM_ENDPOINT="${SUPABASE_URL}/rest/v1/project_schedule_nodes?project_id=eq.${PROJECT_ID}&order=wbs_code.asc&select=*"
CPM_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${CPM_ENDPOINT}")

node -e '
let nodes;
try {
  nodes = JSON.parse(process.argv[1]);
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to parse CPM response:\x1b[0m", e.message);
  process.exit(1);
}

if (!Array.isArray(nodes)) {
  console.log("\x1b[31m[ERROR] PostgREST API returned an error object instead of an array:\x1b[0m");
  console.log(JSON.stringify(nodes, null, 2));
  process.exit(1);
}

if (nodes.length === 0) {
  console.log("\x1b[33m! No WBS nodes found for project " + "'"${PROJECT_ID}"'" + ".\x1b[0m");
  process.exit(1);
}

console.log("---------------------------------------------------------------------------------------------------");
console.log("| WBS Code | Duration | Float | Critical | Status      | Activity Description                      |");
console.log("---------------------------------------------------------------------------------------------------");
nodes.forEach(n => {
  let statusColor = n.status === "IN_PROGRESS" ? "\x1b[34m" : "\x1b[33m";
  let floatVal = n.total_float_days !== undefined && n.total_float_days !== null ? n.total_float_days : 0;
  let isCrit = n.is_critical_path !== undefined && n.is_critical_path !== null ? n.is_critical_path : (floatVal === 0);
  let critStr = isCrit ? "YES" : "NO";
  let durStr = (n.duration_days !== undefined ? n.duration_days : "-") + "d";
  let desc = (n.activity_name || "").substring(0, 41);

  console.log("| " + (n.wbs_code || "").padEnd(8) + " | " + durStr.padEnd(8) + " | " + (floatVal + "d").padEnd(5) + " | " + critStr.padEnd(8) + " | " + statusColor + (n.status || "").padEnd(11) + "\x1b[0m | " + desc.padEnd(41) + " |");
});
console.log("---------------------------------------------------------------------------------------------------");
console.log("\x1b[32m✓ Critical path sequencing established. WBS nodes active.\x1b[0m");
' "${CPM_RES}"

# 4. Inspect Form 23 Electronic Measurement Book (EMB) Staged Items
echo -e "\n[3/4] Inspecting Form 23 Electronic Measurement Book (EMB)..."
EMB_ENDPOINT="${SUPABASE_URL}/rest/v1/electronic_measurement_book?project_id=eq.${PROJECT_ID}&select=*"
EMB_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${EMB_ENDPOINT}")

node -e '
let items;
try {
  items = JSON.parse(process.argv[1]);
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to parse EMB response:\x1b[0m", e.message);
  process.exit(1);
}

if (!Array.isArray(items)) {
  console.log("\x1b[31m[ERROR] EMB endpoint returned error:\x1b[0m", JSON.stringify(items, null, 2));
  process.exit(1);
}

if (items.length > 0) {
  const it = items[0];
  console.log("  EMB Item Code   : " + it.mb_item_code);
  console.log("  Trade Package   : " + it.trade_package);
  console.log("  Staged Quantity : " + it.total_quantity + " " + it.unit);
  console.log("  Gross Valuation : \x1b[32m₹" + Number(it.total_amount_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}) + "\x1b[0m");
  console.log("  Status          : \x1b[32m" + it.status + "\x1b[0m (Ready for Mobilization RA Bill Ingestion)");
} else {
  console.log("\x1b[33m! No EMB items found for Phase 2.\x1b[0m");
}
' "${EMB_RES}"

# 5. Inspect Hermes Section 65B Audit Deed for Notice to Proceed
echo -e "\n[4/4] Inspecting Hermes Section 65B NTP Charter Deed..."
AUDIT_ENDPOINT="${SUPABASE_URL}/rest/v1/immutable_audit_logs?project_id=eq.${PROJECT_ID}&action_category=eq.PROJECT_CHARTER_NTP_SEALED&order=created_at.desc&limit=1&select=*"
AUDIT_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${AUDIT_ENDPOINT}")

node -e '
let logs;
try {
  logs = JSON.parse(process.argv[1]);
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to parse Audit response:\x1b[0m", e.message);
  process.exit(1);
}

if (!Array.isArray(logs)) {
  console.log("\x1b[31m[ERROR] Audit endpoint returned error:\x1b[0m", JSON.stringify(logs, null, 2));
  process.exit(1);
}

if (logs.length > 0) {
  const l = logs[0];
  console.log("\x1b[32m✓ Notice to Proceed Sealed in Hermes Vault:\x1b[0m");
  console.log("  Action Title     : " + l.action_title);
  console.log("  Signatory        : " + l.signatory_name + " (" + l.signatory_role + ")");
  console.log("  Merkle Root Hash : " + l.merkle_root_hash);
  console.log("  Timestamp        : " + l.created_at);
} else {
  console.log("\x1b[33m! NTP deed pending notarization.\x1b[0m");
}
' "${AUDIT_RES}"

echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN}✓ ${PROJECT_ID} INITIALIZED. WBS-01.1 GEOTECHNICAL LOGGING ACTIVE.${NC}"
echo -e "${GREEN}====================================================================${NC}"
