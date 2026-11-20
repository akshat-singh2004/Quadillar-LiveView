"use client";

import React, { useState, useEffect } from "react";
import { Layers, Sliders, AlertTriangle, CheckCircle2, FileCode2, Eye, EyeOff } from "lucide-react";
import { useActiveProject } from "@/context/ProjectContext";

interface StructuralDeviationNode {
  id: string;
  projectId: string;
  zoneCode: string;
  elementName: string;
  plannedCoord: string;
  asBuiltCoord: string;
  deltaMm: number;
  sequenceStatus: string;
  standardRef: string;
}

const HEATMAP_NODES: StructuralDeviationNode[] = [
  {
    id: "TG-03",
    projectId: "UP-LDA-VANGUARD-CAMPUS",
    zoneCode: "BIT-4-TG03",
    elementName: "Level 3 Transfer Girder TG-03 (M50)",
    plannedCoord: "Grid C4–C7 • RL +14.400 m",
    asBuiltCoord: "Grid C4–C7 • RL +14.386 m (Soffit Sag + Voids)",
    deltaMm: 14.2,
    sequenceStatus: "HOLD ACTIVE (IS 456 Cl. 17.4.3)",
    standardRef: "IS 456:2000 Cl. 17.4.3",
  },
  {
    id: "NODE-14B",
    projectId: "UP-LDA-VANGUARD-CAMPUS",
    zoneCode: "BIT-2-DOME",
    elementName: "MERO Space-Frame Node #14B (Silver Dome)",
    plannedCoord: "Radial Azimuth 10.000° • R = 32.500 m",
    asBuiltCoord: "Radial Azimuth 10.007° • R = 32.5042 m",
    deltaMm: 4.2,
    sequenceStatus: "SHIM CALIBRATION QUEUED",
    standardRef: "IS 800:2007 & EN 1090-2",
  },
  {
    id: "CORE-A1",
    projectId: "UP-LDA-VANGUARD-CAMPUS",
    zoneCode: "BIT-1-WEDGE",
    elementName: "Tower A Shear Core Wall SW-01",
    plannedCoord: "Grid A1–A4 • Plumbness 0.0 mm",
    asBuiltCoord: "Grid A1–A4 • Plumbness +1.6 mm",
    deltaMm: 1.6,
    sequenceStatus: "WITHIN ±2.0 MM GFC TOLERANCE",
    standardRef: "ISO 19650-2 LOD-400",
  },
  {
    id: "SUMMIT-W04",
    projectId: "LKO-SUMMIT-TOWER",
    zoneCode: "12F-GRID-B4-B7",
    elementName: "12th Floor Perimeter Wall W-04 (Summit Building)",
    plannedCoord: "GFC Gridline B4–B7 (X = 24.000 m)",
    asBuiltCoord: "Cast Outward at X = 25.000 m (+1.00 m Off-Grid)",
    deltaMm: 1000.0,
    sequenceStatus: "CAST 9 DAYS AHEAD OF WBS SEQUENCE",
    standardRef: "ISO 19650-2 & IS 456 Cl. 11",
  },
  {
    id: "SUMMIT-C08",
    projectId: "LKO-SUMMIT-TOWER",
    zoneCode: "12F-CORE-C08",
    elementName: "12th Floor Lift Core Column C-08",
    plannedCoord: "Grid C8 • RL +46.800 m",
    asBuiltCoord: "Grid C8 • RL +46.8018 m",
    deltaMm: 1.8,
    sequenceStatus: "VERIFIED NOMINAL",
    standardRef: "IS 456:2000 Cl. 11.1",
  },
];

