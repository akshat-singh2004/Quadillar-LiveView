import fs from "fs";
import path from "path";

const ROOT_DIRS = ["app", "components", "context", "lib"];
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

// Unwanted fragmented IDs that must NOT exist anywhere outside seed route
const UNWANTED_LEGACY_IDS = [
  "PRJ-LKO-TOWER-A",
  "PRJ-1BHK-GOMTI",
  "PL-1BHK-GOMTI",
  "proj-default",
  "proj-1",
];

const DEPRECATED_TABLES = [
  "measurement_book_entries",
  "safety_incident_register",
  "payment_applications",
];

const findings = {
  actualMockArraysWithData: [],
  unwantedLegacyIds: [],
  deprecatedTableReferences: [],
  unresolvedActionImports: [],
};

let filesScanned = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
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

for (const filePath of allFiles) {
  filesScanned++;
  const relPath = path.relative(process.cwd(), filePath);
  if (relPath.includes("api/seed") || relPath.includes("api\\seed")) continue;

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const lineNo = index + 1;

    // 1. Check for real populated mock arrays (ignoring empty arrays = [])
    if (
      (line.includes("SEED_") || line.includes("DEFAULT_")) &&
      line.includes("=") &&
      line.includes("[") &&
      !line.includes("[]")
    ) {
      findings.actualMockArraysWithData.push({
        file: relPath,
        line: lineNo,
        detail: line.trim(),
      });
    }

    // 2. Check for actual unwanted legacy project IDs
    for (const legacyId of UNWANTED_LEGACY_IDS) {
      if (line.includes(`"${legacyId}"`) || line.includes(`'${legacyId}'`)) {
        findings.unwantedLegacyIds.push({
          file: relPath,
          line: lineNo,
          legacyId,
          detail: line.trim(),
        });
      }
    }

    // 3. Check for deprecated tables
    for (const table of DEPRECATED_TABLES) {
      if (line.includes(`from("${table}")`) || line.includes(`from('${table}')`)) {
        findings.deprecatedTableReferences.push({
          file: relPath,
          line: lineNo,
          detail: `Querying obsolete table "${table}"`,
        });
      }
    }

    // 4. Missing action imports
    const actionImportMatch = line.match(/from\s+["']@\/app\/actions\/([^"']+)["']/);
    if (actionImportMatch) {
      const actionFile = path.resolve(process.cwd(), "app", "actions", `${actionImportMatch[1]}.ts`);
      const actionFileJs = path.resolve(process.cwd(), "app", "actions", `${actionImportMatch[1]}.js`);
      if (!fs.existsSync(actionFile) && !fs.existsSync(actionFileJs)) {
        findings.unresolvedActionImports.push({
          file: relPath,
          line: lineNo,
          detail: `@/app/actions/${actionImportMatch[1]} missing from disk`,
        });
      }
    }
  });
}

console.log("\n================================================================================");
console.log("       QUADILLAR LIVEVIEW — CALIBRATED HEALTH & INTEGRITY REPORT                ");
console.log("================================================================================");
console.log(`Files Verified: ${filesScanned}`);
console.log("--------------------------------------------------------------------------------\n");

function printSection(title, list) {
  console.log(`>>> ${title} [${list.length} REAL DEFECTS]`);
  if (list.length === 0) {
    console.log("    CLEAN: 0 issues found.\n");
    return;
  }
  list.forEach((item) => {
    console.log(`  • ${item.file}:${item.line}`);
    console.log(`    Detail: ${item.detail || item.legacyId}`);
  });
  console.log("");
}

printSection("1. UNRESOLVED ACTION IMPORTS", findings.unresolvedActionImports);
printSection("2. DEPRECATED DATABASE TABLES", findings.deprecatedTableReferences);
printSection("3. UNWANTED LEGACY PROJECT ID STRINGS", findings.unwantedLegacyIds);
printSection("4. POPULATED IN-MEMORY MOCK ARRAYS", findings.actualMockArraysWithData);

const totalRealIssues =
  findings.unresolvedActionImports.length +
  findings.deprecatedTableReferences.length +
  findings.unwantedLegacyIds.length +
  findings.actualMockArraysWithData.length;

console.log("================================================================================");
console.log(`TOTAL AUDIT DEFECTS: ${totalRealIssues}`);
console.log("================================================================================\n");
