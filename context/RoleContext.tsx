'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type RoleId = any;
export type ProjectTier = any;

export interface ProjectContextData {
  id: string;
  project_id: string;
  project_name: string;
  tier?: any;
  [key: string]: any;
}

export interface RoleContextType {
  role: any;
  setRole: (role: any) => void;
  roleId: any;
  setRoleId: (roleId: any) => void;
  activeRole?: any;
  setActiveRole?: (role: any) => void;
  project: ProjectContextData;
  setProject: (project: any) => void;
  activeProject?: ProjectContextData;
  setActiveProject?: (project: any) => void;
  tier?: any;
  [key: string]: any;
}

const DEFAULT_ROLE = {
  id: 'PMC_LEAD',
  label: 'PMC Lead / Superintending Engineer',
  category: 'ENGINEERING',
};

const DEFAULT_PROJECT: ProjectContextData = {
  id: "GOMTI-NAGAR-PH1-FITOUT",
  project_id: "GOMTI-NAGAR-PH1-FITOUT",
  project_name: 'Project 01 / Core Shell',
  tier: 'COMMERCIAL',
};

export const ROLES = [
  { id: 'PMC_LEAD', label: 'PMC Lead / Superintending Engineer', category: 'ENGINEERING' },
  { id: 'PRINCIPAL_ARCHITECT', label: 'Architect of Record', category: 'DESIGN' },
  { id: 'QA_QC_ENGINEER', label: 'Quality Assurance Lead', category: 'QUALITY' },
  { id: 'QS_BILLING', label: 'Quantity Surveyor / Auditor', category: 'FINANCE' },
  { id: 'CLIENT_EXECUTIVE', label: 'Client / Asset Owner', category: 'GOVERNANCE' },
  { id: 'SITE_ENGINEER', label: 'Site Superintendent', category: 'OPERATIONS' },
];

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<any>(DEFAULT_ROLE);
  const [project, setProject] = useState<ProjectContextData>(DEFAULT_PROJECT);

  const setRole = (r: any) => {
    if (typeof r === 'string') {
      const match = ROLES.find((item) => item.id === r);
      setRoleState(match || { id: r, label: r, category: 'GENERAL' });
    } else {
      setRoleState(r);
    }
  };

  const setRoleId = (id: any) => setRole(id);

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        roleId: role.id,
        setRoleId,
        activeRole: role,
        setActiveRole: setRole,
        project,
        setProject,
        activeProject: project,
        setActiveProject: setProject,
        tier: project.tier || 'COMMERCIAL',
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useActiveRole(): RoleContextType {
  const context = useContext(RoleContext);
  if (!context) {
    return {
      role: DEFAULT_ROLE,
      setRole: () => {},
      roleId: DEFAULT_ROLE.id,
      setRoleId: () => {},
      activeRole: DEFAULT_ROLE,
      setActiveRole: () => {},
      project: DEFAULT_PROJECT,
      setProject: () => {},
      activeProject: DEFAULT_PROJECT,
      setActiveProject: () => {},
      tier: 'COMMERCIAL',
    };
  }
  return context;
}

export const useRole = useActiveRole;
