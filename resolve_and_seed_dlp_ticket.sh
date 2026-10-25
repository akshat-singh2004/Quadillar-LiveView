#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: INTROSPECT DEFECT_CATEGORY & SEED DLP WARRANTY TICKET
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
echo "    SCANNING REPOSITORY FOR DEFECT_CATEGORY DEFINITIONS           "
echo "===================================================================="
grep -rnEI --exclude-dir={node_modules,.next,.git,dist,build} "defect_category.*CHECK|CONSTRAINT.*defect_category" . || true
echo "--------------------------------------------------------------------"

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

// 1. Recursive file search for check constraint definition
function findConstraintValues(dir) {
  let values = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = findConstraintValues(fullPath);
        if (sub.length > 0) return sub;
      } else if (/\.(sql|ts|tsx|js|json)$/i.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('defect_category') && (content.includes('CHECK') || content.includes('enum') || content.includes('IN'))) {
          // Multiline regex to match CHECK (defect_category IN (...))
          const match = content.match(/defect_category[\s\S]*?IN\s*\(([^)]+)\)/i);
          if (match) {
            const raw = match[1];
            const parsed = raw.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
            if (parsed.length > 0) {
              console.log(`\x1b[32m✓ Parsed ${parsed.length} categories from:\x1b[0m ${fullPath}`);
              return parsed;
            }
          }
        }
      }
    }
  } catch (err) {}
  return values;
}

async function run() {
  console.log('\n[1/3] Resolving defect_category allowed values...');
  let categories = findConstraintValues('.');

  // Comprehensive fallback dictionary if not found in files
  if (categories.length === 0) {
    console.log('\x1b[33m[INFO]\x1b[0m File match not found; compiling expanded category dictionary...');
    categories = [
      // Compound descriptive labels
      'HVAC / Air Conditioning',
      'HVAC & Air Conditioning',
      'HVAC & Ventilation',
      'HVAC / Mechanical',
      'Mechanical / HVAC',
      'MEP - HVAC',
      'Electrical & Power',
      'Electrical / Power',
      'MEP - Electrical',
      'Plumbing & Drainage',
      'Plumbing / Drainage',
      'MEP - Plumbing',
      'Civil / Structural',
      'Civil & Structural',
      'Finishes & Interiors',
      'Finishes / Architectural',
      'Waterproofing & Sealing',
      'Fire & Life Safety',
      // Standard Title Case
      'HVAC',
      'Mechanical',
      'Electrical',
      'Plumbing',
      'Civil',
      'Structural',
      'Finishes',
      'Waterproofing',
      'Carpentry',
      'Painting',
      'Masonry',
      'Flooring',
      'Glazing',
      'General',
      'Other',
      // Uppercase SCREAMING_SNAKE_CASE
      'HVAC_AIR_DISTRIBUTION',
      'MEP_HVAC',
      'MEP_ELECTRICAL',
      'MEP_PLUMBING',
      'CIVIL_STRUCTURAL',
      'FINISHES',
      'WATERPROOFING',
      'FIRE_SAFETY'
    ];
  } else {
    console.log(`  Target List: [${categories.join(', ')}]`);
  }

  // 2. Probe categories against table
  console.log('\n[2/3] Probing categories against Supabase schema...');
  let createdTicket = null;
  let acceptedCategory = null;

  for (const cat of categories) {
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
      break;
    } else {
      const err = await res.text();
      if (!err.includes('dlp_warranty_tickets_defect_category_check')) {
        // If ticket already exists due to duplicate primary key/ticket_code
        if (err.includes('dlp_warranty_tickets_ticket_code_key') || err.includes('duplicate key')) {
          console.log('\x1b[33m[INFO]\x1b[0m Ticket DLP-TKT-2026-001 already exists in table.');
          const fetchExisting = await fetch(
            `${supabaseUrl}/rest/v1/dlp_warranty_tickets?ticket_code=eq.DLP-TKT-2026-001&project_id=eq.${projectId}`,
            { headers }
          );
          if (fetchExisting.ok) {
            const rows = await fetchExisting.json();
            createdTicket = rows[0];
            acceptedCategory = createdTicket.defect_category;
            break;
          }
        } else {
          console.error(`\x1b[31m[Non-Constraint Error]:\x1b[0m ${err}`);
          break;
        }
      }
    }
  }

  if (!createdTicket) {
    throw new Error('Unable to insert ticket: none of the tested defect_category values matched the check constraint.');
  }

  console.log(`\x1b[32m✓ Ticket Successfully Linked with Category:\x1b[0m "${acceptedCategory}"`);
  console.log(`  Ticket UUID : ${createdTicket.id}`);
  console.log(`  Asset Zone  : ${createdTicket.unit_or_asset_ref}`);

  // 3. Output SLA countdown
  console.log('\n[3/3] Live CPWD GCC Clause 17 Telemetry Status:');
  const createdTime = new Date(createdTicket.created_at).getTime();
  const deadlineMs = createdTime + (14 * 24 * 60 * 60 * 1000);
  const hoursRemaining = Math.max(0, Math.round((deadlineMs - Date.now()) / (1000 * 60 * 60)));
  const breachDate = new Date(deadlineMs).toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  console.log(`  Ticket Ref       : ${createdTicket.ticket_code}`);
  console.log(`  Status           : ${createdTicket.warranty_claim_status} (${createdTicket.priority_tier})`);
  console.log(`  Assigned Vendor  : ${createdTicket.assigned_subcontractor}`);
  console.log(`  Corpus at Risk   : INR 22,50,000.00 (Escrow Security Deposit)`);
  console.log(`  Time to Breach   : ${hoursRemaining} hours remaining (Deadline: ${breachDate})`);
  console.log('\x1b[32m====================================================================\x1b[0m');
}

run().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exitCode = 1;
});
NODE_RUNNER_EOF
