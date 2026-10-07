"use client";

import React, { useState } from "react";
import { generateSection65BCertificate } from "@/app/actions/council-actions";
import { FileCheck, Shield, Loader2, Download } from "lucide-react";

interface Props {
  projectId: string;
}

export function Generate65BCertificateModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [moduleReference, setModuleReference] = useState("RA-BILL-004");
  const [actionCategory, setActionCategory] = useState("COMMERCIAL_RA_BILL_CERTIFIED");
  const [certifyingOfficer, setCertifyingOfficer] = useState("Akshat Singh Rathore");
  const [certifyingOfficerDesignation, setCertifyingOfficerDesignation] = useState("Chief Executive Officer & Founder");

  const [generatedAffidavit, setGeneratedAffidavit] = useState<string | null>(null);
  const [certNumber, setCertNumber] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await generateSection65BCertificate({
        projectId,
        moduleReference,
        actionCategory,
        certifyingOfficer,
        certifyingOfficerDesignation,
      });

      if (res.success && res.affidavitText) {
        setGeneratedAffidavit(res.affidavitText);
        setCertNumber(res.certificateNumber || "SEC65B-CERT");
      } else {
        alert(res.error || "Failed to generate Section 65B certificate.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setGeneratedAffidavit(null);
          setIsOpen(true);
        }}
        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
      >
        <Shield className="w-3.5 h-3.5" />
        <span>+ Generate Section 65B Certificate</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
                  Indian Evidence Act Sec. 65B • Legal Admissibility Gate
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Generate Electronic Evidence Affidavit
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

            {!generatedAffidavit ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                      Module Reference ID
                    </label>
                    <input
                      type="text"
                      required
                      value={moduleReference}
                      onChange={(e) => setModuleReference(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-400 text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                      Action / Dispute Category
                    </label>
                    <select
                      value={actionCategory}
                      onChange={(e) => setActionCategory(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                    >
                      <option value="COMMERCIAL_RA_BILL_CERTIFIED">Commercial RA Bill Certification</option>
                      <option value="COMMERCIAL_EOT_ADJUDICATED">FIDIC EOT Claims Adjudication</option>
                      <option value="QUALITY_IS456_CUBE_CLEARED">IS 456 Concrete Cube Statistical Acceptance</option>
                      <option value="MATERIALS_CL42_RECONCILIATION">CPWD Clause 42 Material Penal Recovery</option>
                      <option value="SAFETY_PTW_ISSUED">BOCW High-Risk Work Permit</option>
                      <option value="SPATIAL_BIM_CLASH_LOGGED">ISO 19650 BIM Spatial Collision</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                      Certifying Authority Name
                    </label>
                    <input
                      type="text"
                      required
                      value={certifyingOfficer}
                      onChange={(e) => setCertifyingOfficer(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                      Designation / Role
                    </label>
                    <input
                      type="text"
                      required
                      value={certifyingOfficerDesignation}
                      onChange={(e) => setCertifyingOfficerDesignation(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1 text-[10px] text-zinc-400">
                  <span className="text-emerald-400 uppercase font-bold block">
                    Statutory Legal Standard:
                  </span>
                  <p className="font-sans leading-relaxed">
                    Certifies electronic records under Section 65B(4) of the Indian Evidence Act, 1872 &amp; Section 63 Bharatiya Sakshya Adhiniyam, 2023. Validates hardware provenance, SHA-256 Merkle chain integrity, and automated algorithmic execution without human alteration.
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
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Compile &amp; Seal Affidavit</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-emerald-950/60 border border-emerald-800/80 p-3 rounded-xl">
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold block uppercase">
                      Certificate Generated &amp; Hermes Sealed ✓
                    </span>
                    <strong className="text-white text-xs font-mono">{certNumber}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const element = document.createElement("a");
                      const file = new Blob([generatedAffidavit], { type: "text/plain" });
                      element.href = URL.createObjectURL(file);
                      element.download = `${certNumber}.txt`;
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Affidavit (.txt)</span>
                  </button>
                </div>

                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl max-h-60 overflow-y-auto">
                  <pre className="text-[10px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {generatedAffidavit}
                  </pre>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold uppercase rounded text-xs transition cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
