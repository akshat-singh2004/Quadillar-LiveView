"use client";

import { useMemo, useState } from "react";
import type { CdeItem, RfiRecord } from "@/types/construction";

interface DrawingValidatorProps {
  drawing: CdeItem | null;
}

function formatValue(value: string | undefined, fallback: string) {
  return value && value.trim() ? value : fallback;
}

export function DrawingValidator({ drawing }: DrawingValidatorProps) {
  const [showRfiForm, setShowRfiForm] = useState(false);
  const [discipline, setDiscipline] = useState("Structural");
  const [queryText, setQueryText] = useState("");

  const status = useMemo(() => {
    if (!drawing) {
      return {
        isApproved: false,
        badge: "DRAWING NOT FOUND",
        tone: "red",
      };
    }

    if (drawing.state === "Published" && drawing.isLatest) {
      return {
        isApproved: true,
        badge: "VERIFIED GFC (Good For Construction / Site-Ready)",
        tone: "green",
      };
    }

    return {
      isApproved: false,
      badge: "STOP WORK — SUPERSEDED / UNAPPROVED DRAWING",
      tone: "red",
    };
  }, [drawing]);

  const activeGfc = useMemo(() => {
    if (!drawing) return "N/A";
    return drawing.state === "Published" && drawing.isLatest ? `Rev ${drawing.revision}` : `Rev ${drawing.revision} (superseded)`;
  }, [drawing]);

  const handleSubmit = () => {
    const payload: Partial<RfiRecord> = {
      id: `rfi-${Date.now()}`,
      title: `Field query on ${drawing?.title ?? "drawing"}`,
      description: queryText || `Request clarification for drawing ${drawing?.id ?? "drawing"}.`,
      submittedBy: "Field Engineer",
      currentOwner: discipline,
      ballInCourt: "Consultant",
      status: "Open",
      contractImpact: "None",
      riskScore: 52,
    };

    window.alert(
      `Site query raised for ${payload.title}.\n\nDiscipline: ${discipline}\nDrawing: ${drawing?.title ?? "N/A"}\n\n${payload.description}`,
    );
    console.info("Site query payload", payload);
    setShowRfiForm(false);
  };

  if (!drawing) {
    return (
      <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 20, padding: 24 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 26 }}>Drawing verification</h2>
        <div style={{ color: "#fca5a5", fontWeight: 700 }}>No drawing found for this ID.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div
        style={{
          background: status.tone === "green" ? "#052e16" : "#3f0b0b",
          border: `1px solid ${status.tone === "green" ? "#16a34a" : "#ef4444"}`,
          borderRadius: 16,
          padding: "18px 20px",
          color: status.tone === "green" ? "#bbf7d0" : "#fecaca",
          fontWeight: 800,
          fontSize: 18,
          textAlign: "center",
        }}
      >
        {status.badge}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 14, padding: 14 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" }}>Drawing</div>
          <div style={{ marginTop: 8, fontWeight: 700 }}>{drawing.title}</div>
        </div>
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 14, padding: 14 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" }}>Authorized revision</div>
          <div style={{ marginTop: 8, fontWeight: 700 }}>Rev {drawing.revision}</div>
        </div>
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 14, padding: 14 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" }}>Approval timestamp</div>
          <div style={{ marginTop: 8, fontWeight: 700 }}>{new Date(drawing.updatedAt).toLocaleString("en-IN")}</div>
        </div>
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 14, padding: 14 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" }}>Trade discipline</div>
          <div style={{ marginTop: 8, fontWeight: 700 }}>{formatValue((drawing.metadata as { discipline?: string } | undefined)?.discipline, "General")}</div>
        </div>
      </div>

      <div
        style={{
          background: status.tone === "green" ? "#022c22" : "#450a0a",
          border: `1px solid ${status.tone === "green" ? "#10b981" : "#ef4444"}`,
          borderRadius: 14,
          padding: 16,
          color: status.tone === "green" ? "#d1fae5" : "#fecaca",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{status.isApproved ? "Site execution permitted." : "Execution prohibited until approved revision is issued."}</div>
        <div>{status.isApproved ? `Active GFC revision is ${activeGfc}.` : `Active GFC revision is ${activeGfc}; this drawing is not cleared for execution.`}</div>
      </div>

      <button
        type="button"
        onClick={() => setShowRfiForm((current) => !current)}
        style={{
          background: "#f59e0b",
          color: "#111827",
          border: "none",
          borderRadius: 12,
          padding: "12px 16px",
          cursor: "pointer",
          fontWeight: 800,
        }}
      >
        Report Field Query on this Drawing
      </button>

      {showRfiForm && (
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 16, padding: 18 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Site Query (RFI)</div>

          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ color: "#cbd5e1", fontWeight: 600 }}>Drawing number</span>
              <input
                value={drawing.id}
                readOnly
                style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", color: "#e2e8f0" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ color: "#cbd5e1", fontWeight: 600 }}>Discipline</span>
              <select
                value={discipline}
                onChange={(event) => setDiscipline(event.target.value)}
                style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", color: "#e2e8f0" }}
              >
                <option value="Structural">Structural</option>
                <option value="MEP">MEP</option>
                <option value="Architectural">Architectural</option>
                <option value="Civil">Civil</option>
                <option value="Facade">Facade</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ color: "#cbd5e1", fontWeight: 600 }}>Query / clarification</span>
              <textarea
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                rows={5}
                placeholder="Describe the field issue or coordination query related to this drawing."
                style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", color: "#e2e8f0", resize: "vertical" }}
              />
            </label>

            <button
              type="button"
              onClick={handleSubmit}
              style={{
                background: "#22c55e",
                color: "#052e16",
                border: "none",
                borderRadius: 10,
                padding: "12px 16px",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Raise Site Query
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
