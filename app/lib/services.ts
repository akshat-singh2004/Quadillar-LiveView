import type {
  AIMWorkOrder,
  ApprovedSubmittal,
  CdeItem,
  CdeState,
  ChangeOrderRecord,
  ContractorMilestoneAllocation,
  CustomMilestone,
  DashboardSnapshot,
  MaterialTestLog,
  MaterialInwardRecord,
  SafetyIncidentRecord,
  WorkInspectionRequest,
  ConcretePourCard,
  MeasurementBookEntry,
  PermitToWork,
  WIRStatus,
  PTWStatus,
  ProjectScheduleTask,
  EquipmentTelemetryRecord,
  RealityCaptureRecord,
  FacilityAssetRecord,
  MeetingMinutesRecord,
  MeetingActionStatus,
  MilestoneVerificationRule,
  PaymentApplication,
  PhaseInspectionGate,
  PunchListItem,
  PunchListStatus,
  RfiRecord,
  RfcRecord,
  AuditEvent,
  PortalRole,
  SubmittalActionCode,
  ClashIssue,
  BimClashRecord,
} from "@/types/construction";
import { supabase, hasSupabaseConfig } from "@/app/lib/supabase";
import { deriveChangeOrderFromRfc } from "@/lib/workflow/engine";
import { canApproveChangeOrder, canPublishGfc, canRespondToRfi } from "@/lib/auth/portalGate";
import { getCachedData, invalidateCache, setCachedData } from "@/lib/cache/redisCache";

export function isDemoModeEnabled(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem("quadillar-demo-mode") === "true";
  } catch {
    return false;
  }
}

const fallbackCdeItems: CdeItem[] = [
  {
    id: "cde-1",
    projectId: "proj-1",
    title: "Structural Rebar Package",
    container: "CDE/Project/Structural",
    state: "Published",
    status: "Approved",
    revision: 3,
    isLatest: true,
    approved: true,
    createdAt: "2026-08-12T09:00:00.000Z",
    updatedAt: "2026-08-17T08:30:00.000Z",
    submittedBy: "Civil Team",
    metadata: { retentionPeriodMet: true },
  },
  {
    id: "cde-2",
    projectId: "proj-1",
    title: "MEP Coordination Drawing",
    container: "CDE/Project/MEP",
    state: "Shared",
    status: "InReview",
    revision: 2,
    isLatest: true,
    approved: false,
    createdAt: "2026-08-15T08:00:00.000Z",
    updatedAt: "2026-08-18T12:00:00.000Z",
    submittedBy: "MEP Lead",
    metadata: { retentionPeriodMet: false },
  },
  {
    id: "cde-3",
    projectId: "proj-1",
    title: "Facade Mock-up Review",
    container: "CDE/Project/Facade",
    state: "WIP",
    status: "Draft",
    revision: 1,
    isLatest: true,
    approved: false,
    createdAt: "2026-08-18T00:00:00.000Z",
    updatedAt: "2026-08-18T13:15:00.000Z",
    submittedBy: "Facade Engineer",
    metadata: { retentionPeriodMet: false },
  },
];

const fallbackRfis: RfiRecord[] = [
  {
    id: "rfi-101",
    projectId: "proj-1",
    title: "Window Anchorage Detail",
    description: "Clarify the anchor load case for curtain wall brackets.",
    submittedBy: "Site Manager",
    submittedAt: "2026-08-17T07:00:00.000Z",
    dueAt: "2026-08-18T18:00:00.000Z",
    currentOwner: "Design Consultant",
    ballInCourt: "Consultant",
    status: "PendingResponse",
    contractImpact: "CostAndTime",
    riskScore: 82,
    slaHoursRemaining: 12,
  },
  {
    id: "rfi-102",
    projectId: "proj-1",
    title: "Concrete Pour Sequence",
    description: "Confirm pour sequence and curing window for slab strip pours.",
    submittedBy: "Site Engineer",
    submittedAt: "2026-08-16T10:00:00.000Z",
    dueAt: "2026-08-20T10:00:00.000Z",
    currentOwner: "Structural Engineer",
    ballInCourt: "Designer",
    status: "Open",
    contractImpact: "Time",
    riskScore: 66,
    slaHoursRemaining: 32,
  },
];

const fallbackChangeOrders: ChangeOrderRecord[] = [
  {
    id: "co-44",
    projectId: "proj-1",
    title: "Curtain Wall Interface Revision",
    description: "Additional glazing interface works due to revised facade bracket layout.",
    rfcId: "rfc-44",
    status: "AwaitingApproval",
    amount: 64000,
    timeImpactDays: 12,
    createdAt: "2026-08-17T00:00:00.000Z",
    approvalDueAt: "2026-08-20T12:00:00.000Z",
  },
  {
    id: "co-45",
    projectId: "proj-1",
    title: "Roof Access Route Amendment",
    description: "Temporary access route revision to accommodate crane lifting sequence.",
    rfcId: "rfc-45",
    status: "Draft",
    amount: 18000,
    timeImpactDays: 4,
    createdAt: "2026-08-18T09:00:00.000Z",
    approvalDueAt: "2026-08-21T09:00:00.000Z",
  },
];

const fallbackRfcs: RfcRecord[] = [
  {
    id: "rfc-44",
    projectId: "proj-1",
    title: "Curtain Wall Interface Revision",
    description: "Additional glazing interface works due to revised facade bracket layout.",
    rfiId: "rfi-101",
    status: "Open",
    potentialCost: 64000,
    potentialDelayDays: 12,
    contractImpact: "CostAndTime",
    createdAt: "2026-08-17T00:00:00.000Z",
    dueAt: "2026-08-20T12:00:00.000Z",
  },
];

const fallbackSubmittals: ApprovedSubmittal[] = [
  {
    id: "sub-001",
    projectId: "proj-1",
    title: "HVAC Chiller Package",
    trade: "HVAC",
    status: "Approved",
    actionCode: "Furnish_As_Submitted",
    approvalDate: "2026-08-18T00:00:00.000Z",
    metadata: {
      manufacturer: "Trane",
      model: "RTAA 380",
      expectedLifeYears: 18,
      uniclass: "EF_40_20_30",
    },
    componentList: [
      {
        name: "Water Cooled Chiller",
        type: "HVAC Equipment",
        location: "Plant Room 1",
        serialNumber: "CH-TR-2026-101",
        manufacturer: "Trane",
        modelNumber: "RTAA 380",
        assetId: "ASSET-CH-101",
        spaceLocationCode: "PR1-CH-01",
        warrantyStartDate: "2026-09-01",
        warrantyPeriod: 24,
        status: "Installed",
      },
    ],
  },
];

const fallbackMeetingMinutes: MeetingMinutesRecord[] = [
  { id: "mom-701", projectId: "proj-1", meetingNumber: "MOM-042", title: "Weekly coordination meeting", meetingDate: "2026-08-19T10:00:00.000Z", attendees: [{ id: "att-1", name: "A. Mehta", role: "Architect", present: true }, { id: "att-2", name: "R. Kumar", role: "Contractor", present: true }, { id: "att-3", name: "S. Rao", role: "Client", present: false }], agendaNotes: "Review Level 03 pre-pour readiness, MEP coordination, and façade access sequencing.", actionItems: [{ id: "act-1", description: "Submit coordinated Level 03 sleeve drawing", assignee: "Contractor", dueDate: "2026-08-22", status: "To Do" }, { id: "act-2", description: "Issue revised façade bracket detail", assignee: "Architect", dueDate: "2026-08-21", status: "In Progress" }], published: true, publishedAt: "2026-08-19T12:00:00.000Z", publishedBy: "Project Manager", createdAt: "2026-08-19T10:00:00.000Z" },
  { id: "mom-702", projectId: "proj-1", meetingNumber: "MOM-041", title: "HSE and logistics review", meetingDate: "2026-08-17T15:00:00.000Z", attendees: [{ id: "att-4", name: "K. Iyer", role: "HSE Officer", present: true }, { id: "att-5", name: "M. Das", role: "Contractor", present: true }], agendaNotes: "Review permit controls, material storage, and safe access routes.", actionItems: [{ id: "act-3", description: "Reissue updated lifting plan", assignee: "Contractor", dueDate: "2026-08-20", status: "Done" }], published: true, publishedAt: "2026-08-17T16:00:00.000Z", publishedBy: "Project Manager", createdAt: "2026-08-17T15:00:00.000Z" },
];

const fallbackConcretePourCards: ConcretePourCard[] = [
  {
    id: "pour-1",
    pourNumber: "POUR-026",
    location: "Podium slab / Grid C4-F8",
    grade: "M30 / 20 mm aggregate",
    plannedVolumeM3: 120,
    pouredVolumeM3: 84,
    designSlumpMm: 100,
    actualSlumpMm: 112,
    batchTag: "RMC-PLT-026-04",
    batchingPlantDeparture: "2026-08-25T06:35:00+05:30",
    dischargeChuteAt: "2026-08-25T07:20:00+05:30",
    clearances: { Rebar: true, Formwork: true, "MEP Conduit embedding": true, "Cover Block": false },
    status: "Ready for review",
  },
  {
    id: "pour-2",
    pourNumber: "POUR-025",
    location: "North tower / Level 07 beam",
    grade: "M35 / pump mix",
    plannedVolumeM3: 72,
    pouredVolumeM3: 72,
    designSlumpMm: 125,
    actualSlumpMm: 134,
    batchTag: "RMC-PLT-025-02",
    batchingPlantDeparture: "2026-08-25T05:10:00+05:30",
    dischargeChuteAt: "2026-08-25T06:28:00+05:30",
    clearances: { Rebar: true, Formwork: true, "MEP Conduit embedding": true, "Cover Block": true },
    status: "Cleared",
  },
];

const fallbackMeasurementBookEntries: MeasurementBookEntry[] = [
  {
    id: "mb-01",
    projectId: "proj-1",
    itemDescription: "M30 slab concrete",
    gridAxisLocation: "Grid B2-C5 / Level 03",
    nos: 1,
    length: 18,
    breadth: 12,
    depth: 0.15,
    unit: "m3",
    isDeduction: false,
    contractorVerified: false,
    measuredAt: "2026-08-25T08:00:00Z",
  },
  {
    id: "mb-02",
    projectId: "proj-1",
    itemDescription: "Column intersection deduction",
    gridAxisLocation: "Grid B2-C5 / Level 03",
    nos: -8,
    length: 0.45,
    breadth: 0.45,
    depth: 0.15,
    unit: "m3",
    isDeduction: true,
    contractorVerified: false,
    measuredAt: "2026-08-25T08:05:00Z",
  },
];

