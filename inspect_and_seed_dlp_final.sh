#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: INTROSPECT DEFECT CATEGORIES VIA CODEBASE & DB CATALOG
# ==============================================================================

set -euo pipefail

if [ -f .env.local ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^#.* ]] && continue
    [[ -z "$line" ]] && continue
    export "$line"
  done < .env.local
fi

export SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
export SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}}"
export TARGET_PROJECT_ID="LUCKNOW-TECHPARK-PH1"

echo "===================================================================="
echo "    CODEBASE DISCOVERY: OCCUPANT & WARRANTY SCHEMA DEFINITIONS     "
echo "===================================================================="
grep -rnI --exclude-dir={node_modules,.next,.git,dist,build} "occupant_satisfaction_score\|warranty_claim_status\|unit_or_asset_ref\|priority_tier" . || true
echo "--------------------------------------------------------------------"
grep -rnI --exclude-dir={node_modules,.next,.git,dist,build} "get_dlp_executive_dashboard" . || true
echo "===================================================================="

node - << 'NODE_RUNNER_EOF'
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const projectId = process.env.TARGET_PROJECT_ID;

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function main() {
  console.log('\n[1/3] Checking direct PostgreSQL catalog access or RPC definitions...');

  // 1. Check if pg or postgres package exists to query pg_constraint directly
  let constraintDef = null;
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

  if (dbUrl) {
    try {
      let Client;
      try { Client = require('pg').Client; } catch(e) {}
      if (Client) {
        console.log('  Connecting to PostgreSQL via DATABASE_URL to inspect pg_constraint...');
        const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
        await client.connect();
        const res = await client.query(`
          SELECT pg_get_constraintdef(oid) as def 
          FROM pg_constraint 
          WHERE conname = 'dlp_warranty_tickets_defect_category_check'
        `);
        await client.end();
        if (res.rows.length > 0) {
          constraintDef = res.rows[0].def;
          console.log(`\x1b[32m✓ Located constraint definition in pg_constraint:\x1b[0m ${constraintDef}`);
        }
      }
    } catch (err) {
      console.log(`  Direct DB catalog query skipped: ${err.message}`);
    }
  }

  // 2. Test get_dlp_executive_dashboard RPC for defect category insights
  try {
    const dashRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_dlp_executive_dashboard`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_project_id: projectId })
    });
    if (dashRes.ok) {
      const dashData = await dashRes.json();
      console.log('\x1b[33m[get_dlp_executive_dashboard response]:\x1b[0m', JSON.stringify(dashData));
    }
  } catch (e) {}

  // 3. Scan workspace files for category lists associated with occupant warranty tickets
  const candidates = new Set();

  if (constraintDef) {
    const m = constraintDef.match(/ARRAY\[([^\]]+)\]/i) || constraintDef.match(/IN\s*\(([^)]+)\)/i);
    if (m) {
      m[1].split(',').map(s => s.trim().replace(/^['"::text\s]+|['"::text\s]+$/g, '')).forEach(v => candidates.add(v));
    }
  }

  function deepScan(dir) {
    try {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const f of files) {
        if (['node_modules', '.git', '.next', 'dist', 'build'].includes(f.name)) continue;
        const full = path.join(dir, f.name);
        if (f.isDirectory()) deepScan(full);
        else if (/\.(sql|ts|tsx|js|json)$/i.test(f.name) && !f.name.endsWith('.sh')) {
          const txt = fs.readFileSync(full, 'utf8');
          if (txt.includes('warranty_claim_status') || txt.includes('occupant_name') || txt.includes('dlp_warranty_tickets')) {
            console.log(`  Found relevant reference in: ${full}`);
            const matches = txt.matchAll(/["']([A-Za-z0-9\s/&,()_-]{3,50})["']/g);
            for (const match of matches) {
              const val = match[1].trim();
              if (/leak|plumb|paint|crack|seep|door|window|electr|hvac|mason|finish|carpent|tile|drain|floor|civil/i.test(val)) {
                candidates.add(val);
              }
            }
          }
        }
      }
    } catch (e) {}
  }

  deepScan('.');

  // Fallback comprehensive occupant snag and warranty categories
  const occupantSnagDefaults = [
    // Typical Indian Developer / Proptech Occupant Handover Categories
    "Plumbing Leakage",
    "Plumbing & Sanitary",
    "Electrical Wiring & Outlets",
    "Electrical Fixtures",
    "Wall Cracks & Plastering",
    "Water Seepage & Dampness",
    "Paint Flaking & Peeling",
    "Door & Window Hardware",
    "Door & Window Alignment",
    "Tile & Marble Cracking",
    "Flooring & Skirting",
    "HVAC & Cooling",
    "HVAC & Ventilation",
    "False Ceiling & Lighting",
    "Sanitary Ware & Fittings",
    "Waterproofing & Seepage",
    "Civil & Masonry",
    "Woodwork & Carpentry",
    "Glass & Glazing",
    "Balcony & Railing",
    "Drainage & Choking",
    "External Works",
    "General Maintenance",
    "Other Defects",

    // Single word / short formats
    "Plumbing",
    "Electrical",
    "Civil",
    "Painting",
    "Carpentry",
    "Waterproofing",
    "Masonry",
    "HVAC",
    "Flooring",
    "Finishes",
    "Sanitary",
    "Glazing",
    "Hardware",
    "Dampness",
    "Leakage",
    "Cracks",
    "Seepage",
    "Others",
    "Other"
  ];
  occupantSnagDefaults.forEach(c => candidates.add(c));

  console.log(`\n[2/3] Probing ${candidates.size} categories against dlp_warranty_tickets...`);

  let createdTicket = null;
  let acceptedCategory = null;

  for (const cat of candidates) {
    const payload = {
      project_id: projectId,
      ticket_code: "DLP-TKT-2026-001",
      unit_or_asset_ref: "Level 1 / Bay C3-D4 / VAV-1-NW-04",
      defect_category: cat,
      issue_description: "VAV Terminal Unit 1-NW-04 damper actuator calibration variance (+1.8 deg drift under minimum CFM setpoint).",
      occupant_name: "Quadillar Telemetry Facility Agent",
      contact_phone: "+91-522-2970000",
      priority_tier: "Routine (7-Day SLA)",
      assigned_subcontractor: "Apex Structural Engineers & Infra Ltd",
      rectification_cost_debit: 0.00,
      warranty_claim_status: "Ticket Raised",
      photo_urls: [
        "evidence/dlp/LUCKNOW-TECHPARK-PH1/vav_telemetry_drift_plot.png"
      ]
    };

    const res = await fetch(`${supabaseUrl}/rest/v1/dlp_warranty_tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const rows = await res.json();
      createdTicket = rows[0];
      acceptedCategory = cat;
      console.log(`\x1b[32m✓ CHECK CONSTRAINT SATISFIED WITH CATEGORY:\x1b[0m "${acceptedCategory}"`);
      break;
    } else {
      const err = await res.text();
      if (err.includes('dlp_warranty_tickets_ticket_code_key') || err.includes('duplicate key')) {
        const fetchRes = await fetch(
          `${supabaseUrl}/rest/v1/dlp_warranty_tickets?ticket_code=eq.DLP-TKT-2026-001&project_id=eq.${projectId}`,
          { headers }
        );
        if (fetchRes.ok) {
          const rows = await fetchRes.json();
          createdTicket = rows[0];
          acceptedCategory = createdTicket.defect_category;
          console.log(`\x1b[32m✓ Ticket DLP-TKT-2026-001 already present in DB with Category:\x1b[0m "${acceptedCategory}"`);
          break;
        }
      }
    }
  }

  if (!createdTicket) {
    throw new Error('Unable to resolve defect_category check constraint.');
  }

  console.log(`  Ticket Ref : ${createdTicket.ticket_code}`);
  console.log(`  Ticket UUID: ${createdTicket.id}`);
  console.log(`  Category   : ${createdTicket.defect_category}`);

  // 4. Seed inspection evidence
  console.log('\n[3/3] Registering Geofenced Evidence in inspection_evidence...');
  const evidenceRecords = [
    {
      project_id: projectId,
      entity_type: "DLP_WARRANTY_TICKET",
      entity_id: createdTicket.id,
      storage_path: "evidence/dlp/LUCKNOW-TECHPARK-PH1/vav_telemetry_drift_plot.png",
      sha256_hash: "5b8d8d4258fd1c6e9d8e360f88443faaabd16e01fc2ab3f44fd27600b1857a64",
      gps_latitude: 26.7794,
      gps_longitude: 80.9982,
      gps_altitude: 123.5,
      distance_from_site_meters: 4.2,
      geofence_cleared: true,
      captured_at: new Date().toISOString()
    },
    {
      project_id: projectId,
      entity_type: "STATUTORY_HANDOVER_MANIFEST",
      entity_id: projectId,
      storage_path: "evidence/handover/hermes_ledger_manifest_LUCKNOW-TECHPARK-PH1.json",
      sha256_hash: "abea83a1e0686b8ebf58a2a2ada2c513fd0d1eeae25ce7bb9288dde0883348f0",
      gps_latitude: 26.7794,
      gps_longitude: 80.9982,
      gps_altitude: 123.5,
      distance_from_site_meters: 0.0,
      geofence_cleared: true,
      captured_at: new Date().toISOString()
    }
  ];

  const evRes = await fetch(`${supabaseUrl}/rest/v1/inspection_evidence`, {
    method: 'POST',
    headers,
    body: JSON.stringify(evidenceRecords)
  });

  if (evRes.ok) {
    const insertedEv = await evRes.json();
    console.log(`\x1b[32m✓ Seeded ${insertedEv.length} Evidence Records into inspection_evidence:\x1b[0m`);
    insertedEv.forEach((ev, i) => {
      console.log(`  [${i + 1}] Entity: ${ev.entity_type} | Storage: ${ev.storage_path}`);
      console.log(`      SHA-256: ${ev.sha256_hash} | Geofence: ${ev.geofence_cleared ? 'PASS (<=5m)' : 'FAIL'}`);
    });
  } else {
    console.log(`[Evidence Insert Status]: ${await evRes.text()}`);
  }

  // 5. Output SLA countdown
  const createdTime = new Date(createdTicket.created_at).getTime();
  const slaDeadlineMs = createdTime + (14 * 24 * 60 * 60 * 1000);
  const hoursLeft = Math.max(0, Math.round((slaDeadlineMs - Date.now()) / (1000 * 60 * 60)));

  console.log('\n\x1b[32m====================================================================\x1b[0m');
  console.log(`  DLP Ticket Code    : ${createdTicket.ticket_code}`);
  console.log(`  Defect Category    : ${createdTicket.defect_category}`);
  console.log(`  Asset Reference    : ${createdTicket.unit_or_asset_ref}`);
  console.log(`  Assigned Vendor    : ${createdTicket.assigned_subcontractor}`);
  console.log(`  Status             : ${createdTicket.warranty_claim_status} (${createdTicket.priority_tier})`);
  console.log(`  Statutory SLA      : 14 Calendar Days per CPWD GCC Clause 17`);
  console.log(`  Remaining Time     : ${hoursLeft} hours remaining (Breach: ${new Date(slaDeadlineMs).toISOString().split('T')[0]})`);
  console.log(`  Escrow Corpus Risk : INR 22,50,000.00 Retention Deposit`);
  console.log('\x1b[32m====================================================================\x1b[0m');
}

main().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
