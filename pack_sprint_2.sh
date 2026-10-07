#!/usr/bin/env bash
OUTPUT="sprint_2.txt"
echo "=== SPRINT 2 CODE BUNDLE ===" > "$OUTPUT"

bundle_file() {
    local filepath="$1"
    echo "" >> "$OUTPUT"
    echo "================================================================================" >> "$OUTPUT"
    echo "FILE_START: $filepath" >> "$OUTPUT"
    echo "================================================================================" >> "$OUTPUT"
    if [ -f "$filepath" ]; then
        cat "$filepath" >> "$OUTPUT"
    else
        echo "// FILE NOT FOUND: $filepath" >> "$OUTPUT"
    fi
    echo "" >> "$OUTPUT"
    echo "================================================================================" >> "$OUTPUT"
    echo "FILE_END: $filepath" >> "$OUTPUT"
    echo "================================================================================" >> "$OUTPUT"
}

bundle_file "app/contracts/claims/page.tsx"
bundle_file "app/contracts/taking-over/page.tsx"
bundle_file "app/contracts/analyzer/page.tsx"

echo "Bundled Sprint 2 files into $OUTPUT successfully."
