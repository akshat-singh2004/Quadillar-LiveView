#!/usr/bin/env bash
set -e

echo -e "\033[1;31m======================================================================\033[0m"
echo -e "\033[1;31m  HARSH AUDIT: PINPOINTING ALL DECEPTIVE FALLBACKS & GHOST STRINGS    \033[0m"
echo -e "\033[1;31m======================================================================\033[0m\n"

scan_pattern() {
  local label="$1"
  local pattern="$2"
  echo -e "\033[1;33m[!] Checking: $label\033[0m"
  grep -rnEI "$pattern" app components --exclude-dir={.next,node_modules} || echo "    (Clean)"
  echo ""
}

scan_pattern "Ghost Project 'Project 01 / Core Shell'" "Project 01 / Core Shell"
scan_pattern "Ghost Project 'PRJ-1BHK-GOMTI'" "PRJ-1BHK-GOMTI"
scan_pattern "Hardcoded RA-04 Payment Application" "RA-04|68\.15 Lakh|72\.50 Lakh"
scan_pattern "Hardcoded VO-TWR-01 Variation Order" "VO-TWR-01|21\.92 Lakh"
scan_pattern "Mock Unsplash Handbag Photo in GIS" "unsplash\.com"
scan_pattern "Fake Live Ping Pulse Bar (14ms)" "Live Realtime Link Active"
scan_pattern "Fake Online Badges" "BLE IOT GATEWAY: ONLINE|GATEWAY ONLINE|WEIGHBRIDGE SENSOR ONLINE"

echo -e "\033[1;32m[✓] Harsh identification scan complete.\033[0m"
