"use client";

import { useMemo, useState } from "react";
import type {
  ContractClauseCard,
  ContractComplianceIssue,
  ContractDocumentAnalysis,
} from "@/types/construction";

const defaultAnalyses: ContractDocumentAnalysis[] = [
  {
    id: "contract-01",
    documentName: "Main Works Contract - Tender Bundle",
    uploadedAt: "2026-08-23",
    pdfLabel: "C-01 / Main Contract",
    pageCount: 118,
    clauses: [
      {
        id: "clause-ld",
        type: "Liquidated Damages",
        severity: "High Risk",
        summary:
          "LD clause imposes 0.15% of contract value per week beyond the agreed completion date without a clear cap for owner-caused delay events.",
        riskDriver: "Uncapped delay damages and weak force-majeure carve-out",
        mitigation: "Add a mutual carve-out for client-caused approvals, utility delays, and weather disruption; cap damage at 5% of the contract sum.",
      },
      {
        id: "clause-defect",
        type: "Defect Liability",
        severity: "Medium Risk",
        summary:
          "Defect liability period is set at 12 months, but the rectification notice period and carrier-of-risk allocation are not explicit.",
        riskDriver: "Ambiguous defect notification and warranty enforcement",
        mitigation: "Define notice timelines, access rights, and warranty defect categorization in a schedule attached to the contract.",
      },
      {
        id: "clause-price",
        type: "Price Escalation",
        severity: "Standard",
        summary:
          "Escalation is linked to WPI and fuel indices with a base-index confirmation, but the submission trigger is not tied to a material availability event.",
        riskDriver: "Index methodology is acceptable but not fully aligned with market volatility",
        mitigation: "Tie escalation to a monthly review and define documentation requirements for claims substantiation.",
      },
      {
        id: "clause-force",
        type: "Force Majeure",
        severity: "Standard",
        summary:
          "Force majeure includes pandemics and government action but excludes labor shortage and material supply disruption unless specifically notified.",
        riskDriver: "Narrow event definition for supply chain disruptions",
        mitigation: "Expand the list of covered events to include supply-chain disruption, import restrictions, and labor unrest.",
      },
    ],
    complianceChecks: [
      {
        id: "compliance-01",
        standard: "IS 456",
        subject: "Concrete cover / durability",
        status: "Mismatch",
        issue:
          "Tender specification states nominal cover of 25 mm for slabs, while IS 456 requires 30 mm for severe exposure / RC element durability in coastal environment.",
        recommendation: "Update drawing specification and concrete mix durability note to match IS 456 Table 16 / Table 18 for severe exposure.",
      },
      {
        id: "compliance-02",
        standard: "NBC",
        subject: "Fire resistance ratings",
        status: "Pass",
        issue: "Fire rating schedule aligns with NBC Part 4 requirements for exit corridors and shafts.",
        recommendation: "Retain current rating schedule and verify final door fire seals during site inspection.",
      },
    ],
  },
  {
    id: "contract-02",
    documentName: "Tender Specification - Civil & Structure",
    uploadedAt: "2026-08-20",
    pdfLabel: "C-02 / Technical Specs",
    pageCount: 64,
    clauses: [
      {
        id: "clause-ld-2",
        type: "Liquidated Damages",
        severity: "Medium Risk",
        summary:
          "Delay damages are stated but not linked to a milestone-based liquidated damages schedule, creating a dispute risk during partial handed-over areas.",
        riskDriver: "Schedule logic is incomplete for staged completion",
        mitigation: "Add milestone-specific delay damage schedule and extension-of-time process map.",
      },
      {
        id: "clause-price-2",
        type: "Price Escalation",
        severity: "High Risk",
        summary:
          "Steel escalation is capped at 12% and absent for imported reinforcement, which may leave the contractor exposed to global market volatility.",
        riskDriver: "Insufficient protection against imported commodities and FX fluctuation",
        mitigation: "Revisit the steel and aluminum escalation formula with explicit foreign-exchange and freight adjustment clauses.",
      },
    ],
    complianceChecks: [
      {
        id: "compliance-03",
        standard: "IS 456",
        subject: "Concrete grade and cover",
        status: "Mismatch",
        issue:
          "Tender specifies M25 concrete at a 20 mm cover for the water tank retaining wall, contrary to IS 456 durability recommendations for moisture-exposed concrete.",
        recommendation: "Raise cover to 30 mm and confirm concrete grade adequacy against exposure class.",
      },
    ],
  },
];

