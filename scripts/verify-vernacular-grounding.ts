import assert from "node:assert/strict";
import {
  VERNACULAR_FIELD_PRESETS,
  evaluateVernacularGrounding,
  extractGroundTruthDeterministic,
  resolveBimZoneBinding,
} from "../lib/domain/vernacularGroundingEngine";

// 1. Hinglish Fraud Pour -> IfcBeam + BIT-4-TG03 + HTTP 422
const hinglishPreset = VERNACULAR_FIELD_PRESETS.find((p) => p.presetId === "HINGLISH_FRAUD_POUR")!;
const ext1 = extractGroundTruthDeterministic(hinglishPreset.transcript);
const res1 = evaluateVernacularGrounding({
  projectId: "VANGUARD-LKO-01",
  extraction: ext1,
  extractorMode: "deterministic_vernacular_fallback",
  modelUsed: "deterministic-regex-ifc-v1",
});

assert.equal(ext1.detectedLanguage, "hi-Latn");
assert.equal(res1.ifcRecord.ifcClass, "IfcBeam");
assert.equal(res1.ifcRecord.zoneId, "BIT-4-TG03");
assert.equal(res1.triangulation.httpStatus, 422);
assert.ok(res1.ifcRecord.discrepancyCodes.includes("GHOST_VOLUME_BILLING"));
assert.ok(res1.ifcRecord.discrepancyCodes.includes("WATER_CEMENT_BREACH"));
assert.ok(res1.ifcRecord.discrepancyCodes.includes("GRADE_DILUTION_FRAUD"));
console.log(
  `[PASS] Hinglish Fraud Grounding -> ${res1.ifcRecord.ifcClass} (${res1.ifcRecord.zoneId}) | HTTP 422 | Flags: ${res1.ifcRecord.discrepancyCodes.join(", ")}`
);

// 2. Hindi Devanagari Cement Shortage -> IfcFooting + RAFT-FND-01 + HTTP 422
const hindiPreset = VERNACULAR_FIELD_PRESETS.find(
  (p) => p.presetId === "HINDI_DEVANAGARI_CEMENT_SHORTAGE"
)!;
const ext2 = extractGroundTruthDeterministic(hindiPreset.transcript);
const res2 = evaluateVernacularGrounding({
  projectId: "VANGUARD-LKO-01",
  extraction: ext2,
  extractorMode: "deterministic_vernacular_fallback",
  modelUsed: "deterministic-regex-ifc-v1",
});

assert.equal(ext2.detectedLanguage, "hi-IN");
assert.equal(res2.ifcRecord.ifcClass, "IfcFooting");
assert.equal(res2.ifcRecord.zoneId, "RAFT-FND-01");
assert.equal(res2.triangulation.httpStatus, 422);
assert.ok(res2.ifcRecord.discrepancyCodes.includes("CEMENT_SHORTAGE_CLAUSE42"));
assert.ok(res2.ifcRecord.discrepancyCodes.includes("WATER_CEMENT_BREACH"));
console.log(
  `[PASS] Hindi Devanagari Grounding -> ${res2.ifcRecord.ifcClass} (${res2.ifcRecord.zoneId}) | HTTP 422 | Clause 42: ₹${res2.triangulation.recommendedClause42PenaltyInr.toLocaleString("en-IN")}`
);

// 3. Clean English Slab Pour -> IfcSlab + HTTP 200 + Trust 100%
const cleanPreset = VERNACULAR_FIELD_PRESETS.find((p) => p.presetId === "CLEAN_SITE_ENGLISH_POUR")!;
const ext3 = extractGroundTruthDeterministic(cleanPreset.transcript);
const res3 = evaluateVernacularGrounding({
  projectId: "VANGUARD-LKO-01",
  extraction: ext3,
  extractorMode: "deterministic_vernacular_fallback",
  modelUsed: "deterministic-regex-ifc-v1",
});

assert.equal(ext3.detectedLanguage, "en-IN");
assert.equal(res3.ifcRecord.ifcClass, "IfcSlab");
assert.equal(res3.triangulation.httpStatus, 200);
assert.equal(res3.triangulation.trustScorePct, 100);
assert.equal(res3.triangulation.discrepancies.length, 0);
console.log(
  `[PASS] Clean Slab Grounding -> ${res3.ifcRecord.ifcClass} (${res3.ifcRecord.zoneId}) | HTTP 200 | Trust: 100%`
);

// 4. Column IFC Mapping Check
const colBind = resolveBimZoneBinding("Tower A कॉलम C4 casting check");
assert.equal(colBind.ifcClass, "IfcColumn");
console.log(`[PASS] IFC Structural Classifier -> Beam, Footing, Slab & Column (${colBind.zoneId}) mapped`);
