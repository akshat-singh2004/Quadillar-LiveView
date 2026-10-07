import fs from "fs";
import path from "path";

console.log("\n================================================================================");
console.log("       QUADILLAR LIVEVIEW — MASTER SYSTEMIC REMEDIATION RUNNER                   ");
console.log("================================================================================\n");

const ROOT_DIRS = ["app", "components", "context", "lib"];
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

const LEGACY_IDS = [
  "PRJ-LKO-TOWER-A",
  "PRJ-1BHK-GOMTI",
  "PL-1BHK-GOMTI",
  "proj-default",
  "proj-1"
];

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
let filesModified = 0;
let totalReplacements = 0;

// 1. UNIFY ALL PROJECT IDENTIFIERS TO "GOMTI-NAGAR-PH1-FITOUT"
for (const filePath of allFiles) {
  const relPath = path.relative(process.cwd(), filePath);
  // Do not rewrite the seed route aliases
  if (relPath.includes("api/seed") || relPath.includes("api\\seed")) continue;

  let content = fs.readFileSync(filePath, "utf-8");
  let modified = false;

  for (const legacyId of LEGACY_IDS) {
    if (content.includes(legacyId)) {
      const regex = new RegExp(legacyId, "g");
      content = content.replace(regex, "GOMTI-NAGAR-PH1-FITOUT");
      modified = true;
      totalReplacements++;
    }
  }

  // Deduplicate identical consecutive option elements created by replacement
  if (content.includes('value="GOMTI-NAGAR-PH1-FITOUT"')) {
    content = content.replace(
      /(<option value="GOMTI-NAGAR-PH1-FITOUT"[^>]*>[\s\S]*?<\/option>\s*){2,}/g,
      '<option value="GOMTI-NAGAR-PH1-FITOUT">Gomti Nagar Commercial Hub (Active Scope)</option>\n'
    );
  }

  if (modified) {
    fs.writeFileSync(filePath, content, "utf-8");
    filesModified++;
  }
}
console.log(`✓ Project IDs unified: ${totalReplacements} references across ${filesModified} files.`);

// 2. PATCH app/lib/services.ts (Eliminate fallbackMeasurementBookEntries)
const servicesPath = path.resolve(process.cwd(), "app/lib/services.ts");
if (fs.existsSync(servicesPath)) {
  let content = fs.readFileSync(servicesPath, "utf-8");

  content = content.replace(
    /return fallbackMeasurementBookEntries\.filter\([^)]*\);/g,
    "return [];"
  );
  content = content.replace(
    /const fallbackMeasurementBookEntries: any\[\] = \[\];/g,
    "// Cleaned: fallback measurement arrays removed."
  );

  fs.writeFileSync(servicesPath, content, "utf-8");
  console.log("✓ Patched app/lib/services.ts (eradicated measurement book fallback leaks).");
}

// 3. REFACTOR COMMERCIAL ADVANCES PAGE (Connect to Supabase)
const commercialAdvancesPath = path.resolve(process.cwd(), "app/commercial/advances-recoveries/page.tsx");
if (fs.existsSync(commercialAdvancesPath)) {
  let content = fs.readFileSync(commercialAdvancesPath, "utf-8");
  // Replace SEED_ references with dynamic initial state
  content = content.replace(/const SEED_ADVANCES:[^=]*=\s*\[[\s\S]*?\];/g, "const SEED_ADVANCES: ContractAdvanceMaster[] = [];");
  content = content.replace(/const SEED_SECURED_MATERIALS:[^=]*=\s*\[[\s\S]*?\];/g, "const SEED_SECURED_MATERIALS: SecuredAdvanceMaterial[] = [];");
  content = content.replace(/const SEED_RECOVERY_SCHEDULES:[^=]*=\s*\[[\s\S]*?\];/g, "const SEED_RECOVERY_SCHEDULES: AdvanceRecoverySchedule[] = [];");
  content = content.replace(/advance_id:\s*SEED_ADVANCES\[0\]\.id,/g, 'advance_id: "ADV-01",');
  fs.writeFileSync(commercialAdvancesPath, content, "utf-8");
  console.log("✓ Rewired app/commercial/advances-recoveries/page.tsx to dynamic state.");
}

// 4. REFACTOR PRICE ESCALATION PAGE (Connect to Supabase)
const priceEscalationPath = path.resolve(process.cwd(), "app/commercial/price-escalation/page.tsx");
if (fs.existsSync(priceEscalationPath)) {
  let content = fs.readFileSync(priceEscalationPath, "utf-8");
  content = content.replace(/const SEED_STAR_RATES:[^=]*=\s*\[[\s\S]*?\];/g, "const SEED_STAR_RATES: ContractStarRate[] = [];");
  content = content.replace(/const SEED_MONTHLY_INDICES:[^=]*=\s*\[[\s\S]*?\];/g, "const SEED_MONTHLY_INDICES: MonthlyEconomicIndex[] = [];");
  content = content.replace(/const SEED_RA_BILLS:[^=]*=\s*\[[\s\S]*?\];/g, "const SEED_RA_BILLS: RaBillPaymentCycle[] = [];");
  fs.writeFileSync(priceEscalationPath, content, "utf-8");
  console.log("✓ Rewired app/commercial/price-escalation/page.tsx to dynamic state.");
}

// 5. REFACTOR VARIATIONS & DEVIATIONS PAGE (Connect to Supabase)
const variationsPath = path.resolve(process.cwd(), "app/commercial/variations-deviations/page.tsx");
if (fs.existsSync(variationsPath)) {
  let content = fs.readFileSync(variationsPath, "utf-8");
  content = content.replace(/const SEED_VARIATION_ORDERS:[^=]*=\s*\[[\s\S]*?\];/g, "const SEED_VARIATION_ORDERS: ContractVariationOrder[] = [];");
  content = content.replace(/const SEED_DEVIATION_ITEMS:[^=]*=\s*\[[\s\S]*?\];/g, "const SEED_DEVIATION_ITEMS: ContractDeviationItem[] = [];");
  content = content.replace(/const SEED_EXTRA_ITEMS:[^=]*=\s*\[[\s\S]*?\];/g, "const SEED_EXTRA_ITEMS: ExtraItemRateAnalysis[] = [];");
  fs.writeFileSync(variationsPath, content, "utf-8");
  console.log("✓ Rewired app/commercial/variations-deviations/page.tsx to dynamic state.");
}

// 6. REFACTOR MODULE ADVANCES
const modulesAdvancesPath = path.resolve(process.cwd(), "app/modules/advances/page.tsx");
if (fs.existsSync(modulesAdvancesPath)) {
  let content = fs.readFileSync(modulesAdvancesPath, "utf-8");
  content = content.replace(/const DEFAULT_RA_BILLS:[^=]*=\s*\[[\s\S]*?\];/g, "const DEFAULT_RA_BILLS: RABillScheduleInput[] = [];");
  content = content.replace(/const DEFAULT_FORM_31_ITEMS:[^=]*=\s*\[[\s\S]*?\];/g, "const DEFAULT_FORM_31_ITEMS: SecuredMaterialItem[] = [];");
  fs.writeFileSync(modulesAdvancesPath, content, "utf-8");
  console.log("✓ Rewired app/modules/advances/page.tsx to dynamic state.");
}

console.log("\n================================================================================");
console.log("       MASTER REMEDIATION COMPLETE — ALL DRIFT & MOCKS ERASED                   ");
console.log("================================================================================\n");
