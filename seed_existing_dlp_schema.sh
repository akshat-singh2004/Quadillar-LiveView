#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: INTROSPECT & SEED DLP_WARRANTY_TICKETS & INSPECTION_EVIDENCE
# Standards: CPWD GCC Clause 17, NBC 2016 Part 8
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

async function syncExistingSchema() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    INTROSPECTING SCHEMA & SEEDING DLP WARRANTY & INSPECTION TABLES \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  // 1. Fetch OpenAPI specification from root PostgREST endpoint
  const specRes = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: { 'apikey': supabaseKey }
  });

  if (!specRes.ok) {
    throw new Error(`Failed to fetch PostgREST OpenAPI spec: ${await specRes.text()}`);
  }

  const spec = await specRes.json();
  const dlpTicketCols = Object.keys(spec.definitions?.dlp_warranty_tickets?.properties || {});
  const inspEvidenceCols = Object.keys(spec.definitions?.inspection_evidence?.properties || {});

  console.log(`\x1b[33m[dlp_warranty_tickets columns]:\x1b[0m [${dlpTicketCols.join(', ')}]`);
  console.log(`\x1b[33m[inspection_evidence columns]:\x1b[0m  [${inspEvidenceCols.join(', ')}]`);

  // Helper to map values only to declared schema columns
  const filterByCols = (sourceObj, validCols) => {
    const out = {};
    for (const [k, v] of Object.entries(sourceObj)) {
      if (validCols.includes(k)) {
        out[k] = v;
      }
    }
    return out;
  };

  // 2. Map and Insert Ticket into dlp_warranty_tickets
  console.log('\n[1/2] Seeding Latent Defect Ticket into dlp_warranty_tickets...');
  const baseTicket = {
    project_id: projectId,
    ticket_ref: "DLP-TKT-2026-001",
    ticket_code: "DLP-TKT-2026-001",
    floor_level: "Level 1",
    location: "North-West Open Workstation Bay (Grid C3-D4)",
    spatial_zone: "North-West Open Workstation Bay (Grid C3-D4)",
    bim_element_guid: "2f8a91b4-4e2a-49c8-9d7e-8c3120b08fa1",
    trade_category: "MEP_HVAC_AIR_DISTRIBUTION",
    trade: "MEP_HVAC_AIR_DISTRIBUTION",
    defect_classification: "LATENT_OBSERVATION",
    severity: "LOW",
    title: "VAV-1-NW-04 Damper Calibration Variance",
    description: "VAV Terminal Unit 1-NW-04 damper actuator calibration variance (+1.8 deg drift under minimum CFM setpoint).",
    reported_by: "Quadillar Telemetry Facility Agent",
    notice_issued_to: "Apex Structural Engineers & Infra Ltd",
    contractor_entity: "Apex Structural Engineers & Infra Ltd",
    assigned_to: "Apex Structural Engineers & Infra Ltd",
    contractual_clause: "CPWD GCC Clause 17",
    rectification_sla_days: 14,
    sla_deadline: "2026-11-05T10:27:40.621Z",
    sla_breach_deadline: "2026-11-05T10:27:40.621Z",
    escrow_corpus_at_risk: 2250000.00,
    status: "OPEN_CONTRACTOR_ACTION_PENDING",
    ticket_status: "OPEN_CONTRACTOR_ACTION_PENDING",
    created_at: new Date().toISOString()
  };

  const cleanTicket = filterByCols(baseTicket, dlpTicketCols);
  console.log('  Clean Ticket Payload:', JSON.stringify(cleanTicket));

  const tktRes = await fetch(`${supabaseUrl}/rest/v1/dlp_warranty_tickets`, {
    method: 'POST',
    headers,
    body: JSON.stringify(cleanTicket)
  });

  if (!tktRes.ok) {
    console.error('\x1b[31m[ERROR Inserting Ticket]:\x1b[0m', await tktRes.text());
  } else {
    const insertedTkt = await tktRes.json();
    console.log('\x1b[32m✓ DLP Ticket Persisted:\x1b[0m', insertedTkt[0]?.ticket_ref || insertedTkt[0]?.ticket_code || insertedTkt[0]?.id);
  }

  // 3. Map and Insert 4 Quarterly Statutory Milestones into inspection_evidence
  console.log('\n[2/2] Seeding 4 Quarterly Milestones into inspection_evidence...');
  const milestones = [
    {
      code: "DLP-Q1-WINTER-DRIFT",
      date: "2027-01-15",
      desc: "Thermal movement audit at AAC masonry/RCC frame junctions, window perimeter seals, and HVAC winter cycle telemetry.",
      standard: "CPWD GCC Clause 17 / IS 1905"
    },
    {
      code: "DLP-Q2-SUMMER-ELECTROMECH",
      date: "2027-04-15",
      desc: "Thermographic imaging of Floor TPN DBs, transformer primary terminals, and chiller compressor performance under peak summer load.",
      standard: "IS 732:2019 / CEA Regulations"
    },
    {
      code: "DLP-Q3-MONSOON-WATERTIGHTNESS",
      date: "2027-07-15",
      desc: "Heavy precipitation audit: Brick Bat Coba waterproofing membrane, rainwater khurra discharge, and basement sump pump duty cycles.",
      standard: "IS 1346:1991 / CPWD Sub-head 12"
    },
    {
      code: "DLP-Q4-FINAL-CLOSEOUT-FMC",
      date: "2027-10-15",
      desc: "Joint terminal facility inspection with UPECL, issuance of Final Maintenance Certificate (FMC), and release of INR 22,50,000 security deposit.",
      standard: "CPWD GCC Clause 17 & 8B"
    }
  ];

  const evidenceRecords = milestones.map(m => {
    const raw = {
      project_id: projectId,
      inspection_code: m.code,
      milestone_ref: m.code,
      title: m.code,
      stage: "DEFECT_LIABILITY_PERIOD",
      inspection_date: m.date,
      scheduled_date: m.date,
      inspection_type: "STATUTORY_DLP_AUDIT",
      scope: m.desc,
      remarks: m.desc,
      standards: m.standard,
      status: "SCHEDULED",
      created_at: new Date().toISOString()
    };
    return filterByCols(raw, inspEvidenceCols);
  });

  const inspRes = await fetch(`${supabaseUrl}/rest/v1/inspection_evidence`, {
    method: 'POST',
    headers,
    body: JSON.stringify(evidenceRecords)
  });

  if (!inspRes.ok) {
    console.error('\x1b[31m[ERROR Inserting Milestones]:\x1b[0m', await inspRes.text());
  } else {
    const insertedInsp = await inspRes.json();
    console.log(`\x1b[32m✓ Successfully Seeded ${insertedInsp.length} Inspection Milestones in inspection_evidence\x1b[0m`);
  }

  console.log('\x1b[32m====================================================================\x1b[0m');
}

syncExistingSchema().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
