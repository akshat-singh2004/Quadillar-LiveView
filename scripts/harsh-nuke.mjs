import fs from 'node:fs';
import path from 'node:path';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const parseKey = (k) => (envContent.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim().replace(/^['"]|['"]$/g, '');

const supabaseUrl = parseKey('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = parseKey('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceKey) {
  console.error(`${C.red}Supabase URL or SERVICE_ROLE_KEY missing in .env.local${C.reset}`);
  process.exit(1);
}

console.log(`\n${C.bold}${C.red}======================================================================${C.reset}`);
console.log(`${C.bold}${C.red}  HARSH SUPABASE PURGE: PURGING ALL INFESTED TABLES  ${C.reset}`);
console.log(`${C.bold}${C.red}======================================================================${C.reset}\n`);

async function nukeDatabase() {
  const schemaRes = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
  });
  
  const spec = await schemaRes.json();
  const tables = Object.keys(spec.definitions || {}).sort();

  let purgedCount = 0;

  for (const table of tables) {
    try {
      // Harsh DELETE via PostgREST with service role key
      const delRes = await fetch(`${supabaseUrl}/rest/v1/${table}?id=neq.00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'count=exact'
        }
      });

      if (delRes.ok) {
        console.log(`  ${C.green}✓ WIPED  ${C.reset}  Table: ${table}`);
        purgedCount++;
      } else {
        // Fallback for non-UUID integer ID primary keys
        const delFallback = await fetch(`${supabaseUrl}/rest/v1/${table}?created_at=not.is.null`, {
          method: 'DELETE',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
          }
        });
        if (delFallback.ok) {
          console.log(`  ${C.green}✓ WIPED  ${C.reset}  Table: ${table} (via fallback query)`);
          purgedCount++;
        } else {
          console.log(`  ${C.yellow}⚠ SKIPPED${C.reset}  Table: ${table} (Use Option 1 SQL for cascade constraints)`);
        }
      }
    } catch (err) {
      console.log(`  ${C.red}✗ ERROR  ${C.reset}  Table: ${table} - ${err.message}`);
    }
  }

  console.log(`\n${C.bold}${C.green}Purge sweep complete across ${purgedCount} tables.${C.reset}\n`);
}

nukeDatabase();
