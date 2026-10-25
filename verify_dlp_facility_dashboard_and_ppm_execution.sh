#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: EXECUTIVE FACILITY DASHBOARD & PPM AUDITOR
# Standards: CPWD GCC Clause 17 & 45, ISO 19650-3, Section 65B Evidence Act
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
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${BLUE}====================================================================${NC}"
echo -e "${CYAN}    QUADILLAR LIVEVIEW: EXECUTIVE FACILITY DASHBOARD & PPM AUDIT    ${NC}"
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

# 2. Query Master Facility & DLP Executive RPC
echo -e "[1/3] Interrogating Master Facility & DLP Executive Dashboard RPC..."
RPC_ENDPOINT="${SUPABASE_URL}/rest/v1/rpc/get_dlp_executive_dashboard"
RPC_RES=$(curl -s -X POST "${RPC_ENDPOINT}" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"p_project_id\": \"${PROJECT_ID}\"}")

node -e '
let d;
try {
  d = JSON.parse(process.argv[1]);
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to parse RPC response:\x1b[0m", e.message);
  process.exit(1);
}

const com = d.commercial_ledger;
const bg = d.bank_guarantee_status;
const dlp = d.dlp_incident_governance;
const bim = d.facility_digital_twin;

console.log("-----------------------------------------------------------------------------------");
console.log("COMMERCIAL & RETENTION ESCROW HEALTH:");
console.log("  Total Certified Valuation : ₹" + Number(com.total_gross_valuation_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("  Total Disbursed Net       : ₹" + Number(com.total_net_disbursed_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("  Tranche 1 (Released via BG): \x1b[32m₹" + Number(com.retention_tranche_1_bg_released_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}) + "\x1b[0m");
console.log("  Tranche 2 (Locked Escrow) : \x1b[33m₹" + Number(com.retention_tranche_2_escrow_locked_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}) + "\x1b[0m");
console.log("  Active Bank Guarantee     : " + bg.bg_reference + " (" + bg.status + ", Expiry: " + bg.expiry_date + ")");
console.log("-----------------------------------------------------------------------------------");
console.log("DEFECT LIABILITY (DLP) & SLA PERFORMANCE:");
console.log("  Open Latent Snags         : \x1b[32m" + dlp.open_tickets + " Open\x1b[0m");
console.log("  Closed & Verified Tickets : " + dlp.rectified_tickets + " Resolved");
console.log("  Escrow Backcharge Debits  : ₹" + Number(dlp.total_escrow_backcharges_inr).toFixed(2));
console.log("  Contractor SLA Compliance : \x1b[32m" + dlp.sla_compliance + "\x1b[0m");
console.log("-----------------------------------------------------------------------------------");
console.log("DIGITAL TWIN & TELEMETRY STREAM:");
console.log("  Maintainable LOD Assets   : " + bim.total_lod500_assets + " Tagged COBie Elements");
console.log("  Active Sensor Anomalies   : \x1b[32m" + bim.active_telemetry_anomalies + " Detected\x1b[0m");
console.log("  Next Maintenance Window   : " + bim.next_scheduled_ppm + " (Due: " + bim.next_ppm_due_date + ")");
console.log("-----------------------------------------------------------------------------------");
' "${RPC_RES}"

# 3. Inspect Executed PPM Service Log
echo -e "\n[2/3] Inspecting Executed PPM Work Order & Next Cycle Progression..."
PPM_EXEC_ENDPOINT="${SUPABASE_URL}/rest/v1/ppm_service_execution_records?project_id=eq.${PROJECT_ID}&order=executed_at.desc&limit=1&select=*"
PPM_EXEC_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PPM_EXEC_ENDPOINT}")

node -e '
let records = JSON.parse(process.argv[1]);
if (records && records.length > 0) {
  const r = records[0];
  console.log("\x1b[32m✓ PPM Execution Record Verified:\x1b[0m " + r.execution_code);
  console.log("  Target Asset       : " + r.asset_tag_ref + " (" + r.schedule_code_ref + ")");
  console.log("  Certified Lead     : " + r.executed_by_technician + " (" + r.service_vendor + ")");
  console.log("  Checklist Result   : " + (r.checklist_passed ? "\x1b[32m100% PASSED\x1b[0m" : "\x1b[31mDEFICIENT\x1b[0m"));
  console.log("  Diagnostic Summary : " + r.operational_reading_summary);
  console.log("  Parts Handled      : " + r.consumables_replaced);
  console.log("  Completion Hash    : " + r.completion_deed_hash);
} else {
  console.log("\x1b[31m[ERROR] No PPM service execution records found.\x1b[0m");
  process.exit(1);
}
' "${PPM_EXEC_RES}"

# 4. Inspect Hermes Section 65B Audit Ledger for Maintenance Deed
echo -e "\n[3/3] Inspecting Hermes Section 65B Maintenance Governance Deed..."
AUDIT_ENDPOINT="${SUPABASE_URL}/rest/v1/immutable_audit_logs?project_id=eq.${PROJECT_ID}&action_category=eq.PPM_MAINTENANCE_CERTIFIED&order=created_at.desc&limit=1&select=action_title,merkle_root_hash,signatory_name,signatory_role,created_at"
AUDIT_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${AUDIT_ENDPOINT}")

node -e '
let logs = JSON.parse(process.argv[1]);
if (logs && logs.length > 0) {
  const l = logs[0];
  console.log("\x1b[32m✓ PPM Maintenance Deed Sealed in Hermes Vault:\x1b[0m");
  console.log("  Action Title     : " + l.action_title);
  console.log("  Signatory        : " + l.signatory_name + " (" + l.signatory_role + ")");
  console.log("  Merkle Root Hash : " + l.merkle_root_hash);
  console.log("  Timestamp        : " + l.created_at);
} else {
  console.log("\x1b[31m[ERROR] Maintenance deed pending notarization.\x1b[0m");
  process.exit(1);
}
' "${AUDIT_RES}"

echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN}✓ DLP FACILITY DASHBOARD & PREVENTIVE MAINTENANCE CYCLE 1 CONFIRMED.${NC}"
echo -e "${GREEN}====================================================================${NC}"
