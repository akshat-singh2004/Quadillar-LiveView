#!/usr/bin/env bash
OUTPUT="sprint_4.txt"
echo "=== SPRINT 4 CODE BUNDLE ===" > "$OUTPUT"

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

bundle_file "app/engineering/4d-simulator/page.tsx"
bundle_file "app/engineering/geotechnical/page.tsx"
bundle_file "app/drawings/spatial-redlines/page.tsx"

echo "Bundled Sprint 4 files into $OUTPUT successfully."
