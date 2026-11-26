import {
  PORTFOLIO_10_PROJECTS,
  type PortfolioProjectNode,
} from "@/lib/agents/portfolioSentinelMesh";
import {
  COMPLIANT_TG03_FIXTURE,
  EXTREME_TG03_FIXTURE,
  evaluateMolecularGovernor,
  type MolecularInput,
} from "@/lib/engines/molecularGovernor";

export interface PortfolioProjectSummary {
  projectId: string;
  code: string;
  name: string;
  subtitle: string;
  location: string;
  architectLead: string;
  contractValueCr: number;
  physicalPct: number;
  cpi: number;
  lidarRmsMm: number;
  status: PortfolioProjectNode["status"];
  activeAlertCount: number;
  defaultZoneId: string;
  defaultRaBillNo: string;
}

export interface PortfolioBaseline {
  project: PortfolioProjectNode;
  mode: "stress-test" | "compliant" | "custom";
  input: MolecularInput;
}

export function resolvePortfolioProject(projectId?: string | null): PortfolioProjectNode {
  const raw = (projectId || "").trim();
  if (!raw || raw.toUpperCase() === "GOMTI-NAGAR-PH1-FITOUT") {
    return PORTFOLIO_10_PROJECTS[0];
  }
  const match = PORTFOLIO_10_PROJECTS.find(
    (p) =>
      p.projectId.toLowerCase() === raw.toLowerCase() ||
      p.code.toLowerCase() === raw.toLowerCase()
  );
  if (match) return match;

  // Custom / ad-hoc project ID fallback (preserves isolated test/tenant IDs)
  return {
    ...PORTFOLIO_10_PROJECTS[0],
    projectId: raw,
    code: raw.slice(0, 12).toUpperCase(),
    name: `Site ${raw}`,
    subtitle: "Isolated Multi-Tenant Project Node",
  };
}

export function getPortfolioProjectBaseline(projectId?: string | null): PortfolioBaseline {
  const project = resolvePortfolioProject(projectId);

  // Preserve byte-for-byte canonical Vanguard fixture for zero regression
  if (project.projectId === EXTREME_TG03_FIXTURE.projectId) {
    return {
      project,
      mode: "stress-test",
      input: { ...EXTREME_TG03_FIXTURE },
    };
  }

  const isKnownPortfolio = PORTFOLIO_10_PROJECTS.some(
    (p) => p.projectId === project.projectId
  );

  if (!isKnownPortfolio) {
    return {
      project,
      mode: "stress-test",
      input: {
        ...EXTREME_TG03_FIXTURE,
        projectId: project.projectId,
      },
    };
  }

  const safeCode = project.code.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();

  if (project.status === "NOMINAL") {
    return {
      project,
      mode: "compliant",
      input: {
        ...COMPLIANT_TG03_FIXTURE,
        projectId: project.projectId,
        zoneId: `${safeCode}-Z01`,
        raBillNo: `RA-07/${safeCode}`,
      },
    };
  }

  if (project.status === "DEVIATION_FLAGGED") {
    return {
      project,
      mode: "custom",
      input: {
        ...COMPLIANT_TG03_FIXTURE,
        projectId: project.projectId,
        zoneId: `${safeCode}-L12`,
        raBillNo: `RA-11/${safeCode}`,
        windSpeedMs: 19.2, // Triggers IS 875 crane wind lockout distinct from full TG-03 cascade
      },
    };
  }

  return {
    project,
    mode: "stress-test",
    input: {
      ...EXTREME_TG03_FIXTURE,
      projectId: project.projectId,
      zoneId: `${safeCode}-CRIT-01`,
      raBillNo: `RA-14/${safeCode}`,
    },
  };
}

export function listPortfolioProjects(): PortfolioProjectSummary[] {
  return PORTFOLIO_10_PROJECTS.map((p) => {
    const baseline = getPortfolioProjectBaseline(p.projectId);
    return {
      projectId: p.projectId,
      code: p.code,
      name: p.name,
      subtitle: p.subtitle,
      location: p.location,
      architectLead: p.architectLead,
      contractValueCr: p.contractValueCr,
      physicalPct: p.physicalPct,
      cpi: p.cpi,
      lidarRmsMm: p.lidarRmsMm,
      status: p.status,
      activeAlertCount: p.activeAlerts.length,
      defaultZoneId: baseline.input.zoneId,
      defaultRaBillNo: baseline.input.raBillNo,
    };
  });
}

/**
 * Ensures non-Vanguard portfolio sites hydrate with their authentic baseline
 * before their first explicit DB write, while immediately honoring persisted overrides.
 */
export function hydratePortfolioGovernorState<
  T extends {
    projectId: string;
    mode: "stress-test" | "compliant" | "custom";
    input: MolecularInput;
    snapshot: ReturnType<typeof evaluateMolecularGovernor>;
  }
>(requestedProjectId: string | undefined, repoState: T): T & { project: PortfolioProjectNode } {
  const baseline = getPortfolioProjectBaseline(requestedProjectId || repoState.projectId);
  const isNonVanguard = baseline.project.projectId !== EXTREME_TG03_FIXTURE.projectId;
  const stillHasDefaultVanguardSeed =
    isNonVanguard &&
    repoState.input.zoneId === EXTREME_TG03_FIXTURE.zoneId &&
    repoState.input.raBillNo === EXTREME_TG03_FIXTURE.raBillNo &&
    repoState.mode === "stress-test";

  if (!stillHasDefaultVanguardSeed) {
    return { ...repoState, project: baseline.project };
  }

  return {
    ...repoState,
    projectId: baseline.project.projectId,
    mode: baseline.mode,
    input: baseline.input,
    snapshot: evaluateMolecularGovernor(baseline.input),
    project: baseline.project,
  };
}
