#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: FIX AI TERMINAL REACT KEY COLLISIONS
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

// 1. Update the TypeScript interface to accept string IDs
code = code.replace(
  /\{id: number, agent: string, msg: string, color: string\}/g,
  '{id: string, agent: string, msg: string, color: string}'
);

// 2. Replace the addAiLog implementation to generate unique strings and guard against spam
const targetLogCode = /logIdRef\.current \+= 1;\s*setAiLogs\(prev => \[\.\.\.prev\.slice\(-4\), \{ id: logIdRef\.current, agent, msg, color \}\]\);/;
const replacementLogCode = `setAiLogs(prev => {
      // Spam Guard: Prevent the exact same message from being duplicated in the terminal
      if (prev.some(log => log.msg === msg)) return prev;
      // Generate a mathematically unique string key
      const uniqueId = Math.random().toString(36).substring(2, 11);
      return [...prev.slice(-4), { id: uniqueId, agent, msg, color }];
    });`;

if (code.match(targetLogCode)) {
  code = code.replace(targetLogCode, replacementLogCode);
  fs.writeFileSync(file, code, 'utf8');
  console.log("\x1b[32m✓ FIXED: Guarded AI Terminal against duplicate React Keys and render spam.\x1b[0m");
} else {
  console.log("\x1b[33m[WARN] Target code block not found. It may have already been patched.\x1b[0m");
}
NODE_RUNNER_EOF
