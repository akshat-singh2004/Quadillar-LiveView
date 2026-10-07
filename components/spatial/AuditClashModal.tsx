"use client";

import React, { useState } from "react";
import { detectAndLogBimClash } from "@/app/actions/bim-actions";
import { Plus, Box, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function AuditClashModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [structuralElementName, setStructuralElementName] = useState("RC Column C3 (750x750mm)");
  const [mepElementName, setMepElementName] = useState("HVAC Chilled Water Supply Pipe DN200");
  const [gridLocation, setGridLocation] = useState("Tower Core Grid B2-C3");

  // Structural Box A
  const [sMinX, setSMinX] = useState(10.0);
  const [sMaxX, setSMaxX] = useState(10.75);
  const [sMinY, setSMinY] = useState(5.0);
  const [sMaxY, setSMaxY] = useState(5.75);
  const [sMinZ, setSMinZ] = useState(0.0);
  const [sMaxZ, setSMaxZ] = useState(3.5);

  // MEP Box B (Default overlapping to demonstrate AABB collision detection)
  const [mMinX, setMMinX] = useState(10.5);
  const [mMaxX, setMMaxX] = useState(11.2);
  const [mMinY, setMMinY] = useState(5.2);
  const [mMaxY, setMMaxY] = useState(5.6);
  const [mMinZ, setMMinZ] = useState(2.8);
  const [mMaxZ, setMMaxZ] = useState(3.2);

  // Live AABB collision preview
  const isOverlapX = sMinX <= mMaxX && sMaxX >= mMinX;
  const isOverlapY = sMinY <= mMaxY && sMaxY >= mMinY;
  const isOverlapZ = sMinZ <= mMaxZ && sMaxZ >= mMinZ;
  const hasLiveCollision = isOverlapX && isOverlapY && isOverlapZ;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await detectAndLogBimClash({
        projectId,
        structuralElementName,
        mepElementName,
        gridLocation,
        structBox: { minX: sMinX, maxX: sMaxX, minY: sMinY, maxY: sMaxY, minZ: sMinZ, maxZ: sMaxZ },
        mepBox: { minX: mMinX, maxX: mMaxX, minY: mMinY, maxY: mMaxY, minZ: mMinZ, maxZ: mMaxZ },
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to audit spatial coordinates.");
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
        <span>+ Audit 3D BIM Coordinates</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">
                  ISO 19650-2 / PAS 1192 • Spatial Coordination Gate
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Audit 3D AABB Volumetric Interference
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
                    Structural RC Element
                  </label>
                  <input
                    type="text"
                    required
                    value={structuralElementName}
                    onChange={(e) => setStructuralElementName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    MEP Service / Embedment
                  </label>
                  <input
                    type="text"
                    required
                    value={mepElementName}
                    onChange={(e) => setMepElementName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Grid Axis Location
                </label>
                <input
                  type="text"
                  required
                  value={gridLocation}
                  onChange={(e) => setGridLocation(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                />
              </div>

              {/* 3D BOUNDING COORDINATES (STRUCTURAL VS MEP) */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                <div>
                  <span className="text-[9px] text-indigo-400 uppercase font-bold block mb-1.5">
                    Structural Bounding Box (m)
                  </span>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex gap-1 items-center">
                      <span className="text-zinc-500 w-4">X:</span>
                      <input type="number" step="0.01" value={sMinX} onChange={(e) => setSMinX(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                      <span className="text-zinc-600">to</span>
                      <input type="number" step="0.01" value={sMaxX} onChange={(e) => setSMaxX(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                    </div>
                    <div className="flex gap-1 items-center">
                      <span className="text-zinc-500 w-4">Y:</span>
                      <input type="number" step="0.01" value={sMinY} onChange={(e) => setSMinY(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                      <span className="text-zinc-600">to</span>
                      <input type="number" step="0.01" value={sMaxY} onChange={(e) => setSMaxY(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                    </div>
                    <div className="flex gap-1 items-center">
                      <span className="text-zinc-500 w-4">Z:</span>
                      <input type="number" step="0.01" value={sMinZ} onChange={(e) => setSMinZ(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                      <span className="text-zinc-600">to</span>
                      <input type="number" step="0.01" value={sMaxZ} onChange={(e) => setSMaxZ(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] text-cyan-400 uppercase font-bold block mb-1.5">
                    MEP Bounding Box (m)
                  </span>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex gap-1 items-center">
                      <span className="text-zinc-500 w-4">X:</span>
                      <input type="number" step="0.01" value={mMinX} onChange={(e) => setMMinX(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                      <span className="text-zinc-600">to</span>
                      <input type="number" step="0.01" value={mMaxX} onChange={(e) => setMMaxX(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                    </div>
                    <div className="flex gap-1 items-center">
                      <span className="text-zinc-500 w-4">Y:</span>
                      <input type="number" step="0.01" value={mMinY} onChange={(e) => setMMinY(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                      <span className="text-zinc-600">to</span>
                      <input type="number" step="0.01" value={mMaxY} onChange={(e) => setMMaxY(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                    </div>
                    <div className="flex gap-1 items-center">
                      <span className="text-zinc-500 w-4">Z:</span>
                      <input type="number" step="0.01" value={mMinZ} onChange={(e) => setMMinZ(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                      <span className="text-zinc-600">to</span>
                      <input type="number" step="0.01" value={mMaxZ} onChange={(e) => setMMaxZ(Number(e.target.value))} className="w-14 bg-zinc-950 border border-zinc-800 p-1 text-center rounded text-zinc-300" />
                    </div>
                  </div>
                </div>
              </div>

              {/* STATUTORY COLLISION AUDIT PREVIEW */}
              <div className={`p-3 rounded-xl border space-y-1 text-[10px] ${
                hasLiveCollision ? "bg-rose-950/40 border-rose-800/80" : "bg-emerald-950/40 border-emerald-800/80"
              }`}>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Minerva 3D AABB Audit:</span>
                  <span className={`font-bold font-mono ${hasLiveCollision ? "text-rose-400" : "text-emerald-400"}`}>
                    {hasLiveCollision ? "HARD CLASH INTERFERENCE DETECTED" : "SPATIAL COORDINATION CLEARED (ZERO CLASH)"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-1">
                  <span className="text-zinc-400">Pour Card Interlock:</span>
                  <span className={hasLiveCollision ? "text-rose-400" : "text-emerald-400"}>
                    {hasLiveCollision ? "Engages Pre-Pour Spatial Lockout" : "MEP Clearances Cleared for Casting"}
                  </span>
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Execute Spatial Audit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
