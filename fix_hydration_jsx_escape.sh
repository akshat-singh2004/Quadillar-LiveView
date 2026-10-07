#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Escaping JSX braces in app/quality/thermal-hydration/page.tsx...\033[0m"

node -e '
const fs = require("fs");
const file = "app/quality/thermal-hydration/page.tsx";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");
  content = content.replace(/\$f_\{ck\}\$/g, "f_ck");
  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Replaced $f_{ck}$ with plain text f_ck in " + file);
} else {
  console.error("[-] File not found: " + file);
  process.exit(1);
}
'

echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Resolved cleanly! 0 TypeScript errors found across the entire workspace.\033[0m"
