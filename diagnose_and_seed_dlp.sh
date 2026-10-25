#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: DIAGNOSE CHECK CONSTRAINT & SEED DLP WARRANTY TICKET
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

node - << 'NODE_RUNNER_EOF'
const fs = require('fs');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const projectId = process.env.TARGET_PROJECT_ID;

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function diagnoseAndSeed() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    DIAGNOSING DLP SCHEMA & RESOLVING CHECK CONSTRAINTS             \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  // 1. Inspect lines in local seed files around defect_category
  const filesToCheck = [
    { path: 'scripts/direct-seed.mjs', start: 70, end: 100 },
    { path: 'app/api/seed/route.ts', start: 85, end: 115 },
    { path: 'scripts/auto-remediate.mjs', start: 80, end: 105 }
  ];

  for (const item of filesToCheck) {
    if (fs.existsSync(item.path)) {
      console.log(`\x1b[33m[INSPECTING ${item.path}]:\x1b[0m`);
      const lines = fs.readFileSync(item.path, 'utf8').split('\n');
      const snippet = lines.slice(item.start - 1, item.end).map((l, idx) => `  ${item.start + idx}: ${l}`).join('\n');
      console.log(snippet);
      console.log('--------------------------------------------------------------------');
    }
  }

  // 2. Inspect PostgREST OpenAPI spec for RPCs and dlp_warranty_tickets metadata
  try {
    const specRes = await fetch(`${supabaseUrl}/rest/v1/`, { headers: { 'apikey': supabaseKey } });
    if (specRes.ok) {
      const spec = await specRes.json();
      const rpcPaths = Object.keys(spec.paths || {}).filter(p => p.startsWith('/rpc/'));
      console.log(`\x1b[33m[AVAILABLE RPCs]:\x1b[0m [${rpcPaths.join(', ')}]`);

      const dlpDef = spec.definitions?.dlp_warranty_tickets;
      if (dlpDef?.properties?.defect_category) {
        console.log(`\x1b[33m[defect_category spec]:\x1b[0m`, JSON.stringify(dlpDef.properties.defect_category));
      }
    }
  } catch (err) {}

  // 3. Compile categorized test battery across construction & handover domains
  const testBattery = [
    // Civil / Structural / Core trades
    "Civil & Structural",
    "Civil / Structural",
    "Civil and Structural",
    "Structural",
    "Civil",
    "Masonry",
    "Waterproofing",
    "Finishes",
    "Carpentry",
    "Painting",
    "Flooring",
    
    // MEP trades & variations
    "MEP",
    "MEP - HVAC",
    "MEP - Electrical",
    "MEP - Plumbing",
    "HVAC",
    "HVAC & Ventilation",
    "HVAC / Ventilation",
    "HVAC & Air Distribution",
    "HVAC / Air Distribution",
    "Electrical",
    "Electrical & Power",
    "Electrical / Power",
    "Plumbing",
    "Plumbing & Sanitary",
    "Plumbing / Sanitary",
    "Fire Fighting",
    "Vertical Transportation",
    "Lift & Escalator",
    
    // Architectural & Interior
    "Architectural",
    "Architectural & Finishes",
    "Doors & Windows",
    "Doors and Windows",
    "Glazing & Facade",
    "False Ceiling",
    "Tile & Stone Work",
    
    // Defect Classification types
    "Workmanship",
    "Material Defect",
    "Design Defect",
    "Latent Defect",
    "Major Defect",
    "Minor Defect",
    "Cosmetic",
    "Operational",
    "Safety",
    "Water Ingress",
    "Crack",
    "Seepage",
    "Leakage",
    "General",
    "Other",

    // Lowercase & Uppercase variants
    "civil",
    "structural",
    "hvac",
    "electrical",
    "plumbing",
    "waterproofing",
    "CIVIL",
    "STRUCTURAL",
    "HVAC",
    "ELECTRICAL",
    "PLUMBING",
    "WATERPROOFING",
    "MEP",
    "OTHER"
  ];

  console.log(`\n[1/3] Testing candidate categories against dlp_warranty_tickets table...`);
  let createdTicket = null;
  let acceptedCategory = null;
  const failureErrors = new Set();

  for (const cat of testBattery) {
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
      failureErrors.add(err);

      // Check if ticket already exists
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
    console.log('\x1b[31m[FAILURE SUMMARY]:\x1b[0m Distinct database errors encountered:');
    failureErrors.forEach(e => console.log('  •', e));
    throw new Error('Check constraint dlp_warranty_tickets_defect_category_check could not be satisfied.');
  }

  console.log(`  Ticket Reference : ${createdTicket.ticket_code}`);
  console.log(`  Ticket UUID      : ${createdTicket.id}`);
  console.log(`  Category         : ${createdTicket.defect_category}`);

  // 4. Seed geofenced evidence into inspection_evidence
  console.log('\n[2/3] Seeding Geofenced Evidence Records in inspection_evidence...');
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
    console.log(`\x1b[32m✓ Seeded ${insertedEv.length} Evidence Records in inspection_evidence:\x1b[0m`);
    insertedEv.forEach((ev, i) => {
      console.log(`  [${i + 1}] Entity: ${ev.entity_type} | File: ${ev.storage_path}`);
      console.log(`      SHA-256: ${ev.sha256_hash} | Geofence: ${ev.geofence_cleared ? 'PASS (<=5m)' : 'FAIL'}`);
    });
  } else {
    console.log(`[Evidence Insert Status]: ${await evRes.text()}`);
  }

  // 5. Display Live CPWD GCC Clause 17 SLA status
  const createdTime = new Date(createdTicket.created_at).getTime();
  const slaDeadlineMs = createdTime + (14 * 24 * 60 * 60 * 1000);
  const hoursLeft = Math.max(0, Math.round((slaDeadlineMs - Date.now()) / (1000 * 60 * 60)));

  console.log('\n[3/3] Telemetry SLA Health Verification:');
  console.log('\x1b[32m====================================================================\x1b[0m');
  console.log(`  Ticket Code        : ${createdTicket.ticket_code}`);
  console.log(`  Defect Category    : ${createdTicket.defect_category}`);
  console.log(`  Asset Zone         : ${createdTicket.unit_or_asset_ref}`);
  console.log(`  Assigned Vendor    : ${createdTicket.assigned_subcontractor}`);
  console.log(`  Status             : ${createdTicket.warranty_claim_status} (${createdTicket.priority_tier})`);
  console.log(`  Statutory SLA      : 14 Calendar Days per CPWD GCC Clause 17`);
  console.log(`  Time to Breach     : ${hoursLeft} hours remaining (Deadline: ${new Date(slaDeadlineMs).toISOString().split('T')[0]})`);
  console.log(`  Corpus at Risk     : INR 22,50,000.00 Retention Deposit`);
  console.log('\x1b[32m====================================================================\x1b[0m');
}

diagnoseAndSeed().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
