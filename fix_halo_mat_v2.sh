#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FORCE-PATCH HALOMAT ANIMATION EXCEPTION
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

// Forcefully replace any reference to haloMat.opacity with the direct mesh material reference
const patchedCode = code.replace(/haloMat\.opacity/g, '(haloMesh.material as any).opacity');

if (patchedCode !== code) {
  fs.writeFileSync(file, patchedCode, 'utf8');
  console.log("\x1b[32m✓ FIXED: Successfully routed the animation opacity directly to the mesh material.\x1b[0m");
} else {
  console.log("\x1b[33m[WARN] 'haloMat.opacity' not found. Ensure you are editing the correct file.\x1b[0m");
}
NODE_RUNNER_EOF
