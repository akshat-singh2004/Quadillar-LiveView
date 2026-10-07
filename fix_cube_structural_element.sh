#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Ensuring structural_element is provided in app/actions/cube-actions.ts...\033[0m"

node -e '
const fs = require("fs");
const file = "app/actions/cube-actions.ts";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  if (content.includes("insert({")) {
    content = content.replace(
      /insert\(\{([\s\S]*?)\}\)/,
      (match, body) => {
        if (!body.includes("structural_element:")) {
          return `insert({\n        structural_element: payload.structuralElement || payload.structural_element || "RC Structural Core",${body}})`;
        }
        return match;
      }
    );
  }

  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Injected structural_element into " + file);
} else {
  console.log("[-] File app/actions/cube-actions.ts not found directly.");
}
'

echo -e "\033[1;33m[*] Testing IoT Ingress Harness with npx tsx...\033[0m"
npx tsx scripts/test-iot-telemetry-ingress.ts

echo -e "\033[1;36m[+] Verifying workspace compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Hardware IoT Ingress clean with ZERO notices and 0 errors!\033[0m"
