import fs from "fs";
import path from "path";

const ROOT_DIRS = ["app", "components", "lib"];
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

const MOCK_PATTERNS = [
  // 1. Array literals with multiple mock objects
  {
    name: "Populated Mock Array Literal",
    regex: /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*(?::\s*[^=]+)?=\s*\[\s*\{[\s\S]*?\}\s*\]/g,
  },
  // 2. Mock state initializers containing hardcoded items
  {
    name: "useState Initialized with Literal Array",
    regex: /useState\s*(?:<[^>]+>)?\s*\(\s*\[\s*\{[\s\S]*?\}\s*\]\s*\)/g,
  },
  // 3. Variables explicitly named mock/seed/fallback containing data
  {
    name: "Explicit Mock Variable",
    regex: /(?:const|let|var)\s+((?:mock|seed|fallback|sample|dummy)[A-Za-z0-9_]*)\s*(?::\s*[^=]+)?=\s*(\[|\{)/gi,
  },
  // 4. In-line hardcoded metric values in JSX/TSX
  {
    name: "Hardcoded KPI Constant",
    regex: /const\s+(?:total|active|critical|resolved|pending)[A-Za-z0-9_]*\s*=\s*\d+(?:\.\d+)?\s*;/g,
  }
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!["node_modules", ".next", ".git", "scripts", "tests"].includes(item)) {
        files = files.concat(walk(fullPath));
      }
    } else if (EXTENSIONS.includes(path.extname(fullPath))) {
      files.push(fullPath);
    }
  }
  return files;
}

const allFiles = ROOT_DIRS.flatMap((dir) => walk(path.resolve(process.cwd(), dir)));
const detections = [];

for (const filePath of allFiles) {
  const relPath = path.relative(process.cwd(), filePath);
  // Exclude seed endpoints and type definitions
  if (relPath.includes("api/seed") || relPath.endsWith(".d.ts")) continue;

  const content = fs.readFileSync(filePath, "utf-8");

  for (const pattern of MOCK_PATTERNS) {
    let match;
    pattern.regex.lastIndex = 0; // reset regex state
    while ((match = pattern.regex.exec(content)) !== null) {
      // Calculate line number
      const lineNo = content.substring(0, match.index).split("\n").length;
      const snippet = match[0].split("\n")[0].trim();

      // Filter out empty arrays or safe initializers
      if (snippet.includes("= []") || snippet.includes("= {}")) continue;

      detections.push({
        file: relPath,
        line: lineNo,
        type: pattern.name,
        snippet: snippet.length > 80 ? snippet.substring(0, 80) + "..." : snippet,
      });
    }
  }
}

console.log("\n================================================================================");
console.log("             QUADILLAR LIVEVIEW — COMPREHENSIVE MOCK LOCATOR                     ");
console.log("================================================================================");
console.log(`Files Scanned: ${allFiles.length}`);
console.log(`Mock Instances Found: ${detections.length}\n`);

// Group by file
const grouped = detections.reduce((acc, curr) => {
  acc[curr.file] = acc[curr.file] || [];
  acc[curr.file].push(curr);
  return acc;
}, {});

for (const [file, items] of Object.entries(grouped)) {
  console.log(`FILE: ${file} (${items.length} occurrences)`);
  items.forEach((item) => {
    console.log(`  • Line ${item.line} [${item.type}]`);
    console.log(`    ${item.snippet}`);
  });
  console.log("");
}

console.log("================================================================================\n");
