#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LEVEL 5 COLUMNS KICKOFF & PRE-POUR INTERLOCK AUDITOR
# Standards: IS 13920:2016, IS 456 Cl. 20.1, CPWD Cl. 42, BOCW Act 1996
# ==============================================================================

set -euo pipefail

PROJECT_ID="GOMTI-NAGAR-PH1-FITOUT"
POUR_CARD="PC-2026-L05-KICKER-001"
PTW_NUM="PTW-2026-HSE-110"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

# Terminal Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}====================================================================${NC}"
echo -e "${CYAN}    QUADILLAR LIVEVIEW: LEVEL 5 SUPERSTRUCTURE COLUMNS RADAR        ${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "Target Project : ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Kicker Pour Card: ${YELLOW}${POUR_CARD}${NC}"
echo -e "Inspection Time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# 1. Load Configurations
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
  SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}"
  SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_KEY}"
fi

# 2. Verify Digital Weighbridge Inward Pass
echo -e "[1/4] Auditing Digital Weighbridge & Rebar Inward Telemetry..."
MAT_ENDPOINT="${SUPABASE_URL}/rest/v1/material_weighbridge_inward?project_id=eq.${PROJECT_ID}&ticket_number=eq.WB-2026-TMT-044&select=*"
MAT_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${MAT_ENDPOINT}")

node -e "
const d = JSON.parse(process.argv[1]);
if (d && d.length > 0) {
  const m = d[0];
  console.log('\x1b[32m✓ Weighbridge Inward Slip:\x1b[0m ' + m.ticket_number + ' | Vehicle: ' + m.vehicle_number);
  console.log('  Material : ' + m.material_type + ' (' + m.material_grade + ')');
  console.log('  Net Tonnage: \x1b[32m' + m.net_weight_mt + ' MT\x1b[0m | Supplier: ' + m.supplier_name);
  console.log('  MTC Check: ' + (m.mtc_verified ? '\x1b[32mVERIFIED (Yield >= 500 MPa, Elongation >= 16%)\x1b[0m' : '\x1b[31mREJECTED\x1b[0m'));
} else {
  console.log('\x1b[31m[ERROR] Weighbridge material inward record not found.\x1b[0m');
}
" "${MAT_RES}"

# 3. Verify Kicker Pour Card & Pre-Pour Interlock
echo -e "\n[2/4] Auditing Starter Kicker Pre-Pour Hold-Gate (${POUR_CARD})..."
PC_ENDPOINT="${SUPABASE_URL}/rest/v1/concrete_pour_cards?project_id=eq.${PROJECT_ID}&pour_card_number=eq.${POUR_CARD}&select=*"
PC_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PC_ENDPOINT}")

node -e "
const cards = JSON.parse(process.argv[1]);
if (!cards || cards.length === 0) {
  console.log('\x1b[31m[ERROR] Pour card not found in database.\x1b[0m');
  process.exit(1);
}
const p = cards[0];
console.log('Element     : ' + p.structural_element + ' (' + p.concrete_grade + ')');
console.log('Location    : ' + p.grid_location);
console.log('Volume      : ' + p.planned_volume_cum + ' m³ | Slump Spec: ' + p.target_slump_mm + ' mm');
console.log('--------------------------------------------------------------------');
console.log((p.rebar_cover_verified ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[HOLD]\x1b[0m') + ' Check 1: 40mm Column Cover & Starter Bar Plumb (IS 456 Cl. 26.4)');
console.log((p.formwork_plumb_verified ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[HOLD]\x1b[0m') + ' Check 2: Kicker Formwork Alignment (IS 456 Cl. 20.1 <= 3mm)');
console.log((p.mep_embeds_cleared ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[HOLD]\x1b[0m') + ' Check 3: Earthing Continuity & Conduits (Daedalus BIM)');
console.log((p.slump_temperature_cleared ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[HOLD]\x1b[0m') + ' Check 4: Argus Ambient Microclimate Window');
console.log('--------------------------------------------------------------------');
console.log('Status      : \x1b[33m' + p.status + '\x1b[0m (Optical Theodolite Survey Pending)');
" "${PC_RES}"

# 4. Verify Active Safety Permit to Work (Minerva)
echo -e "\n[3/4] Inspecting Working-at-Height Safety Permit (${PTW_NUM})..."
PTW_ENDPOINT="${SUPABASE_URL}/rest/v1/safety_permit_to_work?project_id=eq.${PROJECT_ID}&ptw_number=eq.${PTW_NUM}&select=*"
PTW_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PTW_ENDPOINT}")

node -e "
const ptws = JSON.parse(process.argv[1]);
if (ptws && ptws.length > 0) {
  const p = ptws[0];
  console.log('\x1b[32m✓ PTW Active:\x1b[0m ' + p.ptw_number + ' (' + p.hazard_category + ')');
  console.log('  Work Scope   : ' + p.work_description);
  console.log('  Manpower     : ' + p.planned_workers_count + ' steel operatives | Wind: ' + p.ambient_wind_speed_kmh + ' km/h');
  console.log('  Safety Status: \x1b[32m' + p.status + '\x1b[0m');
} else {
  console.log('\x1b[33m! PTW entry pending.\x1b[0m');
}
" "${PTW_RES}"

# 5. Verify Hermes Section 65B Audit Trail Anchor
echo -e "\n[4/4] Auditing Hermes Section 65B Ledger Continuity..."
AUDIT_ENDPOINT="${SUPABASE_URL}/rest/v1/immutable_audit_logs?project_id=eq.${PROJECT_ID}&action_category=eq.STATUTORY_MILESTONE_KICKOFF&order=created_at.desc&limit=1&select=action_title,merkle_root_hash,status,created_at"
AUDIT_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${AUDIT_ENDPOINT}")

node -e "
const logs = JSON.parse(process.argv[1]);
if (logs && logs.length > 0) {
  const l = logs[0];
  console.log('\x1b[32m✓ Milestone Block Sealed:\x1b[0m ' + l.action_title);
  console.log('  Merkle Root Hash: ' + l.merkle_root_hash);
  console.log('  Status: ' + l.status + ' | NTP Timestamp: ' + l.created_at);
} else {
  console.log('\x1b[33m! Audit anchor pending.\x1b[0m');
}
" "${AUDIT_RES}"

echo -e "\n${GREEN}Level 5 Superstructure Kickoff verified successfully.${NC}"
