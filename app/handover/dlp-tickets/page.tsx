"use client";
/* eslint-disable react-hooks/purity */

import { useEffect, useState } from "react";
import { DLPServiceModal } from "@/components/handover/DLPServiceModal";
import type { DlpTicketPriority, DlpWarrantyTicket } from "@/types/construction";

const hours = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
const initialTickets: DlpWarrantyTicket[] = [
  { id: "DLP-1042", unitRef: "North Tower / A-1204", category: "Waterproofing", priority: "Emergency", status: "Assigned", description: "Active seepage at master bedroom window sill", subcontractor: "AquaShield Systems", openedAt: hours(-0.4), dueAt: hours(0.6), disputedRepairCost: 18500 },
  { id: "DLP-1038", unitRef: "Podium / Retail 07", category: "MEP services", priority: "Urgent", status: "Awaiting Occupant Verification", description: "FCU condensate drain backing up", subcontractor: "VoltEdge MEP", openedAt: hours(-1.8), dueAt: hours(0.2), disputedRepairCost: 9200 },
  { id: "DLP-1021", unitRef: "South Tower / B-0803", category: "Civil finishes", priority: "Routine", status: "Resolved", description: "Hairline tile grout cracks at entrance", subcontractor: "FinishLine Works", openedAt: hours(-6), dueAt: hours(1), occupantVerifiedAt: hours(-.1) },
];

let liveNow = new Date().getTime();
function remaining(dueAt: string, now = liveNow) { const total = Math.max(0, new Date(dueAt).getTime() - now); return `${Math.floor(total / 3600000)}h ${Math.floor((total % 3600000) / 60000)}m`; }
function priorityColor(priority: DlpTicketPriority) { return priority === "Emergency" ? "#f87171" : priority === "Urgent" ? "#fbbf24" : "#60a5fa"; }

export default function DlpTicketsPage() {
  const [tickets, setTickets] = useState(initialTickets);
  const [selected, setSelected] = useState<DlpWarrantyTicket | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => { liveNow = Date.now(); tick((value) => value + 1); }, 30000); return () => window.clearInterval(timer); }, []);
  const update = (ticket: DlpWarrantyTicket) => { setTickets((current) => current.map((item) => item.id === ticket.id ? ticket : item)); setSelected(null); };
  const resolved = tickets.filter((ticket) => ticket.status === "Resolved").length;
  return <main style={page}><div style={shell}><header><div style={eyebrow}>Quadillar LiveView / handover</div><h1 style={heading}>DLP tenant warranty service desk</h1><p style={muted}>Coordinate defect rectification across facility managers, occupants, and trade partners.</p></header><section style={stats}><div><span>Open tickets</span><strong>{tickets.length - resolved}</strong></div><div><span>Resolution rate</span><strong style={{ color: "#34d399" }}>{Math.round((resolved / tickets.length) * 100)}%</strong></div><div><span>At SLA risk</span><strong style={{ color: "#f87171" }}>{tickets.filter((ticket) => new Date(ticket.dueAt).getTime() < Date.now() + 86400000 && ticket.status !== "Resolved").length}</strong></div></section><section style={panel}><div style={eyebrow}>Warranty queue / live countdown</div><div style={list}>{tickets.map((ticket) => <button type="button" key={ticket.id} onClick={() => setSelected(ticket)} style={row}><div><strong>{ticket.id} · {ticket.unitRef}</strong><div style={small}>{ticket.category} · {ticket.subcontractor}</div><div style={{ ...small, color: ticket.status === "Resolved" ? "#86efac" : "#cbd5e1" }}>{ticket.status}</div></div><div style={right}><span style={{ ...badge, color: priorityColor(ticket.priority) }}>{ticket.priority} {ticket.priority === "Emergency" ? "(24-Hour SLA)" : ticket.priority === "Urgent" ? "(48-Hour SLA)" : "(7-Day SLA)"}</span><span style={countdown}>{ticket.status === "Resolved" ? "Verified" : remaining(ticket.dueAt)}</span></div></button>)}</div></section></div><DLPServiceModal ticket={selected} onClose={() => setSelected(null)} onUpdated={update} /></main>;
}

const page = { minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 28 };
const shell = { maxWidth: 1180, margin: "0 auto", display: "grid", gap: 20 };
const eyebrow = { color: "#7dd3fc", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase" as const };
const heading = { margin: "7px 0 0", fontSize: 40, letterSpacing: "-.04em" };
const muted = { color: "#94a3b8", fontSize: 13, lineHeight: 1.5 };
const stats = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 1, background: "#1e293b", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" as const };
const panel = { background: "#0b1220", border: "1px solid #1e293b", borderRadius: 18, padding: 20 };
const list = { display: "grid", gap: 10, marginTop: 16 };
const row = { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, textAlign: "left" as const, background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 16, color: "#e2e8f0", cursor: "pointer" };
const small = { marginTop: 6, color: "#94a3b8", fontSize: 12 };
const right = { display: "grid", justifyItems: "end", gap: 8 };
const badge = { borderRadius: 999, background: "rgba(255,255,255,.06)", padding: "7px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const };
const countdown = { color: "#f8fafc", fontSize: 12, fontFamily: "monospace" };
