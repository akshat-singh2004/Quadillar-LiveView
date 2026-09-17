import type {
  ApprovedSubmittal,
  CobieComponent,
  CobieDataset,
  CobieType,
} from "@/types/construction";

function normaliseTitle(value?: string): string {
  return (value ?? "").trim();
}

export function parseApprovedSubmittalToCobie(
  submittal: ApprovedSubmittal,
): CobieDataset {
  if (submittal.status !== "Approved") {
    return {
      projectId: submittal.projectId,
      sourceSubmittalId: submittal.id,
      extractedAt: new Date().toISOString(),
      types: [],
      components: [],
    };
  }

  const metadata = submittal.metadata ?? {};
  const typeName =
    (typeof metadata.typeName === "string" && metadata.typeName) ||
    normaliseTitle(submittal.title) ||
    "General Assembly";

  const typeCategory =
    (typeof metadata.typeCategory === "string" && metadata.typeCategory) ||
    "Construction";

  const cobieTypes: CobieType[] = [
    {
      typeName,
      typeCategory,
      typeDescription: `Approved submittal type extracted from ${submittal.title}`,
      createdAt: submittal.approvalDate ?? new Date().toISOString(),
      source: submittal.id,
    },
  ];

  const rawComponents = Array.isArray(submittal.componentList)
    ? submittal.componentList
    : Array.isArray(metadata.components)
      ? (metadata.components as Array<Record<string, unknown>>)
      : [];

  const components: CobieComponent[] = rawComponents.map((component, index) => ({
    componentName:
      (typeof component.name === "string" && component.name) ||
      `${typeName} Component ${index + 1}`,
    componentType:
      (typeof component.type === "string" && component.type) || typeName,
    location:
      (typeof component.location === "string" && component.location) || "Not assigned",
    serialNumber:
      typeof component.serialNumber === "string" ? component.serialNumber : undefined,
    manufacturer:
      typeof component.manufacturer === "string" ? component.manufacturer : undefined,
    modelNumber:
      typeof component.modelNumber === "string" ? component.modelNumber : undefined,
    assetId: typeof component.assetId === "string" ? component.assetId : undefined,
    status:
      (component.status as CobieComponent["status"]) ?? "Installed",
    createdAt: submittal.approvalDate ?? new Date().toISOString(),
    source: submittal.id,
  }));

  if (components.length === 0) {
    components.push({
      componentName: typeName,
      componentType: typeName,
      location: "General",
      status: "Installed",
      createdAt: submittal.approvalDate ?? new Date().toISOString(),
      source: submittal.id,
    });
  }

  return {
    projectId: submittal.projectId,
    sourceSubmittalId: submittal.id,
    extractedAt: new Date().toISOString(),
    types: cobieTypes,
    components,
  };
}

export function extractCobieDatasetFromApprovals(
  approvals: ApprovedSubmittal[],
): CobieDataset[] {
  return approvals
    .filter((submittal) => submittal.status === "Approved")
    .map((submittal) => parseApprovedSubmittalToCobie(submittal));
}
