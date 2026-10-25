#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LEVEL 6 REBAR INSPECTION & MAIN POUR GATE RADAR
# ==============================================================================

set -euo pipefail

PROJECT_ID="GOMTI-NAGAR-PH1-FITOUT"
POUR_CARD="PC-2026-L06-COL-001"
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
echo -e "${CYAN}    QUADILLAR LIVEVIEW: LEVEL 6 REBAR RADAR & MAIN POUR PRE-CHECK   ${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "Target Project : ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Main Pour Card : ${YELLOW}${POUR_CARD}${NC}"
echo -e "Inspection Time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# 1. Load Configurations
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
  SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}"
  SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_KEY}"
fi

# 2. Audit Chronos CPM WBS Chain
echo -e "[1/3] Auditing Chronos 4D Critical Path Transitions..."
CPM_ENDPOINT="${SUPABASE_URL}/rest/v1/project_schedule_nodes?project_id=eq.${PROJECT_ID}&wbs_code=in.(WBS-7.1,WBS-7.2,WBS-7.3,WBS-7.4,WBS-7.5)&order=wbs_code.asc&select=wbs_code,activity_name,status,is_critical"
CPM_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${CPM_ENDPOINT}")

node -e "
const nodes = JSON.parse(process.argv[1]);
nodes.forEach(n => {
  let color = '\x1b[33m';
  if (n.status === 'COMPLETED') color = '\x1b[32m';
  if (n.status === 'IN_PROGRESS') color = '\x1b[34m';
  console.log('  ' + n.wbs_code + ': ' + n.activity_name + ' -> ' + color + n.status + '\x1b[0m');
});
" "${CPM_RES}"

# 3. Audit Main Column Pour Card Hold-Gates
echo -e "\n[2/3] Evaluating Pre-Pour Hold-Gates for Main Columns (${POUR_CARD})..."
PC_ENDPOINT="${SUPABASE_URL}/rest/v1/concrete_pour_cards?project_id=eq.${PROJECT_ID}&pour_card_number=eq.${POUR_CARD}&select=*"
PC_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PC_ENDPOINT}")

node -e "
const cards = JSON.parse(process.argv[1]);
if (!cards || cards.length === 0) {
  console.log('\x1b[31m[ERROR] Pour card not found.\x1b[0m');
  process.exit(1);
}
const p = cards[0];
console.log('Element     : ' + p.structural_element + ' (' + p.concrete_grade + ')');
console.log('Location    : ' + p.grid_location);
console.log('Volume      : ' + p.planned_volume_cum + ' m³ | Required Cube Sets: ' + p.required_cube_sets + ' (IS 456 Cl. 15.2)');
console.log('--------------------------------------------------------------------');
console.log((p.rebar_cover_verified ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[HOLD]\x1b[0m') + ' Check 1: IS 13920 Rebar Cages & 40mm Cover Spacers');
console.log((p.mep_embeds_cleared ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[HOLD]\x1b[0m') + ' Check 2: Conduits, Pull Boxes & Earthing Jumpers');
console.log((p.slump_temperature_cleared ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[HOLD]\x1b[0m') + ' Check 3: Argus Ambient Microclimate Window');
console.log((p.formwork_plumb_verified ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[HOLD]\x1b[0m') + ' Check 4: Dual-Axis Laser Plumb Alignment (IS 456 Cl. 20.1)');
console.log('--------------------------------------------------------------------');
console.log('Status      : \x1b[33m' + p.status + '\x1b[0m (Dual-axis column shuttering alignment pending)');
" "${PC_RES}"

# 4. Hermes Section 65B Ledger Check
echo -e "\n[3/3] Inspecting Hermes Vault Notarization..."
AUDIT_ENDPOINT="${SUPABASE_URL}/rest/v1/immutable_audit_logs?project_id=eq.${PROJECT_ID}&action_category=eq.QUALITY_REBAR_SEALED&order=created_at.desc&limit=1&select=action_title,merkle_root_hash,status,created_at"
AUDIT_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${AUDIT_ENDPOINT}")

node -e "
const logs = JSON.parse(process.argv[1]);
if (logs && logs.length > 0) {
  const l = logs[0];
  console.log('\x1b[32m✓ Rebar Audit Sealed:\x1b[0m ' + l.action_title);
  console.log('  Hash: ' + l.merkle_root_hash);
} else {
  console.log('\x1b[33m! Rebar audit anchor pending.\x1b[0m');
}
" "${AUDIT_RES}"

echo -e "\n${GREEN}Level 6 rebar inspection complete. Ready for shuttering plumb verification.${NC}"
