#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FIX MISSING HOVEREDTAG EXCEPTION
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

const targetLine = 'const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(defaultEntity);';
const replacement = targetLine + '\n  const [hoveredTag, setHoveredTag] = useState<string | null>(null);';

if (code.includes(targetLine) && !code.includes('const [hoveredTag, setHoveredTag]')) {
  code = code.replace(targetLine, replacement);
  fs.writeFileSync(file, code, 'utf8');
  console.log("\x1b[32m✓ FIXED: Restored 'hoveredTag' state definition for the 3D tooltips.\x1b[0m");
} else {
  console.log("\x1b[33m[WARN] Target line not found or already patched.\x1b[0m");
}
NODE_RUNNER_EOF
