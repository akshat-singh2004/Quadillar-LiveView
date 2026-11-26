import assert from "node:assert/strict";
import {
  DEMO_DEFAULT_IOT_SECRET,
  evaluateHardwareBridge,
  extractWindMsFromWeatherPayload,
  signIotPayload,
  verifyIotDeviceAuth,
} from "../lib/domain/iotTelemetryBridge";

const NOW_MS = 1_764_000_000_000;
const NOW_SEC = Math.floor(NOW_MS / 1000);
const RAW = JSON.stringify({ deviceId: "WB-GATE-01", category: "WEIGHBRIDGE_ANPR" });

// 1. HMAC-SHA256 Auth + Tamper Rejection + Replay Window Guard
const validSig = signIotPayload(RAW, NOW_SEC, "prod-secret-xyz");
const okHmac = verifyIotDeviceAuth({
  rawBody: RAW,
  signatureHeader: `sha256=${validSig}`,
  timestampHeader: String(NOW_SEC),
  nowMs: NOW_MS,
  overrideSecret: "prod-secret-xyz",
});
assert.equal(okHmac.authorized, true);
assert.equal(okHmac.authScheme, "hmac_sha256");

const tamperedBody = verifyIotDeviceAuth({
  rawBody: RAW + " ",
  signatureHeader: validSig,
  timestampHeader: String(NOW_SEC),
  nowMs: NOW_MS,
  overrideSecret: "prod-secret-xyz",
});
assert.equal(tamperedBody.authorized, false, "Tampered payload must fail HMAC check");

const staleReplay = verifyIotDeviceAuth({
  rawBody: RAW,
  signatureHeader: signIotPayload(RAW, NOW_SEC - 600, "prod-secret-xyz"),
  timestampHeader: String(NOW_SEC - 600),
  nowMs: NOW_MS,
  overrideSecret: "prod-secret-xyz",
});
assert.equal(staleReplay.authorized, false, "Timestamp > 300s old must fail replay check");

const keyOk = verifyIotDeviceAuth({
  rawBody: RAW,
  gatewayKeyHeader: DEMO_DEFAULT_IOT_SECRET,
  overrideSecret: "",
});
assert.equal(keyOk.authorized, true);
assert.equal(keyOk.authScheme, "gateway_key");
console.log("[PASS] IoT HMAC-SHA256 & Replay Guard -> valid sig accepted, tampered body & 10-min replay blocked");

// 2. Crane LMI IS 875 Wind Lockout
const crane = evaluateHardwareBridge("CRANE_LMI", "VANGUARD-LKO-01", "TC-01", {
  windSpeedMs: 19.4,
  swlLoadPct: 72,
});
assert.ok(crane && crane.interlockTripped === true);
assert.equal(crane?.governorPatch?.windSpeedMs, 19.4);
console.log("[PASS] Crane LMI Interlock -> 19.4 m/s wind trips IS 875 crane lockout & patches Governor");

// 3. Weighbridge ANPR -> 5-Way Triangulation Ghost Volume Catch
const wb = evaluateHardwareBridge("WEIGHBRIDGE_ANPR", "VANGUARD-LKO-01", "WB-GATE-01", {
  challanNo: "CHLN-IOT-901",
  challanVolumeM3: 42.0,
  weighbridgeNetKg: 90720, // 37.8 m3 -> 4.2 m3 ghost billing
  inSituEstimatedMpa: 36.4,
});
assert.ok(wb && wb.interlockTripped === true);
assert.equal(wb?.triangulationReport?.httpStatus, 422);
console.log(
  `[PASS] Weighbridge ANPR Bridge -> Ghost volume caught (HTTP 422, Hold ₹${wb?.triangulationReport?.recommendedEscrowHoldInr.toLocaleString("en-IN")})`
);

// 4. Weather Anemometer km/h -> m/s conversion
assert.equal(extractWindMsFromWeatherPayload({ windSpeedKmh: 72 }), 20);
console.log("[PASS] Weather Anemometer Conversion -> 72 km/h normalized to 20 m/s");
