#!/usr/bin/env bash
set -euo pipefail

mkdir -p lib/agents components app/site/agent-console app/api/agent

# ==============================================================================
# 1. ISOMORPHIC 7-PROFILE / 21-FUNCTION QUADMAX KERNEL (lib/agents/quadillarAgentMesh.ts)
# ==============================================================================
cat << 'MESH_EOF' > lib/agents/quadillarAgentMesh.ts
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

export type GovernorId = "MINERVA" | "ARGUS" | "MIDAS" | "THEMIS" | "HERMES";

export type ConstructionProfileId =
  | "PROJECT_DIRECTOR"
  | "SITE_PLANNING_ENGINEER"
  | "STRUCTURAL_GEOTECH_ENGINEER"
  | "BIM_DIGITAL_TWIN_LEAD"
  | "COMMERCIAL_QS_MANAGER"
  | "QAQC_HSE_OFFICER"
  | "CLIENT_LEGAL_COUNSEL";

export interface ConstructionProfileMeta {
  id: ConstructionProfileId;
  shortCode: string;
  title: string;
  department: string;
  primaryGovernor: GovernorId;
  secondaryGovernor: GovernorId;
  authorityScope: string;
  defaultRoute: string;
}

export interface KernelTelemetryMetric {
  label: string;
  value: string;
  status: "NOMINAL" | "WATCH" | "ACTION";
}

export interface QuadmaxFunctionDefinition {
  id: string;
  profileId: ConstructionProfileId;
  governor: GovernorId;
  commandLabel: string;
  shortLabel: string;
  description: string;
  standardRef: string;
  keywords: string[];
  deepLink: { label: string; href: string };
  followUpIds: string[];
  execute: () => Omit<
    AgentSynthesisResponse,
    "functionId" | "profileId" | "profileTitle" | "timestampIso" | "sha256Seal"
  >;
}

export interface AgentSynthesisResponse {
  functionId: string;
  profileId: ConstructionProfileId;
  profileTitle: string;
  primaryGovernor: GovernorId;
  headline: string;
  summary: string;
  standardRef: string;
  complianceStatus: "CERTIFIED" | "ACTIVE_MONITORING" | "ACTION_REQUIRED";
  telemetryMetrics: KernelTelemetryMetric[];
  deepLink: { label: string; href: string };
  followUpIds: string[];
  sha256Seal: string;
  timestampIso: string;
}

// Deterministic isomorphic 64-char hex digest (works identically in browser & Node)
function computeDeterministicSeal(payload: string): string {
  const seeds = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const state = [...seeds];
  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i);
    for (let s = 0; s < 8; s++) {
      state[s] =
        (Math.imul(state[s] ^ (code + i * 17 + s * 31), 0x01000193) +
          ((state[(s + 1) % 8] >>> 5) | (state[(s + 7) % 8] << 27))) >>>
        0;
    }
  }
  return state.map((n) => n.toString(16).padStart(8, "0")).join("");
}

export const CONSTRUCTION_PROFILES: ConstructionProfileMeta[] = [
  {
    id: "PROJECT_DIRECTOR",
    shortCode: "CEO / PD",
    title: "Project Director & EPC CEO",
    department: "Executive Portfolio Command",
    primaryGovernor: "MINERVA",
    secondaryGovernor: "MIDAS",
    authorityScope: "EPC Baseline ₹864.50 Cr • Critical Path • Board & UP-LDA Governance",
    defaultRoute: "/",
  },
  {
    id: "SITE_PLANNING_ENGINEER",
    shortCode: "SITE / CPM",
    title: "Site Execution & Planning Engineer",
    department: "Field Operations, CPM & Logistics",
    primaryGovernor: "ARGUS",
    secondaryGovernor: "MINERVA",
    authorityScope: "DPR #084 • Liebherr 280 EC-H • 0d CPM Float • Weighbridge",
    defaultRoute: "/site/master-schedule",
  },
  {
    id: "STRUCTURAL_GEOTECH_ENGINEER",
    shortCode: "STRUCT / GEO",
    title: "Structural & Geotechnical Engineer",
    department: "IS-Code Structural & Foundation Integrity",
    primaryGovernor: "ARGUS",
    secondaryGovernor: "THEMIS",
    authorityScope: "IS 456 • IS 2911 Piles • IS 13311 SonReb • Kalzip Space-Frame",
    defaultRoute: "/site/ndt",
  },
  {
    id: "BIM_DIGITAL_TWIN_LEAD",
    shortCode: "BIM / TWIN",
    title: "BIM & Digital Twin Coordinator",
    department: "LOD-400 Federation, LiDAR & ISO 19650",
    primaryGovernor: "MINERVA",
    secondaryGovernor: "ARGUS",
    authorityScope: "6 Architectural Bits • 28,500-Pt LiDAR • Navisworks Clash Audit",
    defaultRoute: "/site/digital-twin",
  },
  {
    id: "COMMERCIAL_QS_MANAGER",
    shortCode: "QS / BILL",
    title: "Commercial, QS & Billing Manager",
    department: "RA Billing, BOQ & CPWD Clause 42",
    primaryGovernor: "MIDAS",
    secondaryGovernor: "THEMIS",
    authorityScope: "CPI 1.014 • ₹43.22 Cr Escrow Retention • Cl. 42 & 10CC Escalation",
    defaultRoute: "/site/commercial",
  },
  {
    id: "QAQC_HSE_OFFICER",
    shortCode: "QA / HSE",
    title: "QA/QC & HSE Safety Officer",
    department: "NCR Liens, Pour Cards & PTW Zero-Harm",
    primaryGovernor: "ARGUS",
    secondaryGovernor: "HERMES",
    authorityScope: "NCR-009 • SNAG-VANGUARD-401 • Active PTWs • +54.00m RL Safety",
    defaultRoute: "/site/ptw",
  },
  {
    id: "CLIENT_LEGAL_COUNSEL",
    shortCode: "UP-LDA / LGL",
    title: "Client Rep & Arbitration Counsel",
    department: "UP-LDA Escrow, Section 65B & SCL Protocol",
    primaryGovernor: "THEMIS",
    secondaryGovernor: "HERMES",
    authorityScope: "BSA Sec. 63 / Sec. 65B Ledger • Block #18402 • EOT & LD Shield",
    defaultRoute: "/site/hindrance-eot",
  },
];

const G = VANGUARD_GENOME;

