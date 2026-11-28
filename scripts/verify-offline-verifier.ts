import assert from "node:assert/strict";
import { assembleForensicDossier } from "../lib/domain/forensicDossier";
import {
  sha256Utf8Hex,
  verifyDossierJsonOffline,
} from "../lib/domain/offlineDossierVerifier";
import { getPortfolioProjectBaseline } from "../lib/domain/portfolioRegistry";
import { evaluateMolecularGovernor } from "../lib/engines/molecularGovernor";
import {
  GENESIS_PREV_HASH,
  computeLedgerChainHash,
  type GovernorLedgerEvent,
} from "../lib/repositories/eventLedgerRepo";

function makeEvent(base: Omit<GovernorLedgerEvent, "chainHash">): GovernorLedgerEvent {
  return { ...base, chainHash: computeLedgerChainHash(base) };
}

async function run() {
  // 1. Verify FIPS 180-4 SHA-256 known test vector ("abc")
  const abc = await sha256Utf8Hex("abc");
  assert.equal(
    abc.hex,
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    "SHA-256('abc') must match FIPS 180-4 vector"
  );

  // 2. Build a real server-assembled dossier using node:crypto
  const baseline = getPortfolioProjectBaseline("VANGUARD-LKO-01");
  const snap = evaluateMolecularGovernor(baseline.input);

  const ev1 = makeEvent({
    projectId: "VANGUARD-LKO-01",
    seq: 1,
    eventType: "GENESIS",
    actor: "molecular-governor-kernel",
    source: "bootstrap",
    mode: "stress-test",
    httpStatus: snap.escrow.httpStatus,
    frozenInr: snap.escrow.frozenInr,
    netReleaseInr: snap.escrow.netCertifiedReleaseInr,
    violationCount: snap.violations.length,
    diffJson: { zoneId: baseline.input.zoneId },
    snapshotHash: snap.bsaSec63Ledger.rowHash,
    prevHash: GENESIS_PREV_HASH,
    recordedAtUtc: "2026-11-28T05:00:00.000Z",
  });

  const ev2 = makeEvent({
    projectId: "VANGUARD-LKO-01",
    seq: 2,
    eventType: "KINETIC_ACTION",
    actor: "director@quadillar.in [DIRECTOR • JWT]",
    source: "/api/actions/execute",
    mode: "stress-test",
    httpStatus: 422,
    frozenInr: 6200000,
    netReleaseInr: 17900880,
    violationCount: 8,
    diffJson: { actionType: "FREEZE_RA_BILL_422", rationale: "Audit lock" },
    snapshotHash: snap.bsaSec63Ledger.rowHash,
    prevHash: ev1.chainHash,
    recordedAtUtc: "2026-11-28T05:10:00.000Z",
  });

  const dossier = assembleForensicDossier({
    project: baseline.project,
    input: baseline.input,
    snapshot: snap,
    mode: baseline.mode,
    storageMode: "supabase",
    events: [ev1, ev2],
    rawEvidencePackets: [],
    generatedAtUtc: "2026-11-28T05:30:00.000Z",
  });

  // 3. Verify bit-for-bit parity via zero-server offline verifier
  const jsonText = JSON.stringify(dossier, null, 2);
  const intactReport = await verifyDossierJsonOffline(jsonText);
  assert.equal(intactReport.valid, true);
  assert.equal(intactReport.verdict, "CRYPTOGRAPHICALLY_INTACT");
  assert.equal(intactReport.manifestCheck.matches, true);
  assert.equal(intactReport.manifestCheck.recomputedHash, dossier.manifest.dossierHash);
  assert.equal(intactReport.chainCheck.valid, true);
  assert.equal(intactReport.chainCheck.passedBlocks, 2);
  assert.equal(intactReport.rawFileSha256?.length, 64);
  console.log(
    `[PASS] Offline Web-Crypto Parity -> engine=${intactReport.cryptoEngine} | manifest=${intactReport.manifestCheck.recomputedHash?.slice(0, 16)}... | 2/2 blocks INTACT`
  );

  // 4. Verify +₹1 local tamper triggers both manifest & seq #2 failure
  const tampered = structuredClone(dossier);
  tampered.hashChain.events[1].frozenInr += 1;
  const tamperReport = await verifyDossierJsonOffline(JSON.stringify(tampered));
  assert.equal(tamperReport.valid, false);
  assert.equal(tamperReport.verdict, "TAMPER_OR_CORRUPTION_DETECTED");
  assert.equal(tamperReport.manifestCheck.matches, false);
  assert.equal(tamperReport.chainCheck.valid, false);
  assert.equal(tamperReport.chainCheck.firstTamperedSeq, 2);
  console.log("[PASS] Offline +₹1 Tamper Catch -> flagged manifest mismatch & broken seq #2");

  // 5. Verify malformed JSON & wrong schema fail cleanly
  const badJson = await verifyDossierJsonOffline("{broken-json");
  assert.equal(badJson.valid, false);
  assert.equal(badJson.verdict, "INVALID_DOSSIER_FORMAT");

  const wrongSchema = await verifyDossierJsonOffline(JSON.stringify({ schemaVersion: "OTHER", foo: 1 }));
  assert.equal(wrongSchema.valid, false);
  assert.equal(wrongSchema.verdict, "INVALID_DOSSIER_FORMAT");
  console.log("[PASS] Offline Malformed Input Guard -> rejected corrupt JSON & foreign schema cleanly");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
