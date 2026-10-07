#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Adding QrCode to lucide-react imports in components/layout/CouncilNavigationShell.tsx...\033[0m"

node -e '
const fs = require("fs");
const file = "components/layout/CouncilNavigationShell.tsx";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  // Add QrCode to the import list from lucide-react if not present
  if (!content.includes("QrCode,") && !content.includes("QrCode }")) {
    content = content.replace(
      /from "lucide-react";/,
      `QrCode,\n} from "lucide-react";`
    );
    // If multiline import wasn'\''t captured that way, replace Cpu with Cpu, QrCode
    if (!content.includes("QrCode")) {
      content = content.replace(/Cpu,/, "Cpu,\n  QrCode,");
    }
    fs.writeFileSync(file, content, "utf8");
    console.log("  ✓ Injected QrCode import into " + file);
  } else {
    console.log("  ✓ QrCode already imported in " + file);
  }
} else {
  console.error("[-] File not found: " + file);
  process.exit(1);
}
'

echo -e "\033[1;36m[+] Verifying workspace compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;36m[+] Updating council_governance_source_bundle.txt...\033[0m"
./run_governance_sprint_and_bundle.sh

echo -e "\033[1;32m[✓] Resolved cleanly! 0 TypeScript errors and bundle updated.\033[0m"
