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
export type VariationOrderStatus =
  | "Submitted"
  | "Under Rate Analysis"
  | "Client Approved"
  | "Rejected"
  | "DRAFT"
  | "PENDING_EIC_APPROVAL"
  | "APPROVED"
  | "PARTIALLY_EXECUTED"
  | "FULLY_EXECUTED"
  | "WITHDRAWN"
  | "DISPUTED"
  | "In Review"
  | "Sanctioned";
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
  vendorPerformanceScores?: VendorPerformanceScore[];
  vendorFinalAccounts?: VendorFinalAccount[];
  projectArchiveLogs?: ProjectArchiveLog[];
  clientFinalLedgers?: ClientFinalLedger[];
  clientRetentionReleases?: ClientRetentionRelease[];
  clientPhaseBillings?: ClientPhaseBillingRecord[];
}

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR PERFORMANCE, FINAL SETTLEMENT & PROJECT ARCHIVE (CPWD & FIDIC)
// ─────────────────────────────────────────────────────────────────────────────

export type VendorRatingGrade =
  | "CLASS_A_PLUS"
  | "CLASS_A"
  | "CLASS_B"
  | "CLASS_C"
  | "DEBARRED";

export type VendorListingStatus =
  | "WHITELISTED"
  | "MONITORED"
  | "SUSPENDED"
  | "BLACKLISTED";

export type FinalSettlementStatus =
  | "DRAFT"
  | "UNDER_AUDIT"
  | "DISPUTED"
  | "AGREED_FINAL"
  | "DISCHARGED_ARCHIVED";

export type ArchiveDossierType =
  | "CONTRACT_DOSSIER"
  | "AS_BUILT_BIM"
  | "STATUTORY_CLEARANCE"
  | "FINAL_ACCOUNT_CERTIFICATE"
  | "COBIE_ASSET_REGISTRY"
  | "DISCHARGE_UNDERTAKING";

