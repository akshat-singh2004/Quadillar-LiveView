"use client";

import React, { useState } from "react";
import { issueWorkerGatePass } from "@/app/actions/gate-pass-actions";
import { Plus, QrCode, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function GenerateGatePassModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [workerPin, setWorkerPin] = useState("PIN-208");
  const [workerName, setWorkerName] = useState("Rajesh Kumar Yadav");
  const [tradeClassification, setTradeClassification] = useState("BAR_BENDER");
  const [skillTier, setSkillTier] = useState("SKILLED");
  const [contractorAgency, setContractorAgency] = useState("Falcon Steel Fixing Services");
  const [bloodGroup, setBloodGroup] = useState("B+");
  const [emergencyContact, setEmergencyContact] = useState("+91 98765 43210");
  const [medicalFitnessExpiryIso, setMedicalFitnessExpiryIso] = useState("2027-03-31");
  const [zoneHeight, setZoneHeight] = useState(true);
  const [zoneConfined, setZoneConfined] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const permittedZones = ["GENERAL_SITE"];
      if (zoneHeight) permittedZones.push("WORKING_AT_HEIGHT");
      if (zoneConfined) permittedZones.push("CONFINED_SPACE");

      const res = await issueWorkerGatePass({
        projectId,
        workerPin,
        workerName,
        tradeClassification,
        skillTier,
        contractorAgency,
        bloodGroup,
        emergencyContact,
        medicalFitnessExpiryIso,
        permittedZones,
        issuedBy: "Safety Lead (FOAP Project Office)",
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to issue gate pass.");
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
        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Issue Biometric Gate Pass</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
                  BOCW Act 1996 • Physical Access &amp; Safety Induction Gate
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Issue Worker Biometric Gate Pass
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Worker PIN / Turnstile ID
                  </label>
                  <input
                    type="text"
                    required
                    value={workerPin}
                    onChange={(e) => setWorkerPin(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-400 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Trade Classification
                  </label>
                  <select
                    value={tradeClassification}
                    onChange={(e) => setTradeClassification(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  >
                    <option value="BAR_BENDER">Bar Bender</option>
                    <option value="CARPENTER">Shuttering Carpenter</option>
                    <option value="MASON">Mason</option>
                    <option value="ELECTRICIAN">Electrician</option>
                    <option value="HELPER">General Helper</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Skill Tier (Min Wage Floor)
                  </label>
                  <select
                    value={skillTier}
                    onChange={(e) => setSkillTier(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-emerald-400 font-bold text-xs"
                  >
                    <option value="SKILLED">Skilled (≥ ₹850/day)</option>
                    <option value="SEMI_SKILLED">Semi-Skilled (≥ ₹720/day)</option>
                    <option value="UNSKILLED">Unskilled (≥ ₹580/day)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Contractor / Agency
                </label>
                <input
                  type="text"
                  required
                  value={contractorAgency}
                  onChange={(e) => setContractorAgency(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Blood Group
                  </label>
                  <input
                    type="text"
                    required
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Emergency Phone
                  </label>
                  <input
                    type="text"
                    required
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-zinc-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Fitness Expiry
                  </label>
                  <input
                    type="date"
                    required
                    value={medicalFitnessExpiryIso}
                    onChange={(e) => setMedicalFitnessExpiryIso(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              {/* HIGH-RISK ACCESS PERMITS */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                <span className="text-[9px] text-emerald-400 font-bold uppercase block">
                  High-Risk Zone Authorization (Argus Interlock)
                </span>
                <div className="flex gap-4 text-[10px]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={zoneHeight}
                      onChange={(e) => setZoneHeight(e.target.checked)}
                      className="rounded bg-zinc-950 border-zinc-700 text-emerald-500"
                    />
                    <span>Working at Height (&ge; 2m)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={zoneConfined}
                      onChange={(e) => setZoneConfined(e.target.checked)}
                      className="rounded bg-zinc-950 border-zinc-700 text-emerald-500"
                    />
                    <span>Confined Space Entry</span>
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Sign &amp; Issue Gate Pass</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
