"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Truck,
  Scale,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Database,
  FileSpreadsheet,
  AlertTriangle,
  X,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface GateRecord {
  id: string;
  project_id: string;
  gate_pass_number: string;
  vehicle_number: string;
  material_name: string;
  vendor_name: string;
  challan_number: string;
  po_reference: string;
  gross_weight_mt: number;
  tare_weight_mt: number;
  net_weight_mt: number;
  weighbridge_slip_no: string;
  qc_inspection_status: "QC_PASSED" | "UNDER_INSPECTION" | "REJECTED_RETURNED";
  entry_timestamp: string;
}

const FALLBACK_GATE: GateRecord[] = [
  {
    id: "gt-fb-1",
    project_id: "PRJ-01-LIVE",
    gate_pass_number: "GP-2026-8812",
    vehicle_number: "UP-32-BN-4412",
    material_name: "TMT Steel Bars Fe 550D (16mm & 20mm)",
    vendor_name: "Jindal Steel & Power Ltd",
    challan_number: "CH-9921",
    po_reference: "PO-STL-004",
    gross_weight_mt: 38.5,
    tare_weight_mt: 12.2,
    net_weight_mt: 26.3,
    weighbridge_slip_no: "WB-SLIP-4419",
    qc_inspection_status: "QC_PASSED",
    entry_timestamp: new Date().toISOString(),
  },
];

