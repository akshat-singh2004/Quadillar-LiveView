import assert from "node:assert/strict";
import {
  COMPLIANT_TG03_FIXTURE,
  EXTREME_TG03_FIXTURE,
  evaluateMolecularGovernor,
} from "../lib/engines/molecularGovernor";

// Test A: Extreme TG-03 Failure Cascade (8 simultaneous breaches)
const failSnap = evaluateMolecularGovernor(EXTREME_TG03_FIXTURE);
assert.equal(failSnap.violations.length, 8, `Expected 8 violations, got ${failSnap.violations.length}`);
assert.equal(failSnap.bimStatusMap["TG-03"], "RED");
assert.equal(failSnap.bimStatusMap["SLAB-Z1"], "GREEN");
assert.equal(failSnap.permits.strippingPtwAllowed, false);
assert.equal(failSnap.permits.craneLiftPtwAllowed, false);
assert.equal(failSnap.escrow.decision, "PARTIAL_HOLD_422");
assert.equal(failSnap.escrow.httpStatus, 422);
assert.equal(failSnap.escrow.frozenInr, 6200000);
assert.equal(failSnap.escrow.eligibleGrossInr, 18300000);
assert.equal(failSnap.escrow.clause42PenaltyInr, 33120);
assert.equal(failSnap.escrow.netCertifiedReleaseInr, 17900880);
assert.equal(failSnap.evm.verifiedSpi, 0.704);
assert.equal(failSnap.evm.verifiedCpi, 0.738);
assert.equal(failSnap.windSafety.factorOfSafety, 1.28);
assert.equal(failSnap.bsaSec63Ledger.rowHash.length, 64);

// Test B: Rectified Compliant State (Zero breaches, full release)
const passSnap = evaluateMolecularGovernor(COMPLIANT_TG03_FIXTURE);
assert.equal(passSnap.violations.length, 0, `Expected 0 violations, got ${passSnap.violations.length}`);
assert.equal(passSnap.bimStatusMap["TG-03"], "GREEN");
assert.equal(passSnap.permits.strippingPtwAllowed, true);
assert.equal(passSnap.permits.craneLiftPtwAllowed, true);
assert.equal(passSnap.escrow.decision, "CLEARED");
assert.equal(passSnap.escrow.httpStatus, 200);
assert.equal(passSnap.escrow.frozenInr, 0);
assert.equal(passSnap.escrow.clause42PenaltyInr, 0);
assert.equal(passSnap.escrow.netCertifiedReleaseInr, 24010000);

console.log("[PASS] Extreme TG-03 Cascade -> 8/8 violations caught | Frozen: ₹62,00,000 | Clause 42 Penalty: ₹33,120 | Net RTGS: ₹1,79,00,880");
console.log("[PASS] Rectified TG-03 State -> 0 violations | BIM: GREEN | PTWs: UNLOCKED | Net RTGS: ₹2,40,10,000");
console.log("[PASS] BSA Section 63 Hash   ->", failSnap.bsaSec63Ledger.rowHash);
