#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FIX GEOMETRY NaN EXCEPTION
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

// 1. Clamp the main sweeping facade calculation
const target1 = "const normalizedY = (y + (sweepHeight/2)) / sweepHeight;";
const replacement1 = "const normalizedY = Math.max(0, (y + (sweepHeight/2)) / sweepHeight);";

// 2. Clamp the dark louver block calculation
const target2 = "const normalizedY = (y + (sweepHeight*0.7/2)) / (sweepHeight*0.7);";
const replacement2 = "const normalizedY = Math.max(0, (y + (sweepHeight*0.7/2)) / (sweepHeight*0.7));";

let patched = false;

if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
  patched = true;
}
if (code.includes(target2)) {
  code = code.replace(target2, replacement2);
  patched = true;
}

if (patched) {
  fs.writeFileSync(file, code, 'utf8');
  console.log("\x1b[32m✓ FIXED: Clamped vertex calculations to prevent NaN bounds exceptions.\x1b[0m");
} else {
  console.log("\x1b[33m[WARN] Targets not found. You might have already patched this.\x1b[0m");
}
NODE_RUNNER_EOF
