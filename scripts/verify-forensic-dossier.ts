import assert from "node:assert/strict";
import {
  DOSSIER_SCHEMA_VERSION,
  assembleForensicDossier,
  verifyForensicDossierIntegrity,
} from "../lib/domain/forensicDossier";
import { getPortfolioProjectBaseline } from "../lib/domain/portfolioRegistry";
import { evaluateMolecularGovernor } from "../lib/engines/molecularGovernor";
import {
  GENESIS_PREV_HASH,
  computeLedgerChainHash,
  type GovernorLedgerEvent,
} from "../lib/repositories/eventLedgerRepo";

function buildEvent(base: Omit<GovernorLedgerEvent, "chainHash">): GovernorLedgerEvent {
  return { ...base, chainHash: computeLedgerChainHash(base) };
}

const baseline = getPortfolioProjectBaseline("VANGUARD-LKO-01");
const snap = evaluateMolecularGovernor(baseline.input);

const ev1 = buildEvent({
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
  recordedAtUtc: "2026-11-27T06:00:00.000Z",
});

const ev2 = buildEvent({
  projectId: "VANGUARD-LKO-01",
  seq: 2,
  eventType: "VERNACULAR_GROUNDING",
  actor: "engineer@quadillar.in [SITE_ENGINEER • JWT]",
  source: "/api/field/ground",
  mode: "HOLD_422",
  httpStatus: 422,
  frozenInr: 327600,
  netReleaseInr: 0,
  violationCount: 5,
  diffJson: {
    challanNo: "CHLN-HINGLISH-422",
    ifcClass: "IfcBeam",
    bimGlobalId: "2O2Fr$t4X7Zf8NOew3FL9r",
    zoneId: "BIT-4-TG03",
    detectedLanguage: "hi-Latn",
    trustScorePct: 0,
    discrepancyCodes: ["GHOST_VOLUME_BILLING", "WATER_CEMENT_BREACH"],
    evidenceUrl: "https://cdn.supabase.co/storage/v1/object/public/field-evidence/vanguard.png",
  },
  snapshotHash: "a".repeat(64),
  prevHash: ev1.chainHash,
  recordedAtUtc: "2026-11-27T06:15:00.000Z",
});

const rawPackets = [
  // Matching site packet (snake_case from Supabase)
  {
    id: "EV-VG-01",
    project_id: "VANGUARD-LKO-01",
    zone_id: "BIT-4-TG03",
    bim_global_id: "2O2Fr$t4X7Zf8NOew3FL9r",
    sha256: "b".repeat(64),
    recorded_at_utc: "2026-11-27T06:15:00.000Z",
    note_text: "Challan photo for TG-03",
    media_storage_mode: "supabase_storage",
    media_url: "https://cdn.supabase.co/storage/v1/object/public/field-evidence/vanguard.png",
  },
  // Foreign site packet -> MUST be excluded by multi-site isolation
  {
    id: "EV-OTHER-99",
    project_id: "LKO-HAZRATGANJ-HERITAGE",
    zone_id: "HZ-Z01",
    bim_global_id: "OTHER-GID",
    sha256: "c".repeat(64),
    recorded_at_utc: "2026-11-27T06:20:00.000Z",
    note_text: "Foreign site evidence",
    media_storage_mode: "supabase_storage",
    media_url: "https://cdn.supabase.co/storage/v1/object/public/field-evidence/other.png",
  },
];

// 1. Intact Dossier Assembly & Determinism
const d1 = assembleForensicDossier({
  project: baseline.project,
  input: baseline.input,
  snapshot: snap,
  mode: baseline.mode,
  storageMode: "supabase",
  events: [ev1, ev2],
  rawEvidencePackets: rawPackets,
  generatedAtUtc: "2026-11-27T12:00:00.000Z",
});
const d2 = assembleForensicDossier({
  project: baseline.project,
  input: baseline.input,
  snapshot: snap,
  mode: baseline.mode,
  storageMode: "supabase",
  events: [ev2, ev1], // Out-of-order input must normalize identically
  rawEvidencePackets: rawPackets,
  generatedAtUtc: "2026-11-27T12:00:00.000Z",
});

assert.equal(d1.schemaVersion, DOSSIER_SCHEMA_VERSION);
assert.equal(d1.manifest.integrityStatus, "INTACT");
assert.equal(d1.manifest.dossierHash.length, 64);
assert.equal(d1.manifest.dossierHash, d2.manifest.dossierHash, "Manifest hash must be deterministic");
assert.equal(d1.evidenceVault.count, 1, "Multi-site isolation must exclude foreign site evidence");
assert.equal(d1.ifcGrounding.count, 1, "Vernacular IFC grounding record must be extracted");
assert.equal(d1.ifcGrounding.records[0].ifcClass, "IfcBeam");

const vIntact = verifyForensicDossierIntegrity(d1);
assert.equal(vIntact.valid, true);
assert.equal(vIntact.manifestHashMatches, true);
assert.equal(vIntact.chainValid, true);
console.log(
  `[PASS] Forensic Dossier Sealed -> ${d1.manifest.dossierHash.slice(0, 16)}... | ${d1.hashChain.totalEvents} events | ${d1.evidenceVault.count} isolated evidence | ${d1.ifcGrounding.count} IFC record`
);

// 2. Post-Export ₹1 JSON Tamper Detection
const postExportTampered = structuredClone(d1);
postExportTampered.hashChain.events[1].frozenInr += 1;
const vPostTamper = verifyForensicDossierIntegrity(postExportTampered);
assert.equal(vPostTamper.valid, false);
assert.equal(vPostTamper.manifestHashMatches, false);
assert.equal(vPostTamper.chainValid, false);
console.log("[PASS] Post-Export Tamper Catch -> ₹1 edit invalidated both manifest digest & hash-chain");

// 3. Pre-Assembly Compromised Chain Propagation
const brokenEv2 = { ...ev2, frozenInr: ev2.frozenInr + 1 };
const dCompromised = assembleForensicDossier({
  project: baseline.project,
  input: baseline.input,
  snapshot: snap,
  mode: baseline.mode,
  storageMode: "supabase",
  events: [ev1, brokenEv2],
  rawEvidencePackets: rawPackets,
  generatedAtUtc: "2026-11-27T12:00:00.000Z",
});
assert.equal(dCompromised.manifest.integrityStatus, "CHAIN_COMPROMISED");
const vComp = verifyForensicDossierIntegrity(dCompromised);
assert.equal(vComp.valid, false);
assert.equal(vComp.chainValid, false);
console.log("[PASS] Compromised Chain Propagation -> dossier flagged CHAIN_COMPROMISED & failed offline verifier");
