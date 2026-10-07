#!/usr/bin/env bash
set -e

node - << 'JS'
const fs = require('fs');
const path = './app/estimation/ai-boq/page.tsx';

let code = fs.readFileSync(path, 'utf8');

// 1. Ensure FALLBACK_COST_INDEX constant exists
if (!code.includes('FALLBACK_COST_INDEX')) {
  const fallbackDef = `
const FALLBACK_COST_INDEX = {
  id: "ci-lko-up",
  locationName: "Lucknow (UP) - Gomti Nagar",
  costIndexPct: 108.5,
  state: "Uttar Pradesh",
  baseSchedule: "CPWD DSR 2023",
};
`;
  // Insert before the component function
  code = code.replace(/export default function/, `${fallbackDef}\nexport default function`);
}

// 2. Ensure useState initializes with FALLBACK_COST_INDEX
code = code.replace(
  /const\s*\[selectedCostIndex,\s*setSelectedCostIndex\]\s*=\s*useState<[^>]*>\([^)]*\);?/,
  'const [selectedCostIndex, setSelectedCostIndex] = useState<any>(FALLBACK_COST_INDEX);'
);
code = code.replace(
  /const\s*\[selectedCostIndex,\s*setSelectedCostIndex\]\s*=\s*useState\([^)]*\);?/,
  'const [selectedCostIndex, setSelectedCostIndex] = useState<any>(FALLBACK_COST_INDEX);'
);

// 3. Fix line 184 (useMemo calculation)
code = code.replace(
  /const\s*factor\s*=\s*selectedCostIndex\.costIndexPct\s*\/\s*100\.0;?/,
  'const factor = (selectedCostIndex?.costIndexPct ?? 108.5) / 100.0;'
);

// 4. Guard all template and inline accesses to selectedCostIndex.costIndexPct
code = code.replaceAll(
  'selectedCostIndex.costIndexPct',
  '(selectedCostIndex?.costIndexPct ?? 108.5)'
);

// 5. Guard selectedCostIndex.locationName
code = code.replaceAll(
  'selectedCostIndex.locationName',
  '(selectedCostIndex?.locationName ?? "Lucknow (UP)")'
);

// 6. Guard selectedCostIndex.id
code = code.replaceAll(
  'selectedCostIndex.id',
  '(selectedCostIndex?.id ?? "ci-lko-up")'
);

fs.writeFileSync(path, code, 'utf8');
console.log('[✓] Successfully patched app/estimation/ai-boq/page.tsx with safe cost index fallbacks.');
JS
