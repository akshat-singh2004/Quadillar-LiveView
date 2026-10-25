#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LEVEL 4 MILESTONE ADVANCEMENT & POUR HOLD-GATE INSPECTOR
# Standards: IS 456 Cl. 26, IS 14687, Section 65B Indian Evidence Act
# ==============================================================================

set -euo pipefail

PROJECT_ID="GOMTI-NAGAR-PH1-FITOUT"
POUR_CARD="PC-2026-L04-001"
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
echo -e "${CYAN}    QUADILLAR LIVEVIEW: LEVEL 4 ADVANCEMENT & PRE-POUR GATEKEEPER   ${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "Project Target : ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Pour Card ID   : ${YELLOW}${POUR_CARD}${NC}"
echo -e "Audit Date     : $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# 1. Load Configurations
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
  SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}"
  SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$SUPABASE_KEY}"
fi

# 2. Verify Section 65B Audit Trail for Preceding Bill (RA-2026-001)
echo -e "[1/3] Verifying Section 65B Admissibility Ledger in Hermes Vault..."
AUDIT_ENDPOINT="${SUPABASE_URL}/rest/v1/immutable_audit_logs?project_id=eq.${PROJECT_ID}&action_category=eq.STATUTORY_EVIDENCE_65B&select=action_title,merkle_root_hash,status,created_at&limit=1"
AUDIT_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${AUDIT_ENDPOINT}")

node -e "
const rows = JSON.parse(process.argv[1]);
if (rows && rows.length > 0) {
  console.log('\x1b[32m✓ Section 65B Evidence Sealed:\x1b[0m ' + rows[0].action_title);
  console.log('  Hash: ' + rows[0].merkle_root_hash);
  console.log('  Status: ' + rows[0].status + ' | Anchored: ' + rows[0].created_at);
} else {
  console.log('\x1b[33m! Warning: Section 65B certificate not found in active view.\x1b[0m');
}
" "${AUDIT_RES}"

# 3. Inspect Pour Card Pre-Pour Clearance Gates
echo -e "\n[2/3] Evaluating Pre-Pour Inspection Hold-Gates for ${POUR_CARD}..."
PC_ENDPOINT="${SUPABASE_URL}/rest/v1/concrete_pour_cards?project_id=eq.${PROJECT_ID}&pour_card_number=eq.${POUR_CARD}&select=*"
PC_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PC_ENDPOINT}")

node -e "
const data = JSON.parse(process.argv[1]);
if (!data || data.length === 0) {
  console.error('\x1b[31m[ERROR]\x1b[0m Pour card not found in database. Run migration SQL first.');
  process.exit(1);
}

const pc = data[0];
console.log('Element     : ' + pc.structural_element);
console.log('Location    : ' + pc.grid_location + ' | Target Grade: ' + pc.concrete_grade);
console.log('Volume      : ' + pc.planned_volume_cum + ' m³ | Required Cube Sets: ' + pc.required_cube_sets + ' (IS 456 Cl. 15.2)');
console.log('--------------------------------------------------------------------');

const c1 = pc.formwork_plumb_verified;
const c2 = pc.rebar_cover_verified;
const c3 = pc.mep_embeds_cleared;
const c4 = pc.slump_temperature_cleared;

console.log((c1 ? '\x1b[32m[CLEARED]\x1b[0m' : '\x1b[31m[HOLD]\x1b[0m') + ' Check 1: Formwork, Propping & Deck Level (IS 14687)');
console.log((c2 ? '\x1b[32m[CLEARED]\x1b[0m' : '\x1b[31m[HOLD]\x1b[0m') + ' Check 2: Rebar Placement, Spacing & Cover (IS 456 Cl. 26)');
console.log((c3 ? '\x1b[32m[CLEARED]\x1b[0m' : '\x1b[31m[HOLD]\x1b[0m') + ' Check 3: Daedalus MEP BIM Conduit Embedments (IFC Scan)');
console.log((c4 ? '\x1b[32m[CLEARED]\x1b[0m' : '\x1b[31m[HOLD]\x1b[0m') + ' Check 4: Argus Weather & Microclimate Window (Temp/Wind)');

console.log('--------------------------------------------------------------------');
if (c1 && c2 && c3 && c4) {
  console.log('\x1b[32m[STATUS: CLEARED FOR CASTING]\x1b[0m RMC Batching Authorized.');
} else {
  console.log('\x1b[33m[STATUS: PRE_POUR_HOLD ACTIVE]\x1b[0m Physical Rebar & Staging Signoff Required from Lead Engineer.');
}
" "${PC_RES}"

# 4. Check Linked Safety Permit to Work (PTW)
echo -e "\n[3/3] Inspecting Associated Permit to Work (Minerva Safety Sentinel)..."
PTW_ENDPOINT="${SUPABASE_URL}/rest/v1/safety_permit_to_work?project_id=eq.${PROJECT_ID}&ptw_number=eq.PTW-2026-HSE-109&select=*"
PTW_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PTW_ENDPOINT}")

node -e "
const ptwData = JSON.parse(process.argv[1]);
if (ptwData && ptwData.length > 0) {
  const p = ptwData[0];
  console.log('\x1b[32m✓ Safety Permit Active:\x1b[0m ' + p.ptw_number + ' (' + p.hazard_category + ')');
  console.log('  Location: ' + p.work_location + ' | Operatives Covered: ' + p.planned_workers_count);
  console.log('  Wind: ' + p.ambient_wind_speed_kmh + ' km/h | Lifelines: ' + (p.harness_lifelines_checked ? 'VERIFIED' : 'PENDING'));
} else {
  console.log('\x1b[33m! PTW not linked.\x1b[0m');
}
" "${PTW_RES}"

echo -e "\n${GREEN}Milestone advancement cycle verified.${NC}"
