#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FIX 'needsUpdate' NULL REFERENCE EXCEPTION
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

// 1. Guard the InstancedMesh color buffer
code = code.replace(
  /workersMesh\.instanceColor!\.needsUpdate\s*=\s*true;/g, 
  'if (workersMesh.instanceColor) workersMesh.instanceColor.needsUpdate = true;'
);

// 2. Guard the Rain Particle position buffer
code = code.replace(
  /rainGeoRef\.current\.attributes\.position\.needsUpdate\s*=\s*true;/g, 
  'if (rainGeoRef.current && rainGeoRef.current.attributes.position) rainGeoRef.current.attributes.position.needsUpdate = true;'
);

// 3. Guard the Worker Swarm matrix buffer
code = code.replace(
  /workersRef\.current\.instanceMatrix\.needsUpdate\s*=\s*true;/g, 
  'if (workersRef.current && workersRef.current.instanceMatrix) workersRef.current.instanceMatrix.needsUpdate = true;'
);

fs.writeFileSync(file, code, 'utf8');
console.log("\x1b[32m✓ FIXED: Guarded all GPU 'needsUpdate' calls against null references.\x1b[0m");
NODE_RUNNER_EOF
