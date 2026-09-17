"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DrawingValidator } from "@/components/cde/DrawingValidator";
import { supabase } from "@/app/lib/supabase";
import type { CdeItem } from "@/types/construction";

export default function VerifyDrawingPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "cde-1";
  const [drawing, setDrawing] = useState<CdeItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data, error } = await supabase
        .from("cde_items")
        .select("*")
        .eq("id", id)
        .single();

      if (mounted) {
        setDrawing((data as CdeItem) ?? null);
        setLoading(false);
      }

      if (error) {
        console.warn("Verify page fetch failed:", error.message);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>
            Quadillar LiveView
          </div>
          <h1 style={{ margin: 0, fontSize: 36, letterSpacing: "-0.04em" }}>Field GFC verification & anti-rework check</h1>
        </div>

        {loading ? (
          <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 20, padding: 20 }}>
            Loading drawing status…
          </div>
        ) : (
          <DrawingValidator drawing={drawing} />
        )}
      </div>
    </main>
  );
}
