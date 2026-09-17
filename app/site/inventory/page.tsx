import { fetchMaterialInwardRecords } from "@/app/lib/services";
import { MaterialInwardTable } from "@/components/site/MaterialInwardTable";

export default async function SiteInventoryPage() {
  const records = await fetchMaterialInwardRecords("proj-1");

  return (
    <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 28 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 24 }}>
        <header><div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>Quadillar LiveView / Site Stores</div><h1 style={{ margin: "10px 0 0", fontSize: 40, letterSpacing: "-0.04em" }}>Material Inward Register</h1><p style={{ margin: "10px 0 0", color: "#94a3b8" }}>Track deliveries, quality gates, and certificate evidence at the point of receipt.</p></header>
        <section style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 22, padding: 20 }}><MaterialInwardTable initialRecords={records} /></section>
      </div>
    </main>
  );
}
