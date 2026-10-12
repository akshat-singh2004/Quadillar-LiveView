import fs from 'node:fs';

function findInFile(file, regexes) {
  if (!fs.existsSync(file)) return console.log(`[Missing] ${file}`);
  console.log(`\n========================================\nFILE: ${file}\n========================================`);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    if (regexes.some(r => r.test(line))) {
      const start = Math.max(0, idx - 2);
      const end = Math.min(lines.length, idx + 3);
      console.log(`--- Line ${idx + 1} ---`);
      for (let i = start; i < end; i++) {
        console.log(`${String(i + 1).padStart(4)}: ${lines[i]}`);
      }
    }
  });
}

// 1. BBS Client Manager
findInFile('components/engineering/BBSClientManager.tsx', [/mock/i, /fallback/i, /default/i, /initialSchedules/]);

// 2. DPR Gang Output & Weather
findInFile('app/site/dpr/page.tsx', [/gang/i, /output/i, /Clear \/ 32°C/i]);

// 3. PTW loadPermits
findInFile('components/site/PTWCardGrid.tsx', [/supabase/i, /select\(/i, /mock/i, /fallback/i]);

// 4. Municipal Approvals Initial State
findInFile('app/contracts/statutory-approvals/page.tsx', [/useState<StatutoryApproval\[\]>\(/, /const \[approvals/i, /defaultApprovals/i]);

// 5. Section 65B Vault
findInFile('app/closeout/audit-vault/page.tsx', [/useState.*dossier/i, /mock/i, /fallbackDossiers/i, /dossiers,/]);
