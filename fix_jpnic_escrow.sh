#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FIX MISSING ESCROWSTATUS EXCEPTION
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

const targetAnchor = '  ], []);';
const escrowBlock = `
  const escrowStatus = useMemo(() => {
    const totalAllocated = 864000000; // 86.4 Cr JPNIC Budget
    let cleared = 0, retained = 0;
    if (timelineWeek >= 4) cleared += 225000000; 
    if (timelineWeek >= 12) cleared += 318000000; 
    if (timelineWeek >= 18) cleared += 224000000; 
    if (timelineWeek >= 20) { cleared += 85000000; retained += 12000000; }
    return { allocated: totalAllocated, cleared, retained, pending: totalAllocated - cleared - retained };
  }, [timelineWeek]);
`;

if (!code.includes('const escrowStatus = useMemo')) {
  // Inject the escrow block right after the cameraStations array closes
  code = code.replace(targetAnchor, targetAnchor + "\n" + escrowBlock);
  fs.writeFileSync(file, code, 'utf8');
  console.log("\x1b[32m✓ FIXED: Restored the JPNIC Smart Escrow logic.\x1b[0m");
} else {
  console.log("\x1b[33m[WARN] escrowStatus already exists. No changes made.\x1b[0m");
}
NODE_RUNNER_EOF
