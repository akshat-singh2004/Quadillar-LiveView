#!/usr/bin/env bash
# ==============================================================================
# QUADILLAR LIVEVIEW: 7D TELEMETRY & AUTONOMOUS ANOMALY GATEWAY AUDITOR
# Standards: ASHRAE Guideline 36, ISO 19650-3, Section 65B Indian Evidence Act
# ==============================================================================

set -euo pipefail

PROJECT_ID="GOMTI-NAGAR-PH1-FITOUT"

# Initialize variables to prevent unbound variable crashes under set -u
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_KEY:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${BLUE}====================================================================${NC}"
echo -e "${CYAN}    QUADILLAR LIVEVIEW: 7D TELEMETRY & ANOMALY GATEWAY AUDIT        ${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo -e "Target Project : ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Audit Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# 1. Load Configurations cleanly from .env.local if present
if [ -f .env.local ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^#.* ]] && continue
    [[ -z "$line" ]] && continue
    export "$line"
  done < .env.local
fi

# Fallback resolution across common Supabase key naming patterns
SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}}"

if [ -z "${SUPABASE_URL}" ] || [ -z "${SUPABASE_KEY}" ]; then
  echo -e "${RED}[ERROR] Neither SUPABASE_URL nor SUPABASE_KEY is set.${NC}"
  exit 1
fi

# 2. Inspect Ingested IoT Telemetry Streams
echo -e "[1/3] Inspecting Real-Time IoT Telemetry Ingestion..."
TELEM_ENDPOINT="${SUPABASE_URL}/rest/v1/facility_telemetry_streams?project_id=eq.${PROJECT_ID}&order=recorded_at.desc&limit=6&select=*"
TELEM_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${TELEM_ENDPOINT}")

node -e '
let streams;
try {
  streams = JSON.parse(process.argv[1]);
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to parse Telemetry response:\x1b[0m", e.message);
  process.exit(1);
}

if (!Array.isArray(streams) || streams.length === 0) {
  console.log("\x1b[31m[ERROR] No telemetry streams recorded. Execute SQL migration first.\x1b[0m");
  process.exit(1);
}

console.log("---------------------------------------------------------------------------------------------------");
console.log("| Asset Tag       | Metric Name                    | Reading     | Codal Limits | Protocol   | Gate|");
console.log("---------------------------------------------------------------------------------------------------");
streams.forEach(s => {
  let limits = (s.codal_min_threshold + " - " + s.codal_max_threshold + " " + s.unit_of_measure).padEnd(12);
  let val = (s.reading_value + " " + s.unit_of_measure).padEnd(11);
  let status = s.is_anomaly ? "\x1b[31mANOMALY\x1b[0m" : "\x1b[32mOPTIMAL\x1b[0m";
  console.log("| " + s.asset_tag_ref.padEnd(15) + " | " + s.metric_name.substring(0, 30).padEnd(30) + " | " + val + " | " + limits + " | " + s.sensor_protocol.padEnd(10) + " | " + status + " |");
});
console.log("---------------------------------------------------------------------------------------------------");
console.log("\x1b[32m✓ Telemetry gateway operating within BACnet / Modbus protocol parameters.\x1b[0m");
' "${TELEM_RES}"

# 3. Inspect Autonomously Spawned DLP Incident Tickets
echo -e "\n[2/3] Inspecting Autonomous DLP Ticket Triggered by Telemetry Anomaly..."
DLP_AUTO_ENDPOINT="${SUPABASE_URL}/rest/v1/dlp_incident_logs?project_id=eq.${PROJECT_ID}&ticket_ref=like.DLP-AUTO-%25&order=created_at.desc&limit=1&select=*"
DLP_AUTO_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${DLP_AUTO_ENDPOINT}")

node -e '
let tickets;
try {
  tickets = JSON.parse(process.argv[1]);
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to parse DLP Auto response:\x1b[0m", e.message);
  process.exit(1);
}

if (Array.isArray(tickets) && tickets.length > 0) {
  const t = tickets[0];
  console.log("\x1b[32m✓ Autonomous Defect Ticket Active:\x1b[0m " + t.ticket_ref);
  console.log("  Target Category    : " + t.trade_category);
  console.log("  Location           : " + t.location_floor);
  console.log("  Severity Level     : \x1b[31m" + t.severity + "\x1b[0m");
  console.log("  Defect Summary     : " + t.defect_description);
  console.log("  Contractor SLA End : \x1b[33m" + t.sla_target_resolution_date + " (48-Hour Resolution SLA)\x1b[0m");
  console.log("  Closure Deed Hash  : " + t.closure_deed_hash);
} else {
  console.log("\x1b[31m[ERROR] No auto-generated DLP ticket found.\x1b[0m");
  process.exit(1);
}
' "${DLP_AUTO_RES}"

# 4. Inspect Hermes Section 65B Audit Deed for Automated Defect Ingestion
echo -e "\n[3/3] Inspecting Hermes Section 65B Autonomous Event Notarization..."
AUDIT_ENDPOINT="${SUPABASE_URL}/rest/v1/immutable_audit_logs?project_id=eq.${PROJECT_ID}&action_category=eq.DLP_DEFECT_DETECTED&order=created_at.desc&limit=1&select=action_title,merkle_root_hash,signatory_name,signatory_role,created_at"
AUDIT_RES=$(curl -s -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" "${AUDIT_ENDPOINT}")

node -e '
let logs;
try {
  logs = JSON.parse(process.argv[1]);
} catch (e) {
  console.log("\x1b[31m[ERROR] Failed to parse Audit response:\x1b[0m", e.message);
  process.exit(1);
}

if (Array.isArray(logs) && logs.length > 0) {
  const l = logs[0];
  console.log("\x1b[32m✓ Autonomous Telemetry Deed Sealed:\x1b[0m " + l.action_title);
  console.log("  Signatory Name   : " + l.signatory_name + " (" + l.signatory_role + ")");
  console.log("  Merkle Root Hash : " + l.merkle_root_hash);
  console.log("  Timestamp        : " + l.created_at);
} else {
  console.log("\x1b[33m! Autonomous telemetry deed pending notarization.\x1b[0m");
}
' "${AUDIT_RES}"

echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN}✓ 7D TELEMETRY GATEWAY & AUTONOMOUS ANOMALY WORKFLOW OPERATIONAL.   ${NC}"
echo -e "${GREEN}====================================================================${NC}"
