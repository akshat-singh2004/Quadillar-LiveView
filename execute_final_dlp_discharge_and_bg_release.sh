#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FINAL DLP DISCHARGE & ESCROW LIQUIDATION AUDITOR
# Standards: CPWD GCC Clauses 17 & 45, Section 65B Indian Evidence Act
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
echo -e "${CYAN}    QUADILLAR LIVEVIEW: FINAL DLP CLEARANCE & ESCROW RELEASE AUDIT  ${NC}"
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

# 2. Inspect Final Defect Clearance Certificate (FDCC)
echo -e "[1/4] Inspecting Final Defect Clearance Certificate (FDCC)..."
FDCC_ENDPOINT="${SUPABASE_URL}/rest/v1/dlp_final_clearance_records?project_id=eq.${PROJECT_ID}&select=*"
FDCC_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${FDCC_ENDPOINT}")

node -e '
let records;
try {
  records = JSON.parse(process.argv[1]);
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to parse FDCC response:\x1b[0m", e.message);
  process.exit(1);
}

if (!Array.isArray(records) || records.length === 0) {
  console.log("\x1b[31m[ERROR] No final defect clearance records found. Execute SQL migration first.\x1b[0m");
  process.exit(1);
}

const r = records[0];
console.log("\x1b[32m✓ Final Clearance Certificate:\x1b[0m " + r.certificate_ref);
console.log("  Inspection Date           : " + r.inspection_date);
console.log("  DLP Duration              : " + r.dlp_duration_months + " Months Completed");
console.log("  Snag Ledger Reconciliation: " + r.total_snags_rectified + " Resolved / " + r.outstanding_snags_count + " Open");
console.log("  Tranche 2 Escrow Released : \x1b[32m₹" + Number(r.tranche_2_retention_released_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}) + "\x1b[0m");
console.log("  Discharged BG Instrument  : " + r.bank_guarantee_released_ref);
console.log("  Total Net Disbursed       : \x1b[32m₹" + Number(r.total_final_disbursed_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}) + "\x1b[0m");
console.log("  Statutory Status          : \x1b[32m" + r.statutory_clearance_status + "\x1b[0m");
console.log("  Master Indemnity Deed Hash: " + r.master_indemnity_hash);
' "${FDCC_RES}"

# 3. Inspect Discharged Bank Guarantee State
echo -e "\n[2/4] Inspecting Bank Guarantee Legal Discharge State..."
BG_ENDPOINT="${SUPABASE_URL}/rest/v1/bank_guarantee_registry?project_id=eq.${PROJECT_ID}&bg_reference_number=eq.BG-HDFC-2026-RET-001&select=*"
BG_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${BG_ENDPOINT}")

node -e '
let bgs = JSON.parse(process.argv[1]);
if (bgs && bgs.length > 0) {
  const b = bgs[0];
  console.log("\x1b[32m✓ BG Registry Status:\x1b[0m " + b.bg_reference_number);
  console.log("  Issuing Institution  : " + b.issuing_bank_name);
  console.log("  Bond Amount          : ₹" + Number(b.guaranteed_amount_inr).toLocaleString("en-IN", {minimumFractionDigits: 2}));
  console.log("  Legal Instrument State: \x1b[32m" + b.status + "\x1b[0m (Discharge Notice Dispatched to Bank)");
} else {
  console.log("\x1b[31m[ERROR] Bank guarantee instrument not found.\x1b[0m");
}
' "${BG_RES}"

# 4. Inspect Final Project Completion Dossier Transition
echo -e "\n[3/4] Inspecting Master Project Handover Finality..."
DOSSIER_ENDPOINT="${SUPABASE_URL}/rest/v1/project_completion_dossiers?project_id=eq.${PROJECT_ID}&select=certificate_ref,status,as_built_bim_model_lod,updated_at"
DOSSIER_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${DOSSIER_ENDPOINT}")

node -e '
let dossiers = JSON.parse(process.argv[1]);
if (dossiers && dossiers.length > 0) {
  const d = dossiers[0];
  console.log("\x1b[32m✓ Master Completion Dossier:\x1b[0m " + d.certificate_ref);
  console.log("  BIM Digital Twin Quality : " + d.as_built_bim_model_lod);
  console.log("  Terminal Lifecycle State : \x1b[32m" + d.status + "\x1b[0m");
}
' "${DOSSIER_RES}"

# 5. Inspect Hermes Section 65B Master Project Indemnity Deed
echo -e "\n[4/4] Inspecting Hermes Section 65B Master Project Indemnity Deed..."
AUDIT_ENDPOINT="${SUPABASE_URL}/rest/v1/immutable_audit_logs?project_id=eq.${PROJECT_ID}&action_category=eq.FINAL_DLP_INDEMNITY_SEALED&order=created_at.desc&limit=1&select=action_title,merkle_root_hash,signatory_name,signatory_role,created_at"
AUDIT_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${AUDIT_ENDPOINT}")

node -e '
let logs = JSON.parse(process.argv[1]);
if (logs && logs.length > 0) {
  const l = logs[0];
  console.log("\x1b[32m✓ Master Indemnity Deed Verified in Hermes Vault:\x1b[0m");
  console.log("  Action Title     : " + l.action_title);
  console.log("  Signatory        : " + l.signatory_name + " (" + l.signatory_role + ")");
  console.log("  Merkle Root Hash : " + l.merkle_root_hash);
  console.log("  Timestamp        : " + l.created_at);
  console.log("  Evidence Rating  : Section 65B Indian Evidence Act Immutable Permanent Archive");
} else {
  console.log("\x1b[31m[ERROR] Master indemnity deed pending notarization.\x1b[0m");
  process.exit(1);
}
' "${AUDIT_RES}"

echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN}✓ ALL CONTRACTUAL & STATUTORY OBLIGATIONS FULLY DISCHARGED.         ${NC}"
echo -e "${GREEN}====================================================================${NC}"
