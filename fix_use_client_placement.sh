#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Hoisting 'use client' to line 1 in components/site/LaborRosterTable.tsx...\033[0m"

node -e '
const fs = require("fs");
const file = "components/site/LaborRosterTable.tsx";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  // Remove any misplaced "use client" directives
  content = content.replace(/["\x27]use client["\x27];?\s*/g, "");

  // Prepend "use client"; strictly at line 1
  content = "\"use client\";\n\n" + content.trimStart();

  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Positioned \"use client\"; at line 1 of " + file);
} else {
  console.error("[-] File not found: " + file);
  process.exit(1);
}
'

echo -e "\033[1;36m[+] Running TypeScript verification with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Resolved cleanly! Next.js Client Component directives restored with 0 errors.\033[0m"
