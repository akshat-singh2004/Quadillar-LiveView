#!/usr/bin/env bash
OUT="sprint_19.txt"
FILES=(
  "components/dashboard/DetailDrawer.tsx"
  "components/contracts/DocumentClauseViewer.tsx"
  "components/portal/ClientExecutiveDashboard.tsx"
  "app/portal/architect/page.tsx"
)
echo "==================================================" > "$OUT"
echo "SPRINT 19: EXECUTIVE COMMAND & CONTRACTS" >> "$OUT"
echo "==================================================" >> "$OUT"
for f in "${FILES[@]}"; do
  echo "==================================================" >> "$OUT"
  echo "FILE: $f" >> "$OUT"
  echo "==================================================" >> "$OUT"
  if [ -f "$f" ]; then cat "$f" >> "$OUT"; else echo "[FILE NOT FOUND]" >> "$OUT"; fi
  echo "" >> "$OUT"
done
echo "Wrote $(wc -l < "$OUT") lines to $OUT"
