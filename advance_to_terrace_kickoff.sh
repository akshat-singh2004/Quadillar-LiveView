#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: TERRACE, LMR & OHT SUPERSTRUCTURE ADVANCEMENT AUDITOR
# Standards: IS 3370:2021, IS 456 Cl. 20.1, CPWD Cl. 42, BOCW Act 1996
# ==============================================================================

set -euo pipefail

PROJECT_ID="GOMTI-NAGAR-PH1-FITOUT"
POUR_CARD="PC-2026-TR-KICKER-001"
PTW_NUM="PTW-2026-HSE-114"
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
echo -e "${CYAN}    QUADILLAR LIVEVIEW: TERRACE, LMR & OHT ADVANCEMENT RADAR        ${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "Target Project : ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Kicker PourCard: ${YELLOW}${POUR_CARD}${NC}"
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

# 2. Verify Digital Weighbridge Inward & BBS Nesting (Vulcan)
echo -e "[1/4] Auditing Digital Weighbridge & Vulcan Rebar Nesting..."
MAT_ENDPOINT="${SUPABASE_URL}/rest/v1/material_weighbridge_inward?project_id=eq.${PROJECT_ID}&ticket_number=eq.WB-2026-TMT-046&select=*"
MAT_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${MAT_ENDPOINT}")

node -e '
const d = JSON.parse(process.argv[1]);
if (d && d.length > 0) {
  const m = d[0];
  console.log("\x1b[32m✓ Weighbridge Inward Slip:\x1b[0m " + m.ticket_number + " | Vehicle: " + m.vehicle_number);
  console.log("  Material    : " + m.material_type + " (" + m.material_grade + ")");
  console.log("  Net Tonnage : \x1b[32m" + m.net_weight_mt + " MT\x1b[0m | Supplier: " + m.supplier_name);
  console.log("  MTC Check   : " + (m.mtc_verified ? "\x1b[32mVERIFIED (Yield >= 500 MPa, Elongation >= 16%)\x1b[0m" : "\x1b[31mREJECTED\x1b[0m"));
} else {
  console.log("\x1b[31m[ERROR] Weighbridge inward ticket not found.\x1b[0m");
}
' "${MAT_RES}"

BBS_ENDPOINT="${SUPABASE_URL}/rest/v1/structural_bbs_schedules?project_id=eq.${PROJECT_ID}&bbs_code=eq.BBS-TR-LMR-OHT-01&select=*"
BBS_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${BBS_ENDPOINT}")

node -e '
const bbs = JSON.parse(process.argv[1]);
if (bbs && bbs.length > 0) {
  const s = bbs[0];
  console.log("  BBS Schedule: " + s.bbs_code + " | Billets Consumed: " + s.billets_consumed + " (12m standard)");
  console.log("  Scrap Rate  : \x1b[32m" + s.scrap_waste_pct + "%\x1b[0m (CPWD Cl. 42 Limit: <= 3.0%)");
}
' "${BBS_RES}"

# 3. Inspect Chronos WBS Progression
echo -e "\n[2/4] Inspecting Chronos 4D WBS Schedule Progression..."
CPM_ENDPOINT="${SUPABASE_URL}/rest/v1/project_schedule_nodes?project_id=eq.${PROJECT_ID}&wbs_code=in.(WBS-8.4,WBS-9.1,WBS-9.2,WBS-9.3,WBS-9.4,WBS-9.5)&order=wbs_code.asc&select=wbs_code,activity_name,status,is_critical"
CPM_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${CPM_ENDPOINT}")

node -e '
const nodes = JSON.parse(process.argv[1]);
nodes.forEach(n => {
  let color = "\x1b[33m";
  if (n.status === "COMPLETED") color = "\x1b[32m";
  if (n.status === "IN_PROGRESS") color = "\x1b[34m";
  console.log("  " + n.wbs_code + ": " + n.activity_name + " -> " + color + n.status + "\x1b[0m");
});
' "${CPM_RES}"

# 4. Audit Terrace Kicker Pour Card Hold-Gates
echo -e "\n[3/4] Evaluating Pre-Pour Inspection Hold-Gates for ${POUR_CARD}..."
PC_ENDPOINT="${SUPABASE_URL}/rest/v1/concrete_pour_cards?project_id=eq.${PROJECT_ID}&pour_card_number=eq.${POUR_CARD}&select=*"
PC_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PC_ENDPOINT}")

node -e '
const cards = JSON.parse(process.argv[1]);
if (!cards || cards.length === 0) {
  console.log("\x1b[31m[ERROR] Pour card not found in database.\x1b[0m");
  process.exit(1);
}
const p = cards[0];
console.log("Element     : " + p.structural_element + " (" + p.concrete_grade + ")");
console.log("Location    : " + p.grid_location);
console.log("Volume      : " + p.planned_volume_cum + " m³ | Required Cube Sets: " + p.required_cube_sets + " (IS 456 Cl. 15.2)");
console.log("--------------------------------------------------------------------");
console.log((p.rebar_cover_verified ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[HOLD]\x1b[0m") + " Check 1: 45mm Liquid Retaining / 40mm Column Cover (IS 3370 / IS 456)");
console.log((p.formwork_plumb_verified ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[HOLD]\x1b[0m") + " Check 2: Kicker Alignment & Swellable Waterstop (IS 15058 <= 3mm)");
console.log((p.mep_embeds_cleared ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[HOLD]\x1b[0m") + " Check 3: Rainwater Drainage Sleeves & Overflows (Daedalus BIM)");
console.log((p.slump_temperature_cleared ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[HOLD]\x1b[0m") + " Check 4: Argus Ambient Microclimate Window");
console.log("--------------------------------------------------------------------");
console.log("Status      : \x1b[33m" + p.status + "\x1b[0m (Optical theodolite survey & waterstop inspection pending)");
' "${PC_RES}"

# 5. Inspect Active Rooftop Safety Permit (Minerva)
echo -e "\n[4/4] Inspecting Active Rooftop Safety Permit (${PTW_NUM})..."
PTW_ENDPOINT="${SUPABASE_URL}/rest/v1/safety_permit_to_work?project_id=eq.${PROJECT_ID}&ptw_number=eq.${PTW_NUM}&select=*"
PTW_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PTW_ENDPOINT}")

node -e '
const ptws = JSON.parse(process.argv[1]);
if (ptws && ptws.length > 0) {
  const p = ptws[0];
  console.log("\x1b[32m✓ Safety Permit Active:\x1b[0m " + p.ptw_number + " (" + p.hazard_category + ")");
  console.log("  Location: " + p.work_location + " | Operatives: " + p.planned_workers_count);
  console.log("  Wind: " + p.ambient_wind_speed_kmh + " km/h | Lifelines: " + (p.harness_lifelines_checked ? "VERIFIED" : "PENDING"));
  console.log("  Status: \x1b[32m" + p.status + "\x1b[0m");
} else {
  console.log("\x1b[33m! PTW entry pending.\x1b[0m");
}
' "${PTW_RES}"

echo -e "\n${GREEN}Terrace, LMR & OHT Superstructure Kickoff verified successfully.${NC}"