const fallbackPunchListItems: PunchListItem[] = [
  {
    punchItemId: "punch-101",
    projectId: "proj-1",
    spaceLocationCode: "FL-02 / Room 204 - Master Suite",
    assignedTaskTeamId: "Drywall",
    issueDescription: "Patchwork crack and uneven plaster near bathroom wall joint.",
    photoUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80",
    rectificationStatus: "Open",
    priority: "High Priority",
    createdAt: "2026-08-16T10:00:00.000Z",
  },
  {
    punchItemId: "punch-102",
    projectId: "proj-1",
    spaceLocationCode: "FL-01 / Lobby - Reception",
    assignedTaskTeamId: "Painting",
    issueDescription: "Touch-up scratches on wall finish after handover mock-up review.",
    photoUrl: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80",
    rectificationStatus: "Pending_Reinspection",
    priority: "Medium",
    createdAt: "2026-08-15T09:00:00.000Z",
    updatedAt: "2026-08-18T06:00:00.000Z",
  },
  {
    punchItemId: "punch-103",
    projectId: "proj-1",
    spaceLocationCode: "FL-03 / Service Corridor - LT Panel",
    assignedTaskTeamId: "Electrical",
    issueDescription: "Loose conduit support and minor cable tray misalignment.",
    photoUrl: "https://images.unsplash.com/photo-1512960201233-9b2cfad6d0f8?auto=format&fit=crop&w=900&q=80",
    rectificationStatus: "Closed",
    priority: "High Priority",
    createdAt: "2026-08-12T14:00:00.000Z",
    updatedAt: "2026-08-17T18:00:00.000Z",
    fixedAt: "2026-08-17T18:00:00.000Z",
  },
];

const fallbackMaterialInwardRecords: MaterialInwardRecord[] = [
  {
    id: "mir-101",
    projectId: "proj-1",
    inwardDate: "2026-08-20T08:30:00.000Z",
    challanNumber: "CH-8841",
    supplier: "UltraTech BuildSupply",
    category: "Cement",
    materialName: "OPC 53 Grade Cement",
    quantity: 420,
    unit: "Bags",
    qualityStatus: "Passed",
    mtcFileName: "MTC-8841.pdf",
    mtcFileUrl: "https://example.com/mtc-8841.pdf",
    receivedBy: "Store Officer",
    createdAt: "2026-08-20T08:30:00.000Z",
  },
  {
    id: "mir-102",
    projectId: "proj-1",
    inwardDate: "2026-08-19T13:15:00.000Z",
    challanNumber: "CH-8837",
    supplier: "Tata Tiscon",
    category: "Reinforcement Steel",
    materialName: "Fe 500D Rebar",
    quantity: 18.4,
    unit: "MT",
    qualityStatus: "Pending Lab Test",
    mtcFileName: "Mill-certificate-8837.pdf",
    mtcFileUrl: "https://example.com/mtc-8837.pdf",
    receivedBy: "QA/QC Engineer",
    createdAt: "2026-08-19T13:15:00.000Z",
  },
  {
    id: "mir-103",
    projectId: "proj-1",
    inwardDate: "2026-08-18T09:00:00.000Z",
    challanNumber: "RMC-441",
    supplier: "Metro RMC",
    category: "RMC Concrete",
    materialName: "M30 Concrete",
    quantity: 86,
    unit: "m³",
    qualityStatus: "Pending Lab Test",
    receivedBy: "Site Engineer",
    createdAt: "2026-08-18T09:00:00.000Z",
  },
];

const fallbackSafetyIncidents: SafetyIncidentRecord[] = [
  {
    id: "hse-201",
    projectId: "proj-1",
    incidentDate: "2026-08-20T07:45:00.000Z",
    type: "Unsafe Condition",
    title: "Unprotected edge at north stair landing",
    description: "Temporary guardrail was displaced during material movement and required immediate isolation.",
    location: "North stair core / Level 03",
    reportedBy: "Safety Officer",
    severity: "High",
    status: "CAPA Implemented",
    correctiveAction: "Area barricaded and guardrail reinstated.",
    preventiveAction: "Add guardrail inspection to the start-of-shift checklist.",
    createdAt: "2026-08-20T07:45:00.000Z",
  },
  {
    id: "hse-202",
    projectId: "proj-1",
    incidentDate: "2026-08-16T11:20:00.000Z",
    type: "Near Miss",
    title: "Dropped hand tool near façade access",
    description: "Hand tool fell from a platform and landed inside the exclusion zone without injury.",
    location: "West façade / Level 04",
    reportedBy: "Facade Foreman",
    severity: "Medium",
    status: "Closed",
    correctiveAction: "Tool lanyards issued to façade crew.",
    preventiveAction: "Weekly work-at-height toolbox talk added.",
    closedAt: "2026-08-17T15:00:00.000Z",
    createdAt: "2026-08-16T11:20:00.000Z",
  },
  {
    id: "hse-203",
    projectId: "proj-1",
    incidentDate: "2026-07-29T10:10:00.000Z",
    type: "LTI",
    title: "Slip injury during wet-weather access",
    description: "Worker sustained a lost-time injury while accessing the service corridor after rainfall.",
    location: "Service corridor / Level 01",
    reportedBy: "Site Superintendent",
    severity: "Critical",
    status: "Closed",
    correctiveAction: "Medical response completed and access route resurfaced.",
    preventiveAction: "Wet-weather access controls and drainage inspection implemented.",
    closedAt: "2026-08-03T12:00:00.000Z",
    createdAt: "2026-07-29T10:10:00.000Z",
  },
];

const fallbackWorkInspectionRequests: WorkInspectionRequest[] = [
  { id: "wir-301", projectId: "proj-1", wirNumber: "WIR-2026-031", title: "Pre-pour inspection - Level 03 slab", discipline: "Concrete", targetGridLocation: "Grid C-D / 3-5", requestedBy: "CoreBuild Contractors", requestedAt: "2026-08-20T06:30:00.000Z", inspectionDate: "2026-08-20T15:00:00.000Z", checklist: [{ id: "c1", label: "Formwork line, level and dimensions verified", status: "Pass" }, { id: "c2", label: "Rebar spacing, cover and laps verified", status: "Pending" }, { id: "c3", label: "Embedded items and MEP sleeves coordinated", status: "Pending" }], status: "Pending Inspection", createdAt: "2026-08-20T06:30:00.000Z" },
  { id: "wir-302", projectId: "proj-1", wirNumber: "WIR-2026-028", title: "Rebar inspection - Stair core walls", discipline: "Reinforcement", targetGridLocation: "Grid A-B / 6-8", requestedBy: "CoreBuild Contractors", requestedAt: "2026-08-19T08:00:00.000Z", checklist: [{ id: "r1", label: "Bar diameter and grade match approved BBS", status: "Pass" }, { id: "r2", label: "Cover blocks installed at approved spacing", status: "Pass" }, { id: "r3", label: "Rebar is clean and securely tied", status: "Pass" }], status: "Approved with Comments", verdictRemarks: "Proceed after protecting starter bars during concrete placement.", inspectedBy: "AOR / Structural Consultant", inspectedAt: "2026-08-19T15:00:00.000Z", createdAt: "2026-08-19T08:00:00.000Z" },
  { id: "wir-303", projectId: "proj-1", wirNumber: "WIR-2026-024", title: "Blockwork sample panel", discipline: "Masonry", targetGridLocation: "East wing / Level 02", requestedBy: "CoreBuild Contractors", requestedAt: "2026-08-17T09:00:00.000Z", checklist: [{ id: "m1", label: "Block alignment and joint thickness", status: "Fail", remarks: "Uneven vertical joint at bay 4." }, { id: "m2", label: "Mortar mix and curing provision", status: "Pass" }], status: "Revise and Resubmit", verdictRemarks: "Rework bay 4 and request follow-up inspection.", inspectedBy: "Architect Consultant", inspectedAt: "2026-08-17T14:00:00.000Z", createdAt: "2026-08-17T09:00:00.000Z" },
];

const fallbackPermitsToWork: PermitToWork[] = [
  { id: "ptw-401", projectId: "proj-1", permitNumber: "PTW-HW-041", type: "Hot Work", title: "Welding of façade brackets", location: "West façade / Level 04", requestedBy: "SteelWorks Team", validFrom: "2026-08-20T07:00:00.000Z", expiresAt: "2026-08-20T18:00:00.000Z", status: "Active", prerequisites: [{ id: "p1", label: "Fire extinguisher and fire watch assigned", completed: true }, { id: "p2", label: "Combustibles cleared from work area", completed: true }, { id: "p3", label: "Gas cylinders secured and inspected", completed: true }], issuedBy: "HSE Officer", createdAt: "2026-08-20T06:45:00.000Z" },
  { id: "ptw-402", projectId: "proj-1", permitNumber: "PTW-WH-017", type: "Work at Height", title: "External plaster access platform", location: "North elevation / Level 05", requestedBy: "Facade Team", validFrom: "2026-08-20T08:00:00.000Z", expiresAt: "2026-08-20T16:00:00.000Z", status: "Pending Approval", prerequisites: [{ id: "p4", label: "Scaffold tag and guardrails inspected", completed: true }, { id: "p5", label: "Harness and lifeline inspection recorded", completed: false }, { id: "p6", label: "Rescue plan briefed to crew", completed: true }], createdAt: "2026-08-20T07:30:00.000Z" },
  { id: "ptw-403", projectId: "proj-1", permitNumber: "PTW-CS-009", type: "Confined Space", title: "Sump pit waterproofing access", location: "Basement plant room", requestedBy: "MEP Services", validFrom: "2026-08-20T09:00:00.000Z", expiresAt: "2026-08-20T13:00:00.000Z", status: "Suspended", prerequisites: [{ id: "p7", label: "Atmospheric test completed", completed: true }, { id: "p8", label: "Standby attendant assigned", completed: true }, { id: "p9", label: "Rescue equipment staged", completed: true }], issuedBy: "HSE Officer", suspendedReason: "Gas monitor calibration expired.", createdAt: "2026-08-20T08:30:00.000Z" },
];

