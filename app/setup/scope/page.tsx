"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import {
  Box,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  Sliders,
  ArrowRight,
  HardHat,
  Cpu,
  Video,
  ShieldAlert,
  Droplets,
  Radio,
  Plus,
  Trash2,
} from "lucide-react";

interface BoqItem {
  item_code: string;
  description: string;
  discipline: "CIVIL_STR" | "FINISHES" | "MEP";
  unit: string;
  baseline_quantity: number;
  sanctioned_rate: number;
}

export default function StatutoryScopeAndBimPage() {
  const router = useRouter();
  const { project } = useActiveRole();

  const [loading, setLoading] = useState(false);
  const [analyzingModel, setAnalyzingModel] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeProjectId = project?.project_id || project?.id || "";

  // Pure zero-state: empty until actual upload or manual entry
  const [boqItems, setBoqItems] = useState<BoqItem[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Manual entry modal / inputs
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDiscipline, setNewDiscipline] = useState<"CIVIL_STR" | "FINISHES" | "MEP">("CIVIL_STR");
  const [newUnit, setNewUnit] = useState("cum");
  const [newQty, setNewQty] = useState("");
  const [newRate, setNewRate] = useState("");

  // Modular Telemetry Scope Flags
  const [telemetry, setTelemetry] = useState({
    enable_concrete_maturity: true,
    enable_pour_cards: true,
    enable_cube_testing: true,
    enable_crane_radar: false,
    enable_drone_lidar: false,
    enable_biometric_muster: true,
    enable_mep_pressure_test: true,
    enable_ptw_clearance: true,
  });

  // Load existing items from Supabase if already registered
  useEffect(() => {
    async function loadExistingBoq() {
      if (!activeProjectId) return;
      const { data } = await (supabase as any)
        .from("project_boq_items")
        .select("*")
        .eq("project_id", activeProjectId);

      if (data && data.length > 0) {
        setBoqItems(data);
      }
    }
    void loadExistingBoq();
  }, [activeProjectId]);

  // Client-side CSV / Text Parser for genuine BOQ files
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setAnalyzingModel(true);
    setErrorMsg(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

      // Check if CSV format: ItemCode, Description, Discipline, Unit, Qty, Rate
      const parsed: BoqItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length >= 5) {
          parsed.push({
            item_code: cols[0] || `ITEM-${i}`,
            description: cols[1] || "Unspecified Schedule Item",
            discipline: (cols[2] as any) || "CIVIL_STR",
            unit: cols[3] || "nos",
            baseline_quantity: parseFloat(cols[4]) || 0,
            sanctioned_rate: parseFloat(cols[5]) || 0,
          });
        }
      }

      if (parsed.length > 0) {
        setBoqItems(parsed);
      } else {
        // If not a plain CSV, notify user rather than fabricating mock data
        setErrorMsg("File format uploaded without recognizable CSV columns. Add items manually below or upload standard CSV: [Code, Description, Discipline, Unit, Quantity, Rate].");
      }
    } catch {
      setErrorMsg("Failed to parse file text.");
    } finally {
      setAnalyzingModel(false);
    }
  };

  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newDesc || !newQty || !newRate) {
      setErrorMsg("Please fill all BOQ item fields.");
      return;
    }

    const item: BoqItem = {
      item_code: newCode.trim().toUpperCase(),
      description: newDesc.trim(),
      discipline: newDiscipline,
      unit: newUnit.trim(),
      baseline_quantity: parseFloat(newQty) || 0,
      sanctioned_rate: parseFloat(newRate) || 0,
    };

    setBoqItems((prev) => [...prev, item]);
    setNewCode("");
    setNewDesc("");
    setNewQty("");
    setNewRate("");
    setErrorMsg(null);
  };

  const handleRemoveItem = (code: string) => {
    setBoqItems((prev) => prev.filter((i) => i.item_code !== code));
  };

  const handleCommitScopeAndBim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) {
      setErrorMsg("No active project resolved. Please register a project charter first.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (boqItems.length > 0) {
        const formattedBoq = boqItems.map((item) => ({
          ...item,
          project_id: activeProjectId,
          executed_quantity: 0.0,
          is_active: true,
        }));

        const { error: boqError } = await (supabase as any)
          .from("project_boq_items")
          .upsert(formattedBoq, { onConflict: "project_id,item_code" });

        if (boqError) throw boqError;
      }

      const { error: telemetryError } = await (supabase as any)
        .from("project_telemetry_configs")
        .upsert([
          {
            project_id: activeProjectId,
            ...telemetry,
            updated_at: new Date().toISOString(),
          },
        ]);

      if (telemetryError) throw telemetryError;

      await (supabase as any)
        .from("projects")
        .update({ status: "READY_TO_COMMENCE" })
        .eq("project_id", activeProjectId);

      router.push("/setup/ntp");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to commit BOQ scope configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider mb-1">
            <Box className="w-4 h-4" />
            <span>Gate 3 • BOQ Quantification &amp; Telemetry Scope Calibration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Ingest BOQ Quantities &amp; Define Scopes
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Active Scope: <strong className="text-zinc-200">{project?.project_name || "Unassigned"}</strong> • All lines establish the statutory measurement ceiling.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCommitScopeAndBim} className="space-y-6">

          {/* SECTION 1: BOQ INGESTION */}
          <div className="bg-zinc-900/40 border border-zinc-800 p-6 space-y-4">
            <div className="text-xs font-mono font-bold uppercase text-zinc-400 border-b border-zinc-800 pb-2 flex justify-between items-center">
              <span>1. Tender Schedule / BOQ Ingestion</span>
              <span className="text-[10px] text-cyan-400 font-mono">
                {boqItems.length} Items Configured
              </span>
            </div>

            <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950 p-6 text-center relative cursor-pointer">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileSpreadsheet className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <div className="text-xs font-bold text-zinc-300">
                {uploadedFileName || "Upload Sanctioned BOQ Schedule (.CSV)"}
              </div>
              <p className="text-[10px] text-zinc-500 font-mono mt-1">
                CSV format: Item Code, Description, Discipline, Unit, Baseline Quantity, Rate
              </p>
            </div>

            {analyzingModel && (
              <div className="p-3 bg-zinc-950 border border-zinc-800 font-mono text-xs text-cyan-400 flex items-center gap-2 animate-pulse">
                <Cpu className="w-4 h-4 animate-spin" />
                <span>Reading file records...</span>
              </div>
            )}

            {/* MANUAL ENTRY FORM */}
            <div className="bg-zinc-950 p-4 border border-zinc-850 space-y-3">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                + Add Item Manually
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                <input
                  type="text"
                  placeholder="Code (e.g. DSR-01)"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="text"
                  placeholder="Item Description"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="sm:col-span-2 bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="text"
                  placeholder="Unit (cum/sqm/MT)"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Rate ₹"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualItem}
                    className="px-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs"
                    title="Add Line Item"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* TABLE OR ZERO-STATE */}
            {boqItems.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-mono text-xs border border-zinc-850">
                No BOQ lines added yet. Upload a CSV or add items above.
              </div>
            ) : (
              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                    <tr>
                      <th className="p-2.5">Schedule Code</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5">Unit</th>
                      <th className="p-2.5 text-right">Baseline Qty</th>
                      <th className="p-2.5 text-right">Rate (INR)</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                    {boqItems.map((item) => (
                      <tr key={item.item_code}>
                        <td className="p-2.5 font-bold text-cyan-400">{item.item_code}</td>
                        <td className="p-2.5 text-zinc-300 font-sans max-w-md truncate">{item.description}</td>
                        <td className="p-2.5 text-zinc-400 uppercase">{item.unit}</td>
                        <td className="p-2.5 text-right text-white font-bold">{item.baseline_quantity.toLocaleString()}</td>
                        <td className="p-2.5 text-right text-emerald-400">₹{item.sanctioned_rate.toLocaleString()}</td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.item_code)}
                            className="text-zinc-600 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 2: MODULAR TELEMETRY SELECTOR */}
          <div className="bg-zinc-900/40 border border-zinc-800 p-6 space-y-4">
            <div className="text-xs font-mono font-bold uppercase text-zinc-400 border-b border-zinc-800 pb-2 flex justify-between items-center">
              <span>2. Operational Telemetry &amp; Hold-Gate Configuration</span>
              <span className="text-[10px] text-zinc-500 font-mono">Active Verification Gates</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
              <label className="p-3 bg-zinc-950 border border-zinc-800 flex items-start gap-3 cursor-pointer hover:border-zinc-700 transition">
                <input
                  type="checkbox"
                  checked={telemetry.enable_pour_cards}
                  onChange={(e) => setTelemetry({ ...telemetry, enable_pour_cards: e.target.checked })}
                  className="mt-0.5"
                />
                <div>
                  <strong className="text-white block">Pre-Pour Physical Inspection Hold-Gates</strong>
                  <span className="text-[10px] text-zinc-500 font-sans block mt-0.5">
                    Locks concrete pouring operations until Resident SEOR signs cover &amp; shuttering clearance.
                  </span>
                </div>
              </label>

              <label className="p-3 bg-zinc-950 border border-zinc-800 flex items-start gap-3 cursor-pointer hover:border-zinc-700 transition">
                <input
                  type="checkbox"
                  checked={telemetry.enable_cube_testing}
                  onChange={(e) => setTelemetry({ ...telemetry, enable_cube_testing: e.target.checked })}
                  className="mt-0.5"
                />
                <div>
                  <strong className="text-white block">IS 516 Compressive Cube Strength Testing</strong>
                  <span className="text-[10px] text-zinc-500 font-sans block mt-0.5">
                    Enforces 7-day and 28-day characteristic batch compliance before allowing next lift.
                  </span>
                </div>
              </label>

              <label className="p-3 bg-zinc-950 border border-zinc-800 flex items-start gap-3 cursor-pointer hover:border-zinc-700 transition">
                <input
                  type="checkbox"
                  checked={telemetry.enable_mep_pressure_test}
                  onChange={(e) => setTelemetry({ ...telemetry, enable_mep_pressure_test: e.target.checked })}
                  className="mt-0.5"
                />
                <div>
                  <strong className="text-white block">Hydrostatic &amp; Pneumatic MEP Pressure Hold</strong>
                  <span className="text-[10px] text-zinc-500 font-sans block mt-0.5">
                    Locks false ceiling closure until 10-bar pressure test certificate is logged on CDE.
                  </span>
                </div>
              </label>

              <label className="p-3 bg-zinc-950 border border-zinc-800 flex items-start gap-3 cursor-pointer hover:border-zinc-700 transition">
                <input
                  type="checkbox"
                  checked={telemetry.enable_biometric_muster}
                  onChange={(e) => setTelemetry({ ...telemetry, enable_biometric_muster: e.target.checked })}
                  className="mt-0.5"
                />
                <div>
                  <strong className="text-white block">Biometric Labor Muster Integration</strong>
                  <span className="text-[10px] text-zinc-500 font-sans block mt-0.5">
                    Synchronizes turnstile entries with DPR workforce headcount logs.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold font-mono text-xs uppercase tracking-wider flex items-center gap-2 transition disabled:opacity-50"
            >
              <span>{loading ? "Locking Baseline Scope..." : "Save Scope & Proceed to Notice to Proceed"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

      </div>
    </main>
  );
}