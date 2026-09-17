"use client";

import { CraneSlewRadar } from "@/components/site/CraneSlewRadar";

export default function CranesPage() { return <main style={page}><div style={shell}><header><div style={eyebrow}>Site safety / heavy rigging</div><h1 style={heading}>Tower crane slew radar</h1><p style={muted}>Live mast wind lockout, jib envelope proximity, hook load, and capacity utilization.</p></header><CraneSlewRadar /></div></main>; }
const page = { minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 28 }; const shell = { maxWidth: 1250, margin: "0 auto", display: "grid", gap: 20 }; const eyebrow = { color: "#7dd3fc", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase" as const }; const heading = { margin: "7px 0 0", fontSize: 40, letterSpacing: "-.04em" }; const muted = { color: "#94a3b8", fontSize: 13 };