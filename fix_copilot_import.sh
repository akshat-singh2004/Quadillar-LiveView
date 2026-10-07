#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Ensuring GovernorInteractiveCopilot import in components/layout/CouncilNavigationShell.tsx...\033[0m"

node -e '
const fs = require("fs");
const file = "components/layout/CouncilNavigationShell.tsx";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  // Remove any faulty/partial import of GovernorInteractiveCopilot
  content = content.replace(/import\s*\{\s*GovernorInteractiveCopilot\s*\}\s*from\s*"@\/components\/governance\/GovernorInteractiveCopilot";\s*\n?/g, "");

  // Prepend the clean import directly after "use client";
  if (content.includes("\"use client\";")) {
    content = content.replace(
      "\"use client\";",
      "\"use client\";\n\nimport { GovernorInteractiveCopilot } from \"@/components/governance/GovernorInteractiveCopilot\";"
    );
  } else {
    content = "import { GovernorInteractiveCopilot } from \"@/components/governance/GovernorInteractiveCopilot\";\n" + content;
  }

  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Correctly injected GovernorInteractiveCopilot import at top of " + file);
} else {
  console.error("[-] File not found: " + file);
  process.exit(1);
}
'

echo -e "\033[1;36m[+] Verifying full workspace compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;36m[+] Updating council_governance_source_bundle.txt...\033[0m"
./bundle_governance_source.sh

echo -e "\033[1;32m[✓] Resolved cleanly! 0 TypeScript compilation errors.\033[0m"
