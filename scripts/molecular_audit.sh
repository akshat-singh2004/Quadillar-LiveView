#!/usr/bin/env bash
set -euo pipefail

REPORT="/tmp/quadillar_molecular_audit.txt"

node <<'NODE' > "$REPORT"
const fs = require("fs");
const path = require("path");

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = [...walk("app"), ...walk("components"), ...walk("lib"), ...walk("context")];

console.log("=================================================================");
console.log("QUADILLAR LIVEVIEW — MOLECULAR ARCHITECTURE & LOGIC AUDIT REPORT");
console.log("=================================================================\n");

// 1. ROUTE SPRAWL & DUPLICATE DOMAIN PAGES
const pageFiles = files.filter((f) => f.endsWith("page.tsx"));
const domainBuckets = {
  DPR: [], PTW: [], NCR: [], RA_BILLS: [], EMB: [], BIM_TWIN: [],
  CUBE_TESTS: [], MATURITY: [], POUR_CARDS: [], PUNCH_SNAG: [],
  LABOR_MUSTER: [], GATE_INWARD: [], MATERIAL_RECON: [], EVM_SCURVE: [],
};
for (const f of pageFiles) {
  const route = "/" + path.relative("app", path.dirname(f)).replace(/\\/g, "/");
  const r = route.toLowerCase();
  if (r.includes("dpr")) domainBuckets.DPR.push(route);
  if (r.includes("ptw") || r.includes("permit")) domainBuckets.PTW.push(route);
  if (r.includes("ncr")) domainBuckets.NCR.push(route);
  if (r.includes("ra-bill") || r.includes("billing") || r.includes("ipc")) domainBuckets.RA_BILLS.push(route);
  if (r.includes("emb") || r.includes("measurement-book")) domainBuckets.EMB.push(route);
  if (r.includes("bim") || r.includes("digital-twin")) domainBuckets.BIM_TWIN.push(route);
  if (r.includes("cube")) domainBuckets.CUBE_TESTS.push(route);
  if (r.includes("maturity") || r.includes("hydration")) domainBuckets.MATURITY.push(route);
  if (r.includes("pour-card")) domainBuckets.POUR_CARDS.push(route);
  if (r.includes("punch") || r.includes("snag")) domainBuckets.PUNCH_SNAG.push(route);
  if (r.includes("labor") || r.includes("muster") || r.includes("workforce")) domainBuckets.LABOR_MUSTER.push(route);
  if (r.includes("gate") || r.includes("weighbridge")) domainBuckets.GATE_INWARD.push(route);
  if (r.includes("material") || r.includes("clause-42")) domainBuckets.MATERIAL_RECON.push(route);
  if (r.includes("evm") || r.includes("s-curve")) domainBuckets.EVM_SCURVE.push(route);
}
console.log(`=== 1. ROUTE SPRAWL AUDIT (Total Pages: ${pageFiles.length}) ===`);
for (const [domain, routes] of Object.entries(domainBuckets)) {
  if (routes.length > 1) {
    console.log(`  [DUPLICATE DOMAIN] ${domain} (${routes.length} routes): ${routes.join(", ")}`);
  }
}

