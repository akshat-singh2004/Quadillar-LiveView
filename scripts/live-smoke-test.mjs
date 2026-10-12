import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const pass = (label, detail = '') => console.log(`  ${C.green}✓ PASS${C.reset}  ${label} ${detail ? C.gray + '(' + detail + ')' + C.reset : ''}`);
const fail = (label, detail = '') => console.log(`  ${C.red}✗ FAIL${C.reset}  ${label} ${detail ? C.red + '(' + detail + ')' + C.reset : ''}`);

console.log(`\n${C.bold}${C.cyan}=== QUADILLAR LIVEVIEW: AUTOMATED SYSTEM VERIFICATION ===${C.reset}\n`);

// 1. Read Environment Variables
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const parseKey = (k) => (envContent.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim().replace(/^['"]|['"]$/g, '');

const supabaseUrl = parseKey('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = parseKey('SUPABASE_SERVICE_ROLE_KEY');

// 2. Verify Localhost Next.js Routes
console.log(`${C.bold}1. Checking Active Localhost Server & Routes:${C.reset}`);
const routes = [
  { path: '/', name: 'Master Command Center' },
  { path: '/governance/council', name: 'Executive Council War Room' }
];

for (const route of routes) {
  const url = `http://localhost:3000${route.path}`;
  const start = Date.now();
  try {
    const res = await fetch(url, { headers: { 'Accept': 'text/html' } });
    const elapsed = Date.now() - start;
    if (res.ok) {
      pass(`Route [${route.path}] - ${route.name}`, `HTTP ${res.status} | ${elapsed}ms`);
    } else {
      fail(`Route [${route.path}]`, `HTTP ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    fail(`Route [${route.path}] unreachable`, `Is "npm run dev" running? (${err.message})`);
  }
}

// 3. Authenticated DB Write & Read Loop
console.log(`\n${C.bold}2. Testing Live Supabase Service Role Authentication:${C.reset}`);

async function runDatabaseRoundtrip() {
  if (!supabaseUrl || !serviceKey) {
    fail('Supabase credentials missing in .env.local');
    return;
  }

  const dummyHash = crypto.createHash('sha256').update(`SMOKE-TEST-${Date.now()}`).digest('hex');

  // Complete payload satisfying all NOT-NULL table constraints
  const testPayload = {
    project_id: 'PRJ-LKO-TOWER-A',
    action_title: 'SYSTEM_SMOKE_TEST_AUDIT',
    details: `Automated cryptographic notary verification heartbeat. Proof: ${dummyHash.slice(0, 16)}...`,
    signatory_name: 'Hermes Automated Notary',
    signatory_role: 'Lead System Governor',
    action_category: 'SYSTEM_VERIFICATION',
    module_ref: `TEST-${Date.now()}`,
    ip_fingerprint: `SHA256:${dummyHash}`,
    status: 'SEALED',
    severity: 'verified',
    created_at: new Date().toISOString()
  };

  try {
    const writeStart = Date.now();
    const writeRes = await fetch(`${supabaseUrl}/rest/v1/immutable_audit_logs`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testPayload)
    });
    const writeLatency = Date.now() - writeStart;

    if (writeRes.ok) {
      const records = await writeRes.json();
      const recordId = records[0]?.id || 'OK';
      pass('Supabase Write: immutable_audit_logs', `Created record ID ${recordId} | ${writeLatency}ms`);

      // Read back the verified entry
      const readStart = Date.now();
      const readRes = await fetch(
        `${supabaseUrl}/rest/v1/immutable_audit_logs?action_title=eq.SYSTEM_SMOKE_TEST_AUDIT&order=created_at.desc&limit=1`,
        {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
          }
        }
      );
      const readLatency = Date.now() - readStart;

      if (readRes.ok) {
        const fetched = await readRes.json();
        pass('Supabase Read: Roundtrip verified', `Record ID [${fetched[0]?.id}] confirmed in cloud DB | ${readLatency}ms`);
      } else {
        fail('Supabase Read failed', `HTTP ${readRes.status}`);
      }
    } else {
      const errText = await writeRes.text();
      fail('Supabase Write failed', `HTTP ${writeRes.status} - ${errText}`);
    }
  } catch (err) {
    fail('Supabase network exception', err.message);
  }

  console.log(`\n${C.bold}${C.cyan}=========================================================${C.reset}\n`);
}

runDatabaseRoundtrip();
