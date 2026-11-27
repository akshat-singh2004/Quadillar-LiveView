import crypto from "node:crypto";
import type { PortfolioProjectNode } from "@/lib/agents/portfolioSentinelMesh";
import type { GovernorSnapshot, MolecularInput } from "@/lib/engines/molecularGovernor";
import {
  stableStringify,
  verifyEventChain,
  type ChainVerificationResult,
  type GovernorLedgerEvent,
} from "@/lib/repositories/eventLedgerRepo";
import { sanitizeProjectSlug } from "@/lib/repositories/fieldEvidenceRepo";

export const DOSSIER_SCHEMA_VERSION = "QUADILLAR_BSA63_DOSSIER_V1" as const;

export interface NormalizedEvidenceEntry {
  id: string;
  projectId: string;
  zoneId: string;
  bimGlobalId: string;
  sha256: string;
  recordedAtUtc: string;
  noteText: string;
  mediaStorageMode: string;
  mediaUrl: string | null;
}

export interface IfcGroundingSummary {
  seq: number;
  recordedAtUtc: string;
  actor: string;
  challanNo: string;
  ifcClass: string;
  bimGlobalId: string;
  zoneId: string;
  detectedLanguage: string;
  trustScorePct: number;
  httpStatus: number;
  discrepancyCodes: string[];
  evidenceUrl: string | null;
  chainHash: string;
}

export interface ForensicDossierBody {
  schemaVersion: typeof DOSSIER_SCHEMA_VERSION;
  statutoryBasis: "BSA_2023_SECTION_63_4_C";
  generatedAtUtc: string;
  storageMode: string;
  project: {
    projectId: string;
    code: string;
    name: string;
    subtitle: string;
    location: string;
    architectLead: string;
    contractValueCr: number;
    raBillNo: string;
    zoneId: string;
    bimGlobalId: string;
  };
  governorState: {
    mode: string;
    decision: GovernorSnapshot["escrow"]["decision"];
    httpStatus: number;
    grossClaimInr: number;
    frozenInr: number;
    eligibleGrossInr: number;
    clause42PenaltyInr: number;
    netCertifiedReleaseInr: number;
    violationCount: number;
    violations: GovernorSnapshot["violations"];
    permits: GovernorSnapshot["permits"];
    bsaSec63Ledger: GovernorSnapshot["bsaSec63Ledger"];
  };
  hashChain: {
    verification: ChainVerificationResult;
    totalEvents: number;
    events: GovernorLedgerEvent[];
  };
  evidenceVault: {
    count: number;
    packets: NormalizedEvidenceEntry[];
  };
  ifcGrounding: {
    count: number;
    records: IfcGroundingSummary[];
  };
  summaryMetrics: {
    totalSealedEvents: number;
    kineticActionCount: number;
    iotInterlockCount: number;
    triangulationAlertCount: number;
    vernacularGroundingCount: number;
    linkedEvidenceCount: number;
  };
}

export interface SealedForensicDossier extends ForensicDossierBody {
  manifest: {
    algorithm: "FIPS-180-4-SHA-256";
    dossierHash: string;
    integrityStatus: "INTACT" | "CHAIN_COMPROMISED";
    canonicalBytes: number;
    sealedAtUtc: string;
  };
}

export function normalizeEvidencePacketsForProject(
  projectId: string,
  rawPackets: unknown[]
): NormalizedEvidenceEntry[] {
  const targetSlug = sanitizeProjectSlug(projectId).toLowerCase();
  const normalized: NormalizedEvidenceEntry[] = [];

  for (const raw of rawPackets || []) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const rowProjectId = String(r.project_id ?? r.projectId ?? "").trim();
    if (!rowProjectId) continue;

    if (
      rowProjectId.toLowerCase() !== projectId.toLowerCase() &&
      sanitizeProjectSlug(rowProjectId).toLowerCase() !== targetSlug
    ) {
      continue;
    }

    const rawUrl = r.media_url ?? r.mediaUrl ?? null;
    const mediaUrl =
      typeof rawUrl === "string" && /^https?:\/\/\S+$/i.test(rawUrl.trim())
        ? rawUrl.trim()
        : null;

    normalized.push({
      id: String(r.id ?? ""),
      projectId: rowProjectId,
      zoneId: String(r.zone_id ?? r.zoneId ?? ""),
      bimGlobalId: String(r.bim_global_id ?? r.bimGlobalId ?? ""),
      sha256: String(r.sha256 ?? "").toLowerCase(),
      recordedAtUtc: String(r.recorded_at_utc ?? r.recordedAtUtc ?? ""),
      noteText: String(r.note_text ?? r.noteText ?? "").slice(0, 400),
      mediaStorageMode: String(r.media_storage_mode ?? r.mediaStorageMode ?? "none"),
      mediaUrl,
    });
  }

  return normalized;
}

export function extractIfcGroundingRecords(
  events: GovernorLedgerEvent[]
): IfcGroundingSummary[] {
  const out: IfcGroundingSummary[] = [];
  for (const ev of events) {
    if (ev.eventType !== "VERNACULAR_GROUNDING") continue;
    const d = (ev.diffJson || {}) as Record<string, unknown>;
    const codes = Array.isArray(d.discrepancyCodes)
      ? d.discrepancyCodes.map((c) => String(c))
      : [];
    const rawUrl = d.evidenceUrl;
    out.push({
      seq: ev.seq,
      recordedAtUtc: ev.recordedAtUtc,
      actor: ev.actor,
      challanNo: String(d.challanNo ?? "CHLN-UNKNOWN"),
      ifcClass: String(d.ifcClass ?? "IfcBuildingElement"),
      bimGlobalId: String(d.bimGlobalId ?? ""),
      zoneId: String(d.zoneId ?? ""),
      detectedLanguage: String(d.detectedLanguage ?? "unknown"),
      trustScorePct: Number.isFinite(Number(d.trustScorePct)) ? Number(d.trustScorePct) : 0,
      httpStatus: ev.httpStatus,
      discrepancyCodes: codes,
      evidenceUrl:
        typeof rawUrl === "string" && /^https?:\/\/\S+$/i.test(rawUrl) ? rawUrl : null,
      chainHash: ev.chainHash,
    });
  }
  return out;
}

