import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

export type AgentTier = "MANAGEMENT" | "SUB_AGENT" | "MICRO_AGENT" | "CUSTOM";

export type ScopeDomainId =
  | "ALL_SCOPES"
  | "PRINCIPAL_ARCHITECT"
  | "SPATIAL_MILLIMETER_QA"
  | "STRUCTURAL_IS456"
  | "COMMERCIAL_ESCROW"
  | "SCHEDULE_SEQUENCE";

export interface HierarchicalAgentNode {
  id: string;
  tier: AgentTier;
  parentAgentId?: string;
  name: string;
  scope: ScopeDomainId;
  precisionSpec: string;
  mandate: string;
}

export interface SiteWrongdoingAlert {
  alertId: string;
  projectId: string;
  projectName: string;
  location: string;
  floorOrZone: string;
  scope: Exclude<ScopeDomainId, "ALL_SCOPES">;
  severity: "CRITICAL" | "HIGH" | "WATCH";
  deviationMetric: string;
  headline: string;
  detail: string;
  standardRef: string;
  financialImpactInr: number;
  deepLink: { label: string; href: string };
}

export interface PortfolioProjectNode {
  projectId: string;
  code: string;
  name: string;
  subtitle: string;
  location: string;
  architectLead: string;
  contractValueCr: number;
  retentionCr: number;
  certifiedCr: number;
  physicalPct: number;
  cpi: number;
  lidarRmsMm: number;
  status: "HOLD_ACTIVE" | "DEVIATION_FLAGGED" | "NOMINAL";
  activeAlerts: SiteWrongdoingAlert[];
}

export const SCOPE_DOMAINS: Array<{ id: ScopeDomainId; label: string }> = [
  { id: "ALL_SCOPES", label: "All Domains (360°)" },
  { id: "PRINCIPAL_ARCHITECT", label: "Principal Architect & GFC" },
  { id: "SPATIAL_MILLIMETER_QA", label: "Millimeter Spatial & LiDAR" },
  { id: "STRUCTURAL_IS456", label: "Structural & IS 456 QA" },
  { id: "COMMERCIAL_ESCROW", label: "Commercial & Escrow" },
  { id: "SCHEDULE_SEQUENCE", label: "CPM & Build Sequence" },
];

