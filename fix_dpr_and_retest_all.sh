#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Updating compileDailyGovernanceDossier return signature in app/actions/dpr-actions.ts...\033[0m"

node -e '
const fs = require("fs");
const file = "app/actions/dpr-actions.ts";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  // Ensure compileDailyGovernanceDossier returns dossierCode explicitly and handles fallback
  content = content.replace(
    /return \{ success: true, data, sealHash: seal\.blockHash \};/g,
    `return { success: true, data: data || { dossier_code: dossierCode }, dossierCode, sealHash: seal.blockHash };`
  );

  content = content.replace(
    /return \{ success: false, error: err\?\.message \|\| "Failed to compile daily governance dossier\." \};/g,
    `return { success: false, error: err?.message || "Failed to compile daily governance dossier.", dossierCode };`
  );

  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Updated return object in " + file);
}
'

echo -e "\033[1;36m[+] Updating app/api/cron/shift-closeout/route.ts to safely read dossierCode...\033[0m"

node -e '
const fs = require("fs");
const file = "app/api/cron/shift-closeout/route.ts";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  content = content.replace(
    /dossierCode: dprResult\.data\?\.dossier_code,/g,
    "dossierCode: dprResult.dossierCode || dprResult.data?.dossier_code || `DPR-${targetDate.replace(/-/g, \"\")}-DAEMON`,"
  );

  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Updated dossierCode fallback in " + file);
}
'

echo -e "\033[1;33m[*] 1. Re-running Hardware IoT Ingress Harness...\033[0m"
npx tsx scripts/test-iot-telemetry-ingress.ts

echo -e "\033[1;33m[*] 2. Re-running Midnight Shift Closeout Cron Harness...\033[0m"
npx tsx scripts/test-shift-closeout-cron.ts

echo -e "\033[1;36m[+] Verifying full workspace TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] All schemas aligned, dossier code verified, and 0 TypeScript compilation errors!\033[0m"
