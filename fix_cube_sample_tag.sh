#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Ensuring sample_tag is populated in app/actions/cube-actions.ts...\033[0m"

node -e '
const fs = require("fs");
const file = "app/actions/cube-actions.ts";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  // Ensure sample_tag is always assigned if omitted
  if (content.includes("insert({")) {
    content = content.replace(
      /insert\(\{([\s\S]*?)\}\)/,
      (match, body) => {
        if (!body.includes("sample_tag:")) {
          return `insert({\n        sample_tag: payload.sampleTag || payload.sample_tag || ("CUBE-" + Date.now().toString().slice(-6)),${body}})`;
        }
        return match;
      }
    );
  }

  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Updated " + file);
} else {
  console.log("[-] app/actions/cube-actions.ts not found directly; skipping.");
}
'

echo -e "\033[1;33m[*] Testing IoT Ingress Harness with npx tsx...\033[0m"
npx tsx scripts/test-iot-telemetry-ingress.ts

echo -e "\033[1;36m[+] Verifying workspace compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Hardware IoT Ingress clean with 0 notices and 0 errors!\033[0m"
