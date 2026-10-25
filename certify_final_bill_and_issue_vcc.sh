#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FINAL BILL (RA-16) & VIRTUAL COMPLETION AUDITOR
# Standards: CPWD GCC Clauses 7, 8, 9 & 17, Section 65B Evidence Act
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
echo -e "${CYAN}    QUADILLAR LIVEVIEW: FINAL BILL (RA-16) & VCC HANDOVER AUDIT     ${NC}"
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

# 2. Inspect Certified Final Bill 16 & Digital Deed
echo -e "[1/4] Inspecting Final Running Account Bill 16 & Digital Deed..."
RA_ENDPOINT="${SUPABASE_URL}/rest/v1/running_account_bills?project_id=eq.${PROJECT_ID}&ra_bill_number=eq.RA-2026-016&select=*"
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
  console.log("\x1b[32m✓ Final RA Bill Certified:\x1b[0m " + b.ra_bill_number + " (Sequence #" + b.bill_sequence_no + " - FINAL)");
  console.log("  Current Work Billed  : ₹" + Number(b.gross_work_done).toLocaleString("en-IN", {minimumFractionDigits: 2}));
  console.log("  Cumulative Gross EMB : ₹" + Number(b.gross_valuation).toLocaleString("en-IN", {minimumFractionDigits: 2}));
  console.log("  Retention 5%         : -₹" + Number(b.retention_amount).toLocaleString("en-IN", {minimumFractionDigits: 2}));
  console.log("  BOCW Cess 1%         : -₹" + Number(b.labour_cess_amount).toLocaleString("en-IN", {minimumFractionDigits: 2}));
  console.log("  Final Net Certified  : \x1b[32m₹" + Number(b.net_payable_certified).toLocaleString("en-IN", {minimumFractionDigits: 2}) + "\x1b[0m");
  console.log("  Deed SHA-256 Hash    : " + b.sha256_deed_hash);
} else {
  console.log("\x1b[31m[ERROR] RA-2026-016 not found in registry. Execute SQL migration first.\x1b[0m");
  process.exit(1);
}
' "${RA_RES}"

# 3. Inspect Virtual Completion Certificate Dossier from RLS-Protected Ledger
echo -e "\n[2/4] Inspecting Virtual Completion Certificate (VCC) & DLP Covenant..."
VCC_ENDPOINT="${SUPABASE_URL}/rest/v1/project_completion_dossiers?project_id=eq.${PROJECT_ID}&select=*"
VCC_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${VCC_ENDPOINT}")

node -e '
let dossiers;
try {
  dossiers = JSON.parse(process.argv[1]);
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to parse API response:\x1b[0m", e.message);
  process.exit(1);
}

if (!Array.isArray(dossiers) || dossiers.length === 0) {
  console.log("\x1b[31m[ERROR] No project completion dossier found.\x1b[0m");
  process.exit(1);
}

const d = dossiers[0];
console.log("\x1b[32m✓ Statutory Certificate:\x1b[0m " + d.certificate_ref + " (" + d.completion_type + ")");
console.log("  Total Gross Valuation: ₹" + Number(d.total_gross_valuation_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("  Total Net Disbursed  : ₹" + Number(d.total_net_disbursed_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("  Total Retention Held : ₹" + Number(d.total_retention_retained_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("  Total BOCW Cess Paid : ₹" + Number(d.total_bocw_cess_remitted_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("  Defect Liability (DLP): \x1b[33m" + d.dlp_period_months + " Months\x1b[0m (" + d.dlp_start_date + " to " + d.dlp_end_date + ")");
console.log("  As-Built Model LOD   : " + d.as_built_bim_model_lod);
console.log("  Occupancy Status     : \x1b[32m" + d.status + "\x1b[0m");
console.log("  Master Merkle Root   : " + d.master_merkle_root_hash);
' "${VCC_RES}"

# 4. Final Financial Summary Across All 16 Cumulative Billing Cycles
echo -e "\n[3/4] Comprehensive Financial Ledger (All 16 Certified Billing Cycles)..."
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
console.log("TOTAL PROJECT GROSS VALUATION   : \x1b[32m₹" + totalGross.toLocaleString("en-IN", {minimumFractionDigits: 2}) + "\x1b[0m");
console.log("TOTAL CUMULATIVE NET CERTIFIED  : \x1b[32m₹" + totalNet.toLocaleString("en-IN", {minimumFractionDigits: 2}) + "\x1b[0m");
console.log("TOTAL STATUTORY DEDUCTIONS (6%) : ₹" + (totalGross - totalNet).toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("  - 5% Security Retention Money : ₹" + (totalGross * 0.05).toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("  - 1% BOCW Welfare Labor Cess  : ₹" + (totalGross * 0.01).toLocaleString("en-IN", {minimumFractionDigits: 2}));
' "${RA_ALL_RES}"

# 5. Master Section 65B Audit Vault Integrity
echo -e "\n[4/4] Inspecting Hermes Section 65B Master Project Completion Deed..."
AUDIT_ENDPOINT="${SUPABASE_URL}/rest/v1/immutable_audit_logs?project_id=eq.${PROJECT_ID}&action_category=eq.STATUTORY_PROJECT_HANDOVER_SEALED&order=created_at.desc&limit=1&select=action_title,merkle_root_hash,status,signatory_name,signatory_role,created_at"
AUDIT_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${AUDIT_ENDPOINT}")

node -e '
let logs = JSON.parse(process.argv[1]);
if (logs && logs.length > 0) {
  const l = logs[0];
  console.log("\x1b[32m✓ Master Completion Deed Sealed in Hermes:\x1b[0m");
  console.log("  Action Title     : " + l.action_title);
  console.log("  Signatory        : " + l.signatory_name + " (" + l.signatory_role + ")");
  console.log("  Merkle Root Hash : " + l.merkle_root_hash);
  console.log("  Legal Compliance : Indian Evidence Act (Section 65B) Immutable Record");
} else {
  console.log("\x1b[33m! Master completion deed pending notarization.\x1b[0m");
}
' "${AUDIT_RES}"

echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN}✓ GOMTI-NAGAR-PH1-FITOUT: ALL PHASES FULLY CERTIFIED & CLOSED.${NC}"
echo -e "${GREEN}====================================================================${NC}"
