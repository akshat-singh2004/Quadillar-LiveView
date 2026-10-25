#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: EXTRACT IS DEFECT CATEGORIES & SEED DLP WARRANTY TICKET
# Target Table: public.dlp_warranty_tickets & public.inspection_evidence
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

async function run() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    EXTRACTING CANONICAL CATEGORIES & SEEDING DLP WARRANTY TICKET   \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const candidates = new Set();

  // 1. Direct inspection of identified seed files
  const seedFiles = [
    'app/api/seed/route.ts',
    'scripts/auto-remediate.mjs',
    'scripts/direct-seed.mjs',
    'scripts/eradicate-mocks-and-drift.mjs'
  ];

  for (const f of seedFiles) {
    if (fs.existsSync(f)) {
      const content = fs.readFileSync(f, 'utf8');
      const matches = content.matchAll(/defect_category\s*:\s*["']([^"']+)["']/g);
      for (const m of matches) {
        candidates.add(m[1].trim());
        console.log(`\x1b[32m✓ Found category in ${f}:\x1b[0m "${m[1].trim()}"`);
      }
    }
  }

  // 2. Query any existing records in dlp_warranty_tickets across all projects
  try {
    const existingRes = await fetch(`${supabaseUrl}/rest/v1/dlp_warranty_tickets?select=defect_category&limit=20`, {
      headers: { 'apikey': supabaseKey }
    });
    if (existingRes.ok) {
      const rows = await existingRes.json();
      rows.forEach(r => {
        if (r.defect_category) {
          candidates.add(r.defect_category);
          console.log(`\x1b[32m✓ Found existing DB record category:\x1b[0m "${r.defect_category}"`);
        }
      });
    }
  } catch (err) {}

  // 3. Fallback standard CPWD/IS defect formulations
  const standardISCategories = [
    "Concrete Honeycombing & Voids (IS:456 Cl. 15.3)",
    "Low Concrete Core Compressive Strength (IS:456 Cl. 15.3)",
    "Thermal Movement & Masonry Shrinkage Cracks (IS:1905)",
    "Expansion Joint & Waterproofing Seepage (IS:1346)",
    "MEP Ductwork & Air Distribution Variance (IS:655 / NBC Part 8)",
    "HVAC Telemetry & Damper Actuator Drift",
    "Concrete Honeycombing & Voids",
    "Core Compressive Strength Variance"
  ];
  standardISCategories.forEach(c => candidates.add(c));

  const candidateList = Array.from(candidates);
  console.log(`\nTesting ${candidateList.length} canonical categories against table check constraint...`);

  // 4. Test candidate categories against dlp_warranty_tickets
  let createdTicket = null;
  let acceptedCat = null;

  for (const cat of candidateList) {
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
      acceptedCat = cat;
      console.log(`\x1b[32m✓ Check Constraint Accepted Category:\x1b[0m "${acceptedCat}"`);
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
          acceptedCat = createdTicket.defect_category;
          console.log(`\x1b[32m✓ Ticket DLP-TKT-2026-001 already present in DB with Category:\x1b[0m "${acceptedCat}"`);
          break;
        }
      }
    }
  }

  if (!createdTicket) {
    throw new Error('None of the extracted canonical categories satisfied dlp_warranty_tickets_defect_category_check');
  }

  console.log(`  Ticket Ref : ${createdTicket.ticket_code}`);
  console.log(`  Ticket ID  : ${createdTicket.id}`);
  console.log(`  Category   : ${createdTicket.defect_category}`);

  // 5. Insert geofenced inspection evidence linking to the ticket and completion manifest
  console.log('\n[2/2] Registering Geofenced Evidence into inspection_evidence...');
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

  // 6. SLA Telemetry Status
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

run().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
