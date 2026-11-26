import { NextRequest } from "next/server";
import { jsonError, jsonOk, readJsonBody } from "@/lib/server/http";
import { getGovernorState, saveGovernorState } from "@/lib/repositories/governorRepo";
import { appendGovernorEvent } from "@/lib/repositories/eventLedgerRepo";
import { getNotificationPrefs } from "@/lib/repositories/notificationRepo";
import { hydratePortfolioGovernorState } from "@/lib/domain/portfolioRegistry";
import {
  authorizeOperatorAction,
  buildRateLimitHeaders,
  checkRateLimit,
  extractClientIp,
  getDirectorPinStatus,
  getRbacStatus,
  rateLimitExceededResponse,
  type KineticActionType,
} from "@/lib/server/securityGuard";
import {
  COMPLIANT_TG03_FIXTURE,
  EXTREME_TG03_FIXTURE,
  type MolecularInput,
} from "@/lib/engines/molecularGovernor";

export const dynamic = "force-dynamic";

const VALID_ACTIONS = new Set<KineticActionType>([
  "FREEZE_RA_BILL_422",
  "REVOKE_CRANE_PTW",
  "REVOKE_STRIPPING_PTW",
  "ISSUE_CLAUSE42_RECOVERY",
  "CLEAR_FOR_RTGS",
]);

const KINETIC_RATE_POLICY = {
  bucket: "kinetic_actions",
  limit: 15,
  windowSec: 60,
};

export async function GET() {
  return jsonOk({
    ok: true,
    ...getDirectorPinStatus(),
    rbac: getRbacStatus(),
    rateLimitPolicy: KINETIC_RATE_POLICY,
    allowedActions: Array.from(VALID_ACTIONS),
  });
}

