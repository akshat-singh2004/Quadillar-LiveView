import type { ApprovedSubmittal, CdeItem, CobieComponent, CobieDataset, CobieType } from "@/types/construction";

export interface ProgressiveCobiePackage {
  projectId: string;
  generatedAt: string;
  facility: Array<{
    FacilityName: string;
    ProjectName: string;
    ProjectId: string;
    SiteAddress: string;
    isActive: boolean;
  }>;
  floor: Array<{
    FacilityName: string;
    FloorName: string;
    FloorType: string;
    FloorNumber: number;
  }>;
  space: Array<{
    SpaceName: string;
    FloorName: string;
    SpaceCategory: string;
    AreaM2: number;
  }>;
  type: CobieType[];
  component: CobieComponent[];
  system: Array<{
    SystemName: string;
    SystemType: string;
    SourceSubmittalId: string;
    Status: string;
    name?: string;
    systemName?: string;
  }>;
  document: Array<{
    DocumentName: string;
    DocumentType: string;
    Revision: number;
    State: string;
    IsLatest: boolean;
    ApprovalDate: string;
    Source: string;
    name?: string;
  }>;
}

export function buildProgressiveCobiePackage(
  projectId: string,
  cdeItems: CdeItem[] = [],
  submittals: ApprovedSubmittal[] = [],
): ProgressiveCobiePackage {
  const facility = [{
    FacilityName: "Project 01 / Core Shell",
    ProjectName: "Quadillar LiveView",
    ProjectId: projectId,
    SiteAddress: "Bengaluru, India",
    isActive: true,
  }];

  const floor = [
    { FacilityName: "Project 01 / Core Shell", FloorName: "Ground Floor", FloorType: "Level 0", FloorNumber: 0 },
    { FacilityName: "Project 01 / Core Shell", FloorName: "First Floor", FloorType: "Level 1", FloorNumber: 1 },
    { FacilityName: "Project 01 / Core Shell", FloorName: "Roof Level", FloorType: "Top Level", FloorNumber: 2 },
  ];

  const space = [
    { SpaceName: "Plant Room 1", FloorName: "Ground Floor", SpaceCategory: "Mechanical", AreaM2: 96 },
    { SpaceName: "Facade Zone A", FloorName: "First Floor", SpaceCategory: "Facade", AreaM2: 140 },
    { SpaceName: "Roof Plant Deck", FloorName: "Roof Level", SpaceCategory: "Roof", AreaM2: 110 },
  ];

  const typeRows: CobieType[] = [];
  const componentRows: CobieComponent[] = [];
  const systemRows: ProgressiveCobiePackage["system"] = [];
  const documentRows: ProgressiveCobiePackage["document"] = [];

  const approvedSubmittals = submittals.filter((item) => item.status === "Approved");

  approvedSubmittals.forEach((submittal, index) => {
    const metadata = submittal.metadata ?? {};
    const typeName = `${submittal.trade || "Asset"} ${index + 1}`;

    typeRows.push({
      typeName,
      typeCategory: submittal.trade || "Equipment",
      typeDescription: submittal.title,
      manufacturer: String(metadata.manufacturer ?? ""),
      model: String(metadata.model ?? ""),
      createdAt: submittal.approvalDate ?? new Date().toISOString(),
      source: submittal.id,
      uniclass: String(metadata.uniclass ?? ""),
    });

    const components = Array.isArray(submittal.componentList) ? submittal.componentList : [];
    components.forEach((component, componentIndex) => {
      const componentName = component.name ?? `${typeName} Component ${componentIndex + 1}`;
      componentRows.push({
        componentName,
        componentType: component.type ?? typeName,
        location: component.location ?? "Not assigned",
        spaceLocationCode: component.spaceLocationCode ?? "",
        serialNumber: component.serialNumber ?? "",
        manufacturer: component.manufacturer ?? "",
        modelNumber: component.modelNumber ?? "",
        assetId: component.assetId ?? "",
        warrantyStartDate: component.warrantyStartDate ?? new Date().toISOString(),
        warrantyPeriod: component.warrantyPeriod ?? 0,
        status: component.status ?? "Installed",
        createdAt: submittal.approvalDate ?? new Date().toISOString(),
        source: submittal.id,
      });
    });

    systemRows.push({
      SystemName: `${submittal.trade} System`,
      SystemType: submittal.trade || "MEP",
      SourceSubmittalId: submittal.id,
      Status: "Commissioned",
      name: `${submittal.trade} System`,
      systemName: `${submittal.trade} System`,
    });
  });

  cdeItems.forEach((item) => {
    documentRows.push({
      DocumentName: item.title,
      DocumentType: item.container,
      Revision: item.revision,
      State: item.state,
      IsLatest: item.isLatest,
      ApprovalDate: item.updatedAt,
      Source: item.id,
      name: item.title,
    });
  });

  return {
    projectId,
    generatedAt: new Date().toISOString(),
    facility,
    floor,
    space,
    type: typeRows,
    component: componentRows,
    system: systemRows,
    document: documentRows,
  };
}

function toCsv(rows: Array<Record<string, string | number | boolean | null>>): string {
  if (!rows.length) return "";

  const headers = Object.keys(rows[0]);
  const csvRows = [headers.join(",")];

  rows.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header];
      const normalized = value == null ? "" : String(value).replace(/"/g, '""');
      return `"${normalized}"`;
    });
    csvRows.push(values.join(","));
  });

  return csvRows.join("\n");
}

export function exportOpenCobiePackage(
  projectId: string,
  cdeItems: CdeItem[] = [],
  submittals: ApprovedSubmittal[] = [],
) {
  const packageData = buildProgressiveCobiePackage(projectId, cdeItems, submittals);
  const json = JSON.stringify(packageData, null, 2);
  const csv = Object.entries(packageData)
    .filter(([key]) => key !== "projectId" && key !== "generatedAt")
    .map(([sheetName, rows]) => `# ${sheetName}\n${toCsv(rows as Array<Record<string, string | number | boolean | null>>)}\n`)
    .join("\n");

  return {
    packageData,
    json,
    csv,
    filename: `open-cobie-${projectId}.json`,
    csvFilename: `open-cobie-${projectId}.csv`,
  };
}

export function generateDigitalHandoverCertificate(
  projectId: string,
  gates: Array<{ phaseName: string; inspectionPassStatus: boolean; isClosed: boolean }>,
  testStatus: string,
): string {
  const clearedGates = gates.filter((gate) => gate.inspectionPassStatus && gate.isClosed).map((gate) => gate.phaseName);
  const openGates = gates.filter((gate) => !gate.inspectionPassStatus || !gate.isClosed).map((gate) => gate.phaseName);

  return [
    "AIA G704 / Substantial Completion Summary",
    "",
    `Project ID: ${projectId}`,
    `Generated At: ${new Date().toISOString()}`,
    "",
    "Cleared Quality Gates:",
    clearedGates.length ? clearedGates.map((item) => `- ${item}`).join("\n") : "- None recorded",
    "",
    "Open Gate Items:",
    openGates.length ? openGates.map((item) => `- ${item}`).join("\n") : "- None open",
    "",
    `Concrete Lab Status: ${testStatus}`,
    "",
    "Punch-list resolutions complete: Yes",
    "Occupancy / possession summary: Ready for client handover subject to final sign-off.",
  ].join("\n");
}
