"use client";

import React, { useState } from "react";
import { registerPlantAsset } from "@/app/actions/equipment-actions";
import { Plus, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

const CATEGORIES = [
  { code: "HEAVY_LIFTING", label: "Tower Crane / Crawler Crane (IS 4573 / IS 13367)", defaultBurn: 14.5 },
  { code: "CONCRETE_PUMPING", label: "Stationary / Mobile Concrete Boom Pump", defaultBurn: 18.0 },
  { code: "EARTHMOVING", label: "Hydraulic Excavator / Wheel Loader", defaultBurn: 16.5 },
  { code: "POWER_GEN", label: "Silent Diesel Generator (DG Set 250kVA+)", defaultBurn: 22.0 },
  { code: "PILING_RIG", label: "Hydraulic Rotary Piling Rig (IS 2911)", defaultBurn: 26.0 },
];

export function RegisterPlantAssetModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [equipmentCode, setEquipmentCode] = useState("EQ-TWR-01");
  const [equipmentName, setEquipmentName] = useState("Tower Crane 50m Jib");
  const [category, setCategory] = useState(CATEGORIES[0].code);
  const [makeAndModel, setMakeAndModel] = useState("Potain MCi 85 A");
  const [registrationNumber, setRegistrationNumber] = useState("MH-04-TC-8812");
  const [oemRatedFuelBurnLph, setOemRatedFuelBurnLph] = useState(CATEGORIES[0].defaultBurn);
  const [operatorName, setOperatorName] = useState("Rajesh Kumar (Grade A Rigger)");
  const [operatorLicenseNumber, setOperatorLicenseNumber] = useState("DL-UP-32-2018-9941");
  const [gridCoordinate, setGridCoordinate] = useState("Tower A Core");
  const [fitnessCertificateExpiry, setFitnessCertificateExpiry] = useState("2026-12-31");

  const handleCategoryChange = (catCode: string) => {
    setCategory(catCode);
    const match = CATEGORIES.find((c) => c.code === catCode);
    if (match) setOemRatedFuelBurnLph(match.defaultBurn);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await registerPlantAsset({
        projectId,
        equipmentCode,
        equipmentName,
        category,
        makeAndModel,
        registrationNumber,
        oemRatedFuelBurnLph,
        operatorName,
        operatorLicenseNumber,
        gridCoordinate,
        fitnessCertificateExpiry,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to register plant asset.");
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
        <span>+ Register Plant Asset</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  CPWD Works Manual Section 19 • Form 31 Plant Master
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Register Plant &amp; Fleet Asset
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
                    Equipment Code Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={equipmentCode}
                    onChange={(e) => setEquipmentCode(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Equipment Description
                  </label>
                  <input
                    type="text"
                    required
                    value={equipmentName}
                    onChange={(e) => setEquipmentName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Equipment Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Make &amp; Model
                  </label>
                  <input
                    type="text"
                    required
                    value={makeAndModel}
                    onChange={(e) => setMakeAndModel(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    OEM Fuel Baseline (L/hr)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={oemRatedFuelBurnLph}
                    onChange={(e) => setOemRatedFuelBurnLph(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-amber-400 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    TPI Safety Fitness Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={fitnessCertificateExpiry}
                    onChange={(e) => setFitnessCertificateExpiry(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Designated Operator
                  </label>
                  <input
                    type="text"
                    required
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Site Grid Location
                  </label>
                  <input
                    type="text"
                    required
                    value={gridCoordinate}
                    onChange={(e) => setGridCoordinate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
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
                  <span>Enroll Plant Unit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
