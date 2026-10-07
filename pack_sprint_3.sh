#!/usr/bin/env bash
OUTPUT="sprint_3.txt"
echo "=== SPRINT 3 CODE BUNDLE ===" > "$OUTPUT"

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

bundle_file "app/operations/dpr/page.tsx"
bundle_file "app/operations/gate-register/page.tsx"
bundle_file "app/safety/permits/page.tsx"

echo "Bundled Sprint 3 files into $OUTPUT successfully."
