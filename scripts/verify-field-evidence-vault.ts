import assert from "node:assert/strict";
import {
  buildEvidenceObjectPath,
  parseImageDataUrl,
  sanitizeProjectSlug,
} from "../lib/repositories/fieldEvidenceRepo";

// 1x1 transparent PNG fixture
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const HASH = "a".repeat(64);

// 1. Valid PNG data URL decode
const okPng = parseImageDataUrl(TINY_PNG);
assert.equal(okPng.ok, true, "Valid PNG data URL must parse");
if (okPng.ok) {
  assert.equal(okPng.image.mimeType, "image/png");
  assert.equal(okPng.image.ext, "png");
  assert.ok(okPng.image.byteLength > 20, "Decoded PNG bytes must be > 20");
}
console.log("[PASS] Data URL Decoder -> valid PNG parsed cleanly");

// 2. Reject non-image / script injection data URLs
const badSvg = parseImageDataUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=");
assert.equal(badSvg.ok, false, "SVG/script data URLs must be rejected");

const badSize = parseImageDataUrl(TINY_PNG, 10);
assert.equal(badSize.ok, false, "Payloads exceeding maxBytes must be rejected");
console.log("[PASS] Binary Security Guards -> SVG blocked & max-bytes cap enforced");

// 3. Path-traversal sanitization & content-addressed path
const safeSlug = sanitizeProjectSlug("../../etc/passwd!!Vanguard");
assert.ok(!safeSlug.includes(".."), "Slug must strip path traversal");
assert.ok(!safeSlug.includes("/"), "Slug must strip slashes");

const objectPath = buildEvidenceObjectPath("VANGUARD-LKO-01", HASH.toUpperCase(), "jpg");
assert.equal(objectPath, `VANGUARD-LKO-01/${HASH}.jpg`, "Object path must be lowercase content-addressed");
console.log(`[PASS] Content-Addressed Storage Path -> ${objectPath} (traversal-proof)`);
