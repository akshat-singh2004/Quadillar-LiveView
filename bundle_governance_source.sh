#!/usr/bin/env bash
set -e

BUNDLE_FILE="council_governance_source_bundle.txt"
echo -e "\033[1;36m[+] Packaging system codebase into ${BUNDLE_FILE}...\033[0m"

cat << 'HEADER' > "$BUNDLE_FILE"
================================================================================
 QUADILLAR LIVEVIEW • AUTONOMOUS DIGITAL GOVERNANCE ARCHITECTURE
 CONSOLIDATED SYSTEM CODEBASE BUNDLE
 Section 65B (IEA 1872) / FIDIC Red Book / CPWD Works Manual Compliant
================================================================================
Generated Date : Mon, Oct 05, 2026
Location       : Lucknow, Uttar Pradesh, India
Platform Stack : Next.js (App Router), TypeScript, Supabase, Hermes Merkle Ledger
================================================================================

HEADER

# Core governance engine files to bundle
FILES_TO_BUNDLE=(
  "lib/agents/hermes.ts"
  "lib/agents/synapse.ts"
  "lib/agents/synapse-daemon.ts"
  "app/actions/council-actions.ts"
  "app/actions/cube-actions.ts"
  "app/actions/dpr-actions.ts"
  "app/actions/cure-notice-actions.ts"
  "app/actions/arbitration-actions.ts"
  "app/actions/gate-pass-actions.ts"
  "app/actions/scan-actions.ts"
  "app/api/telemetry/ingress/route.ts"
  "app/api/synapse/daemon/route.ts"
  "app/api/cron/shift-closeout/route.ts"
  "components/layout/CouncilNavigationShell.tsx"
  "components/governance/SynapseRealtimeAlertListener.tsx"
  "components/labor/GenerateGatePassModal.tsx"
  "components/commercial/IssueCureNoticeModal.tsx"
  "app/labor/scan/page.tsx"
  "app/governance/arbitration/petition/page.tsx"
  "scripts/test-iot-telemetry-ingress.ts"
  "scripts/test-shift-closeout-cron.ts"
  "scripts/simulate-dashboard-benchmarks.ts"
)

for f in "${FILES_TO_BUNDLE[@]}"; do
  if [ -f "$f" ]; then
    echo -e "  + Packaging: $f"
    echo "" >> "$BUNDLE_FILE"
    echo "================================================================================" >> "$BUNDLE_FILE"
    echo " FILE: $f" >> "$BUNDLE_FILE"
    echo "================================================================================" >> "$BUNDLE_FILE"
    cat "$f" >> "$BUNDLE_FILE"
    echo "" >> "$BUNDLE_FILE"
  else
    echo -e "  \033[1;33m[!] Skipped (not found): $f\033[0m"
  fi
done

TOTAL_LINES=$(wc -l < "$BUNDLE_FILE")
FILE_SIZE=$(du -h "$BUNDLE_FILE" | cut -f1)

echo ""
echo -e "\033[1;32m======================================================================\033[0m"
echo -e "\033[1;32m  [✓] SOURCE ARCHIVE EXPORTED SUCCESSFULLY                            \033[0m"
echo -e "\033[1;32m======================================================================\033[0m"
echo -e "File Name       : \033[1;37m./${BUNDLE_FILE}\033[0m"
echo -e "Absolute Path   : \033[1;37m$(pwd)/${BUNDLE_FILE}\033[0m"
echo -e "Volume Exported : \033[1;32m${TOTAL_LINES} lines (${FILE_SIZE})\033[0m"
echo -e "\033[1;32m======================================================================\033[0m"