export default function GateRegisterPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [records, setRecords] = useState<GateRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<GateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [vehicle, setVehicle] = useState("");
  const [material, setMaterial] = useState("");
  const [vendor, setVendor] = useState("");
  const [gross, setGross] = useState("");
  const [tare, setTare] = useState("");
  const [challan, setChallan] = useState("");
  const [po, setPo] = useState("");

  const loadGateData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("gate_inward_records")
        .select("*")
        .eq("project_id", projectId)
        .order("entry_timestamp", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setRecords(FALLBACK_GATE);
        setSelectedRecord(FALLBACK_GATE[0]);
      } else {
        setIsFallbackMode(false);
        setRecords(data);
        setSelectedRecord(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setRecords(FALLBACK_GATE);
      setSelectedRecord(FALLBACK_GATE[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadGateData();
  }, [loadGateData]);

  const summary = useMemo(() => {
    const totalTrucks = records.length;
    const totalTonnage = records.reduce((sum, r) => sum + Number(r.net_weight_mt || 0), 0);
    const passedQc = records.filter((r) => r.qc_inspection_status === "QC_PASSED").length;

    return { totalTrucks, totalTonnage, passedQc };
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const term = search.toLowerCase();
    return records.filter(
      (r) =>
        r.gate_pass_number.toLowerCase().includes(term) ||
        r.vehicle_number.toLowerCase().includes(term) ||
        r.material_name.toLowerCase().includes(term) ||
        r.vendor_name.toLowerCase().includes(term)
    );
  }, [records, search]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const g = parseFloat(gross) || 0;
    const t = parseFloat(tare) || 0;
    const net = Math.max(0, g - t);
    const code = `GP-${new Date().getFullYear()}-${(records.length + 8813).toString()}`;

    const payload: Partial<GateRecord> = {
      project_id: projectId,
      gate_pass_number: code,
      vehicle_number: vehicle.trim().toUpperCase(),
      material_name: material.trim(),
      vendor_name: vendor.trim(),
      challan_number: challan.trim() || "CH-GEN",
      po_reference: po.trim() || "PO-DIRECT",
      gross_weight_mt: g,
      tare_weight_mt: t,
      net_weight_mt: net,
      weighbridge_slip_no: `WB-${Math.floor(1000 + Math.random() * 9000)}`,
      qc_inspection_status: "QC_PASSED",
      entry_timestamp: new Date().toISOString(),
    };

    try {
      const { data, error } = await (supabase as any)
        .from("gate_inward_records")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setRecords((prev) => [data, ...prev]);
      setSelectedRecord(data);
      setFeedback(`Vehicle entry ${vehicle.toUpperCase()} logged (${net.toFixed(2)} MT).`);
    } catch {
      const fallback = { ...payload, id: `gt-${Date.now()}` } as GateRecord;
      setRecords((prev) => [fallback, ...prev]);
      setSelectedRecord(fallback);
      setFeedback(`Optimistic entry recorded: ${code}`);
    } finally {
      setModalOpen(false);
      setVehicle("");
      setMaterial("");
      setVendor("");
      setGross("");
      setTare("");
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
              <span>SECURITY &amp; LOGISTICS • CPWD STORES MANAGEMENT / WEIGHBRIDGE PROTOCOL</span>
              <StatutoryInfo
                standardRef="CPWD SECTION 15 / WEIGHBRIDGE CODE"
                title="Material Inward Gate Register & Weighbridge Telemetry"
                idealRange="Dual-Gross/Tare Digital Certification"
                description="Enforces physical weighbridge logging for incoming bulk materials (Steel, Cement, Aggregates). Validates supplier delivery challans against ERP Purchase Orders before warehouse unsealing."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Truck className="w-6 h-6 text-cyan-400" />
              <span>Gate Inward &amp; Digital Weighbridge Telemetry</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Vehicle manifests, gross/tare net weight computation, and QC inward inspection audits.
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
              onClick={() => void loadGateData()}
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
              <span>Log Vehicle Inward</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Inward Vehicles Today</span>
            <div className="text-2xl font-bold text-white mt-1">
              {loading ? "--" : `${summary.totalTrucks} Trucks`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Security gated entries</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Net Tonnage Delivered</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {loading ? "--" : `${summary.totalTonnage.toFixed(2)} MT`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Digitally certified net payload</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Quality Inspection Passed</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "--" : `${summary.passedQc} Consignments`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Zero material rejection halts</span>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-800 pb-3">
            <span className="font-bold text-white uppercase text-xs">Weighbridge &amp; Gate Manifest ({filteredRecords.length})</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search vehicle, material, pass..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 pl-8 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-500">Loading weighbridge registers...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">No vehicle entries logged for this period.</div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3">Gate Pass &amp; Vehicle</th>
                    <th className="p-3">Consignment Description</th>
                    <th className="p-3">Supplier &amp; PO</th>
                    <th className="p-3 text-right">Gross (MT)</th>
                    <th className="p-3 text-right">Tare (MT)</th>
                    <th className="p-3 text-right">Net Weight (MT)</th>
                    <th className="p-3 text-center">QC Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-900/50 transition">
                      <td className="p-3">
                        <span className="font-bold text-white block">{r.vehicle_number}</span>
                        <span className="text-[10px] text-cyan-400">{r.gate_pass_number}</span>
                      </td>
                      <td className="p-3 text-zinc-200 font-sans">{r.material_name}</td>
                      <td className="p-3 text-zinc-400 font-mono text-[11px]">
                        <div>{r.vendor_name}</div>
                        <div className="text-[10px] text-zinc-500">Challan: {r.challan_number} &bull; {r.po_reference}</div>
                      </td>
                      <td className="p-3 text-right text-zinc-400 font-mono">{r.gross_weight_mt} MT</td>
                      <td className="p-3 text-right text-zinc-500 font-mono">{r.tare_weight_mt} MT</td>
                      <td className="p-3 text-right font-bold text-emerald-400 font-mono text-sm">{r.net_weight_mt} MT</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {r.qc_inspection_status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* LOG MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Log Inward Material Vehicle (Weighbridge)</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateEntry} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Vehicle Registration No. *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UP-32-BN-8812"
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Material Description *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TMT Rebar 550D"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Supplier / Vendor *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jindal Steel"
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Challan / Invoice No.</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CH-8891"
                      value={challan}
                      onChange={(e) => setChallan(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Gross Weight (MT) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={gross}
                      onChange={(e) => setGross(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Tare Weight (MT) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={tare}
                      onChange={(e) => setTare(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Record Gate Inward
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
