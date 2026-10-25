#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FIX THREE.JS PREFIX
# ==============================================================================

set -euo pipefail

node - << 'NODE_RUNNER_EOF'
const fs = require('fs');
const file = "components/bim/FullBimSimulationEngine.tsx";

if (!fs.existsSync(file)) {
  console.log(`[ERROR] File ${file} not found.`);
  process.exit(1);
}

let code = fs.readFileSync(file, 'utf8');

// Add the missing THREE. prefix to SphereGeometry
if (code.includes("new SphereGeometry(")) {
  code = code.replace(/new SphereGeometry\(/g, "new THREE.SphereGeometry(");
  fs.writeFileSync(file, code, 'utf8');
  console.log("\x1b[32m✓ FIXED: Restored THREE.SphereGeometry prefix for the Silver Dome.\x1b[0m");
} else {
  console.log("\x1b[33m[WARN] Target code block not found or already patched.\x1b[0m");
}
NODE_RUNNER_EOF
