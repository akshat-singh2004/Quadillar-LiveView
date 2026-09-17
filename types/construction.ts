export type CdeState = "WIP" | "Shared" | "Published" | "Archived";
export type CdeStatus = "Draft" | "InReview" | "Approved" | "Rejected" | "Archived";
export type ContractImpact = "None" | "Time" | "Cost" | "CostAndTime";
export type RfiStatus = "Open" | "PendingResponse" | "Answered" | "Escalated" | "Closed";
export type RfiBallInCourt = "Contractor" | "Consultant" | "Client" | "Supplier" | "Designer";
export type RfcStatus = "Open" | "UnderReview" | "Approved" | "Rejected" | "Closed";
export type ChangeOrderStatus = "Draft" | "AwaitingApproval" | "Approved" | "Rejected" | "Executed";
export type PunchListStatus = "Open" | "In Progress" | "Ready for Inspection" | "Closed" | "Pending_Reinspection";
export type PunchPriority = "High Priority" | "Medium" | "Low";
export type PunchTrade = "Masonry" | "Plumbing" | "Electrical" | "HVAC" | "Finishing";
export type IpcDeductionType = "Retention" | "Mobilization Advance Amortization" | "Section 194C TDS" | "GST TDS" | "Site Material Reconciliation Debits";
export type StockpileMaterial = "River Sand" | "20mm Aggregates" | "Excavated Soil";
export type ReconciliationMaterial = "Reinforcement Steel" | "Cement" | "RMC Concrete";
export type TbtTopic = "Height Safety" | "Electrical LOTO" | "Deep Excavation";
export type BbsShape = "Straight" | "L-Bend" | "Rectangular Stirrups" | "Circular Rings" | "Foundation Chairs";
export type NcrSeverity = "Critical / Stop Work" | "Major" | "Minor";
export type NcrStatus = "Open" | "CAPA Submitted" | "Closed";

export interface BbsBarRecord {
  id: string;
  projectId: string;
  drawingSheet: string;
  barMark: string;
  diameterMm: 8 | 10 | 12 | 16 | 20 | 25 | 32;
  shape: BbsShape;
  quantity: number;
  cuttingLengthM: number;
  steelWeightKg: number;
  status: "Planned" | "Cutting List Generated";
}

export interface NcrRecord {
  id: string;
  projectId: string;
  ncrNumber: string;
  title: string;
  summary: string;
  specification: string;
  severity: NcrSeverity;
  locationZone: string;
  status: NcrStatus;
  photoUrl?: string;
  rootCause?: string;
  rectificationPlan?: string;
  closureStamp?: string;
  issuedAt: string;
}

export interface MaterialReconciliationRecord {
  id: string;
  projectId: string;
  material: ReconciliationMaterial;
  boqReference: string;
  theoreticalQuantity: number;
  actualIssuedQuantity: number;
  unit: "MT" | "Bags" | "m3";
  allowableWastagePercent: number;
  recoveryUnitRate: number;
  reconciledAt: string;
  debitNoteId?: string;
}

export interface ToolboxTalkRecord {
  id: string;
  projectId: string;
  briefingDate: string;
  topic: TbtTopic;
  checklist: Array<{ label: string; completed: boolean }>;
  attendees: string[];
  photoUrl?: string;
  loggedAt?: string;
}

export interface IpcDeduction {
  type: IpcDeductionType;
  rate?: number;
  amount: number;
  note: string;
}

export interface IpcCalculation {
  applicationId: string;
  projectId: string;
  contractor: string;
  grossCertifiedAmount: number;
  deductions: IpcDeduction[];
  netPayable: number;
  utrReference?: string;
  stampedAt?: string;
}

export interface SurveyPolygonPoint {
  x: number;
  y: number;
}

export interface EarthworkSurvey {
  id: string;
  projectId: string;
  surveyDate: string;
  surveyName: string;
  orthomosaicUrl: string;
  cutVolumeM3: number;
  fillVolumeM3: number;
  targetCutM3: number;
  targetFillM3: number;
  polygon: SurveyPolygonPoint[];
}

export interface StockpileEstimate {
  material: StockpileMaterial;
  volumeM3: number;
  bulkDensityMtPerM3: number;
  massMt: number;
}
export type SignatureStakeholder = "Architect" | "Structural Engineer" | "Client";
export type SignatureDocumentType = "GFC Drawing" | "RA Billing Certificate";
export type VisionDetectionStatus = "Unverified AI Flag" | "Converted to Snag" | "Resolved";
export type VisionSeverity = "Critical" | "High" | "Medium" | "Low";

export interface DocumentSignatureRecord {
  id: string;
  projectId: string;
  documentName: string;
  documentType: SignatureDocumentType;
  signer: string;
  stakeholder: SignatureStakeholder;
  organization: string;
  credential: string;
  signedAt: string;
  certificateHash: string;
  verificationStatus: "Verified" | "Revoked";
  x: number;
  y: number;
}

