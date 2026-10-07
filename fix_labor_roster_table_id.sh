#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Resolving duplicate identifier 'projectId' in components/site/LaborRosterTable.tsx...\033[0m"

node -e '
const fs = require("fs");
const file = "components/site/LaborRosterTable.tsx";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  // Alias the incoming prop to propProjectId in the parameter list
  content = content.replace(
    /projectId\s*=\s*"GOMTI-NAGAR-PH1-FITOUT"/g,
    "projectId: propProjectId"
  );
  content = content.replace(
    /projectId\s*:\s*propProjectId\s*=\s*"GOMTI-NAGAR-PH1-FITOUT"/g,
    "projectId: propProjectId"
  );

  // Fallback to propProjectId first, then role context, then default constant
  content = content.replace(
    /const\s+projectId\s*=\s*project\?\.id\s*\|\|\s*"GOMTI-NAGAR-PH1-FITOUT";/g,
    "const projectId = propProjectId || project?.id || \"GOMTI-NAGAR-PH1-FITOUT\";"
  );

  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Harmonized propProjectId with internal projectId scope in " + file);
} else {
  console.error("[-] File not found: " + file);
  process.exit(1);
}
'

echo -e "\033[1;36m[+] Running TypeScript verification...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Resolved TS2300 cleanly with 0 errors!\033[0m"
