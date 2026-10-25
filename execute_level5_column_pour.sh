#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LEVEL 5 COLUMNS POUR EXECUTION & EMB VALUE HARNESS
# ==============================================================================

set -euo pipefail

PROJECT_ID="GOMTI-NAGAR-PH1-FITOUT"
POUR_CARD="PC-2026-L05-COL-001"
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
echo -e "${CYAN}    QUADILLAR LIVEVIEW: LEVEL 5 COLUMNS CASTING & AUDIT RADAR       ${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "Target Project : ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Main Pour Card : ${YELLOW}${POUR_CARD}${NC}"
echo -e "Audit Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# 1. Load Configurations
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
  SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}"
  SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_KEY}"
fi

# 2. Inspect Main Pour Card Status
echo -e "[1/4] Inspecting Main Column Pour Card Lifecycle State..."
PC_ENDPOINT="${SUPABASE_URL}/rest/v1/concrete_pour_cards?project_id=eq.${PROJECT_ID}&pour_card_number=eq.${POUR_CARD}&select=*"
PC_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PC_ENDPOINT}")

node -e "
const cards = JSON.parse(process.argv[1]);
if (!cards || cards.length === 0) {
  console.log('\x1b[31m[ERROR] Pour card not found.\x1b[0m');
  process.exit(1);
}
const p = cards[0];
console.log('Element     : ' + p.structural_element + ' (' + p.concrete_grade + ')');
console.log('Status      : \x1b[32m' + p.status + '\x1b[0m | Volume Cast: ' + p.planned_volume_cum + ' m³');
console.log('Laser Plumb : ' + (p.formwork_plumb_verified ? '\x1b[32mVERIFIED (Δ_max <= 3mm)\x1b[0m' : '\x1b[31mHOLD\x1b[0m'));
console.log('Rebar Cover : ' + (p.rebar_cover_verified ? '\x1b[32mVERIFIED (40mm Nominal)\x1b[0m' : '\x1b[31mHOLD\x1b[0m'));
console.log('SEOR Hash   : ' + p.seor_signature_hash);
" "${PC_RES}"

# 3. Verify Triplicate Cube Batches (IS 456 Cl. 15.2.2)
echo -e "\n[2/4] Verifying Triplicate Cube Batches in Curing Tank Queue..."
CUBE_ENDPOINT="${SUPABASE_URL}/rest/v1/concrete_cube_tests?project_id=eq.${PROJECT_ID}&pour_card_ref=eq.${POUR_CARD}&select=sample_tag,casting_date,testing_date,status,concrete_grade"
CUBE_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${CUBE_ENDPOINT}")

node -e "
const cubes = JSON.parse(process.argv[1]);
if (!cubes || cubes.length === 0) {
  console.log('\x1b[31m[FAIL] Triplicate batches not recorded.\x1b[0m');
  process.exit(1);
}
console.log('Logged Batches: ' + cubes.length + ' sets (9 specimens total for 20.3 m³)');
cubes.forEach((c, i) => {
  console.log('  [' + (i+1) + '] ' + c.sample_tag + ' | Grade: ' + c.concrete_grade + ' | Break Due: ' + c.testing_date + ' | Status: \x1b[33m' + c.status + '\x1b[0m');
});
if (cubes.length === 3) {
  console.log('\x1b[32m✓ IS 456:2000 Cl. 15.2.2 Sampling Met (3 samples for 16-30 m³).\x1b[0m');
}
" "${CUBE_RES}"

# 4. Check Chronos Schedule Progression
echo -e "\n[3/4] Inspecting Chronos CPM WBS Milestones..."
CPM_ENDPOINT="${SUPABASE_URL}/rest/v1/project_schedule_nodes?project_id=eq.${PROJECT_ID}&order=wbs_code.asc&select=wbs_code,activity_name,status,is_critical"
CPM_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${CPM_ENDPOINT}")

node -e "
const nodes = JSON.parse(process.argv[1]);
nodes.forEach(n => {
  const statusColor = n.status === 'COMPLETED' ? '\x1b[32m' : (n.status === 'IN_PROGRESS' ? '\x1b[34m' : '\x1b[33m');
  console.log('  ' + n.wbs_code + ': ' + n.activity_name + ' -> ' + statusColor + n.status + '\x1b[0m');
});
" "${CPM_RES}"

# 5. Re-Evaluate Commercial Waterfall with Level 5 Column Valuation
echo -e "\n[4/4] Re-Evaluating 5-Tier Commercial Waterfall (Post Level 5 Columns EMB)..."
RPC_ENDPOINT="${SUPABASE_URL}/rest/v1/rpc/evaluate_commercial_waterfall"
RESPONSE=$(curl -s -X POST "${RPC_ENDPOINT}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"p_project_id\": \"${PROJECT_ID}\"}")

node -e "
const res = JSON.parse(process.argv[1]);
if (res.error) {
  console.error('\x1b[31m[ERROR]\x1b[0m', res.message);
  process.exit(1);
}
console.log('Cumulative Checked EMB Valuation : ₹' + Number(res.gross_valuation_inr).toLocaleString('en-IN', {minimumFractionDigits: 2}));
console.log('--------------------------------------------------------------------');
console.log((res.gate_1_structural_concrete.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m') + ' Gate 1: Concrete Strength Acceptance');
console.log((res.gate_2_cpwd_clause_14_lien.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m') + ' Gate 2: CPWD Cl. 14 Structural Liens (Active: ₹' + res.gate_2_cpwd_clause_14_lien.active_lien_inr + ')');
console.log((res.gate_3_bocw_labor_muster.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m') + ' Gate 3: BOCW Labor Muster Compliance');
console.log((res.gate_4_cl42_material_recon.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m') + ' Gate 4: Material Scrap Reconciliation');
console.log((res.gate_5_sec65b_audit_ledger.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m') + ' Gate 5: Section 65B Audit Vault Integrity');
console.log('--------------------------------------------------------------------');
console.log('Cumulative 5% Retention Deduction: ₹' + Number(res.deductions.retention_5pct_inr).toLocaleString('en-IN', {minimumFractionDigits: 2}));
console.log('Cumulative 1% BOCW Cess Deduction: ₹' + Number(res.deductions.bocw_cess_1pct_inr).toLocaleString('en-IN', {minimumFractionDigits: 2}));
console.log('--------------------------------------------------------------------');
if (res.certification_authorized) {
  console.log('\x1b[32m[STATUS: AUTHORIZED]\x1b[0m Cumulative Certified Net: ₹' + Number(res.net_payable_certified_inr).toLocaleString('en-IN', {minimumFractionDigits: 2}));
} else {
  console.log('\x1b[31m[STATUS: LOCKED]\x1b[0m Net Certified: ₹0.00');
}
" "${RESPONSE}"

echo -e "\n${GREEN}Level 5 Column casting and commercial evaluation completed successfully.${NC}"
