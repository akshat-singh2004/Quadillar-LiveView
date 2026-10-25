#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: PATCH app/site/digital-twin/page.tsx WITH 3D WEBGL ENGINE
# ==============================================================================

set -euo pipefail

TARGET_PAGE="app/site/digital-twin/page.tsx"

if [ ! -f "$TARGET_PAGE" ]; then
  echo "[ERROR] $TARGET_PAGE does not exist."
  exit 1
fi

echo "===================================================================="
echo "    [1/3] INSPECTING $TARGET_PAGE                                   "
echo "===================================================================="

node - << 'NODE_RUNNER_EOF'
const fs = require('fs');
const path = require('path');

const targetPage = "app/site/digital-twin/page.tsx";
const content = fs.readFileSync(targetPage, 'utf8');

console.log(`File size: ${content.length} bytes`);
console.log("\n--- Top 35 lines of app/site/digital-twin/page.tsx ---");
console.log(content.split('\n').slice(0, 35).join('\n'));

// Scan for imported child components in components/
const importMatches = content.matchAll(/from\s+["'](@\/components\/[^"']+|(?:\.\.?\/)+[^"']+)["']/g);
const imports = Array.from(importMatches).map(m => m[1]);
console.log("\n--- Detected Component Imports ---");
console.log(imports);

NODE_RUNNER_EOF

echo -e "\n===================================================================="
echo "    [2/3] PATCHING DIGITAL TWIN VIEWPORT WITH 3D ENGINE             "
echo "===================================================================="

node - << 'NODE_RUNNER_EOF'
const fs = require('fs');
const path = require('path');

const targetPage = "app/site/digital-twin/page.tsx";
let code = fs.readFileSync(targetPage, 'utf8');

// Backup original
fs.writeFileSync(targetPage + '.bak', code, 'utf8');

// 1. Ensure import of InteractiveBimCanvas3D
if (!code.includes('InteractiveBimCanvas3D')) {
  // Add below "use client" if present
  if (code.startsWith('"use client"') || code.startsWith("'use client'")) {
    code = code.replace(/(['"]use client['"];?\n)/, `$1import InteractiveBimCanvas3D from "@/components/bim/InteractiveBimCanvas3D";\n`);
  } else {
    code = `import InteractiveBimCanvas3D from "@/components/bim/InteractiveBimCanvas3D";\n` + code;
  }
}

// 2. Identify and inspect viewport element
let patched = false;

// Case A: A child viewer component is imported (e.g., BimViewer, SpatialViewport)
const childViewerMatch = code.match(/<(BimViewer|SpatialViewer|DigitalTwinViewer|SpatialViewport|BimCanvas)[^>]*\/>/);
if (childViewerMatch) {
  const compTag = childViewerMatch[0];
  console.log(`Found child viewer component: ${compTag}`);
  code = code.replace(compTag, `<InteractiveBimCanvas3D planCutZ={100} />`);
  patched = true;
}

// Case B: Inline mock viewport container inside page.tsx
if (!patched) {
  // Look for the area with perspective or the SVG / polygon / grid
  const lines = code.split('\n');
  let startIdx = -1;
  let endIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes('PLAN CUT') || l.includes('Plan Cut') || l.includes('plan_cut')) {
      endIdx = i;
      break;
    }
  }

  if (endIdx !== -1) {
    // Look backwards from PLAN CUT for the container holding the viewport
    for (let i = endIdx - 1; i >= 0; i--) {
      if (lines[i].includes('h-[') || lines[i].includes('flex-1') || lines[i].includes('min-h-') || lines[i].includes('bg-slate-950')) {
        startIdx = i;
        break;
      }
    }
  }

  if (startIdx !== -1 && endIdx !== -1) {
    console.log(`Replacing lines ${startIdx + 1} to ${endIdx} with InteractiveBimCanvas3D...`);
    const before = lines.slice(0, startIdx + 1);
    const after = lines.slice(endIdx);
    
    const replacement = [
      '        {/* REAL 3D WEBGL BIM ENGINE INJECTED */}',
      '        <div className="w-full h-[520px] relative rounded-xl overflow-hidden mb-4">',
      '          <InteractiveBimCanvas3D planCutZ={100} />',
      '        </div>'
    ];

    code = [...before, ...replacement, ...after].join('\n');
    patched = true;
  }
}

// Case C: Fallback regex insertion
if (!patched) {
  console.log("Applying regex fallback replacement...");
  code = code.replace(
    /(<div[^>]*className=["'][^"']*(?:relative|flex-1|rounded)[^"']*["'][^>]*>)([\s\S]*?)({\/\*\s*Controls|\bPLAN CUT)/i,
    `$1\n        <div className="w-full h-[520px] relative rounded-xl overflow-hidden mb-4">\n          <InteractiveBimCanvas3D planCutZ={100} />\n        </div>\n    $3`
  );
  patched = true;
}

fs.writeFileSync(targetPage, code, 'utf8');
console.log(`\x1b[32m✓ Injected InteractiveBimCanvas3D into ${targetPage}\x1b[0m`);
console.log(`Backup saved to ${targetPage}.bak`);
NODE_RUNNER_EOF

echo -e "\n===================================================================="
echo "    [3/3] DONE. REFRESH YOUR BROWSER                                "
echo "===================================================================="
echo "1. Run: npm run dev (if not already running)"
echo "2. Refresh: http://localhost:3000/site/digital-twin"
echo "===================================================================="
