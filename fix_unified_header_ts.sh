#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Patching components/layout/UnifiedHeader.tsx imports and types...\033[0m"

node -e '
const fs = require("fs");
const file = "components/layout/UnifiedHeader.tsx";

if (!fs.existsSync(file)) {
  console.error("[-] File not found: " + file);
  process.exit(1);
}

let content = fs.readFileSync(file, "utf8");

// 1. Strip any broken/duplicate React imports and prepend the full hook import
content = content.replace(
  /import\s+React(?:\s*,\s*\{[^}]*\})?\s+from\s+["\x27]react["\x27];?/g,
  ""
);
content = "import React, { useState, useEffect } from \x27react\x27;\n" + content;

// 2. Ensure useSidebar is imported
if (!content.includes("useSidebar")) {
  content = "import { useSidebar } from \x27@/context/SidebarContext\x27;\n" + content;
}

// 3. Consolidate and deduplicate lucide-react imports
const lucideIcons = new Set(["PanelLeftClose", "PanelLeftOpen"]);
content = content.replace(/import\s*\{([^}]+)\}\s*from\s*["\x27]lucide-react["\x27];?/g, (match, names) => {
  names.split(",").forEach(n => {
    const trimmed = n.trim();
    if (trimmed) lucideIcons.add(trimmed);
  });
  return "";
});
content = `import { ${Array.from(lucideIcons).join(", ")} } from \x27lucide-react\x27;\n` + content;

// 4. Type the mapped project parameter explicitly
content = content.replace(/projects\.map\(\s*\(?\s*p\s*\)?\s*=>/g, "projects.map((p: any) =>");

// 5. Ensure "use client" remains at the very top of the file
content = content.replace(/^(\s*["\x27]use client["\x27];?\s*)+/, "");
content = "\"use client\";\n\n" + content.trimStart();

fs.writeFileSync(file, content, "utf8");
console.log("  ✓ Patched components/layout/UnifiedHeader.tsx successfully.");
'

echo -e "\033[1;36m[+] Verifying TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] All 4 errors resolved! TypeScript compilation passed cleanly with 0 errors.\033[0m"
