import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { jsonError, jsonOk, readJsonBody } from "@/lib/server/http";
import {
  authorizeOperatorAction,
  buildRateLimitHeaders,
  checkRateLimit,
  extractClientIp,
  rateLimitExceededResponse,
} from "@/lib/server/securityGuard";
import {
  formatStampedActor,
  getAuthPolicySummary,
  resolveOperatorIdentity,
  type ResolvedOperatorIdentity,
} from "@/lib/server/authSession";
import {
  VERNACULAR_FIELD_PRESETS,
  evaluateVernacularGrounding,
} from "@/lib/domain/vernacularGroundingEngine";
import {
  extractVernacularFieldReport,
  getVernacularExtractorStatus,
} from "@/lib/server/vernacularExtractor";
import {
  getPortfolioProjectBaseline,
  resolvePortfolioProject,
} from "@/lib/domain/portfolioRegistry";
import { ingestFieldEvidencePacket } from "@/lib/repositories/fieldEvidenceRepo";
import { appendGovernorEvent } from "@/lib/repositories/eventLedgerRepo";

export const dynamic = "force-dynamic";

const GROUNDING_RATE_POLICY = {
  bucket: "vernacular_field_ground",
  limit: 20,
  windowSec: 60,
};

export async function GET() {
  return jsonOk({
    ok: true,
    service: "quadillar-vernacular-to-bim-grounding",
    authPolicy: getAuthPolicySummary(),
    ...getVernacularExtractorStatus(),
    rateLimitPolicy: GROUNDING_RATE_POLICY,
    presets: VERNACULAR_FIELD_PRESETS,
  });
}

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(extractClientIp(req), GROUNDING_RATE_POLICY);
  if (!rl.allowed) return rateLimitExceededResponse(rl);
  const rlHeaders = buildRateLimitHeaders(rl);

  const body = await readJsonBody<{
    projectId?: string;
    transcript?: string;
    presetId?: string;
    challanImageDataUrl?: string | null;
    audioDataUrl?: string | null;
    commitToLedger?: boolean;
    useAi?: boolean;
    role?: string;
    pin?: string;
    actor?: string;
  }>(req);

  if (!body) {
    return jsonError("Invalid JSON request body.", 400);
  }

  let effectiveTranscript = (body.transcript || "").trim();
  if (!effectiveTranscript && body.presetId) {
    const preset = VERNACULAR_FIELD_PRESETS.find((p) => p.presetId === body.presetId);
    if (preset) effectiveTranscript = preset.transcript;
  }

  if (!effectiveTranscript && !body.challanImageDataUrl && !body.audioDataUrl) {
    return jsonError(
      "Provide a Hindi/Hinglish/English 'transcript', 'presetId', 'challanImageDataUrl', or 'audioDataUrl'.",
      400
    );
  }

  const commitToLedger = body.commitToLedger === true;
  let resolvedIdentity: ResolvedOperatorIdentity | null = null;
  let operatorRole: string = "PREVIEW_MODE";

  if (commitToLedger) {
    const fallbackRole = req.headers.get("x-operator-role") || body.role || "SITE_ENGINEER";
    const suppliedPin =
      req.headers.get("x-operator-pin") ||
      req.headers.get("x-director-pin") ||
      body.pin;

    const identity = await resolveOperatorIdentity(req, fallbackRole);
    if (!identity.ok) {
      return jsonOk(
        { ok: false, code: identity.code, error: identity.error },
        identity.httpStatus,
        rlHeaders
      );
    }

    const authN = authorizeOperatorAction({
      role: identity.role,
      suppliedPin,
      actionType: null,
    });
    if (!authN.authorized) {
      return jsonOk(
        {
          ok: false,
          error: authN.reason || "Operator PIN required to seal field grounding.",
          role: identity.role,
          authSource: identity.authSource,
        },
        authN.httpStatus,
        rlHeaders
      );
    }
    if (identity.role === "AUDITOR") {
      return jsonOk(
        {
          ok: false,
          rbacDenied: true,
          role: "AUDITOR",
          authSource: identity.authSource,
          error: "RBAC FORBIDDEN: Role AUDITOR is read-only and cannot commit vernacular records to the ledger.",
        },
        403,
        rlHeaders
      );
    }
    resolvedIdentity = identity;
    operatorRole = identity.role;
  }

  const project = resolvePortfolioProject(body.projectId);
  const baseline = getPortfolioProjectBaseline(project.projectId);

  const extracted = await extractVernacularFieldReport({
    transcript: effectiveTranscript,
    challanImageDataUrl: body.challanImageDataUrl,
    audioDataUrl: body.audioDataUrl,
    projectId: project.projectId,
    defaultZoneId: baseline.input.zoneId,
    useAi: body.useAi,
  });

  const grounded = evaluateVernacularGrounding({
    projectId: project.projectId,
    extraction: extracted.extraction,
    extractorMode: extracted.extractorMode,
    modelUsed: extracted.modelUsed,
  });

  let evidenceReceipt: {
    id: string;
    sha256: string;
    mediaStorageMode: string;
    mediaUrl: string | null;
    storageMode: string;
  } | null = null;

  let ledgerReceipt: {
    seq: number;
    chainHash: string;
    storageMode: string;
    eventType: string;
  } | null = null;

  if (commitToLedger && resolvedIdentity) {
    const nowIso = new Date().toISOString();
    const evidenceHash = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          projectId: project.projectId,
          transcript: effectiveTranscript,
          challanNo: grounded.extraction.challanNo,
          zoneId: grounded.ifcRecord.zoneId,
          ts: nowIso,
          hasImage: Boolean(body.challanImageDataUrl),
        })
      )
      .digest("hex");

    if (body.challanImageDataUrl) {
      const stored = await ingestFieldEvidencePacket({
        id: `VERN-${Date.now()}`,
        projectId: project.projectId,
        recordedAtUtc: nowIso,
        zoneId: grounded.ifcRecord.zoneId,
        bimGlobalId: grounded.ifcRecord.globalId,
        noteText: grounded.extraction.englishSummary,
        sha256: evidenceHash,
        bandwidthProfile: "field_grounding",
        thumbDataUrl: body.challanImageDataUrl,
      });
      evidenceReceipt = {
        id: stored.id,
        sha256: stored.sha256,
        mediaStorageMode: stored.mediaStorageMode,
        mediaUrl: stored.mediaUrl,
        storageMode: stored.storageMode,
      };
    }

    const stampedActor = formatStampedActor(resolvedIdentity, body.actor, "Field Grounding");
    const appended = await appendGovernorEvent({
      projectId: project.projectId,
      eventType: "VERNACULAR_GROUNDING",
      actor: stampedActor,
      source: "/api/field/ground",
      mode: grounded.ifcRecord.complianceStatus,
      httpStatus: grounded.triangulation.httpStatus,
      frozenInr: grounded.triangulation.recommendedEscrowHoldInr,
      netReleaseInr: 0,
      violationCount: grounded.triangulation.discrepancies.length,
      diffJson: {
        authSource: resolvedIdentity.authSource,
        roleSource: resolvedIdentity.roleSource,
        userId: resolvedIdentity.userId,
        userEmail: resolvedIdentity.email,
        detectedLanguage: grounded.extraction.detectedLanguage,
        extractorMode: grounded.extractorMode,
        modelUsed: grounded.modelUsed,
        ifcClass: grounded.ifcRecord.ifcClass,
        bimGlobalId: grounded.ifcRecord.globalId,
        zoneId: grounded.ifcRecord.zoneId,
        challanNo: grounded.extraction.challanNo,
        trustScorePct: grounded.triangulation.trustScorePct,
        discrepancyCodes: grounded.ifcRecord.discrepancyCodes,
        evidenceUrl: evidenceReceipt?.mediaUrl ?? null,
      },
      snapshotHash: evidenceHash,
    });

    ledgerReceipt = {
      seq: appended.event.seq,
      chainHash: appended.event.chainHash,
      storageMode: appended.storageMode,
      eventType: appended.event.eventType,
    };
  }

  return jsonOk(
    {
      ok: true,
      committed: commitToLedger,
      operatorRole,
      authSource: resolvedIdentity?.authSource ?? "preview_unauthenticated",
      userEmail: resolvedIdentity?.email ?? null,
      projectName: project.name,
      grounded,
      evidenceReceipt,
      ledgerReceipt,
    },
    commitToLedger ? 201 : 200,
    {
      ...rlHeaders,
      ...(ledgerReceipt ? { "X-BSA-Sec63-Hash": ledgerReceipt.chainHash } : {}),
    }
  );
}
