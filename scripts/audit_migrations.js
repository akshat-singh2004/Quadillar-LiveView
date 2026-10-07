const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

console.log(`Found ${files.length} migration files.\n`);

const report = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  
  // Extract tables
  const tableMatches = [...content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi)];
  const tables = tableMatches.map(m => m[1]);

  // Extract views
  const viewMatches = [...content.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:public\.)?([a-zA-Z0-9_]+)/gi)];
  const views = viewMatches.map(m => m[1]);

  // Extract foreign keys
  const fkMatches = [...content.matchAll(/REFERENCES\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(([a-zA-Z0-9_]+)\)/gi)];
  const fks = fkMatches.map(m => `${m[1]}(${m[2]})`);

  // Extract RLS
  const rlsMatches = [...content.matchAll(/ALTER\s+TABLE\s+(?:public\.)?([a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi)];
  const rlsTables = rlsMatches.map(m => m[1]);

  // Extract Policies
  const policyMatches = [...content.matchAll(/CREATE\s+POLICY\s+["']?([^"'\s]+)["']?\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)/gi)];
  const policies = policyMatches.map(m => `${m[1]} on ${m[2]}`);

  // Extract Indexes
  const indexMatches = [...content.matchAll(/CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)/gi)];
  const indexes = indexMatches.map(m => `${m[1]} on ${m[2]}`);

  report.push({
    file,
    tables,
    views,
    fks,
    rlsTables,
    policiesCount: policies.length,
    indexesCount: indexes.length,
    policies,
    indexes
  });
});

report.forEach(r => {
  console.log(`=== ${r.file} ===`);
  console.log(`  Tables (${r.tables.length}):`, r.tables.join(', ') || 'None');
  if (r.views.length) console.log(`  Views (${r.views.length}):`, r.views.join(', '));
  if (r.fks.length) console.log(`  FKs (${r.fks.length}):`, r.fks.join(', '));
  console.log(`  RLS Tables (${r.rlsTables.length}):`, r.rlsTables.join(', ') || 'None');
  console.log(`  Policies: ${r.policiesCount} | Indexes: ${r.indexesCount}`);
  console.log('');
});
