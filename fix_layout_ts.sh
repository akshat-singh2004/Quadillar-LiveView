#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Resolving TS2304 in app/layout.tsx...\033[0m"

node -e '
const fs = require("fs");
const file = "app/layout.tsx";

if (!fs.existsSync(file)) {
  console.error("[-] Error: File not found at " + file);
  process.exit(1);
}

let content = fs.readFileSync(file, "utf8");

// Ensure SidebarAwareLayout is imported if referenced in JSX
if (content.includes("<SidebarAwareLayout") && !content.includes("SidebarAwareLayout")) {
  content = "import { SidebarAwareLayout } from \"@/components/layout/SidebarAwareLayout\";\n" + content;
} else if (!content.includes("import { SidebarAwareLayout }")) {
  // Insert import at the top after any existing imports
  content = "import { SidebarAwareLayout } from \"@/components/layout/SidebarAwareLayout\";\n" + content;
}

fs.writeFileSync(file, content, "utf8");
console.log("  ✓ Added SidebarAwareLayout import to app/layout.tsx");
'

echo -e "\033[1;36m[+] Verifying TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Resolved cleanly! Zero TypeScript errors remain across the codebase.\033[0m"
