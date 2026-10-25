#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: NATIVE S3 SIGV4 WORM UPLOADER (NO CLI REQUIRED)
# ==============================================================================

set -euo pipefail

if [ -f .env.local ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^#.* ]] && continue
    [[ -z "$line" ]] && continue
    export "$line"
  done < .env.local
fi

export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"
export AWS_REGION="${AWS_REGION:-ap-south-1}" # Default: AWS Mumbai
export AWS_S3_BUCKET="${AWS_S3_BUCKET:-quadillar-statutory-vault}"
export ARCHIVE_FILE="./archive_GOMTI-NAGAR-PH2-EXPANSION_20261022.tar.gz"

if [ -z "${AWS_ACCESS_KEY_ID}" ] \vert{}\vert{} [ -z "${AWS_SECRET_ACCESS_KEY}" ]; then
  echo -e "\033[0;33m[NOTE] AWS credentials not detected in .env.local. If using AWS, set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.\033[0m"
  exit 1
fi

node - << 'NODE_RUNNER_EOF'
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const accessKey = process.env.AWS_ACCESS_KEY_ID;
const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;
const filePath = process.env.ARCHIVE_FILE;
const fileName = path.basename(filePath);

function hmac(key, string) {
  return crypto.createHmac('sha256', key).update(string).digest();
}

function hash(string) {
  return crypto.createHash('sha256').update(string).digest('hex');
}

async function uploadS3Worm() {
  const fileBuffer = fs.readFileSync(filePath);
  const payloadHash = hash(fileBuffer);

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const canonicalUri = `/archives/${fileName}`;
  
  // 10-year statutory retention ceiling: 2036-10-22T00:00:00Z
  const retainUntil = '2036-10-22T00:00:00Z';
  const objectLockMode = 'COMPLIANCE';

  const canonicalHeaders = 
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-object-lock-mode:${objectLockMode}\n` +
    `x-amz-object-lock-retain-until-date:${retainUntil}\n`;

  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date;x-amz-object-lock-mode;x-amz-object-lock-retain-until-date';
  const canonicalRequest = `PUT\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${hash(canonicalRequest)}`;

  const kDate = hmac('AWS4' + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  console.log(`Streaming ${fileName} to s3://${bucket}/archives/ with Object Lock COMPLIANCE...`);

  const url = `https://${host}${canonicalUri}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'x-amz-object-lock-mode': objectLockMode,
      'x-amz-object-lock-retain-until-date': retainUntil,
      'Authorization': authorizationHeader,
      'Content-Type': 'application/gzip'
    },
    body: fileBuffer
  });

  if (!res.ok) {
    throw new Error(`S3 upload error ${res.status}: ${await res.text()}`);
  }

  console.log('\x1b[32m✓ File locked in AWS S3 WORM Compliance Mode until 2036-10-22.\x1b[0m');
}

uploadS3Worm().catch(err => {
  console.error('\x1b[31m[ERROR]:\x1b[0m', err.message);
  process.exit(1);
});
NODE_RUNNER_EOF
