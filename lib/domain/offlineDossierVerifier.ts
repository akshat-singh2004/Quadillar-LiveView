/**
 * Independent Offline BSA Section 63(4) Dossier Verifier.
 * Zero Node.js imports — executes 100% locally in browsers (Web Crypto SHA-256)
 * with a deterministic pure-TS FIPS 180-4 SHA-256 fallback for non-HTTPS LAN audits.
 */

export const EXPECTED_DOSSIER_SCHEMA = "QUADILLAR_BSA63_DOSSIER_V1";
export const GENESIS_PREV_HASH_HEX = "0".repeat(64);

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256PureJs(bytes: Uint8Array): string {
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map((v) => v.toString(16).padStart(8, "0")).join("");
}

export async function sha256Utf8Hex(message: string): Promise<{
  hex: string;
  engine: "web_crypto_subtle" | "pure_js_fips180_4";
  byteLength: number;
}> {
  const bytes = new TextEncoder().encode(message);
  const subtle = typeof globalThis !== "undefined" ? globalThis.crypto?.subtle : undefined;
  if (subtle && typeof subtle.digest === "function") {
    try {
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      const buf = await subtle.digest("SHA-256", copy);
      const hex = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
      return { hex, engine: "web_crypto_subtle", byteLength: bytes.byteLength };
    } catch {
      // Fall through cleanly to pure-JS FIPS 180-4 implementation
    }
  }
  return {
    hex: sha256PureJs(bytes),
    engine: "pure_js_fips180_4",
    byteLength: bytes.byteLength,
  };
}

/**
 * Exact canonical JSON serializer mirroring lib/repositories/eventLedgerRepo.ts
 */
export function canonicalStableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalStableStringify(obj[k])}`)
    .join(",")}}`;
}

export interface OfflineBlockAuditRow {
  seq: number;
  eventType: string;
  actor: string;
  recordedAtUtc: string;
  httpStatus: number;
  frozenInr: number;
  seqOk: boolean;
  prevHashOk: boolean;
  chainHashOk: boolean;
  valid: boolean;
  declaredChainHash: string;
  recomputedChainHash: string;
  failureReason: string | null;
}

export interface OfflineVerificationReport {
  valid: boolean;
  verdict: "CRYPTOGRAPHICALLY_INTACT" | "TAMPER_OR_CORRUPTION_DETECTED" | "INVALID_DOSSIER_FORMAT";
  cryptoEngine: "web_crypto_subtle" | "pure_js_fips180_4";
  verifiedAtUtc: string;
  rawFileSha256: string | null;
  rawFileBytes: number;
  schemaVersion: string | null;
  project: {
    projectId: string;
    name: string;
    location: string;
    raBillNo: string;
    zoneId: string;
    bimGlobalId: string;
  } | null;
  manifestCheck: {
    declaredStatus: string | null;
    declaredHash: string | null;
    recomputedHash: string | null;
    canonicalBytes: number;
    matches: boolean;
  };
  chainCheck: {
    valid: boolean;
    totalEvents: number;
    passedBlocks: number;
    firstTamperedSeq: number | null;
    reason: string;
    blocks: OfflineBlockAuditRow[];
  };
  evidenceCount: number;
  ifcRecordCount: number;
  summaryReason: string;
}

