import fs from 'node:fs';

const searches = [
  { label: 'Main Page: Gang Output / 100%', file: 'app/page.tsx', patterns: [/gang/i, /100%/i, /output/i] },
  { label: 'Main Page: Statutory Defense', file: 'app/page.tsx', patterns: [/defense/i, /statutory.*100/i] },
  { label: 'Main Page: Budget at Completion / 45 Cr', file: 'app/page.tsx', patterns: [/budget/i, /completion/i, /bac/i] },
  { label: 'Main Page: PTW Entry Count', file: 'app/page.tsx', patterns: [/ptw/i, /permit/i] },
  { label: 'BBS: Internal Mock Fallbacks', file: 'components/engineering/BBSClientManager.tsx', patterns: [/default/i, /fallback/i, /mock/i, /initialSchedules/i, /useState/i] },
  { label: 'Municipal Approvals Mock Records', file: 'app/contracts/statutory-approvals/page.tsx', patterns: [/default/i, /mock/i, /initial/i, /useState/i, /LDA/i, /LMC/i] },
  { label: 'Section 65B Vault Mock Records', file: 'app/closeout/audit-vault/page.tsx', patterns: [/default/i, /mock/i, /initial/i, /useState/i, /dossiers/i] }
];

console.log("\n=======================================================");
console.log("  EXACT GHOST DATA LOCATOR");
console.log("=======================================================\n");

for (const { label, file, patterns } of searches) {
  if (!fs.existsSync(file)) {
    console.log(`[FILE MISSING] ${file}`);
    continue;
  }
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  console.log(`\n>>> ${label} (${file})`);
  lines.forEach((line, idx) => {
    for (const p of patterns) {
      if (p.test(line)) {
        console.log(`  Line ${String(idx + 1).padStart(4)}: ${line.trim().slice(0, 120)}`);
        break;
      }
    }
  });
}
console.log("\n=======================================================\n");
