import fs from 'node:fs';
import path from 'node:path';

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

console.log(`\n${C.cyan}=== EXECUTING FINAL ZERO-STATE NEUTRALIZATION ===${C.reset}\n`);

// 1. NEUTRALIZE: Statutory & Municipal Approvals "else { const defaults = ... }"
const statPath = path.resolve('app/contracts/statutory-approvals/page.tsx');
if (fs.existsSync(statPath)) {
  let statCode = fs.readFileSync(statPath, 'utf8');

  // Replace the else branch that injects defaults with empty state
  statCode = statCode.replace(
    /\}\s*else\s*\{\s*const defaults:\s*StatutoryPermitRecord\[\][\s\S]*?setPermits\(defaults\);[\s\S]*?if \(!selectedPermit\) setSelectedPermit\(defaults\[0\]\);\s*\}/m,
    `} else {\n        setPermits([]);\n        setSelectedPermit(null);\n      }`
  );

  fs.writeFileSync(statPath, statCode, 'utf8');
  console.log(`  ${C.green}✓ PATCHED${C.reset}  Statutory Approvals: completely bypassed "else { defaults }" mock branch.`);
}

// 2. NEUTRALIZE: Labor Roster Avg Gang Output Yield 100% Default
const rosterPath = path.resolve('components/site/LaborRosterTable.tsx');
if (fs.existsSync(rosterPath)) {
  let rosterCode = fs.readFileSync(rosterPath, 'utf8');

  // Replace any ternary defaulting avgYield to 100 when target is 0 or roster is empty
  rosterCode = rosterCode.replace(
    /avgYield:\s*[^,\n]+\?\s*[^,\n]+:\s*100/g,
    'avgYield: 0'
  );
  rosterCode = rosterCode.replace(
    /avgYield:\s*100/g,
    'avgYield: 0'
  );

  fs.writeFileSync(rosterPath, rosterCode, 'utf8');
  console.log(`  ${C.green}✓ PATCHED${C.reset}  Labor Roster: neutralized avgYield fallback default.`);
}

// 3. INSPECT: PTW Card rendering in app/safety/ptw/page.tsx
const ptwPath = path.resolve('app/safety/ptw/page.tsx');
if (fs.existsSync(ptwPath)) {
  const lines = fs.readFileSync(ptwPath, 'utf8').split('\n');
  console.log(`\n${C.yellow}--- Inspecting app/safety/ptw/page.tsx (Permit Loop) ---${C.reset}`);
  lines.forEach((line, idx) => {
    if (/activePermits|FALLBACK|mock|permit\./i.test(line)) {
      console.log(`  Line ${String(idx + 1).padStart(4)}: ${line.trim().slice(0, 110)}`);
    }
  });
}

// 4. INSPECT: BBS Entries in app/engineering/bbs/page.tsx
const bbsPath = path.resolve('app/engineering/bbs/page.tsx');
if (fs.existsSync(bbsPath)) {
  const lines = fs.readFileSync(bbsPath, 'utf8').split('\n');
  console.log(`\n${C.yellow}--- Inspecting app/engineering/bbs/page.tsx (Schedules Pass) ---${C.reset}`);
  lines.forEach((line, idx) => {
    if (/schedules|BBSClientManager|initialSchedules/i.test(line)) {
      console.log(`  Line ${String(idx + 1).padStart(4)}: ${line.trim().slice(0, 110)}`);
    }
  });
}

console.log(`\n${C.cyan}=================================================${C.reset}\n`);
