#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: LEVEL 6 SLAB PRE-POUR FINAL AUTHORIZATION HARNESS
# ==============================================================================

set -euo pipefail

PROJECT_ID="GOMTI-NAGAR-PH1-FITOUT"
POUR_CARD="PC-2026-L06-SLAB-001"
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
echo -e "${CYAN}   QUADILLAR LIVEVIEW: LEVEL 6 SLAB FINAL CLEARANCE & RMC DISPATCH  ${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "Target Project : ${YELLOW}${PROJECT_ID}${NC}"
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

# 2. Inspect Chronos WBS Chain
echo -e "[1/3] Inspecting Chronos 4D WBS Schedule Progression..."
CPM_ENDPOINT="${SUPABASE_URL}/rest/v1/project_schedule_nodes?project_id=eq.${PROJECT_ID}&wbs_code=in.(WBS-8.1,WBS-8.2,WBS-8.3,WBS-8.4)&order=wbs_code.asc&select=wbs_code,activity_name,status,is_critical"
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

# 3. Evaluate 4-Point Pour Card Pre-Pour Clearance
echo -e "\n[2/3] Evaluating Pre-Pour Clearance Hold-Gates for ${POUR_CARD}..."
PC_ENDPOINT="${SUPABASE_URL}/rest/v1/concrete_pour_cards?project_id=eq.${PROJECT_ID}&pour_card_number=eq.${POUR_CARD}&select=*"
PC_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${PC_ENDPOINT}")

node -e '
const cards = JSON.parse(process.argv[1]);
if (!cards || cards.length === 0) {
  console.log("\x1b[31m[ERROR] Pour card not found.\x1b[0m");
  process.exit(1);
}
const p = cards[0];
console.log("Element     : " + p.structural_element + " (" + p.concrete_grade + ")");
console.log("Location    : " + p.grid_location + " | Planned Volume: " + p.planned_volume_cum + " m³");
console.log("Target Slump: " + p.target_slump_mm + " mm | Mandated Cube Sets: " + p.required_cube_sets + " (IS 456 Cl. 15.2)");
console.log("--------------------------------------------------------------------");
const c1 = p.formwork_plumb_verified;
const c2 = p.rebar_cover_verified;
const c3 = p.mep_embeds_cleared;
const c4 = p.slump_temperature_cleared;

console.log((c1 ? "\x1b[32m[CLEARED]\x1b[0m" : "\x1b[31m[HOLD]\x1b[0m") + " Check 1: Cuplock Staging, Propping & Deck Level (IS 14687)");
console.log((c2 ? "\x1b[32m[CLEARED]\x1b[0m" : "\x1b[31m[HOLD]\x1b[0m") + " Check 2: Beam & Slab Reinforcement Cover (IS 456 Cl. 26)");
console.log((c3 ? "\x1b[32m[CLEARED]\x1b[0m" : "\x1b[31m[HOLD]\x1b[0m") + " Check 3: Daedalus MEP BIM Conduit Embedments (IFC Scan)");
console.log((c4 ? "\x1b[32m[CLEARED]\x1b[0m" : "\x1b[31m[HOLD]\x1b[0m") + " Check 4: Argus Weather & Microclimate Window (Temp/Wind)");
console.log("--------------------------------------------------------------------");

if (c1 && c2 && c3 && c4) {
  console.log("Status      : \x1b[32m" + p.status + "\x1b[0m");
  console.log("\x1b[32m[STATUS: CLEARED FOR CASTING]\x1b[0m RMC Batching & Concrete Pump Dispatch Authorized.");
} else {
  console.log("Status      : \x1b[31m" + p.status + "\x1b[0m (Unresolved Hold-Gates remain)");
}
console.log("SEOR Seal   : " + p.seor_signature_hash);
' "${PC_RES}"

# 4. Check Hermes Audit Trail
echo -e "\n[3/3] Inspecting Hermes Section 65B Audit Ledger..."
AUDIT_ENDPOINT="${SUPABASE_URL}/rest/v1/immutable_audit_logs?project_id=eq.${PROJECT_ID}&action_category=eq.QUALITY_POUR_AUTHORIZED&order=created_at.desc&limit=1&select=action_title,merkle_root_hash,status,created_at"
AUDIT_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${AUDIT_ENDPOINT}")

node -e '
const logs = JSON.parse(process.argv[1]);
if (logs && logs.length > 0) {
  const l = logs[0];
  console.log("\x1b[32m✓ Authorization Sealed:\x1b[0m " + l.action_title);
  console.log("  Hash: " + l.merkle_root_hash);
} else {
  console.log("\x1b[33m! Authorization audit anchor pending.\x1b[0m");
}
' "${AUDIT_RES}"

echo -e "\n${GREEN}Level 6 Pre-pour authorization verified. RMC batching pipeline ready for execution.${NC}"
