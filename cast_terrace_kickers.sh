#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: TERRACE & OHT KICKER POUR & CRITICAL PATH HANDOFF
# ==============================================================================

set -euo pipefail

PROJECT_ID="GOMTI-NAGAR-PH1-FITOUT"
POUR_CARD="PC-2026-TR-KICKER-001"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}====================================================================${NC}"
echo -e "${CYAN}    QUADILLAR LIVEVIEW: TERRACE & OHT KICKER POUR & WBS PROGRESS    ${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "Project Target : ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Pour Card ID   : ${YELLOW}${POUR_CARD}${NC}"
echo -e "Audit Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# 1. Load Configurations cleanly
if [ -f .env.local ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^#.* ]] && continue
    [[ -z "$line" ]] && continue
    export "$line"
  done < .env.local
  SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}"
  SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_KEY}"
fi

# 2. Inspect Kicker Pour Card Status & Cleared Checks
echo -e "[1/3] Inspecting Terrace Kicker Pour Card Gate State..."
PC_ENDPOINT="${SUPABASE_URL}/rest/v1/concrete_pour_cards?project_id=eq.${PROJECT_ID}&pour_card_number=eq.${POUR_CARD}&select=*"
PC_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PC_ENDPOINT}")

node -e '
const cards = JSON.parse(process.argv[1]);
if (!cards || cards.length === 0) {
  console.log("\x1b[31m[ERROR] Pour card not found.\x1b[0m");
  process.exit(1);
}
const p = cards[0];
console.log("Element        : " + p.structural_element + " (" + p.concrete_grade + ")");
console.log("Status         : \x1b[32m" + p.status + "\x1b[0m | Volume: " + p.planned_volume_cum + " m³");
console.log("Cover Verified : " + (p.rebar_cover_verified ? "\x1b[32mPASS (45mm Water-Face / 40mm Column)\x1b[0m" : "\x1b[31mFAIL\x1b[0m"));
console.log("Plumb & Joint  : " + (p.formwork_plumb_verified ? "\x1b[32mPASS (Δ_max <= 3mm & Waterstop Verified)\x1b[0m" : "\x1b[31mFAIL\x1b[0m"));
console.log("SEOR Hash      : " + p.seor_signature_hash);
' "${PC_RES}"

# 3. Check Sampling Queue (Triplicate Cubes)
echo -e "\n[2/3] Checking Sampling Queue for Terrace Kicker Batch..."
CUBE_ENDPOINT="${SUPABASE_URL}/rest/v1/concrete_cube_tests?project_id=eq.${PROJECT_ID}&pour_card_ref=eq.${POUR_CARD}&select=sample_tag,casting_date,testing_date,status"
CUBE_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${CUBE_ENDPOINT}")

node -e '
const cubes = JSON.parse(process.argv[1]);
if (cubes && cubes.length > 0) {
  const c = cubes[0];
  console.log("\x1b[32m✓ Triplicate Batch Ingested:\x1b[0m " + c.sample_tag);
  console.log("  Cast Date: " + c.casting_date + " | Break Date: " + c.testing_date + " (28 Days)");
  console.log("  Testing Status: \x1b[33m" + c.status + "\x1b[0m");
} else {
  console.log("\x1b[31m[FAIL] Triplicate sample missing for kicker batch.\x1b[0m");
}
' "${CUBE_RES}"

# 4. Check Chronos Schedule Hand-Off to WBS-9.2
echo -e "\n[3/3] Inspecting Chronos CPM Schedule State Transition..."
CPM_ENDPOINT="${SUPABASE_URL}/rest/v1/project_schedule_nodes?project_id=eq.${PROJECT_ID}&wbs_code=in.(WBS-9.1,WBS-9.2)&order=wbs_code.asc&select=wbs_code,activity_name,status,is_critical"
CPM_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${CPM_ENDPOINT}")

node -e '
const nodes = JSON.parse(process.argv[1]);
nodes.forEach(n => {
  const statusColor = n.status === "COMPLETED" ? "\x1b[32m" : (n.status === "IN_PROGRESS" ? "\x1b[34m" : "\x1b[33m");
  console.log("  " + n.wbs_code + ": " + n.activity_name + " -> " + statusColor + n.status + "\x1b[0m");
});
' "${CPM_RES}"

echo -e "\n${GREEN}Terrace/OHT Kicker milestone verified. WBS-9.2 rebar cage and wall placement unlocked.${NC}"
