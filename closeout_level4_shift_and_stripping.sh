#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: SHIFT CLOSEOUT, DE-SHUTTERING & WATERFALL RE-CALIBRATION
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
echo -e "${CYAN}    QUADILLAR LIVEVIEW: SHIFT CLOSEOUT & WATERFALL RE-EVALUATION   ${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "Project Target : ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Closeout Date  : $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# 1. Load Configurations
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
  SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}"
  SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_KEY}"
fi

# 2. Check DPR Status
echo -e "[1/3] Auditing Daily Progress Report (DPR) & Biometric Manpower..."
DPR_ENDPOINT="${SUPABASE_URL}/rest/v1/daily_progress_reports?project_id=eq.${PROJECT_ID}&report_date=eq.$(date +%Y-%m-%d)&select=dpr_code,total_manpower,cumulative_man_hours,status,safety_incidents_count"
DPR_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${DPR_ENDPOINT}")

node -e "
const dprs = JSON.parse(process.argv[1]);
if (dprs && dprs.length > 0) {
  const d = dprs[0];
  console.log('\x1b[32m✓ DPR Sealed:\x1b[0m ' + d.dpr_code + ' | Operatives: ' + d.total_manpower + ' (' + d.cumulative_man_hours + ' Man-hrs)');
  console.log('  Safety Incidents: ' + d.safety_incidents_count + ' | Status: ' + d.status);
} else {
  console.log('\x1b[33m! No DPR recorded for today.\x1b[0m');
}
" "${DPR_RES}"

# 3. Check Permit Closeout
echo -e "\n[2/3] Auditing Safety Permit to Work (PTW) Closeout..."
PTW_ENDPOINT="${SUPABASE_URL}/rest/v1/safety_permit_to_work?project_id=eq.${PROJECT_ID}&ptw_number=eq.PTW-2026-HSE-109&select=ptw_number,hazard_category,status,closed_at"
PTW_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PTW_ENDPOINT}")

node -e "
const ptws = JSON.parse(process.argv[1]);
if (ptws && ptws.length > 0) {
  const p = ptws[0];
  console.log('\x1b[32m✓ PTW Status:\x1b[0m ' + p.ptw_number + ' (' + p.hazard_category + ') -> Status: \x1b[32m' + p.status + '\x1b[0m');
  console.log('  Closed At: ' + p.closed_at);
} else {
  console.log('\x1b[33m! PTW record missing.\x1b[0m');
}
" "${PTW_RES}"

# 4. Re-Evaluate 5-Tier Commercial Waterfall with Level 4 EMB Addition
echo -e "\n[3/3] Re-evaluating Commercial Waterfall (including Level 4 EMB Entry)..."
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
console.log((res.gate_2_cpwd_clause_14_lien.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m') + ' Gate 2: Zero Structural Debit Liens (Active: ₹' + res.gate_2_cpwd_clause_14_lien.active_lien_inr + ')');
console.log((res.gate_3_bocw_labor_muster.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m') + ' Gate 3: BOCW Muster Roll Compliance');
console.log((res.gate_4_cl42_material_recon.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m') + ' Gate 4: Material & Rebar Scrap Nesting');
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

echo -e "\n${GREEN}Shift closeout and commercial verification complete.${NC}"
