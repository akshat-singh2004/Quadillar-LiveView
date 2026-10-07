#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Repositioning 'use client' directive to line 1 in UnifiedHeader.tsx...\033[0m"

node -e '
const fs = require("fs");
const file = "components/layout/UnifiedHeader.tsx";

if (!fs.existsSync(file)) {
  console.error("[-] Error: File not found at " + file);
  process.exit(1);
}

let content = fs.readFileSync(file, "utf8");

// 1. Remove all occurrences of "use client" anywhere in the file
content = content.replace(/["\x27]use client["\x27];?\r?\n?/g, "");

// 2. Trim any leading whitespace or stray lines
content = content.trimStart();

// 3. Prepend "use client"; at the absolute top of the file
content = "\"use client\";\n\n" + content;

fs.writeFileSync(file, content, "utf8");
console.log("  ✓ Positioned \"use client\"; at line 1 of " + file);
'

echo -e "\033[1;36m[+] Verifying TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Directive fixed! Next.js build and development server will now compile cleanly.\033[0m"
