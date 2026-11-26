import assert from "node:assert/strict";
import {
  VANGUARD_CLEAN_POUR_FIXTURE,
  VANGUARD_FRAUD_FIXTURE,
  evaluateFiveWayTriangulation,
} from "../lib/domain/triangulationEngine";
import {
  GENESIS_PREV_HASH,
  computeLedgerChainHash,
  verifyEventChain,
  type GovernorLedgerEvent,
} from "../lib/repositories/eventLedgerRepo";

// 1. Fraud / Dilution 5-Way Triangulation Detection
const fraud = evaluateFiveWayTriangulation(VANGUARD_FRAUD_FIXTURE);
assert.equal(fraud.verdict, "FRAUD_OR_DILUTION_LOCK_422");
assert.equal(fraud.httpStatus, 422);
const codes = fraud.discrepancies.map((d) => d.code);
assert.ok(codes.includes("GHOST_VOLUME_BILLING"), "Must catch ghost volume billing");
assert.ok(codes.includes("GRADE_DILUTION_FRAUD"), "Must catch M50 -> M35 grade dilution");
assert.ok(codes.includes("CEMENT_SHORTAGE_CLAUSE42"), "Must catch CPWD Clause 42 cement shortage");
assert.equal(fraud.recommendedClause42PenaltyInr, 47040, "56 missing bags * 2 * ₹420 must equal ₹47,040");
console.log(
  `[PASS] 5-Way Fraud Triangulation -> ${fraud.discrepancies.length} flags (${codes.join(", ")}) | Hold: ₹${fraud.recommendedEscrowHoldInr.toLocaleString("en-IN")} | Cl.42: ₹${fraud.recommendedClause42PenaltyInr.toLocaleString("en-IN")}`
);

// 2. Clean Pour Verification
const clean = evaluateFiveWayTriangulation(VANGUARD_CLEAN_POUR_FIXTURE);
assert.equal(clean.verdict, "VERIFIED_CONSISTENT");
assert.equal(clean.httpStatus, 200);
assert.equal(clean.trustScorePct, 100);
assert.equal(clean.discrepancies.length, 0);
console.log(
  `[PASS] 5-Way Clean Pour -> Trust: ${clean.trustScorePct}% | HTTP ${clean.httpStatus} | 0 discrepancies`
);

// 3. Cryptographic Append-Only Hash Chain & 1-Rupee Tamper Detection
function makeEvent(
  seq: number,
  prevHash: string,
  frozenInr: number
): GovernorLedgerEvent {
  const base = {
    projectId: "VANGUARD-LKO-01",
    seq,
    eventType: seq === 1 ? ("GENESIS" as const) : ("STATE_MUTATION" as const),
    actor: "test-director",
    source: "unit-test",
    mode: frozenInr > 0 ? "stress-test" : "compliant",
    httpStatus: frozenInr > 0 ? 422 : 200,
    frozenInr,
    netReleaseInr: 24010000 - frozenInr,
    violationCount: frozenInr > 0 ? 8 : 0,
    diffJson: { seq, frozenInr },
    snapshotHash: "a".repeat(64),
    prevHash,
    recordedAtUtc: `2026-11-26T07:0${seq}:00.000Z`,
  };
  return { ...base, chainHash: computeLedgerChainHash(base) };
}

const e1 = makeEvent(1, GENESIS_PREV_HASH, 6200000);
const e2 = makeEvent(2, e1.chainHash, 450000);
const e3 = makeEvent(3, e2.chainHash, 0);

const validCheck = verifyEventChain("VANGUARD-LKO-01", [e1, e2, e3]);
assert.equal(validCheck.valid, true, "Intact 3-event hash chain must verify valid");
assert.equal(validCheck.checkedEvents, 3);

// Tamper with ₹1 in event #2
const tampered = [{ ...e1 }, { ...e2, frozenInr: e2.frozenInr - 1 }, { ...e3 }];
const tamperCheck = verifyEventChain("VANGUARD-LKO-01", tampered);
assert.equal(tamperCheck.valid, false, "Tampered chain must fail verification");
assert.equal(tamperCheck.tamperedSeq, 2, "Must pinpoint exact tampered seq #2");
console.log(
  `[PASS] Immutable Event Hash-Chain -> 3/3 intact verified | ₹1 edit caught at seq #${tamperCheck.tamperedSeq}`
);