export async function POST(req: NextRequest) {
  const clientIp = extractClientIp(req);
  const rl = await checkRateLimit(clientIp, KINETIC_RATE_POLICY);
  if (!rl.allowed) {
    return rateLimitExceededResponse(rl);
  }
  const rlHeaders = buildRateLimitHeaders(rl);

  const body = await readJsonBody<{
    actionType?: KineticActionType;
    projectId?: string;
    role?: string;
    actor?: string;
    rationale?: string;
    directorPin?: string;
    pin?: string;
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

  // Step 1: Authenticate credentials first (401 on missing/wrong PIN, 400 on unknown role)
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
        pinRequired: authN.httpStatus === 401,
        role: authN.role,
        pinMode: authN.pinMode,
      },
      authN.httpStatus,
      rlHeaders
    );
  }

  if (!body.actionType || !VALID_ACTIONS.has(body.actionType)) {
    return jsonError(
      "Invalid or missing actionType. Allowed: FREEZE_RA_BILL_422, REVOKE_CRANE_PTW, REVOKE_STRIPPING_PTW, ISSUE_CLAUSE42_RECOVERY, CLEAR_FOR_RTGS",
      400
    );
  }

  // Step 2: Authorize role against actionType (403 FORBIDDEN on privilege escalation)
  const authZ = authorizeOperatorAction({
    role: suppliedRole,
    suppliedPin,
    actionType: body.actionType,
  });

  if (!authZ.authorized) {
    return jsonOk(
      {
        ok: false,
        error: authZ.reason || "Role is not permitted to execute this kinetic action.",
        rbacDenied: true,
        role: authZ.role,
        actionType: body.actionType,
        allowedActionsForRole: authZ.allowedActionsForRole,
      },
      authZ.httpStatus,
      rlHeaders
    );
  }

  const operatorRole = authZ.role!;
  const actor = (body.actor || `${operatorRole} (Executive War Room)`).trim().slice(0, 100);
  const rationale = (body.rationale || `Signed ${operatorRole} execution of ${body.actionType}`).trim().slice(0, 300);

  const rawLive = await getGovernorState(body.projectId);
  const live = hydratePortfolioGovernorState(body.projectId, rawLive);

  let nextInput: Partial<MolecularInput> = { ...live.input };
  let nextMode: "stress-test" | "compliant" | "custom" = live.mode;

  switch (body.actionType) {
    case "FREEZE_RA_BILL_422":
    case "REVOKE_STRIPPING_PTW":
    case "ISSUE_CLAUSE42_RECOVERY":
      nextInput = {
        ...EXTREME_TG03_FIXTURE,
        projectId: live.projectId,
        zoneId: live.input.zoneId,
        raBillNo: live.input.raBillNo,
      };
      nextMode = "stress-test";
      break;
    case "REVOKE_CRANE_PTW":
      nextInput = {
        ...live.input,
        projectId: live.projectId,
        windSpeedMs: Math.max(22.5, live.input.windSpeedMs),
      };
      nextMode = "custom";
      break;
    case "CLEAR_FOR_RTGS":
      nextInput = {
        ...COMPLIANT_TG03_FIXTURE,
        projectId: live.projectId,
        zoneId: live.input.zoneId,
        raBillNo: live.input.raBillNo,
      };
      nextMode = "compliant";
      break;
  }

  const saved = await saveGovernorState({
    projectId: live.projectId,
    mode: nextMode,
    input: nextInput,
  });

  const ledger = await appendGovernorEvent({
    projectId: saved.projectId,
    eventType: "KINETIC_ACTION",
    actor: `${actor} [${operatorRole}]`,
    source: "/api/actions/execute",
    mode: saved.mode,
    httpStatus: saved.snapshot.escrow.httpStatus,
    frozenInr: saved.snapshot.escrow.frozenInr,
    netReleaseInr: saved.snapshot.escrow.netCertifiedReleaseInr,
    violationCount: saved.snapshot.violations.length,
    diffJson: {
      actionType: body.actionType,
      operatorRole,
      rationale,
      pinMode: authZ.pinMode,
      zoneId: saved.input.zoneId,
      previousHttpStatus: live.snapshot.escrow.httpStatus,
      newHttpStatus: saved.snapshot.escrow.httpStatus,
      frozenInr: saved.snapshot.escrow.frozenInr,
      netCertifiedReleaseInr: saved.snapshot.escrow.netCertifiedReleaseInr,
    },
    snapshotHash: saved.snapshot.bsaSec63Ledger.rowHash,
  });

  const notif = await getNotificationPrefs();
  const armedChannels: string[] = [];
  if (notif.preferences.smsEnabled) armedChannels.push("SMS");
  if (notif.preferences.whatsappEnabled) armedChannels.push("WhatsApp");
  if (notif.preferences.emailEnabled) armedChannels.push("Email");
  if (notif.preferences.devicePushEnabled) armedChannels.push("DevicePush");

  return jsonOk(
    {
      ok: true,
      executedAction: body.actionType,
      role: operatorRole,
      actor,
      rationale,
      pinMode: authZ.pinMode,
      storageMode: saved.storageMode,
      state: {
        projectId: saved.projectId,
        projectName: live.project.name,
        zoneId: saved.input.zoneId,
        mode: saved.mode,
        httpStatus: saved.snapshot.escrow.httpStatus,
        frozenInr: saved.snapshot.escrow.frozenInr,
        clause42PenaltyInr: saved.snapshot.escrow.clause42PenaltyInr,
        netCertifiedReleaseInr: saved.snapshot.escrow.netCertifiedReleaseInr,
        violationCount: saved.snapshot.violations.length,
      },
      receipt: {
        seq: ledger.event.seq,
        chainHash: ledger.event.chainHash,
        bsaSec63Hash: saved.snapshot.bsaSec63Ledger.rowHash,
        recordedAtUtc: ledger.event.recordedAtUtc,
        certificateUrl: "/closeout/bsa-certificate",
        armedAlertChannels: armedChannels,
      },
    },
    200,
    {
      ...rlHeaders,
      "X-BSA-Sec63-Hash": saved.snapshot.bsaSec63Ledger.rowHash,
    }
  );
}
