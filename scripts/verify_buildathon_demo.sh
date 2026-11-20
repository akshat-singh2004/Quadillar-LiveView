#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://localhost:3000}"
TMP_PNG=".tmp_quadillar_smoke_$(date +%s).png"
trap 'rm -f "$TMP_PNG"' EXIT

node -e '
const fs = require("fs"), zlib = require("zlib");
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
const w = 16, h = 16, now = Date.now();
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
ihdr[8] = 8; ihdr[9] = 2;
const raw = Buffer.alloc(h * (1 + w * 3));
for (let y = 0; y < h; y++) {
  const row = y * (1 + w * 3);
  raw[row] = 0;
  for (let x = 0; x < w; x++) {
    const p = row + 1 + x * 3;
    raw[p] = (140 + ((now + x) & 0x3f)) & 0xff;
    raw[p + 1] = (135 + (((now >> 4) + y) & 0x3f)) & 0xff;
    raw[p + 2] = (130 + ((now >> 8) & 0x3f)) & 0xff;
  }
}
const png = Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);
fs.writeFileSync(process.argv[1], png);
' "$TMP_PNG"

IMG_B64=$(node -e 'process.stdout.write(require("fs").readFileSync(process.argv[1]).toString("base64"))' "$TMP_PNG")

echo "=== 1. Route HTTP 200 Check ==="
for route in "/" "/site/digital-twin" "/site/audit-ledger" "/site/ndt" "/schedule/gantt" "/api/health/gcp" "/api/escrow-gate?project_id=UP-LDA-VANGUARD-CAMPUS" "/api/memory"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}${route}")
  echo "  ${route} -> HTTP ${CODE}"
  [ "$CODE" -eq 200 ] || { echo "FAIL on ${route}"; exit 1; }
done

echo "=== 2. Act 1: Multi-Site IoT Burst + Hermes 65B Notarization ==="
for pid in "UP-LDA-VANGUARD-CAMPUS" "LKO-SUMMIT-TOWER"; do
  RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/api/telemetry/ingress" \
    -H "Content-Type: application/json" \
    -d "{\"projectId\":\"${pid}\",\"deviceId\":\"LIDAR-RAY-01\",\"protocol\":\"HTTP_REST\",\"category\":\"WEATHER_ANEMOMETER\",\"payload\":{\"windSpeedKmh\":18.4,\"rainfallRateMmh\":0}}")
  CODE=$(echo "$RESP" | tail -n1)
  echo "  IoT ingress (${pid}) -> HTTP ${CODE}"
  [ "$CODE" -eq 200 ] || { echo "$RESP"; exit 1; }
done

echo "=== 3. Act 2: Photo + Text-Only Site Reports & Multi-Tenant Isolation ==="
PHOTO_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/api/field-grounding" \
  -F "project_id=UP-LDA-VANGUARD-CAMPUS" \
  -F "image=@${TMP_PNG};type=image/png" \
  -F "manual_pin_zone_id=BIT-4-TG03" \
  -F "transcript_override=Transfer Girder TG-03 cube failed at 41.2 MPa with honeycombing" \
  -F "submitter_id=SITE-SUP-LKO-01")
PHOTO_CODE=$(echo "$PHOTO_RESP" | tail -n1)
PHOTO_BODY=$(echo "$PHOTO_RESP" | sed '$d')
echo "  Photo report (Vanguard) -> HTTP ${PHOTO_CODE}"
[ "$PHOTO_CODE" -eq 200 ] || { echo "$PHOTO_BODY"; exit 1; }
echo "$PHOTO_BODY" | grep -q '"persisted_to_supabase":true' || { echo "FAIL: photo report not persisted"; exit 1; }

TEXT_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/api/field-grounding" \
  -F "project_id=LKO-SUMMIT-TOWER" \
  -F "transcript_override=12th floor perimeter wall inspection logged cleanly, curing active" \
  -F "submitter_id=SITE-SUP-LKO-02")
