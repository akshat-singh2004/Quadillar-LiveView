#!/usr/bin/env bash
set -euo pipefail

node -e '
const fs = require("fs");
const path = require("path");

const IGNORED_DIRS = new Set([".git", ".next", "node_modules", "dist", "build", ".turbo"]);
const TARGET_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".sql", ".md"]);

// Replacement dictionary for JPNIC legacy identifiers, names, and mega-scale commercial numbers
const REPLACEMENTS = [
  // Full Project Name Variations
  {
    search: /Jai\s+Prakash\s+Narayan\s+International\s+Centre\s*\(JPNIC\)/gi,
    replace: "Project Vanguard Commercial Hub"
  },
  {
    search: /JAI\s+PRAKASH\s+NARAYAN\s+INTERNATIONAL\s+CENTRE/gi,
    replace: "PROJECT VANGUARD COMMERCIAL HUB"
  },
  {
    search: /Jai\s+Prakash\s+Narayan\s+International\s+Centre/gi,
    replace: "Project Vanguard Commercial Hub"
  },
  {
    search: /Jai\s+Prakash\s+Narayan\s+Centre/gi,
    replace: "Project Vanguard Hub"
  },

  // Acronym & Prefix Variations
  {
    search: /\bJPNIC-COMMERCIAL-HUB\b/g,
    replace: "VANGUARD-COMMERCIAL-HUB"
  },
  {
    search: /\bPROJECT\s+JPNIC\b/gi,
    replace: "PROJECT VANGUARD"
  },
  {
    search: /\bJPNIC\b/g,
    replace: "VANGUARD"
  },
  {
    search: /\bjpnic\b/g,
    replace: "vanguard"
  },
  {
    search: /\bjpnic([_-])/gi,
    replace: "vanguard$1"
  },

  // High-altitude / legacy civil scale cleanups from JPNIC
  {
    search: /94(\.0)?m\s+JPNIC\s+(high-altitude|tower|convention)/gi,
    replace: "15.0m Vanguard Commercial Envelope"
  },
  {
    search: /94(\.0)?\s*m\s+(high-altitude|tower\s+height)/gi,
    replace: "15.0m building height"
  },

  // Commercial & Money Area Cleanup (Scaling massive ₹500Cr-₹865Cr budgets down to Vanguard ₹1.859 Cr BAC)
  {
    search: /₹\s*865(\.0+)?\s*(Cr|Crore|Crores)/gi,
    replace: "₹1.859 Cr"
  },
  {
    search: /₹\s*520(\.0+)?\s*(Cr|Crore|Crores)/gi,
    replace: "₹1.859 Cr"
  },
  {
    search: /8650000000/g, // ₹865 Cr in raw numbers
    replace: "18592000"     // ₹1.8592 Cr (Vanguard BAC)
  },
  {
    search: /5200000000/g, // ₹520 Cr
    replace: "18592000"
  },
  {
    search: /Lucknow\s+Development\s+Authority\s*\(LDA\)\s*-\s*JPNIC/gi,
    replace: "Vanguard Holdings Group Pvt Ltd"
  }
];

let scannedFiles = 0;
let modifiedFiles = 0;
const hitLog = [];

function walkDirectory(currentDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      walkDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (!TARGET_EXTENSIONS.has(ext)) continue;

      scannedFiles++;
      let content = fs.readFileSync(fullPath, "utf8");
      let fileModified = false;
      const matchedPatterns = [];

      for (const rule of REPLACEMENTS) {
        if (rule.search.test(content)) {
          matchedPatterns.push(rule.search.toString());
          content = content.replace(rule.search, rule.replace);
          fileModified = true;
        }
      }

      if (fileModified) {
        fs.writeFileSync(fullPath, content, "utf8");
        modifiedFiles++;
        hitLog.push({ path: fullPath, patterns: matchedPatterns });
      }
    }
  }
}

console.log("============================================================");
console.log("🔍 SCANNING & PURGING JPNIC LEGACY DATA ACROSS CODEBASE...");
console.log("============================================================");

walkDirectory(process.cwd());

console.log(`\nScan Complete:`);
console.log(`- Total Code Files Scanned : ${scannedFiles}`);
console.log(`- Files Cleaned of JPNIC   : ${modifiedFiles}\n`);

if (hitLog.length > 0) {
  console.log("Modified Files:");
  hitLog.forEach(h => {
    console.log(`  ✓ ${path.relative(process.cwd(), h.path)}`);
  });
} else {
  console.log("No JPNIC references found. All files are clean.");
}
console.log("============================================================");
'
