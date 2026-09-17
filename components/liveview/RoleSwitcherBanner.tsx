"use client";

import React, { type ReactNode } from "react";
import { useActiveRole, RoleId } from "@/context/RoleContext";

export type ConTechRole =
  | "PMC_ENGINEER"
  | "QA_QC_ENGINEER"
  | "SAFETY_OFFICER"
  | "QS_ENGINEER"
  | "SITE_ENGINEER"
  | "CONTRACTOR"
  | "CLIENT_ADMIN"
  | "ARCHITECT"
  | "PMC_LEAD";

export interface RoleContextValue {
  role: ConTechRole;
  contractor?: string;
  setRole: (role: ConTechRole) => void;
  canApprovePour: boolean;
  canCertifyRA: boolean;
  canSignStripping: boolean;
  canIssuePTW: boolean;
}

// Map between unified RoleId and legacy ConTechRole
const roleToConTechMap: Record<RoleId, ConTechRole> = {
  PRINCIPAL_ARCHITECT: "ARCHITECT",
  PMC_LEAD: "PMC_LEAD",
  SITE_ENGINEER: "SITE_ENGINEER",
  QA_QC_ENGINEER: "QA_QC_ENGINEER",
  QS_BILLING: "QS_ENGINEER",
  CLIENT_EXECUTIVE: "CLIENT_ADMIN",
  TRADE_CONTRACTOR: "CONTRACTOR",
};

const conTechToRoleMap: Record<ConTechRole, RoleId> = {
  ARCHITECT: "PRINCIPAL_ARCHITECT",
  PMC_LEAD: "PMC_LEAD",
  PMC_ENGINEER: "PMC_LEAD",
  SITE_ENGINEER: "SITE_ENGINEER",
  SAFETY_OFFICER: "SITE_ENGINEER",
  QA_QC_ENGINEER: "QA_QC_ENGINEER",
  QS_ENGINEER: "QS_BILLING",
  CLIENT_ADMIN: "CLIENT_EXECUTIVE",
  CONTRACTOR: "TRADE_CONTRACTOR",
};

/**
 * Transparent passthrough wrapper so legacy layout imports
 * do not create a redundant, competing React context.
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useRoleController(): RoleContextValue {
  const { role, setRoleId } = useActiveRole();
  const conTechRole = roleToConTechMap[role.id] ?? "ARCHITECT";

  return {
    role: conTechRole,
    contractor: conTechRole === "CONTRACTOR" ? "Apex Structural Works" : undefined,
    setRole: (next: ConTechRole) => {
      const unifiedId = conTechToRoleMap[next] ?? "PRINCIPAL_ARCHITECT";
      setRoleId(unifiedId);
    },
    canApprovePour: role.id === "PMC_LEAD" || role.id === "QA_QC_ENGINEER" || role.id === "PRINCIPAL_ARCHITECT",
    canCertifyRA: role.id === "PMC_LEAD" || role.id === "QS_BILLING" || role.id === "CLIENT_EXECUTIVE",
    canSignStripping: role.id === "PMC_LEAD" || role.id === "SITE_ENGINEER" || role.id === "QA_QC_ENGINEER",
    canIssuePTW: role.id === "PMC_LEAD" || role.id === "SITE_ENGINEER",
  };
}

export function useRole(): Omit<RoleContextValue, "setRole"> {
  const controller = useRoleController();
  return {
    role: controller.role,
    contractor: controller.contractor,
    canApprovePour: controller.canApprovePour,
    canCertifyRA: controller.canCertifyRA,
    canSignStripping: controller.canSignStripping,
    canIssuePTW: controller.canIssuePTW,
  };
}

/**
 * Renders null so the legacy amber simulator bar remains suppressed
 * while keeping existing page imports functional.
 */
export function RoleSwitcherBanner() {
  return null;
}