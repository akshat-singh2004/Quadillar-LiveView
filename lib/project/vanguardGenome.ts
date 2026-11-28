/**
 * QUADILLAR LIVEVIEW — CANONICAL PROJECT GENOME (SINGLE SOURCE OF TRUTH)
 * Project: Project Vanguard Commercial Hub (UP-LDA-VANGUARD-CAMPUS)
 * Location: Gomti Nagar Extension, Lucknow, Uttar Pradesh (26.8467° N, 80.9462° E)
 *
 * Every view (Command Center, 3D BIM Twin, 360° LiDAR Reality Tour, DPR,
 * Agent Governors, and BSA Section 63 Ledger) imports its baseline from here.
 */

export type DisciplineId =
  | "STRUCTURAL"
  | "HVAC"
  | "PLUMBING"
  | "ELECTRICAL"
  | "ARCHITECTURE"
  | "SITE_PLANT";

export interface ArchitecturalBitSpec {
  bitId: "BIT-1" | "BIT-2" | "BIT-3" | "BIT-4" | "BIT-5" | "BIT-6";
  code: string;
  name: string;
  shortTitle: string;
  elevationLabel: string;
  elevationM: number;
  worldPos: [number, number, number];
  dimensionsM: [number, number, number]; // [width X, height Y, depth Z]
  structuralSystem: string;
  mepSystem: string;
  architecturalSpec: string;
  completionPct: number;
  allocatedBudgetCr: number;
  status: "CERTIFIED" | "ACTIVE_EXECUTION" | "SNAG_FLAGGED";
  activeIssueId?: string;
}

export interface SpatialTelemetryPin {
  pinId: string;
  type: "SNAG" | "NCR" | "CRANE" | "SENSOR";
  bitId: ArchitecturalBitSpec["bitId"];
  title: string;
  discipline: DisciplineId;
  worldPos: [number, number, number];
  metricLabel: string;
  severity: "NOMINAL" | "MINOR" | "RESOLVED_CERTIFIED";
  description: string;
  routeLink: string;
}

