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

export type GovernorSnapshot = ReturnType<typeof evaluateMolecularGovernor>;

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

export interface PortfolioSiteRollupItem {
  projectId: string;
  code: string;
  name: string;
  location: string;
  contractValueCr: number;
  httpStatus: number;
  frozenInr: number;
  clause42PenaltyInr: number;
  netCertifiedReleaseInr: number;
  violationCount: number;
  hasCraneWindLockout: boolean;
  storageMode: string;
}

export interface PortfolioRollupSummary {
  totalSites: number;
  totalContractValueCr: number;
  totalFrozenInr: number;
  totalClause42PenaltyInr: number;
  totalNetCertifiedReleaseInr: number;
  lockedEscrowSites: number;
  ptwWarningSites: number;
  nominalSites: number;
  sites: PortfolioSiteRollupItem[];
}

export function resolvePortfolioProject(projectId?: string | null): PortfolioProjectNode {
  const raw = (projectId || "").trim();
  const upper = raw.toUpperCase();
  const primary = PORTFOLIO_10_PROJECTS[0];

  // Canonical Vanguard alias normalization (eliminates ad-hoc fallback for VANGUARD-LKO-01)
  if (
    !raw ||
    upper === "GOMTI-NAGAR-PH1-FITOUT" ||
    upper === EXTREME_TG03_FIXTURE.projectId.toUpperCase() ||
    upper === primary.projectId.toUpperCase() ||
    upper === primary.code.toUpperCase()
  ) {
    return {
      ...primary,
      projectId: EXTREME_TG03_FIXTURE.projectId,
    };
  }

  const match = PORTFOLIO_10_PROJECTS.find(
    (p) =>
      p.projectId.toLowerCase() === raw.toLowerCase() ||
      p.code.toLowerCase() === raw.toLowerCase()
  );
  if (match) return match;

  // Isolated ad-hoc / multi-tenant project fallback
  return {
    ...primary,
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
        windSpeedMs: 19.2,
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
  return PORTFOLIO_10_PROJECTS.map((p, idx) => {
    const normalizedId = idx === 0 ? EXTREME_TG03_FIXTURE.projectId : p.projectId;
    const baseline = getPortfolioProjectBaseline(normalizedId);
    return {
      projectId: normalizedId,
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

export function hydratePortfolioGovernorState<
  T extends {
    projectId: string;
    mode: "stress-test" | "compliant" | "custom";
    input: MolecularInput;
    snapshot: GovernorSnapshot;
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
    return { ...repoState, projectId: baseline.project.projectId, project: baseline.project };
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

export function computePortfolioRollup(
  entries: Array<{
    project: PortfolioProjectNode;
    snapshot: GovernorSnapshot;
    storageMode: string;
  }>
): PortfolioRollupSummary {
  let totalContractValueCr = 0;
  let totalFrozenInr = 0;
  let totalClause42PenaltyInr = 0;
  let totalNetCertifiedReleaseInr = 0;
  let lockedEscrowSites = 0;
  let ptwWarningSites = 0;
  let nominalSites = 0;

  const sites: PortfolioSiteRollupItem[] = entries.map(({ project, snapshot, storageMode }) => {
    const httpStatus = snapshot.escrow.httpStatus;
    const violationCount = snapshot.violations.length;
    const hasCraneWindLockout = snapshot.violations.some((v) => v.code === "CRANE_WIND_LOCKOUT");

    totalContractValueCr += project.contractValueCr;
    totalFrozenInr += snapshot.escrow.frozenInr;
    totalClause42PenaltyInr += snapshot.escrow.clause42PenaltyInr;
    totalNetCertifiedReleaseInr += snapshot.escrow.netCertifiedReleaseInr;

    if (httpStatus === 422) {
      lockedEscrowSites++;
    } else if (violationCount > 0) {
      ptwWarningSites++;
    } else {
      nominalSites++;
    }

    return {
      projectId: project.projectId,
      code: project.code,
      name: project.name,
      location: project.location,
      contractValueCr: project.contractValueCr,
      httpStatus,
      frozenInr: snapshot.escrow.frozenInr,
      clause42PenaltyInr: snapshot.escrow.clause42PenaltyInr,
      netCertifiedReleaseInr: snapshot.escrow.netCertifiedReleaseInr,
      violationCount,
      hasCraneWindLockout,
      storageMode,
    };
  });

  return {
    totalSites: sites.length,
    totalContractValueCr: Math.round(totalContractValueCr * 100) / 100,
    totalFrozenInr: Math.round(totalFrozenInr),
    totalClause42PenaltyInr: Math.round(totalClause42PenaltyInr),
    totalNetCertifiedReleaseInr: Math.round(totalNetCertifiedReleaseInr),
    lockedEscrowSites,
    ptwWarningSites,
    nominalSites,
    sites,
  };
}
