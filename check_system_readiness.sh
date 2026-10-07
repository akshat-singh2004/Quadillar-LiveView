#!/usr/bin/env bash

REPORT_FILE="SYSTEM_AUDIT_REPORT.txt"
CLIP_CMD=$(command -v clip.exe || command -v pbcopy || command -v wl-copy || (command -v xclip >/dev/null && echo "xclip -selection clipboard"))

echo "Running Quadillar LiveView diagnostic audit..."

{
  echo "================================================================="
  echo "QUADILLAR LIVEVIEW SYSTEM READINESS REPORT"
  echo "Generated: $(date -u)"
  echo "================================================================="
  echo ""

  # 1. TYPESCRIPT COMPILATION HEALTH
  echo "--- 1. TYPESCRIPT COMPILATION HEALTH ---"
  if command -v npx >/dev/null 2>&1; then
    echo "Running 'npx tsc --noEmit'..."
    TSC_OUTPUT=$(npx tsc --noEmit 2>&1)
    TSC_EXIT=$?
    if [ $TSC_EXIT -eq 0 ]; then
      echo "STATUS: [PASS] Zero TypeScript compilation errors."
    else
      ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS")
      echo "STATUS: [FAIL] $ERROR_COUNT TypeScript error(s) detected."
      echo "First 25 compilation errors:"
      echo "$TSC_OUTPUT" | grep "error TS" | head -n 25
    fi
  else
    echo "npx not found. Skipping tsc check."
  fi
  echo ""

  # 2. AGENT INTEGRATION WIRING
  echo "--- 2. AGENT INTEGRATION WIRING ---"
  echo "Checking files consuming the 4 Autonomous Agents:"
  for AGENT in chronos midas aegis hermes; do
    echo "• Agent $AGENT imports:"
    grep -rn "lib/agents/$AGENT" app/ components/ 2>/dev/null | awk -F: '{print "   " $1 ":" $2}' || echo "   (No imports found)"
  done
  echo ""

  # 3. LINGERING MOCKS & FALLBACK DATASETS
  echo "--- 3. DETECTED MOCKS & FALLBACK OBJECTS ---"
  echo "Files containing 'fallback' or 'mock' data definitions:"
  grep -rnE "(fallback[A-Z][a-zA-Z0-9]*|mock[A-Z][a-zA-Z0-9]*)\s*=" app/ components/ 2>/dev/null \
    | grep -v "node_modules" \
    | head -n 30 \
    | awk -F: '{print "   " $1 ":" $2 " -> " $3}'
  echo ""

  # 4. UN-MIGRATED INLINE STYLING DETECTOR
  echo "--- 4. UN-MIGRATED BRITTLE INLINE STYLES ---"
  echo "Files using raw 'style={{' instead of Tailwind:"
  grep -rn "style={{" components/ app/ 2>/dev/null \
    | cut -d: -f1 | sort | uniq -c | sort -nr | head -n 15 \
    | awk '{print "   " $2 " (" $1 " inline style tags)"}'
  echo ""

  # 5. CORE CANDIDATE COMPONENT SCAN
  echo "--- 5. STATUS OF PENDING CORE MODULES ---"
  TARGET_FILES=(
    "components/safety/StrippingPermitCard.tsx"
    "components/site/DPRComposer.tsx"
    "components/site/LaborRosterTable.tsx"
    "components/quality/ConcreteMaturityChart.tsx"
    "app/finance/ra-bills/page.tsx"
    "app/quality/cube-tests/page.tsx"
    "components/finance/IPCDeductionDrawer.tsx"
    "components/cde/DrawingMarkupViewer.tsx"
  )

  for FILE in "${TARGET_FILES[@]}"; do
    if [ -f "$FILE" ]; then
      LINES=$(wc -l < "$FILE")
      HAS_MOCK=$(grep -cE "(fallback|default|mock)" "$FILE")
      HAS_STYLE=$(grep -c "style={{" "$FILE")
      HAS_ACTION=$(grep -cE "(from \"@/app/actions|use server)" "$FILE")
      echo "• $FILE [$LINES lines]"
      echo "    - Server Action Wired: $([ $HAS_ACTION -gt 0 ] && echo 'YES' || echo 'NO')"
      echo "    - Fallback/Mock Count: $HAS_MOCK"
      echo "    - Inline Styles: $HAS_STYLE"
    else
      echo "• $FILE: [MISSING]"
    fi
  done
  echo ""

  echo "================================================================="
  echo "END OF REPORT"
  echo "================================================================="
} > "$REPORT_FILE"

cat "$REPORT_FILE"

if [ -n "$CLIP_CMD" ]; then
  cat "$REPORT_FILE" | eval "$CLIP_CMD"
  echo ""
  echo "✓ Audit report generated in $REPORT_FILE and copied to clipboard!"
else
  echo ""
  echo "✓ Audit report generated in $REPORT_FILE."
fi
