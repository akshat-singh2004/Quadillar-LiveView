import crypto from "node:crypto";

export function computeMediaBundleSha256(buffers: Buffer[]): string {
  const hash = crypto.createHash("sha256");
  for (const buf of buffers) hash.update(buf);
  return hash.digest("hex");
}

export interface Canonical65BInput {
  rawMediaSha256: string;
  vernacularTranscript: string;
  bimZoneId: string;
  utcTimestamp: string;
  submitterId: string;
}

export function computeCanonical65BDigest(input: Canonical65BInput): string {
  const payload = [
    input.rawMediaSha256.trim().toLowerCase(),
    input.vernacularTranscript.trim(),
    input.bimZoneId.trim(),
    input.utcTimestamp.trim(),
    input.submitterId.trim(),
  ].join("|");
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}
