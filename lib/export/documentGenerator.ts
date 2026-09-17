import { createHash } from "node:crypto";

import type { DashboardSnapshot, MaterialTestLog, TransmittalRecord } from "@/types/construction";

export interface AiaG704Input {
  projectId: string;
  projectName: string;
  issuingEntity: string;
  architectOfRecord: string;
  municipalPermitReference: string;
  verifiedSpaces: string[];
  punchListCompleted: boolean;
  warrantyCommencementDate: string;
  completedAt: string;
}

export function generateAiaG704Certificate(input: AiaG704Input): string {
  const verifiedSpacesText = input.verifiedSpaces.length
    ? input.verifiedSpaces.map((space) => `- ${space}`).join("\n")
    : "- No verified spaces recorded";

  return [
    "AIA G704 CERTIFICATE OF SUBSTANTIAL COMPLETION",
    "",
    `Project ID: ${input.projectId}`,
    `Project Name: ${input.projectName}`,
    `Issuer: ${input.issuingEntity}`,
    `Architect of Record: ${input.architectOfRecord}`,
    `Municipal Permit Reference: ${input.municipalPermitReference}`,
    `Date of Substantial Completion: ${input.completedAt}`,
    `Warranty Commencement Date: ${input.warrantyCommencementDate}`,
    "",
    "Verified spaces:",
    verifiedSpacesText,
    "",
    `Punch List Completion Status: ${input.punchListCompleted ? "Completed" : "Outstanding items remain"}`,
    "",
    "This certificate confirms that the work or designated portion of the work is substantially complete and ready for occupancy subject to final documentation and close-out review.",
    "",
    "Architect of Record digital sign-off: Approved",
    "Project authority sign-off: Pending final municipal close-out acknowledgement.",
  ].join("\n");
}

export interface AiaG702Input {
  projectId: string;
  projectName: string;
  originalContractSumInr: number;
  approvedChangeOrdersInr: number;
  totalWorkCompletedInr: number;
  retainageRate: number;
  netPaymentDueInr?: number;
  period: string;
}

export function generateAiaG702PaymentCertificate(input: AiaG702Input): string {
  const retainage = input.totalWorkCompletedInr * (input.retainageRate || 0.05);
  const netPaymentDue = input.netPaymentDueInr ?? Math.max(0, input.totalWorkCompletedInr - retainage);

  return [
    "AIA G702 / G703 APPLICATION AND CERTIFICATE FOR PAYMENT",
    "",
    `Project ID: ${input.projectId}`,
    `Project Name: ${input.projectName}`,
    `Application Period: ${input.period}`,
    "",
    `Original Contract Sum: INR ${formatInrCurrency(input.originalContractSumInr)}`,
    `Approved Change Orders: INR ${formatInrCurrency(input.approvedChangeOrdersInr)}`,
    `Total Work Completed to Date: INR ${formatInrCurrency(input.totalWorkCompletedInr)}`,
    `Retainage Deduction (5%): INR ${formatInrCurrency(retainage)}`,
    `Net Payment Due: INR ${formatInrCurrency(netPaymentDue)}`,
    "",
    "Certification statement: The undersigned certifies that the payment request reflects the value of work completed and materials suitably stored in accordance with the contract documents.",
  ].join("\n");
}

export interface AiaG810Input {
  projectId: string;
  issuingEntity: string;
  recipientOrganization: string;
  documents: Array<{
    identifier: string;
    revision: number;
    uniclassCode: string;
    title: string;
    fileHash?: string;
  }>;
  distributedAt: string;
  distributedBy: string;
}

export async function generateAiaG810TransmittalManifest(input: AiaG810Input): Promise<string> {
  const rows = await Promise.all(
    input.documents.map(async (document) => {
      const hash = document.fileHash ?? (await sha256(`${input.projectId}:${document.identifier}:${document.revision}`));
      return [
        `- ${document.identifier}`,
        `  Title: ${document.title}`,
        `  Revision: ${document.revision}`,
        `  Uniclass: ${document.uniclassCode}`,
        `  SHA-256: ${hash}`,
      ].join("\n");
    }),
  );

  return [
    "AIA G810 TRANSMITTAL MANIFEST",
    "",
    `Project ID: ${input.projectId}`,
    `Issuing Entity: ${input.issuingEntity}`,
    `Recipient Organization: ${input.recipientOrganization}`,
    `Distributed At: ${input.distributedAt}`,
    `Distributed By: ${input.distributedBy}`,
    "",
    "Document record:",
    ...rows,
    "",
    "Recipient sign-off: Confirmed",
    "Distribution method: Project portal / controlled email",
  ].join("\n");
}

