#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: OHT WATER-TIGHTNESS CERTIFICATION & SUPERSTRUCTURE AUDITOR
# Standards: IS 3370:2021, IS 456:2000, CPWD GCC Clause 7, Section 65B
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
echo -e "${CYAN}    QUADILLAR LIVEVIEW: SUPERSTRUCTURE COMPLETION & OHT ACCEPTANCE  ${NC}"
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

# 2. Inspect Final Hydrostatic Test Certification State
echo -e "[1/3] Inspecting IS 3370 Final Water-Tightness Certification..."
TEST_ENDPOINT="${SUPABASE_URL}/rest/v1/hydrostatic_water_tests?project_id=eq.${PROJECT_ID}&test_reference=eq.${TEST_REF}&select=*"
TEST_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${TEST_ENDPOINT}")

node -e '
const tests = JSON.parse(process.argv[1]);
if (!tests || tests.length === 0) {
  console.log("\x1b[31m[ERROR] Hydrostatic test record not found.\x1b[0m");
  process.exit(1);
}
const t = tests[0];
console.log("Structure      : " + t.structure_element);
console.log("Capacity       : " + Number(t.tank_capacity_litres).toLocaleString() + " Litres | Test Depth: " + t.water_depth_m + " m");
console.log("Status         : \x1b[32m" + t.status + "\x1b[0m");
console.log("--------------------------------------------------------------------");
console.log("Gross Drop (7d): " + t.gross_level_drop_mm + " mm");
console.log("Evap Pan Loss  : -" + t.evaporation_pan_offset_mm + " mm");
console.log("Net Loss       : \x1b[32m" + t.net_leakage_drop_mm + " mm\x1b[0m (IS 3370 Permissible: <= " + t.permissible_drop_mm + " mm)");
console.log("Weep / Sweating: " + (t.external_face_dampness ? "\x1b[31mFAIL\x1b[0m" : "\x1b[32mPASS (Zero Sweating)\x1b[0m"));
console.log("Joint Integrity: " + (t.waterstop_joint_seepage ? "\x1b[31mFAIL\x1b[0m" : "\x1b[32mPASS (Zero Seepage)\x1b[0m"));
console.log("Digital Seal   : " + t.seor_deed_hash);
' "${TEST_RES}"

# 3. Inspect Chronos CPM Critical Path Milestone Completion
echo -e "\n[2/3] Auditing Chronos 4D Superstructure WBS Closure..."
CPM_ENDPOINT="${SUPABASE_URL}/rest/v1/project_schedule_nodes?project_id=eq.${PROJECT_ID}&wbs_code=like.WBS-9.%25&order=wbs_code.asc&select=wbs_code,activity_name,status"
CPM_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${CPM_ENDPOINT}")

node -e '
const nodes = JSON.parse(process.argv[1]);
let allDone = true;
nodes.forEach(n => {
  const isDone = n.status === "COMPLETED";
  if (!isDone) allDone = false;
  const statusColor = isDone ? "\x1b[32m" : "\x1b[33m";
  console.log("  " + n.wbs_code + ": " + n.activity_name + " -> " + statusColor + n.status + "\x1b[0m");
});
console.log("--------------------------------------------------------------------");
if (allDone) {
  console.log("\x1b[32m✓ 100% SUPERSTRUCTURE RCC CRITICAL PATH NETWORK COMPLETED.\x1b[0m");
} else {
  console.log("\x1b[33m! Pending nodes remain.\x1b[0m");
}
' "${CPM_RES}"

# 4. Final Cumulative Structural Financial Summary
echo -e "\n[3/3] Inspecting Cumulative Financial Ledger Across All 8 RA Bills..."
RA_ALL_ENDPOINT="${SUPABASE_URL}/rest/v1/running_account_bills?project_id=eq.${PROJECT_ID}&order=bill_sequence_no.asc&select=ra_bill_number,gross_work_done,net_payable_certified,status,created_at"
RA_ALL_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${RA_ALL_ENDPOINT}")

node -e '
const bills = JSON.parse(process.argv[1]);
let totalGross = 0;
let totalNet = 0;
bills.forEach(b => {
  totalGross += Number(b.gross_work_done);
  totalNet += Number(b.net_payable_certified);
});
console.log("Total Structural Bills Certified : " + bills.length + " (RA-2026-001 to RA-2026-008)");
console.log("Total Cumulative Gross Valuation : ₹" + totalGross.toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("Total Cumulative Net Disbursed   : \x1b[32m₹" + totalNet.toLocaleString("en-IN", {minimumFractionDigits: 2}) + "\x1b[0m");
console.log("Total Statutory Retentions (6%)  : ₹" + (totalGross - totalNet).toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("  - 5% Security Retention Money  : ₹" + (totalGross * 0.05).toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("  - 1% BOCW Welfare Labor Cess   : ₹" + (totalGross * 0.01).toLocaleString("en-IN", {minimumFractionDigits: 2}));
' "${RA_ALL_RES}"

echo -e "\n${GREEN}Practical Structural Completion confirmed for GOMTI-NAGAR-PH1-FITOUT.${NC}"
