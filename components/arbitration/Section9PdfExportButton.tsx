"use client";

import React, { useState } from "react";
import { Printer, Download, Scale, ShieldCheck, Loader2 } from "lucide-react";

interface Props {
  petitionTitle: string;
  claimant: string;
  respondent: string;
  disputeCode: string;
  quantum: string;
  certNumber: string;
}

export function Section9PdfExportButton({
  petitionTitle,
  claimant,
  respondent,
  disputeCode,
  quantum,
  certNumber,
}: Props) {
  const [exporting, setExporting] = useState(false);

  const handlePrintPdf = () => {
    setExporting(true);
    setTimeout(() => {
      window.print();
      setExporting(false);
    }, 250);
  };

  const handleDownloadCourtBundle = () => {
    setExporting(true);
    try {
      const timestamp = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      const bundleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${disputeCode} - Section 9 High Court Petition</title>
  <style>
    @page { size: A4; margin: 25mm 20mm 20mm 25mm; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.6; color: #000; padding: 20px; }
    .court-header { text-align: center; font-weight: bold; text-transform: uppercase; margin-bottom: 25px; }
    .parties { margin-bottom: 25px; }
    .parties div { margin-bottom: 8px; }
    .p-title { text-align: center; font-weight: bold; margin: 20px 0; text-transform: uppercase; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 10px 0; }
    .merkle-stamp { border: 2px solid #000; padding: 12px; margin-top: 30px; font-family: monospace; font-size: 10pt; }
    .sign-block { margin-top: 50px; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="court-header">
    IN THE HIGH COURT OF JUDICATURE AT LUCKNOW<br>
    ORDINARY ORIGINAL CIVIL JURISDICTION<br>
    ARBITRATION PETITION (INTERIM MEASURES) NO. _______ OF 2026
  </div>

  <div class="parties">
    <div><strong>${claimant}</strong> ... PETITIONER / CLAIMANT</div>
    <div style="text-align: center; margin: 10px 0;"><strong>VERSUS</strong></div>
    <div><strong>${respondent}</strong> ... RESPONDENT</div>
  </div>

  <div class="p-title">
    PETITION UNDER SECTION 9 OF THE ARBITRATION AND CONCILIATION ACT, 1996 FOR INTERIM PROTECTION & RESTRAINING UNLAWFUL BANK GUARANTEE ENCASHMENT
  </div>

  <p><strong>MOST RESPECTFULLY SHOWETH:</strong></p>
  <p>1. That the Petitioner is executing engineering works under Contract Ref: ${disputeCode}.</p>
  <p>2. That the Respondent has unilaterally threatened encashment of Performance Bank Guarantees amounting to <strong>₹${quantum}</strong> without resolving contemporaneous SCL delay records.</p>
  <p>3. That contemporaneous sensor logs demonstrate that delay is exclusively attributable to employer-risk events under FIDIC Clause 20.1 / CPWD Clause 5.</p>
  <p>4. <strong>PRAYER:</strong> Pass an ex-parte ad-interim injunction restraining encashment of Bank Guarantees and stay recovery of Clause 2 Liquidated Damages.</p>

  <div class="merkle-stamp">
    <strong>EVIDENCE CERTIFICATION UNDER SECTION 65B INDIAN EVIDENCE ACT:</strong><br>
    Certificate Number : ${certNumber}<br>
    Merkle Root Hash   : e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855<br>
    Certified By       : Quadillar LiveView Autonomous Council Synapse<br>
    Execution Date     : ${timestamp}
  </div>

  <div class="sign-block">
    <div>Advocate for Petitioner</div>
    <div style="text-align: right;">Authorized Signatory for Petitioner</div>
  </div>
</body>
</html>`;

      const blob = new Blob([bundleHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${disputeCode}-HIGH-COURT-SECTION-9-PETITION.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleDownloadCourtBundle}
        disabled={exporting}
        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-700 text-zinc-200 font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow"
        title="Download self-contained court bundle HTML"
      >
        <Download className="w-3.5 h-3.5 text-indigo-400" />
        <span>Export Court Bundle</span>
      </button>

      <button
        type="button"
        onClick={handlePrintPdf}
        disabled={exporting}
        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-950/40"
        title="Print or save as High Court Legal PDF"
      >
        {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
        <span>Print to Judicial PDF</span>
      </button>
    </div>
  );
}
