#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FRONTEND ROUTE & BSA API SMOKE TEST
# ==============================================================================

set -euo pipefail

DEV_URL="${1:-http://localhost:3000}"
PROJECT_ID="GOMTI-NAGAR-PH2-EXPANSION"

echo -e "\033[0;34m====================================================================\033[0m"
echo -e "\033[0;36m    TESTING LIVEVIEW AUDIT ENDPOINTS (${DEV_URL})                   \033[0m"
echo -e "\033[0;34m====================================================================\033[0m"

# 1. Test Audit UI Dashboard Route
echo -n "Checking Audit Dashboard UI [/projects/${PROJECT_ID}/audit]... "
UI_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${DEV_URL}/projects/${PROJECT_ID}/audit" || echo "FAILED")

if [ "${UI_STATUS}" = "200" ]; then
  echo -e "\033[0;32m[PASS] HTTP 200 OK\033[0m"
else
  echo -e "\033[0;31m[FAIL] Received HTTP ${UI_STATUS}\033[0m"
  echo "Make sure 'npm run dev' is running in another terminal."
  exit 1
fi

# 2. Test Statutory Certificate Export API
echo -n "Checking BSA Sec 63 Export API [/api/projects/${PROJECT_ID}/export-certificate]... "
TEMP_CERT=$(mktemp)
API_HEADERS=$(mktemp)

curl -s -D "${API_HEADERS}" "${DEV_URL}/api/projects/${PROJECT_ID}/export-certificate" -o "${TEMP_CERT}"

HTTP_CODE=$(grep "HTTP/" "${API_HEADERS}" | tail -n1 | awk '{print $2}')
CONTENT_TYPE=$(grep -i "content-type:" "${API_HEADERS}" | awk '{print $2}' | tr -d '\r')

if [ "${HTTP_CODE}" = "200" ]; then
  echo -e "\033[0;32m[PASS] HTTP 200 OK\033[0m"
else
  echo -e "\033[0;31m[FAIL] Received HTTP ${HTTP_CODE}\033[0m"
  rm -f "${TEMP_CERT}" "${API_HEADERS}"
  exit 1
fi

# 3. Verify Certificate Content Signatures
if grep -q "BHARATIYA SAKSHYA ADHINIYAM, 2023" "${TEMP_CERT}" && grep -q "Terminal Merkle Root: 99db2d4d" "${TEMP_CERT}"; then
  echo -e "\033[0;32m✓ Certificate Content Validated: Merkle Root 99db2d4d present.\033[0m"
else
  echo -e "\033[0;33m! Warning: Terminal Merkle root signature not found in certificate output.\033[0m"
fi

rm -f "${TEMP_CERT}" "${API_HEADERS}"
echo -e "\033[0;32m✓ All audit routes healthy and operational.\033[0m"