export default function MillimeterHeatmapHud() {
  const { activeProject } = useActiveProject();
  const [heatmapEnabled, setHeatmapEnabled] = useState<boolean>(true);
  const [toleranceFloorMm, setToleranceFloorMm] = useState<number>(2.0);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("TG-03");
  const [ifcPatchedIds, setIfcPatchedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("heatmap") === "1") setHeatmapEnabled(true);
    } catch {}

    const onToggle = (e: Event) => {
      const detail = (e as CustomEvent<boolean | undefined>).detail;
      setHeatmapEnabled((prev) => (typeof detail === "boolean" ? detail : !prev));
    };
    window.addEventListener("quadillar-heatmap-toggle", onToggle);
    return () => window.removeEventListener("quadillar-heatmap-toggle", onToggle);
  }, []);

  const scopedNodes = HEATMAP_NODES.filter(
    (n) =>
      n.projectId === activeProject.projectId ||
      (activeProject.projectId !== "LKO-SUMMIT-TOWER" && n.projectId === "UP-LDA-VANGUARD-CAMPUS")
  );

  const activeNode =
    scopedNodes.find((n) => n.id === selectedNodeId) || scopedNodes[0] || HEATMAP_NODES[0];

  const getSeverityTone = (deltaMm: number) => {
    if (deltaMm > Math.max(10, toleranceFloorMm * 4)) {
      return {
        label: "CRITICAL DRIFT",
        badgeClass: "bg-rose-500/15 border-rose-500/45 text-rose-400",
        barColor: "#EF4444",
      };
    }
    if (deltaMm > toleranceFloorMm) {
      return {
        label: "WATCH TOLERANCE",
        badgeClass: "bg-amber-500/15 border-amber-500/45 text-amber-400",
        barColor: "#F59E0B",
      };
    }
    return {
      label: "NOMINAL (< TOL)",
      badgeClass: "bg-emerald-500/15 border-emerald-500/45 text-emerald-400",
      barColor: "#10B981",
    };
  };

  return (
    <div className="bg-zinc-900/85 border border-zinc-800 rounded-2xl p-4 mb-4 font-mono text-xs shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white uppercase tracking-wider">
            3D LIDAR MILLIMETER TOLERANCE HEATMAP & AS-BUILT GHOST OVERLAY
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-emerald-400 font-bold">
            ±{toleranceFloorMm.toFixed(1)} MM THRESHOLD
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1">
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] text-zinc-400 font-bold">TOLERANCE:</span>
            <input
              type="range"
              min="1"
              max="15"
              step="0.5"
              value={toleranceFloorMm}
              onChange={(e) => setToleranceFloorMm(parseFloat(e.target.value))}
              className="w-24 accent-emerald-500 cursor-pointer"
            />
            <span className="text-[10px] font-bold text-white w-11 text-right">
              {toleranceFloorMm.toFixed(1)}mm
            </span>
          </div>

          <button
            type="button"
            onClick={() => setHeatmapEnabled((v) => !v)}
            className={`px-3 py-1.5 rounded-xl border text-[10.5px] font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
              heatmapEnabled
                ? "bg-emerald-500/15 border-emerald-500/45 text-emerald-400"
                : "bg-zinc-950 border-zinc-800 text-zinc-400"
            }`}
          >
            {heatmapEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {heatmapEnabled ? "Heatmap Active" : "Show Heatmap"}
          </button>
        </div>
      </div>

      {heatmapEnabled && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3.5 items-center">
          {/* Left 7 Cols: Clickable Structural Elements Colored by Millimeter Deviation */}
          <div className="lg:col-span-7 flex flex-col gap-2">
            {scopedNodes.map((node) => {
              const tone = getSeverityTone(node.deltaMm);
              const isSelected = activeNode.id === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? "bg-zinc-950 border-zinc-500"
                      : "bg-zinc-950/60 hover:bg-zinc-950 border-zinc-800"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        style={{ backgroundColor: tone.barColor }}
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                      />
                      <span className="font-bold text-white truncate">{node.elementName}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate mt-0.5 pl-4">
                      {node.asBuiltCoord} • {node.sequenceStatus}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded border text-[9.5px] font-bold ${tone.badgeClass}`}>
                      Δ {node.deltaMm >= 100 ? `${(node.deltaMm / 1000).toFixed(2)} m` : `${node.deltaMm.toFixed(1)} mm`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right 5 Cols: GFC Planned vs As-Built Ghost Wireframe & Revit Delta Sync */}
          <div className="lg:col-span-5 bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-zinc-400 font-bold uppercase">
                GFC CAD (CYAN) VS AS-BUILT LIDAR (HEAT)
              </span>
              <span className="text-zinc-300 font-bold">{activeNode.zoneCode}</span>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 flex items-center justify-center">
              <svg viewBox="0 0 280 96" className="w-full h-24">
                {/* Planned GFC Gridline Ghost */}
                <line x1="25" y1="14" x2="25" y2="82" stroke="#22d3ee" strokeDasharray="3 3" strokeWidth="1.5" />
                <text x="30" y="22" fill="#22d3ee" fontSize="8" fontFamily="monospace">
                  GFC AXIS (0.0 mm)
                </text>
                <rect
                  x="25"
                  y="32"
                  width="120"
                  height="34"
                  fill="rgba(34, 211, 238, 0.08)"
                  stroke="#22d3ee"
                  strokeDasharray="4 2"
                />

                {/* As-Built Shifted Member */}
                {(() => {
                  const visualShift = Math.min(95, Math.max(6, (activeNode.deltaMm / Math.max(1, toleranceFloorMm)) * 12));
                  const barColor = getSeverityTone(activeNode.deltaMm).barColor;
                  return (
                    <>
                      <rect
                        x={25 + visualShift}
                        y="38"
                        width="120"
                        height="34"
                        fill={`${barColor}33`}
                        stroke={barColor}
                        strokeWidth="2"
                      />
                      <line
                        x1="25"
                        y1="78"
                        x2={25 + visualShift}
                        y2="78"
                        stroke={barColor}
                        strokeWidth="2"
                      />
                      <text
                        x={30 + visualShift}
                        y="86"
                        fill={barColor}
                        fontSize="8"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        Δ {activeNode.deltaMm >= 100 ? `${activeNode.deltaMm} mm (1.00 m)` : `${activeNode.deltaMm} mm`}
                      </text>
                    </>
                  );
                })()}
              </svg>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="text-[10px] text-zinc-400">
                {ifcPatchedIds[activeNode.id] ? (
                  <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    IFC / Revit As-Built Delta Sealed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {activeNode.standardRef}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setIfcPatchedIds((prev) => ({ ...prev, [activeNode.id]: !prev[activeNode.id] }))
                }
                className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-[10px] inline-flex items-center gap-1 transition cursor-pointer"
              >
                <FileCode2 className="w-3 h-3" />
                {ifcPatchedIds[activeNode.id] ? "Patch Active" : "Sync Revit Delta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