const fallbackProjectTasks: ProjectScheduleTask[] = [
  { id: "task-501", projectId: "proj-1", wbsCode: "1.0", title: "Site enabling and excavation", discipline: "Civil", baselineStart: "2026-04-01", baselineFinish: "2026-05-15", actualStart: "2026-04-03", actualFinish: "2026-05-18", completionPercent: 100, criticalPath: false, status: "Complete", earnedValue: 700000, plannedValue: 700000, actualCost: 730000, createdAt: "2026-03-20T00:00:00.000Z" },
  { id: "task-502", projectId: "proj-1", wbsCode: "2.0", title: "Core shell structural frame", discipline: "Structural", baselineStart: "2026-05-16", baselineFinish: "2026-08-30", actualStart: "2026-05-20", completionPercent: 72, criticalPath: true, status: "Delayed", earnedValue: 3100000, plannedValue: 3800000, actualCost: 3450000, createdAt: "2026-04-20T00:00:00.000Z" },
  { id: "task-503", projectId: "proj-1", wbsCode: "2.1", parentId: "task-502", title: "Level 03 slab and rebar", discipline: "Structural", baselineStart: "2026-07-15", baselineFinish: "2026-08-20", actualStart: "2026-07-18", completionPercent: 86, criticalPath: true, status: "In Progress", earnedValue: 1100000, plannedValue: 1250000, actualCost: 1190000, createdAt: "2026-06-15T00:00:00.000Z" },
  { id: "task-504", projectId: "proj-1", wbsCode: "3.0", title: "MEP rough-in coordination", discipline: "MEP", baselineStart: "2026-07-01", baselineFinish: "2026-09-30", actualStart: "2026-07-04", completionPercent: 58, criticalPath: false, status: "In Progress", earnedValue: 980000, plannedValue: 1150000, actualCost: 1020000, createdAt: "2026-06-01T00:00:00.000Z" },
  { id: "task-505", projectId: "proj-1", wbsCode: "4.0", title: "Facade finishes and mock-up", discipline: "Finishes", baselineStart: "2026-08-15", baselineFinish: "2026-10-15", completionPercent: 24, criticalPath: false, status: "In Progress", earnedValue: 250000, plannedValue: 300000, actualCost: 210000, createdAt: "2026-07-01T00:00:00.000Z" },
];

const fallbackEquipmentTelemetry: EquipmentTelemetryRecord[] = [
  { id: "eq-601", projectId: "proj-1", logDate: "2026-08-20", equipmentId: "CR-02", equipmentName: "Tower Crane 02", category: "Crane", operatingHours: 8.5, idleHours: 1.5, breakdownHours: 0, fuelLitres: 0, healthStatus: "Operational", operator: "R. Kumar", notes: "Normal lifting cycle", createdAt: "2026-08-20T18:00:00.000Z" },
  { id: "eq-602", projectId: "proj-1", logDate: "2026-08-20", equipmentId: "EX-01", equipmentName: "Crawler Excavator 01", category: "Excavator", operatingHours: 5, idleHours: 2, breakdownHours: 1, fuelLitres: 82, healthStatus: "Maintenance", operator: "S. Patel", notes: "Coolant inspection due", createdAt: "2026-08-20T18:00:00.000Z" },
  { id: "eq-603", projectId: "proj-1", logDate: "2026-08-20", equipmentId: "RMC-04", equipmentName: "RMC Transit Mixer 04", category: "Vehicle", operatingHours: 6.5, idleHours: 0.5, breakdownHours: 0, fuelLitres: 48, healthStatus: "Operational", operator: "A. Singh", createdAt: "2026-08-20T18:00:00.000Z" },
];

