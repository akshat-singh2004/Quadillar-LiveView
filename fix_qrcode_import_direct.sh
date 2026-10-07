#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Explicitly patching lucide-react import in components/layout/CouncilNavigationShell.tsx...\033[0m"

node -e '
const fs = require("fs");
const file = "components/layout/CouncilNavigationShell.tsx";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  // Match the lucide-react import block and ensure QrCode is present
  content = content.replace(/import\s*\{([\s\S]*?)\}\s*from\s*"lucide-react";/, (match, imports) => {
    const list = imports.split(",").map(s => s.trim()).filter(Boolean);
    if (!list.includes("QrCode")) {
      list.push("QrCode");
    }
    return `import {\n  ${list.join(",\n  ")},\n} from "lucide-react";`;
  });

  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Successfully rewritten lucide-react imports with QrCode.");
} else {
  console.error("[-] File not found: " + file);
  process.exit(1);
}
'

echo -e "\033[1;36m[+] Verifying full workspace compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;36m[+] Refreshing council_governance_source_bundle.txt...\033[0m"
./run_governance_sprint_and_bundle.sh

echo -e "\033[1;32m[✓] TS2304 resolved cleanly! Zero TypeScript errors across the workspace.\033[0m"
