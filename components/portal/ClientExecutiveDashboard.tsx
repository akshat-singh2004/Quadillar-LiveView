"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchDashboardSnapshot, subscribeToProjectRealtime, updateChangeOrderStatus } from "@/app/lib/services";
import { getClientExecutiveView } from "@/lib/auth/portalGate";
import { exportProjectSummaryCsv, exportProjectSummaryPdf } from "@/lib/export/summaryExporter";
import { TelemetryErrorBoundary } from "@/components/analytics/TelemetryErrorBoundary";
import type { DashboardSnapshot } from "@/types/construction";
import { ScheduleMetrics } from "@/components/dashboard/ScheduleMetrics";
import { VariationTourWidget } from "@/components/dashboard/VariationTourWidget";
import { ESGScorecardWidget } from "@/components/dashboard/ESGScorecardWidget";
import { HandoverSafetyKpiWidget } from "@/components/dashboard/HandoverSafetyKpiWidget";

function formatInrShort(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} Lakh`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function buildPdfDossier(summary: ReturnType<typeof getClientExecutiveView>) {
  const lines = [
    "Quadillar LiveView - Client Status Dossier",
    "",
    `Total Contract Sum: ${formatInrShort(summary.totalContractSum)}`,
    `Certified Billed Amount: ${formatInrShort(summary.certifiedBilledAmount)}`,
    `Withheld Retainage Escrow: ${formatInrShort(summary.withheldRetainage)}`,
    `Net Variation Impact: ${formatInrShort(summary.netVariation)}`,
    "",
    "Key Milestones:",
    ...summary.milestones.map((item) => `- ${item.title} (${item.status} / target ${item.target_completion_date})`),
    "",
    "Pending Owner Approvals:",
    ...summary.pendingApprovals.map((item) => `- ${item.title}: ${formatInrShort(item.amount)} and ${item.timeImpactDays} days`),
  ];

  const content = lines.join("\n");
  const stream = `BT\n/F1 16 Tf\n50 760 Td\n(${content.replace(/\(/g, "\\(").replace(/\)/g, "\\)")}) Tj\nET`;

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
<< /Length ${stream.length} >>
stream
${stream}
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

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "client-status-dossier.pdf";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ClientExecutiveDashboard() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);

  const dashboard = useMemo(() => (snapshot ? getClientExecutiveView(snapshot) : null), [snapshot]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const data = await fetchDashboardSnapshot("proj-1");
      if (mounted) {
        setSnapshot(data);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => subscribeToProjectRealtime("proj-1", {
    onCdeChange: (payload) => setSnapshot((current) => current ? { ...current, cdeItems: current.cdeItems.map((item) => item.id === payload.new.id ? { ...item, ...payload.new } : item) } : current),
    onRfiChange: () => undefined,
    onChangeOrderChange: (payload) => setSnapshot((current) => current ? { ...current, changeOrders: current.changeOrders.map((item) => item.id === payload.new.id ? { ...item, ...payload.new } : item) } : current),
  }), []);

  const summary = dashboard;

  if (!summary) {
    return <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", color: "#cbd5e1" }}>Loading executive dashboard…</div>;
  }

  const view = (
    <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 28 }}>
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 26 }}>
          <div>
            <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>Client / Asset Owner</div>
            <h1 style={{ margin: 0, fontSize: 38, letterSpacing: "-0.04em" }}>Executive Clarity Portal</h1>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => exportProjectSummaryCsv({ projectName: "Quadillar Client Status Dossier", drawingRevisions: snapshot?.cdeItems ?? [], rfiLogs: snapshot?.rfis ?? [], changeOrders: snapshot?.changeOrders ?? [], fileName: "client-status-dossier" })}
              style={{ background: "#0ea5e9", color: "white", border: "none", borderRadius: 12, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => exportProjectSummaryPdf({ projectName: "Quadillar Client Status Dossier", drawingRevisions: snapshot?.cdeItems ?? [], rfiLogs: snapshot?.rfis ?? [], changeOrders: snapshot?.changeOrders ?? [], fileName: "client-status-dossier" })}
              style={{ background: "#22c55e", color: "#052e16", border: "none", borderRadius: 12, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}
            >
              Download PDF
            </button>
          </div>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18, marginBottom: 24 }}>
          {[
            { label: "Total Contract Sum", value: formatInrShort(summary.totalContractSum) },
            { label: "Certified Billed Amount", value: formatInrShort(summary.certifiedBilledAmount) },
            { label: "Withheld Retainage Escrow", value: formatInrShort(summary.withheldRetainage) },
            { label: "Net Variation Impact", value: formatInrShort(summary.netVariation) },
          ].map((item) => (
            <div key={item.label} style={{ background: "linear-gradient(180deg, rgba(11,18,32,0.96), rgba(15,23,42,0.9))", border: "1px solid #1e293b", borderRadius: 18, padding: 20 }}>
              <div style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" }}>{item.label}</div>
              <div style={{ marginTop: 14, fontSize: 28, fontWeight: 800 }}>{item.value}</div>
            </div>
          ))}
        </section>

        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 24, background: "#0b1220", border: "1px solid #1e293b", borderRadius: 18, padding: 18 }}>
          <div><div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>Today's DPR Status</div><strong style={{ display: "block", marginTop: 8, color: "#fbbf24", fontSize: 18 }}>Pending Consultant Sign-off</strong></div>
          <a href="/site/dpr" style={{ color: "#7dd3fc", fontWeight: 700, textDecoration: "none" }}>Inspect latest progress report →</a>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1.3fr 0.9fr", gap: 20, marginBottom: 24 }}>
          <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 18, padding: 20 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 22 }}>Project Health & Milestone Roadmap</h2>
            <div style={{ display: "grid", gap: 14 }}>
              {summary.milestones.map((milestone) => (
                <div key={milestone.milestone_id} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                    <div style={{ fontWeight: 700 }}>{milestone.title}</div>
                    <span style={{ background: milestone.status === "Certified_Completed" ? "#dcfce7" : milestone.status === "Under_Verification" ? "#fef3c7" : "#dbeafe", color: milestone.status === "Certified_Completed" ? "#166534" : milestone.status === "Under_Verification" ? "#b45309" : "#1d4ed8", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>
                      {milestone.status === "Certified_Completed" ? "Verified" : milestone.status === "Under_Verification" ? "Under Verification" : "In Progress"}
                    </span>
                  </div>
                  <div style={{ height: 10, background: "#0f172a", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: milestone.status === "Certified_Completed" ? "100%" : milestone.status === "Under_Verification" ? "70%" : "55%", height: "100%", background: "linear-gradient(90deg, #22c55e, #60a5fa)", borderRadius: 999 }} />
                  </div>
                  <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 12 }}>Target handover: {milestone.target_completion_date}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 18, padding: 20 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 22 }}>Pending Owner Approvals</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {summary.pendingApprovals.length ? summary.pendingApprovals.map((order) => (
                <div key={order.id} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{order.title}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 10 }}>{formatInrShort(order.amount)} • {order.timeImpactDays} days</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => void updateChangeOrderStatus(order.id, "Approved", { role: "client" })} style={{ background: "#16a34a", color: "#052e16", border: "none", borderRadius: 10, padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>Authorize Variation</button>
                    <button type="button" style={{ background: "transparent", color: "#e2e8f0", border: "1px solid #1e293b", borderRadius: 10, padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>Reject</button>
                  </div>
                </div>
              )) : <div style={{ color: "#94a3b8" }}>No variation approvals pending.</div>}
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 24 }}>
          <ScheduleMetrics tasks={snapshot?.projectTasks ?? []} />
        </section>

        <VariationTourWidget />
        <ESGScorecardWidget />
        <HandoverSafetyKpiWidget />

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 18, padding: 20 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 22 }}>Verified Site Photo Walkthrough</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {summary.photoWalkthrough.map((photo) => (
                <div key={photo.title} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, overflow: "hidden" }}>
                  <img src={photo.image} alt={photo.title} style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
                  <div style={{ padding: 12 }}>
                    <div style={{ fontWeight: 700 }}>{photo.title}</div>
                    <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 12 }}>{photo.caption}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 18, padding: 20 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 22 }}>Certified Financial Snapshot</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {summary.certifiedBills.map((bill) => (
                <div key={bill.paymentApplicationId} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700 }}>{bill.tradePackage}</div>
                    <span style={{ background: "#dcfce7", color: "#166534", borderRadius: 999, padding: "6px 8px", fontSize: 11, fontWeight: 700 }}>{bill.status}</span>
                  </div>
                  <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 12 }}>Certified amount: {formatInrShort(bill.currentWorkCompleted + bill.storedMaterials)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );

  return (
    <TelemetryErrorBoundary fallback={<main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 28 }}><div style={{ maxWidth: 720, margin: "0 auto", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 18, background: "rgba(15,23,42,0.9)", padding: 24 }}>The executive dashboard is unavailable right now. Please refresh or check connectivity.</div></main>}>
      {view}
    </TelemetryErrorBoundary>
  );
}
