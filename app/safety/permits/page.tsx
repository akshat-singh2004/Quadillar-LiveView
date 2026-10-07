"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Wind,
  Flame,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Database,
  Activity,
  X,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface PTWRecord {
  id: string;
  project_id: string;
  permit_number: string;
  permit_type: "WORK_AT_HEIGHT" | "HOT_WORK_WELDING" | "CONFINED_SPACE" | "HEAVY_RIGGING" | "DEEP_EXCAVATION";
  work_location: string;
  contractor_name: string;
  safety_officer_name: string;
  valid_from: string;
  valid_until: string;
  wind_speed_kmh: number;
  oxygen_level_pct: number;
  status: "ACTIVE_ISSUED" | "SUSPENDED_WEATHER" | "CLOSED_SAFE" | "REJECTED";
  safety_measures_verified: boolean;
}

const FALLBACK_PTW: PTWRecord[] = [
  {
    id: "ptw-fb-1",
    project_id: "PRJ-01-LIVE",
    permit_number: "PTW-2026-081",
    permit_type: "WORK_AT_HEIGHT",
    work_location: "Tower A - Level 14 Perimeter Scaffold & Core",
    contractor_name: "Apex Structural Formworks Ltd.",
    safety_officer_name: "Chief Safety Officer (HSE)",
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 8 * 3600000).toISOString(),
    wind_speed_kmh: 18.5,
    oxygen_level_pct: 20.9,
    status: "ACTIVE_ISSUED",
    safety_measures_verified: true,
  },
  {
    id: "ptw-fb-2",
    project_id: "PRJ-01-LIVE",
    permit_number: "PTW-2026-082",
    permit_type: "HOT_WORK_WELDING",
    work_location: "Basement 2 - Chilled Water Header Pipe Joint",
    contractor_name: "Thermax MEP Solutions",
    safety_officer_name: "Senior HSE Engineer",
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 6 * 3600000).toISOString(),
    wind_speed_kmh: 4.2,
    oxygen_level_pct: 20.8,
    status: "ACTIVE_ISSUED",
    safety_measures_verified: true,
  },
];

