#!/usr/bin/env bash
OUTPUT="sprint_8.txt"
echo "=== SPRINT 8 CODE BUNDLE ===" > "$OUTPUT"

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

bundle_file "app/procurement/gate-pass/page.tsx"
bundle_file "app/quality/inspections/page.tsx"
bundle_file "app/punchlist/page.tsx"

echo "Bundled Sprint 8 files into $OUTPUT successfully."
