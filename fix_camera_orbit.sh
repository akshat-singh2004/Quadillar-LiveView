#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FIX WEBGL CAMERA ORBIT STATE SYNC
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

// 1. Sync the React camMode state to the WebGL scene.userData
const t1 = "useEffect(() => { if (sceneRef.current) { sceneRef.current.userData.weatherMode = weatherMode; } }, [weatherMode]);";
const r1 = "useEffect(() => { if (sceneRef.current) { sceneRef.current.userData.weatherMode = weatherMode; } }, [weatherMode]);\n  useEffect(() => { if (sceneRef.current) { sceneRef.current.userData.activeCamMode = camMode; } }, [camMode]);";

// 2. Set the initial default mode so the camera calculates its first frame correctly
const t2 = "let sph = { r: 210, phi: Math.PI / 3.2, theta: Math.PI / 4.2 };";
const r2 = "let sph = { r: 210, phi: Math.PI / 3.2, theta: Math.PI / 4.2 };\n    scene.userData.activeCamMode = \"ORBIT\";";

let modified = false;
if (code.includes(t1) && !code.includes("activeCamMode = camMode")) {
    code = code.replace(t1, r1);
    modified = true;
}
if (code.includes(t2) && !code.includes("scene.userData.activeCamMode = \"ORBIT\"")) {
    code = code.replace(t2, r2);
    modified = true;
}

if (modified) {
    fs.writeFileSync(file, code, 'utf8');
    console.log("\x1b[32m✓ FIXED: WebGL Camera Orbit & State Synchronization Restored.\x1b[0m");
} else {
    console.log("\x1b[33m[WARN] Target code blocks not found or already patched.\x1b[0m");
}
NODE_RUNNER_EOF