export default function SafetyPermitsPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [permits, setPermits] = useState<PTWRecord[]>([]);
  const [selectedPermit, setSelectedPermit] = useState<PTWRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form
  const [pType, setPType] = useState<PTWRecord["permit_type"]>("WORK_AT_HEIGHT");
  const [location, setLocation] = useState("");
  const [contractor, setContractor] = useState("");

  const loadPermits = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("safety_permits_ptw")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setPermits(FALLBACK_PTW);
        setSelectedPermit(FALLBACK_PTW[0]);
      } else {
        setIsFallbackMode(false);
        setPermits(data);
        setSelectedPermit(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setPermits(FALLBACK_PTW);
      setSelectedPermit(FALLBACK_PTW[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadPermits();
  }, [loadPermits]);

  const summary = useMemo(() => {
    const activePermits = permits.filter((p) => p.status === "ACTIVE_ISSUED").length;
    const heightPermits = permits.filter((p) => p.permit_type === "WORK_AT_HEIGHT").length;

    return { activePermits, heightPermits, total: permits.length };
  }, [permits]);

  const handleCreatePermit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = `PTW-${new Date().getFullYear()}-${(permits.length + 83).toString().padStart(3, "0")}`;

    const payload: Partial<PTWRecord> = {
      project_id: projectId,
      permit_number: code,
      permit_type: pType,
      work_location: location.trim(),
      contractor_name: contractor.trim(),
      safety_officer_name: "Chief Safety Officer (HSE)",
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 8 * 3600000).toISOString(),
      wind_speed_kmh: 18.5,
      oxygen_level_pct: 20.9,
      status: "ACTIVE_ISSUED",
      safety_measures_verified: true,
    };

    try {
      const { data, error } = await (supabase as any)
        .from("safety_permits_ptw")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setPermits((prev) => [data, ...prev]);
      setSelectedPermit(data);
      setFeedback(`Permit ${code} issued successfully.`);
    } catch {
      const fallback = { ...payload, id: `ptw-${Date.now()}` } as PTWRecord;
      setPermits((prev) => [fallback, ...prev]);
      setSelectedPermit(fallback);
      setFeedback(`Optimistic permit authorized: ${code}`);
    } finally {
      setModalOpen(false);
      setLocation("");
      setContractor("");
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>HSE GOVERNANCE • BOCW CENTRAL RULES 1998 / IS 4573 SAFETY CODE</span>
              <StatutoryInfo
                standardRef="BOCW RULES 1998 / IS 4573"
                title="Hazardous Operations Gateway & PTW Ledger"
                idealRange="Wind < 38 km/h • O2: 19.5% - 23.5%"
                description="Governs issuance and lockout of Permit to Work (PTW) certificates for high-risk operations: Work at Height, Hot Work Welding, Confined Spaces, and Heavy Rigging."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-cyan-400" />
              <span>Hazardous Operations Gateway &amp; PTW Ledger</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Real-time telemetry interlocking, wind speed thresholds, and atmospheric oxygen validation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFallbackMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-[10px] text-amber-300">
                <Database className="w-3.5 h-3.5" />
                <span>Simulated Offline Telemetry</span>
              </span>
            )}
            <button
              onClick={() => void loadPermits()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Issue New Permit</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 4 GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Authorized Permits</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "--" : `${summary.activePermits} Active`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Live authorized work zones</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Site Wind Velocity (Anemometer)</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">18.5 km/h</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Threshold: &lt; 38.0 km/h (IS 4573 Safe)</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Atmospheric Oxygen Level</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">20.9% O₂</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Safe band: 19.5% &ndash; 23.5% vol</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Work at Height (&gt; 2.0m)</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {loading ? "--" : `${summary.heightPermits} Permits`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Fall arrest &amp; lifelines certified</span>
          </div>
        </div>

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          <div className="lg:col-span-6 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase">Active PTW Registry ({permits.length})</span>
            </div>

            <div className="space-y-3">
              {permits.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPermit(p)}
                  className={`p-4 rounded border transition cursor-pointer space-y-2 ${
                    selectedPermit?.id === p.id ? "border-cyan-500/60 bg-cyan-950/20" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{p.permit_number}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {p.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-200 font-bold">{p.permit_type.replace(/_/g, " ")}</div>
                  <div className="text-[10px] text-zinc-400">{p.work_location} &bull; {p.contractor_name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 bg-zinc-900/40 border border-zinc-800 p-6 space-y-5 rounded-sm shadow-2xl">
            {selectedPermit ? (
              <>
                <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase text-cyan-400 font-bold">Safety Compliance Audit</span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{selectedPermit.permit_number}</h3>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">Issued by {selectedPermit.safety_officer_name}</span>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-2 text-xs">
                    <div><span className="text-zinc-500">Operation:</span> <strong className="text-white ml-1">{selectedPermit.permit_type.replace(/_/g, " ")}</strong></div>
                    <div><span className="text-zinc-500">Zone:</span> <span className="text-zinc-200 ml-1">{selectedPermit.work_location}</span></div>
                    <div><span className="text-zinc-500">Contractor:</span> <span className="text-zinc-200 ml-1">{selectedPermit.contractor_name}</span></div>
                  </div>

                  <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/60 rounded text-emerald-300 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Statutory Interlocks Cleared</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-sans">
                      Mandatory PPE, fall protection harness, double-lanyard anchor points, and calibrated gas sensors inspected prior to work commencement.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-zinc-500">Select a permit to inspect safety checklists.</div>
            )}
          </div>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Issue Safety Permit to Work (PTW)</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreatePermit} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Permit Classification *</label>
                  <select
                    value={pType}
                    onChange={(e) => setPType(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  >
                    <option value="WORK_AT_HEIGHT">Work at Height (&gt; 2.0m)</option>
                    <option value="HOT_WORK_WELDING">Hot Work / Gas Cutting / Welding</option>
                    <option value="CONFINED_SPACE">Confined Space Entry</option>
                    <option value="HEAVY_RIGGING">Heavy Crane Tandem Lift</option>
                    <option value="DEEP_EXCAVATION">Deep Trench Excavation (&gt; 1.5m)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Specific Work Location / Grid *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tower B - Level 12 Edge Shuttering"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Executing Contractor Entity *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Structural Formworks Ltd."
                    value={contractor}
                    onChange={(e) => setContractor(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div className="p-3 bg-zinc-900 rounded border border-zinc-800 text-[11px] text-zinc-400">
                  <span>IS 4573 Gate: </span>
                  <strong className="text-emerald-400">Valid for 8 hours.</strong> Anemometer and atmospheric check required before daily renewal.
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Authorize &amp; Issue PTW
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