export const HIERARCHICAL_AGENT_MESH: HierarchicalAgentNode[] = [
  {
    id: "PRIME-COMMAND",
    tier: "MANAGEMENT",
    name: "PRIME-COMMAND (Portfolio Executive)",
    scope: "ALL_SCOPES",
    precisionSpec: "10-Site Cross-Correlation • 1.0 mm Floor",
    mandate: "Synthesizes anomalies, out-of-sequence builds, and financial liens across all 10 portfolio sites.",
  },
  {
    id: "MINERVA-ARCH",
    tier: "MANAGEMENT",
    name: "MINERVA-ARCH (Principal Architect)",
    scope: "PRINCIPAL_ARCHITECT",
    precisionSpec: "LOD-400 IFC / GFC Gridline Tolerance ±2.0 mm",
    mandate: "Guards architectural intent, facade/wall gridlines, spatial volumes, and Revit As-Built reconciliation.",
  },
  {
    id: "MIDAS-COMMERCIAL",
    tier: "MANAGEMENT",
    name: "MIDAS-COMMERCIAL (Escrow & QS)",
    scope: "COMMERCIAL_ESCROW",
    precisionSpec: "₹1 Precision • CPWD Cl. 42 & UP-LDA Escrow",
    mandate: "Couples physical BIM/QA deviations directly to RA bill payment freezes and retention ledgers.",
  },
  {
    id: "ARGUS-SPATIAL",
    tier: "SUB_AGENT",
    parentAgentId: "MINERVA-ARCH",
    name: "ARGUS-SPATIAL (4-Ray LiDAR/IR)",
    scope: "SPATIAL_MILLIMETER_QA",
    precisionSpec: "905nm LiDAR + LWIR + 24GHz mmWave (±1.8 mm RMS)",
    mandate: "Fuses 4-spectrum rays to detect millimeter structural drift, gypsum plenum cavities, and cardboard spoofs.",
  },
  {
    id: "VULCAN-STRUCT",
    tier: "SUB_AGENT",
    parentAgentId: "MINERVA-ARCH",
    name: "VULCAN-STRUCT (IS 456 / IS 800)",
    scope: "STRUCTURAL_IS456",
    precisionSpec: "0.01 MPa Core & Ultrasonic Pulse Velocity",
    mandate: "Enforces IS 456:2000 Cl. 17.4.3 cube/core thresholds, rebar cover, and concrete curing maturity.",
  },
  {
    id: "CHRONOS-CPM",
    tier: "SUB_AGENT",
    parentAgentId: "PRIME-COMMAND",
    name: "CHRONOS-CPM (Sequence Sentinel)",
    scope: "SCHEDULE_SEQUENCE",
    precisionSpec: "WBS Lookahead & Pour-Card Gate",
    mandate: "Flags walls, slabs, or MEP risers built ahead of sequence or out of approved GFC revision.",
  },
  {
    id: "μ-GRIDLINE-DELTA",
    tier: "MICRO_AGENT",
    parentAgentId: "ARGUS-SPATIAL",
    name: "μ-GRIDLINE-DELTA (mm Offset)",
    scope: "SPATIAL_MILLIMETER_QA",
    precisionSpec: "ΔX / ΔY / ΔZ Centerline Vector (1 mm)",
    mandate: "Computes exact millimeter offset between as-built wall/column faces and GFC CAD/BIM axes.",
  },
  {
    id: "μ-SEQUENCE-GUARD",
    tier: "MICRO_AGENT",
    parentAgentId: "CHRONOS-CPM",
    name: "μ-SEQUENCE-GUARD (Early Cast)",
    scope: "SCHEDULE_SEQUENCE",
    precisionSpec: "4D BIM Phase vs. Reality Capture",
    mandate: "Detects elements erected ahead of schedule without prerequisite MEP/structural sign-off.",
  },
  {
    id: "μ-LIEN-COUPLER",
    tier: "MICRO_AGENT",
    parentAgentId: "MIDAS-COMMERCIAL",
    name: "μ-LIEN-COUPLER (Kill Switch)",
    scope: "COMMERCIAL_ESCROW",
    precisionSpec: "Atomic Supabase Escrow Lock",
    mandate: "Automatically freezes contractor milestone payouts when a critical NCR or wall offset triggers.",
  },
];

