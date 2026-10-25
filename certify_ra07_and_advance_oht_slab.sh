#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: RA BILL 07 DEED & OHT TOP SLAB ADVANCEMENT AUDITOR
# ==============================================================================

set -euo pipefail

PROJECT_ID="GOMTI-NAGAR-PH1-FITOUT"
POUR_CARD="PC-2026-TR-OHT-SLAB-001"
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
echo -e "${CYAN}    QUADILLAR LIVEVIEW: RA BILL 07 DEED & OHT SLAB PRE-CHECK        ${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "Target Project : ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Next Pour Card : ${YELLOW}${POUR_CARD}${NC}"
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

# 2. Verify Certified RA Bill 07 & Digital Deed
echo -e "[1/3] Inspecting Running Account Bill 07 & Digital Deed..."
RA_ENDPOINT="${SUPABASE_URL}/rest/v1/running_account_bills?project_id=eq.${PROJECT_ID}&ra_bill_number=eq.RA-2026-007&select=*"
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
  console.log("\x1b[31m[ERROR] RA-2026-007 not found in registry.\x1b[0m");
}
' "${RA_RES}"

# 3. Inspect Chronos WBS Progression
echo -e "\n[2/3] Inspecting Chronos 4D WBS Schedule Progression..."
CPM_ENDPOINT="${SUPABASE_URL}/rest/v1/project_schedule_nodes?project_id=eq.${PROJECT_ID}&wbs_code=in.(WBS-9.1,WBS-9.2,WBS-9.3,WBS-9.4,WBS-9.5)&order=wbs_code.asc&select=wbs_code,activity_name,status,is_critical"
CPM_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${CPM_ENDPOINT}")

node -e '
const nodes = JSON.parse(process.argv[1]);
nodes.forEach(n => {
  let color = "\x1b[33m";
  if (n.status === "COMPLETED") color = "\x1b[32m";
  if (n.status === "IN_PROGRESS") color = "\x1b[34m";
  console.log("  " + n.wbs_code + ": " + n.activity_name + " -> " + color + n.status + "\x1b[0m");
});
' "${CPM_RES}"

# 4. Audit OHT Top Slab Pre-Pour Hold-Gates
echo -e "\n[3/3] Evaluating Pre-Pour Inspection Hold-Gates for ${POUR_CARD}..."
PC_ENDPOINT="${SUPABASE_URL}/rest/v1/concrete_pour_cards?project_id=eq.${PROJECT_ID}&pour_card_number=eq.${POUR_CARD}&select=*"
PC_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PC_ENDPOINT}")

node -e '
const cards = JSON.parse(process.argv[1]);
if (!cards || cards.length === 0) {
  console.log("\x1b[31m[ERROR] Pour card not found in database.\x1b[0m");
  process.exit(1);
}
const p = cards[0];
console.log("Element     : " + p.structural_element + " (" + p.concrete_grade + ")");
console.log("Location    : " + p.grid_location);
console.log("Volume      : " + p.planned_volume_cum + " m³ | Required Cube Sets: " + p.required_cube_sets + " (IS 456 Cl. 15.2)");
console.log("--------------------------------------------------------------------");
console.log((p.formwork_plumb_verified ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[HOLD]\x1b[0m") + " Check 1: Internal Soffit Staging & Manhole Decking (IS 14687)");
console.log((p.rebar_cover_verified ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[HOLD]\x1b[0m") + " Check 2: 25mm Top Mesh Cover & Ventilation Sleeves (IS 3370)");
console.log((p.mep_embeds_cleared ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[HOLD]\x1b[0m") + " Check 3: Inspection Manhole Ring, CI Cowl & Overflow Embeds");
console.log((p.slump_temperature_cleared ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[HOLD]\x1b[0m") + " Check 4: Argus Ambient Microclimate Window");
console.log("--------------------------------------------------------------------");
console.log("Status      : \x1b[33m" + p.status + "\x1b[0m (Internal staging & top mesh tying underway)");
' "${PC_RES}"

echo -e "\n${GREEN}RA Bill 07 verification and OHT top slab advancement complete.${NC}"
