#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Initializing Quadillar Statutory Database Integrity Audit...\033[0m"

node -e '
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// 1. Resolve environment variables
let envContent = "";
for (const envFile of [".env.local", ".env"]) {
  if (fs.existsSync(envFile)) {
    envContent = fs.readFileSync(envFile, "utf8");
    break;
  }
}

const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["\x27]|["\x27]$/g, "");
});

const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("[-] Fatal: Missing NEXT_PUBLIC_SUPABASE_URL or Supabase Key in .env.local");
  process.exit(1);
}

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

async function runAudit() {
  console.log("----------------------------------------------------------------------");
  console.log("PROJECT ENTITY REGISTRATION AUDIT");
  console.log("----------------------------------------------------------------------");

  const { data: projects, error: projErr } = await supabase.from("projects").select("project_id, project_name");
  if (projErr) {
    console.error("[-] Error querying projects table:", projErr.message);
    process.exit(1);
  }

  const validProjectIds = new Set((projects || []).map((p) => p.project_id));
  console.log(`Registered Anchors in public.projects (${projects.length}):`);
  projects.forEach((p) => console.log(`  • [${p.project_id}] -> ${p.project_name}`));
  console.log("");

  console.log("----------------------------------------------------------------------");
  console.log("ORPHANED RECORD DETECTION ACROSS STATUTORY LEDGERS");
  console.log("----------------------------------------------------------------------");

  let totalOrphansAcrossSystem = 0;

  for (const table of TARGET_TABLES) {
    const { data: rows, error } = await supabase.from(table).select("id, project_id");
    if (error) {
      console.log(`  • ${table.padEnd(36)} [TABLE UNINITIALIZED OR ACCESS DENIED]`);
      continue;
    }

    const orphans = (rows || []).filter((r) => !r.project_id || !validProjectIds.has(r.project_id));
    const ghostBreakdown = {};

    orphans.forEach((o) => {
      const pid = o.project_id || "NULL / UNASSIGNED";
      ghostBreakdown[pid] = (ghostBreakdown[pid] || 0) + 1;
    });

    if (orphans.length > 0) {
      totalOrphansAcrossSystem += orphans.length;
      console.log(`  ⚠ ${table.padEnd(36)} -> ${orphans.length} ORPHANED ROW(S) DETECTED`);
      Object.entries(ghostBreakdown).forEach(([ghostId, count]) => {
        console.log(`      └─ Ghost project_id "${ghostId}": ${count} records`);
      });
    } else {
      console.log(`  ✓ ${table.padEnd(36)} -> CLEAN (0 orphans / ${rows.length} total)`);
    }
  }

  console.log("----------------------------------------------------------------------");
  if (totalOrphansAcrossSystem > 0) {
    console.log(`TOTAL ORPHANED RECORDS IDENTIFIED: ${totalOrphansAcrossSystem}`);
    console.log("Status: Action required. Run neutralize_orphans.sh to reconcile or purge.");
  } else {
    console.log("TOTAL ORPHANED RECORDS IDENTIFIED: 0");
    console.log("Status: All child table records strictly match active project anchors.");
  }
  console.log("----------------------------------------------------------------------");
}

runAudit();
'