export const PORTFOLIO_10_PROJECTS: PortfolioProjectNode[] = [
  {
    projectId: VANGUARD_GENOME.projectId,
    code: "PRJ-01",
    name: "Project Vanguard Commercial Hub",
    subtitle: "Gomti Nagar, Lucknow • 6-Bit Parametric Digital Twin & Institutional EPC",
    location: "Gomti Nagar Extension, Lucknow",
    architectLead: "Principal Architect Studio",
    contractValueCr: 864.5,
    retentionCr: 43.22,
    certifiedCr: 534.26,
    physicalPct: 61.8,
    cpi: 1.014,
    lidarRmsMm: 1.8,
    status: "HOLD_ACTIVE",
    activeAlerts: [
      {
        alertId: "NCR-2026-STR-042",
        projectId: VANGUARD_GENOME.projectId,
        projectName: "Project Vanguard Commercial Hub",
        location: "Gomti Nagar Extension, Lucknow",
        floorOrZone: "Tower A / BIT-4 – Level 3 Transfer Girder TG-03 (M50)",
        scope: "STRUCTURAL_IS456",
        severity: "CRITICAL",
        deviationMetric: "41.2 MPa Cube (< 46.0 MPa) + Honeycombing",
        headline: "Transfer Girder TG-03 Cube Break & Honeycombing Hold",
        detail: "28-day cube strength 41.2 MPa below M50 acceptance + post-deshuttering voids; ₹4,50,000 RA bill escrow lien locked.",
        standardRef: "IS 456:2000 Cl. 17.4.3",
        financialImpactInr: 450000,
        deepLink: { label: "Focus TG-03 in 3D BIM", href: "/site/digital-twin?zone=BIT-4-TG03&ncr=NCR-2026-STR-042" },
      },
      {
        alertId: "SNAG-VANGUARD-401",
        projectId: VANGUARD_GENOME.projectId,
        projectName: "Project Vanguard Commercial Hub",
        location: "Gomti Nagar Extension, Lucknow",
        floorOrZone: "BIT-2 Silver Dome – MERO Space-Frame Node #14B",
        scope: "SPATIAL_MILLIMETER_QA",
        severity: "WATCH",
        deviationMetric: "Δ 4.2 mm Radial Offset",
        headline: "BIT-2 Space-Frame Node #14B 4.2 mm Offset",
        detail: "Terrestrial LiDAR detected 4.2 mm radial displacement at Node #14B prior to Kalzip seam lock.",
        standardRef: "IS 800:2007 & EN 1090-2",
        financialImpactInr: 0,
        deepLink: { label: "Inspect BIT-2 Dome", href: "/site/digital-twin?zone=BIT-2-DOME" },
      },
    ],
  },
  {
    projectId: "LKO-SUMMIT-TOWER",
    code: "PRJ-02",
    name: "Summit Corporate Building",
    subtitle: "Vibhuti Khand, Gomti Nagar • 18-Storey Grade-A Commercial Tower",
    location: "Vibhuti Khand, Gomti Nagar, Lucknow",
    architectLead: "Principal Architect Studio",
    contractValueCr: 412.0,
    retentionCr: 20.6,
    certifiedCr: 223.3,
    physicalPct: 54.2,
    cpi: 0.992,
    lidarRmsMm: 1.6,
    status: "DEVIATION_FLAGGED",
    activeAlerts: [
      {
        alertId: "DEV-SUMMIT-12F-W04",
        projectId: "LKO-SUMMIT-TOWER",
        projectName: "Summit Corporate Building (Gomti Nagar)",
        location: "Vibhuti Khand, Gomti Nagar, Lucknow",
        floorOrZone: "12th Floor (+46.80m RL) • Grid B4–B7 Perimeter Wall",
        scope: "PRINCIPAL_ARCHITECT",
        severity: "CRITICAL",
        deviationMetric: "ΔX +1,000 mm (1.00 m) Offset • Cast 9d Early",
        headline: "12th Floor Wall Cast 1.00 m Off-Grid Ahead of Sequence",
        detail: "μ-GRIDLINE-DELTA & μ-SEQUENCE-GUARD detected Perimeter Wall W-04 on the 12th Floor erected 1,000 mm (1.00 m) outward from GFC Gridline B4–B7 and 9 days ahead of WBS schedule without MEP sleeve sign-off.",
        standardRef: "ISO 19650-2 GFC Control & IS 456 Cl. 11",
        financialImpactInr: 680000,
        deepLink: { label: "Open Spatial BIM Twin", href: "/site/digital-twin" },
      },
    ],
  },
  {
    projectId: "LKO-SHAHEED-SKYVILLAS",
    code: "PRJ-03",
    name: "Aurelia Sky-Villas & Club",
    subtitle: "Shaheed Path, Lucknow • High-Rise Residential Towers A & B",
    location: "Shaheed Path, Lucknow",
    architectLead: "Principal Architect Studio",
    contractValueCr: 340.0,
    retentionCr: 17.0,
    certifiedCr: 243.1,
    physicalPct: 71.5,
    cpi: 1.008,
    lidarRmsMm: 1.9,
    status: "DEVIATION_FLAGGED",
    activeAlerts: [
      {
        alertId: "DEV-AURELIA-08F-C11",
        projectId: "LKO-SHAHEED-SKYVILLAS",
        projectName: "Aurelia Sky-Villas & Club",
        location: "Shaheed Path, Lucknow",
        floorOrZone: "Tower B – 8th Floor Transfer Column C-11",
        scope: "SPATIAL_MILLIMETER_QA",
        severity: "HIGH",
        deviationMetric: "Δ 14.0 mm Plumbness Tilt",
        headline: "Column C-11 Verticality Drift of 14.0 mm at +28.4m RL",
        detail: "Exceeds IS 456 permissible column plumbness tolerance (10 mm); formwork jack realignment issued.",
        standardRef: "IS 456:2000 Cl. 11.1",
        financialImpactInr: 175000,
        deepLink: { label: "Open NDT & Quality", href: "/site/ndt" },
      },
    ],
  },
  {
    projectId: "LKO-SUSHANT-MEDTECH",
    code: "PRJ-04",
    name: "Sushant Med-Tech Innovation Park",
    subtitle: "Sushant Golf City, Lucknow • Tertiary Oncology & Diagnostics Block",
    location: "Sushant Golf City, Lucknow",
    architectLead: "Principal Architect Studio",
    contractValueCr: 525.0,
    retentionCr: 26.25,
    certifiedCr: 252.0,
    physicalPct: 48.0,
    cpi: 1.003,
    lidarRmsMm: 1.5,
    status: "DEVIATION_FLAGGED",
    activeAlerts: [
      {
        alertId: "SPOOF-MEDTECH-B1",
        projectId: "LKO-SUSHANT-MEDTECH",
        projectName: "Sushant Med-Tech Innovation Park",
        location: "Sushant Golf City, Lucknow",
        floorOrZone: "Basement-1 Radiology Wing • Partition P-09",
        scope: "SPATIAL_MILLIMETER_QA",
        severity: "HIGH",
        deviationMetric: "εr = 1.6 Dielectric Hollow Cavity",
        headline: "Cardboard/Board Edge Masking Caught Before Billing",
        detail: "24GHz mmWave radar flagged hollow dielectric signature (εr 1.6 vs 6.9 AAC masonry) behind crisp LiDAR corners.",
        standardRef: "CPWD GCC Cl. 42 & Multi-Ray Dielectric Audit",
        financialImpactInr: 220000,
        deepLink: { label: "Open Multi-Ray Twin", href: "/site/digital-twin" },
      },
    ],
  },
  {
    projectId: "LKO-HAZRATGANJ-HERITAGE",
    code: "PRJ-05",
    name: "Hazratganj Civic Arcade Retrofit",
    subtitle: "Central Hazratganj, Lucknow • Structural Strengthening & Facade Conservation",
    location: "Hazratganj, Lucknow",
    architectLead: "Principal Architect Studio",
    contractValueCr: 185.0,
    retentionCr: 9.25,
    certifiedCr: 154.29,
    physicalPct: 83.4,
    cpi: 1.021,
    lidarRmsMm: 1.4,
    status: "NOMINAL",
    activeAlerts: [],
  },
  {
    projectId: "LKO-AMAR-SHAHEED-IT",
    code: "PRJ-06",
    name: "Amar Shaheed Path FinTech Tower",
    subtitle: "Gomti Nagar Ext Sector-4 • 22-Storey Financial District Hub",
    location: "Gomti Nagar Ext Sector-4, Lucknow",
    architectLead: "Principal Architect Studio",
    contractValueCr: 610.0,
    retentionCr: 30.5,
    certifiedCr: 239.12,
    physicalPct: 39.2,
    cpi: 0.998,
    lidarRmsMm: 1.7,
    status: "DEVIATION_FLAGGED",
    activeAlerts: [
      {
        alertId: "SEQ-FINTECH-04F",
        projectId: "LKO-AMAR-SHAHEED-IT",
        projectName: "Amar Shaheed Path FinTech Tower",
        location: "Gomti Nagar Ext Sector-4, Lucknow",
        floorOrZone: "4th Floor Core Lift Lobby • Gypsum Soffit",
        scope: "SCHEDULE_SEQUENCE",
        severity: "WATCH",
        deviationMetric: "Gypsum Board Closed Before Chilled-Water Hydrotest",
        headline: "Ceiling Closed Out-of-Sequence Ahead of Hydrotest",
        detail: "CHRONOS-CPM flagged gypsum ceiling closure on 4F prior to 14-bar chilled-water riser pressure certification.",
        standardRef: "ISO 19650 ITP Hold-Point",
        financialImpactInr: 140000,
        deepLink: { label: "Open Master CPM", href: "/schedule/gantt" },
      },
    ],
  },
  {
    projectId: "LUCKNOW-TECHPARK-PH1",
    code: "PRJ-07",
    name: "Lucknow TechPark Phase-1",
    subtitle: "Sultanpur Road IT City • AI & Semiconductor Research Campus",
    location: "Sultanpur Road, Lucknow",
    architectLead: "Principal Architect Studio",
    contractValueCr: 740.0,
    retentionCr: 37.0,
    certifiedCr: 488.4,
    physicalPct: 66.0,
    cpi: 1.016,
    lidarRmsMm: 1.3,
    status: "NOMINAL",
    activeAlerts: [],
  },
  {
    projectId: "LKO-VRINDAVAN-CONVENTION",
    code: "PRJ-08",
    name: "Vrindavan Cultural & Expo Dome",
    subtitle: "Vrindavan Yojna, Lucknow • Long-Span Steel Convention Pavilion",
    location: "Vrindavan Yojna, Lucknow",
    architectLead: "Principal Architect Studio",
    contractValueCr: 295.0,
    retentionCr: 14.75,
    certifiedCr: 229.51,
    physicalPct: 77.8,
    cpi: 1.011,
    lidarRmsMm: 1.8,
    status: "NOMINAL",
    activeAlerts: [],
  },
  {
    projectId: "LKO-JANKIPURAM-BIOTECH",
    code: "PRJ-09",
    name: "Jankipuram Cleanroom Lab Complex",
    subtitle: "Jankipuram Extension, Lucknow • ISO Class-5 Bio-Pharma Facility",
    location: "Jankipuram Extension, Lucknow",
    architectLead: "Principal Architect Studio",
    contractValueCr: 230.0,
    retentionCr: 11.5,
    certifiedCr: 136.85,
    physicalPct: 59.5,
    cpi: 1.005,
    lidarRmsMm: 1.5,
    status: "NOMINAL",
    activeAlerts: [],
  },
  {
    projectId: "LKO-TRANSPORT-LOGISTICS",
    code: "PRJ-10",
    name: "Kanpur Road Automated Logistics Hub",
    subtitle: "Amausi / Kanpur Road • Multi-Modal Cold-Chain & Fulfillment Center",
    location: "Amausi / Kanpur Road, Lucknow",
    architectLead: "Principal Architect Studio",
    contractValueCr: 375.0,
    retentionCr: 18.75,
    certifiedCr: 330.38,
    physicalPct: 88.1,
    cpi: 1.019,
    lidarRmsMm: 2.0,
    status: "NOMINAL",
    activeAlerts: [],
  },
];

export function resolvePortfolioProject(rawId?: string | null): PortfolioProjectNode {
  if (!rawId) return PORTFOLIO_10_PROJECTS[0];
  const normalized = rawId.trim().toUpperCase();
  if (normalized === "GOMTI-NAGAR-PH1-FITOUT") return PORTFOLIO_10_PROJECTS[0];
  return (
    PORTFOLIO_10_PROJECTS.find(
      (p) => p.projectId.toUpperCase() === normalized || p.code.toUpperCase() === normalized
    ) || PORTFOLIO_10_PROJECTS[0]
  );
}

export function getAllPortfolioAlerts(
  projectIdFilter?: string,
  scopeFilter?: ScopeDomainId
): SiteWrongdoingAlert[] {
  const all = PORTFOLIO_10_PROJECTS.flatMap((p) => p.activeAlerts);
  return all.filter((a) => {
    const matchProj =
      !projectIdFilter || projectIdFilter === "ALL_10" || a.projectId === projectIdFilter;
    const matchScope =
      !scopeFilter || scopeFilter === "ALL_SCOPES" || a.scope === scopeFilter;
    return matchProj && matchScope;
  });
}