const severityStyle: Record<ContractClauseCard["severity"], { border: string; badge: string; glow: string }> = {
  "High Risk": { border: "1px solid rgba(248, 113, 113, 0.8)", badge: "#fda4af", glow: "rgba(239, 68, 68, 0.18)" },
  "Medium Risk": { border: "1px solid rgba(251, 191, 36, 0.8)", badge: "#fbbf24", glow: "rgba(245, 158, 11, 0.18)" },
  Standard: { border: "1px solid rgba(52, 211, 153, 0.8)", badge: "#6ee7b7", glow: "rgba(16, 185, 129, 0.18)" },
};

function getRiskSummary(selected: ContractDocumentAnalysis) {
  const counts: Record<ContractClauseCard["severity"], number> = {
    "High Risk": 0,
    "Medium Risk": 0,
    Standard: 0,
  };

  selected.clauses.forEach((clause: ContractClauseCard) => {
    counts[clause.severity] += 1;
  });

  return {
    highest: selected.clauses.reduce<ContractClauseCard | undefined>((top, clause) => {
      if (!top || clause.severity === "High Risk") return clause;
      if (top.severity === "Standard" && clause.severity === "Medium Risk") return clause;
      return top;
    }, undefined),
    counts,
  };
}

export function DocumentClauseViewer({ analyses = defaultAnalyses }: { analyses?: ContractDocumentAnalysis[] }) {
  const [selectedId, setSelectedId] = useState(analyses[0]?.id ?? defaultAnalyses[0].id);
  const [reportVisible, setReportVisible] = useState(false);

  const selected = useMemo(
    () => analyses.find((document) => document.id === selectedId) ?? analyses[0] ?? defaultAnalyses[0],
    [analyses, selectedId],
  );

  const summary = useMemo(() => getRiskSummary(selected), [selected]);

  const complianceFlagCount = selected.complianceChecks.filter((check: ContractComplianceIssue) => check.status === "Mismatch").length;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {analyses.map((document) => (
            <button
              key={document.id}
              type="button"
              onClick={() => setSelectedId(document.id)}
              style={{
                background: selectedId === document.id ? "rgba(56, 189, 248, 0.18)" : "rgba(15, 23, 42, 0.8)",
                border: selectedId === document.id ? "1px solid rgba(56, 189, 248, 0.8)" : "1px solid rgba(148,163,184,0.24)",
                color: "#e2e8f0",
                borderRadius: 999,
                padding: "8px 12px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {document.pdfLabel}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setReportVisible(true)}
          style={{
            background: "linear-gradient(135deg, #f97316, #ef4444)",
            border: "none",
            color: "white",
            borderRadius: 12,
            padding: "10px 16px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Generate Contract Risk Matrix
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 0.95fr) minmax(320px, 1.25fr)", gap: 18 }}>
        <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.24)", borderRadius: 20, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>Document preview</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{selected.documentName}</div>
            </div>
            <div style={{ color: "#cbd5e1", fontSize: 12 }}>Pages: {selected.pageCount}</div>
          </div>

          <div style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(15,23,42,0.75))", border: "1px solid rgba(148,163,184,0.22)", borderRadius: 18, minHeight: 440, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#94a3b8", marginBottom: 12 }}>
              <span>{selected.pdfLabel}</span>
              <span>{selected.uploadedAt}</span>
            </div>

            <div style={{ background: "rgba(2,6,23,0.7)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 14, padding: 18, minHeight: 340 }}>
              <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 12, color: "#f8fafc" }}>Main Contract</div>
              <div style={{ display: "grid", gap: 8, color: "#cbd5e1", lineHeight: 1.7 }}>
                <div>Clause 4.1 — Time for Completion</div>
                <div>Clause 7.2 — Defects and Rectification</div>
                <div>Clause 10.1 — Liquidated Damages</div>
                <div>Clause 12.4 — Escalation & Change Control</div>
                <div>Annexure D — Technical Specification Schedule</div>
              </div>
              <div style={{ marginTop: 22, background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56,189,248,0.4)", borderRadius: 10, padding: 12, color: "#bae6fd" }}>
                Highlight: Non-standard LD cap and weak force majeure risk allocation are visible on page 48 and 92.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {selected.clauses.map((clause) => {
            const style = severityStyle[clause.severity];
            return (
              <div key={clause.id} style={{ background: "rgba(15,23,42,0.8)", border: style.border, boxShadow: `inset 0 0 0 1px ${style.glow}`, borderRadius: 16, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ fontWeight: 800, color: "#f8fafc" }}>{clause.type}</div>
                  <span
                    style={{
                      background: style.badge,
                      color: "#0f172a",
                      borderRadius: 999,
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {clause.severity}
                  </span>
                </div>

                <p style={{ margin: "12px 0 8px", color: "#e2e8f0", lineHeight: 1.7 }}>{clause.summary}</p>

                <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.7 }}>
                  <div><strong>Risk driver:</strong> {clause.riskDriver}</div>
                </div>

                {clause.severity === "High Risk" && (
                  <div style={{ marginTop: 12, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 10, padding: 10, color: "#fecaca" }}>
                    <strong>Mitigation:</strong> {clause.mitigation}
                  </div>
                )}

                {clause.severity === "Medium Risk" && (
                  <div style={{ marginTop: 12, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)", borderRadius: 10, padding: 10, color: "#fde68a" }}>
                    <strong>Mitigation:</strong> {clause.mitigation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18 }}>
        <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.24)", borderRadius: 18, padding: 18 }}>
          <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>IS Code / NBC Compliance validator</div>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {selected.complianceChecks.map((check) => (
              <ComplianceRow key={check.id} check={check} />
            ))}
          </div>
        </div>

        <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.24)", borderRadius: 18, padding: 18 }}>
          <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>Risk summary</div>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <RiskPill label="High Risk clauses" value={summary.counts["High Risk"]} tone="#f87171" />
            <RiskPill label="Medium Risk clauses" value={summary.counts["Medium Risk"]} tone="#fbbf24" />
            <RiskPill label="Standard clauses" value={summary.counts.Standard} tone="#34d399" />
            <RiskPill label="Code mismatches" value={complianceFlagCount} tone="#60a5fa" />
          </div>
        </div>
      </div>

      {reportVisible && (
        <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.24)", borderRadius: 18, padding: 18 }}>
          <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>Contract risk matrix</div>
          <div style={{ marginTop: 12, color: "#e2e8f0", lineHeight: 1.8 }}>
            <div><strong>Document:</strong> {selected.documentName}</div>
            <div><strong>Primary exposure:</strong> {summary.highest ? `${summary.highest.type} — ${summary.highest.severity}` : "No active issue"}</div>
            <div><strong>Top action:</strong> Cap LD exposure and revise concrete cover specification to match IS 456 / NBC durability tables.</div>
            <div><strong>Commercial watch:</strong> Maintain escalation log for steel and imported material claims, and add a formal EOT notice protocol.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ComplianceRow({ check }: { check: ContractComplianceIssue }) {
  const statusColor = check.status === "Mismatch" ? "#f87171" : "#34d399";

  return (
    <div style={{ background: "rgba(2,6,23,0.6)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ fontWeight: 700, color: "#f8fafc" }}>{check.standard}</div>
        <span
          style={{
            background: statusColor,
            color: "#020617",
            borderRadius: 999,
            padding: "4px 10px",
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {check.status}
        </span>
      </div>
      <div style={{ marginTop: 8, color: "#cbd5e1" }}><strong>{check.subject}</strong></div>
      <div style={{ marginTop: 6, color: "#e2e8f0", lineHeight: 1.6 }}>{check.issue}</div>
      <div style={{ marginTop: 8, color: "#bae6fd" }}>{check.recommendation}</div>
    </div>
  );
}

function RiskPill({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(2,6,23,0.6)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(148,163,184,0.18)" }}>
      <span style={{ color: "#cbd5e1" }}>{label}</span>
      <span style={{ color: tone, fontWeight: 800, fontSize: 20 }}>{value}</span>
    </div>
  );
}
