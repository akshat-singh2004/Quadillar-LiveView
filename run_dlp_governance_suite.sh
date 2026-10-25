#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: EXECUTE DLP FACILITY DASHBOARD & Q1 GOVERNANCE AUDIT SUITE
# Standards: CPWD GCC Clause 17 & Clause 45, Section 63/65B BSA Evidence
# ==============================================================================

set -euo pipefail

# 1. Source environment variables
if [ -f .env.local ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^#.* ]] && continue
    [[ -z "$line" ]] && continue
    export "$line"
  done < .env.local
fi

export PROJECT_ID="${PROJECT_ID:-LUCKNOW-TECHPARK-PH1}"
export TARGET_PROJECT_ID="${TARGET_PROJECT_ID:-LUCKNOW-TECHPARK-PH1}"
export SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
export SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}}"

echo "===================================================================="
echo "    [1/2] RUNNING DLP FACILITY DASHBOARD & PPM CYCLE 1 VERIFICATION "
echo "===================================================================="
if [ -f "verify_dlp_facility_dashboard_and_ppm_execution.sh" ]; then
  chmod +x verify_dlp_facility_dashboard_and_ppm_execution.sh
  ./verify_dlp_facility_dashboard_and_ppm_execution.sh
else
  echo "[WARN] verify_dlp_facility_dashboard_and_ppm_execution.sh not found."
fi

echo -e "\n===================================================================="
echo "    [2/2] EXECUTING Q1 DLP GOVERNANCE COMPLIANCE DOSSIER RPC        "
echo "===================================================================="
if [ -f "audit_facility_governance_and_quarterly_dossier.sh" ]; then
  chmod +x audit_facility_governance_and_quarterly_dossier.sh
  ./audit_facility_governance_and_quarterly_dossier.sh
else
  echo "[WARN] audit_facility_governance_and_quarterly_dossier.sh not found."
fi
echo "===================================================================="
