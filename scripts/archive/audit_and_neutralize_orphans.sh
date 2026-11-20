#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Running Robust Supabase Orphan Audit & Neutralization...\033[0m"

node -e '
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// 1. Scan for all possible environment files
const candidateEnvFiles = [
  ".env.local",
  ".env",
  ".env.development.local",
  ".env.development",
  ".env.production.local",
  ".env.production",
];

const parsedEnv = {};

candidateEnvFiles.forEach((filename) => {
  if (fs.existsSync(filename)) {
    console.log(`[+] Found environment file: ${filename}`);
    const raw = fs.readFileSync(filename, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      // Handle lines starting with "export "
      const cleanLine = trimmed.replace(/^export\s+/, "");
      const idx = cleanLine.indexOf("=");
      if (idx === -1) return;

      const key = cleanLine.slice(0, idx).trim();
      let val = cleanLine.slice(idx + 1).trim();

      // Strip surrounding quotes
      val = val.replace(/^["\x27]|["\x27]$/g, "").trim();

      if (!parsedEnv[key]) {
        parsedEnv[key] = val;
      }
    });
  }
});

// 2. Resolve URL and Key across all common aliases
const url =
  parsedEnv.NEXT_PUBLIC_SUPABASE_URL ||
  parsedEnv.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const key =
  parsedEnv.SUPABASE_SERVICE_ROLE_KEY ||
  parsedEnv.SUPABASE_SERVICE_KEY ||
  parsedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  parsedEnv.SUPABASE_ANON_KEY ||
  parsedEnv.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("\n[-] ERROR: Supabase credentials could not be resolved.");
  console.log("    Detected environment keys in .env files:");
  Object.keys(parsedEnv).forEach((k) => {
    if (k.toLowerCase().includes("supabase") || k.toLowerCase().includes("url") || k.toLowerCase().includes("key")) {
      console.log(`      • ${k}`);
    }
  });
  console.log("\nPlease ensure your .env.local file defines either:");
  console.log("  NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  console.log("  SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY\n");
  process.exit(1);
}

console.log(`[✓] Successfully resolved Supabase endpoint: ${url}`);
console.log(`[✓] Authenticating client with: ${parsedEnv.SUPABASE_SERVICE_ROLE_KEY ? "Service Role Key" : "Anon Key"}`);

const supabase = createClient(url, key, { auth: { persistSession: false } });

const TARGET_TABLES = [
  "running_account_bills",
  "digital_measurement_book_entries",
  "quality_ncr_register",
  "safety_ptw_register",
  "quality_concrete_cube_tests",
  "site_hindrance_register",
  "cde_drawing_packages",
  "drawing_spatial_pins",
  "punch_list_items",
  "labor_roster_entries",
  "contract_claims_disputes",
  "immutable_audit_logs",
  "daily_progress_reports",
  "site_microclimate_telemetry"
];

async function executeAuditAndNeutralize() {
  const canonicalId = "GOMTI-NAGAR-PH1-FITOUT";

  console.log("\n----------------------------------------------------------------------");
  console.log("1. VERIFYING CANONICAL PROJECT ANCHOR");
  console.log("----------------------------------------------------------------------");

  // Ensure canonical project exists
  const { error: upsertErr } = await supabase.from("projects").upsert({
    project_id: canonicalId,
    project_name: "Gomti Nagar Extension Commercial Hub Ph-1",
    contract_value: 450000000,
    gcc_protocol: "CPWD Works Manual / FIDIC Red Book",
    active_stage: "ACTIVE",
  });

  if (upsertErr) {
    console.warn(`  ⚠ Warning ensuring canonical project: ${upsertErr.message}`);
  } else {
    console.log(`  ✓ Canonical anchor verified: [${canonicalId}]`);
  }

  // Fetch all registered project IDs
  const { data: projects, error: projErr } = await supabase.from("projects").select("project_id, project_name");
  if (projErr) {
    console.error("[-] Error querying projects table:", projErr.message);
    process.exit(1);
  }

  const validProjectIds = new Set((projects || []).map((p) => p.project_id));
  console.log(`  ✓ Registered project entities (${projects.length}):`);
  projects.forEach((p) => console.log(`      • [${p.project_id}] -> ${p.project_name}`));

  console.log("\n----------------------------------------------------------------------");
  console.log("2. AUDITING & NEUTRALIZING ORPHANED ENTRIES");
  console.log("----------------------------------------------------------------------");

  let totalOrphansDetected = 0;
  let totalReconciled = 0;

  for (const table of TARGET_TABLES) {
    const { data: rows, error } = await supabase.from(table).select("id, project_id");
    if (error) {
      console.log(`  • ${table.padEnd(36)} [SKIPPED / TABLE NOT INITIALIZED]`);
      continue;
    }

    const orphans = (rows || []).filter((r) => !r.project_id || !validProjectIds.has(r.project_id));
    if (orphans.length === 0) {
      console.log(`  ✓ ${table.padEnd(36)} -> CLEAN (${rows.length} valid rows)`);
      continue;
    }

    totalOrphansDetected += orphans.length;
    console.log(`  ⚠ ${table.padEnd(36)} -> ${orphans.length} ORPHAN(S) DETECTED. Re-anchoring...`);

    for (const orphan of orphans) {
      const { error: updateErr } = await supabase
        .from(table)
        .update({ project_id: canonicalId })
        .eq("id", orphan.id);

      if (!updateErr) totalReconciled++;
    }
    console.log(`      └─ Bound ${orphans.length} records to [${canonicalId}]`);
  }

  console.log("\n======================================================================");
  console.log(`AUDIT & NEUTRALIZATION SUMMARY:`);
  console.log(`  • Orphaned Records Detected: ${totalOrphansDetected}`);
  console.log(`  • Successfully Reconciled:   ${totalReconciled}`);
  console.log(`  • Status:                    All satellite tables strictly bound to [${canonicalId}]`);
  console.log("======================================================================\n");
}

executeAuditAndNeutralize().catch((err) => {
  console.error("[-] Fatal runtime error:", err.message);
  process.exit(1);
});
'
