#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FIX UNDEFINED HALOMAT EXCEPTION
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

const targetLine = 'const haloMesh = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.2, 32), new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));';
const replacementLines = `const haloMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const haloMesh = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.2, 32), haloMat);`;

if (code.includes(targetLine)) {
  code = code.replace(targetLine, replacementLines);
  fs.writeFileSync(file, code, 'utf8');
  console.log("\x1b[32m✓ FIXED: Declared 'haloMat' explicitly for the animation loop.\x1b[0m");
} else {
  // Fallback: if exact line isn't found, safely cast the material inside the animate function
  const fallbackCode = code.replace(/haloMat\.opacity\s*=/g, '(haloMesh.material as THREE.MeshBasicMaterial).opacity =');
  if (fallbackCode !== code) {
    fs.writeFileSync(file, fallbackCode, 'utf8');
    console.log("\x1b[32m✓ FIXED: Applied inline material cast for the animation loop.\x1b[0m");
  } else {
    console.log("\x1b[33m[WARN] Target line not found. Ensure 'haloMat' is declared.\x1b[0m");
  }
}
NODE_RUNNER_EOF
