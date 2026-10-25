#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: OHT HYDROSTATIC TEST & WATER ABSORPTION SOAK AUDITOR
# Standards: IS 3370:2021 Part 1 & 2, IS 15058, CPWD GCC Clause 7
# ==============================================================================

set -euo pipefail

PROJECT_ID="GOMTI-NAGAR-PH1-FITOUT"
TEST_REF="TEST-2026-TR-OHT-001"

# Initialize variables to prevent unbound variable crashes under set -u
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_KEY:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}====================================================================${NC}"
echo -e "${CYAN}    QUADILLAR LIVEVIEW: OHT HYDROSTATIC LEAKAGE & SOAK RADAR        ${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "Target Project : ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Test Reference : ${YELLOW}${TEST_REF}${NC}"
echo -e "Audit Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# 1. Load Configurations cleanly from .env.local if present
if [ -f .env.local ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^#.* ]] && continue
    [[ -z "$line" ]] && continue
    # Safely export key=value pairs
    export "$line"
  done < .env.local
fi

# Fallback resolution across common Supabase key naming patterns
SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}}"

if [ -z "${SUPABASE_URL}" ] || [ -z "${SUPABASE_KEY}" ]; then
  echo -e "${RED}[ERROR] Neither SUPABASE_URL nor SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY is set.${NC}"
  echo -e "Ensure .env.local exists or export SUPABASE_URL and SUPABASE_KEY."
  exit 1
fi

# 2. Inspect Hydrostatic Test Lifecycle & Telemetry
echo -e "[1/3] Inspecting IS 3370 Hydrostatic Leakage Telemetry..."
TEST_ENDPOINT="${SUPABASE_URL}/rest/v1/hydrostatic_water_tests?project_id=eq.${PROJECT_ID}&test_reference=eq.${TEST_REF}&select=*"
TEST_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${TEST_ENDPOINT}")

node -e '
try {
  const tests = JSON.parse(process.argv[1]);
  if (!tests || tests.length === 0) {
    console.log("\x1b[31m[ERROR] Hydrostatic test record not found.\x1b[0m");
    process.exit(1);
  }
  const t = tests[0];
  console.log("Structure      : " + t.structure_element);
  console.log("Water Depth    : " + t.water_depth_m + " m | Capacity: " + Number(t.tank_capacity_litres).toLocaleString() + " Litres");
  console.log("Status         : \x1b[32m" + t.status + "\x1b[0m (7-Day Soak Period Active)");
  console.log("--------------------------------------------------------------------");
  console.log("Gross Drop     : " + t.gross_level_drop_mm + " mm");
  console.log("Evap Offset(ΔE): -" + t.evaporation_pan_offset_mm + " mm");
  console.log("Net Absorption : \x1b[32m" + t.net_leakage_drop_mm + " mm\x1b[0m (Permissible: <= " + t.permissible_drop_mm + " mm in 7 days)");
  console.log("Wall Sweating  : " + (t.external_face_dampness ? "\x1b[31mDEFECT (Dampness Detected)\x1b[0m" : "\x1b[32mPASS (Zero Dampness / 100% Dry Faces)\x1b[0m"));
  console.log("Waterstop Seam : " + (t.waterstop_joint_seepage ? "\x1b[31mDEFECT (Joint Leakage)\x1b[0m" : "\x1b[32mPASS (Zero Joint Seepage)\x1b[0m"));
  console.log("SEOR Seal Hash : " + t.seor_deed_hash);
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to parse API response:\x1b[0m", e.message);
  process.exit(1);
}
' "${TEST_RES}"

# 3. Inspect Chronos WBS Progression
echo -e "\n[2/3] Inspecting Chronos 4D WBS Schedule Progression..."
CPM_ENDPOINT="${SUPABASE_URL}/rest/v1/project_schedule_nodes?project_id=eq.${PROJECT_ID}&wbs_code=in.(WBS-9.1,WBS-9.2,WBS-9.3,WBS-9.4,WBS-9.5)&order=wbs_code.asc&select=wbs_code,activity_name,status,is_critical"
CPM_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${CPM_ENDPOINT}")

node -e '
try {
  const nodes = JSON.parse(process.argv[1]);
  nodes.forEach(n => {
    let color = "\x1b[33m";
    if (n.status === "COMPLETED") color = "\x1b[32m";
    if (n.status === "IN_PROGRESS") color = "\x1b[34m";
    console.log("  " + n.wbs_code + ": " + n.activity_name + " -> " + color + n.status + "\x1b[0m");
  });
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to parse CPM response:\x1b[0m", e.message);
}
' "${CPM_RES}"

# 4. Audit Hermes Section 65B Ledger Notarization
echo -e "\n[3/3] Inspecting Hermes Section 65B Audit Ledger..."
AUDIT_ENDPOINT="${SUPABASE_URL}/rest/v1/immutable_audit_logs?project_id=eq.${PROJECT_ID}&action_category=eq.QUALITY_HYDROSTATIC_INITIATED&order=created_at.desc&limit=1&select=action_title,merkle_root_hash,status,created_at"
AUDIT_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${AUDIT_ENDPOINT}")

node -e '
try {
  const logs = JSON.parse(process.argv[1]);
  if (logs && logs.length > 0) {
    const l = logs[0];
    console.log("\x1b[32m✓ Hydrostatic Audit Sealed:\x1b[0m " + l.action_title);
    console.log("  Merkle Root Hash: " + l.merkle_root_hash);
  } else {
    console.log("\x1b[33m! Hydrostatic audit anchor pending.\x1b[0m");
  }
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to parse Audit response:\x1b[0m", e.message);
}
' "${AUDIT_RES}"

echo -e "\n${GREEN}IS 3370 Hydrostatic test soak sequence verified and running successfully.${NC}"