export interface VendorPerformanceScore {
  id: string;
  projectId: string;
  vendorId: string;
  vendorName: string;
  tradeCategory: string;
  contractReference: string;
  workPackageTitle: string;
  // CPWD Evaluation Pillars (0-100)
  qualityRating: number;           // Weight 40%
  safetyComplianceScore: number;   // Weight 25%
  scheduleAdherence: number;       // Weight 20%
  disputeCommercialScore: number;  // Weight 15%
  // Detailed Metrics
  ncrCountTotal: number;
  ncrCountCleared: number;
  fatalAccidentsCount: number;
  bocwCessCompliant: boolean;
  ppeAuditScorePct: number;
  milestoneDeliveryPct: number;
  disputeHistoryCount: number;
  arbitrationClaimsInr: number;
  // Composite & Classification
  weightedCompositeScore: number;
  ratingGrade: VendorRatingGrade;
  listingStatus: VendorListingStatus;
  // Governance
  blacklistReason?: string | null;
  blacklistedBy?: string | null;
  blacklistedAt?: string | null;
  debarmentTenureMonths?: number;
  evaluatedBy: string;
  evaluatedAt: string;
  evaluationQuarter: string;
  evaluationNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorFinalAccount {
  id: string;
  projectId: string;
  vendorId: string;
  vendorName: string;
  contractRef: string;
  workOrderNumber: string;
  tradeCategory: string;
  // Financial Reconciliation (INR)
  totalAwardedValue: number;
  approvedVariations: number;
  priceEscalationInr: number;
  totalGrossBillableValue: number;
  retentionDeductedInr: number;
  retentionReleasedInr: number;
  liquidatedDamagesApplied: number;
  statutoryDeductionsInr: number;
  materialReconciliationDebit: number;
  cumulativePaidToDate: number;
  finalNetBillable: number;
  finalPaidAmount: number;
  balanceDueOrRefund: number;
  // Status & Discharge
  settlementStatus: FinalSettlementStatus;
  fidicClause1412Discharged: boolean;
  dischargeCertificateNumber?: string | null;
  dischargedAt?: string | null;
  dischargedBy?: string | null;
  contractorSignatoryName?: string | null;
  contractorSignatoryDesignation?: string | null;
  employerSignatoryName?: string | null;
  settlementNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectArchiveLog {
  id: string;
  projectId: string;
  vendorId?: string | null;
  archiveDossierType: ArchiveDossierType;
  archiveReference: string;
  title: string;
  fileUrl?: string | null;
  fileSizeBytes: number;
  fileHashSha256: string;
  cdeState: string;
  retentionPeriodYears: number;
  legalCustodyOfficer: string;
  archivedBy: string;
  archivedAt: string;
  metadataPayload?: Record<string, any>;
  isTamperVerified: boolean;
  archiveNotes?: string | null;
  createdAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT FINANCIAL CLOSEOUT & RETENTION RELEASE LEDGER (CPWD & FIDIC CL. 14)
// ─────────────────────────────────────────────────────────────────────────────

export type ClientSettlementStatus =
  | "DRAFT"
  | "PENDING_DIRECTOR_APPROVAL"
  | "PENDING_ACCOUNTS_APPROVAL"
  | "FINALLY_SETTLED"
  | "ARCHIVED";

export type RetentionTrancheStatus =
  | "HELD"
  | "RELEASE_REQUESTED"
  | "RELEASED"
  | "REVERTED";

export type PhaseFinancialStatus =
  | "ACTIVE"
  | "RECONCILED"
  | "SETTLED";

export interface ClientFinalLedger {
  id: string;
  projectId: string;
  clientName: string;
  clientOrgCode: string;
  contractCode: string;
  projectTitle: string;
  agreementDate?: string | null;
  // Financial Heads (INR)
  totalContractSum: number;
  authorizedVariations: number;
  priceAdjustmentInr: number;
  grossContractValue: number;
  liquidatedDamagesApplied: number;
  netAdjustedContractValue: number;
  // Realization
  totalCertifiedPayouts: number;
  totalFundsReceived: number;
  netBalanceReceivablePayable: number;
  // Status & Approvals
  finalSettlementStatus: ClientSettlementStatus;
  directorApproved: boolean;
  directorName?: string | null;
  directorApprovedAt?: string | null;
  directorRemarks?: string | null;
  accountsApproved: boolean;
  accountsLeadName?: string | null;
  accountsApprovedAt?: string | null;
  accountsRemarks?: string | null;
  // Legal Clearance
  noDuesCertificateNumber?: string | null;
  noDuesIssuedDate?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientRetentionRelease {
  id: string;
  projectId: string;
  clientLedgerId: string;
  retentionAccountNumber: string;
  escrowBankName: string;
  totalRetentionRetainedInr: number;
  // Tranche 1 (50% on Practical Completion / TOC)
  tranche1AmountInr: number;
  tranche1Status: RetentionTrancheStatus;
  tranche1ReleasedDate?: string | null;
  tranche1UtrRef?: string | null;
  // Tranche 2 (50% post-DLP Expiry)
  tranche2AmountInr: number;
  tranche2Status: RetentionTrancheStatus;
  tranche2ReleasedDate?: string | null;
  tranche2UtrRef?: string | null;
  // Accounting
  interestAccruedInr: number;
  taxDeductedInr: number;
  netRetentionReleasedInr: number;
  retentionBalanceRemainingInr: number;
  dlpExpiryDate?: string | null;
  finalPerformanceCertificateRef?: string | null;
  remarks?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientPhaseBillingRecord {
  id: string;
  projectId: string;
  clientLedgerId: string;
  phaseCode: string;
  phaseName: string;
  sanctionedAmountInr: number;
  billedAmountInr: number;
  receivedAmountInr: number;
  varianceInr: number;
  phaseStatus: PhaseFinancialStatus;
  completionDate?: string | null;
  notes?: string | null;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Subcontractor Final Settlement & Labour Clearance Portal Types
// ---------------------------------------------------------------------------

export type SubcontractorSettlementStatus =
  | 'DRAFT_AUDIT'
  | 'LABOUR_CLEARANCE_PENDING'
  | 'COMMERCIAL_REVIEW'
  | 'APPROVED_FOR_PAYMENT'
  | 'SETTLED_DISCHARGED';

export type WageClearanceStatus =
  | 'PENDING'
  | 'PARTIAL_DISPUTE'
  | 'VERIFIED_CLEARED';

export type UndertakingStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'LEGAL_VERIFIED';

export interface SubcontractorSettlement {
  id: string;
  projectId: string;
  workOrderRef: string;
  tradePackage: string;
  subcontractorName: string;
  subcontractorPan?: string | null;
  subcontractorGstin?: string | null;

  // Commercial Claims (INR)
  contractWoValueInr: number;
  measuredFinalQtyValueInr: number;
  approvedVariationsInr: number;
  grossFinalClaimInr: number;

  // Deductions & Recoveries (INR)
  previousRaDisbursedInr: number;
  materialAdvancesRecoveredInr: number;
  toolPlantRentalsInr: number;
  contraBackchargesInr: number;
  siteUtilityAccommodationInr: number;
  retentionHeldInr: number;
  statutoryTaxWithheldInr: number;
  totalDeductionsInr: number;

  // Net Settlement Balance (INR)
  netPayableBalanceInr: number;

  // Workflow & Sign-Off
  settlementStatus: SubcontractorSettlementStatus;

  siteSupervisorSigned: boolean;
  siteSupervisorName?: string | null;
  siteSupervisorSignedAt?: string | null;
  siteSupervisorRemarks?: string | null;

  commercialHeadSigned: boolean;
  commercialHeadName?: string | null;
  commercialHeadSignedAt?: string | null;
  commercialHeadRemarks?: string | null;

  clearanceVoucherNumber?: string | null;
  settlementDate?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubcontractorWageClearance {
  id: string;
  settlementId: string;
  projectId: string;
  workOrderRef: string;
  subcontractorName: string;

  // Labour Deployment & Migrant Provisions (ISMW Act 1979)
  totalWorkersDeployed: number;
  migrantWorkersCount: number;
  migrantWorkerPassbookIssued: boolean;
  displacementAllowanceCleared: boolean;
  journeyAllowanceDisbursed: boolean;

  // Wage & Statutory Disbursal
  finalWagesPaidFull: boolean;
  epfEcrCleared: boolean;
  epfChallanRef?: string | null;
  esicContributionCleared: boolean;
  esicChallanRef?: string | null;
  bocwCessCompliant: boolean;

  // Labour Welfare Officer Verification
  labourOfficerVerified: boolean;
  labourOfficerName?: string | null;
  labourOfficerVerifiedAt?: string | null;
  clearanceStatus: WageClearanceStatus;

  wageSheetDocUrl?: string | null;
  remarks?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubcontractorNoClaimsUndertaking {
  id: string;
  settlementId: string;
  projectId: string;
  undertakingRef: string;
  authorizedSignatoryName: string;
  authorizedSignatoryDesignation: string;

  // Indemnity & Waiver Clauses
  indemnityBondExecuted: boolean;
  allDuesAccepted: boolean;
  arbitrationWaiverSigned: boolean;
  executedDate?: string | null;
  witness1Name?: string | null;
  witness2Name?: string | null;
  stampPaperValueInr: number;

  undertakingStatus: UndertakingStatus;
  docHash?: string | null;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// As-Built Drawing Repository & Digital O&M Manual Vault Types
// ---------------------------------------------------------------------------

export type AsBuiltDiscipline =
  | 'STRUCTURAL'
  | 'ARCHITECTURAL'
  | 'MEP'
  | 'HVAC'
  | 'FIRE_SAFETY'
  | 'INFRASTRUCTURE';

export type DrawingApprovalStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVISED';

export type EquipmentWarrantyStatus =
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'CLAIM_IN_PROGRESS';

export type HandoverComplianceStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'HANDED_OVER';

export interface AsBuiltDrawing {
  id: string;
  projectId: string;
  drawingNumber: string;
  sheetTitle: string;
  discipline: AsBuiltDiscipline;
  revisionNumber: string;
  cdeContainer: string;
  iso19650State: string;

  cadDwgUrl?: string | null;
  bimModelUrl?: string | null;
  pdfDrawingUrl?: string | null;
  fileSizeBytes: number;
  sha256Hash?: string | null;

  consultantApprovalStatus: DrawingApprovalStatus;
  consultantName?: string | null;
  consultantApprovedAt?: string | null;
  consultantRemarks?: string | null;

  clientFmAccepted: boolean;
  clientFmAcceptedAt?: string | null;
  clientFmName?: string | null;

  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface OmManualRegistry {
  id: string;
  projectId: string;
  equipmentTag: string;
  equipmentName: string;
  discipline: AsBuiltDiscipline;
  assetCategory: string;
  manufacturer: string;
  makeModel: string;
  serialNumber?: string | null;
  installationLocation: string;

  commissioningDate?: string | null;
  warrantyStartDate: string;
  warrantyExpirationDate: string;
  warrantyPeriodMonths: number;
  warrantyStatus: EquipmentWarrantyStatus;
  warrantyProviderContact?: string | null;
  slaResponseTimeHours: number;

  operationGuideUrl?: string | null;
  maintenanceManualUrl?: string | null;
  partsCatalogUrl?: string | null;
  warrantyCertificateUrl?: string | null;

  maintenanceIntervalMonths: number;
  nextScheduledServiceDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DigitalHandoverChecklistItem {
  id: string;
  projectId: string;
  itemCode: string;
  discipline: AsBuiltDiscipline;
  deliverableCategory: string;
  deliverableTitle: string;
  cpwdClauseRef?: string | null;
  status: HandoverComplianceStatus;
  attachedDocUrl?: string | null;

  verifiedByPmc: boolean;
  pmcEngineerName?: string | null;
  clientFmSigned: boolean;
  clientFmName?: string | null;
  signOffDate?: string | null;
  remarks?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// DEFECT LIABILITY ESCROW & WARRANTY RESERVE ACCOUNT MODULE (CPWD CL. 17 & FIDIC CL. 11/14.9)
// ---------------------------------------------------------------------------

export type EscrowAccountStatus = "ACTIVE" | "FROZEN" | "CLOSED" | "RECONCILED";

export type WarrantyTradePackage =
  | "CIVIL_STRUCTURAL"
  | "MEP_HVAC"
  | "WATERPROOFING_INSULATION"
  | "ELEVATORS_ESCALATORS"
  | "FIRE_PROTECTION_SAFETY"
  | "FACADE_FENESTRATION"
  | "ELECTRICAL_SUBSTATION";

export type WarrantyReserveStatus =
  | "RESERVED"
  | "PARTIALLY_RELEASED"
  | "FULLY_RELEASED"
  | "ARBITRATION_HOLD"
  | "FORFEITED";

export type EscrowClaimStatus =
  | "LOGGED"
  | "PM_VERIFIED"
  | "NOTICE_EXPIRED"
  | "EXECUTED_DEBITED"
  | "REJECTED"
  | "DISPUTED";

export type EscrowTransactionType =
  | "DEPOSIT_RETENTION"
  | "TRANCHE_1_RELEASE"
  | "TRANCHE_2_RELEASE"
  | "THIRD_PARTY_DEBIT"
  | "INTEREST_CREDIT"
  | "BANK_CHARGES";

export interface DefectEscrowAccount {
  id: string;
  projectId: string;
  escrowAccountNumber: string;
  escrowBankName: string;
  escrowBranch: string;
  ifscCode: string;
  accountHolderName: string;
  trusteeAgentName: string;
  trusteeContactEmail?: string | null;

  totalRetainedValueInr: number;
  releasedAmountInr: number;
  pendingClaimsInr: number;
  currentBalanceInr: number;
  accruedInterestInr: number;
  interestRatePct: number;
  accountStatus: EscrowAccountStatus;

  dlpStartDate: string;
  dlpEndDate: string;
  dlpDurationMonths: number;
  tranche1Pct: number;
  tranche1Released: boolean;
  tranche1ReleaseDate?: string | null;
  tranche2Pct: number;
  tranche2Released: boolean;
  tranche2ReleaseDate?: string | null;
  snagClearancePct: number;

  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WarrantyReserveAllocation {
  id: string;
  escrowAccountId: string;
  projectId: string;
  tradePackage: WarrantyTradePackage;
  contractorName: string;
  workOrderRef: string;
  allocatedReserveInr: number;
  claimedAmountInr: number;
  releasedAmountInr: number;
  remainingBalanceInr: number;
  warrantyPeriodMonths: number;
  warrantyEndDate: string;
  punchlistCleared: boolean;
  clearancePercentage: number;
  status: WarrantyReserveStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface EscrowDefectClaim {
  id: string;
  escrowAccountId: string;
  projectId: string;
  claimNumber: string;
  originalContractor: string;
  tradePackage: WarrantyTradePackage;
  defectDescription: string;
  locationTag: string;
  incidentDate: string;
  rectificationNoticeRef: string;
  noticeServedDate: string;
  noticePeriodDays: number;
  contractorResponse?: string | null;
  rectificationCostInr: number;
  thirdPartyContractor: string;
  thirdPartyWorkOrderRef: string;
  thirdPartyInvoiceRef: string;
  claimStatus: EscrowClaimStatus;
  authorizedBy: string;
  debitDate?: string | null;
  evidencePhotosCount: number;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EscrowTransactionLedgerItem {
  id: string;
  escrowAccountId: string;
  projectId: string;
  transactionRef: string;
  transactionDate: string;
  transactionType: EscrowTransactionType;
  amountInr: number;
  balanceAfterInr: number;
  beneficiaryOrRemitter: string;
  referenceVoucher: string;
  narration: string;
  approvedBy: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// PROJECT CLOSEOUT AUDIT TRAIL & STATUTORY COMPLIANCE VAULT (CPWD CL. 32/45 & BOCW)
// ---------------------------------------------------------------------------

export type AuditActionCategory =
  | "FINANCIAL_SIGNOFF"
  | "CONTRACT_VARIATION"
  | "STATUTORY_CLEARANCE"
  | "ASSET_HANDOVER"
  | "ESCROW_TRANCHE"
  | "SECURITY_ACCESS"
  | "DEFECT_DEBIT"
  | "SYSTEM_CONFIG";

export type AuditSeverityLevel = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ComplianceCertificateType =
  | "LABOUR_LICENSE_BOCW"
  | "EPF_ESI_CLEARANCE"
  | "GST_TAX_CLEARANCE"
  | "FIRE_SAFETY_NOC"
  | "STRUCTURAL_STABILITY_CERT"
  | "POLLUTION_CONSENT_CTO"
  | "LIFT_INSPECTION_LICENSE"
  | "ELECTRICAL_INSPECTORATE_NOC";

export type ComplianceValidityStatus =
  | "VALID_CURRENT"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "PERMANENT_CLEARANCE"
  | "REVOKED";

export interface ProjectAuditLog {
  id: string;
  projectId: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  actionCategory: AuditActionCategory;
  affectedModule: string;
  recordReference: string;
  actionDescription: string;
  ipAddress: string;
  deviceSignature: string;
  hashSha256: string;
  previousStateHash?: string | null;
  severityLevel: AuditSeverityLevel;
  createdAt?: string;
}

export interface StatutoryVaultFile {
  id: string;
  projectId: string;
  complianceCategory: ComplianceCertificateType;
  documentTitle: string;
  issuingAuthority: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate?: string | null;
  storageBucketPath: string;
  fileSizeBytes: number;
  fileHashSha256: string;
  validityStatus: ComplianceValidityStatus;
  verifiedBy: string;
  verificationDate: string;
  tags: string[];
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ComplianceDossierPackage {
  id: string;
  projectId: string;
  packageRef: string;
  packageName: string;
  packageType: string;
  totalDocumentsCount: number;
  packageSizeBytes: number;
  sha256BundleHash: string;
  compiledBy: string;
  compilationTimestamp: string;
  downloadArchiveUrl: string;
  status: string;
  notes?: string | null;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// PROJECT CLOSEOUT EXECUTIVE DASHBOARD & MASTER KPI COMMAND HUB TYPES
// ---------------------------------------------------------------------------

export type CloseoutStageStatus = "PENDING" | "IN_REVIEW" | "COMPLETE";

export interface ProjectCloseoutSummary {
  id: string;
  projectId: string;
  projectName: string;
  projectLocation?: string | null;
  contractorName?: string | null;
  clientName?: string | null;
  pcrNumber?: string | null;
  pcrStatus?: string | null;

  // Commercial & Financial Heads (INR)
  sanctionedBudgetInr: number;
  finalContractValueInr: number;
  actualExpenditureInr: number;
  costVarianceInr: number;
  costVariancePct: number;
  spiValue: number;

  // Retention & Escrow (INR)
  totalRetentionInr: number;
  releasedRetentionInr: number;
  netRetentionBalanceInr: number;
  escrowBalanceInr: number;
  pendingClaimsInr: number;

  // Quality & Punch List Rectification
  activeDefectsCount: number;
  clearedDefectsCount: number;
  totalDefectsCount: number;
  defectClearancePct: number;

  // Statutory Approvals & Clearances
  totalStatutoryCertsCount: number;
  validStatutoryCertsCount: number;
  pendingStatutoryClearancesCount: number;
  statutoryCompliancePct: number;

  // Asset Handover & Digital Engineering Inventory
  totalFacilityAssetsCount: number;
  handedOverAssetsCount: number;
  asBuiltDrawingsCount: number;
  omManualsCount: number;

  // Composite Metrics
  closeoutOverallProgressPct: number;
  overallCloseoutStatus: CloseoutStageStatus;
  lastAuditedAt?: string | null;
  updatedAt?: string | null;
}

export interface CloseoutModuleProgress {
  stepNumber: number;
  moduleId: string;
  title: string;
  standardRef: string;
  routePath: string;
  status: CloseoutStageStatus;
  progressPct: number;
  keyMetricLabel: string;
  keyMetricValue: string;
  description: string;
  lastActionDate?: string;
  actionOwner?: string;
}

export interface MasterClosureDossierConfig {
  includePcrSummary: boolean;
  includeCostVariance: boolean;
  includeContractorDischarges: boolean;
  includeClientEscrowLedger: boolean;
  includeSubcontractorWages: boolean;
  includeAssetRegisterCobie: boolean;
  includeAsBuiltDrawings: boolean;
  includeStatutoryNocs: boolean;
  includeSha256AuditTrail: boolean;
  compilerDesignation: string;
  boardSubmissionDate: string;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRE-CONSTRUCTION ESTIMATION & CPWD DSR BIM-TO-BOQ TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type BoqSubheadCategory =
  | "SUB_01_EARTHWORK"
  | "SUB_02_CONCRETE_WORK"
  | "SUB_03_RCC_STRUCTURE"
  | "SUB_04_BRICK_MASONRY"
  | "SUB_05_STEEL_WORK"
  | "SUB_06_FLOORING"
  | "SUB_07_ROOFING"
  | "SUB_08_FINISHING_PLASTER"
  | "SUB_09_ROAD_INFRA"
  | "SUB_10_MEP_SERVICES";

export type RateSourceType =
  | "CPWD_DSR_2023"
  | "STATE_PWD_SOR"
  | "NON_DSR_MARKET_ANALYZED"
  | "CUSTOM_ITEM";

export type BimElementType =
  | "IFC_FOOTING"
  | "IFC_COLUMN"
  | "IFC_BEAM"
  | "IFC_SLAB"
  | "IFC_SHEAR_WALL"
  | "IFC_BRICK_WALL"
  | "IFC_REBAR"
  | "IFC_PLASTER_FINISH"
  | "IFC_FLOOR_TILES"
  | "IFC_STRUCTURAL_STEEL"
  | "IFC_MEP_PIPE"
  | "IFC_MEP_DUCT";

export type BoqItemStatus =
  | "AUTO_EXTRACTED"
  | "RATE_MATCHED"
  | "ESTIMATOR_VERIFIED"
  | "SANCTIONED";

export interface MaterialBreakdownComponent {
  material: string;
  coefficient: number;
  unit: string;
  unitRateInr: number;
  amountInr: number;
}

export interface LabourBreakdownComponent {
  trade: string;
  coefficient: number;
  unitRateInr: number;
  amountInr: number;
}

export interface MachineryBreakdownComponent {
  equipment: string;
  coefficient: number;
  unitRateInr: number;
  amountInr: number;
}

export interface DsrRateAnalysis {
  id: string;
  dsrItemCode: string;
  subHead: string;
  description: string;
  unit: string;
  baseRateDelhiInr: number;
  materialCostPct: number;
  labourCostPct: number;
  machineryCostPct: number;
  waterChargesPct: number;
  contractorProfitPct: number;
  gstPct: number;
  materialBreakdown: MaterialBreakdownComponent[];
  labourBreakdown: LabourBreakdownComponent[];
  machineryBreakdown: MachineryBreakdownComponent[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EstimationCostIndex {
  id: string;
  locationName: string;
  stateCode: string;
  baseYear: number;
  costIndexPct: number;
  cementSubIndex: number;
  steelSubIndex: number;
  labourSubIndex: number;
  effectiveDate: string;
  gazetteNotificationRef?: string;
  isActive: boolean;
}

export interface ProjectBoqItem {
  id: string;
  projectId: string;
  itemCode: string;
  wbsCode: string;
  subHeadCode: BoqSubheadCategory;
  subHeadTitle: string;
  itemDescription: string;
  bimElementType: BimElementType;
  ifcGuid?: string;
  drawingSheetRef?: string;
  unit: string;
  bimMeasuredQuantity: number;
  manualOverrideQuantity?: number | null;
  finalQuantity: number;
  rateSource: RateSourceType;
  dsrBaseRateInr: number;
  costIndexFactor: number;
  adjustedUnitRateInr: number;
  totalEstimatedCostInr: number;
  confidenceScore: number;
  matchingAlgorithm?: string;
  status: BoqItemStatus;
  estimatorNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BoqSimulationParams {
  cementChangePct: number; // e.g. -10 to +30
  steelChangePct: number;  // e.g. -10 to +30
  labourChangePct: number; // e.g. -5 to +20
  locationCostIndexPct: number; // e.g. 100 to 130
}

export interface SubheadAbstractItem {
  subHeadCode: BoqSubheadCategory;
  subHeadTitle: string;
  itemCount: number;
  subtotalInr: number;
  percentageOfTotal: number;
}

export interface BoqAbstractSummary {
  projectId: string;
  projectName: string;
  locationCostIndex: string;
  costIndexPct: number;
  subheads: SubheadAbstractItem[];
  subtotalInr: number;
  contingenciesInr: number; // typically 3%
  contractorProfitInr: number; // embedded or distinct
  gstInr: number; // 18%
  grandTotalEstimatedInr: number;
}

// ============================================================================
// SUBCONTRACTOR E-TENDERING & COMPARATIVE STATEMENT (CS) EVALUATION TYPES
// Standards: CPWD Works Manual Chapters V & VI / FIDIC Red Book Clause 14
// ============================================================================

export type TenderPackageStatus = 
  | 'DRAFT' 
  | 'PUBLISHED' 
  | 'UNDER_EVALUATION' 
  | 'LOI_ISSUED' 
  | 'AWARDED' 
  | 'SCRAPPED';

export type VendorTechnicalStatus = 
  | 'SUBMITTED' 
  | 'TECHNICAL_QUALIFIED' 
  | 'TECHNICAL_DISQUALIFIED' 
  | 'WITHDRAWN';

export type VendorFinancialRank = 
  | 'L1' 
  | 'L2' 
  | 'L3' 
  | 'L4' 
  | 'L5' 
  | 'NON_RESPONSIVE' 
  | 'PENDING';

export type RateVarianceCategory = 
  | 'COMPETITIVE' 
  | 'BALANCED' 
  | 'FRONT_LOADED' 
  | 'ABNORMALLY_HIGH' 
  | 'ABNORMALLY_LOW';

export interface TenderPackage {
  id: string;
  projectId: string;
  packageCode: string;
  packageTitle: string;
  scopeOfWork: string;
  tradeDiscipline: string;
  estimatedBudgetInr: number;
  emdAmountInr: number;
  tenderDocumentFeeInr: number;
  tenderValidityDays: number;
  publishedDate: string;
  submissionDeadline: string;
  technicalBidOpeningDate: string;
  financialBidOpeningDate?: string | null;
  procurementMode: string;
  status: TenderPackageStatus;
  minimumTechnicalScore: number;
  evaluationCriteria: string;
  awardedVendorId?: string | null;
  awardedContractValueInr?: number | null;
  loiIssuedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorBid {
  id: string;
  tenderPackageId: string;
  vendorId: string;
  vendorName: string;
  vendorRegNumber: string;
  gstin: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  bidSubmissionTime: string;
  emdPaid: boolean;
  emdBankRef?: string | null;
  technicalScore: number;
  technicalStatus: VendorTechnicalStatus;
  disqualificationReason?: string | null;
  totalQuotedAmount: number;
  varianceFromEstimatePct: number;
  financialRank: VendorFinancialRank;
  financialStatus: string;
  proposedDurationMonths: number;
  isRecommended: boolean;
  scorecardTechnicalCompliance: number;
  scorecardSafetyRecord: number;
  scorecardFinancialStanding: number;
  scorecardPlantMachinery: number;
  compositeScore: number;
  committeeRemarks?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BidItemRate {
  id: string;
  vendorBidId: string;
  tenderPackageId: string;
  itemCode: string;
  itemDescription: string;
  subhead: string;
  unit: string;
  quantity: number;
  baselineDsrRateInr: number;
  baselineTotalAmountInr: number;
  vendorQuotedRateInr: number;
  vendorTotalAmountInr: number;
  rateVariancePct: number;
  isLowestItemRate: boolean;
  riskFlag: RateVarianceCategory;
  createdAt?: string;
}

export interface ComparativeStatementItemColumn {
  vendorId: string;
  vendorName: string;
  quotedRateInr: number;
  totalAmountInr: number;
  variancePct: number;
  isLowest: boolean;
  riskFlag: RateVarianceCategory;
}

export interface ComparativeStatementRow {
  itemCode: string;
  itemDescription: string;
  subhead: string;
  unit: string;
  quantity: number;
  baselineRateInr: number;
  baselineAmountInr: number;
  vendorQuotes: Record<string, ComparativeStatementItemColumn>;
  lowestRateInr: number;
  lowestVendorId: string;
}

export interface ComparativeStatementSummary {
  package: TenderPackage;
  bidders: VendorBid[];
  items: ComparativeStatementRow[];
  l1Bidder: VendorBid | null;
  l2Bidder: VendorBid | null;
  bidSpreadInr: number;
  savingsVsEstimateInr: number;
  savingsVsEstimatePct: number;
}

// ============================================================================
// MATERIAL INVENTORY, STORE ACCOUNTING & GRS LEDGER TYPES
// Standards: CPWD Works Accounts Code Chapter 7 / CPWD Forms 8 & 8-A / FIDIC Cl. 14.5
// ============================================================================

export type StoreMaterialCategory = 
  | 'CEMENT' 
  | 'STEEL_REBAR' 
  | 'AGGREGATES' 
  | 'MASONRY' 
  | 'CHEMICALS' 
  | 'FINISHING' 
  | 'SHUTTERING' 
  | 'CONSUMABLES';

export type InventoryStockStatus = 
  | 'OPTIMAL' 
  | 'LOW_STOCK' 
  | 'CRITICAL_REORDER' 
  | 'OVERSTOCKED';

export type GrsVerificationStatus = 
  | 'VERIFIED_ACCEPTED' 
  | 'CONDITIONALLY_ACCEPTED' 
  | 'REJECTED_RETURNED' 
  | 'UNDER_TESTING';

export type BinCardTransactionType = 
  | 'RECEIPT' 
  | 'ISSUE_TO_SITE' 
  | 'RETURN_FROM_SITE' 
  | 'AUDIT_ADJUSTMENT' 
  | 'SCRAP_WRITEOFF';

export interface StoreInventoryItem {
  id: string;
  projectId: string;
  itemCode: string;
  itemName: string;
  category: StoreMaterialCategory;
  subheadCode?: string | null;
  unit: string;
  binLocation: string;
  currentStockBalance: number;
  minimumStockThreshold: number;
  reorderQuantity: number;
  standardIssueRateInr: number;
  lastReceivedDate?: string | null;
  lastIssuedDate?: string | null;
  valuationTotalInr: number;
  inventoryStatus: InventoryStockStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface GoodsReceivedSheet {
  id: string;
  projectId: string;
  grsNumber: string;
  poReference: string;
  challanNumber: string;
  challanDate: string;
  receivedDate: string;
  supplierId: string;
  supplierName: string;
  vehicleNumber: string;
  carrierName: string;
  itemCode: string;
  itemDescription: string;
  unit: string;
  challanQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  purchaseRateInr: number;
  carriageFreightInr: number;
  incidentalStoragePct: number;
  calculatedIssueRateInr: number;
  totalGrsValueInr: number;
  physicalVerificationStatus: GrsVerificationStatus;
  qualityInspectionRef?: string | null;
  qualityConformity: boolean;
  storekeeperSign: string;
  sectionalOfficerSign: string;
  remarks?: string | null;
  createdAt?: string;
}

export interface BinCardEntry {
  id: string;
  projectId: string;
  itemCode: string;
  entryDate: string;
  transactionType: BinCardTransactionType;
  referenceVoucherNo: string;
  issueToLocationOrTrade?: string | null;
  contractorOrIndentor?: string | null;
  quantityIn: number;
  quantityOut: number;
  balanceQuantity: number;
  unitRateInr: number;
  storekeeperInitials: string;
  auditCheckInitials?: string | null;
  remarks?: string | null;
  createdAt?: string;
}

export interface IssueRateBreakdown {
  purchaseRateInr: number;
  carriagePerUnitInr: number;
  storageChargeInr: number;
  finalIssueRateInr: number;
  totalQuantity: number;
  totalValuationInr: number;
}

export interface StoreStockSummary {
  totalInventoryValuationInr: number;
  totalSkuCount: number;
  lowStockCount: number;
  monthlyReceivedValueInr: number;
  monthlyIssuedValueInr: number;
  items: StoreInventoryItem[];
}

// ── Site Safety, HSE & BOCW Compliance Interfaces ─────────────────────────────
export type SafetyIncidentSeverity = "NEAR_MISS" | "MINOR_FIRST_AID" | "MAJOR_MEDICAL" | "FATALITY";
export type HseIncidentStatus = "REPORTED" | "UNDER_INVESTIGATION" | "CAPA_ASSIGNED" | "CLOSED_RESOLVED";
export type BocwComplianceStatus = "FULL_COMPLIANCE" | "PARTIAL_DEFICIENCY" | "NON_COMPLIANT" | "NOT_APPLICABLE";
export type PpeAuditRating = "COMPLIANT" | "CONDITIONAL_WARNING" | "STOP_WORK_NOTICE";

export interface SiteSafetyIncident {
  id: string;
  incidentRef: string;
  projectId: string;
  incidentDate: string;
  location: string;
  incidentTitle: string;
  incidentType: string;
  severityLevel: SafetyIncidentSeverity;
  affectedPersonnel?: string | null;
  contractorName: string;
  incidentDescription: string;
  rootCauseAnalysis?: string | null;
  immediateActionsTaken: string;
  preventiveMeasuresCapa?: string | null;
  photoEvidenceUrls: string[];
  statutoryReportingRequired: boolean;
  statutoryNotifiedDate?: string | null;
  status: HseIncidentStatus;
  safetyOfficerName: string;
  residentEngineerName: string;
  daysLost: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PpeComplianceLog {
  id: string;
  auditRef: string;
  projectId: string;
  auditDate: string;
  zoneLocation: string;
  auditorName: string;
  totalWorkersInspected: number;
  helmetComplianceCount: number;
  safetyShoesComplianceCount: number;
  highVisVestComplianceCount: number;
  harnessAtHeightCount: number;
  eyeFaceProtectionCount: number;
  earProtectionCount: number;
  overallCompliancePct: number;
  violationsDetected: string[];
  stopWorkNoticesIssued: number;
  contractorPenaltiesIncurred: number;
  auditRating: PpeAuditRating;
  correctiveActionsDemanded?: string | null;
  createdAt?: string;
}

export interface SafetyToolboxTalk {
  id: string;
  talkRef: string;
  projectId: string;
  talkDate: string;
  hazardTopic: string;
  isCodeRef?: string | null;
  trainerName: string;
  trainerDesignation: string;
  totalAttendees: number;
  tradeCategory: string;
  languageDelivered: string;
  keySafetyPoints: string[];
  attendeeSignaturesLogged: number;
  status: "COMPLETED" | "SCHEDULED";
  createdAt?: string;
}

export interface BocwStatutoryChecklistItem {
  id: string;
  checklistId: string;
  projectId: string;
  statutoryRuleRef: string;
  category: "FIRST_AID" | "FIRE_SAFETY" | "FALL_PROTECTION" | "SANITATION_WELFARE" | "ELECTRICAL" | "HEAVY_MACHINERY" | "SAFETY_GOVERNANCE" | "OCCUPATIONAL_HEALTH";
  itemDescription: string;
  complianceStatus: BocwComplianceStatus;
  evidenceDetails: string;
  lastVerifiedAt: string;
  rectificationTargetDate?: string | null;
  verifyingOfficer: string;
  createdAt?: string;
}

export interface SafetyHseKpis {
  safeManHoursWorked: number;
  ltifrRate: number; // Lost Time Injury Frequency Rate
  activeIncidentsCount: number;
  dailyTbtAttendancePct: number;
  ppeComplianceScorePct: number;
  zeroFatalityStatus: boolean;
  totalIncidentsReported: number;
  nearMissesResolved: number;
}

export interface NewIncidentPayload {
  projectId: string;
  incidentTitle: string;
  incidentType: string;
  severityLevel: SafetyIncidentSeverity;
  location: string;
  contractorName: string;
  affectedPersonnel?: string;
  incidentDescription: string;
  rootCauseAnalysis?: string;
  immediateActionsTaken: string;
  preventiveMeasuresCapa?: string;
  statutoryReportingRequired?: boolean;
}

// =============================================================================
// CONTRACT VARIATIONS, DEVIATION STATEMENT & EXTRA ITEM RATE ANALYSIS ENGINE
// Ref: CPWD GCC Clause 12 / FIDIC Red Book Clause 13
// =============================================================================


export type VoInitiatingAuthority =
  | "ENGINEER_IN_CHARGE"
  | "EXECUTIVE_ENGINEER"
  | "SUPERINTENDING_ENGINEER"
  | "CHIEF_ENGINEER"
  | "MANAGING_DIRECTOR"
  | "CLIENT_NOMINATED";

export type DeviationCategory =
  | "SUBSTRUCTURE"
  | "SUPERSTRUCTURE"
  | "FINISHING"
  | "EXTERNAL_SERVICES"
  | "PROVISIONAL_ITEM";

export type EiSanctionStatus =
  | "UNDER_ANALYSIS"
  | "SUBMITTED_FOR_SANCTION"
  | "EIC_SANCTIONED"
  | "EE_SANCTIONED"
  | "MD_SANCTIONED"
  | "CLIENT_APPROVED"
  | "REJECTED"
  | "INCORPORATED_IN_VO";

export type RateDeterminationMethod =
  | "BOQ_RATE"
  | "MARKET_RATE"
  | "DSR_RATE"
  | "NEGOTIATED";

export interface ContractVariationOrder {
  id: string;
  projectId: string;
  voNumber: string;
  title: string;
  description?: string | null;
  initiatingAuthority: VoInitiatingAuthority;
  initiatedByName: string;
  contractValueAtAward: number;
  costDeltaAmount: number;
  cumulativeVoPercent: number;
  eotRequestedDays: number;
  eotGrantedDays: number;
  cl12NoticeDate?: string | null;
  cl12NoticeServed: boolean;
  rateDeterminationMethod: RateDeterminationMethod;
  fidicCl13EngineerInstruction?: string | null;
  justificationNotes?: string | null;
  status: VariationOrderStatus;
  approvedBy?: string | null;
  approvalDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContractDeviationItem {
  id: string;
  projectId: string;
  voId?: string | null;
  itemCode: string;
  itemDescription: string;
  unit: string;
  deviationCategory: DeviationCategory;
  scheduleFLimitPct: number;
  agreementQuantity: number;
  executedQuantity: number;
  deviationQuantity?: number;
  deviationPct?: number;
  withinLimitQuantity?: number;
  excessBeyondLimitQuantity?: number;
  billingAtAgreementAmount?: number;
  billingAtMarketAmount?: number;
  isBreachingLimit?: boolean;
  isApproachingLimit?: boolean;
  agreementRate: number;
  marketDerivedRate?: number | null;
  rateDisputeNoticeDate?: string | null;
  rateDisputeNoticeServed: boolean;
  extraItemRef?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EiMaterialLine {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface EiLabourLine {
  category: string;
  coefficient_per_unit: number;
  daily_rate: number;
  amount: number;
}

export interface ExtraItemRateAnalysis {
  id: string;
  projectId: string;
  eiCode: string;
  itemDescription: string;
  unit: string;
  materialLines: EiMaterialLine[];
  materialSubtotal: number;
  carriageAmount: number;
  labourLines: EiLabourLine[];
  labourSubtotal: number;
  machineryAmount: number;
  waterElectricityAmount: number;
  cpOhPercent: number;
  baseCostSubtotal?: number;
  cpOhAmount?: number;
  analyzedRatePerUnit?: number;
  sanctionStatus: EiSanctionStatus;
  preparedBy: string;
  checkedBy?: string | null;
  eicSanctionedBy?: string | null;
  eicSanctionDate?: string | null;
  eeSanctionedBy?: string | null;
  eeSanctionDate?: string | null;
  mdSanctionedBy?: string | null;
  mdSanctionDate?: string | null;
  sanctionedRate?: number | null;
  dsrYear?: string | null;
  dsrChapter?: string | null;
  dsrItemNumber?: string | null;
  marketRateBasis?: string | null;
  notes?: string | null;
  voIncorporatedId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VariationsDeviationsSummary {
  totalVOs: number;
  totalCostDelta: number;
  netVoPercent: number;
  totalEotGranted: number;
  itemsBreaching: number;
  itemsApproaching: number;
  eiUnderAnalysis: number;
  eiPendingSanction: number;
  eiFullySanctioned: number;
}

// ---------------------------------------------------------------------------
// CPWD GCC CLAUSE 10B & FIDIC CLAUSE 14.2 ADVANCES & RECOVERIES
// ---------------------------------------------------------------------------
export type AdvanceType =
  | "Mobilization Advance [10B-i]"
  | "Plant & Machinery Advance [10B-ii]"
  | "Secured Material Advance [10B-iii]";

export type AdvanceStatus = "Active" | "Amortizing" | "Fully Recovered";

export type Form31IndentureStatus = "Hypothecated" | "Recovered" | "Released";

export interface ContractAdvanceMaster {
  id: string;
  project_id: string;
  advance_type: AdvanceType;
  sanctioned_amount: number;
  interest_rate_pct: number;
  disbursal_date: string;
  total_recovered: number;
  outstanding_balance: number;
  bank_guarantee_ref: string;
  bg_validity_date: string;
  status: AdvanceStatus;
  created_at?: string;
}

export interface SecuredAdvanceMaterial {
  id: string;
  advance_id: string;
  material_name: string;
  site_delivery_date: string;
  verified_quantity: number;
  unit: string;
  market_rate: number;
  agreement_rate: number;
  admissible_percentage: number;
  assessed_advance_amount: number;
  indenture_status: Form31IndentureStatus;
  created_at?: string;
}

export interface AdvanceRecoverySchedule {
  id: string;
  advance_id: string;
  ra_bill_id?: string | null;
  billing_cycle: string;
  principal_recovered: number;
  interest_recovered: number;
  net_deduction: number;
  remaining_unrecovered_balance: number;
  certified_by: string;
  created_at?: string;
}

// ---------------------------------------------------------------------------
// CPWD GCC CLAUSE 2 & CLAUSE 5 HINDRANCE REGISTER, EOT & LIQUIDATED DAMAGES
// ---------------------------------------------------------------------------
export type StatutoryHindranceCategory =
  | "Site Handover Delay"
  | "GFC Drawing Delay"
  | "Client Material Supply"
  | "Statutory Approval Hold"
  | "Adverse Weather"
  | "Force Majeure"
  | "Subcontractor Non-Performance";

export type HindranceAttributableParty =
  | "Employer/Client"
  | "Contractor"
  | "Neutral/Force Majeure";

export type StatutoryHindranceStatus = "Active" | "Resolved" | "Disputed";

export interface StatutoryHindranceRecord {
  id: string;
  project_id: string;
  hindrance_no: string;
  category: StatutoryHindranceCategory;
  description: string;
  location_or_grid: string;
  start_date: string;
  resolution_date?: string | null;
  gross_days: number;
  overlapping_days: number;
  net_effective_days: number;
  critical_path_affected: boolean;
  attributable_party: HindranceAttributableParty;
  status: StatutoryHindranceStatus;
  created_at?: string;
}

export type EotClauseReference =
  | "CPWD Clause 5.2"
  | "CPWD Clause 5.3"
  | "FIDIC 8.4";

export type EotApprovalStatus =
  | "Under Review"
  | "Sanctioned Without LD"
  | "Sanctioned With Clause 2 LD"
  | "Rejected";

export interface ContractEotApplication {
  id: string;
  project_id: string;
  application_no: string;
  submission_date: string;
  clause_reference: EotClauseReference;
  days_claimed: number;
  engineer_recommended_days: number;
  sanctioned_days: number;
  original_stipulated_date: string;
  revised_stipulated_date: string;
  approval_status: EotApprovalStatus;
  created_at?: string;
}

export interface LiquidatedDamagesLedger {
  id: string;
  project_id: string;
  eot_application_id?: string | null;
  contract_sum: number;
  stipulated_completion_date: string;
  actual_or_projected_completion: string;
  unauthorized_delay_days: number;
  daily_ld_rate_pct: number;
  accrued_ld_amount: number;
  statutory_ld_cap_pct: number;
  capped_ld_amount: number;
  amount_recovered: number;
  ra_bill_deduction_ref?: string | null;
  created_at?: string;
}

// ---------------------------------------------------------------------------
// FINAL BILL SETTLEMENT, RETENTION RELEASE & NO-CLAIMS DISCHARGE (CPWD 8B/9 & FIDIC 14.9/14.11)
// ---------------------------------------------------------------------------
export type AuditClearanceStatus = "Pending Audit" | "Scrutinized" | "Certified" | "Settled";

export interface FinalBillSettlement {
  id: string;
  project_id: string;
  final_bill_no: string;
  gross_contract_sum: number;
  gross_executed_value: number;
  cumulative_previous_ra_gross: number;
  net_final_bill_gross: number;
  total_retention_held: number;
  retention_released_stage_1: number;
  retention_held_dlp_stage_2: number;
  statutory_tax_deductions_total: number;
  net_final_payable: number;
  no_claims_attested: boolean;
  audit_clearance_status: AuditClearanceStatus;
  created_at?: string;
}

export type RetentionReleaseTranche =
  | "Tranche 1 [50% at TOC / Completion]"
  | "Tranche 2 [50% after DLP Clearance]";

export type RetentionMode = "Cash Retained" | "Bank Guarantee Substitution";

export type RetentionReleaseStatus = "Withheld" | "Sanctioned" | "Disbursed";

export interface RetentionReleaseLedger {
  id: string;
  final_bill_id: string;
  project_id: string;
  release_tranche: RetentionReleaseTranche;
  retention_mode: RetentionMode;
  bg_guarantee_ref?: string | null;
  bg_validity_date?: string | null;
  eligible_release_amount: number;
  withheld_for_unrectified_defects: number;
  net_released_amount: number;
  release_sanction_date: string;
  status: RetentionReleaseStatus;
  created_at?: string;
}

export interface StatutoryNoClaimsUndertaking {
  id: string;
  final_bill_id: string;
  project_id: string;
  contractor_legal_name: string;
  authorized_signatory_name: string;
  signatory_designation: string;
  final_agreed_settlement_sum: number;
  no_further_claims_declaration: string;
  discharge_condition_precedent_met: boolean;
  digital_signature_hash: string;
  attestation_ip_address: string;
  attested_at: string;
  created_at?: string;
}
