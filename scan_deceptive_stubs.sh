#!/usr/bin/env bash
set -e

echo -e "\033[1;31m======================================================================\033[0m"
echo -e "\033[1;31m  GROUND TRUTH AUDIT: SCANNING CODEBASE FOR DECEPTIVE STUBS & MOCK DATA\033[0m"
echo -e "\033[1;31m======================================================================\033[0m\n"

grep_check() {
  local title="$1"
  local pattern="$2"
  echo -e "\033[1;33m[!] Scanning: $title\033[0m"
  grep -rnEI "$pattern" app components --exclude-dir={.next,node_modules} || echo "    ✓ None detected"
  echo ""
}

# 1. Fake Hardware / Network Status
grep_check "Fake 'ONLINE' sensor & gateway indicators" "WEIGHBRIDGE SENSOR ONLINE|GATEWAY ONLINE|TURNSTILE.*ONLINE|IFC 4D ENGINE ONLINE"

# 2. Hardcoded Weather & Temperature Readings
grep_check "Hardcoded Weather Telemetry (e.g. 32°C, Clear, 8.5h)" "32°C|38\.0 km/h|Clear / 32"

# 3. Hardcoded Mock Fleet, Equipment & Diesel
grep_check "Hardcoded Fleet & Equipment Units" "Potain MCi 85|105 L|EQ-TWR-01|EQ-PMP-02"

# 4. Hardcoded IFC / BIM Models
grep_check "Hardcoded Demo BIM Model File Names" "GFC-Tower-A-Structural-LOD350\.ifc|sample-building\.ifc"

# 5. Hardcoded UUID / Legacy Project Fallbacks
grep_check "Hardcoded Project UUID Fallbacks" "3f861470-fc2f-4a04-ae07-9cca4ab2f833|proj-1"

echo -e "\033[1;32m[✓] Scan complete. Use the output above to verify stubs to be neutralized.\033[0m"
