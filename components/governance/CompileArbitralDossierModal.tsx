"use client";

import React, { useState } from "react";
import { compileArbitralDossier } from "@/app/actions/arbitration-actions";
import { Plus, Scale, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function CompileArbitralDossierModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [disputeTitle, setDisputeTitle] = useState("Claim for Wrongful Recovery of Liquidated Damages & Unpaid RA Bill 004");
  const [tribunalJurisdiction, setTribunalJurisdiction] = useState("SECTION_9_HIGH_COURT");
  const [claimantEntity, setClaimantEntity] = useState("Quadillar ConTech Pvt. Ltd. (Lead Partner)");
  const [respondentEntity, setRespondentEntity] = useState("State Infrastructure & Buildings Department");
  const [claimedQuantumInr, setClaimedQuantumInr] = useState(35000000);
  const [delayDaysClaimed, setDelayDaysClaimed] = useState(42);
  const [linkedModulesInput, setLinkedModulesInput] = useState("HND-918231, RA-BILL-004, EOT-104921");
  const [compiledBy, setCompiledBy] = useState("Advocate Akshat Singh Rathore (Lead Counsel)");
  const [executiveSummary, setExecutiveSummary] = useState("Interim dispute concerning unauthorized invocation of CPWD GCC Clause 2 Liquidated Damages without granting contemporaneous EOT for client drawing delays and severe monsoon stoppages.");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const linkedModules = linkedModulesInput.split(",").map((m) => m.trim()).filter(Boolean);

      const res = await compileArbitralDossier({
        projectId,
        disputeTitle,
        tribunalJurisdiction,
        claimantEntity,
        respondentEntity,
        claimedQuantumInr: Number(claimedQuantumInr),
        delayDaysClaimed: Number(delayDaysClaimed),
        linkedModules,
        compiledBy,
        executiveSummary,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to compile arbitral dispute dossier.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Compile Arbitral Dossier</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">
                  Arbitration Act 1996 • Sec. 9/11 Legal Evidence Binder
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Package Arbitral Dispute Dossier
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Dispute Heading / Claim Subject
                </label>
                <input
                  type="text"
                  required
                  value={disputeTitle}
                  onChange={(e) => setDisputeTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Forum / Jurisdiction
                  </label>
                  <select
                    value={tribunalJurisdiction}
                    onChange={(e) => setTribunalJurisdiction(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-indigo-300 text-xs font-bold"
                  >
                    <option value="SECTION_9_HIGH_COURT">High Court Sec. 9 (Interim Protection)</option>
                    <option value="SECTION_11_ARBITRATION">High Court Sec. 11 (Appointment of Arbitrator)</option>
                    <option value="FIDIC_DAB">FIDIC Dispute Adjudication Board (DAB)</option>
                    <option value="CPWD_CL25">CPWD GCC Cl. 25 Dispute Review Committee</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Compiled By / Counsel
                  </label>
                  <input
                    type="text"
                    required
                    value={compiledBy}
                    onChange={(e) => setCompiledBy(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Claimant Entity
                  </label>
                  <input
                    type="text"
                    required
                    value={claimantEntity}
                    onChange={(e) => setClaimantEntity(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Respondent Entity
                  </label>
                  <input
                    type="text"
                    required
                    value={respondentEntity}
                    onChange={(e) => setRespondentEntity(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Claimed Quantum (₹ INR)
                  </label>
                  <input
                    type="number"
                    required
                    value={claimedQuantumInr}
                    onChange={(e) => setClaimedQuantumInr(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-emerald-400 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Claimed EOT (Calendar Days)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={delayDaysClaimed}
                    onChange={(e) => setDelayDaysClaimed(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-400 font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Linked Modules / Exhibit Codes (Comma-Separated)
                </label>
                <input
                  type="text"
                  required
                  value={linkedModulesInput}
                  onChange={(e) => setLinkedModulesInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Executive Statement of Claim Narrative
                </label>
                <textarea
                  rows={3}
                  required
                  value={executiveSummary}
                  onChange={(e) => setExecutiveSummary(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-300 text-xs font-sans leading-relaxed"
                />
              </div>

              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1 text-[10px] text-zinc-400">
                <span className="text-indigo-400 uppercase font-bold block">
                  Automated Evidence Packaging:
                </span>
                <p className="font-sans leading-relaxed">
                  Synthesizes the Statement of Claim binder with contemporaneous SCL delay forensics, financial interest schedules under Section 31(7), and an automated Section 65B Certificate anchored by SHA-256 Merkle hashes.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold uppercase rounded text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generate Arbitral Binder</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
