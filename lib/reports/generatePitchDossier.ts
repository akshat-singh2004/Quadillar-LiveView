export interface PitchDossierData {
  projectName: string;
  projectCode: string;
  tier: string;
  generatedAt: string;
  executiveSummary: string;
  portfolio: {
    totalBudget: number;
    certifiedValue: number;
    retainageHeld: number;
    costVariance: number;
    scheduleVarianceDays: number;
    qualityHealth: number;
    carbonIntensity: number;
  };
  packages: Array<{ name: string; progress: number; budget: number; variance: number }>;
  milestones: Array<{ name: string; planned: number; actual: number; status: string }>;
  safety: {
    manpowerActive: number;
    incidentCount: number;
    complianceScore: number;
  };
  verification: {
    signer: string;
    credentialId: string;
  };
}

function formatInr(val: number) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val).toLocaleString("en-IN")}`;
}

export function generatePitchDossierPdf(payload: PitchDossierData) {
  const printWindow = window.open("", "_blank", "width=1100,height=900");
  if (!printWindow) return;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${payload.projectName} — Executive Portfolio Dossier</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #09090b; background: #ffffff; line-height: 1.5; margin: 0; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #09090b; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #0284c7; }
    .title { font-size: 26px; font-weight: 800; margin: 4px 0 0; letter-spacing: -0.02em; }
    .meta { font-size: 11px; color: #52525b; font-family: monospace; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; background: #f4f4f5; border: 1px solid #e4e4e7; }
    
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .card { border: 1px solid #e4e4e7; border-radius: 8px; padding: 12px 14px; background: #fafafa; }
    .card-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; margin-bottom: 4px; }
    .card-val { font-size: 20px; font-weight: 800; font-family: monospace; }

    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #09090b; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px; margin: 20px 0 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
    th { text-align: left; padding: 8px 10px; background: #f4f4f5; font-size: 10px; text-transform: uppercase; color: #52525b; border-bottom: 1px solid #e4e4e7; }
    td { padding: 8px 10px; border-bottom: 1px solid #f4f4f5; }
    .tar { text-align: right; }
    .mono { font-family: monospace; }

    .footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e4e4e7; display: flex; justify-content: space-between; font-size: 10px; color: #71717a; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Quadillar LiveView · Executive Governance</div>
      <h1 class="title">${payload.projectName}</h1>
      <div class="meta">REF: ${payload.projectCode} · SCALE: ${payload.tier} · ISSUED: ${payload.generatedAt}</div>
    </div>
    <span class="badge">ISO 19650 AUDITED</span>
  </div>

  <div class="grid-4">
    <div class="card">
      <div class="card-label">Total Capital Envelope</div>
      <div class="card-val">${formatInr(payload.portfolio.totalBudget)}</div>
    </div>
    <div class="card">
      <div class="card-label">Certified to Date</div>
      <div class="card-val">${formatInr(payload.portfolio.certifiedValue)}</div>
    </div>
    <div class="card">
      <div class="card-label">Retainage Reserve</div>
      <div class="card-val" style="color: #b45309;">${formatInr(payload.portfolio.retainageHeld)}</div>
    </div>
    <div class="card">
      <div class="card-label">Schedule Variance</div>
      <div class="card-val" style="color: ${payload.portfolio.scheduleVarianceDays >= 0 ? '#15803d' : '#b91c1c'};">
        ${payload.portfolio.scheduleVarianceDays >= 0 ? '+' : ''}${payload.portfolio.scheduleVarianceDays} Days
      </div>
    </div>
  </div>

  <div class="section-title">Trade Package Breakdown</div>
  <table>
    <thead>
      <tr>
        <th>Package</th>
        <th class="tar">Contract Cap</th>
        <th class="tar">Progress</th>
        <th class="tar">Variance</th>
      </tr>
    </thead>
    <tbody>
      ${payload.packages.map((p) => `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td class="tar mono">${formatInr(p.budget)}</td>
          <td class="tar mono">${p.progress}%</td>
          <td class="tar mono">${formatInr(p.variance)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="section-title">Critical Stage-Gate Status</div>
  <table>
    <thead>
      <tr>
        <th>Milestone</th>
        <th class="tar">Planned</th>
        <th class="tar">Achieved</th>
        <th>Governance Status</th>
      </tr>
    </thead>
    <tbody>
      ${payload.milestones.map((m) => `
        <tr>
          <td><strong>${m.name}</strong></td>
          <td class="tar mono">${m.planned}%</td>
          <td class="tar mono">${m.actual}%</td>
          <td>${m.status}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="footer">
    <div>Signed by: <strong>${payload.verification.signer}</strong> · Digital Credential: <span class="mono">${payload.verification.credentialId}</span></div>
    <div>CONFIDENTIAL — FOR BOARD & INVESTOR CLEARANCE ONLY</div>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}