export const VANGUARD_GENOME = {
  projectId: "UP-LDA-VANGUARD-CAMPUS",
  projectName: "Project Vanguard Commercial Hub",
  subtitle: "Gomti Nagar, Lucknow • 6-Zone Parametric Digital Twin & Institutional EPC",
  coordinates: { lat: 26.8467, lng: 80.9462, datumRlM: 112.4 },

  financials: {
    epcBaselineCr: 864.50,
    epcBaselineInr: 8645000000,
    retentionPct: 5.0,
    statutoryRetentionCr: 43.22, // UP-LDA Escrow Reserved
    certifiedToDateCr: 534.26,
    overallPhysicalProgressPct: 61.8,
    cpi: 1.014,
    spi: 1.000,
  },

  mepPlant: {
    totalCoolingTr: 2400,
    chillerConfig: "3 × 800-Ton VFD Water-Cooled Centrifugal Chillers",
    liftCoreConfig: "4-Car High-Speed Gearless Lift Bank (3.5 m/s)",
    riserSyncStatus: "Zero spatial clashes between 4-car lift bank and 14th fl HVAC risers",
  },

  craneTelemetry: {
    craneId: "CRANE-01",
    model: "Liebherr 280 EC-H",
    jibRadiusM: 65.0,
    hookHeightM: 68.0,
    basePos: [-24, 0, 14] as [number, number, number],
    azimuthDeg: 38.5,
    trolleyRadiusM: 34.0,
    targetZone: "BIT-2 Silver Dome & BIT-1 Green Wedge",
    latencyMs: 12,
  },

  bits: [
    {
      bitId: "BIT-1",
      code: "BIT-1 GREEN WEDGE",
      name: "Monumental Terracotta Bridge Arch",
      shortTitle: "Terracotta Bridge Arch & Turf Amphitheatre",
      elevationLabel: "+12.00m RL",
      elevationM: 12.0,
      worldPos: [-14, 6, 12],
      dimensionsM: [26, 12, 16],
      structuralSystem: "48m Clear-Span Post-Tensioned Box Arch Ribs (M45)",
      mepSystem: "Sub-deck Stormwater Siphonic Drainage & Landscape Irrigation",
      architecturalSpec: "Stepped green turf amphitheatre roof with extruded terracotta louvers",
      completionPct: 78,
      allocatedBudgetCr: 118.40,
      status: "ACTIVE_EXECUTION",
    },
    {
      bitId: "BIT-2",
      code: "BIT-2 SILVER DOME",
      name: "Acoustic Auditorium Concourse",
      shortTitle: "Kalzip Standing-Seam Acoustic Dome",
      elevationLabel: "+16.50m RL",
      elevationM: 16.5,
      worldPos: [14, 8.25, 13],
      dimensionsM: [24, 16.5, 24],
      structuralSystem: "2,100-Ton Double-Layer Geodesic Space-Frame Truss",
      mepSystem: "Circular Perimeter Supply/Return HVAC Ring Duct (42,000 CFM)",
      architecturalSpec: "Kalzip aluminum standing-seam acoustic shell (< 1.5mm seam tolerance)",
      completionPct: 85,
      allocatedBudgetCr: 164.80,
      status: "SNAG_FLAGGED",
      activeIssueId: "SNAG-VANGUARD-401",
    },
    {
      bitId: "BIT-3",
      code: "BIT-3 HOTEL CORE",
      name: "14th Floor Diagonal Curtain Atrium",
      shortTitle: "14-Storey Commercial & Hospitality Core",
      elevationLabel: "+54.00m RL",
      elevationM: 54.0,
      worldPos: [-8, 27, -14],
      dimensionsM: [22, 54, 20],
      structuralSystem: "RCC Shear Core + Perimeter Diagrid Exoskeleton (M50/Fe550D)",
      mepSystem: "4-Car Lift Bank + 14th Fl Vertical HVAC Risers & Wet Fire Mains",
      architecturalSpec: "Double-glazed low-E diagonal diagrid curtain wall atrium",
      completionPct: 64,
      allocatedBudgetCr: 286.50,
      status: "ACTIVE_EXECUTION",
    },
    {
      bitId: "BIT-4",
      code: "BIT-4 PODIUM & CHILLER",
      name: "Podium Transfer Deck & 2,400 TR Plant",
      shortTitle: "Podium Concourse & Central Chiller Plant",
      elevationLabel: "+4.50m RL",
      elevationM: 4.5,
      worldPos: [0, 2.25, 0],
      dimensionsM: [64, 4.5, 52],
      structuralSystem: "M35/M45 Transfer Slab on 600mm × 18m Bored Piles (IS 2911)",
      mepSystem: "3 × 800-Ton VFD Chillers (2,400 TR) + Primary Chilled Water Headers",
      architecturalSpec: "Granite colonnade concourse & acoustic plant room louvers",
      completionPct: 94,
      allocatedBudgetCr: 132.20,
      status: "RESOLVED_CERTIFIED" as any,
      activeIssueId: "NCR-009",
    },
    {
      bitId: "BIT-5",
      code: "BIT-5 EAST WING",
      name: "East Innovation & Terracotta Wing",
      shortTitle: "7-Storey Composite Steel-Concrete Wing",
      elevationLabel: "+28.00m RL",
      elevationM: 28.0,
      worldPos: [18, 14, -12],
      dimensionsM: [18, 28, 18],
      structuralSystem: "ISMB 450 Composite Moment Frame + Profiled Deck Slabs",
      mepSystem: "VAV Floor Distribution & 11kV Busduct Riser Shafts",
      architecturalSpec: "Terracotta brise-soleil cladding & unitized glazing",
      completionPct: 58,
      allocatedBudgetCr: 108.60,
      status: "ACTIVE_EXECUTION",
    },
    {
      bitId: "BIT-6",
      code: "BIT-6 SLIM PAD",
      name: "Slim Rooftop Helipad Deck",
      shortTitle: "Cantilevered Steel Helideck (+23.0m RL)",
      elevationLabel: "+23.00m RL",
      elevationM: 23.0,
      worldPos: [18, 29.2, -12],
      dimensionsM: [15, 1.8, 15],
      structuralSystem: "Cantilevered Structural Steel Box-Girder Truss Deck",
      mepSystem: "Perimeter Aviation Obstruction Beacons & Foam Fire Monitors",
      architecturalSpec: "Non-skid aluminum helideck planking with ICAO 'H' marking",
      completionPct: 72,
      allocatedBudgetCr: 54.00,
      status: "ACTIVE_EXECUTION",
    },
  ] as ArchitecturalBitSpec[],

  spatialPins: [
    {
      pinId: "SNAG-VANGUARD-401",
      type: "SNAG",
      bitId: "BIT-2",
      title: "Kalzip Space-Frame Truss Node #14B",
      discipline: "STRUCTURAL",
      worldPos: [16.5, 14.8, 15.2],
      metricLabel: "Δ 4.2 mm Deviation",
      severity: "MINOR",
      description: "Laser scan deviation of 4.2mm recorded at Node #14B prior to Kalzip seam lock.",
      routeLink: "/site/360-tour?zone=BIT-2",
    },
    {
      pinId: "NCR-009",
      type: "NCR",
      bitId: "BIT-4",
      title: "Column C2 Post-Grout SonReb Certified",
      discipline: "STRUCTURAL",
      worldPos: [-6.0, 4.8, -6.0],
      metricLabel: "32.8 MPa (IS 456 Pass)",
      severity: "RESOLVED_CERTIFIED",
      description: "SikaGrout 214 micro-concrete injection verified via IS 13311 UPV (4.25 km/s); ₹2,08,720 lien unblocked.",
      routeLink: "/site/ndt",
    },
    {
      pinId: "MEP-CLASH-00",
      type: "SENSOR",
      bitId: "BIT-3",
      title: "14th Fl Lift Bank & HVAC Riser Core",
      discipline: "HVAC",
      worldPos: [-8.0, 46.0, -14.0],
      metricLabel: "0 Clashes • LOD-400",
      severity: "NOMINAL",
      description: "4-car high-speed lift core cleared against 14th floor vertical HVAC supply/return risers.",
      routeLink: "/site/360-tour?zone=BIT-3",
    },
    {
      pinId: "CHILLER-2400TR",
      type: "SENSOR",
      bitId: "BIT-4",
      title: "Central 2,400 TR Chiller Plant",
      discipline: "HVAC",
      worldPos: [8.0, 3.2, -2.0],
      metricLabel: "3 × 800-Ton VFD Online",
      severity: "NOMINAL",
      description: "Primary chilled water headers and cooling loop balanced at 2,400 TR design capacity.",
      routeLink: "/site/360-tour?zone=BIT-4",
    },
  ] as SpatialTelemetryPin[],

  governors: [
    {
      id: "ARGUS",
      role: "Site CV & Crane Radar",
      status: "NOMINAL",
      summary: "Liebherr 280 EC-H radar locked over Green Wedge & Silver Dome (Azimuth 38.5°).",
      metric: "12 ms Latency",
    },
    {
      id: "MIDAS",
      role: "Commercial & Billing",
      status: "NOMINAL",
      summary: "CPWD 5% statutory retention (₹43.22 Cr) & terracotta cladding ledger reconciled.",
      metric: "CPI 1.014",
    },
    {
      id: "MINERVA",
      role: "3D BIM & Spatial LOD400",
      status: "NOMINAL",
      summary: "Zero spatial clashes between 4-car lift bank and 14th fl HVAC risers; Node #14B tracked.",
      metric: "6 Zones Verified",
    },
    {
      id: "HERMES",
      role: "Notarization Core",
      status: "NOMINAL",
      summary: "BSA Section 63 tamper-evident Merkle hash log sealed for Gomti Nagar campus.",
      metric: "Block #18402",
    },
  ],
};
