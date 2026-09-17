"use client";

import { VolumetricCutFillViewer } from "@/components/site/VolumetricCutFillViewer";

export default function DroneSurveysPage() {
  return <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: "42px 24px" }}><div style={{ maxWidth: 1400, margin: "0 auto" }}><header style={{ marginBottom: 24 }}><div style={{ color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700 }}>Site / drone photogrammetry</div><h1 style={{ margin: "8px 0 0", fontSize: 38 }}>Earthwork volumetrics console</h1><p style={{ color: "#94a3b8", margin: "8px 0 0" }}>Measure excavation, foundation fill, and stockpile mass from verified drone survey data.</p></header><VolumetricCutFillViewer /></div></main>;
}
