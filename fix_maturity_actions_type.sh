#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Patching app/actions/maturity-actions.ts payload type casting...\033[0m"

node -e '
const fs = require("fs");
const file = "app/actions/maturity-actions.ts";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  // Fix line where details: payload is passed directly
  content = content.replace(
    /details:\s*payload\s*,/g,
    "details: { ...payload } as Record<string, unknown>,"
  );

  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Cast payload to Record<string, unknown> in " + file);
} else {
  console.error("[-] File not found: " + file);
  process.exit(1);
}
'

echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Resolved cleanly! Concrete Maturity & Formwork Stripping Hold-Gate compiled with 0 errors.\033[0m"
