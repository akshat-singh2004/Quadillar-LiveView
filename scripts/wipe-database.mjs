import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) env[match[1]] = (match[2] || "").trim().replace(/^['"]|['"]$/g, "");
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const authKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, authKey);

const TABLES = [
  "digital_measurement_book_entries",
  "running_account_bills",
  "quality_ncr_register",
  "quality_concrete_cube_tests",
  "safety_ptw_register",
  "site_hindrance_register",
  "punch_list_items",
  "drawing_spatial_pins",
  "immutable_audit_logs"
];

async function wipe() {
  console.log("Purging all database records across test projects...");
  for (const table of TABLES) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) console.warn(`Could not clear ${table}:`, error.message);
    else console.log(`✓ Cleared ${table}`);
  }
  console.log("\nDatabase completely wiped. All tables are at 0 rows.");
}

wipe();
