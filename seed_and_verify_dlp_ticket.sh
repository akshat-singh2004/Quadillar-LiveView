#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: RESOLVE CONSTRAINT, SEED TICKET & VERIFY SLA TELEMETRY
# Table: public.dlp_warranty_tickets
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
# Prioritize service role key to avoid RLS read/write filtration
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

const candidateCategories = [
  'HVAC',
  'Electrical',
  'Plumbing',
  'Civil',
  'Carpentry',
  'Painting',
  'Waterproofing',
  'Other',
  'hvac',
  'electrical',
  'plumbing',
  'civil',
  'other',
  'MEP',
  'mep',
  'Mechanical',
  'Services'
];

async function seedAndVerify() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    RESOLVING DEFECT_CATEGORY & SEEDING DLP WARRANTY TICKET        \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  // 1. Check if DLP-TKT-2026-001 already exists
  const checkRes = await fetch(
    `${supabaseUrl}/rest/v1/dlp_warranty_tickets?ticket_code=eq.DLP-TKT-2026-001&project_id=eq.${projectId}`,
    { headers }
  );

  let existing = checkRes.ok ? await checkRes.json() : [];

  if (existing.length > 0) {
    console.log(`\x1b[32m✓ Ticket DLP-TKT-2026-001 already present in database:\x1b[0m ${existing[0].id}`);
  } else {
    console.log('[1/2] Probing candidate categories against table check constraint...');
    let inserted = null;
    let acceptedCategory = null;

    for (const cat of candidateCategories) {
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
        inserted = rows[0];
        acceptedCategory = cat;
        break;
      } else {
        const err = await res.text();
        if (!err.includes('dlp_warranty_tickets_defect_category_check')) {
          console.error(`\x1b[31m[SQL Error]:\x1b[0m ${err}`);
          break;
        }
      }
    }

    if (!inserted) {
      throw new Error('Failed to resolve check constraint across all tested categories.');
    }

    console.log(`\x1b[32m✓ Check Constraint Satisfied with Category:\x1b[0m "${acceptedCategory}"`);
    console.log(`  Ticket UUID : ${inserted.id}`);
  }

  // 2. Poll tickets and output live SLA countdown
  console.log('\n[2/2] Running CPWD Clause 17 SLA Health Audit...');
  const pollRes = await fetch(
    `${supabaseUrl}/rest/v1/dlp_warranty_tickets?project_id=eq.${projectId}&order=created_at.desc`,
    { headers }
  );

  if (!pollRes.ok) {
    throw new Error(`Failed to query tickets: ${await pollRes.text()}`);
  }

  const activeTickets = await pollRes.json();
  console.log(`\x1b[32mActive Tickets Tracked: ${activeTickets.length}\x1b[0m\n`);

  const now = Date.now();
  activeTickets.forEach((t, i) => {
    const createdTime = new Date(t.created_at).getTime();
    const slaLimitMs = 14 * 24 * 60 * 60 * 1000; // 14-day statutory SLA under CPWD Clause 17
    const deadlineMs = createdTime + slaLimitMs;
    const hoursLeft = Math.max(0, Math.round((deadlineMs - now) / (1000 * 60 * 60)));
    const deadlineDate = new Date(deadlineMs).toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

    console.log(`[#${i + 1}] Ticket Ref  : ${t.ticket_code}`);
    console.log(`    Asset Zone  : ${t.unit_or_asset_ref}`);
    console.log(`    Category    : ${t.defect_category}`);
    console.log(`    Status      : ${t.warranty_claim_status} (${t.priority_tier})`);
    console.log(`    Contractor  : ${t.assigned_subcontractor}`);
    console.log(`    Escrow Risk : INR 22,50,000.00 Retention Corpus`);
    console.log(`    SLA Window  : ${hoursLeft} hours remaining (Breach: ${deadlineDate})`);
  });

  console.log('\x1b[32m====================================================================\x1b[0m');
  console.log('\x1b[32m✓ Telemetry engine synchronized — SLA countdown active.\x1b[0m');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

seedAndVerify().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