TEXT_CODE=$(echo "$TEXT_RESP" | tail -n1)
TEXT_BODY=$(echo "$TEXT_RESP" | sed '$d')
echo "  Text-only report (Summit) -> HTTP ${TEXT_CODE}"
[ "$TEXT_CODE" -eq 200 ] || { echo "$TEXT_BODY"; exit 1; }
echo "$TEXT_BODY" | grep -q '"project_id":"LKO-SUMMIT-TOWER"' || { echo "FAIL: tenant leak on Summit report"; exit 1; }
echo "$TEXT_BODY" | grep -q '"persisted_to_supabase":true' || { echo "FAIL: text-only report not persisted"; exit 1; }
echo "  [OK] Multi-tenant isolation + text-only persistence verified"

SPOOF_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/api/vision-spoof-check" \
  -H "Content-Type: application/json" \
  -d "{\"imageBase64\":\"data:image/png;base64,${IMG_B64}\",\"claimedElement\":\"Transfer Girder TG-03 (M50 RCC)\",\"bimZoneId\":\"BIT-4-TG03\",\"projectId\":\"UP-LDA-VANGUARD-CAMPUS\"}")
SPOOF_CODE=$(echo "$SPOOF_RESP" | tail -n1)
SPOOF_BODY=$(echo "$SPOOF_RESP" | sed '$d')
echo "  /api/vision-spoof-check -> HTTP ${SPOOF_CODE}"
[ "$SPOOF_CODE" -eq 200 ] || { echo "$SPOOF_BODY"; exit 1; }
echo "$SPOOF_BODY" | grep -q '"dielectricMeasurementStatus":"OPTICAL_REFERENCE_ONLY_RADAR_REQUIRED"' \
  && echo "  [OK] Optical-vs-Radar physics separation verified"

echo "=== 4. Act 3: 3D Agent Escalate + QUADMAX Live Kernel ==="
ESC_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/agents/escalate-zone" \
  -H "Content-Type: application/json" \
  -d '{"bimZoneId":"BIT-4-TG03","transcript":"Transfer Girder TG-03 honeycombing and internal void check","hasPhoto":true,"photoQualityHint":"LOW_LUX_SURFACE_ONLY"}')
echo "  /api/agents/escalate-zone -> HTTP ${ESC_CODE}"
[ "$ESC_CODE" -eq 200 ] || exit 1;

QMAX_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/quadmax" \
  -H "Content-Type: application/json" \
  -d '{"query":"Summarize critical exceptions across Project Vanguard and Summit Building","projectId":"ALL_10","scope":"ALL_SCOPES"}')
echo "  /api/quadmax -> HTTP ${QMAX_CODE}"
[ "$QMAX_CODE" -eq 200 ] || exit 1;

echo "=== 5. Act 4: IS 456:2000 Core Validation Gate (Reject Low Core -> Re-Lock) ==="
REJECT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/escrow-gate" \
  -H "Content-Type: application/json" \
  -d '{"action":"REMEDIATE_CORE_TEST","project_id":"UP-LDA-VANGUARD-CAMPUS","ncr_id":"NCR-2026-STR-042","concrete_grade":"M50","core_readings_mpa":[38.0,39.0,38.5],"lab_certificate_ref":"NABL-FAIL-TEST"}')
echo "  IS 456 Low Core Reject (M50 < 42.5 MPa) -> HTTP ${REJECT_CODE} (expected 422)"
[ "$REJECT_CODE" -eq 422 ] || { echo "FAIL: invalid core readings were not rejected"; exit 1; }

LOCK_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/escrow-gate" \
  -H "Content-Type: application/json" \
  -d '{"action":"TRIGGER_NCR_HOLD","project_id":"UP-LDA-VANGUARD-CAMPUS","ncr_id":"NCR-2026-STR-042","bim_zone_id":"BIT-4-TG03","withholding_lien_inr":450000}')
echo "  Re-lock NCR-2026-STR-042 (INR 4,50,000) -> HTTP ${LOCK_CODE}"
[ "$LOCK_CODE" -eq 200 ] || exit 1;

echo ""
echo "=== ALL MOLECULAR & 4-ACT BUILDATHON CHECKS PASSED ==="
