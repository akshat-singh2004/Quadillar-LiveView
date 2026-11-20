"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  PORTFOLIO_10_PROJECTS,
  PortfolioProjectNode,
  resolvePortfolioProject,
} from "@/lib/agents/portfolioSentinelMesh";

const ACTIVE_PROJECT_KEY = "quadillar-active-project-v2";
const CUSTOM_PROJECTS_KEY = "quadillar-custom-projects-v1";

interface ProjectContextValue {
  activeProjectId: string;
  activeProject: PortfolioProjectNode;
  allProjects: PortfolioProjectNode[];
  selectProject: (projectId: string) => void;
  registerProject: (node: PortfolioProjectNode) => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  activeProjectId: PORTFOLIO_10_PROJECTS[0].projectId,
  activeProject: PORTFOLIO_10_PROJECTS[0],
  allProjects: PORTFOLIO_10_PROJECTS,
  selectProject: () => {},
  registerProject: () => {},
});

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [customProjects, setCustomProjects] = useState<PortfolioProjectNode[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>(
    PORTFOLIO_10_PROJECTS[0].projectId
  );

  const allProjects = [...PORTFOLIO_10_PROJECTS, ...customProjects];

  useEffect(() => {
    try {
      const savedCustom = localStorage.getItem(CUSTOM_PROJECTS_KEY);
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed)) setCustomProjects(parsed);
      }

      const params = new URLSearchParams(window.location.search);
      const urlProj = params.get("project_id");
      if (urlProj) {
        setActiveProjectId(urlProj);
        localStorage.setItem(ACTIVE_PROJECT_KEY, urlProj);
        return;
      }

      const saved = localStorage.getItem(ACTIVE_PROJECT_KEY);
      if (saved) setActiveProjectId(saved);
    } catch {}
  }, []);

  const selectProject = useCallback(
    (nextId: string) => {
      setActiveProjectId(nextId);
      try {
        localStorage.setItem(ACTIVE_PROJECT_KEY, nextId);
        window.dispatchEvent(new CustomEvent("quadillar-project-change", { detail: nextId }));
      } catch {}

      try {
        const params = new URLSearchParams(window.location.search);
        params.set("project_id", nextId);
        router.replace(`${pathname}?${params.toString()}`);
      } catch {}
    },
    [pathname, router]
  );

  const registerProject = useCallback((node: PortfolioProjectNode) => {
    setCustomProjects((prev) => {
      const filtered = prev.filter((p) => p.projectId !== node.projectId);
      const next = [node, ...filtered];
      try {
        localStorage.setItem(CUSTOM_PROJECTS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setActiveProjectId(node.projectId);
    try {
      localStorage.setItem(ACTIVE_PROJECT_KEY, node.projectId);
    } catch {}
  }, []);

  const activeProject =
    allProjects.find((p) => p.projectId.toUpperCase() === activeProjectId.toUpperCase()) ||
    resolvePortfolioProject(activeProjectId);

  return (
    <ProjectContext.Provider
      value={{
        activeProjectId: activeProject.projectId,
        activeProject,
        allProjects,
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
