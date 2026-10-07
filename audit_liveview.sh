#!/usr/bin/env bash

REPORT_FILE="diagnostic_errors_report.txt"
echo "=== QUADILLAR LIVEVIEW COMPREHENSIVE ROUTE AUDIT ===" > "$REPORT_FILE"
echo "Generated on: $(date)" >> "$REPORT_FILE"
echo "=====================================================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo -e "\033[1;36m[+] Running static analysis on current app/ tree...\033[0m"

echo "--- [1] STUB OR NEAR-EMPTY ROUTE PAGES (< 30 lines) ---" >> "$REPORT_FILE"
find app -name "page.tsx" -type f | while read -r file; do
    lines=$(wc -l < "$file")
    if [ "$lines" -lt 30 ]; then
        echo "  [STUB] $file ($lines lines)"
        echo "$file ($lines lines)" >> "$REPORT_FILE"
    fi
done

echo "" >> "$REPORT_FILE"
echo "--- [2] HARDCODED / HANGING LOADER PATTERNS ---" >> "$REPORT_FILE"
grep -rnEi "(INITIALIZING|INITIALISING|STREAMING|CONNECTING TO|CONNECTING REMOTE)" app/ \
    --include="page.tsx" 2>/dev/null | while read -r match; do
    file=$(echo "$match" | cut -d: -f1)
    if ! grep -qEi "(catch|error\.tsx|ErrorBoundary|FALLBACK_)" "$file"; then
        echo "  [HANGING_LOADER] $match"
        echo "$match" >> "$REPORT_FILE"
    fi
done

echo "" >> "$REPORT_FILE"
echo "--- [3] UNHANDLED SUPABASE DATA FETCHING ---" >> "$REPORT_FILE"
find app -name "page.tsx" -type f | while read -r file; do
    if grep -q "supabase\.from" "$file"; then
        has_finally=$(grep -c "finally" "$file" || true)
        has_catch=$(grep -c "catch" "$file" || true)
        if [ "$has_finally" -eq 0 ] && [ "$has_catch" -eq 0 ]; then
            echo "  [UNHANDLED_FETCH] $file"
            echo "$file (Missing try/catch/finally)" >> "$REPORT_FILE"
        fi
    fi
done

echo ""
echo -e "\033[1;32m[✓] Updated scan complete. Reviewing fresh report:\033[0m"
cat "$REPORT_FILE"
