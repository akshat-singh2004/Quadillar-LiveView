import fs from 'node:fs';

function inspect(label, file, patterns) {
  console.log(`\n=== [${label}] : ${file} ===`);
  if (!fs.existsSync(file)) {
    console.log("  File not found!");
    return;
  }
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    for (const pat of patterns) {
      if (pat.test(line)) {
        console.log(`  Line ${String(idx + 1).padStart(4)}: ${line.trim().slice(0, 110)}`);
        break;
      }
    }
  });
}

// 1. BBS Page
inspect("BBS Entries", "app/engineering/bbs/page.tsx", [
  /schedules/i, /fallback/i, /mock/i, /<tbody>/i, /<tr>/i, /Fe 500/i
]);

// 2. DPR Gang Output & Weather
inspect("DPR Gang & Weather", "app/site/dpr/page.tsx", [
  /gang/i, /output/i, /temp/i, /weather/i, /100%/i, /fallback/i
]);

// 3. PTW Permits
inspect("PTW Permits", "components/site/PTWCardGrid.tsx", [
  /permits/i, /fallback/i, /default/i, /status/i
]);

// 4. Section 65B Audit Vault
inspect("Section 65B Vault", "app/closeout/audit-vault/page.tsx", [
  /logs/i, /fallback/i, /default/i, /records/i, /table/i
]);