const fallbackRealityCaptures: RealityCaptureRecord[] = [
  { id: "capture-701", projectId: "proj-1", locationZone: "North Wing / Level 03", captureDate: "2026-08-20", label: "Level 03 structural progress", imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=80", designRenderUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=80", isEquirectangular: false, notes: "Slab pour and MEP sleeve coordination capture.", createdAt: "2026-08-20T08:00:00.000Z" },
  { id: "capture-702", projectId: "proj-1", locationZone: "North Wing / Level 03", captureDate: "2026-08-06", label: "Level 03 pre-pour condition", imageUrl: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80", isEquirectangular: false, createdAt: "2026-08-06T08:00:00.000Z" },
  { id: "capture-703", projectId: "proj-1", locationZone: "West Facade", captureDate: "2026-08-13", label: "Panoramic facade capture", imageUrl: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1800&q=80", isEquirectangular: true, createdAt: "2026-08-13T08:00:00.000Z" },
];

const fallbackFacilityAssets: FacilityAssetRecord[] = [
  { id: "asset-801", projectId: "proj-1", assetTag: "QL-HVAC-001", category: "HVAC", assetName: "Roof top air-cooled chiller", commissioningDate: "2026-08-12", serialNumber: "TRN-RTAA-2026-001", vendorName: "Trane India", vendorContact: "service@trane.example / +91 1800 100 200", warrantyStartDate: "2026-08-12", warrantyEndDate: "2028-08-11", dlpEndDate: "2027-08-11", asBuiltDrawingUrl: "https://example.com/as-built-hvac.pdf", omManualUrl: "https://example.com/om-hvac.pdf", commissioned: true, createdAt: "2026-08-12T12:00:00.000Z" },
  { id: "asset-802", projectId: "proj-1", assetTag: "QL-FLS-002", category: "Fire & Life Safety", assetName: "Addressable fire alarm panel", commissioningDate: "2026-08-18", serialNumber: "HNY-FACP-4402", vendorName: "Honeywell Building Solutions", vendorContact: "support@honeywell.example / +91 1800 300 400", warrantyStartDate: "2026-08-18", warrantyEndDate: "2026-09-05", dlpEndDate: "2027-08-17", asBuiltDrawingUrl: "https://example.com/as-built-fire.pdf", omManualUrl: "https://example.com/om-fire.pdf", commissioned: true, createdAt: "2026-08-18T12:00:00.000Z" },
  { id: "asset-803", projectId: "proj-1", assetTag: "QL-PMP-003", category: "Plumbing", assetName: "Transfer pump set", serialNumber: "KSB-PMP-003", vendorName: "KSB Pumps", vendorContact: "projects@ksb.example", warrantyStartDate: "2026-08-20", warrantyEndDate: "2027-08-19", dlpEndDate: "2027-08-19", asBuiltDrawingUrl: "https://example.com/as-built-pump.pdf", commissioned: false, defectDescription: "Vibration observed during test run.", createdAt: "2026-08-20T12:00:00.000Z" },
];

const fallbackClashes: ClashIssue[] = [
  {
    clashId: "clash-201",
    projectId: "proj-1",
    discipline: "MEP",
    severity: "Hard",
    description: "HVAC duct intersecting PT concrete beam at level 2 corridor near stair core.",
    status: "Open",
    drawingId: "cde-2",
    location: "FL-02 / Stair Core",
  },
  {
    clashId: "clash-202",
    projectId: "proj-1",
    discipline: "Structural",
    severity: "Hard",
    description: "Embedded sleeve conflict with main column grid at plant room west wall.",
    status: "Resolved",
    drawingId: "cde-1",
    location: "Plant Room 1",
    resolvedAt: "2026-08-17T10:00:00.000Z",
  },
  {
    clashId: "clash-203",
    projectId: "proj-1",
    discipline: "Architectural",
    severity: "Soft",
    description: "Insufficient maintenance clearance around electrical panel in lobby zone.",
    status: "Open",
    drawingId: "cde-4",
    location: "Lobby - Electrical Zone",
  },
];

const fallbackBimClashes: BimClashRecord[] = [
  {
    id: "bim-clash-001",
    projectId: "proj-1",
    title: "MEP vs Structural Beam",
    description: "HVAC duct intersects reinforced concrete beam within stair core corridor at level 2.",
    discipline: "MEP",
    severity: "Critical",
    status: "Open",
    x: 63,
    y: 42,
    z: 3.4,
    location: "Level 2 / Stair Core",
    sheet: "A-203",
    relatedRfiId: "rfi-101",
    createdAt: "2026-08-17T08:00:00.000Z",
  },
  {
    id: "bim-clash-002",
    projectId: "proj-1",
    title: "Embedded Sleeve at Column Grid",
    description: "Sleeve coordinate conflicts with column reinforcement on west plant wall.",
    discipline: "Structural",
    severity: "Moderate",
    status: "Pending Review",
    x: 34,
    y: 58,
    z: 2.8,
    location: "Plant Room 1 / West Wall",
    sheet: "S-102",
    createdAt: "2026-08-18T12:10:00.000Z",
  },
  {
    id: "bim-clash-003",
    projectId: "proj-1",
    title: "Electrical Clearance Envelope",
    description: "Panel clearance remains below maintenance envelope at lobby edge condition.",
    discipline: "Architectural",
    severity: "Low",
    status: "Resolved",
    x: 48,
    y: 20,
    z: 1.2,
    location: "Lobby / East Edge",
    sheet: "A-105",
    createdAt: "2026-08-15T14:40:00.000Z",
  },
];

const fallbackPaymentApplications: PaymentApplication[] = [
  {
    paymentApplicationId: "RA-01",
    projectId: "proj-1",
    tradePackage: "Concrete",
    scheduledValue: 2400000,
    previousWorkBilled: 1300000,
    currentWorkCompleted: 520000,
    storedMaterials: 160000,
    actualCost: 690000,
    retainageRate: 0.05,
    status: "Certified",
    qualityGatePassed: true,
    concreteTestPassed: true,
    notes: "Concrete works for podium slab and columns completed to approved inspection hold points.",
    certifiedAt: "2026-08-18T10:00:00.000Z",
    retainageWithheld: 250000,
  },
  {
    paymentApplicationId: "RA-02",
    projectId: "proj-1",
    tradePackage: "Steel",
    scheduledValue: 1800000,
    previousWorkBilled: 900000,
    currentWorkCompleted: 420000,
    storedMaterials: 120000,
    actualCost: 470000,
    retainageRate: 0.05,
    status: "Draft",
    qualityGatePassed: true,
    concreteTestPassed: true,
    notes: "Steel erection and connections progressing against revised anchor layout schedule.",
  },
  {
    paymentApplicationId: "RA-03",
    projectId: "proj-1",
    tradePackage: "MEP",
    scheduledValue: 2750000,
    previousWorkBilled: 1500000,
    currentWorkCompleted: 660000,
    storedMaterials: 230000,
    actualCost: 760000,
    retainageRate: 0.05,
    status: "Held",
    qualityGatePassed: false,
    concreteTestPassed: true,
    notes: "MEP package held pending final QA gate closure and coordinated access issue resolution.",
    retainageWithheld: 165000,
  },
  {
    paymentApplicationId: "RA-04",
    projectId: "proj-1",
    tradePackage: "Masonry",
    scheduledValue: 1650000,
    previousWorkBilled: 700000,
    currentWorkCompleted: 360000,
    storedMaterials: 135000,
    actualCost: 420000,
    retainageRate: 0.05,
    status: "Approved",
    qualityGatePassed: true,
    concreteTestPassed: true,
    notes: "Block and plaster works complete in the west wing with site engineer sign-off.",
    approvedAt: "2026-08-17T16:00:00.000Z",
    retainageWithheld: 125000,
  },
  {
    paymentApplicationId: "RA-05",
    projectId: "proj-1",
    tradePackage: "Finishes",
    scheduledValue: 2125000,
    previousWorkBilled: 950000,
    currentWorkCompleted: 490000,
    storedMaterials: 110000,
    actualCost: 540000,
    retainageRate: 0.05,
    status: "Certified",
    qualityGatePassed: true,
    concreteTestPassed: true,
    notes: "Wall finishes and stone cladding packages certified for the first domestic floor cycle.",
    certifiedAt: "2026-08-18T12:00:00.000Z",
    retainageWithheld: 175000,
  },
];

const fallbackAIMWorkOrders: AIMWorkOrder[] = [
  {
    workOrderId: "WO-1001",
    projectId: "proj-1",
    assetId: "ASSET-CH-101",
    assetName: "Water Cooled Chiller",
    assetLocation: "Plant Room 1",
    eventType: "Planned",
    status: "Completed",
    summary: "AHU filter replacement and condensate line servicing complete.",
    technicianDowntimeMinutes: 90,
    createdAt: "2026-08-16T08:30:00.000Z",
    completedAt: "2026-08-16T10:00:00.000Z",
    observedCondition: "Filter loading normal after replacement; no abnormal vibration reported.",
  },
  {
    workOrderId: "WO-1002",
    projectId: "proj-1",
    assetId: "ASSET-PUMP-201",
    assetName: "Booster Pump",
    assetLocation: "STP Room",
    eventType: "Unplanned",
    status: "Completed",
    summary: "Emergency repair for booster pump cavitation and leakage.",
    technicianDowntimeMinutes: 165,
    createdAt: "2026-08-18T06:00:00.000Z",
    completedAt: "2026-08-18T08:45:00.000Z",
    observedCondition: "Seal failure and inlet restriction found; replacement carried out and system recalibrated.",
  },
  {
    workOrderId: "WO-1003",
    projectId: "proj-1",
    assetId: "ASSET-ACQ-301",
    assetName: "North Wing Fire Pump",
    assetLocation: "North Wing Plant",
    eventType: "Acquisition",
    status: "Scheduled",
    summary: "Newly acquired property section condition assessment pending field verification.",
    technicianDowntimeMinutes: 45,
    createdAt: "2026-08-18T13:00:00.000Z",
    observedCondition: "Initial inspection requested before handover from transferred ownership group.",
  },
];

const fallbackCustomMilestones: CustomMilestone[] = [
  {
    milestone_id: "ms-001",
    title: "Core Shell Structural Completion",
    description: "Complete the reinforced concrete core shell and obtain consultant signoff for structural integrity.",
    sequence_order: 1,
    target_completion_date: "2026-09-15",
    allocated_budget_inr: 4200000,
    status: "In_Progress",
  },
  {
    milestone_id: "ms-002",
    title: "MEP Rough-in Ready for Inspection",
    description: "Coordinate the MEP rough-in installation and complete mandatory GFC and testing gates before services closure.",
    sequence_order: 2,
    target_completion_date: "2026-09-30",
    allocated_budget_inr: 3100000,
    status: "Under_Verification",
  },
];

const fallbackContractorMilestoneAllocations: ContractorMilestoneAllocation[] = [
  {
    allocation_id: "alloc-001",
    milestone_id: "ms-001",
    contractor_name: "Narmada Concrete Works",
    trade_specialization: "Concrete",
    assigned_contract_value_inr: 2100000,
    performance_status: "Active_On_Site",
  },
  {
    allocation_id: "alloc-002",
    milestone_id: "ms-001",
    contractor_name: "Metro Structural Consultants",
    trade_specialization: "Structural Design",
    assigned_contract_value_inr: 600000,
    performance_status: "Mobilized",
  },
  {
    allocation_id: "alloc-003",
    milestone_id: "ms-002",
    contractor_name: "Sundar MEP Services",
    trade_specialization: "MEP",
    assigned_contract_value_inr: 1850000,
    performance_status: "Active_On_Site",
  },
];

const fallbackMilestoneVerificationRules: MilestoneVerificationRule[] = [
  {
    rule_id: "rule-001",
    milestone_id: "ms-001",
    verification_type: "Consultant_Signoff",
    description: "Structural engineer sign-off on levels 1 to 4 frame and slab constructability review.",
    is_mandatory: true,
    is_verified: true,
    verified_by_role: "Architect of Record (AOR) / Structural Engineer of Record (SEOR) / MEP Consultant",
    verified_at: "2026-08-18T09:00:00.000Z",
  },
  {
    rule_id: "rule-002",
    milestone_id: "ms-001",
    verification_type: "Field_Photo_Proof",
    description: "Field photo proof captured at major concrete pour completion hold points.",
    is_mandatory: true,
    is_verified: false,
    verified_by_role: "Site Superintendent / Resident Project Engineer",
    verified_at: null,
  },
  {
    rule_id: "rule-003",
    milestone_id: "ms-002",
    verification_type: "GFC_Drawing_Verification",
    description: "Latest coordinated GFC drawing pack released and checked against site constraints.",
    is_mandatory: true,
    is_verified: true,
    verified_by_role: "General Contractor (GC) / Lead Consultant",
    verified_at: "2026-08-17T12:00:00.000Z",
  },
  {
    rule_id: "rule-004",
    milestone_id: "ms-002",
    verification_type: "Lab_Material_Test",
    description: "Mechanical and insulation test samples accepted by the third-party testing agency.",
    is_mandatory: true,
    is_verified: false,
    verified_by_role: "Certified Special Inspector (Third-Party Testing Agency)",
    verified_at: null,
  },
];

export function calculateEvmMetrics(application: PaymentApplication) {
  const earnedValue = application.currentWorkCompleted + application.storedMaterials;
  const actualCost = application.actualCost;
  const cpi = actualCost > 0 ? earnedValue / actualCost : 1;
  const retainageWithheld = application.status === "Certified" || application.status === "Approved" || application.status === "Held"
    ? (application.scheduledValue + application.storedMaterials) * application.retainageRate
    : 0;

  return {
    earnedValue,
    actualCost,
    cpi,
    isOverrun: cpi < 1,
    retainageWithheld,
  };
}

export function formatIndianCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} Lakh`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getNextCdeRevisionCode(state: CdeState, current?: string, revision = 0) {
  if (state === "WIP") return current?.startsWith("P") ? current : `P01.${String(Math.max(1, revision + 1)).padStart(2, "0")}`;
  if (state === "Shared") return current?.startsWith("P01") ? "P01" : `P${String(Math.max(1, revision + 1)).padStart(2, "0")}`;
  if (state === "Published") return `C${String(Math.max(1, revision + 1)).padStart(2, "0")}`;
  return current ?? `C${String(Math.max(1, revision)).padStart(2, "0")}`;
}

function mapCdeRow(row: Record<string, unknown>): CdeItem {
  return { ...row, projectId: row.project_id ?? row.projectId, isLatest: row.is_latest ?? row.isLatest, revisionCode: row.revision_code ?? row.revisionCode, createdAt: row.created_at ?? row.createdAt, updatedAt: row.updated_at ?? row.updatedAt, submittedBy: row.submitted_by ?? row.submittedBy } as CdeItem;
}

function mapRfiRow(row: Record<string, unknown>): RfiRecord {
  return { ...row, projectId: row.project_id ?? row.projectId, submittedAt: row.submitted_at ?? row.submittedAt, dueAt: row.due_at ?? row.dueAt, currentOwner: row.current_owner ?? row.currentOwner, ballInCourt: row.ball_in_court ?? row.ballInCourt, contractImpact: row.contract_impact ?? row.contractImpact, linkedRfcId: row.linked_rfc_id ?? row.linkedRfcId } as RfiRecord;
}

function mapChangeOrderRow(row: Record<string, unknown>): ChangeOrderRecord {
  return { ...row, projectId: row.project_id ?? row.projectId, rfcId: row.rfc_id ?? row.rfcId, timeImpactDays: row.time_impact_days ?? row.timeImpactDays, createdAt: row.created_at ?? row.createdAt, approvalDueAt: row.approval_due_at ?? row.approvalDueAt, approvedBy: row.approved_by ?? row.approvedBy, approvedAt: row.approved_at ?? row.approvedAt } as ChangeOrderRecord;
}

export function subscribeToProjectRealtime(
  projectId: string,
  callbacks: { onCdeChange: (payload: { eventType: string; new: Partial<CdeItem>; old: Partial<CdeItem> }) => void; onRfiChange: (payload: { eventType: string; new: Partial<RfiRecord>; old: Partial<RfiRecord> }) => void; onChangeOrderChange?: (payload: { eventType: string; new: Partial<ChangeOrderRecord>; old: Partial<ChangeOrderRecord> }) => void; onWirChange?: (payload: { eventType: string; new: Partial<WorkInspectionRequest>; old: Partial<WorkInspectionRequest> }) => void; onPtwChange?: (payload: { eventType: string; new: Partial<PermitToWork>; old: Partial<PermitToWork> }) => void },
) {
  if (!hasSupabaseConfig || !supabase) return () => undefined;

  const cdeChannel = supabase.channel("cde-changes").on("postgres_changes", { event: "*", schema: "public", table: "cde_items", filter: `project_id=eq.${projectId}` }, (payload) => callbacks.onCdeChange({ eventType: payload.eventType, new: mapCdeRow(payload.new as Record<string, unknown>), old: mapCdeRow(payload.old as Record<string, unknown>) })).subscribe();
  const rfiChannel = supabase.channel("rfi-updates").on("postgres_changes", { event: "*", schema: "public", table: "rfis", filter: `project_id=eq.${projectId}` }, (payload) => callbacks.onRfiChange({ eventType: payload.eventType, new: mapRfiRow(payload.new as Record<string, unknown>), old: mapRfiRow(payload.old as Record<string, unknown>) })).subscribe();
  const changeOrderChannel = callbacks.onChangeOrderChange ? supabase.channel("change-order-updates").on("postgres_changes", { event: "*", schema: "public", table: "change_orders", filter: `project_id=eq.${projectId}` }, (payload) => callbacks.onChangeOrderChange?.({ eventType: payload.eventType, new: mapChangeOrderRow(payload.new as Record<string, unknown>), old: mapChangeOrderRow(payload.old as Record<string, unknown>) })).subscribe() : null;
  const wirChannel = callbacks.onWirChange ? supabase.channel("wir-updates").on("postgres_changes", { event: "*", schema: "public", table: "work_inspection_requests", filter: `project_id=eq.${projectId}` }, (payload) => callbacks.onWirChange?.({ eventType: payload.eventType, new: payload.new as Partial<WorkInspectionRequest>, old: payload.old as Partial<WorkInspectionRequest> })).subscribe() : null;
  const ptwChannel = callbacks.onPtwChange ? supabase.channel("ptw-updates").on("postgres_changes", { event: "*", schema: "public", table: "permits_to_work", filter: `project_id=eq.${projectId}` }, (payload) => callbacks.onPtwChange?.({ eventType: payload.eventType, new: payload.new as Partial<PermitToWork>, old: payload.old as Partial<PermitToWork> })).subscribe() : null;

  return () => {
    void supabase.removeChannel(cdeChannel);
    void supabase.removeChannel(rfiChannel);
    if (changeOrderChannel) void supabase.removeChannel(changeOrderChannel);
    if (wirChannel) void supabase.removeChannel(wirChannel);
    if (ptwChannel) void supabase.removeChannel(ptwChannel);
  };
}

export async function fetchAuditEvents(projectId: string): Promise<AuditEvent[]> {
  if (!hasSupabaseConfig || !supabase) return [];
  const { data, error } = await supabase.from("audit_events").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  if (error) {
    console.warn("fetchAuditEvents failed:", error.message);
    return [];
  }
  return (data ?? []) as AuditEvent[];
}

export async function recordAuditEvent(event: AuditEvent) {
  if (!hasSupabaseConfig || !supabase) return event;
  const { data, error } = await supabase.from("audit_events").insert([{ ...event }]).select().single();
  if (error) {
    console.warn("recordAuditEvent failed:", error.message);
    return event;
  }
  return data as AuditEvent;
}

export async function fetchCdeItems(projectId?: string): Promise<CdeItem[]> {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackCdeItems.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  const query = supabase.from("cde_items").select("*");
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;

  if (error) {
    console.warn("fetchCdeItems failed:", error.message);
    return fallbackCdeItems.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  return (data ?? []).map((row) => mapCdeRow(row as Record<string, unknown>));
}

export async function fetchActiveRfis(projectId?: string): Promise<RfiRecord[]> {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackRfis.filter((rfi) => (projectId ? rfi.projectId === projectId : true));
  }

  const query = supabase.from("rfis").select("*");
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;

  if (error) {
    console.warn("fetchActiveRfis failed:", error.message);
    return fallbackRfis.filter((rfi) => (projectId ? rfi.projectId === projectId : true));
  }

  return (data ?? []).map((row) => mapRfiRow(row as Record<string, unknown>));
}

export async function createRfi(input: { projectId: string; title: string; description: string; actor: { role: PortalRole; name?: string } }): Promise<RfiRecord | null> {
  if (input.actor.role !== "contractor") return null;
  const now = new Date();
  const fallback: RfiRecord = { id: `rfi-${Date.now()}`, projectId: input.projectId, title: input.title, description: input.description, submittedBy: input.actor.name ?? "Site Contractor", submittedAt: now.toISOString(), dueAt: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(), currentOwner: "Design Consultant", ballInCourt: "Consultant", status: "Open", contractImpact: "None", riskScore: 20 };
  if (!hasSupabaseConfig || !supabase) return fallback;
  const { data, error } = await supabase.from("rfis").insert([{ id: fallback.id, project_id: fallback.projectId, title: fallback.title, description: fallback.description, submitted_by: fallback.submittedBy, submitted_at: fallback.submittedAt, due_at: fallback.dueAt, current_owner: fallback.currentOwner, ball_in_court: fallback.ballInCourt, status: fallback.status, contract_impact: fallback.contractImpact, risk_score: fallback.riskScore }]).select().single();
  if (error) {
    console.warn("createRfi failed:", error.message);
    return null;
  }
  return mapRfiRow(data as Record<string, unknown>);
}

export async function fetchPendingChangeOrders(projectId?: string): Promise<ChangeOrderRecord[]> {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackChangeOrders.filter((order) => (projectId ? order.projectId === projectId : true));
  }

  const query = supabase.from("change_orders").select("*");
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;

  if (error) {
    console.warn("fetchPendingChangeOrders failed:", error.message);
    return fallbackChangeOrders.filter((order) => (projectId ? order.projectId === projectId : true));
  }

  return (data ?? []).map((row) => mapChangeOrderRow(row as Record<string, unknown>));
}

export async function fetchRfcRecords(projectId?: string): Promise<RfcRecord[]> {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackRfcs.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  const query = supabase.from("rfcs").select("*");
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;

  if (error) {
    console.warn("fetchRfcRecords failed:", error.message);
    return fallbackRfcs.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  return (data ?? []) as RfcRecord[];
}

export async function fetchSubmittals(projectId?: string): Promise<ApprovedSubmittal[]> {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackSubmittals.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  const query = supabase.from("submittals").select("*");
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;

  if (error) {
    console.warn("fetchSubmittals failed:", error.message);
    return fallbackSubmittals.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  return (data ?? []) as ApprovedSubmittal[];
}

export async function fetchPunchListItems(projectId?: string): Promise<PunchListItem[]> {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackPunchListItems.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  const query = supabase.from("punch_list_items").select("*");
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;

  if (error) {
    console.warn("fetchPunchListItems failed:", error.message);
    return fallbackPunchListItems.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  return (data ?? []) as PunchListItem[];
}

export async function fetchMaterialInwardRecords(projectId?: string): Promise<MaterialInwardRecord[]> {
  if (isDemoModeEnabled()) {
    return fallbackMaterialInwardRecords.filter((item) => (projectId ? item.projectId === projectId : true));
  }
  if (!hasSupabaseConfig || !supabase) {
    return fallbackMaterialInwardRecords.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  const query = supabase.from("material_inward_records").select("*").order("inward_date", { ascending: false });
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;

  if (error) {
    console.warn("fetchMaterialInwardRecords failed:", error.message);
    return fallbackMaterialInwardRecords.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  return (data ?? []) as MaterialInwardRecord[];
}

export async function createMaterialInwardRecord(item: MaterialInwardRecord): Promise<MaterialInwardRecord | null> {
  if (!hasSupabaseConfig || !supabase) return item;

  const { data, error } = await supabase.from("material_inward_records").insert([{ ...item }]).select().single();
  if (error) {
    console.warn("createMaterialInwardRecord failed:", error.message);
    return null;
  }
  return data as MaterialInwardRecord;
}

export async function fetchConcretePourCards(projectId?: string): Promise<ConcretePourCard[]> {
  if (isDemoModeEnabled()) {
    return fallbackConcretePourCards.filter((item) => (projectId ? item.id.startsWith("pour-") || item.id === "proj-1" : true));
  }
  if (!hasSupabaseConfig || !supabase) {
    return fallbackConcretePourCards.filter((item) => (projectId ? item.id.startsWith("pour-") || item.id === "proj-1" : true));
  }

  const query = supabase.from("concrete_pour_cards").select("*").order("batching_plant_departure", { ascending: false, nullsFirst: false });
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;
  if (error) {
    console.warn("fetchConcretePourCards failed:", error.message);
    return fallbackConcretePourCards.filter((item) => (projectId ? item.id.startsWith("pour-") || item.id === "proj-1" : true));
  }
  return (data ?? []).map((row) => ({
    ...row,
    clearances: row.clearances ?? { Rebar: false, Formwork: false, "MEP Conduit embedding": false, "Cover Block": false },
  })) as ConcretePourCard[];
}

export async function createConcretePourCard(item: ConcretePourCard): Promise<ConcretePourCard | null> {
  if (!hasSupabaseConfig || !supabase) return item;

  const { data, error } = await supabase.from("concrete_pour_cards").upsert([{ ...item }], { onConflict: "id" }).select().single();
  if (error) {
    console.warn("createConcretePourCard failed:", error.message);
    return null;
  }
  return data as ConcretePourCard;
}

export async function upsertConcretePourCard(item: ConcretePourCard): Promise<ConcretePourCard | null> {
  return createConcretePourCard(item);
}

export async function fetchMeasurementBookEntries(projectId?: string): Promise<MeasurementBookEntry[]> {
  if (isDemoModeEnabled()) {
    return fallbackMeasurementBookEntries.filter((item) => (projectId ? item.projectId === projectId : true));
  }
  if (!hasSupabaseConfig || !supabase) {
    return fallbackMeasurementBookEntries.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  const query = supabase.from("measurement_book_entries").select("*").order("measured_at", { ascending: false, nullsFirst: false });
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;
  if (error) {
    console.warn("fetchMeasurementBookEntries failed:", error.message);
    return fallbackMeasurementBookEntries.filter((item) => (projectId ? item.projectId === projectId : true));
  }
  return (data ?? []).map((row) => ({
    ...row,
    nos: Number(row.nos ?? 0),
    length: Number(row.length ?? 0),
    breadth: Number(row.breadth ?? 0),
    depth: Number(row.depth ?? 0),
  })) as MeasurementBookEntry[];
}

export async function createMeasurementBookEntry(item: MeasurementBookEntry): Promise<MeasurementBookEntry | null> {
  if (!hasSupabaseConfig || !supabase) return item;

  const { data, error } = await supabase.from("measurement_book_entries").upsert([{ ...item }], { onConflict: "id" }).select().single();
  if (error) {
    console.warn("createMeasurementBookEntry failed:", error.message);
    return null;
  }
  return data as MeasurementBookEntry;
}

export async function upsertMeasurementBookEntry(item: MeasurementBookEntry): Promise<MeasurementBookEntry | null> {
  return createMeasurementBookEntry(item);
}

export async function fetchSafetyIncidents(projectId?: string): Promise<SafetyIncidentRecord[]> {
  if (isDemoModeEnabled()) {
    return fallbackSafetyIncidents.filter((item) => (projectId ? item.projectId === projectId : true));
  }
  if (!hasSupabaseConfig || !supabase) {
    return fallbackSafetyIncidents.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  const query = supabase.from("safety_incidents").select("*").order("incident_timestamp", { ascending: false, nullsFirst: false });
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;

  if (error) {
    console.warn("fetchSafetyIncidents failed:", error.message);
    return fallbackSafetyIncidents.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  return (data ?? []).map((item) => ({
    ...item,
    projectId: item.project_id ?? item.projectId,
    incidentDate: item.incident_timestamp ?? item.created_at ?? item.incident_date,
    createdAt: item.created_at ?? item.createdAt,
  })) as SafetyIncidentRecord[];
}

export async function updateSafetyIncident(
  incidentId: string,
  patch: Partial<SafetyIncidentRecord>,
): Promise<SafetyIncidentRecord | null> {
  if (!hasSupabaseConfig || !supabase) {
    const item = fallbackSafetyIncidents.find((entry) => entry.id === incidentId);
    return item ? { ...item, ...patch } : null;
  }

  const { data, error } = await supabase.from("safety_incidents").update({ ...patch }).eq("id", incidentId).select().single();
  if (error) {
    console.warn("updateSafetyIncident failed:", error.message);
    return null;
  }
  return data as SafetyIncidentRecord;
}

export async function fetchWorkInspectionRequests(projectId?: string): Promise<WorkInspectionRequest[]> {
  if (isDemoModeEnabled()) {
    return fallbackWorkInspectionRequests.filter((item) => (projectId ? item.projectId === projectId : true));
  }
  if (!hasSupabaseConfig || !supabase) return fallbackWorkInspectionRequests.filter((item) => (projectId ? item.projectId === projectId : true));
  const query = supabase.from("work_inspection_requests").select("*").order("requested_at", { ascending: false });
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;
  if (error) { console.warn("fetchWorkInspectionRequests failed:", error.message); return fallbackWorkInspectionRequests.filter((item) => (projectId ? item.projectId === projectId : true)); }
  return (data ?? []) as WorkInspectionRequest[];
}

export async function updateWorkInspectionRequest(id: string, patch: Partial<WorkInspectionRequest>): Promise<WorkInspectionRequest | null> {
  if (!hasSupabaseConfig || !supabase) {
    const item = fallbackWorkInspectionRequests.find((entry) => entry.id === id);
    return item ? { ...item, ...patch } : null;
  }
  const { data, error } = await supabase.from("work_inspection_requests").update({ ...patch }).eq("id", id).select().single();
  if (error) { console.warn("updateWorkInspectionRequest failed:", error.message); return null; }
  return data as WorkInspectionRequest;
}

export async function createWorkInspectionRequest(item: WorkInspectionRequest): Promise<WorkInspectionRequest | null> {
  if (!hasSupabaseConfig || !supabase) return item;
  const { data, error } = await supabase.from("work_inspection_requests").insert([{ ...item }]).select().single();
  if (error) { console.warn("createWorkInspectionRequest failed:", error.message); return null; }
  return data as WorkInspectionRequest;
}

export async function fetchPermitsToWork(projectId?: string): Promise<PermitToWork[]> {
  if (isDemoModeEnabled()) {
    return fallbackPermitsToWork.filter((item) => (projectId ? item.projectId === projectId : true));
  }
  if (!hasSupabaseConfig || !supabase) return fallbackPermitsToWork.filter((item) => (projectId ? item.projectId === projectId : true));
  const query = supabase.from("permits_to_work").select("*").order("expires_at", { ascending: true });
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;
  if (error) { console.warn("fetchPermitsToWork failed:", error.message); return fallbackPermitsToWork.filter((item) => (projectId ? item.projectId === projectId : true)); }
  return (data ?? []) as PermitToWork[];
}

export async function updatePermitStatus(id: string, status: PTWStatus, patch: Partial<PermitToWork> = {}): Promise<PermitToWork | null> {
  if (!hasSupabaseConfig || !supabase) {
    const item = fallbackPermitsToWork.find((entry) => entry.id === id);
    return item ? { ...item, status, ...patch } : null;
  }
  const { data, error } = await supabase.from("permits_to_work").update({ status, ...patch }).eq("id", id).select().single();
  if (error) { console.warn("updatePermitStatus failed:", error.message); return null; }
  return data as PermitToWork;
}

export async function fetchProjectTasks(projectId?: string): Promise<ProjectScheduleTask[]> {
  if (isDemoModeEnabled()) {
    return fallbackProjectTasks.filter((item) => (projectId ? item.projectId === projectId : true));
  }
  if (!hasSupabaseConfig || !supabase) return fallbackProjectTasks.filter((item) => (projectId ? item.projectId === projectId : true));
  const query = supabase.from("project_tasks").select("*").order("baseline_start", { ascending: true });
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;
  if (error) { console.warn("fetchProjectTasks failed:", error.message); return fallbackProjectTasks.filter((item) => (projectId ? item.projectId === projectId : true)); }
  return (data ?? []) as ProjectScheduleTask[];
}

export async function updateProjectTask(id: string, patch: Partial<ProjectScheduleTask>): Promise<ProjectScheduleTask | null> {
  if (!hasSupabaseConfig || !supabase) { const item = fallbackProjectTasks.find((entry) => entry.id === id); return item ? { ...item, ...patch } : null; }
  const { data, error } = await supabase.from("project_tasks").update({ ...patch }).eq("id", id).select().single();
  if (error) { console.warn("updateProjectTask failed:", error.message); return null; }
  return data as ProjectScheduleTask;
}

export async function createProjectTask(item: ProjectScheduleTask): Promise<ProjectScheduleTask | null> {
  if (!hasSupabaseConfig || !supabase) return item;
  const { data, error } = await supabase.from("project_tasks").insert([{ ...item }]).select().single();
  if (error) { console.warn("createProjectTask failed:", error.message); return null; }
  return data as ProjectScheduleTask;
}

export async function fetchEquipmentTelemetry(projectId?: string): Promise<EquipmentTelemetryRecord[]> {
  const cacheKey = `equipment-telemetry:${projectId ?? "all"}`;
  const cached = await getCachedData<EquipmentTelemetryRecord[]>(cacheKey);
  if (cached) return cached;
  if (isDemoModeEnabled()) {
    const fallback = fallbackEquipmentTelemetry.filter((item) => (projectId ? item.projectId === projectId : true));
    await setCachedData(cacheKey, fallback, 30);
    return fallback;
  }
  if (!hasSupabaseConfig || !supabase) { const fallback = fallbackEquipmentTelemetry.filter((item) => (projectId ? item.projectId === projectId : true)); await setCachedData(cacheKey, fallback, 30); return fallback; }
  const query = supabase.from("equipment_telemetry").select("*").order("log_date", { ascending: false });
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;
  if (error) { console.warn("fetchEquipmentTelemetry failed:", error.message); return fallbackEquipmentTelemetry.filter((item) => (projectId ? item.projectId === projectId : true)); }
  const records = (data ?? []) as EquipmentTelemetryRecord[];
  await setCachedData(cacheKey, records, 30);
  return records;
}

export async function createEquipmentTelemetry(item: EquipmentTelemetryRecord): Promise<EquipmentTelemetryRecord | null> {
  if (!hasSupabaseConfig || !supabase) return item;
  const { data, error } = await supabase.from("equipment_telemetry").insert([{ ...item }]).select().single();
  if (error) { console.warn("createEquipmentTelemetry failed:", error.message); return null; }
  await invalidateCache(`equipment-telemetry:${item.projectId}`);
  return data as EquipmentTelemetryRecord;
}

export async function fetchRealityCaptures(projectId?: string): Promise<RealityCaptureRecord[]> {
  if (isDemoModeEnabled()) {
    return fallbackRealityCaptures.filter((item) => (projectId ? item.projectId === projectId : true));
  }
  if (!hasSupabaseConfig || !supabase) return fallbackRealityCaptures.filter((item) => (projectId ? item.projectId === projectId : true));
  const query = supabase.from("reality_captures").select("*").order("capture_date", { ascending: false });
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;
  if (error) { console.warn("fetchRealityCaptures failed:", error.message); return fallbackRealityCaptures.filter((item) => (projectId ? item.projectId === projectId : true)); }
  return (data ?? []) as RealityCaptureRecord[];
}

export async function fetchFacilityAssets(projectId?: string): Promise<FacilityAssetRecord[]> {
  if (!hasSupabaseConfig || !supabase) return fallbackFacilityAssets.filter((item) => (projectId ? item.projectId === projectId : true));
  const query = supabase.from("facility_assets").select("*").order("asset_tag", { ascending: true });
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;
  if (error) { console.warn("fetchFacilityAssets failed:", error.message); return fallbackFacilityAssets.filter((item) => (projectId ? item.projectId === projectId : true)); }
  return (data ?? []) as FacilityAssetRecord[];
}

export async function createPunchListFromAssetDefect(asset: FacilityAssetRecord): Promise<PunchListItem | null> {
  const item: PunchListItem = { punchItemId: `punch-${Date.now()}`, projectId: asset.projectId, spaceLocationCode: asset.assetTag, assignedTaskTeamId: "Electrical", issueDescription: asset.defectDescription ?? `Warranty claim for ${asset.assetName}`, photoCdeItemId: asset.id, rectificationStatus: "Open", priority: "High Priority", createdAt: new Date().toISOString(), trade: "Electrical", locationZone: asset.category, assignee: asset.vendorName };
  return createPunchListItem(item);
}

export async function fetchClashIssues(projectId?: string): Promise<ClashIssue[]> {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackClashes.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  const query = supabase.from("clash_logs").select("*");
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;

  if (error) {
    console.warn("fetchClashIssues failed:", error.message);
    return fallbackClashes.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  return (data ?? []) as ClashIssue[];
}

export async function fetchBimClashes(projectId?: string): Promise<BimClashRecord[]> {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackBimClashes.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  const query = supabase.from("bim_clashes").select("*");
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;

  if (error) {
    console.warn("fetchBimClashes failed:", error.message);
    return fallbackBimClashes.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  return (data ?? []) as BimClashRecord[];
}

export async function createPunchListItem(item: PunchListItem): Promise<PunchListItem | null> {
  if (!hasSupabaseConfig || !supabase) {
    return item;
  }

  const { data, error } = await supabase.from("punch_list_items").insert([{ ...item }]).select().single();

  if (error) {
    console.warn("createPunchListItem failed:", error.message);
    return null;
  }

  return data as PunchListItem;
}

export async function updatePunchListItemStatus(
  punchItemId: string,
  nextStatus: PunchListStatus,
  patch: Partial<PunchListItem> = {},
): Promise<PunchListItem | null> {
  if (!hasSupabaseConfig || !supabase) {
    const item = fallbackPunchListItems.find((entry) => entry.punchItemId === punchItemId);
    if (!item) return null;
    return { ...item, rectificationStatus: nextStatus, ...patch, updatedAt: new Date().toISOString() };
  }

  const { data, error } = await supabase
    .from("punch_list_items")
    .update({ rectification_status: nextStatus, ...patch, updated_at: new Date().toISOString() })
    .eq("punch_item_id", punchItemId)
    .select()
    .single();

  if (error) {
    console.warn("updatePunchListItemStatus failed:", error.message);
    return null;
  }

  return data as PunchListItem;
}

export async function fetchPaymentApplications(projectId?: string): Promise<PaymentApplication[]> {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackPaymentApplications.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  const query = supabase.from("payment_applications").select("*");
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;

  if (error) {
    console.warn("fetchPaymentApplications failed:", error.message);
    return fallbackPaymentApplications.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  return (data ?? []) as PaymentApplication[];
}

export async function createPaymentApplication(application: PaymentApplication): Promise<PaymentApplication | null> {
  if (!hasSupabaseConfig || !supabase) {
    return application;
  }

  const { data, error } = await supabase.from("payment_applications").insert([{ ...application }]).select().single();

  if (error) {
    console.warn("createPaymentApplication failed:", error.message);
    return null;
  }

  return data as PaymentApplication;
}

export async function fetchAIMWorkOrders(projectId?: string): Promise<AIMWorkOrder[]> {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackAIMWorkOrders.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  const query = supabase.from("aim_work_orders").select("*");
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;

  if (error) {
    console.warn("fetchAIMWorkOrders failed:", error.message);
    return fallbackAIMWorkOrders.filter((item) => (projectId ? item.projectId === projectId : true));
  }

  return (data ?? []) as AIMWorkOrder[];
}

export async function createAIMWorkOrder(workOrder: AIMWorkOrder): Promise<AIMWorkOrder | null> {
  if (!hasSupabaseConfig || !supabase) {
    return workOrder;
  }

  const { data, error } = await supabase.from("aim_work_orders").insert([{ ...workOrder }]).select().single();

  if (error) {
    console.warn("createAIMWorkOrder failed:", error.message);
    return null;
  }

  return data as AIMWorkOrder;
}

export async function syncCobieComponentServicingHistory(assetId: string, workOrderId: string, action: string) {
  if (!hasSupabaseConfig || !supabase) {
    return {
      assetId,
      workOrderId,
      action,
      updated: true,
    };
  }

  const { data, error } = await supabase
    .from("cobie_components")
    .select("*")
    .eq("asset_id", assetId)
    .maybeSingle();

  if (error) {
    console.warn("syncCobieComponentServicingHistory failed:", error.message);
    return null;
  }

  const nextHistory = [
    ...(Array.isArray((data as { servicing_history?: unknown[] } | null)?.servicing_history) ? ((data as { servicing_history?: unknown[] } | null)?.servicing_history ?? []) : []),
    { work_order_id: workOrderId, action, completed_at: new Date().toISOString(), status: "Completed" },
  ];

  const { error: updateError } = await supabase
    .from("cobie_components")
    .update({ servicing_history: nextHistory })
    .eq("asset_id", assetId);

  if (updateError) {
    console.warn("syncCobieComponentServicingHistory update failed:", updateError.message);
    return null;
  }

  return { assetId, workOrderId, action, updated: true };
}

export async function fetchCustomMilestones(projectId?: string): Promise<CustomMilestone[]> {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackCustomMilestones.filter((item) => (projectId ? item.milestone_id.startsWith("ms-") : true));
  }

  const query = supabase.from("custom_milestones").select("*");
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;

  if (error) {
    console.warn("fetchCustomMilestones failed:", error.message);
    return fallbackCustomMilestones;
  }

  return (data ?? []) as CustomMilestone[];
}

export async function fetchContractorMilestoneAllocations(projectId?: string): Promise<ContractorMilestoneAllocation[]> {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackContractorMilestoneAllocations.filter((item) => (projectId ? item.milestone_id.startsWith("ms-") : true));
  }

  const query = supabase.from("contractor_milestone_allocations").select("*");
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;

  if (error) {
    console.warn("fetchContractorMilestoneAllocations failed:", error.message);
    return fallbackContractorMilestoneAllocations;
  }

  return (data ?? []) as ContractorMilestoneAllocation[];
}

export async function fetchMilestoneVerificationRules(projectId?: string): Promise<MilestoneVerificationRule[]> {
  if (!hasSupabaseConfig || !supabase) {
    return fallbackMilestoneVerificationRules.filter((item) => (projectId ? item.milestone_id.startsWith("ms-") : true));
  }

  const query = supabase.from("milestone_verification_rules").select("*");
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;

  if (error) {
    console.warn("fetchMilestoneVerificationRules failed:", error.message);
    return fallbackMilestoneVerificationRules;
  }

  return (data ?? []) as MilestoneVerificationRule[];
}

export async function fetchDashboardSnapshot(projectId?: string): Promise<DashboardSnapshot> {
  const cacheKey = `dashboard-kpis:${projectId ?? "all"}`;
  if (!isDemoModeEnabled()) {
    const cached = await getCachedData<DashboardSnapshot>(cacheKey);
    if (cached) return cached;
  }
  if (isDemoModeEnabled()) {
    return {
      cdeItems: fallbackCdeItems.filter((item) => (projectId ? item.projectId === projectId : true)),
      rfis: fallbackRfis.filter((item) => (projectId ? item.projectId === projectId : true)),
      rfcs: fallbackRfcs.filter((item) => (projectId ? item.projectId === projectId : true)),
      changeOrders: fallbackChangeOrders.filter((item) => (projectId ? item.projectId === projectId : true)),
      submittals: fallbackSubmittals.filter((item) => (projectId ? item.projectId === projectId : true)),
      punchListItems: fallbackPunchListItems.filter((item) => (projectId ? item.projectId === projectId : true)),
      clashIssues: fallbackClashes.filter((item) => (projectId ? item.projectId === projectId : true)),
      bimClashes: fallbackBimClashes.filter((item) => (projectId ? item.projectId === projectId : true)),
      paymentApplications: fallbackPaymentApplications.filter((item) => (projectId ? item.projectId === projectId : true)),
      aimWorkOrders: fallbackAIMWorkOrders.filter((item) => (projectId ? item.projectId === projectId : true)),
      materialTests: [],
      customMilestones: fallbackCustomMilestones.filter((item) => (projectId ? item.milestone_id.startsWith("ms-") : true)),
      contractorMilestoneAllocations: fallbackContractorMilestoneAllocations.filter((item) => (projectId ? item.milestone_id.startsWith("ms-") : true)),
      milestoneVerificationRules: fallbackMilestoneVerificationRules.filter((item) => (projectId ? item.milestone_id.startsWith("ms-") : true)),
      auditEvents: [],
      materialInwardRecords: fallbackMaterialInwardRecords.filter((item) => (projectId ? item.projectId === projectId : true)),
      safetyIncidents: fallbackSafetyIncidents.filter((item) => (projectId ? item.projectId === projectId : true)),
      workInspectionRequests: fallbackWorkInspectionRequests.filter((item) => (projectId ? item.projectId === projectId : true)),
      permitsToWork: fallbackPermitsToWork.filter((item) => (projectId ? item.projectId === projectId : true)),
      projectTasks: fallbackProjectTasks.filter((item) => (projectId ? item.projectId === projectId : true)),
      equipmentTelemetry: fallbackEquipmentTelemetry.filter((item) => (projectId ? item.projectId === projectId : true)),
      meetingMinutes: fallbackMeetingMinutes.filter((item) => (projectId ? item.projectId === projectId : true)),
      realityCaptures: fallbackRealityCaptures.filter((item) => (projectId ? item.projectId === projectId : true)),
      facilityAssets: fallbackFacilityAssets.filter((item) => (projectId ? item.projectId === projectId : true)),
    };
  }

  const [cdeItems, rfis, rfcs, changeOrders, submittals, punchListItems, clashIssues, bimClashes, paymentApplications, aimWorkOrders, customMilestones, contractorMilestoneAllocations, milestoneVerificationRules, auditEvents, materialInwardRecords, safetyIncidents, workInspectionRequests, permitsToWork, projectTasks, equipmentTelemetry, meetingMinutes, realityCaptures, facilityAssets] = await Promise.all([
    fetchCdeItems(projectId),
    fetchActiveRfis(projectId),
    fetchRfcRecords(projectId),
    fetchPendingChangeOrders(projectId),
    fetchSubmittals(projectId),
    fetchPunchListItems(projectId),
    fetchClashIssues(projectId),
    fetchBimClashes(projectId),
    fetchPaymentApplications(projectId),
    fetchAIMWorkOrders(projectId),
    fetchCustomMilestones(projectId),
    fetchContractorMilestoneAllocations(projectId),
    fetchMilestoneVerificationRules(projectId),
    projectId ? fetchAuditEvents(projectId) : Promise.resolve([]),
    fetchMaterialInwardRecords(projectId),
    fetchSafetyIncidents(projectId),
    fetchWorkInspectionRequests(projectId),
    fetchPermitsToWork(projectId),
    fetchProjectTasks(projectId),
    fetchEquipmentTelemetry(projectId),
    fetchMeetingMinutes(projectId),
    fetchRealityCaptures(projectId),
    fetchFacilityAssets(projectId),
  ]);

  const snapshot = {
    cdeItems,
    rfis,
    rfcs,
    changeOrders,
    submittals,
    punchListItems,
    clashIssues,
    bimClashes,
    paymentApplications,
    aimWorkOrders,
    materialTests: [],
    customMilestones,
    contractorMilestoneAllocations,
    milestoneVerificationRules,
    auditEvents,
    materialInwardRecords,
    safetyIncidents,
    workInspectionRequests,
    permitsToWork,
    projectTasks,
    equipmentTelemetry,
    meetingMinutes,
    realityCaptures,
    facilityAssets,
  };
  await setCachedData(cacheKey, snapshot, 30);
  return snapshot;
}

export async function updateCdeItemState(
  id: string,
  nextState: CdeState,
  patch: Partial<CdeItem> = {},
  actor: { role: PortalRole; name?: string },
): Promise<CdeItem | null> {
  if (nextState === "Published" && !canPublishGfc(actor.role)) return null;
  if (!hasSupabaseConfig || !supabase) {
    const item = fallbackCdeItems.find((entry) => entry.id === id);
    if (!item) return null;
    const nextRevisionCode = getNextCdeRevisionCode(nextState, item.revisionCode, item.revision);
    void recordAuditEvent({ id: `audit-${Date.now()}`, projectId: item.projectId, timestamp: new Date().toISOString(), role: actor.role === "client" ? "Client / Asset Owner" : "Architect of Record (AOR) / Structural Engineer of Record (SEOR) / MEP Consultant", action: "CDE State Transition", documentReference: item.id, tradeDiscipline: "MEP", actorName: actor.name, previousStatus: item.state, nextStatus: nextState, previousRevision: item.revisionCode, nextRevision: nextRevisionCode });
    return { ...item, state: nextState, revision: item.revision + 1, revisionCode: nextRevisionCode, ...patch, updatedAt: new Date().toISOString() };
  }

  const databasePatch: Record<string, unknown> = {
    state: nextState,
    updated_at: new Date().toISOString(),
    revision: (patch.revision ?? 0) + 1,
    revision_code: getNextCdeRevisionCode(nextState, patch.revisionCode, patch.revision),
  };
  if (patch.status) databasePatch.status = patch.status;
  if (patch.approved !== undefined) databasePatch.approved = patch.approved;
  if (patch.isLatest !== undefined) databasePatch.is_latest = patch.isLatest;
  if (patch.metadata !== undefined) databasePatch.metadata = patch.metadata;

  const { data, error } = await supabase
    .from("cde_items")
    .update(databasePatch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.warn("updateCdeItemState failed:", error.message);
    return null;
  }

  const updated = mapCdeRow(data as Record<string, unknown>);
  void recordAuditEvent({ id: `audit-${Date.now()}`, projectId: updated.projectId, timestamp: updated.updatedAt, role: actor.role === "client" ? "Client / Asset Owner" : "Architect of Record (AOR) / Structural Engineer of Record (SEOR) / MEP Consultant", action: "CDE State Transition", documentReference: updated.id, tradeDiscipline: "MEP", actorName: actor.name, previousStatus: patch.status, nextStatus: nextState, previousRevision: patch.revisionCode, nextRevision: updated.revisionCode });
  return updated;
}

export async function createOrUpdateSubmittal(submittal: ApprovedSubmittal): Promise<ApprovedSubmittal | null> {
  if (!hasSupabaseConfig || !supabase) {
    return submittal;
  }

  const { data, error } = await supabase
    .from("submittals")
    .upsert({ ...submittal }, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.warn("createOrUpdateSubmittal failed:", error.message);
    return null;
  }

  return data as ApprovedSubmittal;
}
export async function fetchMeetingMinutes(projectId?: string): Promise<MeetingMinutesRecord[]> {
  if (!hasSupabaseConfig || !supabase) return fallbackMeetingMinutes.filter((item) => (projectId ? item.projectId === projectId : true));
  const query = supabase.from("meeting_minutes").select("*").order("meeting_date", { ascending: false });
  const response = projectId ? query.eq("project_id", projectId) : query;
  const { data, error } = await response;
  if (error) { console.warn("fetchMeetingMinutes failed:", error.message); return fallbackMeetingMinutes.filter((item) => (projectId ? item.projectId === projectId : true)); }
  return (data ?? []) as MeetingMinutesRecord[];
}

export async function createOrUpdateMeetingMinutes(minutes: MeetingMinutesRecord): Promise<MeetingMinutesRecord | null> {
  if (!hasSupabaseConfig || !supabase) return minutes;
  const { data, error } = await supabase.from("meeting_minutes").upsert([{ ...minutes }], { onConflict: "id" }).select().single();
  if (error) { console.warn("createOrUpdateMeetingMinutes failed:", error.message); return null; }
  return data as MeetingMinutesRecord;
}

export async function updateMeetingActionStatus(meetingId: string, actionId: string, status: MeetingActionStatus): Promise<MeetingMinutesRecord | null> {
  const current = (await fetchMeetingMinutes("proj-1")).find((item) => item.id === meetingId);
  if (!current || current.published) return null;
  return createOrUpdateMeetingMinutes({ ...current, actionItems: current.actionItems.map((item) => item.id === actionId ? { ...item, status } : item) });
}
export async function answerRfiAndCreateRfc(input: {
  rfiId: string;
  responseText: string;
  requiresExtraWork: boolean;
  estimatedCost: number;
  delayDays: number;
  actor?: { role: PortalRole; name?: string };
}): Promise<{ rfi: RfiRecord | null; rfc: RfcRecord | null }> {
  const actor = input.actor ?? { role: "architect" as PortalRole };
  const currentRfi = fallbackRfis.find((item) => item.id === input.rfiId);
  if (currentRfi && !canRespondToRfi(actor.role, currentRfi.ballInCourt)) return { rfi: null, rfc: null };
  if (!hasSupabaseConfig || !supabase) {
    const rfi = currentRfi ?? null;
    const rfc: RfcRecord | null = input.requiresExtraWork
      ? {
          id: `rfc-${Date.now()}`,
          projectId: rfi?.projectId ?? "proj-1",
          title: rfi?.title ?? "Extra Work Proposal",
          description: input.responseText,
          rfiId: input.rfiId,
          status: "Open",
          potentialCost: input.estimatedCost,
          potentialDelayDays: input.delayDays,
          contractImpact: input.estimatedCost > 0 || input.delayDays > 0 ? "CostAndTime" : "None",
          createdAt: new Date().toISOString(),
          dueAt: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
        }
      : null;
    return { rfi, rfc };
  }

  const { data: updatedRfi, error: updateError } = await supabase
    .from("rfis")
    .update({ status: "Answered", response_text: input.responseText })
    .eq("id", input.rfiId)
    .select()
    .single();

  if (updateError) {
    console.warn("answerRfiAndCreateRfc update failed:", updateError.message);
    return { rfi: null, rfc: null };
  }

  let rfc: RfcRecord | null = null;
  if (input.requiresExtraWork) {
    const { data: createdRfc, error: rfcError } = await supabase
      .from("rfcs")
      .insert([
        {
          id: `rfc-${Date.now()}`,
          project_id: (updatedRfi as RfiRecord).projectId,
          title: (updatedRfi as RfiRecord).title,
          description: input.responseText,
          rfi_id: input.rfiId,
          status: "Open",
          potential_cost: input.estimatedCost,
          potential_delay_days: input.delayDays,
          contract_impact: input.estimatedCost > 0 || input.delayDays > 0 ? "CostAndTime" : "None",
          created_at: new Date().toISOString(),
          due_at: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
        },
      ])
      .select()
      .single();

    if (rfcError) {
      console.warn("answerRfiAndCreateRfc RFC create failed:", rfcError.message);
    } else {
      rfc = createdRfc as RfcRecord;
    }
  }

  return { rfi: updatedRfi as RfiRecord, rfc };
}

export async function updateRfiAssignment(
  rfiId: string,
  ballInCourt: RfiRecord["ballInCourt"],
  currentOwner: string,
): Promise<RfiRecord | null> {
  if (!hasSupabaseConfig || !supabase) {
    const item = fallbackRfis.find((entry) => entry.id === rfiId);
    return item ? { ...item, ballInCourt, currentOwner } : null;
  }

  const { data, error } = await supabase
    .from("rfis")
    .update({ ball_in_court: ballInCourt, current_owner: currentOwner })
    .eq("id", rfiId)
    .select()
    .single();

  if (error) {
    console.warn("updateRfiAssignment failed:", error.message);
    return null;
  }

  return data as RfiRecord;
}

export async function createChangeOrderFromRfc(rfc: RfcRecord): Promise<ChangeOrderRecord | null> {
  const changeOrder = deriveChangeOrderFromRfc(rfc);

  if (!hasSupabaseConfig || !supabase) {
    return changeOrder;
  }

  const { data, error } = await supabase
    .from("change_orders")
    .upsert(
      {
        id: changeOrder.id,
        project_id: changeOrder.projectId,
        title: changeOrder.title,
        description: changeOrder.description,
        rfc_id: changeOrder.rfcId,
        status: changeOrder.status,
        amount: changeOrder.amount,
        time_impact_days: changeOrder.timeImpactDays,
        created_at: changeOrder.createdAt,
        approval_due_at: changeOrder.approvalDueAt,
      },
      { onConflict: "id" },
    )
    .select()
    .single();

  if (error) {
    console.warn("createChangeOrderFromRfc failed:", error.message);
    return null;
  }

  return data as ChangeOrderRecord;
}

export async function closeRfi(rfiId: string): Promise<RfiRecord | null> {
  if (!hasSupabaseConfig || !supabase) {
    const item = fallbackRfis.find((entry) => entry.id === rfiId);
    return item ? { ...item, status: "Closed" } : null;
  }

  const { data, error } = await supabase.from("rfis").update({ status: "Closed" }).eq("id", rfiId).select().single();
  if (error) {
    console.warn("closeRfi failed:", error.message);
    return null;
  }
  return data as RfiRecord;
}

export async function updateChangeOrderStatus(
  changeOrderId: string,
  status: ChangeOrderRecord["status"],
  actor: { role: PortalRole; name?: string },
): Promise<ChangeOrderRecord | null> {
  if (status === "Approved" && !canApproveChangeOrder(actor.role)) return null;
  if (!hasSupabaseConfig || !supabase) {
    const item = fallbackChangeOrders.find((entry) => entry.id === changeOrderId);
    return item ? { ...item, status } : null;
  }

  const { data, error } = await supabase.from("change_orders").update({ status }).eq("id", changeOrderId).select().single();
  if (error) {
    console.warn("updateChangeOrderStatus failed:", error.message);
    return null;
  }
  return data as ChangeOrderRecord;
}

export async function insertMaterialTestLog(input: {
  projectId: string;
  grade: string;
  targetStrengthMpa: number;
  sevenDayStrength: number;
  twentyEightDayStrength: number;
}): Promise<MaterialTestLog | null> {
  const status =
    input.sevenDayStrength >= input.targetStrengthMpa * 0.65 &&
    input.twentyEightDayStrength >= input.targetStrengthMpa * 0.99
      ? "Pass"
      : "Fail";

  const payload = {
    id: `mat-test-${Date.now()}`,
    project_id: input.projectId,
    grade: input.grade,
    target_strength_mpa: input.targetStrengthMpa,
    seven_day_strength: input.sevenDayStrength,
    twenty_eight_day_strength: input.twentyEightDayStrength,
    status,
    tested_at: new Date().toISOString(),
  };

  if (!hasSupabaseConfig || !supabase) {
    return {
      id: payload.id,
      projectId: input.projectId,
      grade: input.grade,
      targetStrengthMpa: input.targetStrengthMpa,
      sevenDayStrength: input.sevenDayStrength,
      twentyEightDayStrength: input.twentyEightDayStrength,
      status,
      testedAt: payload.tested_at,
    };
  }

  const { data, error } = await supabase.from("material_testing_logs").insert([payload]).select().single();

  if (error) {
    console.warn("insertMaterialTestLog failed:", error.message);
    return null;
  }

  return data as MaterialTestLog;
}

export async function upsertPhaseInspectionGate(input: {
  projectId: string;
  phaseNumber: number;
  phaseName: string;
  mandatoryInspection: string;
  inspectionPassStatus: boolean;
  isClosed: boolean;
  isMandatory: boolean;
}): Promise<PhaseInspectionGate | null> {
  const payload = {
    id: `phase-${input.phaseNumber}-${Date.now()}`,
    project_id: input.projectId,
    phase_number: input.phaseNumber,
    phase_name: input.phaseName,
    mandatory_inspection: input.mandatoryInspection,
    inspection_pass_status: input.inspectionPassStatus,
    is_closed: input.isClosed,
    is_mandatory: input.isMandatory,
  };

  if (!hasSupabaseConfig || !supabase) {
    return {
      id: payload.id,
      projectId: input.projectId,
      phaseNumber: input.phaseNumber,
      phaseName: input.phaseName,
      mandatoryInspection: input.mandatoryInspection,
      inspectionPassStatus: input.inspectionPassStatus,
      isClosed: input.isClosed,
      isMandatory: input.isMandatory,
    };
  }

  const { data, error } = await supabase.from("phase_validation_gates").upsert([payload], { onConflict: "id" }).select().single();

  if (error) {
    console.warn("upsertPhaseInspectionGate failed:", error.message);
    return null;
  }

  return data as PhaseInspectionGate;
}

export async function createSubmittalReview(
  submittal: ApprovedSubmittal,
  actionCode: SubmittalActionCode,
): Promise<ApprovedSubmittal | null> {
  const status: ApprovedSubmittal["status"] =
    actionCode === "Revise_Resubmit" || actionCode === "Rejected" ? "Rejected" : "Approved";

  const updated: ApprovedSubmittal = {
    ...submittal,
    status,
    actionCode,
    approvalDate: new Date().toISOString(),
  };

  return createOrUpdateSubmittal(updated);
}
