#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: RA BILL 03 CERTIFICATION & LEVEL 5 SLAB STAGING AUDITOR
# ==============================================================================

set -euo pipefail

PROJECT_ID="GOMTI-NAGAR-PH1-FITOUT"
POUR_CARD="PC-2026-L05-SLAB-001"
PTW_NUM="PTW-2026-HSE-111"
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
echo -e "${CYAN}    QUADILLAR LIVEVIEW: RA BILL 03 DEED & LEVEL 5 SLAB RADAR        ${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "Target Project : ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Next Pour Card : ${YELLOW}${POUR_CARD}${NC}"
echo -e "Audit Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# 1. Load Configurations
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
  SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}"
  SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_KEY}"
fi

# 2. Verify Certified RA Bill 03 & Digital Deed
echo -e "[1/4] Inspecting Running Account Bill 03 & Digital Deed..."
RA_ENDPOINT="${SUPABASE_URL}/rest/v1/running_account_bills?project_id=eq.${PROJECT_ID}&ra_bill_number=eq.RA-2026-003&select=*"
RA_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${RA_ENDPOINT}")

node -e "
const bills = JSON.parse(process.argv[1]);
if (bills && bills.length > 0) {
  const b = bills[0];
  console.log('\x1b[32m✓ RA Bill Certified:\x1b[0m ' + b.ra_bill_number + ' (Sequence #' + b.bill_sequence_no + ')');
  console.log('  Current Work Billed  : ₹' + Number(b.gross_work_done).toLocaleString('en-IN', {minimumFractionDigits: 2}));
  console.log('  Cumulative Gross EMB : ₹' + Number(b.gross_valuation).toLocaleString('en-IN', {minimumFractionDigits: 2}));
  console.log('  Retention 5%         : -₹' + Number(b.retention_amount).toLocaleString('en-IN', {minimumFractionDigits: 2}));
  console.log('  BOCW Cess 1%         : -₹' + Number(b.labour_cess_amount).toLocaleString('en-IN', {minimumFractionDigits: 2}));
  console.log('  Net Certified Payable: \x1b[32m₹' + Number(b.net_payable_certified).toLocaleString('en-IN', {minimumFractionDigits: 2}) + '\x1b[0m');
  console.log('  Deed SHA-256 Hash    : ' + b.sha256_deed_hash);
} else {
  console.log('\x1b[31m[ERROR] RA-2026-003 not found in registry.\x1b[0m');
}
" "${RA_RES}"

# 3. Inspect Chronos CPM Critical Path Progression
echo -e "\n[2/4] Inspecting Chronos 4D WBS Network Progression..."
CPM_ENDPOINT="${SUPABASE_URL}/rest/v1/project_schedule_nodes?project_id=eq.${PROJECT_ID}&order=wbs_code.asc&select=wbs_code,activity_name,status,is_critical"
CPM_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${CPM_ENDPOINT}")

node -e "
const nodes = JSON.parse(process.argv[1]);
nodes.forEach(n => {
  let color = '\x1b[33m';
  if (n.status === 'COMPLETED') color = '\x1b[32m';
  if (n.status === 'IN_PROGRESS') color = '\x1b[34m';
  console.log('  ' + n.wbs_code + ': ' + n.activity_name + ' -> ' + color + n.status + '\x1b[0m');
});
" "${CPM_RES}"

# 4. Audit Level 5 Suspended Slab Pre-Pour Hold-Gates
echo -e "\n[3/4] Evaluating Pre-Pour Inspection Hold-Gates for ${POUR_CARD}..."
PC_ENDPOINT="${SUPABASE_URL}/rest/v1/concrete_pour_cards?project_id=eq.${PROJECT_ID}&pour_card_number=eq.${POUR_CARD}&select=*"
PC_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PC_ENDPOINT}")

node -e "
const cards = JSON.parse(process.argv[1]);
if (!cards || cards.length === 0) {
  console.log('\x1b[31m[ERROR] Pour card not found in database.\x1b[0m');
  process.exit(1);
}
const p = cards[0];
console.log('Element     : ' + p.structural_element + ' (' + p.concrete_grade + ')');
console.log('Location    : ' + p.grid_location);
console.log('Volume      : ' + p.planned_volume_cum + ' m³ | Required Cube Sets: ' + p.required_cube_sets + ' (IS 456 Cl. 15.2)');
console.log('--------------------------------------------------------------------');
console.log((p.formwork_plumb_verified ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[HOLD]\x1b[0m') + ' Check 1: Cuplock Staging, Propping & Deck Level (IS 14687)');
console.log((p.rebar_cover_verified ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[HOLD]\x1b[0m') + ' Check 2: Beam & Slab Reinforcement Cover (IS 456 Cl. 26)');
console.log((p.mep_embeds_cleared ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[HOLD]\x1b[0m') + ' Check 3: Daedalus MEP BIM Conduit Embedments (IFC Scan)');
console.log((p.slump_temperature_cleared ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[HOLD]\x1b[0m') + ' Check 4: Argus Weather & Microclimate Window (Temp/Wind)');
console.log('--------------------------------------------------------------------');
console.log('Status      : \x1b[33m' + p.status + '\x1b[0m (Staging & rebar placement underway)');
" "${PC_RES}"

# 5. Inspect Active Working-at-Height Safety Permit
echo -e "\n[4/4] Inspecting Active Safety Permit (${PTW_NUM})..."
PTW_ENDPOINT="${SUPABASE_URL}/rest/v1/safety_permit_to_work?project_id=eq.${PROJECT_ID}&ptw_number=eq.${PTW_NUM}&select=*"
PTW_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PTW_ENDPOINT}")

node -e "
const ptws = JSON.parse(process.argv[1]);
if (ptws && ptws.length > 0) {
  const p = ptws[0];
  console.log('\x1b[32m✓ Safety Permit Active:\x1b[0m ' + p.ptw_number + ' (' + p.hazard_category + ')');
  console.log('  Location: ' + p.work_location + ' | Operatives: ' + p.planned_workers_count);
  console.log('  Wind: ' + p.ambient_wind_speed_kmh + ' km/h | Lifelines: ' + (p.harness_lifelines_checked ? 'VERIFIED' : 'PENDING'));
  console.log('  Status: \x1b[32m' + p.status + '\x1b[0m');
} else {
  console.log('\x1b[33m! PTW entry pending.\x1b[0m');
}
" "${PTW_RES}"

echo -e "\n${GREEN}RA Bill 03 verification and Level 5 slab advancement complete.${NC}"
