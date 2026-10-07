#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Resolving TS2352 conversion error in lib/agents/synapse.ts...\033[0m"

node -e '
const fs = require("fs");
const file = "lib/agents/synapse.ts";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  // 1. Double-cast event as unknown as Record<string, unknown>
  content = content.replace(
    /details:\s*event\s+as\s+Record<string,\s*unknown>/g,
    "details: event as unknown as Record<string, unknown>"
  );

  // 2. Add index signature to CouncilEventPayload interface if not present
  if (!content.includes("[key: string]: unknown;")) {
    content = content.replace(
      /actionTaken:\s*string;\s*\}/g,
      "actionTaken: string;\n  [key: string]: unknown;\n}"
    );
  }

  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Updated lib/agents/synapse.ts");
} else {
  console.error("[-] File not found: " + file);
  process.exit(1);
}
'

echo -e "\033[1;36m[+] Running TypeScript verification with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Resolved cleanly! 0 TypeScript compilation errors.\033[0m"
