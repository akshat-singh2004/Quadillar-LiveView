#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LOCATE DIGITAL TWIN VIEWPORT & MOUNT 3D CANVAS
# ==============================================================================

set -euo pipefail

node - << 'NODE_RUNNER_EOF'
const fs = require('fs');
const path = require('path');

console.log('\x1b[34m====================================================================\x1b[0m');
console.log('\x1b[36m    [1/2] SCANNING FOR DIGITAL TWIN VIEWPORT COMPONENT             \x1b[0m');
console.log('\x1b[34m====================================================================\x1b[0m');

// 1. Recursive search across app/ and components/ for unique UI text
function findFiles(dir, matchStrings, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      findFiles(fullPath, matchStrings, results);
    } else if (/\.(tsx|jsx|js|ts)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const str of matchStrings) {
        if (content.includes(str)) {
          results.push({ fullPath, matched: str });
          break;
        }
      }
    }
  }
  return results;
}

const candidates = findFiles('.', [
  'AXIS SPATIAL LOCKOUTS',
  'SPATIAL VIEWPORT',
  'Floorplate dissections',
  'Zero active geometry voids'
]);

console.log(`Found ${candidates.length} matching file(s):`);
candidates.forEach(c => console.log(`  • \x1b[32m${c.fullPath}\x1b[0m (Matched: "${c.matched}")`));

if (candidates.length === 0) {
  console.log('\x1b[31m[ERROR]\x1b[0m Could not locate file with specific headers. Searching for routes with "digital-twin"...');
  const twinPages = findFiles('app', ['digital-twin', 'twin']);
  twinPages.forEach(c => console.log(`  • ${c.fullPath}`));
  process.exit(1);
}

// 2. Inspect and inject into the primary digital twin file
const targetFile = candidates[0].fullPath;
console.log(`\n\x1b[34m====================================================================\x1b[0m`);
console.log(`\x1b[36m    [2/2] INJECTING 3D CANVAS INTO: ${targetFile}\x1b[0m`);
console.log(`\x1b[34m====================================================================\x1b[0m`);

let code = fs.readFileSync(targetFile, 'utf8');
fs.writeFileSync(targetFile + '.pre3d.bak', code, 'utf8');

// Ensure import is at the top
if (!code.includes('InteractiveBimCanvas3D')) {
  code = `import InteractiveBimCanvas3D from "@/components/bim/InteractiveBimCanvas3D";\n` + code;
}

// Locate the central viewport area between the header/badges and the bottom "PLAN CUT (Z)" slider
let modified = false;

// Strategy A: Replace any mock SVG or central perspective container
if (code.includes('PLAN CUT')) {
  // Find container right before PLAN CUT controls
  const planCutIdx = code.indexOf('PLAN CUT');
  
  // Look backwards for the viewport container div
  const beforePlanCut = code.slice(0, planCutIdx);
  const afterPlanCut = code.slice(planCutIdx);

  // Match the inner viewport div that holds the static grid/polygon
  const containerMatch = beforePlanCut.match(/(<div[^>]*className=["'][^"']*(?:relative|flex-1|h-\[)[^"']*["'][^>]*>)([\s\S]*?)(<div[^>]*class(?:Name)?=["'][^"']*[^"']*>\s*[^<]*PLAN CUT)/i);

  if (containerMatch) {
    const fullMatch = containerMatch[0];
    const openTag = containerMatch[1];
    const planCutPrefix = containerMatch[3];

    const replacement = `${openTag}\n      <div className="w-full h-[520px] relative rounded-xl overflow-hidden">\n        <InteractiveBimCanvas3D planCutZ={typeof planCutZ !== 'undefined' ? planCutZ : 100} />\n      </div>\n    ${planCutPrefix}`;
    code = code.replace(fullMatch, replacement);
    modified = true;
    console.log('\x1b[32m✓ Injected InteractiveBimCanvas3D into central viewport before PLAN CUT\x1b[0m');
  }
}

// Strategy B: If Strategy A didn't match cleanly, swap the primary perspective container
if (!modified) {
  const polygonPattern = /(<div[^>]*className=["'][^"']*(?:bg-slate-950|relative flex-1|min-h-\[400px\])[^"']*["'][^>]*>)([\s\S]*?)(<\/div>)/i;
  if (polygonPattern.test(code)) {
    code = code.replace(polygonPattern, (match, p1, p2, p3) => {
      console.log('\x1b[32m✓ Replaced inner viewport block with 3D canvas\x1b[0m');
      return `${p1}\n      <div className="w-full h-[520px] relative">\n        <InteractiveBimCanvas3D planCutZ={100} />\n      </div>\n    ${p3}`;
    });
    modified = true;
  }
}

if (modified) {
  fs.writeFileSync(targetFile, code, 'utf8');
  console.log(`\n\x1b[32m✓ SUCCESS:\x1b[0m 3D WebGL Engine mounted into ${targetFile}`);
  console.log('Original backup saved to: ' + targetFile + '.pre3d.bak');
} else {
  console.log('\x1b[33m[NOTICE]\x1b[0m Could not apply regex automatically. Printing candidate section around PLAN CUT:');
  const lines = code.split('\n');
  const targetLineIdx = lines.findIndex(l => l.includes('AXIS SPATIAL LOCKOUTS') || l.includes('PLAN CUT'));
  if (targetLineIdx !== -1) {
    console.log(lines.slice(Math.max(0, targetLineIdx - 25), targetLineIdx + 20).join('\n'));
  }
}
NODE_RUNNER_EOF
