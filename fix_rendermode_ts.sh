#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FIX RENDERMODE UNION TYPE
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

// Force overwrite the RenderMode type to include AI_HEATMAP
code = code.replace(
  /export type RenderMode = [^;]+;/g, 
  'export type RenderMode = "SOLID" | "CAD_EDGES" | "X_RAY" | "LIDAR_SCAN" | "AI_HEATMAP" | "ANATOMY" | "IOT_MESH" | "THERMAL";'
);

fs.writeFileSync(file, code, 'utf8');
console.log("\x1b[32m✓ FIXED: Restored 'AI_HEATMAP' to RenderMode type union.\x1b[0m");
NODE_RUNNER_EOF
