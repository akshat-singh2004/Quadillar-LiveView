import type { CdeItem, ChangeOrderRecord, RfiRecord } from "@/types/construction";

export interface SummaryExportInput {
  projectName?: string;
  drawingRevisions: CdeItem[];
  rfiLogs: RfiRecord[];
  changeOrders: ChangeOrderRecord[];
  fileName?: string;
}

function toCsvValue(value: string | number | boolean | undefined | null) {
  const str = String(value ?? "").replace(/"/g, '""');
  return `"${str}"`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener noreferrer";
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} Lakh`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function exportProjectSummaryCsv({ projectName = "Quadillar LiveView", drawingRevisions, rfiLogs, changeOrders, fileName = "project-summary" }: SummaryExportInput) {
  const rows = [
    ["Section", "ID", "Title", "Status", "Revision", "Amount / Impact", "Owner / Responsible Party"],
    ...drawingRevisions.map((item) => ["Drawing Revision", item.id, item.title, `${item.state} / ${item.status}`, String(item.revision), item.approved ? "Approved" : "Pending", item.container]),
    ...rfiLogs.map((item) => ["RFI Log", item.id, item.title, item.status, "-", `${item.contractImpact} / ${item.riskScore} risk`, item.ballInCourt]),
    ...changeOrders.map((item) => ["Change Order Claim", item.id, item.title, item.status, "-", formatCurrency(item.amount), `${item.timeImpactDays} days`] ),
  ];

  const csv = rows.map((row) => row.map(toCsvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${fileName}.csv`);
}

export function exportProjectSummaryPdf({ projectName = "Quadillar LiveView", drawingRevisions, rfiLogs, changeOrders, fileName = "project-summary" }: SummaryExportInput) {
  const lines = [
    `${projectName} - Executive Summary`,
    "",
    `Drawing revisions: ${drawingRevisions.length}`,
    ...drawingRevisions.slice(0, 8).map((item) => `- ${item.title} (${item.state}, Rev ${item.revision})`),
    "",
    `Open RFIs: ${rfiLogs.length}`,
    ...rfiLogs.slice(0, 8).map((item) => `- ${item.title} | ${item.status} | ${item.ballInCourt}`),
    "",
    `Change order claims: ${changeOrders.length}`,
    ...changeOrders.slice(0, 8).map((item) => `- ${item.title} | ${item.status} | ${formatCurrency(item.amount)}`),
  ];

  const contentStream = lines
    .map((line, index) => `BT\n/F1 12 Tf\n50 ${760 - index * 16} Td\n(${escapePdfText(line)}) Tj\nET`)
    .join("\n");

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${contentStream.length} >>
stream
${contentStream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000062 00000 n 
0000000124 00000 n 
0000000267 00000 n 
0000000715 00000 n 
trailer
<< /Root 1 0 R /Size 6 >>
startxref
778
%%EOF`;

  downloadBlob(new Blob([pdf], { type: "application/pdf" }), `${fileName}.pdf`);
}
