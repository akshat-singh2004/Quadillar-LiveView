import assert from "node:assert/strict";
import {
  DEMO_DEFAULT_DIRECTOR_PIN,
  checkRateLimit,
  extractClientIp,
  resetMemoryRateLimitsForTests,
  verifyDirectorPin,
} from "../lib/server/securityGuard";

async function main() {
  // 1. Timing-safe Director PIN verification (Demo default + Production env override)
  const emptyCheck = verifyDirectorPin("", "");
  assert.equal(emptyCheck.authorized, false, "Empty PIN must fail closed");

  const wrongCheck = verifyDirectorPin("0000", "987654");
  assert.equal(wrongCheck.authorized, false, "Wrong PIN must fail closed");
  assert.equal(wrongCheck.pinMode, "production_env");

  const prodOk = verifyDirectorPin("987654", "987654");
  assert.equal(prodOk.authorized, true, "Exact production PIN must succeed");
  assert.equal(prodOk.pinMode, "production_env");

  const demoOk = verifyDirectorPin(DEMO_DEFAULT_DIRECTOR_PIN, "");
  assert.equal(demoOk.authorized, true, "Demo default PIN must succeed when env unset");
  assert.equal(demoOk.pinMode, "demo_default");
  console.log("[PASS] Timing-safe Director PIN Guard -> rejects empty/wrong, accepts exact match");

  // 2. Per-IP Sliding-Window Rate Limiter
  resetMemoryRateLimitsForTests();
  const policy = { bucket: "test_bucket", limit: 3, windowSec: 60 };
  const t0 = 1_700_000_000_000;

  const r1 = await checkRateLimit("203.0.113.10", policy, t0);
  const r2 = await checkRateLimit("203.0.113.10", policy, t0 + 100);
  const r3 = await checkRateLimit("203.0.113.10", policy, t0 + 200);
  const r4 = await checkRateLimit("203.0.113.10", policy, t0 + 300);

  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 2);
  assert.equal(r2.allowed, true);
  assert.equal(r3.allowed, true);
  assert.equal(r3.remaining, 0);
  assert.equal(r4.allowed, false, "4th call inside window must be blocked with 429");
  assert.ok(r4.retryAfterSec >= 59, "Retry-After must reflect remaining window");

  // Different IP must stay isolated
  const otherIp = await checkRateLimit("198.51.100.7", policy, t0 + 300);
  assert.equal(otherIp.allowed, true, "Different client IP must have isolated bucket");

  // Window expiry must restore quota
  const afterReset = await checkRateLimit("203.0.113.10", policy, t0 + 61_000);
  assert.equal(afterReset.allowed, true, "Expired sliding window must reopen quota");
  console.log("[PASS] Per-IP Sliding-Window Rate Limiter -> 3 allowed, 4th blocked (429), IP isolation & window reset verified");

  // 3. Multi-hop X-Forwarded-For IP Extraction
  const fakeReq = new Request("https://quadillar-live-view.vercel.app/api/mcp", {
    headers: { "x-forwarded-for": "103.21.58.44, 10.0.0.1" },
  });
  assert.equal(extractClientIp(fakeReq), "103.21.58.44");
  console.log("[PASS] Client IP Extraction -> multi-hop x-forwarded-for parsed cleanly");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
