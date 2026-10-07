import fs from "fs";
import path from "path";

console.log("\n================================================================================");
console.log("       QUADILLAR LIVEVIEW — SYSTEMIC MOCK PURGE & EMPTY STATE LOCK              ");
console.log("================================================================================\n");

// ---------------------------------------------------------------------------
// 1. SURGICAL PURGE OF app/lib/services.ts (67 MOCKS)
// ---------------------------------------------------------------------------
const servicesPath = path.resolve(process.cwd(), "app/lib/services.ts");
if (fs.existsSync(servicesPath)) {
  let content = fs.readFileSync(servicesPath, "utf-8");

  // Regex matches `const fallbackXYZ: SomeType[] = [ ... ];`
  const fallbackArrayRegex = /const\s+(fallback[A-Za-z0-9_]*)\s*:\s*[^=]+=\s*\[[\s\S]*?\n\];/g;
  let count = 0;

  content = content.replace(fallbackArrayRegex, (match, varName) => {
    count++;
    // Extract type if possible, otherwise assign empty array
    const typeMatch = match.match(/:\s*([A-Za-z0-9_\[\]<>]+)\s*=/);
    const typeStr = typeMatch ? `: ${typeMatch[1]}` : "";
    return `const ${varName}${typeStr} = [];`;
  });

  // Also replace any single-object fallback declarations: `const fallback: RfiRecord = { ... };`
  content = content.replace(/const\s+fallback\s*:\s*RfiRecord\s*=\s*\{[\s\S]*?\n\s*\};/g, "const fallback = null as any;");

  fs.writeFileSync(servicesPath, content, "utf-8");
  console.log(`✓ Purged ${count} fallback mock datasets in app/lib/services.ts -> converted to []`);
}

// ---------------------------------------------------------------------------
// 2. PURGE PAGE-LEVEL STATIC SEEDS (Backcharges, Subcontractors, Signatures, etc.)
// ---------------------------------------------------------------------------
const PAGE_TARGETS = [
  "app/finance/backcharges/page.tsx",
  "app/finance/subcontractors/page.tsx",
  "app/governance/signatures/page.tsx",
  "app/handover/possession/page.tsx",
  "app/quality/itp/page.tsx",
  "app/quality/commissioning/page.tsx",
  "app/site/equipment/page.tsx",
  "app/commercial/advances-recoveries/page.tsx",
  "app/commercial/price-escalation/page.tsx",
  "app/commercial/variations-deviations/page.tsx",
  "app/modules/advances/page.tsx",
];

for (const relPath of PAGE_TARGETS) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");

  // Replace populated array literals initialized to `initial`, `initialOrders`, `gates`, `seedPacks`, etc.
  content = content.replace(
    /const\s+(initial[A-Za-z0-9_]*|gates|seedPacks|initialFleet)\s*:\s*([A-Za-z0-9_\[\]<>]+)\s*=\s*\[[\s\S]*?\n\];/g,
    "const $1: $2 = [];"
  );

  // Replace SEED_ and DEFAULT_ arrays
  content = content.replace(
    /const\s+(SEED_[A-Za-z0-9_]+|DEFAULT_[A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_\[\]<>]+)\s*=\s*\[[\s\S]*?\n\];/g,
    "const $1: $2 = [];"
  );

  fs.writeFileSync(fullPath, content, "utf-8");
  console.log(`✓ Neutralized static mock arrays in ${relPath}`);
}

console.log("\n================================================================================");
console.log("                      MOCK PURGE SCRIPT COMPLETED                               ");
console.log("================================================================================\n");
