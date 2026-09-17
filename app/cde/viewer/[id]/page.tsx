import { DrawingMarkupViewer } from "@/components/cde/DrawingMarkupViewer";
import { fetchCdeItems } from "@/app/lib/services";

export default async function CdeViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const items = await fetchCdeItems("proj-1");
  const drawing = items.find((item) => item.id === id) ?? items[0] ?? null;

  return (
    <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 28 }}>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>CDE / GFC Viewer</div>
          <h1 style={{ margin: 0, fontSize: 38, letterSpacing: "-0.04em" }}>Interactive spatial markup viewer</h1>
        </header>

        <DrawingMarkupViewer drawing={drawing} />
      </div>
    </main>
  );
}
