"use client";

import { useMemo, useState } from "react";
import { CommissioningPackModal, isCommissioningPass } from "@/components/quality/CommissioningPackModal";
import type { CommissioningTestPack } from "@/types/construction";

const seedPacks: CommissioningTestPack[] = [
  { id: "tc-01", projectId: "proj-1", packNumber: "T&C-HP-014", system: "Domestic water riser", testType: "Hydrostatic Pressure", location: "North Tower / Level 07", witnessRequired: true, status: "Pending", values: { measured: 0.18, allowable: 0.2, unit: "bar drop" } },
  { id: "tc-02", projectId: "proj-1", packNumber: "T&C-MG-009", system: "LV distribution board DB-03", testType: "Megger Electrical", location: "Electrical room / Level 03", witnessRequired: true, status: "Pending", values: { measured: 2.4, allowable: 1, unit: "MOhm" } },
  { id: "tc-03", projectId: "proj-1", packNumber: "T&C-HV-006", system: "AHU-04 supply network", testType: "HVAC Air Balancing", location: "West wing / Level 04", witnessRequired: true, status: "Passed", consultantStamp: "CONSULTANT-WITNESS-T&C-HV-006", values: { measured: 101, allowable: 95, unit: "% design airflow" } },
];

export default function CommissioningPage() {
  const [packs, setPacks] = useState(seedPacks);
  const [selected, setSelected] = useState<CommissioningTestPack | null>(null);
  const signedOff = packs.filter((pack) => pack.status === "Passed" && pack.consultantStamp).length;
  const readiness = Math.round((signedOff / packs.length) * 100);
  const exportDossier = () => { const passed = packs.filter((pack) => pack.status === "Passed"); const content = ["Quadillar LiveView - T&C Handover Dossier", "", ...passed.map((pack) => `${pack.packNumber} | ${pack.testType} | ${pack.system} | ${pack.values.measured} ${pack.values.unit} | ${pack.consultantStamp ?? "Pending witness"}`)].join("\n"); const blob = new Blob([content], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "tc-handover-dossier.txt"; anchor.click(); URL.revokeObjectURL(url); };

  return <main style={pageStyle}><div style={containerStyle}><header style={headerStyle}><div><div style={eyebrowStyle}>Quality / MEP closeout</div><h1 style={titleStyle}>Testing & commissioning console</h1><p style={mutedStyle}>Execute FAT-SAT sheets, enforce acceptance limits, and certify the handover record.</p></div><button type="button" onClick={exportDossier} disabled={!packs.some((pack) => pack.status === "Passed")} style={{ ...primaryButton, opacity: packs.some((pack) => pack.status === "Passed") ? 1 : .45 }}>Export T&C handover dossier</button></header>
    <section style={readinessPanel}><div><div style={termStyle}>Commissioning readiness</div><div style={{ marginTop: 8, fontSize: 32, fontWeight: 800 }}>{readiness}%</div></div><div style={{ flex: 1, minWidth: 220 }}><div style={barTrack}><div style={{ ...bar, width: `${readiness}%` }} /></div><div style={mutedStyle}>{signedOff} of {packs.length} test packs carry a consultant witness stamp</div></div></section>
    <section style={{ display: "grid", gap: 12 }}>{packs.map((pack) => { const passed = isCommissioningPass(pack); const signed = Boolean(pack.consultantStamp); return <button key={pack.id} type="button" onClick={() => setSelected(pack)} style={rowStyle}><div style={{ textAlign: "left" }}><div style={{ fontWeight: 800 }}>{pack.packNumber} · {pack.testType}</div><div style={mutedStyle}>{pack.system} · {pack.location}</div></div><div style={{ textAlign: "right" }}><div style={{ color: pack.status === "Failed / Re-test Required" ? "#fca5a5" : passed ? "#86efac" : "#fcd34d", fontSize: 11, fontWeight: 900 }}>{pack.status === "Failed / Re-test Required" ? "FAILED / RE-TEST" : signed ? "CERTIFIED" : passed ? "PASS / WITNESS PENDING" : "PENDING"}</div><div style={mutedStyle}>{pack.values.measured} {pack.values.unit}</div></div></button>; })}</section>
    {selected && <CommissioningPackModal pack={selected} onClose={() => setSelected(null)} onSave={(updated) => { setPacks((current) => current.map((pack) => pack.id === updated.id ? updated : pack)); setSelected(null); }} />}
  </div></main>;
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 28 };
const containerStyle: React.CSSProperties = { maxWidth: 1200, margin: "0 auto" };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap", marginBottom: 24 };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 800 };
const titleStyle: React.CSSProperties = { margin: "7px 0 0", fontSize: 38, letterSpacing: "-0.04em" };
const mutedStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 12, marginTop: 6 };
const termStyle: React.CSSProperties = { color: "#64748b", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase" };
const readinessPanel: React.CSSProperties = { display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", background: "#0b1220", border: "1px solid #1e293b", borderRadius: 16, padding: 20, marginBottom: 18 };
const barTrack: React.CSSProperties = { height: 11, background: "#111827", borderRadius: 999, overflow: "hidden" };
const bar: React.CSSProperties = { height: "100%", background: "linear-gradient(90deg, #38bdf8, #34d399)", borderRadius: 999 };
const rowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, width: "100%", background: "#0b1220", color: "#f8fafc", border: "1px solid #1e293b", borderRadius: 14, padding: 16, cursor: "pointer" };
const primaryButton: React.CSSProperties = { border: 0, borderRadius: 9, background: "#34d399", color: "#052e16", padding: "11px 14px", fontWeight: 800, cursor: "pointer" };