export interface VisionBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisionDefectDetection {
  id: string;
  projectId: string;
  photoUrl: string;
  defectType: "Concrete Honeycombing" | "Missing Guardrails" | "Exposed Rebar" | "Water Ingress";
  confidence: number;
  severity: VisionSeverity;
  location: string;
  boundingBox: VisionBoundingBox;
  status: VisionDetectionStatus;
  punchItemId?: string;
  detectedAt: string;
}
export type DprReviewStatus = "Draft" | "Reviewed" | "Approved";
export type MaterialCategory = "Cement" | "Reinforcement Steel" | "RMC Concrete" | "Aggregates" | "Finishes";
export type MaterialQualityStatus = "Pending Lab Test" | "Passed" | "Failed" | "Not Required";
export type SafetyIncidentType = "Near Miss" | "Unsafe Condition" | "LTI";
export type SafetySeverity = "Critical" | "High" | "Medium" | "Low";
export type SafetyIncidentStatus = "Reported" | "Under Investigation" | "CAPA Implemented" | "Closed";
export type WIRStatus = "Pending Inspection" | "Approved" | "Approved with Comments" | "Revise and Resubmit" | "Rejected";
export type WIRChecklistStatus = "Pass" | "Fail" | "N/A" | "Pending";
export type PTWType = "Hot Work" | "Work at Height" | "Confined Space" | "Crane / Lifting";
export type PTWStatus = "Pending Approval" | "Active" | "Suspended" | "Closed Out" | "Expired";
export type ScheduleTaskStatus = "Not Started" | "In Progress" | "Complete" | "Delayed";
export type EquipmentHealthStatus = "Operational" | "Breakdown" | "Maintenance";
export type GisFeatureKind = "Plot Boundary" | "Building Footprint" | "Crane Swing Radius";
export type AlertChannel = "WhatsApp" | "SMS" | "Email";
export type GatewayDeliveryStatus = "Delivered" | "Failed" | "Queued";
export type FleetMaintenanceStatus = "Healthy" | "Service Due Soon" | "Service Overdue";
export type CommissioningTestType = "Hydrostatic Pressure" | "Megger Electrical" | "HVAC Air Balancing";
export type CommissioningTestStatus = "Pending" | "Passed" | "Failed / Re-test Required";
export type GatePassStatus = "Accepted & Unloaded" | "Rejected at Gate" | "Awaiting QA";
export type GateMaterialCategory = "Cement" | "Reinforcement Steel" | "RMC Concrete" | "Aggregates" | "Finishes";
export type PreventiveMaintenanceStatus = "Healthy" | "PM Due in < 15 Days" | "PM Overdue";
export type ITPStageGateType = "Hold Point (Mandatory Stop)" | "Witness Point" | "Surveillance Point";
export type ITPStageStatus = "Pending" | "Stage Cleared" | "Rejected";
export type VariationOrderStatus = "Submitted" | "Under Rate Analysis" | "Client Approved" | "Rejected";
export type VariationOriginator = "Client" | "Architect / Consultant" | "Contractor" | "Site Condition";
export type RedlineTool = "Revision Cloud" | "Leader Arrow" | "Freehand Pen" | "Highlighter" | "Dimension Caliper" | "Official Stamp";
export type RedlineRole = "Architect" | "Structural Engineer" | "MEP Consultant" | "General Contractor";
export type TenderBidStatus = "Responsive" | "Disqualified / Non-Responsive";
export type WorkOrderPaymentStatus = "Hold - IPC Unfunded" | "Ready for Authorization" | "Disbursed";
export type ScaffoldingTagStatus = "Green (Safe for Access)" | "Yellow (Inspection Due)" | "Red (Unsafe / Do Not Enter)";
export type StrippingPermitStatus = "Under Curing" | "Ready for Authorization" | "Authorized";
export type BackchargeCategory = "Damaged Works" | "Safety Fines" | "Housekeeping Negligence" | "Material Misuse";
export type BackchargeStatus = "Issued" | "Under Dispute" | "Certified by PMC" | "Debited in IPC";
export type WarrantyStatus = "Active Warranty" | "Expiring in < 30 Days" | "Expired / Out of Warranty";
export type ClashSeverity = "Hard" | "Soft";
export type ClashStatus = "Open" | "Resolved";
export type RoleName =
  | "Client / Asset Owner"
  | "General Contractor (GC) / Lead Consultant"
  | "Specialty Trade Contractor"
  | "Site Superintendent / Resident Project Engineer"
  | "Architect of Record (AOR) / Structural Engineer of Record (SEOR) / MEP Consultant"
  | "Certified Special Inspector (Third-Party Testing Agency)"
  | "Independent Commissioning Agent (CxA)"
  | "Authority Having Jurisdiction (AHJ) / Municipal Building Official"
  | "Facilities Operations Director / Asset Custodian";
export type StatutoryApprovalType =
  | "Municipal Building Sanction"
  | "Fire NOC"
  | "Environmental Clearance"
  | "Occupancy Certificate";
export type StatutoryApprovalStatus = "Active" | "ExpiringSoon" | "Expired" | "Pending";
export type TelepresenceSessionStatus = "Scheduled" | "Live" | "Completed";
export type PortalRole = "client" | "architect" | "contractor";
export type ConcreteClearanceKey = "Rebar" | "Formwork" | "MEP Conduit embedding" | "Cover Block";
export type ConcreteQualityStatus = "Compliant" | "Out of Tolerance";
export type DlpTicketCategory = "Waterproofing" | "Civil finishes" | "MEP services" | "Doors & windows";
export type DlpTicketPriority = "Emergency" | "Urgent" | "Routine";
export type DlpTicketStatus = "Open" | "Assigned" | "Awaiting Occupant Verification" | "Resolved";

