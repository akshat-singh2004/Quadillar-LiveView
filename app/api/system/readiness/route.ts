import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/server/http";
import {
  buildRateLimitHeaders,
  checkRateLimit,
  extractClientIp,
  rateLimitExceededResponse,
} from "@/lib/server/securityGuard";
import { evaluateCutoverReadiness } from "@/lib/server/cutoverReadiness";

export const dynamic = "force-dynamic";

const READINESS_RATE_POLICY = {
  bucket: "system_cutover_readiness",
  limit: 30,
  windowSec: 60,
};

export async function GET(req: NextRequest) {
  const rl = await checkRateLimit(extractClientIp(req), READINESS_RATE_POLICY);
  if (!rl.allowed) return rateLimitExceededResponse(rl);

  const readiness = evaluateCutoverReadiness(process.env);
  return jsonOk(
    {
      ok: true,
      service: "quadillar-liveview-cutover-readiness",
      releaseTrack: "v2.5.0-cutover-hardened",
      readiness,
    },
    200,
    {
      ...buildRateLimitHeaders(rl),
      "Cache-Control": "no-store",
    }
  );
}
