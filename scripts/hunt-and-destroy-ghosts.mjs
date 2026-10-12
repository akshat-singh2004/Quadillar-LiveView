import fs from 'node:fs';
import path from 'node:path';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

console.log(`\n${C.bold}${C.red}======================================================================${C.reset}`);
console.log(`${C.bold}${C.red}  QUADILLAR GHOST DATA DETECTOR & ZERO-STATE NEUTRALIZER  ${C.reset}`);
console.log(`${C.bold}${C.red}======================================================================${C.reset}\n`);

// 1. AUTO-PATCH: Municipal & Statutory Approvals Mock Fallback
const statFile = path.resolve('app/contracts/statutory-approvals/page.tsx');
if (fs.existsSync(statFile)) {
  let stat = fs.readFileSync(statFile, 'utf8');
  if (stat.includes('const defaults: StatutoryPermitRecord[] = [')) {
    stat = stat.replace(
      /const defaults:\s*StatutoryPermitRecord\[\]\s*=\s*\[[\s\S]*?\n\s*\];/m,
      'const defaults: StatutoryPermitRecord[] = [];'
    );
    stat = stat.replace(
      /if \(!selectedPermit\) setSelectedPermit\(defaults\[0\]\);/g,
      'if (!selectedPermit && defaults.length > 0) setSelectedPermit(defaults[0]);'
    );
    fs.writeFileSync(statFile, stat, 'utf8');
    console.log(`  ${C.green}✓ PATCHED${C.reset}  Statutory & Municipal Approvals: defaults wiped to []`);
  }
}

// 2. AUTO-PATCH: Geotechnical Displacement Chart Mock Data
const geoChart = path.resolve('components/engineering/SettlementDisplacementChart.tsx');
if (fs.existsSync(geoChart)) {
  let geo = fs.readFileSync(geoChart, 'utf8');
  geo = geo.replace(/const defaultReadings:[^=]*=\s*\[[\s\S]*?\n\];/m, 'const defaultReadings: any[] = [];');
  geo = geo.replace(/const defaultPileCurve:[^=]*=\s*\[[\s\S]*?\n\];/m, 'const defaultPileCurve: any[] = [];');
  fs.writeFileSync(geoChart, geo, 'utf8');
  console.log(`  ${C.green}✓ PATCHED${C.reset}  SettlementDisplacementChart: default curves wiped to []`);
}

// 3. AUTO-PATCH: DPR Weather Hardcoded Fallback
const dprFile = path.resolve('app/site/dpr/page.tsx');
if (fs.existsSync(dprFile)) {
  let dpr = fs.readFileSync(dprFile, 'utf8');
  dpr = dpr.replace(/"Clear \/ 32°C \| 8\.5h"/g, '"No Weather Telemetry | 0.0h"');
  fs.writeFileSync(dprFile, dpr, 'utf8');
  console.log(`  ${C.green}✓ PATCHED${C.reset}  DPR Weather: string fallback neutralized`);
}

console.log(`\n${C.bold}${C.cyan}--- SCANNING FOR REMAINING GHOST PHRASES ---${C.reset}\n`);

const queries = [
  { term: /\bgang\b/i, label: 'Gang (Workforce / Output)' },
  { term: /\bdefense\b/i, label: 'Defense (Statutory / Claims)' },
  { term: /budget\s*at\s*completion|\bBAC\b/i, label: 'Budget at Completion / BAC' },
  { term: /45\s*cr/i, label: '45 Cr Hardcoded Value' }
];

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(entry.name)) scanDir(full);
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      const code = fs.readFileSync(full, 'utf8');
      const lines = code.split('\n');
      lines.forEach((line, idx) => {
        for (const q of queries) {
          if (q.term.test(line)) {
            console.log(`  ${C.yellow}[${q.label}]${C.reset} ${path.relative(process.cwd(), full)}:${idx + 1}`);
            console.log(`    ${C.magenta}${line.trim().slice(0, 110)}${C.reset}`);
          }
        }
      });
    }
  }
}

scanDir(path.resolve('app'));
scanDir(path.resolve('components'));

console.log(`\n${C.bold}${C.cyan}--- CHECKING PTW PAGE / COMPONENT SOURCE ---${C.reset}\n`);

// Inspect PTW Page definition
['app/safety/ptw/page.tsx', 'app/site/permits/page.tsx', 'app/site/safety-ptw/page.tsx'].forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`Found PTW Page: ${file}`);
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.split('\n').filter(l => /supabase|from\(|useState|permit/i.test(l)).slice(0, 8);
    matches.forEach(m => console.log(`   ${m.trim()}`));
  }
});

console.log(`\n${C.bold}${C.red}======================================================================${C.reset}\n`);
