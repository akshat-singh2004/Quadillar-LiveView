"use client";

import { DocumentClauseViewer } from "@/components/contracts/DocumentClauseViewer";

export default function ContractAnalyzerPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: "28px 24px 56px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 20 }}>
        <header>
          <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>Contract intelligence</div>
          <h1 style={{ margin: 0, fontSize: 42, letterSpacing: "-0.05em" }}>AI Contract Clause & Tender Specification Analyzer</h1>
        </header>

        <section style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.24)", borderRadius: 22, padding: 18 }}>
          <DocumentClauseViewer />
        </section>
      </div>
    </main>
  );
}