export async function verifyDossierObjectOffline(
  input: unknown,
  rawMeta?: { rawFileSha256?: string | null; rawFileBytes?: number }
): Promise<OfflineVerificationReport> {
  const verifiedAtUtc = new Date().toISOString();
  const emptyFail = (reason: string, engine: "web_crypto_subtle" | "pure_js_fips180_4" = "web_crypto_subtle"): OfflineVerificationReport => ({
    valid: false,
    verdict: "INVALID_DOSSIER_FORMAT",
    cryptoEngine: engine,
    verifiedAtUtc,
    rawFileSha256: rawMeta?.rawFileSha256 ?? null,
    rawFileBytes: rawMeta?.rawFileBytes ?? 0,
    schemaVersion: null,
    project: null,
    manifestCheck: {
      declaredStatus: null,
      declaredHash: null,
      recomputedHash: null,
      canonicalBytes: 0,
      matches: false,
    },
    chainCheck: {
      valid: false,
      totalEvents: 0,
      passedBlocks: 0,
      firstTamperedSeq: null,
      reason,
      blocks: [],
    },
    evidenceCount: 0,
    ifcRecordCount: 0,
    summaryReason: reason,
  });

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return emptyFail("Input is not a valid JSON dossier object.");
  }

  // Support both unwrapped dossier (from ?download=1) and API wrapper ({ ok: true, dossier })
  const root = input as Record<string, unknown>;
  const candidate =
    root.dossier && typeof root.dossier === "object" && !Array.isArray(root.dossier)
      ? (root.dossier as Record<string, unknown>)
      : root;

  const schemaVersion = typeof candidate.schemaVersion === "string" ? candidate.schemaVersion : null;
  const manifest =
    candidate.manifest && typeof candidate.manifest === "object"
      ? (candidate.manifest as Record<string, unknown>)
      : null;
  const project =
    candidate.project && typeof candidate.project === "object"
      ? (candidate.project as Record<string, unknown>)
      : null;
  const hashChain =
    candidate.hashChain && typeof candidate.hashChain === "object"
      ? (candidate.hashChain as Record<string, unknown>)
      : null;

  if (schemaVersion !== EXPECTED_DOSSIER_SCHEMA || !manifest || !project || !hashChain) {
    return emptyFail(
      `Unsupported or incomplete dossier structure. Expected schemaVersion='${EXPECTED_DOSSIER_SCHEMA}' with manifest, project, and hashChain.`
    );
  }

  // 1. Recompute Top-Level Manifest Digest over body (all keys except manifest)
  const bodyWithoutManifest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(candidate)) {
    if (k !== "manifest") bodyWithoutManifest[k] = v;
  }

  const canonicalBody = canonicalStableStringify(bodyWithoutManifest);
  const manifestDigest = await sha256Utf8Hex(canonicalBody);
  const declaredHash = typeof manifest.dossierHash === "string" ? manifest.dossierHash : null;
  const declaredStatus = typeof manifest.integrityStatus === "string" ? manifest.integrityStatus : null;
  const manifestMatches = Boolean(declaredHash && declaredHash === manifestDigest.hex);

  // 2. Independently Re-Hash & Verify Every Event Block in the Append-Only Ledger
  const rawEvents = Array.isArray(hashChain.events) ? hashChain.events : [];
  const ordered = [...rawEvents]
    .filter((e): e is Record<string, unknown> => Boolean(e && typeof e === "object"))
    .sort((a, b) => Number(a.seq) - Number(b.seq));

  let expectedSeq = 1;
  let expectedPrev = GENESIS_PREV_HASH_HEX;
  let firstTamperedSeq: number | null = null;
  let firstChainFailureReason = "";
  let passedBlocks = 0;
  const blocks: OfflineBlockAuditRow[] = [];

  for (const ev of ordered) {
    const seq = Number(ev.seq);
    const prevHash = String(ev.prevHash ?? "");
    const declaredChainHash = String(ev.chainHash ?? "");

    const canonicalEvent = canonicalStableStringify({
      projectId: String(ev.projectId ?? ""),
      seq,
      eventType: String(ev.eventType ?? ""),
      actor: String(ev.actor ?? ""),
      source: String(ev.source ?? ""),
      mode: String(ev.mode ?? ""),
      httpStatus: Number(ev.httpStatus),
      frozenInr: Number(ev.frozenInr),
      netReleaseInr: Number(ev.netReleaseInr),
      violationCount: Number(ev.violationCount),
      diffJson: (ev.diffJson && typeof ev.diffJson === "object" ? ev.diffJson : {}) as Record<
        string,
        unknown
      >,
      snapshotHash: String(ev.snapshotHash ?? ""),
      prevHash,
      recordedAtUtc: String(ev.recordedAtUtc ?? ""),
    });

    const recomputed = await sha256Utf8Hex(canonicalEvent);
    const seqOk = seq === expectedSeq;
    const prevHashOk = prevHash === expectedPrev;
    const chainHashOk = recomputed.hex === declaredChainHash;
    const rowValid = seqOk && prevHashOk && chainHashOk;

    let failureReason: string | null = null;
    if (!seqOk) {
      failureReason = `Sequence gap/mismatch: expected seq #${expectedSeq}, found #${seq}`;
    } else if (!prevHashOk) {
      failureReason = `Broken prevHash link at seq #${seq}`;
    } else if (!chainHashOk) {
      failureReason = `Payload digest mismatch at seq #${seq} (sealed chainHash altered)`;
    }

    if (rowValid) {
      passedBlocks++;
    } else if (firstTamperedSeq === null) {
      firstTamperedSeq = seq;
      firstChainFailureReason = failureReason || `Integrity fault at seq #${seq}`;
    }

    blocks.push({
      seq,
      eventType: String(ev.eventType ?? ""),
      actor: String(ev.actor ?? ""),
      recordedAtUtc: String(ev.recordedAtUtc ?? ""),
      httpStatus: Number(ev.httpStatus),
      frozenInr: Number(ev.frozenInr),
      seqOk,
      prevHashOk,
      chainHashOk,
      valid: rowValid,
      declaredChainHash,
      recomputedChainHash: recomputed.hex,
      failureReason,
    });

    expectedPrev = declaredChainHash;
    expectedSeq++;
  }

  const chainValid = ordered.length > 0 && firstTamperedSeq === null && declaredStatus === "INTACT";
  const allValid = manifestMatches && chainValid;

  let summaryReason: string;
  if (allValid) {
    summaryReason = `VERIFIED INTACT: Manifest SHA-256 and all ${ordered.length} sequential hash-chain blocks match zero-byte cryptographic invariants.`;
  } else if (!manifestMatches && firstTamperedSeq !== null) {
    summaryReason = `TAMPER DETECTED: Dossier manifest digest mismatch AND broken hash-chain at seq #${firstTamperedSeq} (${firstChainFailureReason}).`;
  } else if (!manifestMatches) {
    summaryReason = "TAMPER DETECTED: Dossier JSON body was modified after export (manifest.dossierHash mismatch).";
  } else if (declaredStatus !== "INTACT") {
    summaryReason = `CHAIN COMPROMISED AT EXPORT: Manifest was sealed with integrityStatus='${declaredStatus}'.`;
  } else {
    summaryReason = `HASH-CHAIN TAMPER DETECTED at seq #${firstTamperedSeq}: ${firstChainFailureReason}`;
  }

  const evidenceVault =
    candidate.evidenceVault && typeof candidate.evidenceVault === "object"
      ? (candidate.evidenceVault as Record<string, unknown>)
      : null;
  const ifcGrounding =
    candidate.ifcGrounding && typeof candidate.ifcGrounding === "object"
      ? (candidate.ifcGrounding as Record<string, unknown>)
      : null;

  return {
    valid: allValid,
    verdict: allValid ? "CRYPTOGRAPHICALLY_INTACT" : "TAMPER_OR_CORRUPTION_DETECTED",
    cryptoEngine: manifestDigest.engine,
    verifiedAtUtc,
    rawFileSha256: rawMeta?.rawFileSha256 ?? null,
    rawFileBytes: rawMeta?.rawFileBytes ?? manifestDigest.byteLength,
    schemaVersion,
    project: {
      projectId: String(project.projectId ?? ""),
      name: String(project.name ?? ""),
      location: String(project.location ?? ""),
      raBillNo: String(project.raBillNo ?? ""),
      zoneId: String(project.zoneId ?? ""),
      bimGlobalId: String(project.bimGlobalId ?? ""),
    },
    manifestCheck: {
      declaredStatus,
      declaredHash,
      recomputedHash: manifestDigest.hex,
      canonicalBytes: manifestDigest.byteLength,
      matches: manifestMatches,
    },
    chainCheck: {
      valid: chainValid,
      totalEvents: ordered.length,
      passedBlocks,
      firstTamperedSeq,
      reason: chainValid
        ? `All ${ordered.length} sequential blocks verified intact.`
        : firstChainFailureReason || `Declared chain status is ${declaredStatus}`,
      blocks,
    },
    evidenceCount: Number(evidenceVault?.count ?? 0),
    ifcRecordCount: Number(ifcGrounding?.count ?? 0),
    summaryReason,
  };
}

