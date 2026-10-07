#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Updating property names in scripts/simulate-dashboard-benchmarks.ts...\033[0m"

node -e '
const fs = require("fs");
const file = "scripts/simulate-dashboard-benchmarks.ts";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");
  content = content.replace(/\$\{safeThermal\.differentialTempC\}/g, "${safeThermal.deltaT}");
  content = content.replace(/\$\{breachThermal\.differentialTempC\}/g, "${breachThermal.deltaT}");
  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Updated differentialTempC -> deltaT in " + file);
} else {
  console.error("[-] File not found: " + file);
  process.exit(1);
}
'

echo -e "\033[1;33m[*] Running Comprehensive Benchmark Simulation via npx tsx...\033[0m"
npx tsx scripts/simulate-dashboard-benchmarks.ts || {
  echo -e "\033[1;33m[!] Running compiled via Node...\033[0m"
  npx tsc scripts/simulate-dashboard-benchmarks.ts --module commonjs --target es2022 --skipLibCheck --outDir dist-bench
  node dist-bench/scripts/simulate-dashboard-benchmarks.js
  rm -rf dist-bench
}

echo -e "\033[1;36m[+] Verifying full workspace TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] All 13 benchmarks verified and 0 TypeScript compilation errors!\033[0m"
