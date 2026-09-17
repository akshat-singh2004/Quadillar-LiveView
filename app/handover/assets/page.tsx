import { fetchFacilityAssets } from "@/app/lib/services";
import { AssetRegisterTable } from "@/components/handover/AssetRegisterTable";

export default async function AssetHandoverPage() {
  const assets = await fetchFacilityAssets("proj-1");
  return <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 28 }}><div style={{ maxWidth: 1450, margin: "0 auto", display: "grid", gap: 22 }}><header><div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>Quadillar LiveView / Handover</div><h1 style={{ margin: "8px 0 0", fontSize: 40 }}>Facility Asset Register & As-Built Handover</h1><p style={{ margin: "10px 0 0", color: "#94a3b8" }}>Commissioning evidence, O&M manuals, warranty windows, and vendor accountability.</p></header><section style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 22, padding: 20 }}><AssetRegisterTable initialAssets={assets} /></section></div></main>;
}