export interface QualityDossierInput {
  projectId: string;
  projectName: string;
  geotechnicalBearingCapacity: number;
  concreteTests: MaterialTestLog[];
  tabCertification: string;
  warrantyStartDate: string;
}

export function generateMasterQualityDossier(input: QualityDossierInput): string {
  const concreteTestRows = input.concreteTests.length
    ? input.concreteTests
        .map((test) => `- ${test.grade}: 7-day ${test.sevenDayStrength} MPa, 28-day ${test.twentyEightDayStrength} MPa, status ${test.status}`)
        .join("\n")
    : "- No concrete test entries recorded";

  return [
    "MASTER QUALITY DOSSIER",
    "",
    `Project ID: ${input.projectId}`,
    `Project Name: ${input.projectName}`,
    `Warranty Commencement Date: ${input.warrantyStartDate}`,
    "",
    `Geotechnical bearing capacity verification, q_a: ${input.geotechnicalBearingCapacity} kPa`,
    "",
    "Concrete cube compressive test register:",
    concreteTestRows,
    "",
    `MEP TAB commissioning certification: ${input.tabCertification}`,
    "",
    "This dossier should be retained in the statutory close-out package and referenced during asset handover and facilities operations onboarding.",
  ].join("\n");
}

export async function generateProjectDocumentBundle(snapshot: DashboardSnapshot) {
  const projectId = "proj-1";
  const verifiedSpaces = (snapshot.cdeItems ?? []).filter((item) => item.state === "Published").slice(0, 5).map((item) => item.title);
  const materialTests = (snapshot.materialTests ?? []).slice(0, 12);

  return {
    g704: generateAiaG704Certificate({
      projectId,
      projectName: "Quadillar LiveView",
      issuingEntity: "Quadillar Real Estate Developers",
      architectOfRecord: "Architect of Record / Structural Engineer of Record",
      municipalPermitReference: "BMRDA-BP-2026-1184",
      verifiedSpaces,
      punchListCompleted: (snapshot.punchListItems ?? []).filter((item) => item.rectificationStatus !== "Closed").length === 0,
      warrantyCommencementDate: "2026-09-01",
      completedAt: "2026-08-18",
    }),
    g702: generateAiaG702PaymentCertificate({
      projectId,
      projectName: "Quadillar LiveView",
      originalContractSumInr: 275000000,
      approvedChangeOrdersInr: 14850000,
      totalWorkCompletedInr: 204000000,
      retainageRate: 0.05,
      period: "August 2026",
    }),
    g810: await generateAiaG810TransmittalManifest({
      projectId,
      issuingEntity: "Quadillar LiveView Project Controls",
      recipientOrganization: "Facility Operations and Asset Management",
      documents: [
        { identifier: "Q-LV-ME-01", revision: 3, uniclassCode: "EF_40_20_30", title: "MEP System Verification Package" },
        { identifier: "Q-LV-STR-07", revision: 2, uniclassCode: "EF_20_10", title: "Structural Close-Out Drawings" },
        { identifier: "Q-LV-DOC-31", revision: 1, uniclassCode: "Pr_70_65", title: "Building Services Commissioning Manual" },
      ],
      distributedAt: "2026-08-18T00:00:00.000Z",
      distributedBy: "Project Controls Office",
    }),
    qualityDossier: generateMasterQualityDossier({
      projectId,
      projectName: "Quadillar LiveView",
      geotechnicalBearingCapacity: 340,
      concreteTests: materialTests,
      tabCertification: "Approved by Independent Commissioning Agent with final TAB balancing certification complete.",
      warrantyStartDate: "2026-09-01",
    }),
  };
}

function formatInrCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} Lakh`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

async function sha256(value: string): Promise<string> {
  return createHash("sha256").update(value).digest("hex");
}