export interface ConcretePourCard {
  id: string;
  pourNumber: string;
  location: string;
  grade: string;
  plannedVolumeM3: number;
  pouredVolumeM3: number;
  designSlumpMm: number;
  actualSlumpMm: number;
  batchTag: string;
  batchingPlantDeparture: string;
  dischargeChuteAt: string;
  clearances: Record<ConcreteClearanceKey, boolean>;
  status: "Ready for review" | "Cleared" | "Hold";
}

export interface DlpWarrantyTicket {
  id: string;
  unitRef: string;
  category: DlpTicketCategory;
  priority: DlpTicketPriority;
  status: DlpTicketStatus;
  description: string;
  subcontractor: string;
  openedAt: string;
  dueAt: string;
  disputedRepairCost?: number;
  occupantVerifiedAt?: string;
  retentionDebitRaised?: boolean;
}

export interface GeotechnicalReading { time: string; wallDeflectionMm: number; prismSettlementMm: number; piezometerLevelM: number; }
export interface PileLoadReading { loadKN: number; settlementMm: number; }
export interface CraneTelemetry { id: string; name: string; x: number; y: number; radiusM: number; jibAngleDeg: number; hookLoadMt: number; safeWorkingLoadMt: number; windKph: number; }
export type TradePackage = "Concrete" | "Steel" | "Masonry" | "MEP" | "Finishes";
export type PaymentApplicationStatus = "Draft" | "Submitted" | "Certified" | "Approved" | "Paid" | "Held" | "Released";
export type AimEventType = "Planned" | "Unplanned" | "Acquisition";
export type AimWorkOrderStatus = "Scheduled" | "InProgress" | "Completed";
export type MilestoneStatus = "Pending" | "In_Progress" | "Under_Verification" | "Certified_Completed";
export type ContractorPerformanceStatus = "Mobilized" | "Active_On_Site" | "Completed";
export type SensorStatus = "Healthy" | "Watch" | "Critical";
export type PermissionTier = "Full Admin" | "Editor / Approver" | "Field Reporter" | "Read & Comment";
export type VerificationType =
  | "Lab_Material_Test"
  | "Consultant_Signoff"
  | "GFC_Drawing_Verification"
  | "Field_Photo_Proof"
  | "Municipal_Clearance";
export type TransmittalPurpose = "For Review" | "For Construction / GFC" | "For Information" | "For Regulatory Approval";
export type DistributionMethod = "Email" | "FTP" | "Hard Copy" | "Project Portal" | "WhatsApp";
export type AuditAction =
  | "State Promoted to GFC"
  | "RFI Escalated to RFC"
  | "Cube Strength Test Certified"
  | "Change Order Signed";
export type SubmittalActionCode =
  | "Furnish_As_Submitted"
  | "Revise_As_Noted"
  | "Revise_Resubmit"
  | "Rejected";

