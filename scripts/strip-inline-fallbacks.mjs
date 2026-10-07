import fs from "fs";
import path from "path";

const ROOT_DIRS = ["app", "components"];
const EXTENSIONS = [".ts", ".tsx"];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!["node_modules", ".next", ".git", "scripts"].includes(item)) {
        files = files.concat(walk(fullPath));
      }
    } else if (EXTENSIONS.includes(path.extname(fullPath))) {
      files.push(fullPath);
    }
  }
  return files;
}

const allFiles = ROOT_DIRS.flatMap((dir) => walk(path.resolve(process.cwd(), dir)));
let modified = 0;

for (const filePath of allFiles) {
  let code = fs.readFileSync(filePath, "utf-8");
  let changed = false;

  // 1. Remove ternary and logical OR number fallbacks: || 24875400, : 5875320, || 450000000
  if (code.includes("24875400") || code.includes("5875320") || code.includes("184250")) {
    code = code.replace(/\|\|\s*24875400/g, "|| 0");
    code = code.replace(/:\s*5875320/g, ": 0");
    code = code.replace(/safeManHours:\s*184250/g, "safeManHours: 0");
    code = code.replace(/cpi:\s*1\.04/g, "cpi: 0");
    code = code.replace(/spi:\s*[^,]+/g, "spi: 0");
    changed = true;
  }

  // 2. Remove default seed arrays in dashboard/closeout components
  if (code.includes("SEED_PUNCH_ITEMS")) {
    code = code.replace(/const SEED_PUNCH_ITEMS:[^=]+=\s*\[[\s\S]*?\];/g, "const SEED_PUNCH_ITEMS: PunchItem[] = [];");
    code = code.replace(/return SEED_PUNCH_ITEMS;/g, "return [];");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, code, "utf-8");
    modified++;
    console.log(`✓ Stripped fallbacks in: ${path.relative(process.cwd(), filePath)}`);
  }
}

console.log(`\nProcessed: Removed fallback data from ${modified} files.`);
