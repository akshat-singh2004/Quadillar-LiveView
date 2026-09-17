export interface BcfIssueInput {
  issueId: string;
  title: string;
  description: string;
  status: "Open" | "InProgress" | "Resolved";
  discipline: string;
  location: string;
  coordinate: { x: number; y: number; z: number };
  camera: { viewPointX: number; viewPointY: number; viewPointZ: number; upVectorX: number; upVectorY: number; upVectorZ: number; cameraDirectionX: number; cameraDirectionY: number; cameraDirectionZ: number };
  relatedDocumentId?: string;
}

export interface BcfIssuePackage {
  bcfVersion: "3.0";
  generatedAt: string;
  project: string;
  issues: BcfIssueInput[];
}

export function exportBcfIssuePackage(issues: BcfIssueInput[]) {
  const timestamp = new Date().toISOString();

  const issueEntries = issues.map((issue) => `
    <Issue>
      <Id>${escapeXml(issue.issueId)}</Id>
      <Title>${escapeXml(issue.title)}</Title>
      <Status>${escapeXml(issue.status)}</Status>
      <Description>${escapeXml(issue.description)}</Description>
      <Discipline>${escapeXml(issue.discipline)}</Discipline>
      <Location>${escapeXml(issue.location)}</Location>
      <RelatedDocumentId>${escapeXml(issue.relatedDocumentId ?? "")}</RelatedDocumentId>
      <Coordinates>
        <X>${issue.coordinate.x}</X>
        <Y>${issue.coordinate.y}</Y>
        <Z>${issue.coordinate.z}</Z>
      </Coordinates>
      <ViewPoint>
        <ViewPointX>${issue.camera.viewPointX}</ViewPointX>
        <ViewPointY>${issue.camera.viewPointY}</ViewPointY>
        <ViewPointZ>${issue.camera.viewPointZ}</ViewPointZ>
        <UpVectorX>${issue.camera.upVectorX}</UpVectorX>
        <UpVectorY>${issue.camera.upVectorY}</UpVectorY>
        <UpVectorZ>${issue.camera.upVectorZ}</UpVectorZ>
        <CameraDirectionX>${issue.camera.cameraDirectionX}</CameraDirectionX>
        <CameraDirectionY>${issue.camera.cameraDirectionY}</CameraDirectionY>
        <CameraDirectionZ>${issue.camera.cameraDirectionZ}</CameraDirectionZ>
      </ViewPoint>
    </Issue>
  `).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<BCF version="3.0">
  <Header>
    <GeneratedAt>${timestamp}</GeneratedAt>
    <Project>Quadillar LiveView</Project>
  </Header>
  <Issues>
    ${issueEntries}
  </Issues>
</BCF>`;

  const json: BcfIssuePackage = {
    bcfVersion: "3.0",
    generatedAt: timestamp,
    project: "Quadillar LiveView",
    issues: issues.map((issue) => ({
      issueId: issue.issueId,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      discipline: issue.discipline,
      location: issue.location,
      coordinate: issue.coordinate,
      camera: issue.camera,
      relatedDocumentId: issue.relatedDocumentId,
    })),
  };

  return {
    xml,
    json,
    filename: "quadillar-liveview-issues.bcf",
  };
}

export function importBcfIssuePackage(raw: string): BcfIssuePackage {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { bcfVersion: "3.0", generatedAt: new Date().toISOString(), project: "Quadillar LiveView", issues: [] };
  }

  try {
    const parsed = JSON.parse(trimmed) as Partial<BcfIssuePackage>;
    if (parsed && Array.isArray(parsed.issues)) {
      return {
        bcfVersion: "3.0",
        generatedAt: parsed.generatedAt ?? new Date().toISOString(),
        project: parsed.project ?? "Quadillar LiveView",
        issues: parsed.issues.map((issue) => ({
          issueId: issue.issueId ?? issue.title ?? "imported-issue",
          title: issue.title ?? "Imported BCF Issue",
          description: issue.description ?? "",
          status: issue.status ?? "Open",
          discipline: issue.discipline ?? "Unassigned",
          location: issue.location ?? "Unassigned",
          coordinate: issue.coordinate ?? { x: 0, y: 0, z: 0 },
          camera: issue.camera ?? {
            viewPointX: 0, viewPointY: 0, viewPointZ: 0,
            upVectorX: 0, upVectorY: 1, upVectorZ: 0,
            cameraDirectionX: 0, cameraDirectionY: 0, cameraDirectionZ: -1,
          },
          relatedDocumentId: issue.relatedDocumentId,
        })),
      };
    }
  } catch {
    // fall through to XML import
  }

  const issueBlocks = [...trimmed.matchAll(/<Issue\b[^>]*>([\s\S]*?)<\/Issue>/gi)];
  const issues: BcfIssueInput[] = issueBlocks.map((match) => {
    const rawBlock = match[1];
    const getValue = (tag: string) => {
      const matchValue = new RegExp(`<${tag}>\\s*([^<]+?)\\s*<\\/${tag}>`, "i").exec(rawBlock);
      return matchValue ? matchValue[1].trim() : "";
    };
    const coordinate = {
      x: Number.parseFloat(getValue("X") || "0"),
      y: Number.parseFloat(getValue("Y") || "0"),
      z: Number.parseFloat(getValue("Z") || "0"),
    };
    const camera = {
      viewPointX: Number.parseFloat(getValue("ViewPointX") || "0"),
      viewPointY: Number.parseFloat(getValue("ViewPointY") || "0"),
      viewPointZ: Number.parseFloat(getValue("ViewPointZ") || "0"),
      upVectorX: Number.parseFloat(getValue("UpVectorX") || "0"),
      upVectorY: Number.parseFloat(getValue("UpVectorY") || "1"),
      upVectorZ: Number.parseFloat(getValue("UpVectorZ") || "0"),
      cameraDirectionX: Number.parseFloat(getValue("CameraDirectionX") || "0"),
      cameraDirectionY: Number.parseFloat(getValue("CameraDirectionY") || "0"),
      cameraDirectionZ: Number.parseFloat(getValue("CameraDirectionZ") || "-1"),
    };

    return {
      issueId: getValue("Id") || `imported-${Math.random().toString(36).slice(2, 8)}`,
      title: getValue("Title") || "Imported BCF Issue",
      description: getValue("Description") || "",
      status: (getValue("Status") as BcfIssueInput["status"]) || "Open",
      discipline: getValue("Discipline") || "Unassigned",
      location: getValue("Location") || "Unassigned",
      coordinate,
      camera,
      relatedDocumentId: getValue("RelatedDocumentId") || undefined,
    };
  });

  return {
    bcfVersion: "3.0",
    generatedAt: new Date().toISOString(),
    project: "Quadillar LiveView",
    issues,
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