export interface CdeItem {
  id: string;
  projectId: string;
  title: string;
  container: string;
  state: CdeState;
  status: CdeStatus;
  revision: number;
  revisionCode?: string;
  isLatest: boolean;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
  submittedBy: string;
  fileUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface RfiRecord {
  id: string;
  projectId: string;
  title: string;
  description: string;
  submittedBy: string;
  submittedAt: string;
  dueAt: string;
  currentOwner: string;
  ballInCourt: RfiBallInCourt;
  status: RfiStatus;
  contractImpact: ContractImpact;
  riskScore: number;
  linkedRfcId?: string;
  slaHoursRemaining?: number;
}

export interface RfcRecord {
  id: string;
  projectId: string;
  title: string;
  description: string;
  rfiId: string;
  relatedChangeOrderId?: string;
  status: RfcStatus;
  potentialCost: number;
  potentialDelayDays: number;
  contractImpact: ContractImpact;
  createdAt: string;
  dueAt: string;
}

export interface ChangeOrderRecord {
  id: string;
  projectId: string;
  title: string;
  description: string;
  rfcId: string;
  status: ChangeOrderStatus;
  amount: number;
  timeImpactDays: number;
  createdAt: string;
  approvalDueAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface CobieType {
  typeName: string;
  typeCategory: string;
  typeDescription?: string;
  manufacturer?: string;
  model?: string;
  expectedLifeYears?: number;
  uniclass?: string;
  createdAt: string;
  source: string;
}

export interface CobieComponent {
  componentName: string;
  componentType: string;
  location: string;
  spaceLocationCode?: string;
  serialNumber?: string;
  manufacturer?: string;
  modelNumber?: string;
  assetId?: string;
  warrantyStartDate?: string;
  warrantyPeriod?: number;
  status: "Installed" | "Pending" | "Rejected" | "Archived";
  createdAt: string;
  source: string;
  servicingHistory?: Array<{
    workOrderId: string;
    action: string;
    completedAt: string;
    status: "Completed" | "Pending";
  }>;
}

export interface CobieDataset {
  projectId: string;
  sourceSubmittalId: string;
  extractedAt: string;
  types: CobieType[];
  components: CobieComponent[];
}

export interface ApprovedSubmittal {
  id: string;
  projectId: string;
  title: string;
  trade: string;
  status: "Approved" | "Approved with Comments" | "Rejected" | "Revise and Resubmit" | "Pending";
  category?: "Shop Drawing" | "Material Sample" | "Method Statement";
  revisionCode?: string;
  submittedBy?: string;
  submittedAt?: string;
  attachments?: Array<{ id: string; fileName: string; fileUrl?: string; mimeType?: string }>;
  reviewRemarks?: string;
  actionCode?: SubmittalActionCode;
  approvalDate?: string;
  metadata?: Record<string, unknown>;
  componentList?: Array<{
    name?: string;
    type?: string;
    location?: string;
    serialNumber?: string;
    manufacturer?: string;
    modelNumber?: string;
    assetId?: string;
    spaceLocationCode?: string;
    warrantyStartDate?: string;
    warrantyPeriod?: number;
    status?: "Installed" | "Pending" | "Rejected" | "Archived";
  }>;
}

export interface MeetingAttendee {
  id: string;
  name: string;
  role: string;
  present: boolean;
}

export type MeetingActionStatus = "To Do" | "In Progress" | "Done";

export interface MeetingActionItem {
  id: string;
  description: string;
  assignee: string;
  dueDate: string;
  status: MeetingActionStatus;
}

export interface MeetingMinutesRecord {
  id: string;
  projectId: string;
  meetingNumber: string;
  title: string;
  meetingDate: string;
  attendees: MeetingAttendee[];
  agendaNotes: string;
  actionItems: MeetingActionItem[];
  published: boolean;
  publishedAt?: string;
  publishedBy?: string;
  createdAt: string;
}

export interface MaterialTestLog {
  id: string;
  projectId: string;
  grade: string;
  targetStrengthMpa: number;
  sevenDayStrength: number;
  twentyEightDayStrength: number;
  status: "Pass" | "Fail";
  testedAt: string;
}

export interface PhaseInspectionGate {
  id: string;
  projectId: string;
  phaseNumber: number;
  phaseName: string;
  mandatoryInspection: string;
  inspectionPassStatus: boolean;
  isClosed: boolean;
  isMandatory: boolean;
}

export interface PunchListItem {
  punchItemId: string;
  projectId: string;
  spaceLocationCode: string;
  assignedTaskTeamId: "Electrical" | "Plumbing" | "Drywall" | "Painting";
  issueDescription: string;
  photoCdeItemId?: string;
  photoUrl?: string;
  rectificationStatus: PunchListStatus;
  priority: PunchPriority;
  createdAt: string;
  updatedAt?: string;
  fixedAt?: string;
  trade?: PunchTrade;
  locationZone?: string;
  status?: PunchListStatus;
  assignee?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  x?: number;
  y?: number;
  sheet?: string;
}

export interface SiteDprPhoto {
  id: string;
  url: string;
  caption?: string;
  uploadedAt: string;
}

export interface SiteDprMilestoneLog {
  title: string;
  status: "Completed" | "In Progress" | "Delayed";
  note: string;
}

export interface SiteDailyProgressReport {
  id: string;
  projectId: string;
  reportDate: string;
  weather: {
    condition: string;
    temperatureC: number;
    humidityPct: number;
    windKph: number;
  };
  manpower: {
    total: number;
    subcontractors: number;
    supervisors: number;
  };
  machinery: {
    active: number;
    breakdown: string[];
  };
  narrative: string;
  milestoneLogs: SiteDprMilestoneLog[];
  photos: SiteDprPhoto[];
  status: DprReviewStatus;
  reviewedBy?: string;
  approvedBy?: string;
  createdAt: string;
}

export interface MaterialInwardRecord {
  id: string;
  projectId: string;
  inwardDate: string;
  challanNumber: string;
  supplier: string;
  category: MaterialCategory;
  materialName: string;
  quantity: number;
  unit: string;
  qualityStatus: MaterialQualityStatus;
  mtcFileName?: string;
  mtcFileUrl?: string;
  receivedBy: string;
  createdAt: string;
}

export interface SafetyIncidentRecord {
  id: string;
  projectId: string;
  incidentDate: string;
  type: SafetyIncidentType;
  title: string;
  description: string;
  location: string;
  reportedBy: string;
  severity: SafetySeverity;
  status: SafetyIncidentStatus;
  correctiveAction?: string;
  preventiveAction?: string;
  closedAt?: string;
  createdAt: string;
}

export interface WIRChecklistItem {
  id: string;
  label: string;
  status: WIRChecklistStatus;
  remarks?: string;
}

export interface WorkInspectionRequest {
  id: string;
  projectId: string;
  wirNumber: string;
  title: string;
  discipline: "Concrete" | "Reinforcement" | "Masonry" | "MEP" | "Finishes";
  targetGridLocation: string;
  requestedBy: string;
  requestedAt: string;
  inspectionDate?: string;
  checklist: WIRChecklistItem[];
  status: WIRStatus;
  verdictRemarks?: string;
  inspectedBy?: string;
  inspectedAt?: string;
  createdAt: string;
}

export interface PTWPrerequisite {
  id: string;
  label: string;
  completed: boolean;
}

export interface PermitToWork {
  id: string;
  projectId: string;
  permitNumber: string;
  type: PTWType;
  title: string;
  location: string;
  requestedBy: string;
  validFrom: string;
  expiresAt: string;
  status: PTWStatus;
  prerequisites: PTWPrerequisite[];
  issuedBy?: string;
  suspendedReason?: string;
  createdAt: string;
}

export interface ProjectScheduleTask {
  id: string;
  projectId: string;
  wbsCode: string;
  title: string;
  discipline: "Civil" | "Structural" | "MEP" | "Finishes";
  parentId?: string;
  baselineStart: string;
  baselineFinish: string;
  actualStart?: string;
  actualFinish?: string;
  completionPercent: number;
  criticalPath: boolean;
  status: ScheduleTaskStatus;
  earnedValue: number;
  plannedValue: number;
  actualCost: number;
  createdAt: string;
}

export interface EquipmentFleetRecord {
  id: string;
  projectId: string;
  assetNumber: string;
  machineType: string;
  operator: string;
  location: string;
  operatingHours: number;
  idleHours: number;
  fuelIssuedLitres: number;
  standardNormLph: number;
  serviceDueInHours: number;
  lastTelemetryAt: string;
  status: "Active" | "Idle" | "Offline";
}

export interface CommissioningTestPack {
  id: string;
  projectId: string;
  packNumber: string;
  system: string;
  testType: CommissioningTestType;
  location: string;
  witnessRequired: boolean;
  status: CommissioningTestStatus;
  consultantStamp?: string;
  executedAt?: string;
  values: {
    measured: number;
    allowable: number;
    unit: string;
    secondaryMeasured?: number;
    secondaryAllowable?: number;
    secondaryUnit?: string;
  };
}

export type ContractClaimStatus = "Submitted" | "Under Assessment" | "Determined" | "Disputed";
export type ClaimCauseCategory = "Variation" | "Delay / Disruption" | "Late Information" | "Force Majeure" | "Payment";
export type BcfIssueStatus = "Open" | "InProgress" | "Resolved";
export type WeatherOpsStatus = "Normal Site Ops" | "Restricted Weather Ops" | "Full Stoppage";

export interface ContractClaim {
  id: string;
  projectId: string;
  claimNumber: string;
  title: string;
  claimant: string;
  clauseCitation: string;
  causeCategory: ClaimCauseCategory;
  claimedDelayDays: number;
  claimedCost: number;
  costUnit: "₹ Lakhs" | "₹ Crores";
  submittedAt: string;
  status: ContractClaimStatus;
  determination?: string;
  approvedDelayDays?: number;
  approvedCost?: number;
  determinedAt?: string;
  evidenceSummary?: string;
  evidenceTimestamp?: string;
  weatherTelemetry?: {
    location: string;
    windKmH: number;
    rainfallMmHr: number;
    humidityPercent: number;
    temperatureC: number;
    trigger: string;
  };
}

export interface BcfIssueTopic {
  issueId: string;
  title: string;
  description: string;
  status: BcfIssueStatus;
  discipline: string;
  location: string;
  coordinate: { x: number; y: number; z: number };
  camera: {
    viewPointX: number;
    viewPointY: number;
    viewPointZ: number;
    upVectorX: number;
    upVectorY: number;
    upVectorZ: number;
    cameraDirectionX: number;
    cameraDirectionY: number;
    cameraDirectionZ: number;
  };
  relatedDocumentId?: string;
}

export interface MicroclimateTelemetryReading {
  id: string;
  projectId: string;
  location: string;
  temperatureC: number;
  windKmH: number;
  rainfallMmHr: number;
  humidityPercent: number;
  capturedAt: string;
  status: WeatherOpsStatus;
  trigger: string[];
}

export interface AdverseWeatherEvent {
  id: string;
  projectId: string;
  startedAt: string;
  resolvedAt?: string;
  status: WeatherOpsStatus;
  windKmH: number;
  rainfallMmHr: number;
  affectedActivities: string[];
  stoppageReason: string;
}

export interface DesignCoordinationHealth {
  resolvedPercent: number;
  openClashes: number;
  totalClashes: number;
  zoneHealth: Array<{ zone: string; open: number; resolved: number; total: number }>;
}

export interface VendorScorecard {
  id: string;
  vendorName: string;
  trade: string;
  safety: number;
  quality: number;
  scheduleAdherence: number;
  commercialCooperation: number;
}

export type CarbonScope = "Scope 1" | "Scope 2" | "Scope 3";
export interface CarbonTelemetryEntry {
  id: string;
  material: string;
  scope: CarbonScope;
  quantity: number;
  unit: string;
  emissionFactor: number;
  factorUnit: string;
  projectAreaM2: number;
  loggedAt: string;
}

export type WasteStream = "Concrete rubble" | "Ferrous scrap" | "Timber" | "Packaging" | "Mixed inert";
export interface WasteManifest {
  id: string;
  date: string;
  stream: WasteStream;
  quantityTonnes: number;
  destination: "On-site sub-base recycling" | "External scrap mill" | "Licensed recovery" | "Landfill";
  haulingContractor: string;
  weighbridgeSlip: string;
}

export type SettlementStatus = "Draft" | "In Review" | "Approved" | "Settled & Closed";
export type ContractClauseSeverity = "High Risk" | "Medium Risk" | "Standard";

export interface ContractClauseCard {
  id: string;
  type: "Liquidated Damages" | "Defect Liability" | "Price Escalation" | "Force Majeure";
  severity: ContractClauseSeverity;
  summary: string;
  riskDriver: string;
  mitigation: string;
}

export interface ContractComplianceIssue {
  id: string;
  standard: "IS 456" | "NBC" | "IS 1893" | "IS 800";
  subject: string;
  status: "Pass" | "Mismatch";
  issue: string;
  recommendation: string;
}

export interface ContractDocumentAnalysis {
  id: string;
  documentName: string;
  uploadedAt: string;
  pdfLabel: string;
  pageCount: number;
  clauses: ContractClauseCard[];
  complianceChecks: ContractComplianceIssue[];
}

export interface FinalSettlement {
  id: string;
  packageName: string;
  contractor: string;
  cumulativeRaBills: number;
  finalCertifiedAmount: number;
  retentionAmount: number;
  dlpExpiry: string;
  punchItemsClosed: boolean;
  noClaimsCertificate?: string;
  finalCompletionCertificate?: string;
  status: SettlementStatus;
}

export type LaborTrade = "Masons" | "Steel Fixers" | "Carpenters" | "Helpers";
export interface LaborRosterEntry {
  id: string;
  projectId: string;
  workDate: string;
  trade: LaborTrade;
  plannedHeadcount: number;
  actualHeadcount: number;
  wageRatePerDay: number;
  overtimeHours: number;
}

export type LaborSkillTier = "Skilled" | "Semi-skilled" | "Unskilled";
export interface WorkforceMusterEntry extends LaborRosterEntry {
  skillTier: LaborSkillTier;
  unitsInstalled: number;
  unitLabel: string;
  biometricInAt: string;
  biometricOutAt?: string;
  bocwCessVerified: boolean;
  pfEsicVerified: boolean;
  minimumWageCompliant: boolean;
}

export type Bim4DSequenceStatus = "Planned Future" | "In Progress / Pouring" | "Completed" | "Delayed vs Baseline";
export interface Bim4DScheduleSequence {
  id: string;
  elementId: string;
  taskId: string;
  baselineStart: string;
  baselineFinish: string;
  actualStart?: string;
  actualFinish?: string;
  status: Bim4DSequenceStatus;
}

export interface ConcreteMaturityReading {
  time: string;
  coreTemperatureC: number;
  surfaceTemperatureC: number;
  ambientTemperatureC: number;
}

export type PossessionChecklistKey = "Finishes" | "Plumbing fixtures" | "Electrical switches" | "Utility meters";
export interface CustomerPossessionRecord {
  id: string;
  unitRef: string;
  buyerName: string;
  checklist: Record<PossessionChecklistKey, boolean>;
  unresolvedSnagsCount: number;
  pendingTickets: string[];
  inspectedPercent: number;
  deSnaggedPercent: number;
  handedOver: boolean;
}

export type VoiceMemoCategory = "RFI" | "Snag / Punch List" | "Safety Hazard" | "Daily Note";
export interface VoiceMemoRecord {
  id: string;
  transcript: string;
  category: VoiceMemoCategory;
  durationMs: number;
  createdAt: string;
  audioUrl?: string;
}

export interface PredictiveRisk {
  id: string;
  title: string;
  category: "Quality" | "Weather" | "Commercial" | "Schedule";
  probability: number;
  impact: number;
  estimatedCostExposure: number;
  signal: string;
  mitigation: string;
}

export type BimSensorBinding = {
  elementId: string;
  sensor: SiteSensorTelemetry;
};

export interface EquipmentTelemetryRecord {
  id: string;
  projectId: string;
  logDate: string;
  equipmentId: string;
  equipmentName: string;
  category: "Crane" | "Excavator" | "Loader" | "Concrete Plant" | "Vehicle";
  operatingHours: number;
  idleHours: number;
  breakdownHours: number;
  fuelLitres: number;
  healthStatus: EquipmentHealthStatus;
  operator: string;
  notes?: string;
  createdAt: string;
}

export interface RealityCaptureRecord {
  id: string;
  projectId: string;
  locationZone: string;
  captureDate: string;
  label: string;
  imageUrl: string;
  designRenderUrl?: string;
  isEquirectangular: boolean;
  notes?: string;
  createdAt: string;
}

export interface GisMapFeature {
  id: string;
  projectId: string;
  kind: GisFeatureKind;
  label: string;
  coordinates: Array<{ x: number; y: number }>;
  fillColor: string;
  strokeColor: string;
  strokeDasharray?: string;
}

export interface GisZoneTelemetry {
  id: string;
  projectId: string;
  zoneName: string;
  coordinates: { x: number; y: number };
  activeWorkers: number;
  openPunchListItems: number;
  equipment: string[];
  status: "Normal" | "Watch" | "Restricted";
}

export interface AlertDispatchRecord {
  id: string;
  projectId: string;
  triggeredAt: string;
  alertTitle: string;
  message: string;
  channel: AlertChannel;
  recipient: string;
  recipientRole: string;
  status: GatewayDeliveryStatus;
  gatewayReference?: string;
}

export interface FacilityAssetRecord {
  id: string;
  projectId: string;
  assetTag: string;
  category: string;
  assetName: string;
  commissioningDate?: string;
  serialNumber: string;
  vendorName: string;
  vendorContact: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  dlpEndDate?: string;
  asBuiltDrawingUrl?: string;
  omManualUrl?: string;
  commissioned: boolean;
  defectDescription?: string;
  pmDueDate?: string;
  warrantyCardUrl?: string;
  inspectionLogs?: string[];
  createdAt: string;
}

export interface GatePassRecord {
  id: string;
  projectId: string;
  vehicleNumber: string;
  driverName: string;
  supplier: string;
  materialCategory: GateMaterialCategory;
  poReference: string;
  challanQuantityMt: number;
  grossWeightMt: number;
  tareWeightMt: number;
  status: GatePassStatus;
  stockyardBin?: string;
  registeredAt: string;
  qaClearedAt?: string;
}

export interface MeasurementBookEntry {
  id: string;
  projectId: string;
  itemDescription: string;
  gridAxisLocation: string;
  nos: number;
  length: number;
  breadth: number;
  depth: number;
  unit: "m3" | "m2" | "m";
  isDeduction: boolean;
  contractorVerified: boolean;
  consultantStamp?: string;
  measuredAt: string;
}

export interface ITPStageGate {
  id: string;
  projectId: string;
  stage: string;
  gateType: ITPStageGateType;
  status: ITPStageStatus;
  critical: boolean;
  relatedWirNumbers: string[];
  relatedPourSchedule: string;
  evidenceFileName?: string;
  signedBy?: string;
  signedAt?: string;
}

export interface VariationOrderRecord {
  id: string;
  projectId: string;
  voNumber: string;
  originatorCategory: VariationOriginator;
  scopeDescription: string;
  scheduleImpactDays: number;
  materialCost: number;
  laborCost: number;
  plantMachineryCost: number;
  contractorProfitOverheadPercent: number;
  gstPercent: number;
  status: VariationOrderStatus;
  architectRecommendation?: string;
  quantitySurveyorCertified?: boolean;
  clientSanctioned?: boolean;
  createdAt: string;
}

export interface PanoramaSnapshot {
  id: string;
  projectId: string;
  capturedAt: string;
  weekLabel: string;
  location: string;
  imageUrl: string;
}

export interface DrawingRedlineAnnotation {
  id: string;
  projectId: string;
  tool: RedlineTool;
  role: RedlineRole;
  label: string;
  points: Array<{ x: number; y: number }>;
  stampText?: "GFC APPROVED" | "SUPERSEDED" | "WORK IN PROGRESS";
  resolved: boolean;
  resolvedAt?: string;
}

export interface TenderBidRecord {
  id: string;
  projectId: string;
  tenderPackage: string;
  contractor: string;
  baseBid: number;
  negotiatedBid: number;
  technicalScore: number;
  status: TenderBidStatus;
  submittedAt: string;
}

export interface SubcontractorWorkOrder {
  id: string;
  projectId: string;
  workOrderNumber: string;
  tradePackage: string;
  subcontractor: string;
  contractValue: number;
  cumulativeClaimed: number;
  retainageRate: number;
  milestone: string;
  masterIpcFunded: boolean;
  status: WorkOrderPaymentStatus;
  lineItems: Array<{ description: string; amount: number }>;
}

export interface StrippingPermitRecord {
  id: string;
  projectId: string;
  structuralElement: string;
  pourDate: string;
  spanMetres: number;
  requiredStrengthPercent: number;
  measuredStrengthPercent: number;
  maturityStrengthPercent?: number;
  scaffoldingTag: ScaffoldingTagStatus;
  status: StrippingPermitStatus;
  safetyOfficerSigned: boolean;
  structuralConsultantSigned: boolean;
  inspectionNote?: string;
}

export interface BackchargeRecord {
  id: string;
  projectId: string;
  debitNumber: string;
  vendor: string;
  category: BackchargeCategory;
  description: string;
  amount: number;
  status: BackchargeStatus;
  rebuttal?: string;
  ipcReference?: string;
  issuedAt: string;
}

export interface ClashIssue {
  clashId: string;
  projectId: string;
  discipline: "Architectural" | "Structural" | "MEP";
  severity: ClashSeverity;
  description: string;
  status: ClashStatus;
  drawingId?: string;
  location?: string;
  resolvedAt?: string;
}

export interface PaymentApplication {
  paymentApplicationId: string;
  projectId: string;
  tradePackage: TradePackage;
  scheduledValue: number;
  previousWorkBilled: number;
  currentWorkCompleted: number;
  storedMaterials: number;
  actualCost: number;
  retainageRate: number;
  status: PaymentApplicationStatus;
  qualityGatePassed: boolean;
  concreteTestPassed: boolean;
  notes: string;
  certifiedAt?: string;
  approvedAt?: string;
  retainageWithheld?: number;
}

export interface AIMWorkOrder {
  workOrderId: string;
  projectId: string;
  assetId: string;
  assetName: string;
  assetLocation: string;
  eventType: AimEventType;
  status: AimWorkOrderStatus;
  summary: string;
  observedCondition?: string;
  technicianDowntimeMinutes: number;
  createdAt: string;
  completedAt?: string;
}

export interface TransmittalRecord {
  transmittalNumber: string;
  projectId: string;
  issuingEntity: string;
  recipientOrganization: string;
  distributionMethod: DistributionMethod;
  purpose: TransmittalPurpose;
  cdeItemId: string;
  revisionNumber: number;
  fileHash: string;
  uniclassCode: string;
  documentSet: string[];
  distributedAt: string;
  distributedBy: string;
  receiptConfirmed: boolean;
  notes?: string;
}

export interface AuditEvent {
  id: string;
  projectId: string;
  timestamp: string;
  role: RoleName;
  action: AuditAction | "CDE State Transition" | "RFI Response Submitted" | "Ball-in-Court Reassigned" | "Change Order Approval";
  documentReference: string;
  tradeDiscipline: TradePackage;
  actorName?: string;
  previousStatus?: string;
  nextStatus?: string;
  previousRevision?: string;
  nextRevision?: string;
}

export interface CustomMilestone {
  milestone_id: string;
  title: string;
  description: string;
  sequence_order: number;
  target_completion_date: string;
  allocated_budget_inr: number;
  status: MilestoneStatus;
}

export interface ContractorMilestoneAllocation {
  allocation_id: string;
  milestone_id: string;
  contractor_name: string;
  trade_specialization: string;
  assigned_contract_value_inr: number;
  performance_status: ContractorPerformanceStatus;
}

export interface MilestoneVerificationRule {
  rule_id: string;
  milestone_id: string;
  verification_type: VerificationType;
  description: string;
  is_mandatory: boolean;
  is_verified: boolean;
  verified_by_role: string;
  verified_at?: string | null;
}

export type BimClashSeverity = "Critical" | "Moderate" | "Low";

export interface BimClashRecord {
  id: string;
  projectId: string;
  title: string;
  description: string;
  discipline: "Architectural" | "Structural" | "MEP" | "Civil" | "Facade";
  severity: BimClashSeverity;
  status: "Open" | "Pending Review" | "Resolved";
  x: number;
  y: number;
  z: number;
  location?: string;
  sheet?: string;
  relatedRfiId?: string;
  createdAt: string;
}

export interface SiteSensorTelemetry {
  id: string;
  projectId: string;
  metric: "Wind Anemometer" | "Concrete Cure Temperature" | "Noise" | "Air Quality PM2.5" | "Air Quality PM10";
  location: string;
  value: number;
  unit: string;
  threshold: number;
  status: SensorStatus;
  timestamp: string;
  trend: number[];
}

export interface StakeholderMember {
  id: string;
  name: string;
  role: string;
  organization: string;
  packageName: string;
  permissionTier: PermissionTier;
  active: boolean;
  email: string;
}

export interface StatutoryApproval {
  id: string;
  projectId: string;
  approvalType: StatutoryApprovalType;
  authority: string;
  referenceNumber: string;
  issuedAt: string;
  validUntil: string;
  status: StatutoryApprovalStatus;
  daysRemaining?: number;
  progressPercent: number;
  requiredRenewal: boolean;
  notes?: string;
}

export interface ReraProgressBaseline {
  lineItem: string;
  sanctionedPercent: number;
  actualPercent: number;
  variancePercent: number;
}

export interface ReraQuarterlyProgressReport {
  projectName: string;
  projectCode: string;
  quarterLabel: string;
  approvedProgress: number;
  actualProgress: number;
  soldInventoryUnits: number;
  unsoldInventoryUnits: number;
  constructionCostIncurred: number;
  summary: string;
  formOneSummary: string;
  formTwoSummary: string;
  signedBy: string;
  signedAt: string;
}

export interface VirtualInspectionDefectPin {
  id: string;
  title: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  x: number;
  y: number;
  notes: string;
  createdAt: string;
}

export interface TelepresenceInspectionSession {
  id: string;
  projectId: string;
  title: string;
  hostEngineer: string;
  remoteInspector: string;
  location: string;
  scheduledAt: string;
  durationMinutes: number;
  status: TelepresenceSessionStatus;
  meetingSummary?: string;
  defectPins?: VirtualInspectionDefectPin[];
}

export interface DashboardSnapshot {
  cdeItems: CdeItem[];
  rfis: RfiRecord[];
  rfcs: RfcRecord[];
  changeOrders: ChangeOrderRecord[];
  submittals: ApprovedSubmittal[];
  punchListItems: PunchListItem[];
  clashIssues: ClashIssue[];
  paymentApplications?: PaymentApplication[];
  bimClashes?: BimClashRecord[];
  aimWorkOrders?: AIMWorkOrder[];
  transmittals?: TransmittalRecord[];
  auditEvents?: AuditEvent[];
  materialTests?: MaterialTestLog[];
  customMilestones?: CustomMilestone[];
  contractorMilestoneAllocations?: ContractorMilestoneAllocation[];
  milestoneVerificationRules?: MilestoneVerificationRule[];
  materialInwardRecords?: MaterialInwardRecord[];
  safetyIncidents?: SafetyIncidentRecord[];
  workInspectionRequests?: WorkInspectionRequest[];
  permitsToWork?: PermitToWork[];
  projectTasks?: ProjectScheduleTask[];
  equipmentTelemetry?: EquipmentTelemetryRecord[];
  meetingMinutes?: MeetingMinutesRecord[];
  realityCaptures?: RealityCaptureRecord[];
  facilityAssets?: FacilityAssetRecord[];
  statutoryApprovals?: StatutoryApproval[];
  telepresenceSessions?: TelepresenceInspectionSession[];
}
