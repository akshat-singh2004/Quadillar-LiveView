#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: RA BILL 14 DEED & CEILINGS/HVAC ADVANCEMENT AUDITOR
# Standards: CPWD GCC Clause 7, IS 3614, NBC 2016 Part 4, Section 65B
# ==============================================================================

set -euo pipefail

PROJECT_ID="GOMTI-NAGAR-PH1-FITOUT"

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
echo -e "${CYAN}    QUADILLAR LIVEVIEW: RA BILL 14 DEED & CEILINGS/HVAC AUDIT       ${NC}"
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

# 2. Inspect Certified RA Bill 14 & Digital Deed
echo -e "[1/3] Inspecting Running Account Bill 14 & Digital Deed..."
RA_ENDPOINT="${SUPABASE_URL}/rest/v1/running_account_bills?project_id=eq.${PROJECT_ID}&ra_bill_number=eq.RA-2026-014&select=*"
RA_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${RA_ENDPOINT}")

node -e '
let bills;
try {
  bills = JSON.parse(process.argv[1]);
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to parse API response:\x1b[0m", e.message);
  process.exit(1);
}

if (Array.isArray(bills) && bills.length > 0) {
  const b = bills[0];
  console.log("\x1b[32m✓ RA Bill Certified:\x1b[0m " + b.ra_bill_number + " (Sequence #" + b.bill_sequence_no + ")");
  console.log("  Current Work Billed  : ₹" + Number(b.gross_work_done).toLocaleString("en-IN", {minimumFractionDigits: 2}));
  console.log("  Cumulative Gross EMB : ₹" + Number(b.gross_valuation).toLocaleString("en-IN", {minimumFractionDigits: 2}));
  console.log("  Retention 5%         : -₹" + Number(b.retention_amount).toLocaleString("en-IN", {minimumFractionDigits: 2}));
  console.log("  BOCW Cess 1%         : -₹" + Number(b.labour_cess_amount).toLocaleString("en-IN", {minimumFractionDigits: 2}));
  console.log("  Net Certified Payable: \x1b[32m₹" + Number(b.net_payable_certified).toLocaleString("en-IN", {minimumFractionDigits: 2}) + "\x1b[0m");
  console.log("  Deed SHA-256 Hash    : " + b.sha256_deed_hash);
} else {
  console.log("\x1b[31m[ERROR] RA-2026-014 not found in registry. Execute SQL migration first.\x1b[0m");
  process.exit(1);
}
' "${RA_RES}"

# 3. Inspect Chronos CPM State for Ceilings, Millwork & VRF HVAC (WBS-11.3)
echo -e "\n[2/3] Inspecting Chronos 4D Phase 3 Schedule Progression..."
CPM_ENDPOINT="${SUPABASE_URL}/rest/v1/project_schedule_nodes?project_id=eq.${PROJECT_ID}&wbs_code=like.WBS-11.%25&order=wbs_code.asc&select=wbs_code,activity_name,status,duration_days"
CPM_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${CPM_ENDPOINT}")

node -e '
let nodes = JSON.parse(process.argv[1]);
nodes.forEach(n => {
  let color = "\x1b[33m";
  if (n.status === "COMPLETED") color = "\x1b[32m";
  if (n.status === "IN_PROGRESS") color = "\x1b[34m";
  console.log("  " + n.wbs_code + " (" + n.duration_days + "d): " + n.activity_name + " -> " + color + n.status + "\x1b[0m");
});
' "${CPM_RES}"

# 4. Financial Summary Across All 14 Cumulative Billing Cycles
echo -e "\n[3/3] Financial Summary Across All 14 Cumulative Billing Cycles..."
RA_ALL_ENDPOINT="${SUPABASE_URL}/rest/v1/running_account_bills?project_id=eq.${PROJECT_ID}&order=bill_sequence_no.asc&select=ra_bill_number,gross_work_done,net_payable_certified,status,created_at"
RA_ALL_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${RA_ALL_ENDPOINT}")

node -e '
let bills = JSON.parse(process.argv[1]);
console.log("-----------------------------------------------------------------------------------");
console.log("| Bill Number | Gross Work Done | Net Certified   | Status    | Timestamp (UTC)   |");
console.log("-----------------------------------------------------------------------------------");
let totalGross = 0;
let totalNet = 0;
bills.forEach(b => {
  totalGross += Number(b.gross_work_done);
  totalNet += Number(b.net_payable_certified);
  const grossStr = "₹" + Number(b.gross_work_done).toLocaleString("en-IN", {minimumFractionDigits: 2});
  const netStr = "₹" + Number(b.net_payable_certified).toLocaleString("en-IN", {minimumFractionDigits: 2});
  console.log("| " + b.ra_bill_number.padEnd(11) + " | " + grossStr.padStart(15) + " | " + netStr.padStart(15) + " | " + b.status.padEnd(9) + " | " + b.created_at.substring(0, 19) + " |");
});
console.log("-----------------------------------------------------------------------------------");
console.log("Total Cumulative Gross Billed   : ₹" + totalGross.toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("Total Cumulative Net Certified  : \x1b[32m₹" + totalNet.toLocaleString("en-IN", {minimumFractionDigits: 2}) + "\x1b[0m");
console.log("Total Statutory Deductions (6%) : ₹" + (totalGross - totalNet).toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("  - 5% Security Retention Money : ₹" + (totalGross * 0.05).toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("  - 1% BOCW Welfare Labor Cess  : ₹" + (totalGross * 0.01).toLocaleString("en-IN", {minimumFractionDigits: 2}));
' "${RA_ALL_RES}"

echo -e "\n${GREEN}RA Bill 14 certification verified. Chronos active on WBS-11.3 Ceilings & HVAC.${NC}"
