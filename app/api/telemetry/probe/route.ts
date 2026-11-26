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
  DEMO_DEFAULT_IOT_SECRET,
  HARDWARE_PROBE_CATALOG,
  buildHardwareProbePayload,
  isValidHardwareProbeType,
  signIotPayload,
} from "@/lib/domain/iotTelemetryBridge";
import { resolvePortfolioProject } from "@/lib/domain/portfolioRegistry";
import { POST as ingestTelemetry } from "@/app/api/telemetry/ingress/route";

export const dynamic = "force-dynamic";

const PROBE_RATE_POLICY = {
  bucket: "iot_hardware_probe",
  limit: 20,
  windowSec: 60,
};

export async function GET() {
  return jsonOk({
    ok: true,
    signingMode: "server_side_hmac_sha256",
    permittedRoles: ["DIRECTOR", "SITE_ENGINEER"],
    rateLimitPolicy: PROBE_RATE_POLICY,
    probes: HARDWARE_PROBE_CATALOG,
  });
}

export async function POST(req: NextRequest) {
  const clientIp = extractClientIp(req);
  const rl = await checkRateLimit(clientIp, PROBE_RATE_POLICY);
  if (!rl.allowed) return rateLimitExceededResponse(rl);
  const rlHeaders = buildRateLimitHeaders(rl);

  const body = await readJsonBody<{
    probeType?: string;
    projectId?: string;
    role?: string;
    pin?: string;
    directorPin?: string;
    applyToGovernor?: boolean;
  }>(req);

  if (!body) {
    return jsonError("Invalid JSON request body.", 400);
  }

  const suppliedRole = req.headers.get("x-operator-role") || body.role || "DIRECTOR";
  const suppliedPin =
    req.headers.get("x-operator-pin") ||
    req.headers.get("x-director-pin") ||
    body.pin ||
    body.directorPin;

  // Step 1: Authenticate operator (401/400)
  const authN = authorizeOperatorAction({
    role: suppliedRole,
    suppliedPin,
    actionType: null,
  });
  if (!authN.authorized) {
    return jsonOk(
      {
        ok: false,
        error: authN.reason || "Operator authorization PIN required.",
        role: authN.role,
      },
      authN.httpStatus,
      rlHeaders
    );
  }

  // Step 2: RBAC check — AUDITOR is strictly read-only (403)
  if (authN.role === "AUDITOR") {
    return jsonOk(
      {
        ok: false,
        rbacDenied: true,
        role: "AUDITOR",
        error: "RBAC FORBIDDEN: Role AUDITOR is strictly read-only and cannot trigger hardware probes.",
      },
      403,
      rlHeaders
    );
  }

  if (!isValidHardwareProbeType(body.probeType)) {
    return jsonError(
      `Invalid probeType. Allowed: ${HARDWARE_PROBE_CATALOG.map((p) => p.probeType).join(", ")}`,
      400
    );
  }

  const project = resolvePortfolioProject(body.projectId);
  const payload = buildHardwareProbePayload(
    body.probeType,
    project.projectId,
    body.applyToGovernor !== false
  );
  const rawBody = JSON.stringify(payload);
  const nowSec = Math.floor(Date.now() / 1000);
  const secret = process.env.IOT_INGRESS_SECRET?.trim() || DEMO_DEFAULT_IOT_SECRET;
  const sig = signIotPayload(rawBody, nowSec, secret);

  // Execute the real HMAC-authenticated /api/telemetry/ingress pipeline in-process
  const internalReq = new Request("https://internal.quadillar.local/api/telemetry/ingress", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-iot-timestamp": String(nowSec),
      "x-iot-signature": `sha256=${sig}`,
      "x-forwarded-for": clientIp,
    },
    body: rawBody,
  });

  const ingressRes = await ingestTelemetry(internalReq);
  const ingressJson = await ingressRes.json().catch(() => ({}));

  return jsonOk(
    {
      ok: ingressRes.ok,
      probeType: body.probeType,
      projectId: project.projectId,
      projectName: project.name,
      operatorRole: authN.role,
      signedOnServer: true,
      hmacPrefix: sig.slice(0, 16),
      ingressStatus: ingressRes.status,
      ingress: ingressJson,
    },
    ingressRes.ok ? 200 : ingressRes.status,
    rlHeaders
  );
}
