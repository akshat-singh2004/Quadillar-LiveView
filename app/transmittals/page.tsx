"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchDashboardSnapshot } from "@/app/lib/services";
import { buildCertifiedTransmittalManifest, generateTransmittalRecord } from "@/lib/transmittal/engine";
import type { DashboardSnapshot, TransmittalRecord } from "@/types/construction";

export default function TransmittalsPage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>({
    cdeItems: [],
    rfis: [],
    rfcs: [],
    changeOrders: [],
    submittals: [],
    punchListItems: [],
    clashIssues: [],
    transmittals: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const data = await fetchDashboardSnapshot("proj-1");
      if (mounted) {
        setSnapshot(data);
        setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const transmittals = useMemo<TransmittalRecord[]>(() => {
    if (snapshot.transmittals?.length) return snapshot.transmittals;
    if (!snapshot.cdeItems.length) return [];

    return snapshot.cdeItems.slice(0, 2).map((item, index) => ({
      transmittalNumber: `TRN-${String(index + 1).padStart(3, "0")}`,
      projectId: item.projectId,
      issuingEntity: "General Contractor (GC) / Lead Consultant",
      recipientOrganization: "Authority Having Jurisdiction (AHJ) / Municipal Building Official",
      distributionMethod: "Project Portal",
      purpose: item.state === "Published" ? "For Construction / GFC" : "For Review",
      cdeItemId: item.id,
      revisionNumber: item.revision,
      fileHash: `sha256:${item.id}:${item.revision}`,
      uniclassCode: "EF_40_20_30",
      documentSet: [item.title, "Issue Summary", "Checklist"],
      distributedAt: item.updatedAt,
      distributedBy: "General Contractor (GC) / Lead Consultant",
      receiptConfirmed: true,
    }));
  }, [snapshot]);

  const handleGenerateManifest = async () => {
    const item = snapshot.cdeItems[0];
    if (!item) return;
    const record = await generateTransmittalRecord(item, {
      issuingEntity: "General Contractor (GC) / Lead Consultant",
      recipientOrganization: "Authority Having Jurisdiction (AHJ) / Municipal Building Official",
      distributionMethod: "Project Portal",
      purpose: "For Construction / GFC",
      documentSet: [item.title, "Drawing Register", "Review Checklist"],
      uniclassCode: "EF_40_20_30",
      distributedBy: "General Contractor (GC) / Lead Consultant",
      notes: "Certified transmittal for statutory approval pack.",
    });

    const manifest = buildCertifiedTransmittalManifest(record);
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${record.transmittalNumber}-manifest.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", display: "grid", placeItems: "center" }}>
        Loading formal transmittal ledger…
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 28 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>
            Quadillar LiveView
          </div>
          <h1 style={{ margin: 0, fontSize: 38, letterSpacing: "-0.04em" }}>Formal Transmittal Ledger</h1>
        </header>

        <section style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => void handleGenerateManifest()}
            style={{
              background: "#22c55e",
              color: "#042f2e",
              border: "none",
              borderRadius: 12,
              padding: "12px 16px",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Generate Certified Transmittal PDF / Manifest
          </button>
        </section>

        <div style={{ display: "grid", gap: 16 }}>
          {transmittals.map((record) => (
            <article key={record.transmittalNumber} style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 20, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <div>
                  <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>Transmittal</div>
                  <h2 style={{ margin: "8px 0 0", fontSize: 24 }}>{record.transmittalNumber}</h2>
                </div>
                <span style={{ background: "#1e293b", borderRadius: 999, padding: "6px 10px", color: "#dbeafe" }}>{record.purpose}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <div style={{ background: "#111827", borderRadius: 12, padding: 12 }}>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>Issuing Entity</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{record.issuingEntity}</div>
                </div>
                <div style={{ background: "#111827", borderRadius: 12, padding: 12 }}>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>Recipient Organization</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{record.recipientOrganization}</div>
                </div>
                <div style={{ background: "#111827", borderRadius: 12, padding: 12 }}>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>Distribution Method</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{record.distributionMethod}</div>
                </div>
                <div style={{ background: "#111827", borderRadius: 12, padding: 12 }}>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>Revision</div>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>Rev {record.revisionNumber}</div>
                </div>
              </div>

              <div style={{ marginTop: 18, background: "#111827", borderRadius: 12, padding: 14 }}>
                <div style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Document set</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {record.documentSet.map((doc) => (
                    <span key={`${record.transmittalNumber}-${doc}`} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 999, padding: "6px 10px", fontSize: 12, color: "#dbeafe" }}>{doc}</span>
                  ))}
                </div>
                <div style={{ marginTop: 12, color: "#dbeafe" }}>
                  <strong>Uniclass</strong>: {record.uniclassCode}
                </div>
                <div style={{ marginTop: 8, color: "#dbeafe" }}>
                  <strong>SHA-256</strong>: {record.fileHash}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
