#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Resolving TS2352 conversion error in app/actions/bim-actions.ts...\033[0m"

node -e '
const fs = require("fs");
const file = "app/actions/bim-actions.ts";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  // 1. Add index signature to ResolveClashPayload interface
  content = content.replace(
    /export interface ResolveClashPayload \{([^}]+)\}/,
    (match, body) => {
      if (body.includes("[key: string]")) return match;
      return `export interface ResolveClashPayload {${body}  [key: string]: unknown;\n}`;
    }
  );

  // 2. Double-cast payload to unknown first
  content = content.replace(
    /details:\s*payload\s+as\s+Record<string,\s*unknown>/g,
    "details: payload as unknown as Record<string, unknown>"
  );

  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Updated " + file);
} else {
  console.error("[-] File not found: " + file);
  process.exit(1);
}
'

echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Resolved cleanly! 0 TypeScript compilation errors.\033[0m"
