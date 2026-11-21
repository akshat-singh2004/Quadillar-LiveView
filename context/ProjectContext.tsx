"use client";

import React, { createContext, useContext, useCallback } from "react";
import {
  PORTFOLIO_10_PROJECTS,
  PortfolioProjectNode,
} from "@/lib/agents/portfolioSentinelMesh";

const PRIMARY_PROJECT: PortfolioProjectNode = PORTFOLIO_10_PROJECTS[0];

interface ProjectContextValue {
  activeProjectId: string;
  activeProject: PortfolioProjectNode;
  allProjects: PortfolioProjectNode[];
  selectProject: (projectId: string) => void;
  registerProject: (node: PortfolioProjectNode) => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  activeProjectId: PRIMARY_PROJECT.projectId,
  activeProject: PRIMARY_PROJECT,
  allProjects: [PRIMARY_PROJECT],
  selectProject: () => {},
  registerProject: () => {},
});

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const selectProject = useCallback((_nextId: string) => {
    // Single-project mode locked to PRJ-01: Project Vanguard Commercial Hub
  }, []);

  const registerProject = useCallback((_node: PortfolioProjectNode) => {
    // Single-project mode locked to PRJ-01: Project Vanguard Commercial Hub
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        activeProjectId: PRIMARY_PROJECT.projectId,
        activeProject: PRIMARY_PROJECT,
        allProjects: [PRIMARY_PROJECT],
        selectProject,
        registerProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useActiveProject() {
  return useContext(ProjectContext);
}

export function useProject() {
  return useContext(ProjectContext);
}
