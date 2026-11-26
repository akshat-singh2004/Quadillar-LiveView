import assert from "node:assert/strict";
import {
  computePortfolioRollup,
  getPortfolioProjectBaseline,
  listPortfolioProjects,
  resolvePortfolioProject,
} from "../lib/domain/portfolioRegistry";
import { evaluateMolecularGovernor } from "../lib/engines/molecularGovernor";
import {
  DEMO_DEFAULT_IOT_SECRET,
  HARDWARE_PROBE_CATALOG,
  buildHardwareProbePayload,
  signIotPayload,
  verifyIotDeviceAuth,
} from "../lib/domain/iotTelemetryBridge";

// 1. Canonical Vanguard Alias Fix Verification
const resolvedVanguard = resolvePortfolioProject("VANGUARD-LKO-01");
assert.equal(resolvedVanguard.projectId, "VANGUARD-LKO-01");
assert.equal(
  resolvedVanguard.name,
  "Project Vanguard Commercial Hub",
  "VANGUARD-LKO-01 must resolve to Project Vanguard Commercial Hub (not ad-hoc fallback)"
);
console.log("[PASS] Vanguard Alias Fix -> VANGUARD-LKO-01 resolves to 'Project Vanguard Commercial Hub'");

// 2. 10-Site Portfolio Rollup Math
const roster = listPortfolioProjects();
assert.equal(roster.length, 10, "Expected 10 portfolio projects");
assert.equal(roster[0].projectId, "VANGUARD-LKO-01", "Roster index 0 must align with VANGUARD-LKO-01");

const rollup = computePortfolioRollup(
  roster.map((item) => {
    const base = getPortfolioProjectBaseline(item.projectId);
    return {
      project: base.project,
      snapshot: evaluateMolecularGovernor(base.input),
      storageMode: "supabase",
    };
  })
);

assert.equal(rollup.totalSites, 10);
assert.ok(rollup.totalContractValueCr > 100, "Fleet contract value must exceed 100 Cr");
assert.ok(rollup.totalFrozenInr > 0, "Fleet frozen escrow must be positive");
assert.ok(rollup.lockedEscrowSites >= 1, "At least 1 site must be HTTP 422 locked");
assert.ok(rollup.nominalSites >= 1, "At least 1 site must be nominal");
assert.equal(
  rollup.lockedEscrowSites + rollup.ptwWarningSites + rollup.nominalSites,
  10,
  "Site buckets must sum to 10"
);
console.log(
  `[PASS] 10-Site Portfolio Rollup -> ₹${rollup.totalContractValueCr} Cr | Frozen ₹${rollup.totalFrozenInr.toLocaleString("en-IN")} | ${rollup.lockedEscrowSites} locked, ${rollup.ptwWarningSites} PTW, ${rollup.nominalSites} nominal`
);

// 3. Hardware Probe Builders + Server-Side HMAC Roundtrip
assert.equal(HARDWARE_PROBE_CATALOG.length, 4, "Expected 4 hardware probe presets");
const nowSec = Math.floor(Date.now() / 1000);
for (const meta of HARDWARE_PROBE_CATALOG) {
  const payload = buildHardwareProbePayload(meta.probeType, "VANGUARD-LKO-01");
  const raw = JSON.stringify(payload);
  const sig = signIotPayload(raw, nowSec, DEMO_DEFAULT_IOT_SECRET);
  const check = verifyIotDeviceAuth({
    rawBody: raw,
    signatureHeader: `sha256=${sig}`,
    timestampHeader: String(nowSec),
    nowMs: nowSec * 1000,
    overrideSecret: DEMO_DEFAULT_IOT_SECRET,
  });
  assert.equal(check.authorized, true, `Signed probe ${meta.probeType} must pass HMAC verification`);
}
console.log("[PASS] Hardware Probe Presets -> all 4 presets build & pass HMAC-SHA256 verification");
