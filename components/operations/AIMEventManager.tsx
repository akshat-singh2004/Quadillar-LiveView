"use client";

import React, { useState } from "react";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  FileText, 
  Flame, 
  Layers, 
  ShieldAlert, 
  ShieldCheck, 
  Wrench, 
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";

export interface FacilityAssetRecord {
  id: string;
  project_id: string;
  asset_tag: string;
  asset_name: string;
  category: "HVAC" | "Plumbing" | "Electrical" | "Fire_Safety" | "Joinery_Interior" | "Appliance";
  location_zone: string;
  manufacturer: string;
  model_number: string;
  serial_number: string;
  install_date: string;
  warranty_expiry: string;
  run_hours: number;
  maintenance_interval_hours: number;
  status: "Operational" | "Maintenance_Due" | "Under_Service" | "Critical_Failure";
  contractor_assigned: string;
  om_manual_cde_ref: string;
}

interface Props {
  asset: FacilityAssetRecord | null;
  onClose: () => void;
  onAssetUpdated: (updated: FacilityAssetRecord) => void;
}

export function AIMEventManager({ asset, onClose, onAssetUpdated }: Props) {
  const [draft, setDraft] = useState<FacilityAssetRecord | null>(asset);
  const [simulating, setSimulating] = useState(false);
  const [workOrderCreated, setWorkOrderCreated] = useState(false);

  if (!asset || !draft) return null;

  const runRatio = draft.maintenance_interval_hours > 0 
    ? Math.min(100, Math.round((draft.run_hours / draft.maintenance_interval_hours) * 100))
    : 0;

  const handleSimulateLifecycleEvent = async (type: "WEAR_TEAR" | "FILTER_SERVICE" | "OVERHAUL") => {
    setSimulating(true);
    let newHours = draft.run_hours;
    let newStatus = draft.status;

    if (type === "WEAR_TEAR") {
      newHours += 250;
      if (newHours >= draft.maintenance_interval_hours) {
        newStatus = "Maintenance_Due";
      }
    } else if (type === "FILTER_SERVICE" || type === "OVERHAUL") {
      newHours = 0;
      newStatus = "Operational";
    }

    const updated = { ...draft, run_hours: newHours, status: newStatus };

    await (supabase as any)
      .from("facility_assets")
      .update({
        run_hours: newHours,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draft.id);

    setDraft(updated);
    onAssetUpdated(updated);
    setSimulating(false);
  };

  const handleDispatchWorkOrder = async () => {
    setSimulating(true);
    const woNumber = `WO-${draft.asset_tag.slice(0, 4)}-${Date.now().toString().slice(-4)}`;

    await (supabase as any).from("aim_work_orders").insert([{
      project_id: draft.project_id,
      asset_id: draft.id,
      work_order_number: woNumber,
      event_type: draft.status === "Maintenance_Due" ? "Preventative" : "Inspection",
      description: `ISO 19650-3 trigger: Scheduled overhaul for ${draft.asset_name}. Verify against ${draft.om_manual_cde_ref}.`,
      priority: draft.status === "Maintenance_Due" ? "High" : "Routine",
      status: "Scheduled",
      technician_name: "Field Operations Specialist",
      parts_cost_inr: 4500.00,
    }]);

    setWorkOrderCreated(true);
    setSimulating(false);
    setTimeout(() => setWorkOrderCreated(false), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5">
        
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-cyan-400">
                {draft.asset_tag}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                draft.status === "Operational"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                  : draft.status === "Maintenance_Due"
                  ? "bg-amber-950 text-amber-400 border border-amber-800/60 animate-pulse"
                  : "bg-rose-950 text-rose-400 border border-rose-800/60"
              }`}>
                {draft.status.replace("_", " ")}
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              {draft.asset_name}
            </h3>
            <div className="text-xs text-zinc-500 mt-0.5 font-mono">
              {draft.location_zone} · {draft.manufacturer} ({draft.model_number})
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* RUN-HOURS & SERVICE HORIZON */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-mono uppercase">Service Interval Degradation</span>
            <span className="font-mono font-bold text-white">
              {draft.run_hours} / {draft.maintenance_interval_hours} Run-Hours ({runRatio}%)
            </span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                runRatio >= 95 ? "bg-rose-500" : runRatio >= 75 ? "bg-amber-400" : "bg-cyan-400"
              }`}
              style={{ width: `${runRatio}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1">
            <span>Serial: {draft.serial_number}</span>
            <span>Warranty Valid Thru: {draft.warranty_expiry}</span>
          </div>
        </div>

        {/* ISO 19650-3 CDE DATA BINDING */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">CDE O&amp;M Manual Pack</span>
            <div className="font-mono font-bold text-white flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>{draft.om_manual_cde_ref}</span>
            </div>
            <div className="text-[10px] text-zinc-400">Verified as-built dossier</div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Responsible Trade DLP</span>
            <div className="font-mono font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{draft.contractor_assigned}</span>
            </div>
            <div className="text-[10px] text-zinc-400">Warranty hold liability active</div>
          </div>
        </div>

        {/* LIFECYCLE EVENT SIMULATION BUTTONS */}
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
            ISO 19650-3 Lifecycle Event Simulator
          </span>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              disabled={simulating}
              onClick={() => handleSimulateLifecycleEvent("WEAR_TEAR")}
              className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium transition text-center"
            >
              +250 Run-Hours (Degrade)
            </button>
            <button
              type="button"
              disabled={simulating}
              onClick={() => handleSimulateLifecycleEvent("FILTER_SERVICE")}
              className="p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-medium transition text-center"
            >
              Log Scheduled Service
            </button>
            <button
              type="button"
              disabled={simulating}
              onClick={() => handleSimulateLifecycleEvent("OVERHAUL")}
              className="p-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-medium transition text-center"
            >
              Reset to 0h (Major Rebuild)
            </button>
          </div>
        </div>

        {workOrderCreated && (
          <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Digital maintenance work order dispatched to field facility queue.</span>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
          <button
            type="button"
            disabled={simulating}
            onClick={handleDispatchWorkOrder}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-sm"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Dispatch Maintenance Work Order</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
}