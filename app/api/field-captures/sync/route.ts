import { NextRequest } from "next/server";
import { jsonError, jsonOk, readJsonBody } from "@/lib/server/http";
import {
  buildRateLimitHeaders,
  checkRateLimit,
  extractClientIp,
  rateLimitExceededResponse,
} from "@/lib/server/securityGuard";
import {
  ingestFieldEvidencePacket,
  listFieldEvidencePackets,
  type FieldEvidenceSyncPayload,
} from "@/lib/repositories/fieldEvidenceRepo";

export const dynamic = "force-dynamic";

const SYNC_RATE_POLICY = {
  bucket: "field_captures_sync",
  limit: 30,
  windowSec: 60,
};

export async function GET() {
  const result = await listFieldEvidencePackets(30);
  return jsonOk(result);
}

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(extractClientIp(req), SYNC_RATE_POLICY);
  if (!rl.allowed) return rateLimitExceededResponse(rl);
  const rlHeaders = buildRateLimitHeaders(rl);

  const body = await readJsonBody<FieldEvidenceSyncPayload>(req);
  if (!body) {
    return jsonError("Invalid JSON payload", 400);
  }

  if (
    !body.id ||
    !body.zoneId ||
    !body.bimGlobalId ||
    !body.sha256 ||
    !/^[a-f0-9]{64}$/i.test(body.sha256)
  ) {
    return jsonError("Missing required fields or invalid 64-char SHA-256 hash", 400);
  }

  const res = await ingestFieldEvidencePacket(body);
  if (res.duplicate) {
    return jsonOk(
      {
        error: "HTTP 409 DUPLICATE_EVIDENCE_HASH",
        detail: res.detail,
        sha256: res.sha256,
      },
      409,
      { ...rlHeaders, "X-BSA-Sec63-Hash": res.sha256 }
    );
  }

  return jsonOk(
    {
      ok: true,
      id: res.id,
      sha256: res.sha256,
      mediaUploaded: res.mediaUploaded,
      mediaStorageMode: res.mediaStorageMode,
      mediaUrl: res.mediaUrl,
      storageObjectPath: res.storageObjectPath,
      mediaBytes: res.mediaBytes,
      savedPostgresBytes: res.savedPostgresBytes,
      storageMode: res.storageMode,
    },
    201,
    { ...rlHeaders, "X-BSA-Sec63-Hash": res.sha256 }
  );
}
