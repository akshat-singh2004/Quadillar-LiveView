#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Deduplicating SynapseRealtimeAlertListener in components/layout/CouncilNavigationShell.tsx...\033[0m"

node -e '
const fs = require("fs");
const file = "components/layout/CouncilNavigationShell.tsx";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  // Remove all instances of the import line
  content = content.replace(/import\s*\{\s*SynapseRealtimeAlertListener\s*\}\s*from\s*"@\/components\/governance\/SynapseRealtimeAlertListener";\s*\n?/g, "");

  // Prepend a single clean import at the top
  content = `import { SynapseRealtimeAlertListener } from "@/components/governance/SynapseRealtimeAlertListener";\n` + content.trimStart();

  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Cleaned duplicate import in " + file);
} else {
  console.error("[-] File not found: " + file);
  process.exit(1);
}
'

echo -e "\033[1;36m[+] Verifying TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;33m[*] Re-running Hardware Ingress Test Harness with npx tsx...\033[0m"
npx tsx scripts/test-iot-telemetry-ingress.ts

echo -e "\033[1;33m[*] Re-running Midnight Shift Closeout Cron Harness...\033[0m"
npx tsx scripts/test-shift-closeout-cron.ts

echo -e "\033[1;32m[✓] Build clean: 0 TypeScript errors and both harnesses passed cleanly!\033[0m"
