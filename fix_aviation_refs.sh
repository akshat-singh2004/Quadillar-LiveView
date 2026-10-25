#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FIX MISSING REACT REFS
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

const target = "const iotSensorsRef = useRef<THREE.Mesh[]>([]);";
const replacement = `const iotSensorsRef = useRef<THREE.Mesh[]>([]);
  const aviationLightsRef = useRef<THREE.Mesh[]>([]);
  const rainGeoRef = useRef<THREE.BufferGeometry | null>(null);`;

if (code.includes(target) && !code.includes("const aviationLightsRef")) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code, 'utf8');
  console.log("\x1b[32m✓ FIXED: Restored missing aviationLightsRef and rainGeoRef declarations.\x1b[0m");
} else {
  console.log("\x1b[33m[WARN] Target code block not found or already patched.\x1b[0m");
}
NODE_RUNNER_EOF
