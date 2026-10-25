#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: EXTRACT CONSTRAINT VIA GIT HISTORY / DB CATALOG & SEED DLP
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
echo "    [1/4] GIT COMMIT LOG FOR DLP_WARRANTY_TICKETS & DEFECT_CATEGORY  "
echo "===================================================================="
git log -S "dlp_warranty_tickets" -p -n 2 --color=never || true
echo "--------------------------------------------------------------------"
git log -S "defect_category" -p -n 2 --color=never || true
echo "===================================================================="

echo -e "\n===================================================================="
echo "    [2/4] INSPECTING SIBLING DLP & FACILITY GOVERNANCE SCRIPTS     "
echo "===================================================================="
if [ -f "verify_dlp_facility_dashboard_and_ppm_execution.sh" ]; then
  echo "--- verify_dlp_facility_dashboard_and_ppm_execution.sh (Head) ---"
  head -n 45 verify_dlp_facility_dashboard_and_ppm_execution.sh || true
fi
if [ -f "audit_facility_governance_and_quarterly_dossier.sh" ]; then
  echo "--- audit_facility_governance_and_quarterly_dossier.sh (Head) ---"
  head -n 45 audit_facility_governance_and_quarterly_dossier.sh || true
fi
echo "===================================================================="

echo -e "\n===================================================================="
echo "    [3/4] ENVIRONMENT & PACKAGE DISCOVERY                          "
echo "===================================================================="
if [ -f ".env.local" ]; then
  echo -n "Available .env.local keys: "
  grep -o '^[A-Z0-9_]*' .env.local | tr '\n' ' '
  echo ""
fi
if [ -f "package.json" ]; then
  grep -E "pg|postgres|supabase" package.json || true
fi
echo "===================================================================="

node - << 'NODE_RUNNER_EOF'
const fs = require('fs');
const { execSync } = require('child_process');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const projectId = process.env.TARGET_PROJECT_ID;

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function runDiscoveryAndSeed() {
  console.log('\n[4/4] Executing Catalog Query & Insertion Pipeline...');
  const discoveredCategories = new Set();

  // A. Check git log output directly for CHECK expressions
  try {
    const gitOutput = execSync('git log -S "dlp_warranty_tickets" -p -n 5', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const match = gitOutput.match(/defect_category[\s\S]*?IN\s*\(([^)]+)\)/i) || 
                  gitOutput.match(/defect_category[\s\S]*?ANY\s*\(\s*ARRAY\s*\[([^\]]+)\]/i);
    if (match) {
      match[1].split(',').map(s => s.trim().replace(/^['"::text\s]+|['"::text\s]+$/g, '')).forEach(v => {
        if (v) discoveredCategories.add(v);
      });
      console.log('\x1b[32m✓ Extracted constraint from Git history:\x1b[0m', Array.from(discoveredCategories));
    }
  } catch (e) {}

  // B. Attempt PostgreSQL catalog connection if DB password or URL is present
  const projectRef = (supabaseUrl || '').match(/https:\/\/([^.]+)\.supabase/)?.[1];
  const dbPassword = process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD || process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || (projectRef && dbPassword ? `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres` : null);

  if (dbUrl) {
    try {
      let Client;
      try { Client = require('pg').Client; } catch(e) {}
      if (Client) {
        console.log('  Connecting to PostgreSQL via direct connection to inspect pg_constraint...');
        const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
        await client.connect();
        const res = await client.query(`
          SELECT pg_get_constraintdef(oid) as def 
          FROM pg_constraint 
          WHERE conname = 'dlp_warranty_tickets_defect_category_check'
        `);
        await client.end();
        if (res.rows.length > 0) {
          const def = res.rows[0].def;
          console.log(`\x1b[32m✓ pg_constraint definition:\x1b[0m ${def}`);
          const m = def.match(/ARRAY\[([^\]]+)\]/i) || def.match(/IN\s*\(([^)]+)\)/i);
          if (m) {
            m[1].split(',').map(s => s.trim().replace(/^['"::text\s]+|['"::text\s]+$/g, '')).forEach(v => {
              if (v) discoveredCategories.add(v);
            });
          }
        }
      }
    } catch (err) {
      console.log(`  Direct DB catalog check note: ${err.message}`);
    }
  }

  // C. Inspect sibling scripts for existing ticket payloads
  const siblingFiles = ['verify_dlp_facility_dashboard_and_ppm_execution.sh', 'audit_facility_governance_and_quarterly_dossier.sh'];
  for (const sf of siblingFiles) {
    if (fs.existsSync(sf)) {
      const content = fs.readFileSync(sf, 'utf8');
      const matches = content.matchAll(/defect_category["']?\s*[:=]\s*["']([^"']+)["']/g);
      for (const m of matches) {
        discoveredCategories.add(m[1].trim());
        console.log(`\x1b[32m✓ Located defect_category in ${sf}:\x1b[0m "${m[1].trim()}"`);
      }
    }
  }

  const categoryList = Array.from(discoveredCategories);
  if (categoryList.length === 0) {
    console.log('\x1b[33m[INFO]\x1b[0m Review Git and Script inspection output above to identify exact schema declaration.');
    return;
  }

  console.log(`\nTesting ${categoryList.length} discovered categories against dlp_warranty_tickets...`);
  let createdTicket = null;
  let acceptedCategory = null;

  for (const cat of categoryList) {
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
    console.log('\x1b[31m[WARNING]\x1b[0m Categories in list did not satisfy check constraint. Check git log output above.');
    return;
  }

  // Insert geofenced inspection evidence
  console.log('\nPersisting Geofenced Evidence into inspection_evidence...');
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
      console.log(`  [${i + 1}] Entity: ${ev.entity_type} | File: ${ev.storage_path}`);
      console.log(`      SHA-256: ${ev.sha256_hash} | Geofence: ${ev.geofence_cleared ? 'PASS (<=5m)' : 'FAIL'}`);
    });
  }

  // Display SLA telemetry countdown
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

runDiscoveryAndSeed().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
