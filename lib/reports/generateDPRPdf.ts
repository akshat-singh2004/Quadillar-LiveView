export interface DprPdfPayload {
  projectName: string;
  projectCode: string;
  dateLabel: string;
  weatherSummary: string;
  manpowerSummary: string;
  machinerySummary: string;
  narrative: string;
  milestoneLogs: Array<{ title: string; status: string; note: string }>;
  photos: string[];
  reviewedBy?: string;
  approvedBy?: string;
}

export function generateDprPdfPayload(payload: DprPdfPayload) {
  const summary = [
    "Quadillar LiveView",
    `${payload.projectName} • ${payload.projectCode}`,
    `Daily Site Report • ${payload.dateLabel}`,
    "",
    `Weather: ${payload.weatherSummary}`,
    `Manpower: ${payload.manpowerSummary}`,
    `Machinery: ${payload.machinerySummary}`,
    "",
    "Daily progress narrative:",
    payload.narrative,
    "",
    "Milestones:",
    ...payload.milestoneLogs.map((log) => `- ${log.title} (${log.status}): ${log.note}`),
    "",
    `Reviewed by: ${payload.reviewedBy ?? "Pending"}`,
    `Approved by: ${payload.approvedBy ?? "Pending"}`,
  ];

  return summary.join("\n");
}

export async function openDprReportPrint(payload: DprPdfPayload) {
  const docText = generateDprPdfPayload(payload);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`<!doctype html><html><head><title>${payload.projectName} DPR</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111;}h1{margin:0 0 12px;}p,li{line-height:1.6;} .header{border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px;} .meta{margin-bottom:18px;} .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0;} .photo{width:120px;height:120px;border:1px solid #e2e8f0;display:inline-block;background:linear-gradient(135deg,#dbeafe,#f8fafc);margin-right:8px;}</style></head><body><div class='header'><h1>Quadillar LiveView</h1><div>${payload.projectName} • ${payload.projectCode}</div></div><div class='meta'><strong>Daily Site Report</strong> • ${payload.dateLabel}</div><pre>${docText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre><div class='grid'>${payload.photos.map((photo) => `<div class='photo' style="background-image:url('${photo}');background-size:cover;background-position:center;"></div>`).join("")}</div></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
