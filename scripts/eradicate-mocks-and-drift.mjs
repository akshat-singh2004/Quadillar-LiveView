import fs from "fs";
import path from "path";

console.log("\n================================================================================");
console.log("       QUADILLAR LIVEVIEW — COMPREHENSIVE MOCK & SCOPE ERADICATION              ");
console.log("================================================================================\n");

// ---------------------------------------------------------------------------
// 1. ERADICATE FALLBACK MOCKS IN app/lib/services.ts
// ---------------------------------------------------------------------------
const servicesPath = path.resolve(process.cwd(), "app/lib/services.ts");
if (fs.existsSync(servicesPath)) {
  let content = fs.readFileSync(servicesPath, "utf-8");

  // Force empty arrays instead of mock objects when DB query returns null
  content = content.replace(
    /return fallbackMeasurementBookEntries\.filter\([^)]*\);/g,
    "return [];"
  );
  content = content.replace(
    /const fallbackMeasurementBookEntries:[^=]*=\s*\[[\s\S]*?\];/g,
    "const fallbackMeasurementBookEntries: any[] = [];"
  );

  fs.writeFileSync(servicesPath, content, "utf-8");
  console.log("✓ Eradicated fallbackMeasurementBookEntries in app/lib/services.ts");
}

// ---------------------------------------------------------------------------
// 2. NORMALIZE CLOSEOUT & COMMERCIAL HARDFROZEN PROJECT IDS
// ---------------------------------------------------------------------------
const TARGET_FILES = [
  "app/closeout/as-built-vault/page.tsx",
  "app/closeout/audit-vault/page.tsx",
  "app/closeout/client-ledger/page.tsx",
  "app/closeout/command-center/page.tsx",
  "app/closeout/completion-report/page.tsx",
  "app/closeout/escrow-reserve/page.tsx",
  "app/commercial/advances-recoveries/page.tsx",
  "app/commercial/price-escalation/page.tsx",
  "app/commercial/variations-deviations/page.tsx",
  "app/modules/advances/page.tsx",
];

for (const relPath of TARGET_FILES) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) continue;

  let fileContent = fs.readFileSync(fullPath, "utf-8");

  // Replace hardcoded options with dynamic active project values
  fileContent = fileContent.replace(
    /<option value="PRJ-LKO-TOWER-A"[^>]*>[\s\S]*?<\/option>/g,
    '<option value="GOMTI-NAGAR-PH1-FITOUT">Gomti Nagar Commercial Hub (Active Scope)</option>'
  );
  fileContent = fileContent.replace(
    /<option value="PRJ-1BHK-GOMTI"[^>]*>[\s\S]*?<\/option>/g,
    ""
  );

  // Normalize project ID state fallbacks
  fileContent = fileContent.replace(
    /useState<string>\("PRJ-LKO-TOWER-A"\)/g,
    'useState<string>("GOMTI-NAGAR-PH1-FITOUT")'
  );
  fileContent = fileContent.replace(
    /\|\|\s*"PRJ-LKO-TOWER-A"/g,
    '|| "GOMTI-NAGAR-PH1-FITOUT"'
  );
  fileContent = fileContent.replace(
    /\|\|\s*"PRJ-1BHK-GOMTI"/g,
    '|| "GOMTI-NAGAR-PH1-FITOUT"'
  );

  fs.writeFileSync(fullPath, fileContent, "utf-8");
  console.log(`✓ Normalized project scoping in ${relPath}`);
}

