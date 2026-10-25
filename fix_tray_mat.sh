#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FIX MISSING TRAYMAT EXCEPTION
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

const targetLine = 'const stpMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, metalness: 0.4, roughness: 0.6, clippingPlanes: [clipPlane] }); // Green for STP tanks';
const replacementLines = `${targetLine}\n    const trayMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.8, roughness: 0.4, clippingPlanes: [clipPlane] });`;

if (code.includes(targetLine)) {
  code = code.replace(targetLine, replacementLines);
  fs.writeFileSync(file, code, 'utf8');
  console.log("\x1b[32m✓ FIXED: Restored 'trayMat' definition for the HT Cable Trays.\x1b[0m");
} else {
  console.log("\x1b[33m[WARN] Target line not found. Could not apply fix automatically.\x1b[0m");
}
NODE_RUNNER_EOF
