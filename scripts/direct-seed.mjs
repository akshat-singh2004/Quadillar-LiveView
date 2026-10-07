import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.resolve(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("ERROR: .env.local file not found in project root.");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    value = value.trim().replace(/^['"]|['"]$/g, "");
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const authKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !authKey) {
  console.error("ERROR: Missing Supabase credentials in .env.local.");
  console.log("Found Keys:", Object.keys(env));
  process.exit(1);
}

console.log("Connecting to Supabase:", supabaseUrl);
console.log("Using Key:", authKey.slice(0, 12) + "...");

const supabase = createClient(supabaseUrl, authKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const targetProjects = [
  "GOMTI-NAGAR-PH1-FITOUT",
  "PRJ-001",
  "PRJ-LKO-TOWER-A",
  "PRJ-1BHK-GOMTI",
  "PL-1BHK-GOMTI",
  "proj-default",
  "proj-1"
];

async function seed() {
  for (const pid of targetProjects) {
    process.stdout.write(`Seeding scope: ${pid}... `);

    await supabase.from("projects").upsert({
      project_id: pid,
      project_name: "Gomti Nagar Extension Commercial Hub Ph-1",
      contract_value: 450000000,
      active_stage: "ACTIVE",
      gcc_protocol: "CPWD GCC Cl. 14 / FIDIC Red Book",
    }, { onConflict: "project_id" });

    await supabase.from("digital_measurement_book_entries").upsert([
      {
        project_id: pid,
        boq_item_ref: "CPWD-DSR-04.1",
        entry_description: "RCC M30 in Columns & Core Shear Walls (Grid B2-C5 Level 04)",
        multiplier_count: 8,
        length_meters: 0.60,
        breadth_meters: 0.60,
        depth_height_meters: 3.50,
        measured_quantity: 10.08,
        unit_of_measure: "cum",
        contractor_verified: true,
        consultant_qs_verified: true,
        status: "VERIFIED"
      }
    ], { onConflict: "project_id,boq_item_ref" });

    await supabase.from("quality_ncr_register").upsert([
      {
        project_id: pid,
        ncr_ref_id: "NCR-IS456-042",
        location_zone: "Tower A / Level 04 / Grid C3-D5",
        subcontractor_name: "Falcon Structural RCC Works",
        defect_category: "Concrete Honeycombing & Voids (IS:456 Cl. 15.3)",
        description_of_defect: "Segregation and voiding at column base due to inadequate vibrator insertion.",
        withholding_amount_inr: 85000,
        root_cause_analysis: "Poured with excessive free-fall drop height (>1.5m) without tremie chute.",
        corrective_training_mandate: "Compulsory re-training on IS:456 compaction before next pour.",
        target_closure_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
        status: "OPEN"
      }
    ], { onConflict: "project_id,ncr_ref_id" });

    await supabase.from("running_account_bills").upsert([
      {
        project_id: pid,
        ra_bill_number: "RA-03",
        bill_sequence_no: 3,
        contractor_name: "Falcon Structural RCC Works",
        work_order_ref: "CW-2025/GOMTI-09",
        trade_package: "Civil & Superstructure Concrete",
        gross_work_done: 7450400,
        gross_valuation: 24875400,
        previous_gross_certified_inr: 17425000,
        retention_amount: 372520,
        mobilization_advance_recovery: 745040,
        labour_cess_amount: 74504,
        tds_amount: 149008,
        tds_gst_inr: 149008,
        ncr_backcharges_inr: 85000,
        net_payable_certified: 5875320,
        status: "SEOR_CERTIFIED_IPC",
        approved_at: new Date(Date.now() - 12 * 86400000).toISOString()
      }
    ], { onConflict: "project_id,ra_bill_number" });

    console.log("OK");
  }

  console.log("\nDATABASE SEED COMPLETE across all project scopes.");
}

seed().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
