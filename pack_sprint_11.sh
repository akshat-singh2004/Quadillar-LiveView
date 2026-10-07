#!/usr/bin/env bash
OUTPUT="sprint_11.txt"
echo "=== SPRINT 11 CODE BUNDLE ===" > "$OUTPUT"

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

bundle_file "app/site/reality-capture/page.tsx"
bundle_file "app/site/weather/page.tsx"
bundle_file "app/site/inventory/page.tsx"

echo "Bundled Sprint 11 files into $OUTPUT successfully."
