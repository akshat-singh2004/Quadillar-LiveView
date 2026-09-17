"use client";

import { VisionDefectCanvas } from "@/components/quality/VisionDefectCanvas";

export default function VisionAiPage() {
  return <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: "42px 24px" }}><div style={{ maxWidth: 1400, margin: "0 auto" }}><header style={{ marginBottom: 24 }}><div style={{ color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700 }}>Quality / computer vision AI</div><h1 style={{ margin: "8px 0 0", fontSize: 38 }}>Visual quality command console</h1><p style={{ color: "#94a3b8", margin: "8px 0 0" }}>Review detected site hazards, validate confidence, and route verified defects into the project punch list.</p></header><VisionDefectCanvas /></div></main>;
}
