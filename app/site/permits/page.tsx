"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
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
  Activity,
  X,
  Lock,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";
import { fetchPTWRecords, submitPTW, togglePTWSuspension, PTWRecord } from "@/app/actions/ptw-actions";

export default function SitePermitsRegistryPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Gomti Nagar Extension Hub";

  const [permits, setPermits] = useState<PTWRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [pType, setPType] = useState("WORK_AT_HEIGHT");
  const [hazardCategory, setHazardCategory] = useState("Height / Scaffolding");
  const [locationZone, setLocationZone] = useState("");
  const [subcontractor, setSubcontractor] = useState("");
  const [durationHours, setDurationHours] = useState("8");
  const [windKmh, setWindKmh] = useState("14.5");
  const [oxygenPct, setOxygenPct] = useState("20.9");
  const [safetyCleared, setSafetyCleared] = useState<"Verified" | "Pending">("Verified");
  const [engineerCleared, setEngineerCleared] = useState<"Verified" | "Pending">("Verified");

  const loadData = async () => {
    setLoading(true);
    const data = await fetchPTWRecords(projectId);
    setPermits(data);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [projectId]);

  const summary = useMemo(() => {
    const activeCount = permits.filter((p) => p.status === "APPROVED_ACTIVE").length;
    const heightCount = permits.filter((p) => p.permit_category.includes("HEIGHT")).length;
    return { activeCount, heightCount, total: permits.length };
  }, [permits]);

  const handleCreatePermit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationZone.trim() || !subcontractor.trim()) {
      setFeedback({ type: "error", text: "Location zone and subcontractor are mandatory." });
      return;
    }

    startTransition(async () => {
      const serialId = `PTW-${new Date().getFullYear()}-${(permits.length + 101).toString().padStart(3, "0")}`;
      const res = await submitPTW(projectId, {
        projectId,
        serialId,
        permitType: pType,
        hazardCategory,
        locationZone: locationZone.trim(),
        subcontractor: subcontractor.trim(),
        durationHours: parseInt(durationHours, 10) || 8,
        windSpeedKmh: parseFloat(windKmh) || 0,
        oxygenLevelPct: parseFloat(oxygenPct) || 20.9,
        safetyOfficerClearance: safetyCleared,
        residentEngineerClearance: engineerCleared,
        safetyChecks: [
          { id: "chk-1", label: "Full body harness and lifeline anchored", passed: true },
          { id: "chk-2", label: "Gas monitor calibrated and within limits", passed: true },
        ],
      });

      if (res.success) {
        setFeedback({ type: "success", text: `Permit ${serialId} authorized & notarized via Hermes.` });
        setModalOpen(false);
        setLocationZone("");
        setSubcontractor("");
        await loadData();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to issue permit." });
      }
    });
  };

  const handleToggleState = (id: string, currentStatus: string) => {
    startTransition(async () => {
      const res = await togglePTWSuspension(id, currentStatus, projectId);
      if (res.success) {
        setFeedback({ type: "success", text: `Permit status updated to ${res.status}.` });
        await loadData();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update permit." });
      }
    });
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono text-xs select-none">
      <div className="max-w-[1650px] mx-auto space-y-6">
        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>FIELD CLEARANCE • IS 4573 / PERMIT TO WORK SAFETY ENVELOPE</span>
              <StatutoryInfo
                standardRef="IS 4573:2020 / BOCW ACT"
                title="Site Permits & Hazardous Operations Enclosure"
                idealRange="Dual Verification Required"
                description="Controls hazardous zone clearances, lockouts, gas concentration measurements, and scaffold inspections before work shifts begin."
              />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 uppercase">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
              <span>Site Permits &amp; Work Clearances</span>
            </h1>
            <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> [{projectId}] • Real-time field clearance, gas sensor validation, and shift renewals.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => void loadData()}
              disabled={loading || isPending}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              disabled={isPending}
              className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase rounded flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue Field Permit</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div
            className={`p-3 border flex items-center justify-between gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
                : "bg-rose-950/80 border-rose-800 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-zinc-200 uppercase text-[10px]">
              Dismiss
            </button>
          </div>
        )}

        {/* 3 SUMMARY METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Authorized Permits</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{summary.activeCount} Live</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Aegis clearance certified</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Work at Height Clearances</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{summary.heightCount} Permits</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Scaffold and fall-arrest audited</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Atmospheric Gas Interlock</span>
            <div className="text-2xl font-bold text-white mt-1">20.9% O₂ Nominal</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Calibrated sensor verification</span>
          </div>
        </div>

        {/* PERMITS TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
            Active Site Permits Registry ({permits.length})
          </span>

          <div className="overflow-x-auto border border-zinc-800 text-xs">
            <table className="w-full text-left">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase">
                <tr>
                  <th className="p-3">Permit Ref</th>
                  <th className="p-3">Classification</th>
                  <th className="p-3">Work Location Zone</th>
                  <th className="p-3">Subcontractor</th>
                  <th className="p-3">Wind / O₂ Telemetry</th>
                  <th className="p-3 text-center">Safety Clearances</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                {permits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-600 font-sans">
                      Zero active site permits issued. Click &quot;Issue Field Permit&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  permits.map((p) => {
                    const isSuspended = p.status === "SUSPENDED";
                    return (
                      <tr key={p.id} className="hover:bg-zinc-900/50 transition">
                        <td className="p-3 font-bold text-white font-mono">{p.permit_number}</td>
                        <td className="p-3 text-cyan-300 font-mono text-[11px]">{p.permit_category.replace(/_/g, " ")}</td>
                        <td className="p-3 text-zinc-300">{p.location_zone}</td>
                        <td className="p-3 text-zinc-400">{p.subcontractor_name}</td>
                        <td className="p-3 font-mono text-zinc-400">
                          {p.wind_speed_kmh} km/h • {p.oxygen_level_pct}% O₂
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-[10px] text-zinc-400">
                            HSE: {p.safety_officer_cleared ? "✓" : "✗"} • RE: {p.engineer_cleared ? "✓" : "✗"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                              p.status === "APPROVED_ACTIVE"
                                ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                                : "bg-rose-950 text-rose-400 border-rose-800"
                            }`}
                          >
                            {p.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleToggleState(p.id, p.status)}
                            className={`px-2 py-1 text-[10px] font-bold uppercase border cursor-pointer ${
                              isSuspended
                                ? "bg-emerald-950 border-emerald-800 text-emerald-300 hover:bg-emerald-900"
                                : "bg-rose-950 border-rose-800 text-rose-300 hover:bg-rose-900"
                            }`}
                          >
                            {isSuspended ? "Re-Activate" : "Suspend (Weather/Hold)"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Issue Statutory Work Permit (IS 4573)</span>
                </span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreatePermit} className="space-y-3">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1 uppercase">Permit Category *</label>
                  <select
                    value={pType}
                    onChange={(e) => setPType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white outline-none"
                  >
                    <option value="WORK_AT_HEIGHT">Work at Height (&gt; 2.0m)</option>
                    <option value="HOT_WORK_WELDING">Hot Work / Welding</option>
                    <option value="CONFINED_SPACE">Confined Space Entry</option>
                    <option value="HEAVY_RIGGING">Heavy Rigging &amp; Tandem Lift</option>
                    <option value="DEEP_EXCAVATION">Deep Trench Excavation</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1 uppercase">Work Location Zone / Structural Grid *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tower A - Level 15 East Deck"
                    value={locationZone}
                    onChange={(e) => setLocationZone(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1 uppercase">Executing Subcontractor *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Falcon Structural RCC Works"
                    value={subcontractor}
                    onChange={(e) => setSubcontractor(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1 uppercase">Wind Speed (km/h)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={windKmh}
                      onChange={(e) => setWindKmh(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1 uppercase">Oxygen Level (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={oxygenPct}
                      onChange={(e) => setOxygenPct(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-zinc-900 rounded border border-zinc-800 text-[10px] text-zinc-400">
                  <span className="text-emerald-400 font-bold uppercase">Aegis Interlock:</span> The permit location will be dynamically cross-checked against active structural NCR liens before activation.
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={isPending} className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer">
                    {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Authorize Permit</span>
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
