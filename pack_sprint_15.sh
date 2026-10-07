#!/usr/bin/env bash
OUT="sprint_15.txt"
FILES=(
  "components/quality/LogCubeTestModal.tsx"
  "components/quality/ConcreteMaturityChart.tsx"
  "components/safety/StrippingPermitCard.tsx"
  "components/site/DPRComposer.tsx"
)
echo "==================================================" > "$OUT"
echo "SPRINT 15: STRUCTURAL CONCRETE, MATURITY & DPR" >> "$OUT"
echo "==================================================" >> "$OUT"
for f in "${FILES[@]}"; do
  echo "==================================================" >> "$OUT"
  echo "FILE: $f" >> "$OUT"
  echo "==================================================" >> "$OUT"
  if [ -f "$f" ]; then cat "$f" >> "$OUT"; else echo "[FILE NOT FOUND]" >> "$OUT"; fi
  echo "" >> "$OUT"
done
echo "Wrote $(wc -l < "$OUT") lines to $OUT"
