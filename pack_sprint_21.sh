#!/usr/bin/env bash

OUT="sprint_21.txt"

FILES=(
  "app/page.tsx"
  "components/LiveViewShell.tsx"
  "app/dashboard/DashboardShell.tsx"
  "components/layout/Sidebar.tsx"
  "components/layout/AppShell.tsx"
)

echo "==================================================" > "$OUT"
echo "SPRINT 21: ROOT SHELL, MASTER VIEWPORT & MODULE ROUTER" >> "$OUT"
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
