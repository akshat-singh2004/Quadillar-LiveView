"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchDashboardSnapshot } from "@/app/lib/services";
import { exportOpenDataBundle } from "@/lib/cobie/openDataExporter";

export default function HandoverExportPage() {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchDashboardSnapshot("proj-1");
      setSnapshot(data);
      setLoading(false);
    }

    void load();
  }, []);

  const exportBundle = useMemo(() => {
    if (!snapshot) return null;
    return exportOpenDataBundle("proj-1", snapshot.cdeItems, snapshot.submittals);
  }, [snapshot]);

  const downloadJson = () => {
    if (!exportBundle) return;
    const blob = new Blob([exportBundle.json], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = exportBundle.filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const downloadCsv = () => {
    if (!exportBundle) return;
    const blob = new Blob([exportBundle.csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "quadillar-open-data-export.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#050505", color: "#f5f5f5", display: "grid", placeItems: "center" }}>
        Loading export package…
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#f5f5f5", padding: 28 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <div style={{ color: "#d4d4d4", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>
            Open data export
          </div>
          <h1 style={{ margin: 0, fontSize: 38, letterSpacing: "-0.04em" }}>ISO 19650 and COBie export engine</h1>
        </header>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          <button
            type="button"
            onClick={downloadJson}
            style={{ background: "#f5f5f5", color: "#111111", border: "none", borderRadius: 12, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            style={{ background: "#171717", color: "#f5f5f5", border: "1px solid #404040", borderRadius: 12, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}
          >
            Download CSV
          </button>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {exportBundle && Object.entries(exportBundle.sheets).map(([sheetName, rows]) => (
            <section key={sheetName} style={{ background: "#0a0a0a", border: "1px solid #262626", borderRadius: 18, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 22 }}>{sheetName}</h2>
                <span style={{ color: "#a3a3a3", fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{rows.length} rows</span>
              </div>
              <pre style={{ margin: 0, background: "#111111", border: "1px solid #262626", borderRadius: 12, padding: 12, color: "#e5e5e5", whiteSpace: "pre-wrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {JSON.stringify(rows.slice(0, 4), null, 2)}
              </pre>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
