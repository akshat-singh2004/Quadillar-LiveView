#!/usr/bin/env bash

OUT="sprint_20.txt"

FILES=(
  "components/layout/SidebarAwareLayout.tsx"
  "components/dashboard/ExecutiveCommandHub.tsx"
  "components/liveview/LiveViewMasterMatrix.tsx"
  "app/closeout/command-center/page.tsx"
  "components/ui/GlobalSearchBar.tsx"
  "app/contracts/claims-disputes/page.tsx"
)

echo "==================================================" > "$OUT"
echo "SPRINT 20: MASTER COMMAND CENTER, GLOBAL SEARCH & CLAIMS ENGINE" >> "$OUT"
echo "==================================================" >> "$OUT"

for f in "${FILES[@]}"; do
  echo "==================================================" >> "$OUT"
  echo "FILE: $f" >> "$OUT"
  echo "==================================================" >> "$OUT"
  if [ -f "$f" ]; then
    cat "$f" >> "$OUT"
  else
    echo "[FILE NOT FOUND: $f]" >> "$OUT"
  fi
  echo "" >> "$OUT"
  echo "" >> "$OUT"
done

echo "Wrote $(wc -l < "$OUT") lines to $OUT"
