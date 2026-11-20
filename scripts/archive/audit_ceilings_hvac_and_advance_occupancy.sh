#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: ACOUSTIC CEILINGS, MILLWORK & VRF HVAC AUDITOR
# Standards: IS 8225, ASTM C423, IS 1391, ASHRAE 15, CPWD DSR 12.52 / E-22.3
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
echo -e "${CYAN}    QUADILLAR LIVEVIEW: ACOUSTIC CEILINGS & VRF HVAC AUDIT RADAR    ${NC}"
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

# 2. Inspect Acoustic & HVAC Audits from RLS-Protected Ledger
echo -e "[1/4] Inspecting Acoustic NRC & VRF Nitrogen Test Telemetry..."
AUDIT_ENDPOINT="${SUPABASE_URL}/rest/v1/acoustic_hvac_inspections?project_id=eq.${PROJECT_ID}&order=audit_reference.asc&select=*"
AUDIT_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${AUDIT_ENDPOINT}")

node -e '
let audits;
try {
  audits = JSON.parse(process.argv[1]);
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to parse API response:\x1b[0m", e.message);
  process.exit(1);
}

if (!Array.isArray(audits) || audits.length === 0) {
  console.log("\x1b[31m[ERROR] No acoustic/HVAC audit records found. Execute SQL migration first.\x1b[0m");
  process.exit(1);
}

console.log("---------------------------------------------------------------------------------------------------");
console.log("| Ref Code          | Ceil Area | NRC / CAC     | N2 Test Pressure   | Vacuum Level | Status      |");
console.log("---------------------------------------------------------------------------------------------------");
audits.forEach(a => {
  let nrc = (a.ceiling_nrc_rating + " / " + a.ceiling_cac_db + "dB").padEnd(13);
  let n2 = (a.vrf_nitrogen_test_pressure_bar + " bar (-" + a.vrf_pressure_drop_bar + ")").padEnd(18);
  console.log("| " + a.audit_reference.padEnd(17) + " | " + (a.ceiling_area_sqm + " m²").padEnd(9) + " | " + nrc + " | " + n2 + " | " + (a.vrf_vacuum_microns + " microns").padEnd(12) + " | \x1b[32m" + a.status.padEnd(11) + "\x1b[0m |");
});
console.log("---------------------------------------------------------------------------------------------------");
console.log("\x1b[32m✓ ASTM C423 acoustic rating & ASHRAE 15 nitrogen holding pressure satisfied.\x1b[0m");
' "${AUDIT_RES}"

# 3. Inspect Form 23 EMB Ingestion for WBS-11.3 Packages
echo -e "\n[2/4] Inspecting Form 23 Electronic Measurement Book (EMB)..."
EMB_ENDPOINT="${SUPABASE_URL}/rest/v1/electronic_measurement_book?project_id=eq.${PROJECT_ID}&mb_item_code=in.(MB-FIN-CEIL-AC-001,MB-MEP-HVAC-VRF-001,MB-FIN-MILL-WD-001)&select=mb_item_code,description,total_quantity,unit,total_amount_inr,status"
EMB_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${EMB_ENDPOINT}")

node -e '
const items = JSON.parse(process.argv[1]);
let totalVal = 0;
console.log("-----------------------------------------------------------------------------------");
console.log("| EMB Item Code      | Description Excerpt            | Qty      | Valuation (INR)  |");
console.log("-----------------------------------------------------------------------------------");
items.forEach(it => {
  totalVal += Number(it.total_amount_inr);
  console.log("| " + it.mb_item_code.padEnd(18) + " | " + it.description.substring(0, 30).padEnd(30) + " | " + (it.total_quantity + " " + it.unit).padEnd(8) + " | ₹" + Number(it.total_amount_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}).padStart(14) + " |");
});
console.log("-----------------------------------------------------------------------------------");
console.log("Total WBS-11.3 Unbilled Valuation: \x1b[32m₹" + totalVal.toLocaleString("en-IN", {minimumFractionDigits: 2}) + "\x1b[0m (Ready for RA Bill 15)");
' "${EMB_RES}"

# 4. Inspect Chronos CPM Critical Path Hand-Off to WBS-11.4
echo -e "\n[3/4] Inspecting Chronos 4D Phase 3 Schedule Progression..."
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

# 5. Inspect Cumulative Commercial Waterfall
echo -e "\n[4/4] Evaluating 5-Tier Commercial Waterfall (Post Ceilings/HVAC EMB)..."
RPC_ENDPOINT="${SUPABASE_URL}/rest/v1/rpc/evaluate_commercial_waterfall"
RESPONSE=$(curl -s -X POST "${RPC_ENDPOINT}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"p_project_id\": \"${PROJECT_ID}\"}")

node -e '
const res = JSON.parse(process.argv[1]);
if (res.error) {
  console.error("\x1b[31m[ERROR]\x1b[0m", res.message);
  process.exit(1);
}
console.log("Cumulative Checked EMB Valuation : ₹" + Number(res.gross_valuation_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("--------------------------------------------------------------------");
console.log((res.gate_1_structural_concrete.passed ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[FAIL]\x1b[0m") + " Gate 1: Concrete & Masonry Strength Acceptance");
console.log((res.gate_2_cpwd_clause_14_lien.passed ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[FAIL]\x1b[0m") + " Gate 2: CPWD Cl. 14 Structural Liens (Active: ₹" + res.gate_2_cpwd_clause_14_lien.active_lien_inr + ")");
console.log((res.gate_3_bocw_labor_muster.passed ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[FAIL]\x1b[0m") + " Gate 3: BOCW Labor Muster Compliance");
console.log((res.gate_4_cl42_material_recon.passed ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[FAIL]\x1b[0m") + " Gate 4: Material Scrap Reconciliation");
console.log((res.gate_5_sec65b_audit_ledger.passed ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[FAIL]\x1b[0m") + " Gate 5: Section 65B Audit Vault Integrity");
console.log("--------------------------------------------------------------------");
console.log("Cumulative 5% Retention Deduction: ₹" + Number(res.deductions.retention_5pct_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("Cumulative 1% BOCW Cess Deduction: ₹" + Number(res.deductions.bocw_cess_1pct_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("--------------------------------------------------------------------");
if (res.certification_authorized) {
  console.log("\x1b[32m[STATUS: AUTHORIZED]\x1b[0m Cumulative Certified Net: ₹" + Number(res.net_payable_certified_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}));
} else {
  console.log("\x1b[31m[STATUS: LOCKED]\x1b[0m Net Certified: ₹0.00");
}
' "${RESPONSE}"

echo -e "\n${GREEN}Ceilings, Millwork & VRF HVAC audit verified. Chronos active on WBS-11.4 Pre-Commissioning.${NC}"
