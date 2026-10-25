#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: NON-INTERACTIVE CONSTRAINT DISCOVERY & DLP SEEDING
# ==============================================================================

set -euo pipefail
export GIT_PAGER=cat
export PAGER=cat

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
echo "    [1/3] EXTRACTING DEFINITIONS FROM SIBLING DLP SCRIPTS          "
echo "===================================================================="
if [ -f "verify_dlp_facility_dashboard_and_ppm_execution.sh" ]; then
  grep -n -C 5 -i "defect_category\|warranty_tickets\|dlp" verify_dlp_facility_dashboard_and_ppm_execution.sh || true
fi
if [ -f "audit_facility_governance_and_quarterly_dossier.sh" ]; then
  grep -n -C 5 -i "defect_category\|warranty_tickets\|dlp" audit_facility_governance_and_quarterly_dossier.sh || true
fi
echo "--------------------------------------------------------------------"

echo "===================================================================="
echo "    [2/3] EXTRACTING FROM GIT COMMIT LOGS                          "
echo "===================================================================="
git --no-pager log -S "dlp_warranty_tickets" -p -n 3 | grep -E "defect_category|CHECK|IN\s*\(|ARRAY\[" -B 2 -A 5 || true
git --no-pager log -G "dlp_warranty_tickets_defect_category_check" -p -n 2 || true
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

async function executeDlpPipeline() {
  console.log('\n[3/3] Resolving Constraint & Seeding Records...');
  const discovered = new Set();

  // 1. Scan git history non-interactively
  try {
    const gitDiff = execSync('git --no-pager log -S "dlp_warranty_tickets" -p -n 5', { encoding: 'utf8' });
    const inMatch = gitDiff.match(/defect_category[\s\S]*?IN\s*\(([^)]+)\)/i) ||
                    gitDiff.match(/defect_category[\s\S]*?ANY\s*\(\s*ARRAY\s*\[([^\]]+)\]/i);
    if (inMatch) {
      inMatch[1].split(',').map(s => s.trim().replace(/^['"::text\s]+|['"::text\s]+$/g, '')).forEach(v => {
        if (v) discovered.add(v);
      });
      console.log(`\x1b[32m✓ Located categories in Git history:\x1b[0m`, Array.from(discovered));
    }
  } catch (e) {}

  // 2. Scan sibling scripts for category strings
  const siblings = ['verify_dlp_facility_dashboard_and_ppm_execution.sh', 'audit_facility_governance_and_quarterly_dossier.sh'];
  for (const s of siblings) {
    if (fs.existsSync(s)) {
      const text = fs.readFileSync(s, 'utf8');
      const matches = text.matchAll(/defect_category["']?\s*[:=]\s*["']([^"']+)["']/g);
      for (const m of matches) {
        discovered.add(m[1].trim());
        console.log(`\x1b[32m✓ Located category in ${s}:\x1b[0m "${m[1].trim()}"`);
      }
    }
  }

  // 3. Candidate array fallback
  const candidates = discovered.size > 0 ? Array.from(discovered) : [
    "Plumbing", "Electrical", "HVAC", "Civil", "Finishes", "Carpentry", "Waterproofing", "Painting", "Masonry", "Other"
  ];

  console.log(`Testing candidates: [${candidates.join(', ')}]`);

  let createdTicket = null;
  let acceptedCat = null;

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
    console.log('\x1b[33m[INFO]\x1b[0m Inspect section [1/3] and [2/3] output above to verify the category constraint value.');
    return;
  }

  console.log(`  Ticket Code : ${createdTicket.ticket_code}`);
  console.log(`  Ticket UUID : ${createdTicket.id}`);

  // Insert geofenced inspection evidence
  console.log('\nSeeding Geofenced Evidence Records in inspection_evidence...');
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

  // Display SLA countdown
  const createdTime = new Date(createdTicket.created_at).getTime();
  const slaDeadlineMs = createdTime + (14 * 24 * 60 * 60 * 1000);
  const hoursLeft = Math.max(0, Math.round((slaDeadlineMs - Date.now()) / (1000 * 60 * 60)));

  console.log('\n\x1b[32m====================================================================\x1b[0m');
  console.log(`  DLP Ticket Code    : ${createdTicket.ticket_code}`);
  console.log(`  Defect Category    : ${createdTicket.defect_category}`);
  console.log(`  Asset Zone         : ${createdTicket.unit_or_asset_ref}`);
  console.log(`  Contractor Entity  : ${createdTicket.assigned_subcontractor}`);
  console.log(`  Statutory SLA      : 14 Calendar Days per CPWD GCC Clause 17`);
  console.log(`  Remaining Window   : ${hoursLeft} hours remaining (Breach: ${new Date(slaDeadlineMs).toISOString().split('T')[0]})`);
  console.log(`  Escrow Corpus Risk : INR 22,50,000.00 Retention Deposit`);
  console.log('\x1b[32m====================================================================\x1b[0m');
}

executeDlpPipeline().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
