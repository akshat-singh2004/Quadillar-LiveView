import { fetchDashboardSnapshot } from "@/app/lib/services";
import { generateProjectDocumentBundle } from "@/lib/export/documentGenerator";

export default async function DocumentsPage() {
  const snapshot = await fetchDashboardSnapshot("proj-1");
  const documents = await generateProjectDocumentBundle(snapshot);

  const documentCards = [
    { title: "AIA G704 Certificate of Substantial Completion", body: documents.g704 },
    { title: "AIA G702 / G703 Payment Certificate", body: documents.g702 },
    { title: "AIA G810 Transmittal Manifest", body: documents.g810 },
    { title: "Master Quality Dossier", body: documents.qualityDossier },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#f5f5f5", padding: 28 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <div style={{ color: "#d4d4d4", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>
            Statutory project documents
          </div>
          <h1 style={{ margin: 0, fontSize: 38, letterSpacing: "-0.04em" }}>Project document generator</h1>
        </header>

        <div style={{ display: "grid", gap: 20 }}>
          {documentCards.map((card) => (
            <section
              key={card.title}
              style={{
                background: "#0a0a0a",
                border: "1px solid #262626",
                borderRadius: 18,
                padding: 20,
              }}
            >
              <div style={{ color: "#f5f5f5", fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{card.title}</div>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  background: "#111111",
                  border: "1px solid #262626",
                  borderRadius: 12,
                  padding: 18,
                  color: "#e5e5e5",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  lineHeight: 1.75,
                }}
              >
                {card.body}
              </pre>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
