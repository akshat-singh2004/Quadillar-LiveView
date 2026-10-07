#!/usr/bin/env bash
OUTPUT="sprint_13.txt"
echo "=== SPRINT 13 CODE BUNDLE ===" > "$OUTPUT"

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

bundle_file "app/site/tbt/page.tsx"
bundle_file "app/site/virtual-inspect/page.tsx"
bundle_file "app/site/vr-walkthrough/page.tsx"

echo "Bundled Sprint 13 files into $OUTPUT successfully."
