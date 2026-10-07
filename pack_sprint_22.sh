#!/usr/bin/env bash
set -e

OUT="sprint_22.txt"

echo -e "\033[1;36m[+] Initializing Project Dependency Graph & Idle File Scanner...\033[0m"

node -e '
const fs = require("fs");
const path = require("path");

const ROOT_DIRS = ["app", "components", "lib", "context"];
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== "node_modules" && file !== ".next" && file !== ".git") {
        getAllFiles(fullPath, fileList);
      }
    } else {
      if (EXTENSIONS.some(ext => file.endsWith(ext))) {
        fileList.push(fullPath.replace(/\\/g, "/"));
      }
    }
  }
  return fileList;
}

const allProjectFiles = ROOT_DIRS.flatMap(d => getAllFiles(d));
console.log(`[+] Indexed ${allProjectFiles.length} source files across codebase.`);

// Map file basenames and normalized import paths
const fileLookup = new Map();
allProjectFiles.forEach(f => {
  const parsed = path.parse(f);
  const withoutExt = path.join(parsed.dir, parsed.name).replace(/\\/g, "/");
  fileLookup.set(withoutExt, f);
  fileLookup.set(f, f);
});

// Build Inbound Import Reference Count
const importCounts = new Map();
allProjectFiles.forEach(f => importCounts.set(f, 0));

allProjectFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, "utf8");
  // Match standard ES6 imports and dynamic imports
  const importRegex = /(?:import\s+(?:[\w*\s{},]*\s+from\s+)?|require\s*\(\s*)["\x27]([^"\x27]+)["\x27]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];

    let targetFile = null;
    if (importPath.startsWith("@/")) {
      const rel = importPath.slice(2);
      for (const ext of ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"]) {
        const candidate = rel + ext;
        if (allProjectFiles.includes(candidate)) {
          targetFile = candidate;
          break;
        }
      }
    } else if (importPath.startsWith(".")) {
      const resolved = path.resolve(path.dirname(filePath), importPath);
      const relFromRoot = path.relative(process.cwd(), resolved).replace(/\\/g, "/");
      for (const ext of ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"]) {
        const candidate = relFromRoot + ext;
        if (allProjectFiles.includes(candidate)) {
          targetFile = candidate;
          break;
        }
      }
    }

    if (targetFile && importCounts.has(targetFile)) {
      importCounts.set(targetFile, importCounts.get(targetFile) + 1);
    }
  }
});

// App routing entrypoints (Next.js App router files are inherently entrypoints)
function isNextRouteEntry(f) {
  return f.startsWith("app/") && (
    f.endsWith("page.tsx") || 
    f.endsWith("layout.tsx") || 
    f.endsWith("route.ts") || 
    f.endsWith("loading.tsx") || 
    f.endsWith("error.tsx") || 
    f.endsWith("not-found.tsx")
  );
}

const idleFiles = [];
const activeFiles = [];

allProjectFiles.forEach(f => {
  const count = importCounts.get(f) || 0;
  if (count === 0 && !isNextRouteEntry(f)) {
    idleFiles.push(f);
  } else {
    activeFiles.push(f);
  }
});

console.log("\n==================================================");
console.log(`SCAN COMPLETE:`);
console.log(`  • Active / Referenced Files: ${activeFiles.length}`);
console.log(`  • Idle / Unreferenced Files:  ${idleFiles.length}`);
console.log("==================================================\n");

// Pack the findings and idle file contents into sprint_22.txt
let output = "==================================================\n";
output += "SPRINT 22: IDLE & UNREFERENCED FILES AUDIT DOSSIER\n";
output += "==================================================\n\n";

output += "SUMMARY OF DETECTED IDLE / UNREFERENCED FILES:\n";
idleFiles.forEach((f, i) => {
  output += `  [${i + 1}] ${f}\n`;
});
output += "\n\n";

idleFiles.forEach(f => {
  output += "==================================================\n";
  output += `FILE: ${f}\n`;
  output += "==================================================\n";
  try {
    output += fs.readFileSync(f, "utf8");
  } catch (err) {
    output += `[Error reading file: ${err.message}]`;
  }
  output += "\n\n";
});

fs.writeFileSync("sprint_22.txt", output, "utf8");
console.log("[✓] Wrote complete idle file audit into sprint_22.txt");
'
