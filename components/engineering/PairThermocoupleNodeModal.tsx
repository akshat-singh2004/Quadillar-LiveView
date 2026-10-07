"use client";

import React, { useState } from "react";
import { pairSacrificialNode } from "@/app/actions/maturity-actions";
import { Plus, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

const ELEMENT_TYPES = [
  { type: "VERTICAL_WALL_COL", label: "Vertical Column / Shear Wall (25% f_ck / 16-24h)" },
  { type: "SLAB_SOFFIT", label: "Suspended Slab Soffit (50% f_ck / 3d)" },
  { type: "BEAM_SOFFIT_PROPS", label: "Beam Soffits & Props < 4.5m (70% f_ck / 7d)" },
  { type: "LONG_SPAN_OVER_6M", label: "Transfer Girder / Long Span > 6m (85% f_ck / 14d)" },
] as const;

type ElementTypeValue = typeof ELEMENT_TYPES[number]["type"];

export function PairThermocoupleNodeModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nodeTag, setNodeTag] = useState("SN-RAFT-01");
  const [structuralElement, setStructuralElement] = useState("North Tower Core Raft Slab");
  const [gridLocation, setGridLocation] = useState("Tower Core / Grid B2-C3");
  const [mixDesignGrade, setMixDesignGrade] = useState("M40");
  const [targetFckMpa, setTargetFckMpa] = useState(40);
  const [elementType, setElementType] = useState<ElementTypeValue>("SLAB_SOFFIT");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await pairSacrificialNode({
        projectId,
        nodeTag,
        structuralElement,
        gridLocation,
        mixDesignGrade,
        targetFckMpa,
        elementType,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to pair thermocouple node.");
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
        className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Pair Sacrificial Node</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  ASTM C1074 / IS 456:2000 Table 10
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Pair Sacrificial Thermocouple Node
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
                    Sensor Node Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={nodeTag}
                    onChange={(e) => setNodeTag(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Mix Design Grade
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={mixDesignGrade}
                      onChange={(e) => {
                        setMixDesignGrade(e.target.value);
                        setTargetFckMpa(Number(e.target.value.replace("M", "")));
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                    >
                      {["M25", "M30", "M35", "M40", "M50"].map((g) => (
                        <option key={g} value={g}>{g} Mix</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Structural Element &amp; Bay
                </label>
                <input
                  type="text"
                  required
                  value={structuralElement}
                  onChange={(e) => setStructuralElement(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Grid Location Coordinates
                </label>
                <input
                  type="text"
                  required
                  value={gridLocation}
                  onChange={(e) => setGridLocation(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Statutory IS 456 Stripping Element Class
                </label>
                <select
                  value={elementType}
                  onChange={(e) => setElementType(e.target.value as ElementTypeValue)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                >
                  {ELEMENT_TYPES.map((t) => (
                    <option key={t.type} value={t.type}>{t.label}</option>
                  ))}
                </select>
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
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Pair Node &amp; Arm Telemetry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
