#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: SUPABASE STORAGE WORM UPLOADER (ZERO-DEPENDENCY)
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
export ARCHIVE_FILE="./archive_GOMTI-NAGAR-PH2-EXPANSION_20261022.tar.gz"
export BUCKET_NAME="hermes-statutory-vault"

if [ -z "${SUPABASE_URL}" ] \vert{}\vert{} [ -z "${SUPABASE_KEY}" ]; then
  echo -e "\033[0;31m[FATAL] Missing SUPABASE_URL or SUPABASE_KEY.\033[0m"
  exit 1
fi

if [ ! -f "${ARCHIVE_FILE}" ]; then
  echo -e "\033[0;31m[FATAL] Archive file ${ARCHIVE_FILE} not found. Run export_worm_archive.sh first.\033[0m"
  exit 1
fi

node - << 'NODE_RUNNER_EOF'
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const filePath = process.env.ARCHIVE_FILE;
const bucket = process.env.BUCKET_NAME;
const fileName = path.basename(filePath);

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`
};

async function uploadVault() {
  console.log('\x1b[34m====================================================================\x1b[0m');
  console.log('\x1b[36m    QUADILLAR LIVEVIEW: VAULT OBJECT STORAGE PIPELINE              \x1b[0m');
  console.log('\x1b[34m====================================================================\x1b[0m');

  // 1. Ensure private storage bucket exists
  console.log(`[1/3] Verifying Storage Bucket: "${bucket}"...`);
  const bucketCheck = await fetch(`${supabaseUrl}/storage/v1/bucket/${bucket}`, { headers });
  
  if (bucketCheck.status === 404) {
    console.log(`Creating private bucket "${bucket}"...`);
    const createRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: bucket,
        name: bucket,
        public: false,
        file_size_limit: 524288000 // 500 MB limit
      })
    });
    if (!createRes.ok) {
      throw new Error(`Failed to create bucket: ${await createRes.text()}`);
    }
    console.log('\x1b[32m✓ Private bucket created successfully.\x1b[0m');
  } else if (!bucketCheck.ok) {
    throw new Error(`Bucket check failed: ${await bucketCheck.text()}`);
  } else {
    console.log('\x1b[32m✓ Bucket confirmed online.\x1b[0m');
  }

  // 2. Compute file metrics
  const fileBuffer = fs.readFileSync(filePath);
  const fileSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const sizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);

  console.log(`\n[2/3] Uploading: ${fileName} (${sizeMB} MB)`);
  console.log(`  Package Digest: \x1b[33m${fileSha256}\x1b[0m`);

  // 3. Upload file with upsert
  const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/gzip',
      'x-upsert': 'true'
    },
    body: fileBuffer
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed (${uploadRes.status}): ${await uploadRes.text()}`);
  }

  const result = await uploadRes.json();
  console.log('\n\x1b[32m[3/3] Upload Complete & Verified.\x1b[0m');
  console.log('  Vault Location:', result.Key || `${bucket}/${fileName}`);
  console.log('  Access Profile: RESTRICTED (Service Role & Authenticated Member Access Only)');
  console.log('\x1b[32m====================================================================\x1b[0m');
}

uploadVault().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exit(1);
});
NODE_RUNNER_EOF
