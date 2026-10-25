#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: 10-YEAR STATUTORY WORM COLD-STORAGE EXPORT HARNESS
# Standards: Section 63 BSA 2023, ISO 19650, AWS S3 Object Lock (Compliance)
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
export TARGET_PROJECT_ID="GOMTI-NAGAR-PH2-EXPANSION"
export ARCHIVE_DIR="./archive_${TARGET_PROJECT_ID}_$(date +%Y%m%d)"

if [ -z "${SUPABASE_URL}" ] \vert{}\vert{} [ -z "${SUPABASE_KEY}" ]; then
  echo -e "\033[0;31m[FATAL] Missing SUPABASE_URL or SUPABASE_KEY.\033[0m"
  exit 1
fi

mkdir -p "${ARCHIVE_DIR}"

node - << 'NODE_RUNNER_EOF'
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const projectId = process.env.TARGET_PROJECT_ID;
const archiveDir = process.env.ARCHIVE_DIR;

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json'
};

async function fetchTable(endpoint) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}: ${res.statusText}`);
  return await res.json();
}

async function exportDossier() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    QUADILLAR LIVEVIEW: WORM STATUTORY DOSSIER COMPILATION          \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  const targets = [
    { file: 'project_master.json', ep: `projects?project_id=eq.${projectId}&select=*` },
    { file: 'hermes_audit_ledger.json', ep: `hermes_audit_ledger?project_id=eq.${projectId}&order=sequence_index.asc&select=*` },
    { file: 'running_account_bills.json', ep: `running_account_bills?project_id=eq.${projectId}&order=bill_sequence_no.asc&select=*` },
    { file: 'electronic_measurement_book.json', ep: `electronic_measurement_book?project_id=eq.${projectId}&order=created_at.asc&select=*` },
    { file: 'concrete_pour_cards.json', ep: `concrete_pour_cards?project_id=eq.${projectId}&select=*` },
    { file: 'pile_integrity_records.json', ep: `pile_integrity_test_records?project_id=eq.${projectId}&select=*` },
    { file: 'pt_stressing_records.json', ep: `post_tensioning_stressing_records?project_id=eq.${projectId}&select=*` },
    { file: 'commissioning_test_records.json', ep: `commissioning_test_records?project_id=eq.${projectId}&select=*` },
    { file: 'defect_liability_records.json', ep: `defect_liability_audit_records?project_id=eq.${projectId}&select=*` }
  ];

  const manifest = {};

  for (const t of targets) {
    process.stdout.write(`Exporting ${t.file}... `);
    const data = await fetchTable(t.ep);
    const rawJson = JSON.stringify(data, null, 2);
    const outPath = path.join(archiveDir, t.file);
    fs.writeFileSync(outPath, rawJson);
    
    const hash = crypto.createHash('sha512').update(rawJson).digest('hex');
    manifest[t.file] = {
      record_count: data.length,
      sha512: hash
    };
    console.log(`\x1b[32m[DONE]\x1b[0m (${data.length} records)`);
  }

  // Copy Section 63 Evidence Certificate if present
  if (fs.existsSync('SECTION_63_BSA_EVIDENCE_CERTIFICATE.txt')) {
    const cert = fs.readFileSync('SECTION_63_BSA_EVIDENCE_CERTIFICATE.txt', 'utf8');
    fs.writeFileSync(path.join(archiveDir, 'SECTION_63_BSA_EVIDENCE_CERTIFICATE.txt'), cert);
    manifest['SECTION_63_BSA_EVIDENCE_CERTIFICATE.txt'] = {
      sha512: crypto.createHash('sha512').update(cert).digest('hex')
    };
  }

  // Write SHA-512 cryptographic manifest
  const manifestRaw = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(path.join(archiveDir, 'ARCHIVE_MANIFEST_SHA512.json'), manifestRaw);
  const masterSeal = crypto.createHash('sha256').update(manifestRaw).digest('hex');

  console.log('\n\x1b[32m✓ Dossier compiled successfully.\x1b[0m');
  console.log(`  Master Manifest Seal (SHA-256): \x1b[33m${masterSeal}\x1b[0m`);
  console.log(`  Target Output Directory        : ${archiveDir}`);
}

exportDossier().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exit(1);
});
NODE_RUNNER_EOF

tar -czf "${ARCHIVE_DIR}.tar.gz" -C "${ARCHIVE_DIR}" .
echo -e "\033[0;32m✓ Compressed WORM package created:\033[0m ${ARCHIVE_DIR}.tar.gz"
echo -e "Ready for cloud object lock upload (Retention Period: 10 Years)."
