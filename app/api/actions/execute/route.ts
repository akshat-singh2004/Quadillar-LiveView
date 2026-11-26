import { NextRequest } from "next/server";
import { jsonError, jsonOk, readJsonBody } from "@/lib/server/http";
import { getGovernorState, saveGovernorState } from "@/lib/repositories/governorRepo";
import { appendGovernorEvent } from "@/lib/repositories/eventLedgerRepo";
import { getNotificationPrefs } from "@/lib/repositories/notificationRepo";
import {
  COMPLIANT_TG03_FIXTURE,
  EXTREME_TG03_FIXTURE,
  type MolecularInput,
} from "@/lib/engines/molecularGovernor";

export const dynamic = "force-dynamic";

type KineticActionType =
  | "FREEZE_RA_BILL_422"
  | "REVOKE_CRANE_PTW"
  | "REVOKE_STRIPPING_PTW"
  | "ISSUE_CLAUSE42_RECOVERY"
  | "CLEAR_FOR_RTGS";

const VALID_ACTIONS = new Set<KineticActionType>([
  "FREEZE_RA_BILL_422",
  "REVOKE_CRANE_PTW",
  "REVOKE_STRIPPING_PTW",
  "ISSUE_CLAUSE42_RECOVERY",
  "CLEAR_FOR_RTGS",
]);

export async function POST(req: NextRequest) {
  const body = await readJsonBody<{
    actionType?: KineticActionType;
    projectId?: string;
    actor?: string;
    rationale?: string;
  }>(req);

  if (!body || !body.actionType || !VALID_ACTIONS.has(body.actionType)) {
    return jsonError(
      "Invalid or missing actionType. Allowed: FREEZE_RA_BILL_422, REVOKE_CRANE_PTW, REVOKE_STRIPPING_PTW, ISSUE_CLAUSE42_RECOVERY, CLEAR_FOR_RTGS",
      400
    );
  }

  const actor = (body.actor || "Director (Executive War Room)").trim().slice(0, 100);
  const rationale = (body.rationale || `Signed execution of ${body.actionType}`).trim().slice(0, 300);
  const live = await getGovernorState(body.projectId);

  let nextInput: Partial<MolecularInput> = { ...live.input };
  let nextMode: "stress-test" | "compliant" | "custom" = live.mode;

  switch (body.actionType) {
    case "FREEZE_RA_BILL_422":
    case "REVOKE_STRIPPING_PTW":
    case "ISSUE_CLAUSE42_RECOVERY":
      nextInput = { ...EXTREME_TG03_FIXTURE, projectId: live.projectId };
      nextMode = "stress-test";
      break;
    case "REVOKE_CRANE_PTW":
      nextInput = { ...live.input, windSpeedMs: Math.max(22.5, live.input.windSpeedMs) };
      nextMode = "custom";
      break;
    case "CLEAR_FOR_RTGS":
      nextInput = { ...COMPLIANT_TG03_FIXTURE, projectId: live.projectId };
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
    actor,
    source: "/api/actions/execute",
    mode: saved.mode,
    httpStatus: saved.snapshot.escrow.httpStatus,
    frozenInr: saved.snapshot.escrow.frozenInr,
    netReleaseInr: saved.snapshot.escrow.netCertifiedReleaseInr,
    violationCount: saved.snapshot.violations.length,
    diffJson: {
      actionType: body.actionType,
      rationale,
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
      actor,
      rationale,
      storageMode: saved.storageMode,
      state: {
        projectId: saved.projectId,
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
    { "X-BSA-Sec63-Hash": saved.snapshot.bsaSec63Ledger.rowHash }
  );
}
