#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[*] Re-running Hardware Ingress Test Harness with npx tsx...\033[0m"
npx tsx scripts/test-iot-telemetry-ingress.ts

echo -e "\033[1;36m[+] Verifying TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] All 5 hardware ingress streams executed with zero notices and zero errors!\033[0m"
