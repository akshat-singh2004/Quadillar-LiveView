"use client";

import { WasteDiversionTracker } from "@/components/sustainability/WasteDiversionTracker";

export default function WastePage() { return <main style={page}><div style={shell}><header><div style={eyebrow}>Sustainability / circular construction</div><h1 style={heading}>C&D waste diversion manager</h1><p style={muted}>Capture weighbridge-backed manifests and protect IGBC / LEED landfill diversion credits.</p></header><WasteDiversionTracker /></div></main>; }
const page = { minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 28 }; const shell = { maxWidth: 1180, margin: "0 auto", display: "grid", gap: 20 }; const eyebrow = { color: "#7dd3fc", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase" as const }; const heading = { margin: "7px 0 0", fontSize: 40, letterSpacing: "-.04em" }; const muted = { color: "#94a3b8", fontSize: 13 };