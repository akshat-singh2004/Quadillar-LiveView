"use client";

import { useState } from "react";
import type { AlertDispatchRecord } from "@/types/construction";

const initialDispatches: AlertDispatchRecord[] = [
  { id: "dispatch-01", projectId: "proj-1", triggeredAt: "2026-08-25T08:45:00Z", alertTitle: "Crane wind threshold", message: "Wind exceeded safe crane operating threshold.", channel: "WhatsApp", recipient: "+91 98xxx 22104", recipientRole: "Site Supervisor", status: "Delivered", gatewayReference: "twilio-wa-9021" },
  { id: "dispatch-02", projectId: "proj-1", triggeredAt: "2026-08-25T08:18:00Z", alertTitle: "Restricted weather ops", message: "Suspend facade activity pending weather review.", channel: "SMS", recipient: "+91 98xxx 88210", recipientRole: "Safety Officer", status: "Delivered", gatewayReference: "twilio-sms-7718" },
  { id: "dispatch-03", projectId: "proj-1", triggeredAt: "2026-08-25T07:52:00Z", alertTitle: "Permit expiry warning", message: "Hot work permit expires in 30 minutes.", channel: "Email", recipient: "safety@contractor.example", recipientRole: "HSE Manager", status: "Failed", gatewayReference: "sendgrid-err-410" },
];

export function AlertDispatchTable() {
  const [dispatches, setDispatches] = useState(initialDispatches);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [config, setConfig] = useState({ mapbox: "", sendgrid: "", twilioSid: "", twilioToken: "", twilioFrom: "" });
  const testBroadcast = () => { setBusy(true); setMessage(""); window.setTimeout(() => { setDispatches((current) => [{ id: `dispatch-${Date.now()}`, projectId: "proj-1", triggeredAt: new Date().toISOString(), alertTitle: "Test emergency safety broadcast", message: "SIMULATION: Emergency muster broadcast to site supervisors.", channel: "WhatsApp", recipient: "+91 98xxx 22104", recipientRole: "Site Supervisor", status: "Delivered", gatewayReference: "simulated-twilio-wa" }, ...current]); setBusy(false); setMessage("Simulated WhatsApp broadcast delivered to site supervisors."); }, 500); };
  const update = (key: keyof typeof config, value: string) => setConfig((current) => ({ ...current, [key]: value }));

  return <div style={{ display: "grid", gap: 18 }}><section style={configPanel}><div><div style={eyebrowStyle}>Gateway credentials</div><h2 style={sectionTitle}>External channel integrations</h2></div><div style={configGrid}>{(["mapbox", "sendgrid", "twilioSid", "twilioToken", "twilioFrom"] as const).map((key) => <label key={key} style={labelStyle}>{key === "mapbox" ? "Mapbox access token" : key === "sendgrid" ? "SendGrid API key" : key === "twilioSid" ? "Twilio account SID" : key === "twilioToken" ? "Twilio auth token" : "Twilio WhatsApp / SMS sender"}<input type={key.includes("Token") || key === "sendgrid" || key === "mapbox" ? "password" : "text"} value={config[key]} onChange={(event) => update(key, event.target.value)} placeholder="Configured via environment in production" style={inputStyle} /></label>)}</div><div style={helperStyle}>Credentials are held in local form state for this console. Production dispatch should resolve them from encrypted environment secrets.</div></section><section style={configPanel}><div style={tableHeader}><div><div style={eyebrowStyle}>Webhook / gateway activity</div><h2 style={sectionTitle}>External alerts activity</h2></div><button type="button" onClick={testBroadcast} disabled={busy} style={{ ...primaryButton, opacity: busy ? .6 : 1 }}>{busy ? "Dispatching..." : "Send test emergency safety broadcast"}</button></div><div style={{ overflowX: "auto", marginTop: 16 }}><table style={tableStyle}><thead><tr>{["Triggered", "Alert", "Channel", "Recipient role", "Gateway status"].map((heading) => <th key={heading} style={thStyle}>{heading}</th>)}</tr></thead><tbody>{dispatches.map((dispatch) => <tr key={dispatch.id}><td style={tdStyle}>{new Date(dispatch.triggeredAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td><td style={tdStyle}><strong>{dispatch.alertTitle}</strong><div style={subtleStyle}>{dispatch.message}</div></td><td style={tdStyle}>{dispatch.channel}</td><td style={tdStyle}>{dispatch.recipientRole}<div style={subtleStyle}>{dispatch.recipient}</div></td><td style={tdStyle}><span style={{ ...badgeStyle, color: dispatch.status === "Delivered" ? "#86efac" : "#fca5a5", borderColor: dispatch.status === "Delivered" ? "#166534" : "#7f1d1d", background: dispatch.status === "Delivered" ? "#052e1633" : "#450a0a33" }}>{dispatch.status}</span></td></tr>)}</tbody></table></div>{message && <div style={{ marginTop: 14, color: "#86efac", fontSize: 12 }}>{message}</div>}</section></div>;
}

const configPanel: React.CSSProperties = { background: "#0b1220", border: "1px solid #1e293b", borderRadius: 16, padding: 20 };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 800 };
const sectionTitle: React.CSSProperties = { margin: "7px 0 0", fontSize: 22 };
const configGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 18 };
const labelStyle: React.CSSProperties = { display: "grid", gap: 6, color: "#cbd5e1", fontSize: 12 };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "#111827", color: "#f8fafc", border: "1px solid #334155", borderRadius: 8, padding: 10 };
const helperStyle: React.CSSProperties = { marginTop: 14, color: "#64748b", fontSize: 11 };
const tableHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" };
const primaryButton: React.CSSProperties = { border: 0, borderRadius: 9, background: "#f59e0b", color: "#111827", padding: "10px 14px", fontWeight: 900, cursor: "pointer" };
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", minWidth: 700 };
const thStyle: React.CSSProperties = { textAlign: "left", color: "#64748b", borderBottom: "1px solid #263449", padding: "10px 12px", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase" };
const tdStyle: React.CSSProperties = { borderBottom: "1px solid #1f2937", padding: "13px 12px", color: "#e2e8f0", fontSize: 12, verticalAlign: "top" };
const subtleStyle: React.CSSProperties = { color: "#64748b", fontSize: 11, marginTop: 4 };
const badgeStyle: React.CSSProperties = { display: "inline-block", border: "1px solid", borderRadius: 999, padding: "5px 8px", fontSize: 10, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" };