export async function verifyDossierJsonOffline(
  rawJsonText: string
): Promise<OfflineVerificationReport> {
  const fileDigest = await sha256Utf8Hex(rawJsonText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch (err) {
    return {
      valid: false,
      verdict: "INVALID_DOSSIER_FORMAT",
      cryptoEngine: fileDigest.engine,
      verifiedAtUtc: new Date().toISOString(),
      rawFileSha256: fileDigest.hex,
      rawFileBytes: fileDigest.byteLength,
      schemaVersion: null,
      project: null,
      manifestCheck: {
        declaredStatus: null,
        declaredHash: null,
        recomputedHash: null,
        canonicalBytes: 0,
        matches: false,
      },
      chainCheck: {
        valid: false,
        totalEvents: 0,
        passedBlocks: 0,
        firstTamperedSeq: null,
        reason: `Malformed JSON file: ${err instanceof Error ? err.message : "parse error"}`,
        blocks: [],
      },
      evidenceCount: 0,
      ifcRecordCount: 0,
      summaryReason: `Malformed JSON file: ${err instanceof Error ? err.message : "parse error"}`,
    };
  }

  return verifyDossierObjectOffline(parsed, {
    rawFileSha256: fileDigest.hex,
    rawFileBytes: fileDigest.byteLength,
  });
}
