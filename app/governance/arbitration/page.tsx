import React from "react";
import { fetchArbitralDossiers } from "@/app/actions/arbitration-actions";
import { CompileArbitralDossierModal } from "@/components/governance/CompileArbitralDossierModal";
import { createClient } from "@/lib/supabase/server";
import { Scale, ShieldCheck, Download, FileText, ExternalLink, AlertTriangle, Layers } from "lucide-react";

export default async function ArbitrationWarRoomPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  const dossiers = await fetchArbitralDossiers(projectId);

  const totalDossiers = dossiers.length;
  const totalQuantum = dossiers.reduce((s, d) => s + Number(d.claimed_quantum_inr), 0);
  const totalDelayClaimed = dossiers.reduce((s, d) => s + Number(d.delay_days_claimed), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-indigo-400 uppercase tracking-widest font-bold">
            <Scale className="w-3.5 h-3.5" />
            <span>ARBITRAL CLAIMS &amp; SECTION 9/11 PETITIONS • ARBITRATION ACT 1996 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Arbitral Dispute Dossiers &amp; Legal Evidence Binders
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Contemporaneous statements of claim, SCL delay forensics, and Section 65B certified exhibit binders.
          </p>
        </div>

        <CompileArbitralDossierModal projectId={projectId} />
      </header>

      {/* 4 STRATEGIC LEGAL KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Packaged Dispute Dossiers</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{totalDossiers} Binders</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Ready for court filing</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Disputed Quantum</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
            ₹{(totalQuantum / 10000000).toFixed(2)} Cr
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Principal + Interest claims</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Cumulative EOT Claimed</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">+{totalDelayClaimed} Days</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">SCL TIA float analysis</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Evidentiary Admissibility</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">100% Sec. 65B</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Merkle tree authenticated</span>
        </div>
      </div>

      {/* ARBITRAL DOSSIERS REGISTER */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Arbitral Dossier Register ({dossiers.length})
          </span>
          <span className="text-[10px] text-zinc-500">Statutory Statement of Claim Ledgers</span>
        </div>

        <div className="divide-y divide-zinc-800">
          {dossiers.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-sans">
              Zero arbitral dossiers compiled. Click &quot;+ Compile Arbitral Dossier&quot; to package dispute exhibits into a court-ready binder.
            </div>
          ) : (
            dossiers.map((dossier) => (
              <div key={dossier.id} className="p-5 space-y-3 hover:bg-zinc-850/50 transition">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 font-bold text-[10px]">
                      {dossier.dossier_code}
                    </span>
                    <strong className="text-white text-sm">{dossier.dispute_title}</strong>
                  </div>

                  <span className="px-2.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-[9px] font-bold uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>{dossier.status.replace(/_/g, " ")}</span>
                  </span>
                </div>

                <div className="text-[11px] text-zinc-400 font-sans flex flex-wrap gap-x-5 gap-y-1">
                  <span>Forum: <strong className="text-zinc-200">{dossier.tribunal_jurisdiction.replace(/_/g, " ")}</strong></span>
                  <span>Claimant: <strong className="text-zinc-200">{dossier.claimant_entity}</strong></span>
                  <span>Respondent: <strong className="text-zinc-200">{dossier.respondent_entity}</strong></span>
                  <span>Quantum: <strong className="text-emerald-400 font-mono">₹{Number(dossier.claimed_quantum_inr).toLocaleString("en-IN")}</strong></span>
                  <span>EOT: <strong className="text-cyan-400 font-mono">+{dossier.delay_days_claimed}d</strong></span>
                  <span>Cert: <strong className="text-zinc-300 font-mono">{dossier.section_65b_certificate_no || "N/A"}</strong></span>
                </div>

                {/* STATEMENT OF CLAIM PREVIEW & EXPORT ACTIONS */}
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase">
                      Statement of Claim &amp; Evidence Manifest Preview:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const element = document.createElement("a");
                        const file = new Blob([dossier.statement_of_claim_markdown], { type: "text/markdown" });
                        element.href = URL.createObjectURL(file);
                        element.download = `${dossier.dossier_code}-STATEMENT-OF-CLAIM.md`;
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                      }}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[9px] uppercase flex items-center gap-1 cursor-pointer transition"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export Dossier (.md)</span>
                    </button>
                  </div>

                  <pre className="text-[10px] text-zinc-300 font-mono max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {dossier.statement_of_claim_markdown}
                  </pre>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
