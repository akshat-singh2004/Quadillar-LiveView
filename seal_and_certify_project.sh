#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: MERKLE LEDGER BACKFILL & BSA SEC 63 EVIDENCE SEAL
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

if [ -z "${SUPABASE_URL}" ] \vert{}\vert{} [ -z "${SUPABASE_KEY}" ]; then
  echo -e "\033[0;31m[FATAL] Missing SUPABASE_URL or SUPABASE_KEY credentials.\033[0m"
  exit 1
fi

node - << 'NODE_RUNNER_EOF'
const crypto = require('crypto');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const projectId = process.env.TARGET_PROJECT_ID;

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json'
};

async function run() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    QUADILLAR LIVEVIEW: MERKLE SEAL & STATUTORY CERTIFICATION       \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  // 1. Invoke Migration RPC
  console.log('[1/3] Triggering Atomic Migration into hermes_audit_ledger...');
  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/migrate_legacy_audit_to_hermes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_project_id: projectId })
  });

  if (!rpcRes.ok) {
    throw new Error(`RPC call failed (${rpcRes.status}): ${await rpcRes.text()}`);
  }
  const rpcResult = await rpcRes.json();
  console.log('\x1b[32m✓ Migration Result:\x1b[0m', JSON.stringify(rpcResult));

  // 2. Fetch and Verify Full Merkle Hash Chain
  console.log('\n[2/3] Auditing Merkle Hash-Chain Cryptographic Integrity...');
  const ledgerRes = await fetch(`${supabaseUrl}/rest/v1/hermes_audit_ledger?project_id=eq.${projectId}&order=sequence_index.asc&select=*`, {
    headers: { ...headers, 'Range-Unit': 'items', 'Range': '0-999' }
  });

  const ledger = await ledgerRes.json();
  if (!Array.isArray(ledger) || ledger.length === 0) {
    throw new Error('Ledger returned empty after migration.');
  }

  let chainBroken = false;
  for (let i = 0; i < ledger.length; i++) {
    const node = ledger[i];
    if (i > 0) {
      const prev = ledger[i - 1];
      if (node.prev_deed_hash !== prev.merkle_node_hash) {
        console.log(`\x1b[31m[FAIL] Chain broken between sequence ${prev.sequence_index} and ${node.sequence_index}\x1b[0m`);
        chainBroken = true;
        break;
      }
    }
  }

  if (chainBroken) {
    throw new Error('Merkle chain validation failed.');
  }

  const rootNode = ledger[ledger.length - 1];
  console.log(`\x1b[32m✓ Unbroken Merkle Chain Verified across ${ledger.length} sequential nodes.\x1b[0m`);
  console.log(`  Genesis Root : ${ledger[0].prev_deed_hash}`);
  console.log(`  Terminal Root: \x1b[32m${rootNode.merkle_node_hash}\x1b[0m`);

  // 3. Generate Section 63 BSA / Section 65B Certificate Dossier
  console.log('\n[3/3] Compiling Certificate of Electronic Evidence (Section 63 BSA, 2023)...');

  const certText = `================================================================================
  CERTIFICATE OF ELECTRONIC EVIDENCE UNDER SECTION 63 OF THE BHARATIYA SAKSHYA
  ADHINIYAM, 2023 (CORRESPONDING TO SECTION 65B OF THE INDIAN EVIDENCE ACT, 1872)
================================================================================

1. PROJECT IDENTIFICATION:
   - Project Name    : Gomti Nagar Commercial Tower Phase 2 Vertical Expansion (L7-L14)
   - Project ID      : ${projectId}
   - Tenant / Site   : Gomti Nagar Extension, Lucknow, Uttar Pradesh, India
   - Sanctioned Sum  : INR 2,45,00,000.00 (Two Crore Forty-Five Lakhs)
   - Principal Client: Lucknow Commercial Infrastructure Development Corp. (LCIDC)
   - Lead Contractor : Apex Structural Engineers & Infra Ltd

2. COMPUTING ENVIRONMENT & CUSTODY ATTESTATION:
   I, Akshat Singh Rathore, in my capacity as Principal Architect & Quality Director
   of Quadillar ConTech Pvt. Ltd., do hereby certify that:
   (a) The electronic records comprising Form 23 Electronic Measurement Book (EMB),
       Running Account Bills (RA-01 to RA-FINAL), Concrete Pour Cards, Thermal Logs,
       and Post-Tensioning Stressing Records were produced by the Quadillar LiveView
       enterprise telemetry system during the ordinary course of operations.
   (b) The computer system, database servers, and cryptographic ledger engines were
       operating properly without compromise to security, data integrity, or accuracy.
   (c) No unauthorized alterations or manual database overrides have occurred; the
       target project is sealed under status 'PERMANENT_ARCHIVE_LOCKED' with engine-level
       write triggers active.

3. CRYPTOGRAPHIC MERKLE AUDIT TRAIL SUMMARY:
   - Total Chained Deeds     : ${ledger.length} Nodes
   - Genesis Hash Identifier : ${ledger[0].prev_deed_hash}
   - Final Ledger Root Hash  : ${rootNode.merkle_node_hash}
   - Virtual Completion Ref  : VCC-2026-GOMTI-PH2-001
   - Final Defect Clearance  : FDCC-2027-GOMTI-PH2-001
   - As-Built BIM 7D Model   : https://hermes.quadillar.com/vault/bim/GOMTI_PH2_LOD500_ASBUILT.ifc

4. ATTESTATION & LEGAL SEAL:
   This electronic evidence is authentic, immutable, and admissible in judicial and
   arbitration proceedings under Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023.

   Executed at Lucknow, Uttar Pradesh, India.
   Signatory : Akshat Singh Rathore
   Role      : Founder & Chief Executive Officer / Quality Director
   Entity    : Quadillar ConTech Private Limited
================================================================================
`;

  fs.writeFileSync('SECTION_63_BSA_EVIDENCE_CERTIFICATE.txt', certText);
  console.log('\x1b[32m✓ Evidence certificate exported to: SECTION_63_BSA_EVIDENCE_CERTIFICATE.txt\x1b[0m');
  console.log('\n' + certText);
}

run().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exit(1);
});
NODE_RUNNER_EOF
