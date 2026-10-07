// components/site/PTWCardGrid.tsx
"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import {
  ShieldCheck,
  Search,
  Plus,
  X,
  Clock,
  Loader2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { submitPTW, togglePTWSuspension } from "@/app/actions/ptw-actions";

export type PTWStatusBadge =
  | "ACTIVE & MONITORED"
  | "PENDING CLEARANCE"
  | "EXPIRED / SUSPENDED";

export interface SafetyCheckItem {
  id: string;
  label: string;
  passed: boolean;
}

export interface PTWRecord {
  id: string;
  serialId: string;
  permitType: string;
  hazardCategory: string;
  locationZone: string;
  subcontractor: string;
  validWindow: string;
  safetyChecks: SafetyCheckItem[];
  safetyOfficerClearance: "Verified" | "Pending";
  residentEngineerClearance: "Verified" | "Pending";
  status: PTWStatusBadge;
  rawStatus: string;
}

export interface PTWCardGridProps {
  projectId?: string;
}

function normalizePTW(d: any): PTWRecord {
  const isExpired = new Date(d.valid_until_time).getTime() < Date.now();
  let uiStatus: PTWStatusBadge = "PENDING CLEARANCE";

  if (d.status === "APPROVED_ACTIVE" && !isExpired) {
    uiStatus = "ACTIVE & MONITORED";
  } else if (d.status === "SUSPENDED" || isExpired) {
    uiStatus = "EXPIRED / SUSPENDED";
  }

  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) + " IST";
  };

  return {
    id: d.id,
    serialId: d.permit_number || `PTW-${d.id.slice(0, 6).toUpperCase()}`,
    permitType: d.permit_category || "HIGH RISK OPERATION",
    hazardCategory: d.hazard_classification || "Height",
    locationZone: d.location_zone || "General Site Area",
    subcontractor: d.subcontractor_name || "Primary Contractor",
    validWindow: d.valid_from_time
      ? `${formatTime(d.valid_from_time)} → ${formatTime(d.valid_until_time)}`
      : "08:00 IST → 17:00 IST",
    safetyChecks: d.checklist_json || [
      { id: "c-1", label: "Primary Fall/Hazard Barrier Verified", passed: d.safety_officer_cleared },
      { id: "c-2", label: "Certified Mandatory PPE Deployed", passed: d.safety_officer_cleared },
      { id: "c-3", label: "Trained Dedicated Standby / Watch Posted", passed: d.engineer_cleared },
      { id: "c-4", label: "Emergency Evacuation Route Unobstructed", passed: true },
    ],
    safetyOfficerClearance: d.safety_officer_cleared ? "Verified" : "Pending",
    residentEngineerClearance: d.engineer_cleared ? "Verified" : "Pending",
    status: uiStatus,
    rawStatus: d.status,
  };
}

