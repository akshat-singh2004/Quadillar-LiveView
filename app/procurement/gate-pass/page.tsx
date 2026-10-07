"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Truck,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Database,
  ArrowRight,
  ShieldCheck,
  X,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface GatePassRecord {
  id: string;
  project_id: string;
  pass_number: string;
  pass_type: "RETURNABLE_RGP" | "NON_RETURNABLE_NRGP";
  dispatch_date: string;
  destination: string;
  recipient_entity: string;
  carrier_vehicle_no: string;
  item_description: string;
  quantity_dispatched: number;
  unit: string;
  expected_return_date?: string | null;
  status: "DISPATCHED_ACTIVE" | "RETURNED_CLOSED" | "OVERDUE";
}

const FALLBACK_PASSES: GatePassRecord[] = [
  {
    id: "gp-fb-1",
    project_id: "PRJ-01-LIVE",
    pass_number: "GP-RGP-2026-001",
    pass_type: "RETURNABLE_RGP",
    dispatch_date: new Date().toISOString().slice(0, 10),
    destination: "OEM Central Workshop Okhla",
    recipient_entity: "Potain Crane Services",
    carrier_vehicle_no: "UP-32-DN-9912",
    item_description: "Tower Crane Hoist Motor Assembly for Diagnostic Calibration",
    quantity_dispatched: 1,
    unit: "Set",
    expected_return_date: "2026-10-15",
    status: "DISPATCHED_ACTIVE",
  },
];

export default function ProcurementGatePassPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [passes, setPasses] = useState<GatePassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [pType, setPType] = useState<GatePassRecord["pass_type"]>("RETURNABLE_RGP");
  const [desc, setDesc] = useState("");
  const [recipient, setRecipient] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("Nos");

  const loadPasses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("procurement_gate_passes")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setPasses(FALLBACK_PASSES);
      } else {
        setIsFallbackMode(false);
        setPasses(data);
      }
    } catch {
      setIsFallbackMode(true);
      setPasses(FALLBACK_PASSES);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadPasses();
  }, [loadPasses]);

  const summary = useMemo(() => {
    const total = passes.length;
    const rgpActive = passes.filter((p) => p.pass_type === "RETURNABLE_RGP" && p.status === "DISPATCHED_ACTIVE").length;
    return { total, rgpActive };
  }, [passes]);

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || !recipient.trim()) return;

    const code = `GP-${pType === "RETURNABLE_RGP" ? "RGP" : "NRGP"}-${new Date().getFullYear()}-${(passes.length + 1).toString().padStart(3, "0")}`;
    const payload: Partial<GatePassRecord> = {
      project_id: projectId,
      pass_number: code,
      pass_type: pType,
      dispatch_date: new Date().toISOString().slice(0, 10),
      destination: "Vendor Repair Facility",
      recipient_entity: recipient.trim(),
      carrier_vehicle_no: vehicle.trim().toUpperCase() || "SITE-DISPATCH",
      item_description: desc.trim(),
      quantity_dispatched: parseFloat(qty) || 1,
      unit: unit.trim(),
      expected_return_date: pType === "RETURNABLE_RGP" ? "2026-10-30" : null,
      status: "DISPATCHED_ACTIVE",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("procurement_gate_passes")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setPasses((prev) => [data, ...prev]);
      setFeedback(`Gate Pass ${code} registered successfully.`);
    } catch {
      const fallback = { ...payload, id: `gp-${Date.now()}` } as GatePassRecord;
      setPasses((prev) => [fallback, ...prev]);
      setFeedback(`Optimistic Gate Pass created: ${code}`);
    } finally {
      setModalOpen(false);
      setDesc("");
      setRecipient("");
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
              <span>SUPPLY CHAIN &amp; LOGISTICS • CPWD WORKS MANUAL SECTION 15</span>
              <StatutoryInfo
                standardRef="CPWD SECTION 15 / RGP MANDATE"
                title="Material Gate Pass & Returnable Asset Clearance"
                idealRange="Dual Verification Before Gate Exit"
                description="Governs outward dispatch of machinery parts, scaffolding rentals, and tooling. Enforces mandatory tracking and return dates for Returnable Gate Passes (RGP)."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Truck className="w-6 h-6 text-cyan-400" />
              <span>Procurement Gate Pass &amp; Material Dispatch Ledger</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Outward material passes, RGP return reconciliation, and security verification.
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
              onClick={() => void loadPasses()}
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
              <span>Issue Gate Pass</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 2 SUMMARY TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Dispatches Logged</span>
            <div className="text-2xl font-bold text-white mt-1">{passes.length} Passes</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Active outbound material log</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Returnable Passes (RGP)</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{summary.rgpActive} Items Outstanding</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Awaiting return to site store</span>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
            Gate Pass Dispatch Roster ({passes.length})
          </span>

          <div className="overflow-x-auto border border-zinc-800 text-xs">
            <table className="w-full text-left">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                <tr>
                  <th className="p-3">Gate Pass Ref</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3">Recipient &amp; Vehicle</th>
                  <th className="p-3 text-right">Quantity</th>
                  <th className="p-3">Expected Return</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                {passes.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-900/50 transition">
                    <td className="p-3 font-bold text-white">
                      <span>{p.pass_number}</span>
                      <span className="text-[10px] text-cyan-400 block">{p.pass_type.replace(/_/g, " ")}</span>
                    </td>
                    <td className="p-3 text-zinc-200 font-sans">{p.item_description}</td>
                    <td className="p-3 text-zinc-400">
                      <div>{p.recipient_entity}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{p.carrier_vehicle_no}</div>
                    </td>
                    <td className="p-3 text-right font-bold text-white font-mono">{p.quantity_dispatched} {p.unit}</td>
                    <td className="p-3 font-mono text-zinc-300">{p.expected_return_date || "N/A (Non-Returnable)"}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-cyan-950 text-cyan-400 border border-cyan-800">
                        {p.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Issue Material Gate Pass (Form 15)</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreatePass} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Pass Category</label>
                    <select
                      value={pType}
                      onChange={(e) => setPType(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                    >
                      <option value="RETURNABLE_RGP">Returnable Gate Pass (RGP)</option>
                      <option value="NON_RETURNABLE_NRGP">Non-Returnable Gate Pass (NRGP)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Carrier Vehicle No.</label>
                    <input
                      type="text"
                      placeholder="e.g. UP-32-BN-8812"
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Recipient Vendor / Facility *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Potain Crane Service Workshop"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Dispatched Item Description *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Describe tools, components, or serial numbers..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Quantity</label>
                    <input
                      type="number"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Unit</label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Authorize Gate Pass
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
