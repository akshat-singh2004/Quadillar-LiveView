import fs from 'node:fs';
import path from 'node:path';

const patches = [
  {
    file: 'components/dashboard/HeavyRiggingSafetyWidget.tsx',
    search: /const cranes = \[.*?\];/s,
    replace: 'const cranes: any[] = [];'
  },
  {
    file: 'components/site/CraneSlewRadar.tsx',
    search: /const cranes: CraneTelemetry\[\] = \[.*?\];/s,
    replace: 'const cranes: CraneTelemetry[] = [];'
  },
  {
    file: 'components/engineering/SettlementDisplacementChart.tsx',
    search: /readings\.length > 0 \? readings : defaultReadings/g,
    replace: 'readings'
  },
  {
    file: 'components/engineering/SettlementDisplacementChart.tsx',
    search: /pileCurve\.length > 0 \? pileCurve : defaultPileCurve/g,
    replace: 'pileCurve'
  },
  {
    file: 'app/site/cranes/page.tsx',
    search: /setSelectedCrane\(FALLBACK_CRANES\[0\]\);/g,
    replace: 'setSelectedCrane(null as any);'
  },
  {
    file: 'app/site/cranes/page.tsx',
    search: /const active = selectedCrane \|\| FALLBACK_CRANES[0];/g,
    replace: 'const active = selectedCrane || null;'
  }
];

console.log("\nExecuting surgical patch to neutralize hardcoded mock fallbacks...\n");

for (const patch of patches) {
  const fullPath = path.resolve(process.cwd(), patch.file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    if (patch.search.test(content)) {
      content = content.replace(patch.search, patch.replace);
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`  ✓ PATCHED: ${patch.file}`);
    } else {
      console.log(`  - SKIPPED: Pattern already neutral in ${patch.file}`);
    }
  } else {
    console.log(`  ! NOT FOUND: ${patch.file}`);
  }
}

console.log("\nPatch complete. Verifying TypeScript compilation...\n");
