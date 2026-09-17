import { SiteGeospatialMap } from "@/components/gis/SiteGeospatialMap";

export default function GisPage() {
  return <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 28 }}><div style={{ maxWidth: 1400, margin: "0 auto" }}><header style={{ marginBottom: 24 }}><div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase" }}>Site intelligence / geospatial control</div><h1 style={{ margin: "8px 0 0", fontSize: 38 }}>GIS boundary & drone command view</h1><p style={{ color: "#94a3b8", margin: "9px 0 0" }}>Plot control, crane exclusion zones, and live field telemetry on one survey surface.</p></header><SiteGeospatialMap /></div></main>;
}