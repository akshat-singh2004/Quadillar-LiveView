import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('app/compliance/rera/page.tsx');
if (!fs.existsSync(file)) {
  console.log("File not found!");
  process.exit(1);
}

let code = fs.readFileSync(file, 'utf8');

// 1. Clear static clearances fallback array if present
code = code.replace(
  /const (?:defaultApprovals|mockClearances|fallbackApprovals)[^=]*=\s*\[[\s\S]*?\n\];/m,
  'const fallbackApprovals: any[] = [];'
);

// 2. Neutralize hardcoded progress metrics (92.5%, 15%, 45000000)
code = code.replace(/approvedBaseline\s*=\s*92\.5/g, 'approvedBaseline = 0');
code = code.replace(/actualProgress\s*=\s*15(\.0)?/g, 'actualProgress = 0');
code = code.replace(/certifiedSpend\s*=\s*45000000/g, 'certifiedSpend = 0');
code = code.replace(/4,50,00,000/g, '0');
code = code.replace(/92\.5%/g, '0.0%');
code = code.replace(/>15%</g, '>0.0%<');

// 3. Neutralize hardcoded Form 1 and Form 2 summaries
code = code.replace(
  /The project has achieved 15% actual measured site progress[^\n"]*/g,
  'Zero physical progress recorded. Form 1 awaiting initial QS measurement certification.'
);
code = code.replace(
  /Total certified construction expenditure stands at ₹4,50,00,000[^\n"]*/g,
  'Total certified construction expenditure stands at ₹0. Zero RERA escrow drawdowns logged.'
);
code = code.replace(
  /Actual physical progress is 15% against the approved RERA baseline of 92\.5%[^\n"]*/g,
  'Physical progress stands at 0.0% against the approved RERA baseline. Zero certified capital outlays recorded.'
);

fs.writeFileSync(file, code, 'utf8');
console.log("✓ Successfully applied zero-state patch to app/compliance/rera/page.tsx");
