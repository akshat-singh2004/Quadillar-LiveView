"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

export type ProjectTier = "RESIDENTIAL" | "COMMERCIAL" | "INFRASTRUCTURE";

export type RoleId = 
  | "PRINCIPAL_ARCHITECT"
  | "PMC_LEAD"
  | "SITE_ENGINEER"
  | "QA_QC_ENGINEER"
  | "QS_BILLING"
  | "CLIENT_EXECUTIVE"
  | "TRADE_CONTRACTOR";

export interface RoleConfig {
  id: RoleId;
  label: string;
  category: "Design" | "Management" | "Site" | "Commercial" | "Client";
  defaultWorkspace: "actions" | "cde" | "site" | "governance";
}

export const ROLES: Record<RoleId, RoleConfig> = {
  PRINCIPAL_ARCHITECT: { id: "PRINCIPAL_ARCHITECT", label: "Principal Architect", category: "Design", defaultWorkspace: "cde" },
  PMC_LEAD: { id: "PMC_LEAD", label: "PMC Project Lead", category: "Management", defaultWorkspace: "actions" },
  SITE_ENGINEER: { id: "SITE_ENGINEER", label: "Resident Site Engineer", category: "Site", defaultWorkspace: "site" },
  QA_QC_ENGINEER: { id: "QA_QC_ENGINEER", label: "QA/QC Inspector", category: "Site", defaultWorkspace: "site" },
  QS_BILLING: { id: "QS_BILLING", label: "Quantity Surveyor (QS)", category: "Commercial", defaultWorkspace: "governance" },
  CLIENT_EXECUTIVE: { id: "CLIENT_EXECUTIVE", label: "Client / Asset Owner", category: "Client", defaultWorkspace: "governance" },
  TRADE_CONTRACTOR: { id: "TRADE_CONTRACTOR", label: "Specialty Contractor", category: "Site", defaultWorkspace: "site" },
};

export interface ProjectOption {
  id: string;
  name: string;
  tier: ProjectTier;
}

export const REGISTERED_PROJECTS: ProjectOption[] = [
  { id: "PRJ-1BHK-GOMTI", name: "1BHK Gomti Nagar Fit-Out", tier: "RESIDENTIAL" },
  { id: "PRJ-LKO-TOWER-A", name: "Tower A Core & Shell", tier: "COMMERCIAL" },
  { id: "PRJ-GOVT-TERMINAL", name: "Airport Terminal Expansion", tier: "INFRASTRUCTURE" },
];

interface RoleContextValue {
  role: RoleConfig;
  setRoleId: (id: RoleId) => void;
  project: ProjectOption;
  setProjectId: (id: string) => void;
  tier: ProjectTier;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [roleId, setRoleIdState] = useState<RoleId>("PRINCIPAL_ARCHITECT");
  const [projectId, setProjectIdState] = useState<string>("PRJ-LKO-TOWER-A");

  useEffect(() => {
    const savedRole = localStorage.getItem("ql_role") as RoleId;
    const savedPrj = localStorage.getItem("ql_project_id");
    if (savedRole && ROLES[savedRole]) setRoleIdState(savedRole);
    if (savedPrj && REGISTERED_PROJECTS.some((p) => p.id === savedPrj)) setProjectIdState(savedPrj);
  }, []);

  const setRoleId = (id: RoleId) => {
    setRoleIdState(id);
    localStorage.setItem("ql_role", id);
    window.dispatchEvent(new CustomEvent("quadillar-role-changed", { detail: { roleId: id } }));
  };

  const setProjectId = (id: string) => {
    setProjectIdState(id);
    localStorage.setItem("ql_project_id", id);
    window.dispatchEvent(new CustomEvent("quadillar-project-changed", { detail: { projectId: id } }));
  };

  const project = useMemo(() => {
    return REGISTERED_PROJECTS.find((p) => p.id === projectId) || REGISTERED_PROJECTS[1];
  }, [projectId]);

  const value = useMemo(() => ({
    role: ROLES[roleId],
    setRoleId,
    project,
    setProjectId,
    tier: project.tier,
  }), [roleId, project]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useActiveRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useActiveRole must be used within a RoleProvider");
  return ctx;
}