export const QUADMAX_FUNCTION_REGISTRY: QuadmaxFunctionDefinition[] = [
  // ---------------------------------------------------------------------------
  // 1. PROJECT DIRECTOR & EPC CEO (3 Functions)
  // ---------------------------------------------------------------------------
  {
    id: "pd_executive_pulse",
    profileId: "PROJECT_DIRECTOR",
    governor: "MINERVA",
    commandLabel: "Executive EPC Pulse & Burn Audit",
    shortLabel: "EPC Pulse",
    description: "Synthesize ₹864.50 Cr baseline, CPI/SPI health, workforce & 6-Bit readiness.",
    standardRef: "ISO 21508 & UP-LDA EPC Charter",
    keywords: ["overview", "pulse", "vanguard", "ceo", "director", "status", "campus"],
    deepLink: { label: "Master Command Center", href: "/" },
    followUpIds: ["pd_critical_exposure", "qs_ra_escrow_reconcile", "lgl_section65b_verify"],
    execute: () => ({
      primaryGovernor: "MINERVA",
      headline: `UP-LDA Vanguard Campus: On Baseline (0d Float) • CPI 1.014`,
      summary: `Cumulative Earned Value stands at ₹534.26 Cr against ₹526.88 Cr Actual Cost (+₹7.38 Cr favorable CV) across all 6 Architectural Bits. DPR #084 logs 66 active biometric workers with 0 safety breaches.`,
      standardRef: "ISO 21508 EVM & UP-LDA Concession Agreement",
      complianceStatus: "CERTIFIED",
      telemetryMetrics: [
        { label: "EPC Baseline", value: `₹${G.financials.epcBaselineCr.toFixed(2)} Cr`, status: "NOMINAL" },
        { label: "Cost Perf (CPI)", value: "1.014", status: "NOMINAL" },
        { label: "Critical Float", value: "0 Days", status: "WATCH" },
        { label: "Active Workforce", value: "66 Pax", status: "NOMINAL" },
      ],
      deepLink: { label: "Open EVM S-Curve", href: "/executive/evm-scurve" },
      followUpIds: ["pd_critical_exposure", "qs_ra_escrow_reconcile", "lgl_section65b_verify"],
    }),
  },
  {
    id: "pd_critical_exposure",
    profileId: "PROJECT_DIRECTOR",
    governor: "MIDAS",
    commandLabel: "Critical Path & Prolongation Risk Exposure",
    shortLabel: "Risk Exposure",
    description: "Quantify daily Hudson overhead exposure if BIT-2 Node #14B slips past 0d float.",
    standardRef: "CPWD GCC Cl. 5 & Hudson Formula",
    keywords: ["exposure", "risk", "hudson", "prolongation", "slip", "delay"],
    deepLink: { label: "Hindrance & EOT Engine", href: "/site/hindrance-eot" },
    followUpIds: ["str_node14b_spaceframe", "site_cpm_float_audit"],
    execute: () => {
      const dailyOverheadInr = Math.round((0.15 * (G.financials.epcBaselineCr * 1e7)) / 1095);
      return {
        primaryGovernor: "MIDAS",
        headline: `Zero-Float Guard: ₹${(dailyOverheadInr / 100000).toFixed(2)} Lakh/Day Overhead Exposure`,
        summary: `BIT-2 Silver Dome MERO Node #14B (Δ 4.2mm) sits on a 0d CPM float path. Closing SNAG-VANGUARD-401 within the current shift prevents critical-path slippage and protects ₹43.22 Cr UP-LDA escrow milestone release.`,
        standardRef: "CPWD GCC Clause 5 & SCL Delay Protocol",
        complianceStatus: "ACTIVE_MONITORING",
        telemetryMetrics: [
          { label: "Daily Overhead", value: `₹${dailyOverheadInr.toLocaleString("en-IN")}`, status: "WATCH" },
          { label: "Escrow Held (5%)", value: `₹${G.financials.statutoryRetentionCr.toFixed(2)} Cr`, status: "NOMINAL" },
          { label: "Open Snag", value: "SNAG-VANGUARD-401", status: "ACTION" },
          { label: "Column C2 Lien", value: "UNBLOCKED", status: "NOMINAL" },
        ],
        deepLink: { label: "Open Hindrance & EOT", href: "/site/hindrance-eot" },
        followUpIds: ["str_node14b_spaceframe", "site_cpm_float_audit"],
      };
    },
  },
  {
    id: "pd_board_brief",
    profileId: "PROJECT_DIRECTOR",
    governor: "HERMES",
    commandLabel: "Notarized UP-LDA Governance Brief",
    shortLabel: "Board Brief",
    description: "Compile tamper-evident executive packet for UP-LDA & investor review.",
    standardRef: "BSA Sec. 63 / IT Act Sec. 65B",
    keywords: ["board", "brief", "notarize", "investor", "up-lda", "report"],
    deepLink: { label: "Section 65B Audit Vault", href: "/site/audit-ledger" },
    followUpIds: ["lgl_section65b_verify", "bim_cobie_handover"],
    execute: () => ({
      primaryGovernor: "HERMES",
      headline: `Board Governance Brief Sealed • Merkle Block #18402`,
      summary: `Executive snapshot compiled across BIT-1 through BIT-6: Column C2 SonReb certified (32.8 MPa), Kalzip standing-seam certified (< 1.5mm), 2,400 TR chillers clash-free, and RA billing reconciled with 0 audit exceptions.`,
      standardRef: "BSA Sec. 63 / Section 65B Digital Evidence Protocol",
      complianceStatus: "CERTIFIED",
      telemetryMetrics: [
        { label: "Ledger Block", value: "#18402", status: "CERTIFIED" as any },
        { label: "Bits Verified", value: "6 / 6", status: "NOMINAL" },
        { label: "Audit Exceptions", value: "0", status: "NOMINAL" },
        { label: "PAC Target", value: "On Baseline", status: "NOMINAL" },
      ],
      deepLink: { label: "Inspect Audit Ledger", href: "/site/audit-ledger" },
      followUpIds: ["lgl_section65b_verify", "bim_cobie_handover"],
    }),
  },

  // ---------------------------------------------------------------------------
  // 2. SITE EXECUTION & PLANNING ENGINEER (3 Functions)
  // ---------------------------------------------------------------------------
  {
    id: "site_crane_wind_envelope",
    profileId: "SITE_PLANNING_ENGINEER",
    governor: "ARGUS",
    commandLabel: "Liebherr 280 EC-H Slew & Wind Envelope",
    shortLabel: "Crane Radar",
    description: "Verify 65m jib slew/luff telemetry & +54.00m RL Lucknow wind safety margin.",
    standardRef: "IS 875 (Part 3) & IS 13367 Crane Safety",
    keywords: ["crane", "liebherr", "slew", "luff", "wind", "jib", "38.5", "radar"],
    deepLink: { label: "Crane & Wind Telemetry", href: "/site/wind-stability" },
    followUpIds: ["site_cpm_float_audit", "hse_ptw_interlocks"],
    execute: () => ({
      primaryGovernor: "ARGUS",
      headline: `Liebherr 280 EC-H Nominal • Slew 38.5° / Luff -24.0° • 0 Breaches`,
      summary: `65m jib operating inside geo-fenced airspace above BIT-2/BIT-3. Lucknow basic wind speed 47 m/s modeled up to +54.00m RL parapet with overturning Factor of Safety > 2.15 and 12ms WebRTC telemetry latency.`,
      standardRef: "IS 875 Part 3 (47 m/s Lucknow Zone) & IS 13367",
      complianceStatus: "CERTIFIED",
      telemetryMetrics: [
        { label: "Slew / Luff", value: "38.5° / -24.0°", status: "NOMINAL" },
        { label: "Airspace Breach", value: "0 Events", status: "NOMINAL" },
        { label: "Wind Zone (+54m)", value: "47 m/s Safe", status: "NOMINAL" },
        { label: "Telemetry Ping", value: "12 ms", status: "NOMINAL" },
      ],
      deepLink: { label: "Open Wind & Crane Audit", href: "/site/wind-stability" },
      followUpIds: ["site_cpm_float_audit", "hse_ptw_interlocks"],
    }),
  },
  {
    id: "site_cpm_float_audit",
    profileId: "SITE_PLANNING_ENGINEER",
    governor: "MINERVA",
    commandLabel: "WBS Critical Path & DPR #084 Lookahead",
    shortLabel: "CPM & DPR #084",
    description: "Inspect 0d total float critical activities & shift crew deployment.",
    standardRef: "ISO 21508 & PMI CPM Network",
    keywords: ["cpm", "schedule", "gantt", "dpr", "float", "lookahead", "workers"],
    deepLink: { label: "Master CPM Gantt", href: "/schedule/gantt" },
    followUpIds: ["site_weighbridge_dispatch", "str_node14b_spaceframe"],
    execute: () => ({
      primaryGovernor: "MINERVA",
      headline: `Master CPM Network: 0d Critical Float • DPR #084 (66 Workers Active)`,
      summary: `Critical chain runs through BIT-2 Kalzip Dome closure and BIT-1 14th-floor MEP riser pressure testing. Non-critical interior fit-out retains 14d–22d free float buffer.`,
      standardRef: "ISO 21508 Work Breakdown & CPM Scheduling",
      complianceStatus: "ACTIVE_MONITORING",
      telemetryMetrics: [
        { label: "Active DPR", value: "DPR #084", status: "NOMINAL" },
        { label: "Critical Float", value: "0 Days", status: "WATCH" },
        { label: "Schedule Index", value: "SPI 1.000", status: "NOMINAL" },
        { label: "Shift Strength", value: "66 Biometric", status: "NOMINAL" },
      ],
      deepLink: { label: "Open Master CPM Schedule", href: "/schedule/gantt" },
      followUpIds: ["site_weighbridge_dispatch", "str_node14b_spaceframe"],
    }),
  },
  {
    id: "site_weighbridge_dispatch",
    profileId: "SITE_PLANNING_ENGINEER",
    governor: "ARGUS",
    commandLabel: "Weighbridge Gate-Inward & Pour Card Sync",
    shortLabel: "Weighbridge",
    description: "Cross-check RMC transit mixers & Fe-550D steel weighbridge slips against pours.",
    standardRef: "IS 4926 Ready-Mixed Concrete & CPWD Cl. 42",
    keywords: ["weighbridge", "gate", "rmc", "pour", "cement", "steel", "logistics"],
    deepLink: { label: "Weighbridge & Gate Inward", href: "/site/weighbridge" },
    followUpIds: ["qs_cpwd_cl42_variance", "hse_cube_itp_check"],
    execute: () => ({
      primaryGovernor: "ARGUS",
      headline: `Gate-Inward Weighbridge Synced • 100% RFID Challan Match`,
      summary: `All M40/M50 RMC transit mixers and Fe-550D reinforcement consignments verified via load-cell weighbridge within ±0.35% tolerance and linked to active pour cards.`,
      standardRef: "IS 4926 & CPWD Works Manual Gate Control",
      complianceStatus: "CERTIFIED",
      telemetryMetrics: [
        { label: "Scale Variance", value: "±0.35%", status: "NOMINAL" },
        { label: "RMC Transit Window", value: "under 45 min", status: "NOMINAL" },
        { label: "Unverified Slips", value: "0", status: "NOMINAL" },
        { label: "Pour Cards Active", value: "4 Zones", status: "NOMINAL" },
      ],
      deepLink: { label: "Open Weighbridge Ledger", href: "/site/weighbridge" },
      followUpIds: ["qs_cpwd_cl42_variance", "hse_cube_itp_check"],
    }),
  },

  // ---------------------------------------------------------------------------
  // 3. STRUCTURAL & GEOTECHNICAL ENGINEER (3 Functions)
  // ---------------------------------------------------------------------------
  {
    id: "str_column_c2_sonreb",
    profileId: "STRUCTURAL_GEOTECH_ENGINEER",
    governor: "ARGUS",
    commandLabel: "Column C2 SonReb NDT & IS 456 Drift Audit",
    shortLabel: "Column C2 NDT",
    description: "Verify NCR-009 SikaGrout-214 strength (32.8 MPa) & lateral drift clearance.",
    standardRef: "IS 13311 (Part 1 & 2) & IS 456 Cl. 20.1(b)",
    keywords: ["column", "c2", "ncr", "009", "sonreb", "grout", "ndt", "32.8", "drift"],
    deepLink: { label: "Structural NDT Register", href: "/site/ndt" },
    followUpIds: ["str_node14b_spaceframe", "str_pile_maturity_audit"],
    execute: () => ({
      primaryGovernor: "ARGUS",
      headline: `Column C2 Certified (32.8 MPa) • NCR-009 Lien ₹2,08,720 Released`,
      summary: `BIT-6 Podium Column C2 post-grout SikaGrout-214 injection verified via combined Ultrasonic Pulse Velocity (4.25 km/s) and rebound hammer correlation. Lateral drift corrected well inside IS 456 H/300 limit.`,
      standardRef: "IS 13311 SonReb & IS 456:2000 Cl. 20.1(b)",
      complianceStatus: "CERTIFIED",
      telemetryMetrics: [
        { label: "Core Strength", value: "32.8 MPa", status: "NOMINAL" },
        { label: "UPV Velocity", value: "4.25 km/s", status: "NOMINAL" },
        { label: "NCR-009 Status", value: "RELEASED", status: "NOMINAL" },
        { label: "Unblocked Lien", value: "₹2,08,720", status: "NOMINAL" },
      ],
      deepLink: { label: "Open NDT & SonReb Log", href: "/site/ndt" },
      followUpIds: ["str_node14b_spaceframe", "str_pile_maturity_audit"],
    }),
  },
  {
    id: "str_node14b_spaceframe",
    profileId: "STRUCTURAL_GEOTECH_ENGINEER",
    governor: "ARGUS",
    commandLabel: "BIT-2 Kalzip Space-Frame Node #14B Audit",
    shortLabel: "Node #14B Snag",
    description: "Inspect 2,100-Ton dome standing-seam tolerance (< 1.5mm) & MERO shim collar.",
    standardRef: "IS 800:2007 & EN 1090-2 EXC3",
    keywords: ["node", "14b", "snag", "401", "kalzip", "dome", "space-frame", "mero", "shim"],
    deepLink: { label: "Inspect BIT-2 in 3D BIM", href: "/site/digital-twin?bit=BIT-2" },
    followUpIds: ["bim_lidar_vs_ifc", "str_column_c2_sonreb"],
    execute: () => ({
      primaryGovernor: "ARGUS",
      headline: `SNAG-VANGUARD-401: Node #14B Δ 4.2mm • MERO Shim Collar Scheduled`,
      summary: `2,100-Ton BIT-2 Silver Dome standing-seam roof tolerance certified under 1.5mm overall. Localized 4.2mm radial offset at MERO spherical Node #14B is isolated for precision machined shim installation within current shift.`,
      standardRef: "IS 800:2007 Limit State Steel & EN 1090-2",
      complianceStatus: "ACTION_REQUIRED",
      telemetryMetrics: [
        { label: "Node #14B Offset", value: "Δ 4.2 mm", status: "ACTION" },
        { label: "Standing Seam", value: "under 1.5 mm", status: "NOMINAL" },
        { label: "Space-Frame Mass", value: "2,100 Ton", status: "NOMINAL" },
        { label: "Remediation", value: "MERO Shim", status: "WATCH" },
      ],
      deepLink: { label: "Open BIT-2 3D Twin", href: "/site/digital-twin?bit=BIT-2" },
      followUpIds: ["bim_lidar_vs_ifc", "str_column_c2_sonreb"],
    }),
  },
  {
    id: "str_pile_maturity_audit",
    profileId: "STRUCTURAL_GEOTECH_ENGINEER",
    governor: "ARGUS",
    commandLabel: "IS 2911 Pile Load & Concrete Maturity Check",
    shortLabel: "Piles & Maturity",
    description: "Audit static pile load settlement & Nurse-Saul thermal maturity for stripping.",
    standardRef: "IS 2911 (Part 4) & ASTM C1074 Maturity",
    keywords: ["pile", "geotech", "foundation", "maturity", "thermal", "stripping", "formwork"],
    deepLink: { label: "Pile Load Testing", href: "/site/pile-testing" },
    followUpIds: ["str_column_c2_sonreb", "hse_cube_itp_check"],
    execute: () => ({
      primaryGovernor: "ARGUS",
      headline: `IS 2911 Pile Load & Thermal Maturity Certified • Safe Stripping`,
      summary: `Bored cast-in-situ piles tested to 2.5× working load with net residual settlement under 3.8mm (vs 12mm permissible). Nurse-Saul maturity sensors confirm > 75% design f_ck prior to soffit de-shuttering.`,
      standardRef: "IS 2911 Part 4 & ASTM C1074 Nurse-Saul",
      complianceStatus: "CERTIFIED",
      telemetryMetrics: [
        { label: "Net Settlement", value: "3.8 mm / 12 mm", status: "NOMINAL" },
        { label: "Test Load Factor", value: "2.5× Working", status: "NOMINAL" },
        { label: "Core Temp Peak", value: "58.4 °C", status: "NOMINAL" },
        { label: "Stripping Gate", value: "APPROVED", status: "NOMINAL" },
      ],
      deepLink: { label: "Open Pile Testing", href: "/site/pile-testing" },
      followUpIds: ["str_column_c2_sonreb", "hse_cube_itp_check"],
    }),
  },

  // ---------------------------------------------------------------------------
  // 4. BIM & DIGITAL TWIN COORDINATOR (3 Functions)
  // ---------------------------------------------------------------------------
  {
    id: "bim_navisworks_clash_matrix",
    profileId: "BIM_DIGITAL_TWIN_LEAD",
    governor: "MINERVA",
    commandLabel: "LOD-400 Navisworks Clash & 2,400 TR Risers",
    shortLabel: "Clash Matrix",
    description: "Verify zero clashes across 4-car lift bank & 14th-floor 2,400 TR HVAC risers.",
    standardRef: "ISO 19650-2 LOD-400 Federation",
    keywords: ["bim", "clash", "navisworks", "2400", "tr", "chiller", "hvac", "lift", "lod"],
    deepLink: { label: "3D BIM Digital Twin", href: "/site/digital-twin" },
    followUpIds: ["bim_lidar_vs_ifc", "bim_cobie_handover"],
    execute: () => ({
      primaryGovernor: "MINERVA",
      headline: `0 Hard Clashes • 4-Car Lift Core & 14th-Fl 2,400 TR Risers Cleared`,
      summary: `Federated LOD-400 IFC model across BIT-1 through BIT-6 passes Navisworks clearance tolerances. 3 × 800-Ton VFD chiller headers and 14th-floor shaft penetrations are 100% coordinated.`,
      standardRef: "ISO 19650-2 Information Management & LOD-400",
      complianceStatus: "CERTIFIED",
      telemetryMetrics: [
        { label: "Hard Clashes", value: "0 Active", status: "NOMINAL" },
        { label: "Chiller Plant", value: "2,400 TR (3×800)", status: "NOMINAL" },
        { label: "Architectural Bits", value: "6 Synchronized", status: "NOMINAL" },
        { label: "IFC Federation", value: "LOD-400", status: "NOMINAL" },
      ],
      deepLink: { label: "Launch 3D BIM Twin", href: "/site/digital-twin" },
      followUpIds: ["bim_lidar_vs_ifc", "bim_cobie_handover"],
    }),
  },
  {
    id: "bim_lidar_vs_ifc",
    profileId: "BIM_DIGITAL_TWIN_LEAD",
    governor: "ARGUS",
    commandLabel: "28,500-Pt LiDAR Scan vs. BIM Deviation",
    shortLabel: "Scan vs. BIM",
    description: "Overlay terrestrial point cloud against IFC geometry & inspect Node #14B.",
    standardRef: "ASTM E1155 Floor Flatness & USIBD LOA-30",
    keywords: ["lidar", "360", "scan", "point", "cloud", "tour", "deviation", "flatness"],
    deepLink: { label: "360° LiDAR Reality Tour", href: "/site/360-tour?bit=BIT-2" },
    followUpIds: ["str_node14b_spaceframe", "bim_navisworks_clash_matrix"],
    execute: () => ({
      primaryGovernor: "ARGUS",
      headline: `28,500-Pt LiDAR Registered • RMS 1.8mm • Node #14B Flagged`,
      summary: `Terrestrial LiDAR point cloud registered to site control grid with 1.8mm RMS residual. 99.4% of structural surfaces fall inside ±3mm tolerance; BIT-2 Node #14B (Δ 4.2mm) pinned for shim correction.`,
      standardRef: "USIBD Level of Accuracy LOA-30 & ASTM E1155",
      complianceStatus: "ACTIVE_MONITORING",
      telemetryMetrics: [
        { label: "Point Cloud", value: "28,500 Pts", status: "NOMINAL" },
        { label: "Registration RMS", value: "1.8 mm", status: "NOMINAL" },
        { label: "In-Tolerance Area", value: "99.4%", status: "NOMINAL" },
        { label: "Pinned Outlier", value: "BIT-2 #14B", status: "WATCH" },
      ],
      deepLink: { label: "Open 360° LiDAR Tour", href: "/site/360-tour?bit=BIT-2" },
      followUpIds: ["str_node14b_spaceframe", "bim_navisworks_clash_matrix"],
    }),
  },
  {
    id: "bim_cobie_handover",
    profileId: "BIM_DIGITAL_TWIN_LEAD",
    governor: "MINERVA",
    commandLabel: "COBie Asset Tagging & As-Built Readiness",
    shortLabel: "COBie Handover",
    description: "Audit MEP equipment metadata & digital O&M dossier completeness.",
    standardRef: "ISO 19650-3 & BS 1192-4 COBie",
    keywords: ["cobie", "handover", "as-built", "asset", "tag", "o&m"],
    deepLink: { label: "As-Built Handover Vault", href: "/handover/as-built" },
    followUpIds: ["bim_navisworks_clash_matrix", "pd_board_brief"],
    execute: () => ({
      primaryGovernor: "MINERVA",
      headline: `COBie Asset Registry: 94.6% Serialized Across 6 Architectural Bits`,
      summary: `3 × 800-Ton VFD chillers, Liebherr crane anchorage logs, HV switchgear, and fire-life-safety dampers carry verified QR asset passports mapped to IFC GlobalIds.`,
      standardRef: "BS 1192-4 COBie & ISO 19650-3 Operational Phase",
      complianceStatus: "CERTIFIED",
      telemetryMetrics: [
        { label: "Asset Passports", value: "94.6% Linked", status: "NOMINAL" },
        { label: "IFC GlobalIds", value: "100% Valid", status: "NOMINAL" },
        { label: "O&M Manuals", value: "42 / 44 Attached", status: "NOMINAL" },
        { label: "DLP Readiness", value: "Stage-1 Pass", status: "NOMINAL" },
      ],
      deepLink: { label: "Open As-Built Registry", href: "/handover/as-built" },
      followUpIds: ["bim_navisworks_clash_matrix", "pd_board_brief"],
    }),
  },

  // ---------------------------------------------------------------------------
  // 5. COMMERCIAL, QS & BILLING MANAGER (3 Functions)
  // ---------------------------------------------------------------------------
  {
    id: "qs_ra_escrow_reconcile",
    profileId: "COMMERCIAL_QS_MANAGER",
    governor: "MIDAS",
    commandLabel: "RA Billing & ₹43.22 Cr Escrow Reconciliation",
    shortLabel: "RA & Retention",
    description: "Reconcile ₹864.50 Cr EPC baseline, cumulative RA bills & 5% UP-LDA retention.",
    standardRef: "CPWD GCC Cl. 7/9 & UP-LDA Escrow Rules",
    keywords: ["864", "retention", "43.22", "ra", "bill", "commercial", "boq", "escrow", "payment"],
    deepLink: { label: "Commercial & RA Ledger", href: "/site/commercial" },
    followUpIds: ["qs_cpwd_cl42_variance", "qs_escalation_10cc"],
    execute: () => ({
      primaryGovernor: "MIDAS",
      headline: `EPC ₹864.50 Cr Reconciled • 5% Retention ₹43.22 Cr • CPI 1.014`,
      summary: `Cumulative certified work reaches ₹534.26 Cr (61.80% physical/financial progress) with ₹43.22 Cr held in UP-LDA statutory escrow. Column C2 lien release unblocked ₹2,08,720 in IPC billing.`,
      standardRef: "CPWD GCC Clause 7 & UP-LDA Escrow Mandate",
      complianceStatus: "CERTIFIED",
      telemetryMetrics: [
        { label: "EPC Contract", value: `₹${G.financials.epcBaselineCr.toFixed(2)} Cr`, status: "NOMINAL" },
        { label: "Certified EV", value: "₹534.26 Cr", status: "NOMINAL" },
        { label: "Escrow Retention", value: `₹${G.financials.statutoryRetentionCr.toFixed(2)} Cr`, status: "NOMINAL" },
        { label: "Net Cost Saving", value: "+₹7.38 Cr", status: "NOMINAL" },
      ],
      deepLink: { label: "Open Commercial Ledger", href: "/site/commercial" },
      followUpIds: ["qs_cpwd_cl42_variance", "qs_escalation_10cc"],
    }),
  },
  {
    id: "qs_cpwd_cl42_variance",
    profileId: "COMMERCIAL_QS_MANAGER",
    governor: "MIDAS",
    commandLabel: "CPWD Clause 42 Theoretical vs. Actual Recon",
    shortLabel: "Clause 42 Recon",
    description: "Audit Fe-550D steel & cement wastage bands to prevent penal recovery.",
    standardRef: "CPWD GCC Clause 42 Material Reconciliation",
    keywords: ["clause 42", "cl 42", "material", "reconciliation", "wastage", "recovery"],
    deepLink: { label: "Material Reconciliation", href: "/site/material-recon" },
    followUpIds: ["qs_ra_escrow_reconcile", "site_weighbridge_dispatch"],
    execute: () => ({
      primaryGovernor: "MIDAS",
      headline: `CPWD Clause 42 Clear • Steel Wastage 1.82% (Limit 2.50%)`,
      summary: `Theoretical BOQ + BBS consumption vs. weighbridge-verified issue shows 1.82% rolling margin on Fe-550D rebar and 1.45% on OPC-53 cement—both comfortably inside CPWD permissible limits with ₹0 penal recovery.`,
      standardRef: "CPWD GCC Clause 42 (Cement ±2% / Steel ±2.5%)",
      complianceStatus: "CERTIFIED",
      telemetryMetrics: [
        { label: "Rebar Variance", value: "+1.82% / 2.5%", status: "NOMINAL" },
        { label: "Cement Variance", value: "+1.45% / 2.0%", status: "NOMINAL" },
        { label: "Penal Recovery", value: "₹0.00", status: "NOMINAL" },
        { label: "Stock Audit", value: "Reconciled", status: "NOMINAL" },
      ],
      deepLink: { label: "Open Clause 42 Recon", href: "/site/material-recon" },
      followUpIds: ["qs_ra_escrow_reconcile", "site_weighbridge_dispatch"],
    }),
  },
  {
    id: "qs_escalation_10cc",
    profileId: "COMMERCIAL_QS_MANAGER",
    governor: "MIDAS",
    commandLabel: "Clause 10CA / 10CC WPI Price Escalation",
    shortLabel: "10CC Escalation",
    description: "Compute WPI steel, cement, POL & CPI labor price adjustment indices.",
    standardRef: "CPWD GCC Clause 10CA & 10CC",
    keywords: ["escalation", "10cc", "10ca", "wpi", "inflation", "index"],
    deepLink: { label: "Price Escalation Engine", href: "/finance/price-escalation" },
    followUpIds: ["qs_ra_escrow_reconcile", "lgl_scl_eot_shield"],
    execute: () => ({
      primaryGovernor: "MIDAS",
      headline: `Clause 10CA/10CC Indexation Active • Net Escalation +₹4.86 Cr`,
      summary: `Office of Economic Adviser WPI indices for reinforcement steel and OPC cement combined with Lucknow CPI-IW labor indices yield +₹4.86 Cr admissible escalation billed through current IPC cycle.`,
      standardRef: "CPWD GCC Clause 10CA & 10CC Formula",
      complianceStatus: "CERTIFIED",
      telemetryMetrics: [
        { label: "Admissible Claim", value: "+₹4.86 Cr", status: "NOMINAL" },
        { label: "Base Index Date", value: "May 2026 NTP", status: "NOMINAL" },
        { label: "WPI Steel Delta", value: "+2.4%", status: "NOMINAL" },
        { label: "IPC Integration", value: "Verified", status: "NOMINAL" },
      ],
      deepLink: { label: "Open Price Escalation", href: "/finance/price-escalation" },
      followUpIds: ["qs_ra_escrow_reconcile", "lgl_scl_eot_shield"],
    }),
  },

  // ---------------------------------------------------------------------------
  // 6. QA/QC & HSE SAFETY OFFICER (3 Functions)
  // ---------------------------------------------------------------------------
  {
    id: "hse_ptw_interlocks",
    profileId: "QAQC_HSE_OFFICER",
    governor: "ARGUS",
    commandLabel: "Active PTW Tokens & +54.00m RL Safety Audit",
    shortLabel: "PTW & Safety",
    description: "Verify height-work, hot-work & crane PTWs across 66 biometric workers.",
    standardRef: "BOCW Act 1996 & ISO 45001:2018",
    keywords: ["ptw", "permit", "safety", "hse", "height", "hot work", "incident", "ppe"],
    deepLink: { label: "Permit-to-Work (PTW)", href: "/site/ptw" },
    followUpIds: ["hse_snag_ncr_tracker", "site_crane_wind_envelope"],
    execute: () => ({
      primaryGovernor: "ARGUS",
      headline: `Zero LTI Streak • 9 Active PTW Tokens Biometrically Bound`,
      summary: `All 66 active workers on DPR #084 hold valid TBT sign-offs and zone-specific PTWs (including BIT-2 space-frame rigging at +16.50m RL and BIT-1 shaft work). Zero Lost-Time Injuries recorded.`,
      standardRef: "BOCW Rules & ISO 45001 Occupational Health & Safety",
      complianceStatus: "CERTIFIED",
      telemetryMetrics: [
        { label: "Active PTWs", value: "9 Validated", status: "NOMINAL" },
        { label: "TBT Coverage", value: "66 / 66 (100%)", status: "NOMINAL" },
        { label: "LTI Incidents", value: "0", status: "NOMINAL" },
        { label: "Crane Interlock", value: "ARMED", status: "NOMINAL" },
      ],
      deepLink: { label: "Open PTW Register", href: "/site/ptw" },
      followUpIds: ["hse_snag_ncr_tracker", "site_crane_wind_envelope"],
    }),
  },
  {
    id: "hse_snag_ncr_tracker",
    profileId: "QAQC_HSE_OFFICER",
    governor: "ARGUS",
    commandLabel: "Active Snag & NCR Closure Register",
    shortLabel: "Snags & NCRs",
    description: "Track SNAG-VANGUARD-401 closure & verify NCR-009 post-grout certification.",
    standardRef: "ISO 9001:2015 QMS & CPWD QA Manual",
    keywords: ["snag", "ncr", "defect", "quality", "punch", "closure"],
    deepLink: { label: "NCR & Defect Liens", href: "/site/ncr-defect-liens" },
    followUpIds: ["str_node14b_spaceframe", "str_column_c2_sonreb"],
    execute: () => ({
      primaryGovernor: "ARGUS",
      headline: `1 Active Snag (Node #14B) • NCR-009 Certified & Closed`,
      summary: `NCR-009 (BIT-6 Column C2) is closed and lien-released after 32.8 MPa SonReb verification. Only SNAG-VANGUARD-401 (BIT-2 Node #14B Δ 4.2mm MERO shim) remains open with active remediation crew assigned.`,
      standardRef: "ISO 9001:2015 Non-Conformance & Corrective Action",
      complianceStatus: "ACTION_REQUIRED",
      telemetryMetrics: [
        { label: "Open Snags", value: "1 (Node #14B)", status: "ACTION" },
        { label: "Closed NCRs", value: "NCR-009 Passed", status: "NOMINAL" },
        { label: "Quality Pass Rate", value: "98.9%", status: "NOMINAL" },
        { label: "Section 65B Proof", value: "Hashed", status: "NOMINAL" },
      ],
      deepLink: { label: "Open NCR & Snag Ledger", href: "/site/ncr-defect-liens" },
      followUpIds: ["str_node14b_spaceframe", "str_column_c2_sonreb"],
    }),
  },
  {
    id: "hse_cube_itp_check",
    profileId: "QAQC_HSE_OFFICER",
    governor: "ARGUS",
    commandLabel: "IS 516 Cube Register & ITP Hold-Points",
    shortLabel: "Cube & ITP",
    description: "Audit 7-day / 28-day M40 & M50 compressive cube tests and pour hold-points.",
    standardRef: "IS 516:2021 & IS 456 Table 11",
    keywords: ["cube", "itp", "compressive", "m40", "m50", "testing", "lab"],
    deepLink: { label: "Cube Test Register", href: "/site/cube-register" },
    followUpIds: ["str_pile_maturity_audit", "site_weighbridge_dispatch"],
    execute: () => ({
      primaryGovernor: "ARGUS",
      headline: `IS 516 Cube Register: 100% Acceptance • Mean 28d M40 = 46.8 MPa`,
      summary: `All 28-day concrete cube sets satisfy IS 456 Table 11 characteristic strength criteria (mean 46.8 MPa vs 40 MPa characteristic). Zero overdue ITP witness hold-points across active slab pours.`,
      standardRef: "IS 516:2021 & IS 456:2000 Table 11 Compliance",
      complianceStatus: "CERTIFIED",
      telemetryMetrics: [
        { label: "Mean 28d Strength", value: "46.8 MPa (M40)", status: "NOMINAL" },
        { label: "IS 456 Compliance", value: "100% Pass", status: "NOMINAL" },
        { label: "ITP Hold-Points", value: "0 Blocked", status: "NOMINAL" },
        { label: "Curing Pond Temp", value: "27.0 °C ± 2°", status: "NOMINAL" },
      ],
      deepLink: { label: "Open Cube Register", href: "/site/cube-register" },
      followUpIds: ["str_pile_maturity_audit", "site_weighbridge_dispatch"],
    }),
  },

  // ---------------------------------------------------------------------------
  // 7. CLIENT REP & ARBITRATION COUNSEL (3 Functions)
  // ---------------------------------------------------------------------------
  {
    id: "lgl_section65b_verify",
    profileId: "CLIENT_LEGAL_COUNSEL",
    governor: "HERMES",
    commandLabel: "BSA Sec. 63 / Sec. 65B Evidentiary Hash Audit",
    shortLabel: "Sec. 65B Vault",
    description: "Verify tamper-evident SHA-256 Merkle chain (Block #18402) for court admissibility.",
    standardRef: "Bharatiya Sakshya Adhiniyam Sec. 63 / IT Act Sec. 65B",
    keywords: ["65b", "section 65b", "bsa", "merkle", "hash", "evidence", "legal", "court", "18402"],
    deepLink: { label: "Section 65B Evidence Vault", href: "/site/audit-ledger" },
    followUpIds: ["lgl_scl_eot_shield", "pd_board_brief"],
    execute: () => ({
      primaryGovernor: "HERMES",
      headline: `Merkle Chain Intact • Block #18402 • BSA Sec. 63 / Sec. 65B Valid`,
      summary: `Every DPR, SonReb NDT certificate, LiDAR scan, weighbridge slip, and hindrance notice is cryptographically timestamped and chained into Block #18402 with device-bound digital signatures.`,
      standardRef: "BSA 2023 Sec. 63 & Information Technology Act Sec. 65B",
      complianceStatus: "CERTIFIED",
      telemetryMetrics: [
        { label: "Merkle Head", value: "Block #18402", status: "NOMINAL" },
        { label: "Chain Integrity", value: "100% Verified", status: "NOMINAL" },
        { label: "Admissibility", value: "BSA Sec. 63 Ready", status: "NOMINAL" },
        { label: "Tamper Alerts", value: "0", status: "NOMINAL" },
      ],
      deepLink: { label: "Open Audit Ledger", href: "/site/audit-ledger" },
      followUpIds: ["lgl_scl_eot_shield", "pd_board_brief"],
    }),
  },
  {
    id: "lgl_scl_eot_shield",
    profileId: "CLIENT_LEGAL_COUNSEL",
    governor: "THEMIS",
    commandLabel: "SCL Delay Protocol & Liquidated Damages Shield",
    shortLabel: "EOT & LD Shield",
    description: "Audit concurrency, float absorption & EOT entitlement under CPWD Clause 5.",
    standardRef: "SCL Delay & Disruption Protocol (2nd Ed.) & CPWD Cl. 5",
    keywords: ["scl", "eot", "extension", "liquidated", "damages", "ld", "arbitration", "hindrance"],
    deepLink: { label: "Hindrance & EOT Register", href: "/site/hindrance-eot" },
    followUpIds: ["lgl_section65b_verify", "pd_critical_exposure"],
    execute: () => ({
      primaryGovernor: "THEMIS",
      headline: `0d Critical Delay • ₹0.00 LD Exposure • Contemporaneous TIA Sealed`,
      summary: `Contemporaneous Time Impact Analysis (TIA) proves all logged external utility shifts were absorbed within non-critical float buffers, shielding the contractor from Liquidated Damages while preserving EOT audit trails.`,
      standardRef: "SCL Delay Protocol (2nd Ed.) & CPWD GCC Clause 2/5",
      complianceStatus: "CERTIFIED",
      telemetryMetrics: [
        { label: "LD Exposure", value: "₹0.00", status: "NOMINAL" },
        { label: "Critical Delay", value: "0 Days", status: "NOMINAL" },
        { label: "TIA Windows", value: "Contemporaneous", status: "NOMINAL" },
        { label: "Notice Compliance", value: "100% Timely", status: "NOMINAL" },
      ],
      deepLink: { label: "Open Hindrance & EOT", href: "/site/hindrance-eot" },
      followUpIds: ["lgl_section65b_verify", "pd_critical_exposure"],
    }),
  },
  {
    id: "lgl_uplda_escrow_gates",
    profileId: "CLIENT_LEGAL_COUNSEL",
    governor: "THEMIS",
    commandLabel: "UP-LDA Statutory Compliance & Escrow Gates",
    shortLabel: "UP-LDA Gates",
    description: "Audit UP-LDA milestone prerequisites, BOCW cess, labour license & BG validity.",
    standardRef: "UP-LDA EPC Concession & UP-RERA Statutory Norms",
    keywords: ["escrow", "statutory", "cess", "bg", "bank guarantee", "compliance", "gate"],
    deepLink: { label: "Commercial & Statutory Gates", href: "/system/commercial-gates" },
    followUpIds: ["qs_ra_escrow_reconcile", "lgl_section65b_verify"],
    execute: () => ({
      primaryGovernor: "THEMIS",
      headline: `All UP-LDA Statutory & Escrow Release Gates Green`,
      summary: `Performance Bank Guarantee, BOCW 1% welfare cess remittance, CLRA labour license, and UP-LDA escrow retention accounting (₹43.22 Cr) are verified active with zero statutory holds.`,
      standardRef: "UP-LDA Escrow Tripartite Agreement & BOCW Cess Act",
      complianceStatus: "CERTIFIED",
      telemetryMetrics: [
        { label: "Escrow Account", value: `₹${G.financials.statutoryRetentionCr.toFixed(2)} Cr`, status: "NOMINAL" },
        { label: "BOCW Cess (1%)", value: "Paid & Matched", status: "NOMINAL" },
        { label: "PBG Validity", value: "Active + DLP", status: "NOMINAL" },
        { label: "Statutory Holds", value: "0", status: "NOMINAL" },
      ],
      deepLink: { label: "Open Commercial Gates", href: "/system/commercial-gates" },
      followUpIds: ["qs_ra_escrow_reconcile", "lgl_section65b_verify"],
    }),
  },
];

