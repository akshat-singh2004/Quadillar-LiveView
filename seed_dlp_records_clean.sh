#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: SEED DLP WARRANTY TICKET & INSPECTION EVIDENCE
# Schema Compliant: dlp_warranty_tickets & inspection_evidence
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
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const projectId = process.env.TARGET_PROJECT_ID;

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function seedCleanDLP() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    SEEDING DLP WARRANTY TICKET & GEOFENCED INSPECTION EVIDENCE     \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  // 1. Seed dlp_warranty_tickets with all non-null columns
  console.log('[1/2] Seeding defect ticket into dlp_warranty_tickets...');
  const ticketPayload = {
    project_id: projectId,
    ticket_code: "DLP-TKT-2026-001",
    unit_or_asset_ref: "Level 1 / Bay C3-D4 / VAV-1-NW-04",
    defect_category: "HVAC / Air Distribution",
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

  const tktRes = await fetch(`${supabaseUrl}/rest/v1/dlp_warranty_tickets`, {
    method: 'POST',
    headers,
    body: JSON.stringify(ticketPayload)
  });

  if (!tktRes.ok) {
    throw new Error(`Failed to insert warranty ticket: ${await tktRes.text()}`);
  }

  const [createdTicket] = await tktRes.json();
  console.log('\x1b[32m✓ DLP Warranty Ticket Seeded Successfully:\x1b[0m');
  console.log(`  Ticket ID   : ${createdTicket.id}`);
  console.log(`  Ticket Code : ${createdTicket.ticket_code}`);
  console.log(`  Asset Ref   : ${createdTicket.unit_or_asset_ref}`);
  console.log(`  Status      : ${createdTicket.warranty_claim_status} (${createdTicket.priority_tier})`);

  // 2. Seed inspection_evidence linking to the ticket and handover baseline
  console.log('\n[2/2] Registering Geofenced Evidence in inspection_evidence...');
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

  if (!evRes.ok) {
    throw new Error(`Failed to insert inspection evidence: ${await evRes.text()}`);
  }

  const insertedEv = await evRes.json();
  console.log(`\x1b[32m✓ Seeded ${insertedEv.length} Geofenced Evidence Records in inspection_evidence:\x1b[0m`);
  insertedEv.forEach((ev, idx) => {
    console.log(`  [${idx + 1}] Entity: ${ev.entity_type} | Storage: ${ev.storage_path}`);
    console.log(`      SHA-256: ${ev.sha256_hash} | Geofence: ${ev.geofence_cleared ? 'PASS (<=5m)' : 'FAIL'}`);
  });

  console.log('\x1b[32m====================================================================\x1b[0m');
}

seedCleanDLP().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
