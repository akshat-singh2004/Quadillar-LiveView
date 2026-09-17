"use client";

import { useMemo, useState } from "react";
import { upsertMeasurementBookEntry } from "@/app/lib/services";
import type { MeasurementBookEntry } from "@/types/construction";

function quantity(entry: MeasurementBookEntry) {
  return entry.nos * entry.length * (entry.breadth || 1) * (entry.depth || 1) * (entry.isDeduction ? -1 : 1);
}

export function MBEntrySheet({ initialEntries }: { initialEntries: MeasurementBookEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [jointlyVerified, setJointlyVerified] = useState(false);
  const [message, setMessage] = useState("");

  const total = useMemo(() => entries.reduce((sum, entry) => sum + quantity(entry), 0), [entries]);

  const persistEntries = async (nextEntries: MeasurementBookEntry[]) => {
    const payload = nextEntries.map((entry) => ({
      ...entry,
      projectId: entry.projectId || "proj-1",
      itemDescription: entry.itemDescription || "Untitled measurement",
      gridAxisLocation: entry.gridAxisLocation || "TBD",
      nos: Number(entry.nos || 0),
      length: Number(entry.length || 0),
      breadth: Number(entry.breadth || 0),
      depth: Number(entry.depth || 0),
      unit: entry.unit || "m3",
      measuredAt: entry.measuredAt || new Date().toISOString(),
      contractorVerified: entry.contractorVerified,
    }));

    const saved = await Promise.all(payload.map((entry) => upsertMeasurementBookEntry(entry)));
    const next = saved.filter((item): item is MeasurementBookEntry => Boolean(item));
    setEntries(next.length ? next : payload);
    return next.length ? next : payload;
  };

  const addRow = () => setEntries((current) => [...current, { id: `mb-${Date.now()}`, projectId: "proj-1", itemDescription: "", gridAxisLocation: "", nos: 1, length: 0, breadth: 0, depth: 0, unit: "m3", isDeduction: false, contractorVerified: false, measuredAt: new Date().toISOString() }]);
  const update = <K extends keyof MeasurementBookEntry>(id: string, key: K, value: MeasurementBookEntry[K]) => setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, [key]: value } : entry));
  const stamp = async () => {
    const stamped = entries.map((entry) => ({ ...entry, contractorVerified: true, consultantStamp: `PMC-QS-${new Date().toISOString()}` }));
    setEntries(stamped);
    await persistEntries(stamped);
  };

  return <div style={{ display: "grid", gap: 16 }}><div style={toolbar}><div><div style={eyebrow}>CPWD / IS 1200 quantity takeoff</div><h2 style={title}>Joint measurement sheet</h2></div><button type="button" onClick={addRow} style={button}>Add measurement row</button></div><div style={tableWrap}><table style={table}><thead><tr>{["Item description", "Grid / location", "Nos", "L", "B", "D", "Unit", "Deduction", "Qty"].map((heading) => <th key={heading} style={th}>{heading}</th>)}</tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td style={td}><input value={entry.itemDescription} onChange={(event) => update(entry.id, "itemDescription", event.target.value)} style={input} /></td><td style={td}><input value={entry.gridAxisLocation} onChange={(event) => update(entry.id, "gridAxisLocation", event.target.value)} style={input} /></td>{(["nos", "length", "breadth", "depth"] as const).map((key) => <td key={key} style={td}><input type="number" step="0.01" value={entry[key]} onChange={(event) => update(entry.id, key, Number(event.target.value))} style={numberInput} /></td>)}<td style={td}><select value={entry.unit} onChange={(event) => update(entry.id, "unit", event.target.value as MeasurementBookEntry["unit"])} style={input}><option>m3</option><option>m2</option><option>m</option></select></td><td style={td}><input type="checkbox" checked={entry.isDeduction} onChange={(event) => update(entry.id, "isDeduction", event.target.checked)} aria-label="Deduction row" /></td><td style={{ ...td, color: entry.isDeduction ? "#fca5a5" : "#86efac", fontWeight: 800 }}>{quantity(entry).toFixed(3)}</td></tr>)}</tbody><tfoot><tr><td colSpan={8} style={{ ...td, textAlign: "right", fontWeight: 800 }}>Net measured quantity</td><td style={{ ...td, color: "#67e8f9", fontWeight: 900 }}>{total.toFixed(3)}</td></tr></tfoot></table></div><section style={signature}><label style={checkLabel}><input type="checkbox" checked={jointlyVerified} onChange={(event) => setJointlyVerified(event.target.checked)} /> Contractor Site Engineer verification complete</label><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button type="button" disabled={!jointlyVerified} onClick={async () => { await stamp(); setMessage(`Consultant / PMC QS stamp applied to ${entries.length} measurement rows.`); }} style={{ ...button, opacity: jointlyVerified ? 1 : .45 }}>Apply Consultant / PMC QS stamp</button><button type="button" disabled={!jointlyVerified || !entries.every((entry) => entry.consultantStamp)} onClick={async () => { const saved = await persistEntries(entries); setMessage(`Approved ${saved.reduce((sum, entry) => sum + quantity(entry), 0).toFixed(3)} ${saved[0]?.unit ?? "m3"} pushed to RA Bill / IPC claim lines.`); }} style={{ ...primary, opacity: jointlyVerified && entries.every((entry) => entry.consultantStamp) ? 1 : .45 }}>Push to RA / IPC claim</button></div>{message ? <div style={messageStyle}>{message}</div> : null}</section></div>;
}

const toolbar: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }; const eyebrow: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 800 }; const title: React.CSSProperties = { margin: "7px 0 0", fontSize: 22 }; const button: React.CSSProperties = { border: "1px solid #334155", borderRadius: 8, background: "transparent", color: "#cbd5e1", padding: "9px 11px", fontWeight: 800, cursor: "pointer" }; const primary: React.CSSProperties = { ...button, border: 0, background: "#34d399", color: "#052e16" }; const tableWrap: React.CSSProperties = { overflowX: "auto", border: "1px solid #1e293b", borderRadius: 12 }; const table: React.CSSProperties = { width: "100%", minWidth: 980, borderCollapse: "collapse" }; const th: React.CSSProperties = { padding: 11, textAlign: "left", color: "#94a3b8", fontSize: 10, textTransform: "uppercase", borderBottom: "1px solid #263449" }; const td: React.CSSProperties = { padding: 9, borderBottom: "1px solid #1f2937", fontSize: 12, verticalAlign: "middle" }; const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, color: "#f8fafc", padding: 7 }; const numberInput: React.CSSProperties = { ...input, width: 70 }; const signature: React.CSSProperties = { display: "grid", gap: 13, padding: 15, background: "#0f172a", border: "1px solid #263449", borderRadius: 10 }; const checkLabel: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", color: "#cbd5e1", fontSize: 12 }; const messageStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: 8, background: "#052e16", border: "1px solid #14532d", color: "#bbf7d0", fontSize: 12, fontWeight: 700 };
