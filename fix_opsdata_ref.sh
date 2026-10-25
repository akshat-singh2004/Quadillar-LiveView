#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FIX MISSING opsData STATE
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

const target = "const [sensorData, setSensorData] = useState({ temp: 32.4, strength: 18.2, maturity: 65 });";
const replacement = `const [sensorData, setSensorData] = useState({ temp: 32.4, strength: 18.2, maturity: 65 });
  const [opsData, setOpsData] = useState({ occupancy: 0, powerMw: 0, hvacLoad: 0 });`;

if (code.includes(target) && !code.includes("const [opsData, setOpsData]")) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code, 'utf8');
  console.log("\x1b[32m✓ FIXED: Restored 7D Operations telemetry state (opsData).\x1b[0m");
} else {
  console.log("\x1b[33m[WARN] Target code block not found or already patched.\x1b[0m");
}
NODE_RUNNER_EOF