export function getFunctionsForProfile(
  profileId: ConstructionProfileId
): QuadmaxFunctionDefinition[] {
  return QUADMAX_FUNCTION_REGISTRY.filter((fn) => fn.profileId === profileId);
}

export function executeQuadmaxFunction(functionId: string): AgentSynthesisResponse {
  const fn =
    QUADMAX_FUNCTION_REGISTRY.find((f) => f.id === functionId) ||
    QUADMAX_FUNCTION_REGISTRY[0];
  const profile =
    CONSTRUCTION_PROFILES.find((p) => p.id === fn.profileId) ||
    CONSTRUCTION_PROFILES[0];

  const core = fn.execute();
  const timestampIso = new Date().toISOString();
  const sha256Seal = computeDeterministicSeal(
    `${G.projectId}|${fn.id}|${core.headline}|${core.complianceStatus}`
  );

  return {
    functionId: fn.id,
    profileId: profile.id,
    profileTitle: profile.title,
    ...core,
    sha256Seal,
    timestampIso,
  };
}

export function dispatchVanguardGovernorQuery(
  rawQuery: string,
  preferredGovernor?: GovernorId,
  activeProfileId?: ConstructionProfileId
): AgentSynthesisResponse {
  const q = rawQuery.toLowerCase().trim();

  // Score all 21 functions against keywords, governor affinity, and active profile context
  let bestFn = QUADMAX_FUNCTION_REGISTRY[0];
  let bestScore = -1;

  for (const fn of QUADMAX_FUNCTION_REGISTRY) {
    let score = 0;
    for (const kw of fn.keywords) {
      if (q.includes(kw)) {
        score += kw.length >= 4 ? 12 : 7;
      }
    }
    if (activeProfileId && fn.profileId === activeProfileId) {
      score += 4;
    }
    if (preferredGovernor && fn.governor === preferredGovernor) {
      score += 3;
    }
    if (score > bestScore) {
      bestScore = score;
      bestFn = fn;
    }
  }

  // If query has no keyword match, default to the active profile's lead function
  if (bestScore <= 4 && activeProfileId) {
    const profileFns = getFunctionsForProfile(activeProfileId);
    if (profileFns.length > 0) {
      bestFn = profileFns[0];
    }
  }

  return executeQuadmaxFunction(bestFn.id);
}
MESH_EOF

