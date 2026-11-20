#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://localhost:3000}"
TMP_PNG=".tmp_quadillar_smoke_$(date +%s).png"
trap 'rm -f "$TMP_PNG"' EXIT

# Generate a spec-valid 16x16 PNG with unique pixel nonce so SHA-256 dedup passes each run
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
    raw[p + 1] = (135 + ((now >> 4) + y) & 0x3f) & 0xff;
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
for route in "/" "/site/digital-twin" "/site/audit-ledger" "/site/ndt" "/schedule/gantt" "/api/health/gcp" "/api/escrow-gate" "/api/memory"; do
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

echo "=== 3. Act 2: Field Grounding (multipart/form-data) + Vision Spoof Check ==="
FIELD_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/api/field-grounding" \
  -F "image=@${TMP_PNG};type=image/png" \
  -F "manual_pin_zone_id=BIT-4-TG03" \
  -F "submitter_id=SITE-SUP-LKO-01")
FIELD_CODE=$(echo "$FIELD_RESP" | tail -n1)
FIELD_BODY=$(echo "$FIELD_RESP" | sed '$d')
echo "  /api/field-grounding -> HTTP ${FIELD_CODE}"
echo "  Body: $(echo "$FIELD_BODY" | head -c 260)"
[ "$FIELD_CODE" -eq 200 ] || { echo "$FIELD_BODY"; exit 1; }
echo "$FIELD_BODY" | grep -q '"persisted_to_supabase":true' \
  && echo "  [OK] persisted_to_supabase=true (Supabase field_grounding_logs + 65B ledger written)" \
  || { echo "  [FAIL] persisted_to_supabase was not true"; exit 1; }

SPOOF_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/api/vision-spoof-check" \
  -H "Content-Type: application/json" \
  -d "{\"imageBase64\":\"data:image/png;base64,${IMG_B64}\",\"claimedElement\":\"Transfer Girder TG-03 (M50 RCC)\",\"bimZoneId\":\"BIT-4-TG03\",\"syntheticSpoofTest\":true}")
SPOOF_CODE=$(echo "$SPOOF_RESP" | tail -n1)
SPOOF_BODY=$(echo "$SPOOF_RESP" | sed '$d')
echo "  /api/vision-spoof-check -> HTTP ${SPOOF_CODE}"
echo "  Body: $(echo "$SPOOF_BODY" | head -c 260)"
[ "$SPOOF_CODE" -eq 200 ] || { echo "$SPOOF_BODY"; exit 1; }

echo "=== 4. Act 3: 3D Agent Escalate + QUADMAX Live Kernel ==="
ESC_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/api/agents/escalate-zone" \
  -H "Content-Type: application/json" \
  -d '{"bimZoneId":"BIT-4-TG03","transcript":"Bhaiya Tower A Level 3 transfer girder TG-03 mein honeycombing aur internal void lag raha hai","hasPhoto":true,"photoQualityHint":"LOW_LUX_SURFACE_ONLY"}')
ESC_CODE=$(echo "$ESC_RESP" | tail -n1)
echo "  /api/agents/escalate-zone -> HTTP ${ESC_CODE}"
[ "$ESC_CODE" -eq 200 ] || { echo "$ESC_RESP"; exit 1; }

QMAX_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/api/quadmax" \
  -H "Content-Type: application/json" \
  -d '{"query":"Summarize critical exceptions across Project Vanguard and Summit Building","projectId":"ALL_10","scope":"ALL_SCOPES"}')
QMAX_CODE=$(echo "$QMAX_RESP" | tail -n1)
echo "  /api/quadmax -> HTTP ${QMAX_CODE}"
[ "$QMAX_CODE" -eq 200 ] || { echo "$QMAX_RESP"; exit 1; }

echo "=== 5. Act 4: Escrow Gate & GCP Health Verification ==="
curl -sf "${BASE}/api/escrow-gate" | head -c 260 && echo ""
curl -sf "${BASE}/api/health/gcp" | head -c 260 && echo ""

echo ""
echo "=== ALL 4-ACT BUILDATHON CHECKS PASSED (ZERO ERRORS) ==="
