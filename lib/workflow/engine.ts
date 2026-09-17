import type {
  CdeItem,
  CdeState,
  ChangeOrderRecord,
  ContractImpact,
  MaterialTestLog,
  PhaseInspectionGate,
  RfiRecord,
  RfcRecord,
} from "@/types/construction";

export const CDE_STATE_ORDER: CdeState[] = ["WIP", "Shared", "Published", "Archived"];

export interface PromotionGateResult {
  allowed: boolean;
  reason: string;
  nextState: CdeState;
  requiredChecks: string[];
}

export interface SlaFloatResult {
  elapsedHours: number;
  floatHours: number;
  floatDays: number;
  status: "Healthy" | "AtRisk" | "Breached";
  percentConsumed: number;
}

export const STATE_PROMOTION_RULES: Record<CdeState, { required: string[] }> = {
  WIP: { required: ["draft_created"] },
  Shared: { required: ["document_reviewed", "approval_ready"] },
  Published: { required: ["shared_release_accepted", "is_latest_true"] },
  Archived: { required: ["published_recorded", "retention_period_met"] },
};

export function canPromoteCdeItem(
  item: Pick<CdeItem, "state" | "approved" | "isLatest" | "metadata" | "status">,
  targetState: CdeState,
): PromotionGateResult {
  const currentIndex = CDE_STATE_ORDER.indexOf(item.state);
  const targetIndex = CDE_STATE_ORDER.indexOf(targetState);

  if (targetIndex < currentIndex) {
    return {
      allowed: false,
      reason: "State demotion is not allowed through the workflow engine.",
      nextState: targetState,
      requiredChecks: ["workflow_demotion_blocked"],
    };
  }

  const requiredChecks = STATE_PROMOTION_RULES[targetState]?.required ?? [];
  const checks: Record<string, boolean> = {
    draft_created: true,
    document_reviewed: item.status === "InReview" || item.status === "Approved",
    approval_ready: item.approved,
    shared_release_accepted: item.state === "Shared" || item.approved,
    is_latest_true: item.isLatest,
    published_recorded: item.state === "Published",
    retention_period_met: item.state === "Published" && item.metadata?.retentionPeriodMet === true,
  };

  const failed = requiredChecks.filter((check) => !checks[check]);

  return {
    allowed: failed.length === 0,
    reason:
      failed.length === 0
        ? `${item.state} can advance to ${targetState}.`
        : `Missing required checks: ${failed.join(", ")}.`,
    nextState: targetState,
    requiredChecks: requiredChecks,
  };
}

export function evaluateRfiEscalation(
  rfi: Pick<RfiRecord, "status" | "contractImpact" | "riskScore" | "dueAt" | "submittedAt" | "ballInCourt">,
  now = new Date(),
): { decision: "monitor" | "escalate" | "close"; reason: string; score: number } {
  if (rfi.status === "Closed") {
    return { decision: "close", reason: "RFI has already been closed.", score: 0 };
  }

  const timeToDueHours = Math.max(
    0,
    (new Date(rfi.dueAt).getTime() - now.getTime()) / (1000 * 60 * 60),
  );

  let score = rfi.riskScore;
  if (rfi.contractImpact === "CostAndTime") score += 25;
  else if (rfi.contractImpact === "Cost" || rfi.contractImpact === "Time") score += 15;
  if (timeToDueHours < 24) score += 20;
  if (rfi.ballInCourt === "Client") score += 10;

  score = Math.min(score, 100);

  if (score >= 75 || rfi.contractImpact !== "None") {
    return {
      decision: "escalate",
      reason: "Contractual or schedule impact warrants RFC escalation.",
      score,
    };
  }

  if (rfi.status === "PendingResponse") {
    return {
      decision: "monitor",
      reason: "Response is pending but risk remains below escalation threshold.",
      score,
    };
  }

  return {
    decision: "monitor",
    reason: "The RFI remains within acceptable workflow limits.",
    score,
  };
}

export function calculateSlaFloatErosion(
  startedAtUtc: string,
  dueAtUtc: string,
  now = new Date(),
  slaHours = 72,
): SlaFloatResult {
  const start = new Date(startedAtUtc).getTime();
  const due = new Date(dueAtUtc).getTime();
  const current = now.getTime();

  const elapsedHours = Math.max(0, (current - start) / (1000 * 60 * 60));
  const floatHours = slaHours - elapsedHours;
  const floatDays = floatHours / 24;

  const percentConsumed = Math.min(100, (elapsedHours / slaHours) * 100);

  let status: SlaFloatResult["status"] = "Healthy";
  if (floatHours <= 0) status = "Breached";
  else if (floatHours <= 24) status = "AtRisk";

  return {
    elapsedHours: Number(elapsedHours.toFixed(2)),
    floatHours: Number(floatHours.toFixed(2)),
    floatDays: Number(floatDays.toFixed(2)),
    status,
    percentConsumed: Number(percentConsumed.toFixed(1)),
  };
}

export function deriveChangeOrderFromRfc(
  rfc: Pick<RfcRecord, "id" | "projectId" | "title" | "description" | "rfiId" | "potentialCost" | "potentialDelayDays" | "contractImpact">,
): Pick<ChangeOrderRecord, "id" | "projectId" | "title" | "description" | "rfcId" | "status" | "amount" | "timeImpactDays" | "createdAt" | "approvalDueAt"> {
  const status: ChangeOrderRecord["status"] =
    rfc.contractImpact === "None" ? "Draft" : "AwaitingApproval";

  return {
    id: `${rfc.id}-co`,
    projectId: rfc.projectId,
    title: `Change Order - ${rfc.title}`,
    description: rfc.description,
    rfcId: rfc.id,
    status,
    amount: Number((rfc.potentialCost ?? 0).toFixed(2)),
    timeImpactDays: Math.max(0, rfc.potentialDelayDays ?? 0),
    createdAt: new Date().toISOString(),
    approvalDueAt: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
  };
}

export function evaluateMaterialTestResult(
  test: Pick<MaterialTestLog, "targetStrengthMpa" | "sevenDayStrength" | "twentyEightDayStrength">,
): { status: "Pass" | "Fail"; reason: string } {
  const sevenDayTarget = test.targetStrengthMpa * 0.65;
  const twentyEightDayTarget = test.targetStrengthMpa * 0.99;

  const passes =
    test.sevenDayStrength >= sevenDayTarget &&
    test.twentyEightDayStrength >= twentyEightDayTarget;

  return {
    status: passes ? "Pass" : "Fail",
    reason: passes
      ? "Concrete strength achieved the required design and curing thresholds."
      : "Concrete strength is below the minimum approved threshold for this phase.",
  };
}

export function evaluatePhaseInspectionGate(
  gate: Pick<PhaseInspectionGate, "inspectionPassStatus" | "isMandatory" | "isClosed" | "phaseName">,
): { allowed: boolean; reason: string; lockStatus: "Open" | "Locked" } {
  if (gate.isClosed) {
    return { allowed: true, reason: `${gate.phaseName} is already closed and locked.`, lockStatus: "Locked" };
  }

  if (gate.isMandatory && !gate.inspectionPassStatus) {
    return {
      allowed: false,
      reason: `${gate.phaseName} is blocked because the mandatory inspection has not passed.`,
      lockStatus: "Locked",
    };
  }

  return {
    allowed: true,
    reason: `${gate.phaseName} is ready to proceed to the next lifecycle phase.`,
    lockStatus: "Open",
  };
}
