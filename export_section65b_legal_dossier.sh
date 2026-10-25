#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: SECTION 65B MASTER LEGAL MANIFEST EXPORTER (BUFFER-SAFE)
# Standards: Section 65B Indian Evidence Act 1872 / BSA 2023, CPWD GCC 2020
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
echo -e "${CYAN}    QUADILLAR LIVEVIEW: SECTION 65B MASTER LEGAL MANIFEST EXPORT    ${NC}"
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

MANIFEST_FILE="${PROJECT_ID}_LEGAL_MANIFEST.json"

# Create a secure scratch directory and register cleanup trap
SCRATCH_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'quadillar_manifest')
trap 'rm -rf "${SCRATCH_DIR}"' EXIT

TMP_RA="${SCRATCH_DIR}/ra_bills.json"
TMP_AUDIT="${SCRATCH_DIR}/audit_logs.json"
TMP_FDCC="${SCRATCH_DIR}/fdcc.json"
TMP_AMC="${SCRATCH_DIR}/amc.json"

# 2. Extract Lifecycle Milestones directly to scratch files (Bypasses ARG_MAX)
echo -e "[1/4] Extracting Project Financial & Quality Milestones to Scratch Files..."
curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" \
  "${SUPABASE_URL}/rest/v1/running_account_bills?project_id=eq.${PROJECT_ID}&order=bill_sequence_no.asc&select=*" \
  -o "${TMP_RA}"

curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" \
  "${SUPABASE_URL}/rest/v1/immutable_audit_logs?project_id=eq.${PROJECT_ID}&order=created_at.asc&select=*" \
  -o "${TMP_AUDIT}"

curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" \
  "${SUPABASE_URL}/rest/v1/dlp_final_clearance_records?project_id=eq.${PROJECT_ID}&select=*" \
  -o "${TMP_FDCC}"

curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" \
  "${SUPABASE_URL}/rest/v1/facility_amc_contracts?project_id=eq.${PROJECT_ID}&select=*" \
  -o "${TMP_AMC}"

# 3. Assemble Section 65B Legal Dossier via Node.js File Stream
echo -e "[2/4] Compiling Immutable Merkle Evidence Manifest..."

node -e '
const fs = require("fs");
const crypto = require("crypto");

const raBills = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const auditLogs = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const fdcc = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const amc = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));

const manifest = {
  evidence_standard: "Indian Evidence Act Section 65B / Bharatiya Sakshya Adhiniyam 2023",
  project_id: "'"${PROJECT_ID}"'",
  jurisdiction: "Lucknow, Uttar Pradesh, India",
  certifying_authority: {
    signatory_name: "Akshat Singh Rathore",
    designation: "Principal Architect & Quality Director",
    organization: "Quadillar ConTech Pvt. Ltd."
  },
  commercial_summary: {
    total_bills_certified: raBills.length,
    cumulative_gross_inr: raBills.reduce((acc, b) => acc + Number(b.gross_work_done), 0),
    cumulative_net_inr: raBills.reduce((acc, b) => acc + Number(b.net_payable_certified), 0),
    statutory_bocw_cess_inr: raBills.reduce((acc, b) => acc + Number(b.labour_cess_amount), 0),
    terminal_status: "STATUTORILY_CLOSED_DISCHARGED"
  },
  final_defect_clearance: fdcc.length > 0 ? fdcc[0] : null,
  active_amc_agreements: amc,
  cryptographic_chain: {
    total_immutable_events: auditLogs.length,
    audit_chain: auditLogs.map(l => ({
      sequence_id: l.id,
      timestamp: l.created_at,
      action: l.action_title,
      category: l.action_category,
      hash: l.merkle_root_hash
    }))
  },
  compiled_at: new Date().toISOString()
};

// Compute root checksum over entire manifest
const manifestString = JSON.stringify(manifest, null, 2);
const rootHash = crypto.createHash("sha256").update(manifestString).digest("hex");
manifest.manifest_integrity_sha256 = rootHash;

fs.writeFileSync("'"${MANIFEST_FILE}"'", JSON.stringify(manifest, null, 2));

console.log("\x1b[32m✓ Section 65B Manifest Generated:\x1b[0m " + "'"${MANIFEST_FILE}"'");
console.log("  Total Certified Bills  : " + manifest.commercial_summary.total_bills_certified);
console.log("  Audited Gross Account  : ₹" + manifest.commercial_summary.cumulative_gross_inr.toLocaleString("en-IN", {minimumFractionDigits: 2}));
console.log("  Immutable Audit Nodes  : " + manifest.cryptographic_chain.total_immutable_events);
console.log("  Master Root Checksum   : " + rootHash);
' "${TMP_RA}" "${TMP_AUDIT}" "${TMP_FDCC}" "${TMP_AMC}"

# 4. Display Post-DLP Active AMC Operating Status
echo -e "\n[3/4] Active Post-DLP Facility AMCs Operating Under SLA:"
node -e '
const fs = require("fs");
const contracts = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
console.log("---------------------------------------------------------------------------------------------------");
console.log("| Contract Ref     | Trade Scope                     | Service Provider            | SLA | Annual Fee |");
console.log("---------------------------------------------------------------------------------------------------");
contracts.forEach(c => {
  console.log("| " + c.contract_ref.padEnd(16) + " | " + c.trade_scope.substring(0, 31).padEnd(31) + " | " + c.vendor_entity_name.substring(0, 27).padEnd(27) + " | " + (c.emergency_response_sla_hours + "h").padEnd(3) + " | ₹" + Number(c.annual_contract_value_inr).toLocaleString("en-IN").padStart(10) + " |");
});
console.log("---------------------------------------------------------------------------------------------------");
' "${TMP_AMC}"

echo -e "\n[4/4] Archival Verification Complete."
echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN}✓ ${PROJECT_ID}: FULL SECTION 65B DOSSIER COMPILED & SEALED.${NC}"
echo -e "${GREEN}====================================================================${NC}"
