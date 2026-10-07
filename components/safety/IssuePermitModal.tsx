"use client";

import React, { useState } from "react";
import { issuePermitToWork } from "@/app/actions/ptw-actions";
import { Plus, ShieldAlert, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

const PERMIT_TYPES = [
  { code: "HEIGHT_WORK", label: "Working at Height (> 1.8m / IS 3696)" },
  { code: "HOT_WORK", label: "Hot Work (Welding, Cutting, Grinding / IS 3010)" },
  { code: "CONFINED_SPACE", label: "Confined Space Entry (Tanks, Shafts / OSHA)" },
  { code: "DEEP_EXCAVATION", label: "Deep Excavation & Trenching (> 1.5m / IS 3764)" },
  { code: "HEAVY_LIFT", label: "Tandem Heavy Lifting Crane Operation" },
];

export function IssuePermitModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [permitType, setPermitType] = useState<any>(PERMIT_TYPES[0].code);
  const [locationZone, setLocationZone] = useState("Tower Core Grid B2-C3");
  const [contractorAgency, setContractorAgency] = useState("Apex Structural Glazing Ltd");
  const [supervisorName, setSupervisorName] = useState("Harish Verma (Safety Marshall)");
  const [validHoursDuration, setValidHoursDuration] = useState(8);

  const [ppeVerified, setPpeVerified] = useState(true);
  const [harnessLifelineVerified, setHarnessLifelineVerified] = useState(true);
  const [fireWatchAssigned, setFireWatchAssigned] = useState(false);
  const [shoringStable, setShoringStable] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await issuePermitToWork({
        projectId,
        permitType,
        locationZone,
        contractorAgency,
        supervisorName,
        validHoursDuration,
        ppeVerified,
        harnessLifelineVerified,
        fireWatchAssigned,
        shoringStable,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to authorize permit.");
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
        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Issue Safety Permit (PTW)</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-rose-400 uppercase tracking-widest font-bold">
                  BOCW Central Rules 1998 • High-Risk Operations
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Issue Digital Permit to Work
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Permit Classification
                  </label>
                  <select
                    value={permitType}
                    onChange={(e) => setPermitType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  >
                    {PERMIT_TYPES.map((p) => (
                      <option key={p.code} value={p.code}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Target Workfront Zone / Grid
                  </label>
                  <input
                    type="text"
                    required
                    value={locationZone}
                    onChange={(e) => setLocationZone(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Executing Contractor Agency
                  </label>
                  <input
                    type="text"
                    required
                    value={contractorAgency}
                    onChange={(e) => setContractorAgency(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Designated Safety Supervisor
                  </label>
                  <input
                    type="text"
                    required
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              {/* STATUTORY CHECKLIST MATRIX */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                <span className="text-[10px] text-rose-400 uppercase tracking-wider font-bold block">
                  Mandatory Safety Hold Verifications
                </span>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ppeVerified}
                      onChange={(e) => setPpeVerified(e.target.checked)}
                      className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-rose-500"
                    />
                    <span className="text-zinc-300">Mandatory PPE Audited</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={harnessLifelineVerified}
                      onChange={(e) => setHarnessLifelineVerified(e.target.checked)}
                      className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-rose-500"
                    />
                    <span className="text-zinc-300">100% Lifeline Tie-off</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fireWatchAssigned}
                      onChange={(e) => setFireWatchAssigned(e.target.checked)}
                      className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-rose-500"
                    />
                    <span className="text-zinc-300">Fire Watch &amp; Extinguisher</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shoringStable}
                      onChange={(e) => setShoringStable(e.target.checked)}
                      className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-rose-500"
                    />
                    <span className="text-zinc-300">Excavation Shoring Secure</span>
                  </label>
                </div>
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Authorize Life Safety Permit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
