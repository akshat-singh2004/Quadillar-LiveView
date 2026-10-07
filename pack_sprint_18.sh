#!/usr/bin/env bash
OUT="sprint_18.txt"
FILES=(
  "components/cde/DrawingMarkupViewer.tsx"
  "components/cde/DrawingValidator.tsx"
  "components/cde/FacetedCDETable.tsx"
  "components/cde/UploadModal.tsx"
)
echo "==================================================" > "$OUT"
echo "SPRINT 18: CDE SPATIAL REDLINE & VALIDATION" >> "$OUT"
echo "==================================================" >> "$OUT"
for f in "${FILES[@]}"; do
  echo "==================================================" >> "$OUT"
  echo "FILE: $f" >> "$OUT"
  echo "==================================================" >> "$OUT"
  if [ -f "$f" ]; then cat "$f" >> "$OUT"; else echo "[FILE NOT FOUND]" >> "$OUT"; fi
  echo "" >> "$OUT"
done
echo "Wrote $(wc -l < "$OUT") lines to $OUT"
