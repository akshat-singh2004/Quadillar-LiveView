import fs from 'node:fs';
import path from 'node:path';

// 1. Fix TypeScript error in app/site/safety-ptw/page.tsx
const ptwPath = path.resolve('app/site/safety-ptw/page.tsx');
if (fs.existsSync(ptwPath)) {
  let ptwCode = fs.readFileSync(ptwPath, 'utf8');
  ptwCode = ptwCode.replace(
    /const fallbackClearances:\s*PTWClearanceRecord\[\]\s*=\s*\[\];/g,
    'const FALLBACK_CLEARANCES: PTWClearanceRecord[] = [];\nconst fallbackClearances = FALLBACK_CLEARANCES;'
  );
  fs.writeFileSync(ptwPath, ptwCode, 'utf8');
  console.log("✓ Fixed FALLBACK_CLEARANCES definition in app/site/safety-ptw/page.tsx");
}

// 2. Inspect exact lines for LaborRosterTable Avg Gang Output
const rosterPath = path.resolve('components/site/LaborRosterTable.tsx');
if (fs.existsSync(rosterPath)) {
  const lines = fs.readFileSync(rosterPath, 'utf8').split('\n');
  console.log("\n--- components/site/LaborRosterTable.tsx (Lines 255-275) ---");
  for (let i = 254; i < Math.min(lines.length, 275); i++) {
    console.log(`${String(i + 1).padStart(4)}: ${lines[i]}`);
  }
}

// 3. Inspect exact lines for Statutory Approvals defaults
const statPath = path.resolve('app/contracts/statutory-approvals/page.tsx');
if (fs.existsSync(statPath)) {
  const lines = fs.readFileSync(statPath, 'utf8').split('\n');
  console.log("\n--- app/contracts/statutory-approvals/page.tsx (Lines 205-225) ---");
  for (let i = 204; i < Math.min(lines.length, 225); i++) {
    console.log(`${String(i + 1).padStart(4)}: ${lines[i]}`);
  }
}

// 4. Inspect exact lines for app/safety/ptw/page.tsx
const safetyPtwPath = path.resolve('app/safety/ptw/page.tsx');
if (fs.existsSync(safetyPtwPath)) {
  const lines = fs.readFileSync(safetyPtwPath, 'utf8').split('\n');
  console.log("\n--- app/safety/ptw/page.tsx (Lines 15-45) ---");
  for (let i = 14; i < Math.min(lines.length, 45); i++) {
    console.log(`${String(i + 1).padStart(4)}: ${lines[i]}`);
  }
}
