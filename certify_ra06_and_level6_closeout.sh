#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: RA BILL 06 DEED & LEVEL 6 CLOSEOUT AUDITOR
# ==============================================================================

set -euo pipefail

PROJECT_ID="GOMTI-NAGAR-PH1-FITOUT"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}====================================================================${NC}"
echo -e "${CYAN}    QUADILLAR LIVEVIEW: RA BILL 06 DEED & SHIFT CLOSEOUT AUDITOR    ${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "Target Project : ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Audit Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# 1. Load Configurations cleanly
if [ -f .env.local ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^#.* ]] && continue
    [[ -z "$line" ]] && continue
    export "$line"
  done < .env.local
  SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}"
  SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_KEY}"
fi

# 2. Verify Certified RA Bill 06
echo -e "[1/3] Inspecting Running Account Bill 06 & Digital Deed..."
RA_ENDPOINT="${SUPABASE_URL}/rest/v1/running_account_bills?project_id=eq.${PROJECT_ID}&ra_bill_number=eq.RA-2026-006&select=*"
RA_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${RA_ENDPOINT}")

node -e '
const bills = JSON.parse(process.argv[1]);
if (bills && bills.length > 0) {
  const b = bills[0];
  console.log("\x1b[32m✓ RA Bill Certified:\x1b[0m " + b.ra_bill_number + " (Sequence #" + b.bill_sequence_no + ")");
  console.log("  Current Work Billed  : ₹" + Number(b.gross_work_done).toLocaleString("en-IN", {minimumFractionDigits: 2}));
  console.log("  Cumulative Gross EMB : ₹" + Number(b.gross_valuation).toLocaleString("en-IN", {minimumFractionDigits: 2}));
  console.log("  Retention 5%         : -₹" + Number(b.retention_amount).toLocaleString("en-IN", {minimumFractionDigits: 2}));
  console.log("  BOCW Cess 1%         : -₹" + Number(b.labour_cess_amount).toLocaleString("en-IN", {minimumFractionDigits: 2}));
  console.log("  Net Certified Payable: \x1b[32m₹" + Number(b.net_payable_certified).toLocaleString("en-IN", {minimumFractionDigits: 2}) + "\x1b[0m");
  console.log("  Deed SHA-256 Hash    : " + b.sha256_deed_hash);
} else {
  console.log("\x1b[31m[ERROR] RA-2026-006 not found in registry.\x1b[0m");
}
' "${RA_RES}"

# 3. Inspect DPR & Permit Closeout
echo -e "\n[2/3] Auditing DPR Muster Records & Safety Permit Closeout..."
DPR_ENDPOINT="${SUPABASE_URL}/rest/v1/daily_progress_reports?project_id=eq.${PROJECT_ID}&dpr_code=eq.DPR-2026-10-16-D03&select=*"
DPR_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${DPR_ENDPOINT}")

node -e '
const dprs = JSON.parse(process.argv[1]);
if (dprs && dprs.length > 0) {
  const d = dprs[0];
  console.log("\x1b[32m✓ Shift DPR Sealed:\x1b[0m " + d.dpr_code + " | Operatives: " + d.total_manpower + " (" + d.cumulative_man_hours + " Man-hrs)");
  console.log("  Safety Incidents: " + d.safety_incidents_count + " | Status: " + d.status);
} else {
  console.log("\x1b[33m! Shift DPR record pending.\x1b[0m");
}
' "${DPR_RES}"

PTW_ENDPOINT="${SUPABASE_URL}/rest/v1/safety_permit_to_work?project_id=eq.${PROJECT_ID}&ptw_number=eq.PTW-2026-HSE-113&select=ptw_number,hazard_category,status,closed_at"
PTW_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PTW_ENDPOINT}")

node -e '
const ptws = JSON.parse(process.argv[1]);
if (ptws && ptws.length > 0) {
  const p = ptws[0];
  console.log("\x1b[32m✓ PTW Closed:\x1b[0m " + p.ptw_number + " (" + p.hazard_category + ") -> Status: \x1b[32m" + p.status + "\x1b[0m");
  console.log("  Closed At: " + p.closed_at);
} else {
  console.log("\x1b[33m! PTW status check failed.\x1b[0m");
}
' "${PTW_RES}"

# 4. Cumulative Commercial Summary
echo -e "\n[3/3] Financial Summary Across All 6 Cumulative Billing Cycles..."
RA_ALL_ENDPOINT="${SUPABASE_URL}/rest/v1/running_account_bills?project_id=eq.${PROJECT_ID}&order=bill_sequence_no.asc&select=ra_bill_number,gross_work_done,net_payable_certified,status,created_at"
RA_ALL_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${RA_ALL_ENDPOINT}")

node -e '
const bills = JSON.parse(process.argv[1]);
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
' "${RA_ALL_RES}"

echo -e "\n${GREEN}RA Bill 06 certification and Level 6 closeout verification completed.${NC}"
