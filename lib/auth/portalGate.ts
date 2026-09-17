import type { DashboardSnapshot, PaymentApplication, RfiRecord, CdeItem, ChangeOrderRecord, PortalRole } from "@/types/construction";

export type PortalWindow = "client" | "architect" | "contractor";

export const PORTAL_PERMISSIONS: Record<PortalRole, { canPublishGfc: boolean; canApproveChangeOrders: boolean; canCreateRfi: boolean; canRespondToRfi: boolean }> = {
  client: { canPublishGfc: true, canApproveChangeOrders: true, canCreateRfi: false, canRespondToRfi: true },
  architect: { canPublishGfc: true, canApproveChangeOrders: false, canCreateRfi: false, canRespondToRfi: true },
  contractor: { canPublishGfc: false, canApproveChangeOrders: false, canCreateRfi: true, canRespondToRfi: false },
};

export function canPublishGfc(role: PortalRole) {
  return PORTAL_PERMISSIONS[role].canPublishGfc;
}

export function canApproveChangeOrder(role: PortalRole) {
  return PORTAL_PERMISSIONS[role].canApproveChangeOrders;
}

export function canRespondToRfi(role: PortalRole, ballInCourt: RfiRecord["ballInCourt"]) {
  return PORTAL_PERMISSIONS[role].canRespondToRfi && (role === "client" ? ballInCourt === "Client" : role === "architect" && ["Consultant", "Designer"].includes(ballInCourt));
}

export const PORTAL_LABELS: Record<PortalWindow, string> = {
  client: "Client Executive Window",
  architect: "Architect Command Center",
  contractor: "Contractor Execution Hub",
};

export function resolvePortalWindow(pathname: string): PortalWindow {
  const segment = pathname.split("/").filter(Boolean)[1];
  if (segment === "architect") return "architect";
  if (segment === "contractor") return "contractor";
  return "client";
}

export function filterSnapshotForPortal(snapshot: DashboardSnapshot, portal: PortalWindow): DashboardSnapshot {
  switch (portal) {
    case "client":
      return {
        ...snapshot,
        cdeItems: (snapshot.cdeItems ?? []).filter((item) => item.state === "Published" && item.isLatest),
        rfis: [],
        rfcs: [],
        submittals: (snapshot.submittals ?? []).filter((item) => item.status === "Approved"),
        punchListItems: [],
        clashIssues: [],
        paymentApplications: (snapshot.paymentApplications ?? []).filter((item) => item.status === "Certified" || item.status === "Approved"),
        changeOrders: (snapshot.changeOrders ?? []).filter((item) => item.status === "AwaitingApproval"),
        customMilestones: (snapshot.customMilestones ?? []).filter((milestone) => milestone.status === "In_Progress" || milestone.status === "Under_Verification" || milestone.status === "Certified_Completed"),
        contractorMilestoneAllocations: [],
        milestoneVerificationRules: (snapshot.milestoneVerificationRules ?? []).filter((rule) => rule.is_verified),
      };
    case "architect":
      return {
        ...snapshot,
        cdeItems: snapshot.cdeItems ?? [],
        rfis: snapshot.rfis ?? [],
        rfcs: snapshot.rfcs ?? [],
        submittals: snapshot.submittals ?? [],
        punchListItems: snapshot.punchListItems ?? [],
        clashIssues: snapshot.clashIssues ?? [],
        paymentApplications: snapshot.paymentApplications ?? [],
      };
    case "contractor":
      return {
        ...snapshot,
        cdeItems: (snapshot.cdeItems ?? []).filter((item) => item.state === "Published" || item.state === "Shared"),
        rfis: snapshot.rfis ?? [],
        submittals: snapshot.submittals ?? [],
        punchListItems: snapshot.punchListItems ?? [],
        clashIssues: (snapshot.clashIssues ?? []).filter((issue) => issue.status === "Open"),
        paymentApplications: (snapshot.paymentApplications ?? []).filter((item) => item.status === "Draft" || item.status === "Approved"),
      };
    default:
      return snapshot;
  }
}

export function getClientExecutiveView(snapshot: DashboardSnapshot) {
  const milestoneList = snapshot.customMilestones ?? [];
  const certifiedBills = (snapshot.paymentApplications ?? []).filter((bill) => bill.status === "Certified" || bill.status === "Approved");
  const pendingApprovals = (snapshot.changeOrders ?? []).filter((order) => order.status === "AwaitingApproval");
  const approvedGfcPackages = (snapshot.cdeItems ?? []).filter((item) => item.state === "Published" && item.isLatest);
  const totalContractSum = certifiedBills.reduce((sum, bill) => sum + bill.scheduledValue, 0) + pendingApprovals.reduce((sum, order) => sum + order.amount, 0);
  const certifiedBilledAmount = certifiedBills.reduce((sum, bill) => sum + bill.currentWorkCompleted + bill.storedMaterials, 0);
  const withheldRetainage = certifiedBills.reduce((sum, bill) => sum + (bill.retainageWithheld ?? 0), 0);
  const netVariation = pendingApprovals.reduce((sum, order) => sum + order.amount, 0);

  return {
    milestones: milestoneList,
    certifiedBills,
    pendingApprovals,
    approvedGfcPackages,
    totalContractSum,
    certifiedBilledAmount,
    withheldRetainage,
    netVariation,
    photoWalkthrough: [
      { title: "Plinth Beam Cast", caption: "Approved by site engineer and structural consultant", image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80" },
      { title: "Brickwork 5th Floor", caption: "Progress verified by field inspection", image: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80" },
      { title: "Roof Slab Completion", caption: "Milestone cleared and archived in the CDE", image: "https://images.unsplash.com/photo-1512960201233-9b2cfad6d0f8?auto=format&fit=crop&w=1200&q=80" },
    ],
  };
}

export function getArchitectView(snapshot: DashboardSnapshot) {
  return {
    cdeItems: snapshot.cdeItems ?? [],
    activeRfis: snapshot.rfis ?? [],
    submittals: snapshot.submittals ?? [],
    clashIssues: snapshot.clashIssues ?? [],
    milestoneRules: snapshot.milestoneVerificationRules ?? [],
  };
}

export function getContractorView(snapshot: DashboardSnapshot) {
  return {
    gfcDrawings: (snapshot.cdeItems ?? []).filter((item) => item.state === "Published" && item.isLatest),
    activeQueries: snapshot.rfis ?? [],
    submittals: snapshot.submittals ?? [],
    cubeTests: (snapshot.materialTests ?? []) as Array<{ id: string; projectId: string; grade: string; targetStrengthMpa: number; sevenDayStrength: number; twentyEightDayStrength: number; status: "Pass" | "Fail" }>,
    snagItems: snapshot.punchListItems ?? [],
  };
}

export function getPortalAccessSummary(portal: PortalWindow) {
  const config: Record<PortalWindow, { headline: string; includes: string[]; excludes: string[] }> = {
    client: {
      headline: "Executive clarity only",
      includes: ["Verified milestone roadmap", "Certified billing summary", "Approved GFC packages", "Pending owner approvals"],
      excludes: ["RFI back-and-forth", "preliminary clash logs", "draft rejection notices"],
    },
    architect: {
      headline: "Design governance and technical coordination",
      includes: ["Shared and WIP CDE states", "RFI technical queries", "Submittal action codes", "quality certifications"],
      excludes: ["Client-only executive summaries"],
    },
    contractor: {
      headline: "Field execution operations",
      includes: ["GFC drawing locker", "RFI submitter", "material submittals", "cube test logger", "snag proof uploads"],
      excludes: ["Executive financial huddles"],
    },
  };

  return config[portal];
}
