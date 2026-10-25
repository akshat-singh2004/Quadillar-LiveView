#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: APPLY DLP MIGRATION & SEED DEFECT TELEMETRY
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

# Check if supabase CLI or direct psql is configured, otherwise attempt RPC migration
if command -v supabase &> /dev/null; then
  echo "[1/3] Applying migration via local Supabase CLI..."
  supabase db push || true
fi

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

async function seedData() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    SEEDING STATUTORY SCHEDULE & TELEMETRY TICKETS (SUPABASE)       \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  // 1. Seed inspection schedule
  console.log('[1/2] Seeding 4 Statutory DLP Quarterly Milestones...');
  const inspectionMilestones = [
    {
      project_id: projectId,
      milestone_code: 'DLP-Q1-WINTER-DRIFT',
      target_inspection_date: '2027-01-15',
      scope_description: 'Thermal movement audit at AAC masonry/RCC frame junctions, window perimeter seal integrity, and HVAC winter cycle telemetry.',
      statutory_basis: 'CPWD GCC Clause 17 / IS 1905',
      status: 'SCHEDULED'
    },
    {
      project_id: projectId,
      milestone_code: 'DLP-Q2-SUMMER-ELECTROMECH',
      target_inspection_date: '2027-04-15',
      scope_description: 'Thermographic thermal imaging scan of all Floor TPN DBs, transformer primary terminals, and chiller compressor performance under peak load.',
      statutory_basis: 'IS 732:2019 / CEA Regulations',
      status: 'SCHEDULED'
    },
    {
      project_id: projectId,
      milestone_code: 'DLP-Q3-MONSOON-WATERTIGHTNESS',
      target_inspection_date: '2027-07-15',
      scope_description: 'Heavy precipitation audit: Brick Bat Coba waterproofing membrane, rainwater khurra discharge rates, expansion joint seals, and basement sump pumps.',
      statutory_basis: 'IS 1346:1991 / CPWD Sub-head 12',
      status: 'SCHEDULED'
    },
    {
      project_id: projectId,
      milestone_code: 'DLP-Q4-FINAL-CLOSEOUT-FMC',
      target_inspection_date: '2027-10-15',
      scope_description: 'Joint terminal facility inspection with UPECL, issuance of Final Maintenance Certificate (FMC), and release of INR 22,50,000 security deposit.',
      statutory_basis: 'CPWD GCC Clause 17 & 8B',
      status: 'SCHEDULED'
    }
  ];

  const schedRes = await fetch(`${supabaseUrl}/rest/v1/dlp_inspection_schedule`, {
    method: 'POST',
    headers,
    body: JSON.stringify(inspectionMilestones)
  });

  if (schedRes.ok) {
    const data = await schedRes.json();
    console.log(`\x1b[32m✓ Seeded ${data.length} statutory milestones into dlp_inspection_schedule\x1b[0m`);
  } else {
    console.log(`\x1b[33m[SCHEDULE INSERT STATUS]:\x1b[0m ${await schedRes.text()}`);
  }

  // 2. Seed ticket DLP-TKT-2026-001
  console.log('\n[2/2] Registering Latent Observation Ticket DLP-TKT-2026-001...');
  const ticket = {
    project_id: projectId,
    ticket_ref: "DLP-TKT-2026-001",
    floor_level: "Level 1",
    spatial_zone: "North-West Open Workstation Bay (Grid C3-D4)",
    bim_element_guid: "2f8a91b4-4e2a-49c8-9d7e-8c3120b08fa1",
    trade_category: "MEP_HVAC_AIR_DISTRIBUTION",
    defect_classification: "LATENT_OBSERVATION",
    description: "VAV Terminal Unit 1-NW-04 damper actuator calibration variance (+1.8 deg drift under minimum CFM setpoint).",
    reported_by: "Quadillar Telemetry Facility Agent",
    notice_issued_to: "Apex Structural Engineers & Infra Ltd",
    contractual_clause: "CPWD GCC Clause 17",
    rectification_sla_days: 14,
    notice_timestamp: "2026-10-22T10:27:40.621Z",
    sla_breach_deadline: "2026-11-05T10:27:40.621Z",
    escrow_corpus_at_risk_inr: 2250000.00,
    ticket_status: "OPEN_CONTRACTOR_ACTION_PENDING"
  };

  const tktRes = await fetch(`${supabaseUrl}/rest/v1/dlp_defect_tickets`, {
    method: 'POST',
    headers,
    body: JSON.stringify(ticket)
  });

  if (tktRes.ok) {
    const tData = await tktRes.json();
    console.log('\x1b[32m✓ Ticket DLP-TKT-2026-001 persisted in dlp_defect_tickets table:\x1b[0m');
    console.log(`  Ticket Reference : ${tData[0]?.ticket_ref || ticket.ticket_ref}`);
    console.log(`  BIM GUID Linkage : ${ticket.bim_element_guid}`);
    console.log(`  SLA Deadline     : ${ticket.sla_breach_deadline} (14 days)`);
  } else {
    console.log(`\x1b[33m[TICKET INSERT STATUS]:\x1b[0m ${await tktRes.text()}`);
  }

  console.log('\x1b[32m====================================================================\x1b[0m');
}

seedData().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
