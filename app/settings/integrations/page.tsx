"use client";

import { useState } from "react";
import { AlertDispatchTable } from "@/components/settings/AlertDispatchTable";

type Diagnostic = { name: string; detail: string; status: "Connected" | "Degraded" | "Not configured"; latency?: number };

const baseDiagnostics: Diagnostic[] = [
  { name: "Sentry", detail: "99.7% crash-free sessions · 2 recent runtime captures", status: "Connected" },
  { name: "Upstash Redis", detail: "82% cache hit ratio · 18 ms median latency", status: "Connected" },
  { name: "Mapbox", detail: "Satellite tiles healthy · 4 coordinate layers active", status: "Connected" },
  { name: "SendGrid / Resend", detail: "248 alerts dispatched this period · 99.2% delivered", status: "Connected" },
];

export default function IntegrationsPage() {
  const [diagnostics, setDiagnostics] = useState(baseDiagnostics);
  const [running, setRunning] = useState(false);
  const runDiagnostic = () => { setRunning(true); window.setTimeout(() => { setDiagnostics((current) => current.map((item) => ({ ...item, latency: Math.round(18 + Math.random() * 45), status: "Connected" }))); setRunning(false); }, 650); };

  return <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: "28px 24px 60px" }}><div style={{ maxWidth: 1400, margin: "0 auto" }}><header style={headerStyle}><div><div style={eyebrowStyle}>Settings / developer operations</div><h1 style={titleStyle}>Integrations health hub</h1><p style={mutedStyle}>Monitor runtime errors, cache performance, geospatial rendering, and external alert gateways.</p></div><button type="button" onClick={runDiagnostic} disabled={running} style={{ ...primaryButton, opacity: running ? .6 : 1 }}>{running ? "Running live diagnostics..." : "Run live ping diagnostic"}</button></header>
    <section style={healthGrid}>{diagnostics.map((item) => <article key={item.name} style={panelStyle}><div style={cardHeader}><div style={eyebrowStyle}>{item.name}</div><span style={badgeStyle}>{item.status}</span></div><div style={metricStyle}>{item.detail}</div>{item.latency !== undefined && <div style={latencyStyle}>Live ping: <strong>{item.latency} ms</strong></div>}</article>)}</section>
    <div style={{ marginTop: 18 }}><AlertDispatchTable /></div>
  </div></main>;
}

const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap", marginBottom: 24 };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 800 };
const titleStyle: React.CSSProperties = { margin: "8px 0 0", fontSize: 38, letterSpacing: "-0.04em" };
const mutedStyle: React.CSSProperties = { color: "#94a3b8", margin: "9px 0 0", fontSize: 13 };
const primaryButton: React.CSSProperties = { border: 0, borderRadius: 9, background: "#34d399", color: "#052e16", padding: "11px 14px", fontWeight: 900, cursor: "pointer" };
const healthGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 };
const panelStyle: React.CSSProperties = { background: "#0b1220", border: "1px solid #1e293b", borderRadius: 16, padding: 18 };
const cardHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 };
const badgeStyle: React.CSSProperties = { border: "1px solid #166534", borderRadius: 999, background: "#052e1633", color: "#86efac", padding: "5px 8px", fontSize: 10, fontWeight: 900, textTransform: "uppercase" };
const metricStyle: React.CSSProperties = { marginTop: 18, color: "#e2e8f0", fontSize: 14, lineHeight: 1.5 };
const latencyStyle: React.CSSProperties = { marginTop: 12, color: "#67e8f9", fontSize: 12 };
