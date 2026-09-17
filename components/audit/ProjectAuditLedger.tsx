"use client";

import { useMemo, useState } from "react";
import type { AuditEvent, TradePackage } from "@/types/construction";

const defaultAuditEvents: AuditEvent[] = [
  {
    id: "AUD-01",
    projectId: "proj-1",
    timestamp: "2026-08-18T08:15:00.000Z",
    role: "General Contractor (GC) / Lead Consultant",
    action: "State Promoted to GFC",
    documentReference: "CDE/Project/MEP/REV-03",
    tradeDiscipline: "MEP",
  },
  {
    id: "AUD-02",
    projectId: "proj-1",
    timestamp: "2026-08-17T15:45:00.000Z",
    role: "Client / Asset Owner",
    action: "Change Order Signed",
    documentReference: "CO-44",
    tradeDiscipline: "Finishes",
  },
  {
    id: "AUD-03",
    projectId: "proj-1",
    timestamp: "2026-08-16T11:20:00.000Z",
    role: "Certified Special Inspector (Third-Party Testing Agency)",
    action: "Cube Strength Test Certified",
    documentReference: "MATERIAL-TEST-17",
    tradeDiscipline: "Concrete",
  },
  {
    id: "AUD-04",
    projectId: "proj-1",
    timestamp: "2026-08-15T18:00:00.000Z",
    role: "General Contractor (GC) / Lead Consultant",
    action: "RFI Escalated to RFC",
    documentReference: "RFI-101",
    tradeDiscipline: "Steel",
  },
];

const tradeFilters: Array<TradePackage | "All"> = ["All", "Concrete", "Steel", "Masonry", "MEP", "Finishes"];

export function ProjectAuditLedger() {
  const [tradeFilter, setTradeFilter] = useState<TradePackage | "All">("All");
  const [fromDate, setFromDate] = useState("2026-08-15");
  const [toDate, setToDate] = useState("2026-08-18");

  const filtered = useMemo(() => {
    return defaultAuditEvents.filter((event) => {
      const matchesTrade = tradeFilter === "All" || event.tradeDiscipline === tradeFilter;
      const ts = new Date(event.timestamp);
      const matchesFrom = !fromDate || ts >= new Date(`${fromDate}T00:00:00.000Z`);
      const matchesTo = !toDate || ts <= new Date(`${toDate}T23:59:59.999Z`);
      return matchesTrade && matchesFrom && matchesTo;
    });
  }, [fromDate, toDate, tradeFilter]);

  return (
    <section style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 20, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>Enterprise Audit Ledger</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tradeFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setTradeFilter(filter)}
              style={{
                border: tradeFilter === filter ? "1px solid #60a5fa" : "1px solid #334155",
                background: tradeFilter === filter ? "#111827" : "transparent",
                color: "#e2e8f0",
                borderRadius: 999,
                padding: "7px 10px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <label style={{ display: "grid", gap: 6, color: "#cbd5e1" }}>
          <span style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em" }}>From</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ background: "#111827", border: "1px solid #334155", borderRadius: 10, padding: "8px 10px", color: "#e2e8f0" }} />
        </label>

        <label style={{ display: "grid", gap: 6, color: "#cbd5e1" }}>
          <span style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em" }}>To</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ background: "#111827", border: "1px solid #334155", borderRadius: 10, padding: "8px 10px", color: "#e2e8f0" }} />
        </label>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.map((entry) => (
          <div key={entry.id} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 700 }}>{entry.action}</div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>{entry.tradeDiscipline}</div>
            </div>
            <div style={{ marginTop: 8, color: "#cbd5e1", fontSize: 13 }}>
              {new Date(entry.timestamp).toLocaleString("en-IN")} • {entry.role}
            </div>
            <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 12 }}>Document reference: {entry.documentReference}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
