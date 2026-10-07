#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Ensuring FileText is imported from lucide-react in CouncilNavigationShell.tsx...\033[0m"

node -e '
const fs = require("fs");
const file = "components/layout/CouncilNavigationShell.tsx";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  content = content.replace(/import\s*\{([\s\S]*?)\}\s*from\s*"lucide-react";/, (match, imports) => {
    const list = imports.split(",").map(s => s.trim()).filter(Boolean);
    if (!list.includes("FileText")) {
      list.push("FileText");
    }
    return `import {\n  ${list.join(",\n  ")},\n} from "lucide-react";`;
  });

  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Successfully added FileText to lucide-react imports in " + file);
} else {
  console.error("[-] File not found: " + file);
  process.exit(1);
}
'

echo -e "\033[1;36m[+] Verifying full workspace compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;36m[+] Refreshing council_governance_source_bundle.txt...\033[0m"
./bundle_governance_source.sh

echo -e "\033[1;32m[✓] TS2304 resolved cleanly! Zero TypeScript compiler errors across workspace.\033[0m"