export function computeDossierManifestHash(body: ForensicDossierBody): {
  dossierHash: string;
  canonicalBytes: number;
} {
  const canonical = stableStringify(body);
  const dossierHash = crypto.createHash("sha256").update(canonical).digest("hex");
  return {
    dossierHash,
    canonicalBytes: Buffer.byteLength(canonical, "utf8"),
  };
}

export function assembleForensicDossier(params: {
  project: PortfolioProjectNode;
  input: MolecularInput;
  snapshot: GovernorSnapshot;
  mode: string;
  storageMode: string;
  events: GovernorLedgerEvent[];
  rawEvidencePackets: unknown[];
  generatedAtUtc?: string;
}): SealedForensicDossier {
  const generatedAtUtc = params.generatedAtUtc || new Date().toISOString();
  const orderedEvents = [...params.events].sort((a, b) => a.seq - b.seq);
  const verification = verifyEventChain(params.project.projectId, orderedEvents);
  const evidencePackets = normalizeEvidencePacketsForProject(
    params.project.projectId,
    params.rawEvidencePackets
  );
  const ifcRecords = extractIfcGroundingRecords(orderedEvents);

  const body: ForensicDossierBody = {
    schemaVersion: DOSSIER_SCHEMA_VERSION,
    statutoryBasis: "BSA_2023_SECTION_63_4_C",
    generatedAtUtc,
    storageMode: params.storageMode,
    project: {
      projectId: params.project.projectId,
      code: params.project.code,
      name: params.project.name,
      subtitle: params.project.subtitle,
      location: params.project.location,
      architectLead: params.project.architectLead,
      contractValueCr: params.project.contractValueCr,
      raBillNo: params.input.raBillNo,
      zoneId: params.input.zoneId,
      bimGlobalId: params.input.bimGlobalId,
    },
    governorState: {
      mode: params.mode,
      decision: params.snapshot.escrow.decision,
      httpStatus: params.snapshot.escrow.httpStatus,
      grossClaimInr: params.snapshot.escrow.grossClaimInr,
      frozenInr: params.snapshot.escrow.frozenInr,
      eligibleGrossInr: params.snapshot.escrow.eligibleGrossInr,
      clause42PenaltyInr: params.snapshot.escrow.clause42PenaltyInr,
      netCertifiedReleaseInr: params.snapshot.escrow.netCertifiedReleaseInr,
      violationCount: params.snapshot.violations.length,
      violations: params.snapshot.violations,
      permits: params.snapshot.permits,
      bsaSec63Ledger: params.snapshot.bsaSec63Ledger,
    },
    hashChain: {
      verification,
      totalEvents: orderedEvents.length,
      events: orderedEvents,
    },
    evidenceVault: {
      count: evidencePackets.length,
      packets: evidencePackets,
    },
    ifcGrounding: {
      count: ifcRecords.length,
      records: ifcRecords,
    },
    summaryMetrics: {
      totalSealedEvents: orderedEvents.length,
      kineticActionCount: orderedEvents.filter((e) => e.eventType === "KINETIC_ACTION").length,
      iotInterlockCount: orderedEvents.filter((e) => e.eventType === "IOT_INTERLOCK").length,
      triangulationAlertCount: orderedEvents.filter((e) => e.eventType === "TRIANGULATION_ALERT")
        .length,
      vernacularGroundingCount: ifcRecords.length,
      linkedEvidenceCount: evidencePackets.length,
    },
  };

  const { dossierHash, canonicalBytes } = computeDossierManifestHash(body);

  return {
    ...body,
    manifest: {
      algorithm: "FIPS-180-4-SHA-256",
      dossierHash,
      integrityStatus: verification.valid ? "INTACT" : "CHAIN_COMPROMISED",
      canonicalBytes,
      sealedAtUtc: generatedAtUtc,
    },
  };
}

export function verifyForensicDossierIntegrity(dossier: SealedForensicDossier): {
  valid: boolean;
  manifestHashMatches: boolean;
  chainValid: boolean;
  recomputedManifestHash: string;
  reason: string;
} {
  const { manifest, ...body } = dossier;
  const { dossierHash: recomputedManifestHash } = computeDossierManifestHash(body);
  const manifestHashMatches = recomputedManifestHash === manifest.dossierHash;
  const chainCheck = verifyEventChain(body.project.projectId, body.hashChain.events);
  const chainValid = chainCheck.valid && manifest.integrityStatus === "INTACT";

  if (!manifestHashMatches) {
    return {
      valid: false,
      manifestHashMatches: false,
      chainValid,
      recomputedManifestHash,
      reason: "DOSSIER TAMPER DETECTED: JSON payload digest does not match manifest.dossierHash.",
    };
  }

  if (!chainValid) {
    return {
      valid: false,
      manifestHashMatches: true,
      chainValid: false,
      recomputedManifestHash,
      reason: `UNDERLYING HASH-CHAIN COMPROMISED: ${chainCheck.reason}`,
    };
  }

  return {
    valid: true,
    manifestHashMatches: true,
    chainValid: true,
    recomputedManifestHash,
    reason: `Dossier manifest & ${chainCheck.checkedEvents}-event BSA Sec 63 hash-chain verified cryptographically intact.`,
  };
}
