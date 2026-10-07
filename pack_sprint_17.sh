#!/usr/bin/env bash
OUT="sprint_17.txt"
FILES=(
  "app/finance/ra-bills/page.tsx"
  "components/finance/IPCDeductionDrawer.tsx"
  "app/actions/billing-pipeline.ts"
)
echo "==================================================" > "$OUT"
echo "SPRINT 17: RA BILLS & COMMERCIAL DEDUCTIONS" >> "$OUT"
echo "==================================================" >> "$OUT"
for f in "${FILES[@]}"; do
  echo "==================================================" >> "$OUT"
  echo "FILE: $f" >> "$OUT"
  echo "==================================================" >> "$OUT"
  if [ -f "$f" ]; then cat "$f" >> "$OUT"; else echo "[FILE NOT FOUND]" >> "$OUT"; fi
  echo "" >> "$OUT"
done
echo "Wrote $(wc -l < "$OUT") lines to $OUT"
