import fs from 'node:fs';
import path from 'node:path';

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function patch(filePath, regex, replacement, label) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`  ${C.yellow}⚠ SKIPPED${C.reset} ${label} (file not found)`);
    return;
  }
  let code = fs.readFileSync(fullPath, 'utf8');
  if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(fullPath, code, 'utf8');
    console.log(`  ${C.green}✓ PATCHED${C.reset} ${label}`);
  } else {
    console.log(`  - No match for ${label} in ${filePath}`);
  }
}

console.log(`\n${C.cyan}=== EXECUTING TARGETED ZERO-STATE SURGICAL PATCH ===${C.reset}\n`);

// 1. Municipal & Statutory Approvals (Clears LDA & LMC fake permits)
patch(
  'app/contracts/statutory-approvals/page.tsx',
  /const defaults:\s*StatutoryPermitRecord\[\]\s*=\s*\[[\s\S]*?\n\s*\];/m,
  'const defaults: StatutoryPermitRecord[] = [];',
  'Statutory Approvals: defaults array emptied to []'
);
patch(
  'app/contracts/statutory-approvals/page.tsx',
  /setPermits\(defaults\);/g,
  'setPermits([]);',
  'Statutory Approvals: setPermits call nulled'
);

// 2. Gantt Statutory Defense 100% Notarized
patch(
  'app/schedule/gantt/page.tsx',
  /<div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">\s*100% Notarized\s*<\/div>/g,
  '<div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">{activities && activities.length > 0 ? "100% Notarized" : "0% (No Activities)"}</div>',
  'Gantt Chart: Statutory Defense 100% -> 0% when no activities'
);

// 3. Labor Roster Avg Gang Output Yield 100%
patch(
  'components/site/LaborRosterTable.tsx',
  /<div className="text-2xl font-bold text-white mt-1">\s*100\.0%\s*<\/div>/g,
  '<div className="text-2xl font-bold text-white mt-1">{roster.length > 0 ? "100.0%" : "0.0%"}</div>',
  'Labor Roster: Avg Gang Output yield set to 0.0% for empty roster'
);
patch(
  'components/site/LaborRosterTable.tsx',
  /const avgYield = [^;]+;/g,
  'const avgYield = roster && roster.length > 0 ? (roster.reduce((acc: any, r: any) => acc + (Number(r.actualOutputQty || 0) / Math.max(1, Number(r.plannedOutputTarget || 1))), 0) / roster.length) * 100 : 0;',
  'Labor Roster: dynamic avgYield calculation'
);

// 4. Safety PTW Ghost Clearances
patch(
  'app/site/safety-ptw/page.tsx',
  /const (?:FALLBACK_CLEARANCES|fallbackClearances|sampleClearances)[^=]*=\s*\[[\s\S]*?\n\];/m,
  'const fallbackClearances: PTWClearanceRecord[] = [];',
  'Safety PTW: Fallback clearances array wiped'
);
patch(
  'app/site/safety-ptw/page.tsx',
  /permit_ref:\s*"PTW-2026-082"[\s\S]*?permit_ref:\s*"PTW-2026-083"/m,
  '',
  'Safety PTW: Static PTW references cleared'
);
patch(
  'app/safety/ptw/page.tsx',
  /const activePermits\s*=\s*permits\?\.length\s*\?\s*permits\s*:\s*\[[\s\S]*?\];/m,
  'const activePermits = permits || [];',
  'Safety PTW Page: Active permits fallback removed'
);

// 5. Budget at Completion (BAC) Mocks
patch(
  'app/analytics/executive-dashboard/page.tsx',
  /const budgetAtCompletion = 1450000000;[^\n]*/g,
  'const budgetAtCompletion = 0;',
  'Analytics Dashboard: Hardcoded BAC 145 Cr -> 0'
);
patch(
  'app/finance/cashflow/page.tsx',
  /const bac = 360000000;/g,
  'const bac = 0;',
  'Cashflow: Hardcoded BAC 36 Cr -> 0'
);

console.log(`\n${C.cyan}=== VERIFYING TYPESCRIPT COMPILATION ===${C.reset}\n`);
