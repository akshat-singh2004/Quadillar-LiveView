#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Patching SpatialLockoutCheckResult fallback in app/actions/ncr-actions.ts...\033[0m"

node -e '
const fs = require("fs");
const file = "app/actions/ncr-actions.ts";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  // Replace fallback return object that only returns { isLocked: true, lockReason: ... }
  content = content.replace(
    /return\s*\{\s*isLocked:\s*true\s*,\s*lockReason:\s*([^,}]+),?\s*\};?/g,
    `return {
        isLocked: true,
        activeNcrCount: 1,
        reasons: [$1],
        ncrs: [],
        lockReason: $1,
      };`
  );

  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Added missing properties (activeNcrCount, reasons, ncrs) to " + file);
} else {
  console.error("[-] File not found: " + file);
  process.exit(1);
}
'

echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Resolved cleanly! 0 TypeScript errors found.\033[0m"
