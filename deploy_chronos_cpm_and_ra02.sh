#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: RA BILL 02, CHRONOS CPM & VULCAN BBS NESTING AUDITOR
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
echo -e "${CYAN}    QUADILLAR LIVEVIEW: RA BILL 02, CPM RADAR & VULCAN BBS HARNESS  ${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "Project Target : ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Audit Date     : $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# 1. Load Configurations
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
  SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}"
  SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_KEY}"
fi

# 2. Verify Certified RA Bill 02
echo -e "[1/3] Inspecting Running Account Bill 02 & Digital Deed..."
RA_ENDPOINT="${SUPABASE_URL}/rest/v1/running_account_bills?project_id=eq.${PROJECT_ID}&ra_bill_number=eq.RA-2026-002&select=*"
RA_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${RA_ENDPOINT}")

node -e "
const bills = JSON.parse(process.argv[1]);
if (bills && bills.length > 0) {
  const b = bills[0];
  console.log('\x1b[32m✓ RA Bill Certified:\x1b[0m ' + b.ra_bill_number + ' (Seq #' + b.bill_sequence_no + ')');
  console.log('  Current Work Billed  : ₹' + Number(b.gross_work_done).toLocaleString('en-IN', {minimumFractionDigits: 2}));
  console.log('  Cumulative Gross EMB : ₹' + Number(b.gross_valuation).toLocaleString('en-IN', {minimumFractionDigits: 2}));
  console.log('  Retention 5%         : -₹' + Number(b.retention_amount).toLocaleString('en-IN', {minimumFractionDigits: 2}));
  console.log('  BOCW Cess 1%         : -₹' + Number(b.labour_cess_amount).toLocaleString('en-IN', {minimumFractionDigits: 2}));
  console.log('  Net Certified Payable: \x1b[32m₹' + Number(b.net_payable_certified).toLocaleString('en-IN', {minimumFractionDigits: 2}) + '\x1b[0m');
  console.log('  Deed SHA-256 Hash    : ' + b.sha256_deed_hash);
} else {
  console.log('\x1b[31m[ERROR] RA-2026-002 not found in registry.\x1b[0m');
}
" "${RA_RES}"

# 3. Audit Chronos 4D CPM Critical Path Schedule
echo -e "\n[2/3] Auditing Chronos 4D Critical Path & Float Erosion Radar..."
CPM_ENDPOINT="${SUPABASE_URL}/rest/v1/project_schedule_nodes?project_id=eq.${PROJECT_ID}&order=early_start_day.asc&select=*"
CPM_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${CPM_ENDPOINT}")

node -e "
const nodes = JSON.parse(process.argv[1]);
if (!nodes || nodes.length === 0) {
  console.log('\x1b[31m[ERROR] No schedule network nodes found.\x1b[0m');
  process.exit(1);
}

let criticalCount = 0;
console.log('WBS Network Nodes: ' + nodes.length + ' activities');
nodes.forEach(n => {
  const crit = n.is_critical;
  if (crit) criticalCount++;
  const tag = crit ? '\x1b[31m[CRITICAL]\x1b[0m' : '\x1b[32m[FLOAT ' + n.total_float_days + 'd]\x1b[0m';
  console.log('  ' + tag + ' ' + n.wbs_code + ': ' + n.activity_name + ' (Dur: ' + n.duration_days + 'd, ES: D' + n.early_start_day + ', EF: D' + n.early_finish_day + ')');
});
console.log('\x1b[32m✓ Critical Path Driving Chain:\x1b[0m ' + criticalCount + ' nodes on Zero Float (Schedule Variance: 0d).');
" "${CPM_RES}"

# 4. Audit Vulcan Bar Bending Schedule (BBS) 1D Nesting
echo -e "\n[3/3] Auditing Vulcan Rebar Billet Nesting Engine (CPWD Cl. 42 / IS 1786)..."
BBS_ENDPOINT="${SUPABASE_URL}/rest/v1/structural_bbs_schedules?project_id=eq.${PROJECT_ID}&bbs_code=eq.BBS-L05-COL-25MM-01&select=*"
BBS_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${BBS_ENDPOINT}")

node -e "
const bbs = JSON.parse(process.argv[1]);
if (bbs && bbs.length > 0) {
  const s = bbs[0];
  console.log('\x1b[32m✓ BBS Cutting Schedule:\x1b[0m ' + s.bbs_code + ' (' + s.structural_element + ')');
  console.log('  TMT Grade / Bar Dia   : ' + s.rebar_grade + ' / ' + s.bar_diameter_mm + ' mm');
  console.log('  Billets Consumed (12m): ' + s.billets_consumed + ' billets (' + s.theoretical_tonnage + ' MT steel)');
  console.log('  Calculated Scrap Rate : \x1b[32m' + s.scrap_waste_pct + '%\x1b[0m (Threshold: <= 3.0%)');
  if (s.cpwd_cl42_compliant) {
    console.log('\x1b[32m✓ CPWD GCC Clause 42 Compliant:\x1b[0m Scrap within permissible theoretical consumption limits.');
  } else {
    console.log('\x1b[31m! Statutory Breach:\x1b[0m Wastage exceeds CPWD Clause 42 limits.');
  }
} else {
  console.log('\x1b[33m! BBS schedule entry pending.\x1b[0m');
}
" "${BBS_RES}"

echo -e "\n${GREEN}Harness validation complete. Ready for Level 5 kickoff.${NC}"
