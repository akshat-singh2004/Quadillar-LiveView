"use client";

import { generatePitchDossierPdf, type PitchDossierData } from "@/lib/reports/generatePitchDossier";

export function ExecutiveExportButton({ data }: { data: PitchDossierData }) {
  return (
    <button
      type="button"
      onClick={() => {
        void generatePitchDossierPdf(data);
      }}
      style={{
        border: "1px solid rgba(34,197,94,0.35)",
        background: "rgba(34,197,94,0.12)",
        color: "#ecfdf5",
        borderRadius: 999,
        padding: "10px 16px",
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      Export Executive Pitch Dossier
    </button>
  );
}
