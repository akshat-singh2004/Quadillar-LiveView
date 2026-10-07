#!/usr/bin/env bash
OUTPUT="sprint_6.txt"
echo "=== SPRINT 6 CODE BUNDLE ===" > "$OUTPUT"

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

bundle_file "app/handover/export/page.tsx"
bundle_file "app/handover/assets/page.tsx"
bundle_file "app/handover/possession/page.tsx"

echo "Bundled Sprint 6 files into $OUTPUT successfully."
