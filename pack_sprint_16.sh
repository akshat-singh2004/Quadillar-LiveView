#!/usr/bin/env bash
OUT="sprint_16.txt"
FILES=(
  "app/quality/cube-tests/page.tsx"
  "components/site/LaborRosterTable.tsx"
  "components/site/DPRFormModal.tsx"
)
echo "==================================================" > "$OUT"
echo "SPRINT 16: QA/QC CONSOLE & WORKFORCE MUSTER" >> "$OUT"
echo "==================================================" >> "$OUT"
for f in "${FILES[@]}"; do
  echo "==================================================" >> "$OUT"
  echo "FILE: $f" >> "$OUT"
  echo "==================================================" >> "$OUT"
  if [ -f "$f" ]; then cat "$f" >> "$OUT"; else echo "[FILE NOT FOUND]" >> "$OUT"; fi
  echo "" >> "$OUT"
done
echo "Wrote $(wc -l < "$OUT") lines to $OUT"
