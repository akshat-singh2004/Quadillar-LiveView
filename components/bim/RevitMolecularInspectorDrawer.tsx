"use client";

import React, { useState } from "react";
import { Box, Cpu, Crosshair, ShieldAlert, Sparkles, X, CheckCircle2 } from "lucide-react";
import type { BimMolecularElement } from "@/lib/bim/vanguardRevitEngine";
import { recordMemoryEngram } from "@/lib/memory/quadmaxMemoryCortex";
import { useActiveProject } from "@/context/ProjectContext";

interface RevitMolecularInspectorDrawerProps {
  element: BimMolecularElement | null;
  onClose: () => void;
  onFocusElement: (pos: [number, number, number]) => void;
  onEscalateHardware: (element: BimMolecularElement) => void;
}

export default function RevitMolecularInspectorDrawer({
  element,
  onClose,
  onFocusElement,
  onEscalateHardware,
}: RevitMolecularInspectorDrawerProps) {
  const { activeProject } = useActiveProject();
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  if (!element) return null;

  const handleSendToQuadmaxMemory = () => {
    recordMemoryEngram({
      category: "EPISODIC_EVENT",
      source: "BIM_MILLIMETER_HEATMAP",
      projectCode: activeProject.code,
      projectName: activeProject.name,
      zoneOrElement: `${element.mark} (${element.name})`,
      title: `Revit Element Inspected: ${element.ifcClass} • ${element.revitFamily}`,
      detail: `${element.liveTelemetry} | Spec: ${element.materialSpec} | BOQ: ₹${element.boqRateInr.toLocaleString("en-IN")}`,
      beforeState: `Revit GUID ${element.guid}`,
      afterState: `Synced to QUADMAX.AI Executive Memory`,
      requiresFollowUp: false,
    });
    setActionFeedback(`Synced ${element.mark} (${element.guid}) to QUADMAX.AI Memory Cortex.`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleFlagComponentNcr = () => {
    recordMemoryEngram({
      category: "STATE_DELTA",
      source: "IS456_ESCROW_GATE",
      projectCode: activeProject.code,
      projectName: activeProject.name,
      zoneOrElement: `${element.mark} (${element.level})`,
      title: `Component-Level NCR Hold Flagged on ${element.mark}`,
      detail: `Blocked BOQ payout of ₹${element.boqRateInr.toLocaleString("en-IN")} on ${element.revitFamily} (${element.complianceStandard}).`,
      beforeState: `BOQ Line ₹${element.boqRateInr.toLocaleString("en-IN")} Active`,
      afterState: `ESCROW HOLD LOCKED (${element.guid})`,
      financialDeltaInr: -element.boqRateInr,
      requiresFollowUp: true,
    });
    setActionFeedback(`Escrow Hold (₹${element.boqRateInr.toLocaleString("en-IN")}) locked on ${element.mark}.`);
    setTimeout(() => setActionFeedback(null), 4500);
  };

  return (
    <div className="w-80 sm:w-96 bg-zinc-950/95 backdrop-blur-md border border-cyan-500/45 rounded-2xl p-3.5 shadow-2xl font-mono text-xs text-zinc-100 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2 border-b border-zinc-800 pb-2">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-bold">
            <Box className="w-3.5 h-3.5" />
            <span>REVIT LOD-400 • {element.mark} • {element.bitCode}</span>
          </div>
          <h3 className="font-bold text-sm text-white mt-0.5 leading-snug">{element.name}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="text-zinc-400">IFC CLASS / GUID</div>
          <div className="font-bold text-cyan-300 truncate">{element.ifcClass}</div>
          <div className="text-[9px] text-zinc-500 truncate">{element.guid}</div>
        </div>
        <div className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="text-zinc-400">LEVEL & GRIDLINE</div>
          <div className="font-bold text-zinc-100 truncate">{element.level}</div>
          <div className="text-[9px] text-emerald-400 truncate">{element.gridline}</div>
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1 text-[10px]">
        <div>
          <span className="text-zinc-400">Revit Family: </span>
          <span className="text-zinc-100 font-bold">{element.revitFamily}</span>
        </div>
        <div>
          <span className="text-zinc-400">Family Type: </span>
          <span className="text-zinc-200">{element.revitType}</span>
        </div>
        <div>
          <span className="text-zinc-400">Dimensions: </span>
          <span className="text-zinc-200">{element.dimensionsMm}</span>
        </div>
        <div>
          <span className="text-zinc-400">Spec / Make: </span>
          <span className="text-zinc-300">{element.materialSpec} ({element.manufacturer})</span>
        </div>
        <div className="pt-1 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-zinc-400">{element.complianceStandard}</span>
          <span className="font-bold text-emerald-400">
            BOQ: ₹{element.boqRateInr.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-[10px]">
        <div className="flex items-center justify-between font-bold text-emerald-400 mb-0.5">
          <span className="inline-flex items-center gap-1">
            <Cpu className="w-3 h-3" /> LIVE BMS / IOT TELEMETRY
          </span>
          <span>{element.status}</span>
        </div>
        <div className="text-zinc-200 leading-relaxed">{element.liveTelemetry}</div>
      </div>

      <div className="flex flex-col gap-1.5 pt-0.5 text-[10.5px]">
        <button
          type="button"
          onClick={() => {
            onFocusElement(element.worldPos);
            onEscalateHardware(element);
          }}
          className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Crosshair className="w-3.5 h-3.5" />
          Escalate PTZ Camera & 905nm Laser on {element.mark}
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={handleSendToQuadmaxMemory}
            className="py-1.5 px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Sync to Memory
          </button>

          <button
            type="button"
            onClick={handleFlagComponentNcr}
            className="py-1.5 px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-400 font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer"
          >
            <ShieldAlert className="w-3 h-3" />
            Lock BOQ Hold
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}
    </div>
  );
}
