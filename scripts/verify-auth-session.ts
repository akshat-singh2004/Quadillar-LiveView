import assert from "node:assert/strict";
import {
  evaluateSessionPolicy,
  extractBearerToken,
  resolveRoleFromJwtClaims,
} from "../lib/server/authSession";

// 1. Bearer token parsing
const reqBearer = new Request("https://quadillar-live-view.vercel.app/api/auth/session", {
  headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig" },
});
assert.equal(extractBearerToken(reqBearer), "eyJhbGciOiJIUzI1NiJ9.payload.sig");

const reqNoAuth = new Request("https://quadillar-live-view.vercel.app/api/auth/session");
assert.equal(extractBearerToken(reqNoAuth), null);
console.log("[PASS] Bearer Token Extractor -> parses Bearer JWT & handles absent header");

// 2. Role resolution precedence & anti-escalation (user_metadata must NEVER grant privileges)
const appMetaDir = resolveRoleFromJwtClaims({
  id: "usr-1",
  email: "akshat@quadillar.in",
  app_metadata: { role: "DIRECTOR" },
  user_metadata: { role: "AUDITOR" },
});
assert.equal(appMetaDir.role, "DIRECTOR");
assert.equal(appMetaDir.roleSource, "jwt_app_metadata");

const clientSpoofAttempt = resolveRoleFromJwtClaims(
  {
    id: "usr-2",
    email: "random@external.com",
    app_metadata: {},
    user_metadata: { role: "DIRECTOR" }, // Client-mutable field -> MUST BE IGNORED
  },
  { directorEmails: "ceo@quadillar.in", siteEngineerEmails: "field@quadillar.in" }
);
assert.equal(clientSpoofAttempt.role, "AUDITOR", "Client-mutable user_metadata.role must never escalate");
assert.equal(clientSpoofAttempt.roleSource, "jwt_default_least_privilege");

const allowlistEng = resolveRoleFromJwtClaims(
  {
    id: "usr-3",
    email: "field@quadillar.in",
    app_metadata: {},
  },
  { directorEmails: "ceo@quadillar.in", siteEngineerEmails: "field@quadillar.in" }
);
assert.equal(allowlistEng.role, "SITE_ENGINEER");
assert.equal(allowlistEng.roleSource, "email_allowlist");
console.log("[PASS] JWT Claim Resolver -> app_metadata trusted, user_metadata spoof ignored, least-privilege AUDITOR default");

// 3. Session policy matrix (fail-closed on forged tokens, strict mode, anti-header-spoofing)
const forgedToken = evaluateSessionPolicy({
  bearerToken: "forged.jwt.token",
  verifiedUser: null,
  verificationFailed: true,
  fallbackRole: "DIRECTOR",
  strictAuthRequired: false,
});
assert.equal(forgedToken.ok, false);
if (!forgedToken.ok) {
  assert.equal(forgedToken.httpStatus, 401);
  assert.equal(forgedToken.code, "INVALID_JWT_SESSION");
}

const strictMissing = evaluateSessionPolicy({
  bearerToken: null,
  verifiedUser: null,
  verificationFailed: false,
  fallbackRole: "DIRECTOR",
  strictAuthRequired: true,
});
assert.equal(strictMissing.ok, false);
if (!strictMissing.ok) {
  assert.equal(strictMissing.httpStatus, 401);
  assert.equal(strictMissing.code, "SUPABASE_AUTH_REQUIRED");
}

const auditorHeaderSpoof = evaluateSessionPolicy({
  bearerToken: "valid.auditor.jwt",
  verifiedUser: { id: "usr-aud", email: "audit@firm.in", app_metadata: { role: "AUDITOR" } },
  verificationFailed: false,
  fallbackRole: "DIRECTOR", // Spoofed header MUST be ignored when JWT is present
  strictAuthRequired: false,
});
assert.equal(auditorHeaderSpoof.ok, true);
if (auditorHeaderSpoof.ok) {
  assert.equal(auditorHeaderSpoof.role, "AUDITOR", "Verified JWT role must override spoofed role header");
  assert.equal(auditorHeaderSpoof.authSource, "supabase_jwt");
}

const hybridFallback = evaluateSessionPolicy({
  bearerToken: null,
  verifiedUser: null,
  verificationFailed: false,
  fallbackRole: "SITE_ENGINEER",
  strictAuthRequired: false,
});
assert.equal(hybridFallback.ok, true);
if (hybridFallback.ok) {
  assert.equal(hybridFallback.role, "SITE_ENGINEER");
  assert.equal(hybridFallback.authSource, "demo_pin_header");
}

console.log("[PASS] Session Policy Matrix -> forged JWT 401, strict-mode 401, JWT anti-spoofing & hybrid fallback verified");
