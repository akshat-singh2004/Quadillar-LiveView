#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Ensuring both pour_card_id and pour_card_ref are populated in app/actions/cube-actions.ts...\033[0m"

node -e '
const fs = require("fs");
const file = "app/actions/cube-actions.ts";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  // Ensure pour_card_ref is always provided alongside pour_card_id
  if (content.includes("pour_card_id:")) {
    content = content.replace(
      /pour_card_id:\s*([^,\n]+),/g,
      "pour_card_id: $1,\n        pour_card_ref: $1,"
    );
  }

  // Ensure sample_tag is also supplied
  if (!content.includes("sample_tag:")) {
    content = content.replace(
      /pour_card_ref:\s*([^,\n]+),/g,
      "pour_card_ref: $1,\n        sample_tag: payload.sampleTag || payload.sample_tag || (\"CUBE-\" + Date.now().toString().slice(-6)),"
    );
  }

  fs.writeFileSync(file, content, "utf8");
  console.log("  ✓ Synchronized pour_card_ref in " + file);
}
'

echo -e "\033[1;33m[*] Testing IoT Ingress Harness with npx tsx...\033[0m"
npx tsx scripts/test-iot-telemetry-ingress.ts

echo -e "\033[1;36m[+] Verifying workspace compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Hardware IoT Ingress clean with ZERO notices and 0 errors!\033[0m"
