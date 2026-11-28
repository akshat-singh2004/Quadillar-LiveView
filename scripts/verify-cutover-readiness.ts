import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { evaluateCutoverReadiness } from "../lib/server/cutoverReadiness";

// 1. Permanent build-resilience guard: app/layout.tsx must NEVER depend on external Google Fonts fetch
const layoutSrc = fs.readFileSync(path.resolve("app/layout.tsx"), "utf8");
assert.equal(
  layoutSrc.includes("next/font/google"),
  false,
  "app/layout.tsx must not import next/font/google (breaks offline/DNS-restricted builds)"
);
console.log("[PASS] Offline Build Guard -> app/layout.tsx has zero next/font/google external fetches");

// 2. Pilot hybrid mode (empty / demo defaults)
const hybrid = evaluateCutoverReadiness({});
assert.equal(hybrid.cutoverStage, "PILOT_HYBRID");
assert.equal(hybrid.offlineBuildHardened, true);
assert.ok(hybrid.readinessScorePct < 100);
assert.ok(hybrid.pendingCutoverActions.length >= 4);
console.log(
  `[PASS] Hybrid Pilot Posture -> stage=${hybrid.cutoverStage} | score=${hybrid.readinessScorePct}% | pending=${hybrid.pendingCutoverActions.length}`
);

// 3. Strict enterprise cutover mode + zero secret leakage
const fakeSecrets = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "svc-role-super-secret-token-999",
  REQUIRE_SUPABASE_AUTH: "true",
  DIRECTOR_ACTION_PIN: "948271",
  SITE_ENGINEER_PIN: "736194",
  AUDITOR_PIN: "529183",
  IOT_INGRESS_SECRET: "hmac-prod-secret-0xdeadbeef1234567890",
  GEMINI_API_KEY: "AIzaSySecretTestKeyDoNotLeak",
  GEMINI_GROUNDING_MODEL: "gemini-2.5-flash",
};
const strict = evaluateCutoverReadiness(fakeSecrets);
assert.equal(strict.cutoverStage, "STRICT_ENTERPRISE_READY");
assert.equal(strict.readinessScorePct, 100);
assert.equal(strict.pendingCutoverActions.length, 0);
assert.equal(strict.groundingModelPin, "gemini-2.5-flash");

const serialized = JSON.stringify(strict);
for (const secretVal of [
  fakeSecrets.SUPABASE_SERVICE_ROLE_KEY,
  fakeSecrets.DIRECTOR_ACTION_PIN,
  fakeSecrets.SITE_ENGINEER_PIN,
  fakeSecrets.AUDITOR_PIN,
  fakeSecrets.IOT_INGRESS_SECRET,
  fakeSecrets.GEMINI_API_KEY,
]) {
  assert.equal(
    serialized.includes(secretVal),
    false,
    `Secret value leaked in cutover readiness output: ${secretVal.slice(0, 6)}...`
  );
}
console.log(
  `[PASS] Strict Enterprise Posture -> stage=${strict.cutoverStage} | score=${strict.readinessScorePct}% | zero secret leaks verified`
);