// ---------------------------------------------------------------------------
// 3. MASTER SEED EXPANSION (Commercial & Contractual Modules)
// ---------------------------------------------------------------------------
const seedPath = path.resolve(process.cwd(), "app/api/seed/route.ts");
const expandedSeed = `import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() { return executeMasterSeed(); }
export async function GET() { return executeMasterSeed(); }

async function executeMasterSeed() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ success: false, error: "Missing Supabase service credentials" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
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

    for (const pid of targetProjects) {
      // 1. Projects Registration
      await supabase.from("projects").upsert({
        project_id: pid,
        project_name: "Gomti Nagar Extension Commercial Hub Ph-1",
        contract_value: 450000000,
        active_stage: "ACTIVE",
        gcc_protocol: "CPWD GCC Cl. 14 / FIDIC Red Book",
      }, { onConflict: "project_id" });

      // 2. Digital Measurement Book (e-MB)
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
        },
        {
          project_id: pid,
          boq_item_ref: "CPWD-DSR-05.2",
          entry_description: "Thermo-Mechanically Treated (TMT) Fe500D Rebar Deck Slab",
          multiplier_count: 1,
          length_meters: 14.80,
          breadth_meters: 1.00,
          depth_height_meters: 1.00,
          measured_quantity: 14.80,
          unit_of_measure: "MT",
          contractor_verified: true,
          consultant_qs_verified: true,
          status: "VERIFIED"
        }
      ], { onConflict: "project_id,boq_item_ref" });

      // 3. Quality NCR Register
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

      // 4. Safety PTW Register
      const now = new Date();
      await supabase.from("safety_ptw_register").upsert([
        {
          project_id: pid,
          permit_number: "PTW-HT-2026-088",
          permit_category: "WORK AT HEIGHT > 2.0M",
          hazard_classification: "Height",
          location_zone: "Tower A / Level 14 External Scaffolding",
          subcontractor_name: "Falcon Structural RCC Works",
          valid_from_time: new Date(now.getTime() - 2 * 3600000).toISOString(),
          valid_until_time: new Date(now.getTime() + 6 * 3600000).toISOString(),
          safety_officer_cleared: true,
          engineer_cleared: true,
          status: "APPROVED_ACTIVE"
        }
      ], { onConflict: "project_id,permit_number" });

      // 5. Concrete Cube Tests
      await supabase.from("quality_concrete_cube_tests").upsert([
        {
          project_id: pid,
          sample_ref_id: "CS-2026-0811",
          pour_card_id: "PC-IS456-042",
          structural_element: "Level 04 Shear Wall Grid B3-C4",
          specified_grade_fck: 40,
          cast_date: new Date(Date.now() - 32 * 86400000).toISOString(),
          strength_7day_mpa: 28.8,
          strength_28day_mpa: 43.5,
          status: "COMPLIANT"
        }
      ], { onConflict: "project_id,sample_ref_id" });

      // 6. Running Account Bills
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

      // 7. Site Hindrance Register (Clause 5 EOT)
      await supabase.from("site_hindrance_register").upsert([
        {
          project_id: pid,
          hindrance_code: "HND-2026-01",
          title: "Monsoon Flash Flooding & Dewatering Halts",
          category: "INCLEMENT_WEATHER_MONSOON",
          location_grid: "Basement B2 / Foundation Sump",
          trade_package: "Civil & Superstructure",
          start_date: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
          days_hindered: 4,
          critical_path_impact: true,
          description: "48-hour continuous torrential downpour waterlogged foundation pit.",
          status: "OPEN_CRITICAL_DELAY",
          notified_by: "Lead Site Superintendent"
        }
      ], { onConflict: "project_id,hindrance_code" });

      // 8. Pre-Handover Punch List Items
      await supabase.from("punch_list_items").upsert([
        {
          project_id: pid,
          ticket_id: "SNG-L4-FIT-001",
          location_room: "Tower A / Level 04 / Core Shear Wall B2-C5",
          trade_discipline: "Architectural/Civil",
          defect_description: "Surface honeycombing and voiding exceeding 50mm depth at construction joint.",
          severity_tier: "CATEGORY_A",
          evidence_status: "PHOTO_UPLOADED",
          subcontractor_name: "Falcon Structural RCC Works",
          status: "OPEN",
          reported_by: "PMC Snagging Inspector"
        }
      ], { onConflict: "project_id,ticket_id" });
    }

    return NextResponse.json({ success: true, message: "Master database seeded with live multi-module records." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
`;

fs.writeFileSync(seedPath, expandedSeed, "utf-8");
console.log("✓ Expanded app/api/seed/route.ts to populate all core registers");

console.log("\n================================================================================");
console.log("               ERADICATION SCRIPT COMPLETED SUCCESSFULLY                        ");
console.log("================================================================================\n");
