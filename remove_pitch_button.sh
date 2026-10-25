#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: REMOVE CM PITCH AUTOPILOT BUTTON
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

// 1. Remove the JSX Button Block
const buttonRegex = /\{\/\*\s*NEW:\s*CM Pitch Autopilot Button\s*\*\/\}[\s\S]*?<\/button>/g;
if (code.match(buttonRegex)) {
  code = code.replace(buttonRegex, '');
  console.log("\x1b[32m✓ Removed the Autopilot Button from the UI.\x1b[0m");
} else {
  console.log("\x1b[33m[WARN] Autopilot button block not found.\x1b[0m");
}

// 2. Un-restrict the Gantt Timeline slider
code = code.replace(/disabled=\{isPitchMode\}/g, '');
code = code.replace(/if\s*\(!isPitchMode\)\s*/g, '');

fs.writeFileSync(file, code, 'utf8');
console.log("\x1b[32m✓ Timeline slider unlocked and restored to normal operation.\x1b[0m");
NODE_RUNNER_EOF
