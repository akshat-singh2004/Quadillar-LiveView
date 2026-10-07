#!/usr/bin/env bash
set -e

echo -e "\033[1;33m[*] 1. Running Chronos 4D Schedule Test Harness with npx tsx...\033[0m"
npx tsx scripts/test-chronos-cpm-schedule.ts

echo -e "\033[1;36m[+] 2. Verifying full workspace TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;36m[+] 3. Refreshing council_governance_source_bundle.txt...\033[0m"
./bundle_governance_source.sh

echo -e "\033[1;32m[✓] Chronos 4D Schedule Engine operational with ZERO errors!\033[0m"
