import { buildProgressiveCobiePackage, type ProgressiveCobiePackage } from "@/lib/cobie/exporter";
import type { ApprovedSubmittal, CdeItem } from "@/types/construction";

export interface OpenDataExportBundle {
  projectId: string;
  generatedAt: string;
  sheets: Record<string, Array<Record<string, string | number | boolean | null>>>;
  json: string;
  csv: string;
  filename: string;
}

export function exportOpenDataBundle(
  projectId: string,
  cdeItems: CdeItem[] = [],
  submittals: ApprovedSubmittal[] = [],
): OpenDataExportBundle {
  const packageData: ProgressiveCobiePackage = buildProgressiveCobiePackage(projectId, cdeItems, submittals);

  const sheets: Record<string, Array<Record<string, string | number | boolean | null>>> = {
    Facility: packageData.facility,
    Floor: packageData.floor,
    Space: packageData.space,
    Type: packageData.type.map((item) => ({
      TypeName: item.typeName,
      TypeCategory: item.typeCategory,
      TypeDescription: item.typeDescription ?? "",
      Manufacturer: item.manufacturer ?? "",
      Model: item.model ?? "",
      Uniclass: item.uniclass ?? "",
      CreatedAt: item.createdAt,
      Source: item.source,
    })),
    Component: packageData.component.map((item) => ({
      ComponentName: item.componentName,
      ComponentType: item.componentType,
      Location: item.location,
      SpaceLocationCode: item.spaceLocationCode ?? "",
      SerialNumber: item.serialNumber ?? "",
      Manufacturer: item.manufacturer ?? "",
      ModelNumber: item.modelNumber ?? "",
      AssetId: item.assetId ?? "",
      WarrantyStartDate: item.warrantyStartDate ?? "",
      WarrantyPeriodMonths: item.warrantyPeriod ?? 0,
      Status: item.status,
      CreatedAt: item.createdAt,
      Source: item.source,
    })),
    System: packageData.system.map((item) => ({
      SystemName: item.SystemName,
      SystemType: item.SystemType,
      SourceSubmittalId: item.SourceSubmittalId,
      Status: item.Status,
    })),
    Document: packageData.document.map((item) => ({
      DocumentName: item.DocumentName,
      DocumentType: item.DocumentType,
      Revision: item.Revision,
      State: item.State,
      IsLatest: item.IsLatest,
      ApprovalDate: item.ApprovalDate,
      Source: item.Source,
    })),
  };

  const json = JSON.stringify({ projectId, generatedAt: packageData.generatedAt, sheets }, null, 2);
  const csv = Object.entries(sheets)
    .map(([sheetName, rows]) => {
      if (!rows.length) {
        return `# ${sheetName}\n`;
      }
      const headers = Object.keys(rows[0]);
      const body = rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
      return `# ${sheetName}\n${headers.join(",")}\n${body}\n`;
    })
    .join("\n");

  return {
    projectId,
    generatedAt: packageData.generatedAt,
    sheets,
    json,
    csv,
    filename: `quadillar-open-data-${projectId}.json`,
  };
}
