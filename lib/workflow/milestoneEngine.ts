import type { CustomMilestone, MilestoneVerificationRule, ContractorMilestoneAllocation } from "@/types/construction";

export interface MilestoneEvaluationResult {
  canAdvance: boolean;
  status: "Pending" | "In_Progress" | "Under_Verification" | "Certified_Completed";
  reason: string;
  missingMandatoryChecks: string[];
}

export function evaluateMilestoneCompletion(
  milestone: Pick<CustomMilestone, "status" | "title">,
  rules: MilestoneVerificationRule[],
  allocations: ContractorMilestoneAllocation[],
): MilestoneEvaluationResult {
  const mandatoryRules = rules.filter((rule) => rule.is_mandatory);
  const missingMandatoryChecks = mandatoryRules
    .filter((rule) => !rule.is_verified)
    .map((rule) => `${rule.verification_type} (${rule.description})`);

  if (allocations.length === 0) {
    return {
      canAdvance: false,
      status: "Pending",
      reason: `${milestone.title} cannot advance because no contractor allocation is assigned for this scope package.`,
      missingMandatoryChecks: ["No contractor allocation assigned"],
    };
  }

  if (mandatoryRules.length > 0 && missingMandatoryChecks.length > 0) {
    return {
      canAdvance: false,
      status: "Under_Verification",
      reason: `${milestone.title} is blocked by mandatory verification gates that remain incomplete.`,
      missingMandatoryChecks,
    };
  }

  return {
    canAdvance: true,
    status: "Certified_Completed",
    reason: `${milestone.title} has met all mandatory verification gates and is ready for certification.`,
    missingMandatoryChecks: [],
  };
}
