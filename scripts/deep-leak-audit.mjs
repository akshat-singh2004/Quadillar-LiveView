import fs from "fs";
import path from "path";

const ROOT_DIRS = ["app", "components", "context", "lib"];
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

const KNOWN_PROJECT_IDS = [
  "GOMTI-NAGAR-PH1-FITOUT",
  "PRJ-001",
  "PRJ-1BHK-GOMTI",
  "proj-default",
  "proj-1",
  "PRJ-LKO-TOWER-A",
  "PL-1BHK-GOMTI",
];

const DEPRECATED_TABLES = [
  "measurement_book_entries",
  "safety_incident_register",
  "payment_applications",
];

const findings = {
  missingActionImports: [],
  deprecatedTables: [],
  mockFallbacks: [],
  projectIdDrift: [],
  inertStubs: [],
  financialAnomalies: [],
};

let filesScanned = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!["node_modules", ".next", ".git"].includes(item)) {
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
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const lineNo = index + 1;

    // 1. Missing Action Imports Check
    const actionImportMatch = line.match(/from\s+["']@\/app\/actions\/([^"']+)["']/);
    if (actionImportMatch) {
      const actionFile = path.resolve(process.cwd(), "app", "actions", `${actionImportMatch[1]}.ts`);
      const actionFileJs = path.resolve(process.cwd(), "app", "actions", `${actionImportMatch[1]}.js`);
      if (!fs.existsSync(actionFile) && !fs.existsSync(actionFileJs)) {
        findings.missingActionImports.push({
          file: relPath,
          line: lineNo,
          detail: `Imported '@/app/actions/${actionImportMatch[1]}' does not exist on disk`,
        });
      }
    }

    // 2. Deprecated Table Queries Check
    for (const table of DEPRECATED_TABLES) {
      if (line.includes(`from("${table}")`) || line.includes(`from('${table}')`)) {
        findings.deprecatedTables.push({
          file: relPath,
          line: lineNo,
          detail: `Querying deprecated/obsolete table "${table}"`,
        });
      }
    }

    // 3. Mock Data / Fallback State Check
    if (
      line.includes("SEED_") ||
      line.includes("DEFAULT_") ||
      line.includes("fallbackMeasurement") ||
      line.includes("fallbackDpr") ||
      line.includes("const [records] = useState<") && line.includes("DEFAULT_")
    ) {
      findings.mockFallbacks.push({
        file: relPath,
        line: lineNo,
        detail: line.trim(),
      });
    }

    // 4. Project ID Fragmentation / Scope Drift
    for (const pid of KNOWN_PROJECT_IDS) {
      if (line.includes(`"${pid}"`) || line.includes(`'${pid}'`)) {
        findings.projectIdDrift.push({
          file: relPath,
          line: lineNo,
          projectId: pid,
          snippet: line.trim(),
        });
      }
    }

    // 5. Inert Stubs (alert, prompt, empty onClick handlers)
    if (line.includes("alert(") || line.includes("prompt(")) {
      if (!line.includes("//") && !filePath.includes("test")) {
        findings.inertStubs.push({
          file: relPath,
          line: lineNo,
          detail: line.trim(),
        });
      }
    }

    // 6. Financial Ledger Inconsistencies (IT TDS 1% vs 2%)
    if (line.includes("Math.round(gross * 0.01)") && (line.includes("itTds") || line.includes("income_tax_tds"))) {
      findings.financialAnomalies.push({
        file: relPath,
        line: lineNo,
        detail: "Income Tax TDS calculated at 1% instead of 2% Sec 194C statutory rate for corporate contractors",
      });
    }
  });
}

// Print Formatted Audit Report
console.log("\n================================================================================");
console.log("             QUADILLAR LIVEVIEW — DEEP LEAK & INTEGRITY AUDIT                   ");
console.log("================================================================================");
console.log(`Files Analyzed: ${filesScanned}`);
console.log("--------------------------------------------------------------------------------\n");

function printSection(title, list) {
  console.log(`>>> ${title} [${list.length} DETECTED]`);
  if (list.length === 0) {
    console.log("    CLEAN: No defects found.\n");
    return;
  }
  list.slice(0, 30).forEach((item) => {
    if (item.projectId) {
      console.log(`  • ${item.file}:${item.line} -> Found Project ID: "${item.projectId}"`);
      console.log(`    Code: ${item.snippet}`);
    } else {
      console.log(`  • ${item.file}:${item.line}`);
      console.log(`    Detail: ${item.detail}`);
    }
  });
  if (list.length > 30) {
    console.log(`  ... and ${list.length - 30} more.`);
  }
  console.log("");
}

printSection("1. MISSING ACTION FILES (Turbopack Crash Risk)", findings.missingActionImports);
printSection("2. DEPRECATED DATABASE TABLES (Empty Table Bugs)", findings.deprecatedTables);
printSection("3. MOCK DATA & IN-MEMORY ARRAYS (Ghost Town Drivers)", findings.mockFallbacks);
printSection("4. INERT STUBS / BROWSER PROMPTS (Dead-End UI Buttons)", findings.inertStubs);
printSection("5. FINANCIAL LEDGER FORMULA ANOMALIES", findings.financialAnomalies);
printSection("6. PROJECT ID FRAGMENTATION & SCOPE DRIFT", findings.projectIdDrift);

console.log("================================================================================");
console.log(`TOTAL AUDIT FLAGS: ${
  findings.missingActionImports.length +
  findings.deprecatedTables.length +
  findings.mockFallbacks.length +
  findings.inertStubs.length +
  findings.financialAnomalies.length +
  findings.projectIdDrift.length
}`);
console.log("================================================================================\n");