export function PTWCardGrid({ projectId = "GOMTI-NAGAR-PH1-FITOUT" }: PTWCardGridProps) {
  const [permits, setPermits] = useState<PTWRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadPermits = useCallback(async () => {
    const { data } = await supabase
      .from("safety_ptw_register")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (data) {
      setPermits(data.map(normalizePTW));
    }
  }, [projectId]);

  useEffect(() => {
    loadPermits();

    const channel = supabase
      .channel(`ptw_realtime_${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "safety_ptw_register" },
        () => loadPermits()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, loadPermits]);

  // Form State with Preset Values
  const [formData, setFormData] = useState({
    serialId: `PTW-HT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    permitType: "WORK AT HEIGHT > 2.0M",
    hazardCategory: "Height",
    locationZone: "Tower A / Level 14 External Core Wall",
    subcontractor: "Falcon Structural RCC Works",
    durationHours: 8,
    safetyOfficerClearance: "Verified" as "Verified" | "Pending",
    residentEngineerClearance: "Verified" as "Verified" | "Pending",
    check1: true,
    check2: true,
    check3: true,
    check4: true,
  });

  const applyPreset = (type: string) => {
    const presets: Record<string, any> = {
      "WORK AT HEIGHT > 2.0M": {
        permitType: "WORK AT HEIGHT > 2.0M",
        hazardCategory: "Height",
        locationZone: "Tower A / Level 14 External Cantilever Staging",
        subcontractor: "Falcon Structural RCC Works",
      },
      "HOT WORK & CUTTING": {
        permitType: "HOT WORK & CUTTING",
        hazardCategory: "HotWork",
        locationZone: "Basement B1 Fire Pump Room Pipe Welding",
        subcontractor: "Apex MEP Contractors",
      },
      "DEEP TRENCH EXCAVATION": {
        permitType: "DEEP TRENCH EXCAVATION",
        hazardCategory: "Excavation",
        locationZone: "Trunk Stormwater Line Trench (Depth 3.5m)",
        subcontractor: "Verma Earthmovers",
      },
    };

    if (presets[type]) {
      setFormData((prev) => ({
        ...prev,
        ...presets[type],
        serialId: `PTW-${type.slice(0, 2)}-${Math.floor(100 + Math.random() * 900)}`,
      }));
    }
  };

  const filteredPermits = permits.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.serialId.toLowerCase().includes(q) ||
      p.permitType.toLowerCase().includes(q) ||
      p.locationZone.toLowerCase().includes(q) ||
      p.subcontractor.toLowerCase().includes(q);

    const matchesStatus = statusFilter === "ALL" ? true : p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleToggleAuthorization = (id: string, currentStatus: string) => {
    startTransition(async () => {
      await togglePTWSuspension(id, currentStatus);
      loadPermits();
    });
  };

  const handleCreatePermit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.locationZone.trim() || !formData.subcontractor.trim()) {
      alert("Missing required fields: Specific Location and Assigned Subcontractor.");
      return;
    }

    startTransition(async () => {
      const payload = {
        serialId: formData.serialId,
        permitType: formData.permitType,
        hazardCategory: formData.hazardCategory,
        locationZone: formData.locationZone.trim(),
        subcontractor: formData.subcontractor.trim(),
        durationHours: formData.durationHours,
        safetyOfficerClearance: formData.safetyOfficerClearance,
        residentEngineerClearance: formData.residentEngineerClearance,
        safetyChecks: [
          { id: "nc-1", label: "Primary Fall/Hazard Barrier Verified", passed: formData.check1 },
          { id: "nc-2", label: "Certified Mandatory PPE Deployed", passed: formData.check2 },
          { id: "nc-3", label: "Trained Dedicated Standby / Watch Posted", passed: formData.check3 },
          { id: "nc-4", label: "Emergency Evacuation Route Unobstructed", passed: formData.check4 },
        ],
      };

      const result = await submitPTW(projectId, payload);

      if (result.success) {
        setIsModalOpen(false);
        loadPermits();
      } else {
        alert(result.error || "Failed to issue permit.");
      }
    });
  };

  return (
    <div className="space-y-4 font-sans">
      {/* GLOBAL ACTION BAR */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search permit serial, type, zone, subcontractor..."
              className="w-full bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 font-mono"
            />
          </div>

          <div className="flex items-center gap-1 text-xs font-mono overflow-x-auto">
            {["ALL", "ACTIVE & MONITORED", "PENDING CLEARANCE", "EXPIRED / SUSPENDED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 border transition-colors cursor-pointer whitespace-nowrap ${statusFilter === st
                    ? "bg-zinc-800 text-zinc-100 border-zinc-600 font-bold"
                    : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                  }`}
              >
                {st === "ALL" ? `All (${permits.length})` : st}
              </button>
            ))}
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-bold uppercase tracking-wider text-xs px-4 py-2 flex items-center gap-2 transition-colors cursor-pointer shadow-none font-mono whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Issue High-Risk Permit</span>
          </button>
        </div>
      </div>

      {/* PERMITS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredPermits.map((permit) => {
          const isActive = permit.status === "ACTIVE & MONITORED";
          const isPendingStatus = permit.status === "PENDING CLEARANCE";

          return (
            <article
              key={permit.id}
              className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-zinc-100 tracking-wider">
                    {permit.serialId}
                  </span>
                  <span
                    className={`text-[10px] font-mono border uppercase tracking-wider font-bold px-2 py-0.5 ${isActive
                        ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/20"
                        : isPendingStatus
                          ? "border-amber-500/40 text-amber-400 bg-amber-950/20"
                          : "border-rose-500/40 text-rose-400 bg-rose-950/20"
                      }`}
                  >
                    {permit.status}
                  </span>
                </div>

                <div className="inline-block bg-zinc-950 border border-zinc-800 px-2.5 py-1 text-[11px] font-mono text-zinc-200 font-semibold uppercase tracking-wide">
                  {permit.permitType}
                </div>
              </div>

              <div className="bg-zinc-950/60 p-3 border border-zinc-800/80 space-y-1.5 text-xs font-mono">
                <div className="text-zinc-200 font-medium line-clamp-1">
                  {permit.locationZone}
                </div>
                <div className="text-zinc-400 text-[11px] truncate">
                  Subcontractor: <span className="text-zinc-300 font-semibold">{permit.subcontractor}</span>
                </div>
                <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 pt-0.5">
                  <Clock className="h-3 w-3 text-zinc-500" />
                  <span>{permit.validWindow}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono font-bold">
                  Mandatory Safety Check Matrix
                </div>
                <div className="space-y-1 bg-zinc-950/40 p-2.5 border border-zinc-800/50">
                  {permit.safetyChecks.map((chk) => (
                    <div
                      key={chk.id}
                      className="flex items-center justify-between text-[11px] font-mono"
                    >
                      <span className="text-zinc-300 truncate pr-2">{chk.label}</span>
                      <span className="flex items-center gap-1 shrink-0">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${chk.passed ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                        />
                        <span
                          className={`text-[10px] font-bold ${chk.passed ? "text-emerald-400" : "text-rose-400"
                            }`}
                        >
                          {chk.passed ? "PASS" : "FAIL"}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-zinc-950 p-2 border border-zinc-800">
                  <span className="block text-zinc-400 text-[10px] uppercase">Safety Officer</span>
                  <span
                    className={`font-bold flex items-center gap-1 mt-0.5 ${permit.safetyOfficerClearance === "Verified"
                        ? "text-emerald-400"
                        : "text-amber-400"
                      }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${permit.safetyOfficerClearance === "Verified"
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                        }`}
                    />
                    {permit.safetyOfficerClearance}
                  </span>
                </div>

                <div className="bg-zinc-950 p-2 border border-zinc-800">
                  <span className="block text-zinc-400 text-[10px] uppercase">Resident Engineer</span>
                  <span
                    className={`font-bold flex items-center gap-1 mt-0.5 ${permit.residentEngineerClearance === "Verified"
                        ? "text-emerald-400"
                        : "text-amber-400"
                      }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${permit.residentEngineerClearance === "Verified"
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                        }`}
                    />
                    {permit.residentEngineerClearance}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleToggleAuthorization(permit.id, permit.rawStatus)}
                  className={`w-full py-2 px-3 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer border disabled:opacity-50 ${isActive
                      ? "bg-zinc-950 hover:bg-rose-950/40 text-rose-400 border-rose-800"
                      : "bg-zinc-100 hover:bg-zinc-300 text-zinc-950 border-zinc-100"
                    }`}
                >
                  {isActive ? "Emergency Suspend Permit" : "Authorize & Clear Task"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {filteredPermits.length === 0 && (
        <div className="p-12 text-center bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-xs">
          No permits found matching the specified query.
        </div>
      )}

      {/* MODAL: Issue High-Risk Permit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 p-6 shadow-2xl relative my-8 font-mono text-xs">
            <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="text-[10px] tracking-widest text-zinc-400 uppercase font-bold">
                    STATUTORY HSE CLEARANCE GATE
                  </span>
                </div>
                <h2 className="text-base font-bold uppercase tracking-wider text-zinc-100 mt-1">
                  Issue High-Risk Permit to Work (PTW)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="pt-3">
              <span className="text-[10px] text-zinc-500 uppercase block mb-1">
                Quick Task Templates:
              </span>
              <div className="flex gap-2">
                {["WORK AT HEIGHT > 2.0M", "HOT WORK & CUTTING", "DEEP TRENCH EXCAVATION"].map((pr) => (
                  <button
                    key={pr}
                    type="button"
                    onClick={() => applyPreset(pr)}
                    className="px-2 py-1 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 hover:border-zinc-600"
                  >
                    {pr.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreatePermit} className="mt-4 space-y-4">
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Permit Serial ID *
                </label>
                <input
                  type="text"
                  required
                  disabled={isPending}
                  value={formData.serialId}
                  onChange={(e) => setFormData({ ...formData, serialId: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  High-Risk Hazard Category *
                </label>
                <select
                  value={formData.permitType}
                  disabled={isPending}
                  onChange={(e) => applyPreset(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono disabled:opacity-50"
                >
                  <option value="WORK AT HEIGHT > 2.0M">WORK AT HEIGHT &gt; 2.0M</option>
                  <option value="HOT WORK & CUTTING">HOT WORK &amp; CUTTING</option>
                  <option value="DEEP TRENCH EXCAVATION">DEEP TRENCH EXCAVATION</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Specific Location / Zone *
                </label>
                <input
                  type="text"
                  required
                  disabled={isPending}
                  placeholder="e.g. Tower A / Level 14 External Core Wall"
                  value={formData.locationZone}
                  onChange={(e) => setFormData({ ...formData, locationZone: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Assigned Subcontractor *
                </label>
                <input
                  type="text"
                  required
                  disabled={isPending}
                  placeholder="e.g. Falcon Structural RCC Works"
                  value={formData.subcontractor}
                  onChange={(e) => setFormData({ ...formData, subcontractor: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-mono disabled:opacity-50"
                />
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                  Pre-Task Safety Verifications
                </div>
                {[
                  { key: "check1", label: "Primary Fall/Hazard Barrier Verified" },
                  { key: "check2", label: "Certified Mandatory PPE Deployed" },
                  { key: "check3", label: "Trained Dedicated Standby / Watch Posted" },
                  { key: "check4", label: "Emergency Evacuation Route Unobstructed" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      disabled={isPending}
                      checked={(formData as any)[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                      className="accent-emerald-500"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                    Safety Officer Sign-off
                  </label>
                  <select
                    value={formData.safetyOfficerClearance}
                    disabled={isPending}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        safetyOfficerClearance: e.target.value as "Verified" | "Pending",
                      })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-zinc-100 font-mono disabled:opacity-50"
                  >
                    <option value="Verified">Verified</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                    Resident Engineer Sign-off
                  </label>
                  <select
                    value={formData.residentEngineerClearance}
                    disabled={isPending}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        residentEngineerClearance: e.target.value as "Verified" | "Pending",
                      })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-zinc-100 font-mono disabled:opacity-50"
                  >
                    <option value="Verified">Verified</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-zinc-100 uppercase tracking-wider text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 uppercase tracking-wider text-xs font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Issue Permit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}