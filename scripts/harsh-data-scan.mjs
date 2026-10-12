import fs from 'node:fs';
import path from 'node:path';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const parseKey = (k) => (envContent.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim().replace(/^['"]|['"]$/g, '');

const supabaseUrl = parseKey('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = parseKey('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceKey) {
  console.error(`${C.red}CRITICAL: Supabase URL or SERVICE_ROLE_KEY missing in .env.local${C.reset}`);
  process.exit(1);
}

console.log(`\n${C.bold}${C.red}======================================================================${C.reset}`);
console.log(`${C.bold}${C.red}  HARSH SUPABASE DATA INFESTATION & SEED AUDIT  ${C.reset}`);
console.log(`${C.bold}${C.red}======================================================================${C.reset}\n`);

async function runHarshScan() {
  const schemaRes = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
  });
  
  if (!schemaRes.ok) {
    console.error(`${C.red}Failed to fetch schema metadata: HTTP ${schemaRes.status}${C.reset}`);
    process.exit(1);
  }

  const spec = await schemaRes.json();
  const tables = Object.keys(spec.definitions || {}).sort();
  
  let totalInfestedTables = 0;
  let totalRecordsFound = 0;

  console.log(`Discovered ${C.bold}${tables.length}${C.reset} database tables in schema.\n`);

  for (const table of tables) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Range-Unit': 'items',
          'Range': '0-999',
          'Prefer': 'count=exact'
        }
      });

      const contentRange = res.headers.get('content-range');
      const countMatch = contentRange ? contentRange.match(/\/(\d+|\*)/) : null;
      const count = countMatch && countMatch[1] !== '*' ? parseInt(countMatch[1], 10) : 0;
      const rows = res.ok ? await res.json() : [];

      if (count > 0) {
        totalInfestedTables++;
        totalRecordsFound += count;
        
        // Scan for mock/seed markers
        const sampleStr = JSON.stringify(rows).toUpperCase();
        const markers = [];
        if (sampleStr.includes('GOMTI-NAGAR')) markers.push('GOMTI-NAGAR');
        if (sampleStr.includes('PRJ-LKO')) markers.push('PRJ-LKO');
        if (sampleStr.includes('SMOKE-TEST') || sampleStr.includes('SYSTEM_SMOKE_TEST')) markers.push('SMOKE-TEST');
        if (sampleStr.includes('DUMMY') || sampleStr.includes('TEST') || sampleStr.includes('MOCK')) markers.push('MOCK/TEST');

        console.log(
          `  ${C.red}✗ INFESTED${C.reset}  Table: ${C.bold}${table.padEnd(30)}${C.reset} ` +
          `| ${C.yellow}${String(count).padStart(5)} rows${C.reset} ` +
          `| Markers: ${markers.length ? C.red + markers.join(', ') + C.reset : C.gray + 'Production/Live Data' + C.reset}`
        );
      } else {
        console.log(`  ${C.green}✓ CLEAN   ${C.reset}  Table: ${table.padEnd(30)} |     0 rows`);
      }
    } catch (err) {
      console.log(`  ${C.yellow}⚠ ERROR   ${C.reset}  Table: ${table.padEnd(30)} | ${err.message}`);
    }
  }

  console.log(`\n${C.bold}${C.red}======================================================================${C.reset}`);
  console.log(`  ${C.bold}AUDIT REPORT:${C.reset}`);
  console.log(`  Tables Infested : ${C.bold}${C.red}${totalInfestedTables}${C.reset} / ${tables.length}`);
  console.log(`  Total Rows Found: ${C.bold}${C.red}${totalRecordsFound}${C.reset}`);
  console.log(`${C.bold}${C.red}======================================================================${C.reset}\n`);
}

runHarshScan();
