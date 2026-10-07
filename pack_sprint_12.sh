#!/usr/bin/env bash
OUTPUT="sprint_12.txt"
echo "=== SPRINT 12 CODE BUNDLE ===" > "$OUTPUT"

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

bundle_file "app/site/workforce/page.tsx"
bundle_file "app/site/safety/page.tsx"
bundle_file "app/site/safety-ptw/page.tsx"

echo "Bundled Sprint 12 files into $OUTPUT successfully."
