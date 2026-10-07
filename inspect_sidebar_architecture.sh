#!/usr/bin/env bash
set -e

OUT="sprint_23_sidebar_audit.txt"

echo -e "\033[1;36m[+] Auditing layout, sidebar, headers, and context hierarchy into ${OUT}...\033[0m"

TARGET_FILES=(
  "app/layout.tsx"
  "app/page.tsx"
  "components/layout/AppShell.tsx"
  "components/layout/Sidebar.tsx"
  "components/layout/UnifiedHeader.tsx"
  "components/layout/SidebarAwareLayout.tsx"
  "context/SidebarContext.tsx"
  "context/RoleContext.tsx"
)

echo "==================================================" > "$OUT"
echo "SPRINT 23: SIDEBAR & LAYOUT SHELL AUDIT DOSSIER" >> "$OUT"
echo "==================================================" >> "$OUT"
echo "" >> "$OUT"

for file in "${TARGET_FILES[@]}"; do
  echo "==================================================" >> "$OUT"
  echo "FILE: $file" >> "$OUT"
  echo "==================================================" >> "$OUT"
  if [ -f "$file" ]; then
    cat "$file" >> "$OUT"
  else
    echo "[FILE NOT FOUND / MISSING ON DISK]" >> "$OUT"
  fi
  echo "" >> "$OUT"
  echo "" >> "$OUT"
done

echo -e "\033[1;32m[✓] Finished bundling layout and sidebar code into ${OUT}\033[0m"