// 2. SUPABASE TABLE FRAGMENTATION (WHICH TABLES ARE READ/WRITTEN WHERE)
const tableUsage = new Map();
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const matches = src.matchAll(/\.from\(\s*["'`]([a-zA-Z0-9_]+)["'`]\s*\)/g);
  for (const m of matches) {
    const tbl = m[1];
    if (!tableUsage.has(tbl)) tableUsage.set(tbl, new Set());
    tableUsage.get(tbl).add(f.replace(/\\/g, "/"));
  }
}
console.log(`\n=== 2. SUPABASE TABLE USAGE AUDIT (Distinct Tables Referenced: ${tableUsage.size}) ===`);
const sortedTables = [...tableUsage.entries()].sort((a, b) => a[0].localeCompare(b[0]));
for (const [tbl, refs] of sortedTables) {
  if (/audit|ledger|ncr|escrow|cube|pour|ptw|permit|bill|emb|measurement|dpr|field_grounding|project/.test(tbl)) {
    console.log(`  ${tbl} (${refs.size} files): ${[...refs].slice(0, 4).join(", ")}${refs.size > 4 ? " ..." : ""}`);
  }
}

// 3. HARDCODED DEMO THEATER & MULTI-TENANT LEAKAGE
const demoPatterns = [
  { label: "HARDCODED_GOMTI_ID", re: /["']GOMTI-NAGAR-PH1-FITOUT["']/g },
  { label: "HARDCODED_VANGUARD_ID", re: /VANGUARD_GENOME\.projectId|["']UP-LDA-VANGUARD-CAMPUS["']/g },
  { label: "HARDCODED_CANNED_HINGLISH", re: /Bhaiya Tower A|honeycombing aur/gi },
  { label: "HARDCODED_450K_LIEN", re: /\b450000\b/g },
  { label: "HARDCODED_FAKE_DIELECTRIC", re: /estimatedDielectricEr|dielectric|1\.6/gi },
  { label: "ONE_TAP_OR_SYNTHETIC_DEMO", re: /one[- ]?tap|syntheticSpoof|simulate|mock|dummy/gi },
];
console.log("\n=== 3. HARDCODED DEMO THEATER & TENANT LEAKAGE ===");
for (const pat of demoPatterns) {
  const hits = [];
  for (const f of files) {
    if (f.includes("seed") || f.includes("vanguardGenome")) continue;
    const src = fs.readFileSync(f, "utf8");
    const count = (src.match(pat.re) || []).length;
    if (count > 0) hits.push(`${f.replace(/\\/g, "/")}(${count})`);
  }
  console.log(`  [${pat.label}] ${hits.length} files: ${hits.slice(0, 8).join(", ")}${hits.length > 8 ? ` (+${hits.length - 8} more)` : ""}`);
}

// 4. SILENT ERROR SWALLOWING, EPHEMERAL RAM STATE & AUTH GAPS IN API ROUTES
const apiFiles = files.filter((f) => f.replace(/\\/g, "/").startsWith("app/api/"));
console.log(`\n=== 4. API ROUTE RELIABILITY, AUTH & STATE AUDIT (${apiFiles.length} routes) ===`);
for (const f of apiFiles) {
  const src = fs.readFileSync(f, "utf8");
  const flags = [];
  if (/catch\s*(\([^)]*\))?\s*\{\s*\}/.test(src)) flags.push("EMPTY_CATCH_SWALLOWS_ERRORS");
  if (/new Map\(|const [A-Z0-9_]+:\s*[^=]*\[\]\s*=\s*\[\]/.test(src)) flags.push("EPHEMERAL_IN_MEMORY_STATE");
  if (!/auth\.getUser|getSession|x-api-key|authorization/i.test(src)) flags.push("NO_SERVER_AUTH_CHECK");
  if (/SUPABASE_SERVICE_ROLE_KEY/.test(src) && !/auth\.getUser|getSession/.test(src)) flags.push("SERVICE_KEY_WITHOUT_AUTH");
  if (flags.length > 0) {
    console.log(`  ${f.replace(/\\/g, "/")} -> ${flags.join(" | ")}`);
  }
}

// 5. OFFLINE QUEUE WIRING CHECK
console.log("\n=== 5. OFFLINE QUEUE WIRING CHECK ===");
for (const q of ["offlineFieldQueue", "indexedDbQueue", "offlineQueue", "sync-queue"]) {
  const importers = files.filter((f) => fs.readFileSync(f, "utf8").includes(q)).map((f) => f.replace(/\\/g, "/"));
  console.log(`  ${q}: referenced in ${importers.length} files -> ${importers.join(", ") || "DEAD CODE (NEVER IMPORTED)"}`);
}

// 6. CRITICAL FIELD DRAWER & FORMULA FILES FOR MOLECULAR LOGIC REVIEW
console.log("\n=== 6. CRITICAL FORMULA & FIELD-INGRESS LOGIC INSPECTION ===");
const inspectFiles = [
  "lib/grounding/is456Validator.ts",
  "lib/agents/sub-agents/aegis/cube-statistics.ts",
  "lib/calculations/commercialFinanceEngine.ts",
  "lib/calculations/concreteMaturityEngine.ts",
  "lib/statutory/clause10b.ts",
  "lib/statutory/clause10cc.ts",
  "components/field/WhatsAppFieldCommsDrawer.tsx",
  "lib/audio/openSourceAudioEngine.ts",
];
for (const f of inspectFiles) {
  if (!fs.existsSync(f)) {
    console.log(`\n--- MISSING: ${f} ---`);
    continue;
  }
  const lines = fs.readFileSync(f, "utf8").split("\n");
  console.log(`\n--- FILE: ${f} (${lines.length} lines, showing first 110) ---`);
  console.log(lines.slice(0, 110).join("\n"));
}
NODE

echo "[DONE] Audit report written to $REPORT ($(wc -l < "$REPORT") lines)"
if command -v clip.exe >/dev/null 2>&1; then
  cat "$REPORT" | clip.exe
  echo "[COPIED TO CLIPBOARD — PASTE HERE]"
else
  cat "$REPORT"
fi
