"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchDashboardSnapshot, subscribeToProjectRealtime, updateCdeItemState } from "@/app/lib/services";
import { getArchitectView } from "@/lib/auth/portalGate";
import { exportProjectSummaryCsv, exportProjectSummaryPdf } from "@/lib/export/summaryExporter";
import { TelemetryErrorBoundary } from "@/components/analytics/TelemetryErrorBoundary";
import type { CdeItem, DashboardSnapshot, WorkInspectionRequest } from "@/types/construction";
import { VerificationTelemetry } from "@/components/governance/VerificationTelemetry";
import { QualityGovernanceTelemetry } from "@/components/quality/QualityGovernanceTelemetry";
import { MeasurementItpWidget } from "@/components/dashboard/MeasurementItpWidget";
import { BackchargeVrWidget } from "@/components/dashboard/BackchargeVrWidget";
import { QualityTelemetryWidget } from "@/components/dashboard/QualityTelemetryWidget";

export default function ArchitectPortalPage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const data = await fetchDashboardSnapshot("proj-1");
      if (mounted) setSnapshot(data);
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => subscribeToProjectRealtime("proj-1", {
    onCdeChange: (payload) => setSnapshot((current) => current ? { ...current, cdeItems: current.cdeItems.map((item) => item.id === payload.new.id ? { ...item, ...payload.new } : item) } : current),
    onRfiChange: (payload) => setSnapshot((current) => current ? { ...current, rfis: current.rfis.map((item) => item.id === payload.new.id ? { ...item, ...payload.new } : item) } : current),
    onChangeOrderChange: (payload) => setSnapshot((current) => current ? { ...current, changeOrders: current.changeOrders.map((item) => item.id === payload.new.id ? { ...item, ...payload.new } : item) } : current),
    onWirChange: (payload) => setSnapshot((current) => current ? { ...current, workInspectionRequests: payload.eventType === "DELETE" ? (current.workInspectionRequests ?? []).filter((item) => item.id !== payload.old.id) : (current.workInspectionRequests ?? []).some((item) => item.id === payload.new.id) ? (current.workInspectionRequests ?? []).map((item) => item.id === payload.new.id ? { ...item, ...payload.new } : item) : [...(current.workInspectionRequests ?? []), payload.new as WorkInspectionRequest] } : current),
  }), []);

  const view = useMemo(() => (snapshot ? getArchitectView(snapshot) : null), [snapshot]);

  const publishGfc = async (item: CdeItem) => {
    if (!snapshot) return;
    const updated = await updateCdeItemState(item.id, "Published", { status: "Approved", approved: true }, { role: "architect", name: "Architect Portal" });
    if (updated) setSnapshot((current) => current ? { ...current, cdeItems: current.cdeItems.map((entry) => entry.id === updated.id ? updated : entry) } : current);
  };

  const pendingInspections = (snapshot?.workInspectionRequests ?? []).filter((item) => item.status === "Pending Inspection");
  const clashHealth = useMemo(() => {
    const total = Math.max(1, (snapshot?.bimClashes ?? []).length || 1);
    const resolved = (snapshot?.bimClashes ?? []).filter((item) => item.status === "Resolved").length;
    return { health: Math.round((resolved / total) * 100), open: total - resolved };
  }, [snapshot?.bimClashes]);
  const weatherStatus = useMemo(() => {
    const wind = 42;
    const rain = 6.8;
    if (wind >= 38 || rain >= 5) return { label: "Full Stoppage", color: "#ef4444" };
    if (wind >= 30 || rain >= 3) return { label: "Restricted Weather Ops", color: "#f59e0b" };
    return { label: "Normal Site Ops", color: "#22c55e" };
  }, []);

  if (!view) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#050816", color: "#e2e8f0" }}>Loading design governance portal…</main>;

  const portalContent = (
    <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 28 }}>
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <header style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>Architect / Consultant</div>
            <h1 style={{ margin: 0, fontSize: 38, letterSpacing: "-0.04em" }}>Design Governance Portal</h1>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={() => exportProjectSummaryCsv({ projectName: "Quadillar Architect Summary", drawingRevisions: snapshot?.cdeItems ?? [], rfiLogs: snapshot?.rfis ?? [], changeOrders: snapshot?.changeOrders ?? [], fileName: "architect-summary" })} style={{ background: "#0ea5e9", color: "white", border: "none", borderRadius: 12, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>Export CSV</button>
            <button type="button" onClick={() => exportProjectSummaryPdf({ projectName: "Quadillar Architect Summary", drawingRevisions: snapshot?.cdeItems ?? [], rfiLogs: snapshot?.rfis ?? [], changeOrders: snapshot?.changeOrders ?? [], fileName: "architect-summary" })} style={{ background: "#22c55e", color: "#052e16", border: "none", borderRadius: 12, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>Download PDF</button>
          </div>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 22 }}>
          <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 18, padding: 20 }}>
            <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase" }}>Design Coordination Clash Health</div>
            <div style={{ marginTop: 12, fontSize: 38, fontWeight: 700, color: "#67e8f9" }}>{clashHealth.health}%</div>
            <div style={{ marginTop: 12, height: 10, borderRadius: 999, background: "rgba(148,163,184,0.12)", overflow: "hidden" }}><div style={{ width: `${clashHealth.health}%`, height: "100%", background: "linear-gradient(90deg, #22d3ee, #34d399)" }} /></div>
            <div style={{ marginTop: 12, color: "#cbd5e1" }}>{clashHealth.open} clashes remain in active review.</div>
          </div>

          <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 18, padding: 20 }}>
            <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase" }}>Site Operating Weather Condition</div>
            <div style={{ marginTop: 12, fontSize: 28, fontWeight: 700, color: weatherStatus.color }}>{weatherStatus.label}</div>
            <div style={{ marginTop: 12, color: "#cbd5e1" }}>Wind 42 km/h • Rain 6.8 mm/hr</div>
          </div>
        </section>

        <VerificationTelemetry />
        <QualityGovernanceTelemetry />
        <MeasurementItpWidget />
        <BackchargeVrWidget />
        <QualityTelemetryWidget />

        <section style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20, marginBottom: 22 }}>
          <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 18, padding: 20 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 22 }}>CDE State Promotion Center</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {view.cdeItems.map((item) => (
                <div key={item.id} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.title}</div>
                      <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>{item.container}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ background: item.state === "Published" ? "#dcfce7" : "#fef3c7", color: item.state === "Published" ? "#166534" : "#b45309", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>{item.state}</span>
                      <button type="button" disabled={item.state === "Published"} onClick={() => void publishGfc(item)} style={{ background: "#2563eb", color: "white", border: "none", borderRadius: 10, padding: "8px 12px", fontWeight: 700, cursor: item.state === "Published" ? "not-allowed" : "pointer", opacity: item.state === "Published" ? 0.5 : 1 }}>Approve to GFC</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 18, padding: 20 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 22 }}>Active Inquiries (RFIs)</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {view.activeRfis.map((rfi) => (
                <div key={rfi.id} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: 14 }}>
                  <div style={{ fontWeight: 700 }}>{rfi.title}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>{rfi.ballInCourt} / {rfi.currentOwner}</div>
                  <div style={{ marginTop: 10, color: "#dbeafe", fontSize: 12 }}>SLA: {rfi.slaHoursRemaining ?? 0}h remaining</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button type="button" style={{ background: "#1d4ed8", color: "white", border: "none", borderRadius: 10, padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>Escalate to RFC</button>
                    <button type="button" style={{ background: "transparent", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 10, padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>Respond</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 18, padding: 20, marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><h2 style={{ margin: 0, fontSize: 22 }}>Pending Inspections Queue</h2><span style={{ color: "#fde68a", fontSize: 12 }}>{pendingInspections.length} awaiting review</span></div>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>{pendingInspections.filter((item) => item.discipline === "Concrete" || item.discipline === "Reinforcement").map((item) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", background: "#111827", borderRadius: 12, padding: 12 }}><div><div style={{ fontWeight: 700 }}>{item.wirNumber} · {item.title}</div><div style={{ color: "#94a3b8", fontSize: 12, marginTop: 5 }}>{item.targetGridLocation} / {item.discipline}</div></div><span style={{ color: "#fca5a5", fontSize: 11, fontWeight: 700 }}>URGENT PRE-POUR</span></div>)}</div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 18, padding: 20 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 22 }}>Submittal & Sample Queue</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {view.submittals.map((submittal) => (
                <div key={submittal.id} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ fontWeight: 700 }}>{submittal.title}</div>
                    <span style={{ background: "#fef3c7", color: "#b45309", borderRadius: 999, padding: "6px 8px", fontSize: 11, fontWeight: 700 }}>{submittal.actionCode ?? "Pending"}</span>
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>Trade: {submittal.trade}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 18, padding: 20 }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 22 }}>Milestone Quality Certifications</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {view.milestoneRules.map((rule) => (
                <div key={rule.rule_id} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ fontWeight: 700 }}>{rule.verification_type.replace("_", " ")}</div>
                    <span style={{ color: rule.is_verified ? "#4ade80" : "#fbbf24", fontSize: 11, fontWeight: 700 }}>{rule.is_verified ? "Certified" : "Open"}</span>
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>{rule.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );

  return (
    <TelemetryErrorBoundary fallback={<main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 28 }}><div style={{ maxWidth: 720, margin: "0 auto", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 18, background: "rgba(15,23,42,0.9)", padding: 24 }}>The design governance portal is unavailable right now. Please refresh or retry when connectivity is restored.</div></main>}>
      {portalContent}
    </TelemetryErrorBoundary>
  );
}