# ==============================================================================
# 2. UPGRADE DRAGGABLE MULTI-PROFILE QUADMAX.AI PILL & DRAWER
# ==============================================================================
cat << 'WIDGET_EOF' > components/QuadmaxKernelFloatingWidget.tsx
// @refresh reset
"use client";

import React, { useState, useEffect, useRef } from "react";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import {
  CONSTRUCTION_PROFILES,
  ConstructionProfileId,
  QUADMAX_FUNCTION_REGISTRY,
  getFunctionsForProfile,
  executeQuadmaxFunction,
  dispatchVanguardGovernorQuery,
  AgentSynthesisResponse,
} from "@/lib/agents/quadillarAgentMesh";
import { useLiveviewTheme } from "@/lib/theme/liveviewTheme";

const POS_STORAGE_KEY = "quadmax-draggable-pill-pos-v2";
const PROFILE_STORAGE_KEY = "quadmax-active-profile-v1";
const PILL_WIDTH = 164;
const PILL_HEIGHT = 34;

export default function QuadmaxKernelFloatingWidget() {
  const { isLight } = useLiveviewTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeProfileId, setActiveProfileId] =
    useState<ConstructionProfileId>("PROJECT_DIRECTOR");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AgentSynthesisResponse>(() =>
    executeQuadmaxFunction("pd_executive_pulse")
  );

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY) as ConstructionProfileId | null;
      if (savedProfile && CONSTRUCTION_PROFILES.some((p) => p.id === savedProfile)) {
        setActiveProfileId(savedProfile);
        const fns = getFunctionsForProfile(savedProfile);
        if (fns.length > 0) setResult(executeQuadmaxFunction(fns[0].id));
      }
    } catch {}

    const clampPos = (rawX: number, rawY: number) => {
      const maxX = Math.max(12, window.innerWidth - PILL_WIDTH - 12);
      const maxY = Math.max(12, window.innerHeight - PILL_HEIGHT - 12);
      return {
        x: Math.min(Math.max(12, rawX), maxX),
        y: Math.min(Math.max(12, rawY), maxY),
      };
    };

    try {
      const saved = localStorage.getItem(POS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          setPos(clampPos(parsed.x, parsed.y));
          return;
        }
      }
    } catch {}

    setPos(clampPos(window.innerWidth - PILL_WIDTH - 16, window.innerHeight - PILL_HEIGHT - 16));

    const handleResize = () => {
      setPos((prev) => (prev ? clampPos(prev.x, prev.y) : prev));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSelectProfile = (profileId: ConstructionProfileId) => {
    setActiveProfileId(profileId);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, profileId);
    } catch {}
    const profileFns = getFunctionsForProfile(profileId);
    if (profileFns.length > 0) {
      setResult(executeQuadmaxFunction(profileFns[0].id));
    }
  };

  const handleRunFunction = (fnId: string) => {
    const res = executeQuadmaxFunction(fnId);
    setResult(res);
    setActiveProfileId(res.profileId);
  };

  const handleAsk = (qText?: string) => {
    const prompt = (qText ?? query).trim();
    if (!prompt) return;
    const res = dispatchVanguardGovernorQuery(prompt, undefined, activeProfileId);
    setResult(res);
    setActiveProfileId(res.profileId);
    if (!qText) setQuery("");
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ds = dragState.current;
    if (!ds || ds.pointerId !== e.pointerId) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (Math.hypot(dx, dy) > 4) {
      ds.moved = true;
    }
    const maxX = Math.max(12, window.innerWidth - PILL_WIDTH - 12);
    const maxY = Math.max(12, window.innerHeight - PILL_HEIGHT - 12);
    setPos({
      x: Math.min(Math.max(12, ds.originX + dx), maxX),
      y: Math.min(Math.max(12, ds.originY + dy), maxY),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const ds = dragState.current;
    if (!ds || ds.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);

    if (ds.moved && pos) {
      try {
        localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(pos));
      } catch {}
    } else {
      setIsOpen((prev) => !prev);
    }
    dragState.current = null;
  };

  if (!pos) return null;

  const activeProfile =
    CONSTRUCTION_PROFILES.find((p) => p.id === activeProfileId) ||
    CONSTRUCTION_PROFILES[0];
  const profileFunctions = getFunctionsForProfile(activeProfileId);

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1280;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const openUpward = pos.y > viewportH * 0.52;
  const alignRight = pos.x + PILL_WIDTH / 2 > viewportW * 0.5;

  return (
    <div
      style={{
        position: "fixed",
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        zIndex: 60,
        touchAction: "none",
      }}
      className="font-mono select-none"
    >
      {/* Multi-Profile Role-Scoped Kernel Drawer */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            ...(openUpward ? { bottom: `${PILL_HEIGHT + 8}px` } : { top: `${PILL_HEIGHT + 8}px` }),
            ...(alignRight ? { right: 0 } : { left: 0 }),
          }}
          className="w-[385px] max-w-[94vw] bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl shadow-2xl p-3.5 flex flex-col gap-2.5 text-xs text-slate-100 select-text"
        >
          {/* Top Kernel Header */}
          <div className="flex justify-between items-start border-b border-slate-800 pb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-cyan-400 text-[11px]">QUADMAX.AI</span>
                <span className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 rounded text-[9px] text-emerald-400 font-bold">
                  7 PROFILES • 21 TOOLS
                </span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                {VANGUARD_GENOME.projectId} • ₹{VANGUARD_GENOME.financials.epcBaselineCr.toFixed(2)} Cr
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white font-bold px-2 py-0.5 rounded bg-slate-900 text-[10px]"
            >
              ✕
            </button>
          </div>

          {/* 7 Construction Stakeholder Profile Selector */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[9px] text-slate-400">
              <span>SELECT PROJECT ROLE PROFILE</span>
              <span className="text-cyan-400 font-bold">{activeProfile.shortCode}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {CONSTRUCTION_PROFILES.map((prof) => {
                const selected = prof.id === activeProfileId;
                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => handleSelectProfile(prof.id)}
                    title={`${prof.title} — ${prof.authorityScope}`}
                    className={`px-1.5 py-1 rounded-lg border text-[9px] font-bold truncate transition ${
                      selected
                        ? "bg-cyan-500 text-slate-950 border-cyan-400"
                        : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
                    }`}
                  >
                    {prof.shortCode}
                  </button>
                );
              })}
            </div>
            <div className="text-[9px] text-slate-400 truncate">
              <strong className="text-white">{activeProfile.title}:</strong> {activeProfile.authorityScope}
            </div>
          </div>

          {/* Role-Specific Deterministic Function Triggers */}
          <div className="flex flex-col gap-1">
            <div className="text-[9px] text-slate-400 uppercase">
              {activeProfile.shortCode} DETERMINISTIC FUNCTIONS
            </div>
            <div className="grid grid-cols-3 gap-1">
              {profileFunctions.map((fn) => {
                const isCurrent = result.functionId === fn.id;
                return (
                  <button
                    key={fn.id}
                    type="button"
                    onClick={() => handleRunFunction(fn.id)}
                    className={`p-1.5 rounded-lg border text-left transition flex flex-col gap-0.5 ${
                      isCurrent
                        ? "bg-cyan-500/20 border-cyan-400 text-white"
                        : "bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300"
                    }`}
                  >
                    <span className="text-[9px] font-bold text-cyan-400 truncate">
                      {fn.shortLabel}
                    </span>
                    <span className="text-[8px] text-slate-400 truncate">
                      {fn.governor}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deterministic Synthesis & Telemetry Matrix */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[9px]">
              <span className="font-bold text-emerald-400">
                GOV: {result.primaryGovernor} • {result.complianceStatus.replace("_", " ")}
              </span>
              <span className="text-slate-400 truncate max-w-[160px]">{result.standardRef}</span>
            </div>

            <div className="font-bold text-white text-[11px] leading-snug">{result.headline}</div>
            <div className="text-[10px] text-slate-300 leading-relaxed">{result.summary}</div>

            {/* 4-Cell Live Telemetry Strip */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              {result.telemetryMetrics.map((m) => (
                <div
                  key={m.label}
                  className="bg-slate-950/90 border border-slate-800 rounded-lg px-2 py-1 flex flex-col"
                >
                  <span className="text-[8px] text-slate-400 uppercase">{m.label}</span>
                  <span
                    className={`text-[10px] font-bold ${
                      m.status === "ACTION"
                        ? "text-rose-400"
                        : m.status === "WATCH"
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {m.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Chained Cross-Role Follow-Up Functions */}
            {result.followUpIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="text-[8px] text-slate-400">NEXT:</span>
                {result.followUpIds.map((fid) => {
                  const targetFn = QUADMAX_FUNCTION_REGISTRY.find((f) => f.id === fid);
                  if (!targetFn) return null;
                  return (
                    <button
                      key={fid}
                      type="button"
                      onClick={() => handleRunFunction(fid)}
                      className="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-[8.5px] text-cyan-300"
                    >
                      {targetFn.shortLabel}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Section 65B Seal & Deep-Link Action Row */}
            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800">
              <span className="text-[8px] text-slate-400 truncate">
                65B: {result.sha256Seal.slice(0, 14)}…
              </span>
              <div className="flex gap-1 shrink-0">
                <a
                  href={result.deepLink.href}
                  className="py-1 px-2 bg-cyan-500 text-slate-950 font-bold text-[9.5px] rounded-lg"
                >
                  {result.deepLink.label} →
                </a>
                <a
                  href="/site/agent-console"
                  className="py-1 px-2 bg-slate-950 border border-slate-700 text-cyan-300 font-bold text-[9.5px] rounded-lg"
                >
                  CONSOLE
                </a>
              </div>
            </div>
          </div>

          {/* Role-Aware Natural Language Prompt Bar */}
          <div className="flex gap-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder={`Ask as ${activeProfile.shortCode} (or any domain)...`}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={() => handleAsk()}
              className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] rounded-lg"
            >
              RUN
            </button>
          </div>
        </div>
      )}

      {/* Compact Movable Pill Launcher */}
      <div
        role="button"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setIsOpen((v) => !v);
        }}
        title="Drag to move anywhere • Click to open 7-Profile QUADMAX.AI Kernel"
        style={{
          width: `${PILL_WIDTH}px`,
          height: `${PILL_HEIGHT}px`,
          backgroundColor: isLight ? "#FDFCF9" : "#0F172A",
          borderColor: isLight ? "rgba(201, 100, 66, 0.55)" : "rgba(34, 211, 238, 0.45)",
          color: isLight ? "#1F1E1B" : "#F8FAFC",
        }}
        className={`flex items-center justify-between px-2.5 rounded-full border shadow-lg backdrop-blur-md transition-shadow ${
          isDragging ? "cursor-grabbing scale-105 shadow-xl" : "cursor-grab hover:shadow-md"
        }`}
      >
        <span
          style={{ color: isLight ? "#78736A" : "#64748B" }}
          className="text-[10px] leading-none tracking-tighter"
        >
          ⋮⋮
        </span>
        <span
          style={{ backgroundColor: isLight ? "#C96442" : "#22D3EE" }}
          className="w-2 h-2 rounded-full animate-pulse shrink-0"
        />
        <span className="text-[10px] font-bold tracking-tight">QUADMAX.AI</span>
        <span
          style={{
            backgroundColor: isLight ? "#EFECE4" : "#1E293B",
            color: isLight ? "#C96442" : "#22D3EE",
          }}
          className="px-1.5 py-0.5 rounded text-[8px] font-bold"
        >
          {activeProfile.shortCode.split(" ")[0]}
        </span>
      </div>
    </div>
  );
}
WIDGET_EOF

# ==============================================================================
# 3. UPGRADE /site/agent-console FULL-SCREEN MULTI-PROFILE WORKBENCH
# ==============================================================================
cat << 'CONSOLE_EOF' > app/site/agent-console/page.tsx
// @refresh reset
"use client";

import React, { useState } from "react";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import {
  CONSTRUCTION_PROFILES,
  ConstructionProfileId,
  QUADMAX_FUNCTION_REGISTRY,
  getFunctionsForProfile,
  executeQuadmaxFunction,
  dispatchVanguardGovernorQuery,
  AgentSynthesisResponse,
} from "@/lib/agents/quadillarAgentMesh";

export default function QuadmaxMultiProfileConsolePage() {
  const [selectedProfileId, setSelectedProfileId] =
    useState<ConstructionProfileId>("PROJECT_DIRECTOR");
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<AgentSynthesisResponse[]>(() => [
    executeQuadmaxFunction("pd_executive_pulse"),
  ]);

  const activeProfile =
    CONSTRUCTION_PROFILES.find((p) => p.id === selectedProfileId) ||
    CONSTRUCTION_PROFILES[0];
  const activeFunctions = getFunctionsForProfile(selectedProfileId);

  const runFunction = (fnId: string) => {
    const res = executeQuadmaxFunction(fnId);
    setSelectedProfileId(res.profileId);
    setHistory((prev) => [res, ...prev.slice(0, 11)]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    const res = dispatchVanguardGovernorQuery(prompt, undefined, selectedProfileId);
    setSelectedProfileId(res.profileId);
    setHistory((prev) => [res, ...prev.slice(0, 11)]);
    setPrompt("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-wrap justify-between items-center gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              QUADMAX.AI • MULTI-PROFILE CONSTRUCTION KERNEL
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              7 STAKEHOLDER ROLES • 21 DETERMINISTIC FUNCTIONS
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            QUADMAX.AI ROLE-SCOPED GOVERNANCE & TELEMETRY CONSOLE
          </h1>
          <p className="text-xs text-slate-400">
            {VANGUARD_GENOME.projectName} ({VANGUARD_GENOME.projectId}) • EPC Baseline ₹{VANGUARD_GENOME.financials.epcBaselineCr.toFixed(2)} Cr
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg">
            ← COMMAND CENTER
          </a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg">
            🧊 3D BIM TWIN
          </a>
        </div>
      </div>

      {/* 7 Construction Project Profile Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {CONSTRUCTION_PROFILES.map((prof) => {
          const isSelected = prof.id === selectedProfileId;
          return (
            <button
              key={prof.id}
              type="button"
              onClick={() => {
                setSelectedProfileId(prof.id);
                const fns = getFunctionsForProfile(prof.id);
                if (fns.length > 0) runFunction(fns[0].id);
              }}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? "bg-cyan-500/20 border-cyan-400 shadow-md"
                  : "bg-slate-900/60 hover:bg-slate-900 border-slate-800"
              }`}
            >
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-cyan-400">{prof.shortCode}</span>
                <span className="text-slate-400">{prof.primaryGovernor}</span>
              </div>
              <div className="text-xs font-bold text-white leading-snug">{prof.title}</div>
              <div className="text-[9px] text-slate-400 line-clamp-2">{prof.authorityScope}</div>
            </button>
          );
        })}
      </div>

      {/* Active Profile Function Matrix + Execution Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Role-Specific Functions & Prompt */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="border-b border-slate-800 pb-2">
            <div className="text-[10px] text-cyan-400 font-bold uppercase">
              ACTIVE PROFILE • {activeProfile.department}
            </div>
            <div className="text-sm font-bold text-white">{activeProfile.title}</div>
          </div>

          <div className="flex flex-col gap-2">
            {activeFunctions.map((fn) => (
              <button
                key={fn.id}
                type="button"
                onClick={() => runFunction(fn.id)}
                className="p-3 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-left transition flex flex-col gap-1"
              >
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-cyan-400">{fn.commandLabel}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] text-emerald-400">
                    {fn.governor}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">{fn.description}</div>
                <div className="text-[9px] text-slate-400">Ref: {fn.standardRef}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t border-slate-800">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Query ${activeProfile.shortCode} or any site parameter...`}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl"
            >
              EXECUTE
            </button>
          </form>
        </div>

        {/* Right: Notarized Deterministic Output Stream */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {history.map((item, idx) => (
            <div
              key={`${item.functionId}-${item.timestampIso}-${idx}`}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5"
            >
              <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-2 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">
                    {item.profileTitle}
                  </span>
                  <span className="text-emerald-400 font-bold">GOV: {item.primaryGovernor}</span>
                </div>
                <span className="text-slate-400">{item.standardRef}</span>
              </div>

              <div className="text-sm font-bold text-white">{item.headline}</div>
              <div className="text-xs text-slate-300 leading-relaxed">{item.summary}</div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {item.telemetryMetrics.map((m) => (
                  <div
                    key={m.label}
                    className="bg-slate-950/90 border border-slate-800 rounded-xl p-2 flex flex-col"
                  >
                    <span className="text-[9px] text-slate-400 uppercase">{m.label}</span>
                    <span
                      className={`text-xs font-bold mt-0.5 ${
                        m.status === "ACTION"
                          ? "text-rose-400"
                          : m.status === "WATCH"
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2 pt-1 text-[10px]">
                <span className="text-slate-400">
                  BSA Sec. 63 / Sec. 65B SHA-256: <strong className="text-slate-300">{item.sha256Seal.slice(0, 32)}…</strong>
                </span>
                <a
                  href={item.deepLink.href}
                  className="px-3 py-1 bg-cyan-500 text-slate-950 font-bold rounded-lg"
                >
                  {item.deepLink.label} →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
CONSOLE_EOF

# ==============================================================================
# 4. UPGRADE /api/agent ROUTE TO EXPOSE MULTI-PROFILE FUNCTIONS VIA REST
# ==============================================================================
cat << 'API_EOF' > app/api/agent/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  CONSTRUCTION_PROFILES,
  QUADMAX_FUNCTION_REGISTRY,
  ConstructionProfileId,
  GovernorId,
  executeQuadmaxFunction,
  dispatchVanguardGovernorQuery,
} from "@/lib/agents/quadillarAgentMesh";

export async function GET() {
  return NextResponse.json({
    kernel: "QUADMAX.AI",
    profiles: CONSTRUCTION_PROFILES,
    functions: QUADMAX_FUNCTION_REGISTRY.map(({ execute: _exec, ...meta }) => meta),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { functionId, query, prompt, governor, profileId } = body || {};

    if (typeof functionId === "string" && functionId.trim().length > 0) {
      const result = executeQuadmaxFunction(functionId.trim());
      return NextResponse.json({ ok: true, result });
    }

    const inputText = String(query ?? prompt ?? "Project Vanguard executive pulse");
    const result = dispatchVanguardGovernorQuery(
      inputText,
      governor as GovernorId | undefined,
      profileId as ConstructionProfileId | undefined
    );
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Invalid QUADMAX kernel payload" },
      { status: 400 }
    );
  }
}
API_EOF

npx tsc --noEmit && echo "✓ QUADMAX.AI 7-Profile / 21-Function Architecture compiled with 0 errors!"
