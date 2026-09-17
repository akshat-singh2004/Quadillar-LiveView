import type { DashboardSnapshot } from "@/types/construction";

export interface IntegrityCheckItem {
  title: string;
  passed: boolean;
  detail: string;
}

export interface IntegrityCheckResult {
  passed: boolean;
  summary: string;
  checks: IntegrityCheckItem[];
}

export function checkProjectIntegrity(snapshot: DashboardSnapshot): IntegrityCheckResult {
  const checks: IntegrityCheckItem[] = [];

  const openRfis = (snapshot.rfis ?? []).filter((item) => item.status !== "Closed" && item.status !== "Answered");
  checks.push({
    title: "Open RFI status",
    passed: openRfis.length === 0,
    detail: openRfis.length === 0 ? "No unresolved RFIs remain in the active queue." : `${openRfis.length} open or unresolved RFIs remain.`,
  });

  const pendingChangeOrders = (snapshot.changeOrders ?? []).filter((item) => item.status !== "Approved" && item.status !== "Rejected" && item.status !== "Executed");
  checks.push({
    title: "Change order execution status",
    passed: pendingChangeOrders.length === 0,
    detail: pendingChangeOrders.length === 0 ? "All change orders are executed or closed." : `${pendingChangeOrders.length} change orders remain pending owner execution.`,
  });

  const unresolvedCriticalPunches = (snapshot.punchListItems ?? []).filter(
    (item) => item.priority === "High Priority" && item.rectificationStatus !== "Closed",
  );
  checks.push({
    title: "Critical punch defects",
    passed: unresolvedCriticalPunches.length === 0,
    detail: unresolvedCriticalPunches.length === 0 ? "No unresolved critical defects remain in occupied spaces." : `${unresolvedCriticalPunches.length} critical defects remain open.`,
  });

  const mandatoryRules = (snapshot.milestoneVerificationRules ?? []).filter((rule) => rule.is_mandatory);
  const failedMandatoryRules = mandatoryRules.filter((rule) => !rule.is_verified);
  checks.push({
    title: "Mandatory quality inspection gates",
    passed: failedMandatoryRules.length === 0,
    detail: failedMandatoryRules.length === 0 ? "All mandatory verification gates are complete and signed." : `${failedMandatoryRules.length} mandatory gates are still unverified.`,
  });

  const passed = checks.every((check) => check.passed);

  return {
    passed,
    summary: passed
      ? "Project integrity audit passed. The project is ready for statutory close-out review."
      : "Project integrity audit failed. Close-out packages are blocked by unresolved open issues.",
    checks,
  };
}
