#!/usr/bin/env bash

set -e

echo "Generating Sprint Bundles 15 through 19 directly to disk..."

# -----------------------------------------------------------------------------
# SPRINT 15: STRUCTURAL CONCRETE, MATURITY, DE-SHUTTERING & DPR ENGINE
# -----------------------------------------------------------------------------
cat << 'PACK_15' > pack_sprint_15.sh
#!/usr/bin/env bash
OUT="sprint_15.txt"
FILES=(
  "components/quality/LogCubeTestModal.tsx"
  "components/quality/ConcreteMaturityChart.tsx"
  "components/safety/StrippingPermitCard.tsx"
  "components/site/DPRComposer.tsx"
)
echo "==================================================" > "$OUT"
echo "SPRINT 15: STRUCTURAL CONCRETE, MATURITY & DPR" >> "$OUT"
echo "==================================================" >> "$OUT"
for f in "${FILES[@]}"; do
  echo "==================================================" >> "$OUT"
  echo "FILE: $f" >> "$OUT"
  echo "==================================================" >> "$OUT"
  if [ -f "$f" ]; then cat "$f" >> "$OUT"; else echo "[FILE NOT FOUND]" >> "$OUT"; fi
  echo "" >> "$OUT"
done
echo "Wrote $(wc -l < "$OUT") lines to $OUT"
PACK_15
chmod +x pack_sprint_15.sh
./pack_sprint_15.sh

# -----------------------------------------------------------------------------
# SPRINT 16: QA/QC TESTING CONSOLE, CUBE REGISTER & WORKFORCE MUSTER
# -----------------------------------------------------------------------------
cat << 'PACK_16' > pack_sprint_16.sh
#!/usr/bin/env bash
OUT="sprint_16.txt"
FILES=(
  "app/quality/cube-tests/page.tsx"
  "components/site/LaborRosterTable.tsx"
  "components/site/DPRFormModal.tsx"
)
echo "==================================================" > "$OUT"
echo "SPRINT 16: QA/QC CONSOLE & WORKFORCE MUSTER" >> "$OUT"
echo "==================================================" >> "$OUT"
for f in "${FILES[@]}"; do
  echo "==================================================" >> "$OUT"
  echo "FILE: $f" >> "$OUT"
  echo "==================================================" >> "$OUT"
  if [ -f "$f" ]; then cat "$f" >> "$OUT"; else echo "[FILE NOT FOUND]" >> "$OUT"; fi
  echo "" >> "$OUT"
done
echo "Wrote $(wc -l < "$OUT") lines to $OUT"
PACK_16
chmod +x pack_sprint_16.sh
./pack_sprint_16.sh

# -----------------------------------------------------------------------------
# SPRINT 17: COMMERCIAL BILLING PIPELINE, RA BILLS & STATUTORY DEDUCTIONS
# -----------------------------------------------------------------------------
cat << 'PACK_17' > pack_sprint_17.sh
#!/usr/bin/env bash
OUT="sprint_17.txt"
FILES=(
  "app/finance/ra-bills/page.tsx"
  "components/finance/IPCDeductionDrawer.tsx"
  "app/actions/billing-pipeline.ts"
)
echo "==================================================" > "$OUT"
echo "SPRINT 17: RA BILLS & COMMERCIAL DEDUCTIONS" >> "$OUT"
echo "==================================================" >> "$OUT"
for f in "${FILES[@]}"; do
  echo "==================================================" >> "$OUT"
  echo "FILE: $f" >> "$OUT"
  echo "==================================================" >> "$OUT"
  if [ -f "$f" ]; then cat "$f" >> "$OUT"; else echo "[FILE NOT FOUND]" >> "$OUT"; fi
  echo "" >> "$OUT"
done
echo "Wrote $(wc -l < "$OUT") lines to $OUT"
PACK_17
chmod +x pack_sprint_17.sh
./pack_sprint_17.sh

# -----------------------------------------------------------------------------
# SPRINT 18: CDE SPATIAL REDLINE, ISO 19650 DRAWINGS & DOCUMENT VALIDATION
# -----------------------------------------------------------------------------
cat << 'PACK_18' > pack_sprint_18.sh
#!/usr/bin/env bash
OUT="sprint_18.txt"
FILES=(
  "components/cde/DrawingMarkupViewer.tsx"
  "components/cde/DrawingValidator.tsx"
  "components/cde/FacetedCDETable.tsx"
  "components/cde/UploadModal.tsx"
)
echo "==================================================" > "$OUT"
echo "SPRINT 18: CDE SPATIAL REDLINE & VALIDATION" >> "$OUT"
echo "==================================================" >> "$OUT"
for f in "${FILES[@]}"; do
  echo "==================================================" >> "$OUT"
  echo "FILE: $f" >> "$OUT"
  echo "==================================================" >> "$OUT"
  if [ -f "$f" ]; then cat "$f" >> "$OUT"; else echo "[FILE NOT FOUND]" >> "$OUT"; fi
  echo "" >> "$OUT"
done
echo "Wrote $(wc -l < "$OUT") lines to $OUT"
PACK_18
chmod +x pack_sprint_18.sh
./pack_sprint_18.sh

# -----------------------------------------------------------------------------
# SPRINT 19: EXECUTIVE COMMAND HUB, CONTRACT CLAUSE REVIEW & PORTALS
# -----------------------------------------------------------------------------
cat << 'PACK_19' > pack_sprint_19.sh
#!/usr/bin/env bash
OUT="sprint_19.txt"
FILES=(
  "components/dashboard/DetailDrawer.tsx"
  "components/contracts/DocumentClauseViewer.tsx"
  "components/portal/ClientExecutiveDashboard.tsx"
  "app/portal/architect/page.tsx"
)
echo "==================================================" > "$OUT"
echo "SPRINT 19: EXECUTIVE COMMAND & CONTRACTS" >> "$OUT"
echo "==================================================" >> "$OUT"
for f in "${FILES[@]}"; do
  echo "==================================================" >> "$OUT"
  echo "FILE: $f" >> "$OUT"
  echo "==================================================" >> "$OUT"
  if [ -f "$f" ]; then cat "$f" >> "$OUT"; else echo "[FILE NOT FOUND]" >> "$OUT"; fi
  echo "" >> "$OUT"
done
echo "Wrote $(wc -l < "$OUT") lines to $OUT"
PACK_19
chmod +x pack_sprint_19.sh
./pack_sprint_19.sh

echo ""
echo "=================================================="
echo "GENERATED SPRINT FILES ON DISK:"
echo "=================================================="
ls -lh sprint_15.txt sprint_16.txt sprint_17.txt sprint_18.txt sprint_19.txt
echo "✓ All sprint files generated successfully!"
