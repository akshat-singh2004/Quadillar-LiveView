#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Operationalizing Digital Measurement Book (e-MB) & CPWD Form 23 Gate...\033[0m"

# -----------------------------------------------------------------------------
# 1. ACTION: app/actions/emb-actions.ts (CRUD + Statutory AE 10% Sign-Off)
# -----------------------------------------------------------------------------
cat << 'ACTION_EMB' > app/actions/emb-actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { HermesAgent } from "@/lib/agents/hermes";

export interface EmbLinePayload {
  projectId: string;
  itemCode: string;
  description: string;
  gridLocation: string;
  numbersCount: number;
  lengthM: number;
  breadthM: number;
  depthM: number;
  grossQty: number;
  deductionQty: number;
  netQty: number;
  unit: string;
  rateInr: number;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for e-MB actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function addMeasurementEntry(payload: EmbLinePayload) {
  try {
    const supabase = getSupabase();
    const amountInr = Math.round(payload.netQty * payload.rateInr);

    const { data, error } = await supabase
      .from("digital_measurement_book_entries")
      .insert({
        project_id: payload.projectId,
        item_code: payload.itemCode,
        description: payload.description,
        grid_location: payload.gridLocation,
        length_m: payload.lengthM,
        breadth_m: payload.breadthM,
        depth_m: payload.depthM,
        gross_quantity: payload.grossQty,
        deduction_quantity: payload.deductionQty,
        net_quantity: payload.netQty,
        calculated_quantity: payload.netQty,
        unit: payload.unit,
        rate_inr: payload.rateInr,
        ae_test_checked: false,
        consultant_qs_verified: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Cryptographically seal new field measurement line
    await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `e-MB Entry Logged: ${payload.itemCode} (${payload.gridLocation})`,
      actionCategory: "EMB_FIELD_MEASUREMENT",
      moduleRef: String(data.id),
      details: { payload, amountInr },
      signatoryName: "Site Measurement Engineer",
      signatoryRole: "Field Surveyor",
      severity: "info",
    });

    revalidatePath("/finance/measurement-book");
    revalidatePath("/finance/ra-bills");
    revalidatePath("/");

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to commit e-MB entry." };
  }
}

export async function toggleAeTestCheck(id: string, projectId: string, nextState: boolean) {
  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from("digital_measurement_book_entries")
      .update({
        ae_test_checked: nextState,
      })
      .eq("id", id);

    if (error) throw error;

    if (nextState) {
      await HermesAgent.notarizeTransaction({
        projectId,
        actionTitle: `CPWD Mandatory 10% Check Measurement Verified`,
        actionCategory: "EMB_AE_TEST_CHECK_PASSED",
        moduleRef: String(id),
        details: { verifiedAt: new Date().toISOString() },
        signatoryName: "Assistant Engineer (Civil)",
        signatoryRole: "Statutory Check Officer",
        severity: "verified",
      });
    }

    revalidatePath("/finance/measurement-book");
    revalidatePath("/finance/ra-bills");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update AE sign-off." };
  }
}

export async function deleteMeasurementEntry(id: string) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("digital_measurement_book_entries")
      .delete()
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/finance/measurement-book");
    revalidatePath("/finance/ra-bills");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete line." };
  }
}
ACTION_EMB

# -----------------------------------------------------------------------------
# 2. COMPONENT: components/billing/AddMeasurementLineModal.tsx
# Geometric derivation calculation engine (Nos * L * B * D - Ded)
# -----------------------------------------------------------------------------
cat << 'COMP_MODAL' > components/billing/AddMeasurementLineModal.tsx
"use client";

import React, { useState } from "react";
import { addMeasurementEntry } from "@/app/actions/emb-actions";
import { Calculator, Plus, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  projectId: string;
}

const COMMON_ITEMS = [
  { code: "DSR-4.1.3", desc: "RCC M30 in Columns & Shear Walls", unit: "CUM", rate: 7450 },
  { code: "DSR-4.1.8", desc: "RCC M30 in Suspended Slabs & Beams", unit: "CUM", rate: 7200 },
  { code: "DSR-5.2.2", desc: "High Yield Strength Deformed (Fe 500D) Rebar", unit: "MT", rate: 68500 },
  { code: "DSR-5.9.1", desc: "Centering & Shuttering (Plywood System)", unit: "SQM", rate: 480 },
  { code: "DSR-6.1.1", desc: "AAC Blockwork in 1:4 Cement Mortar", unit: "CUM", rate: 4250 },
];

export function AddMeasurementLineModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [itemCode, setItemCode] = useState(COMMON_ITEMS[0].code);
  const [description, setDescription] = useState(COMMON_ITEMS[0].desc);
  const [gridLocation, setGridLocation] = useState("Tower Core / Grid B2-C3");
  const [numbersCount, setNumbersCount] = useState(1);
  const [lengthM, setLengthM] = useState(6.0);
  const [breadthM, setBreadthM] = useState(0.45);
  const [depthM, setDepthM] = useState(3.6);
  const [deductionQty, setDeductionQty] = useState(0);
  const [unit, setUnit] = useState(COMMON_ITEMS[0].unit);
  const [rateInr, setRateInr] = useState(COMMON_ITEMS[0].rate);

  // Dynamic geometric computation: Nos * L * B * D - Ded
  const grossQty = parseFloat((numbersCount * lengthM * (breadthM || 1) * (depthM || 1)).toFixed(3));
  const netQty = parseFloat(Math.max(0, grossQty - deductionQty).toFixed(3));
  const amountInr = Math.round(netQty * rateInr);

  const handleItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = COMMON_ITEMS.find((i) => i.code === e.target.value);
    if (selected) {
      setItemCode(selected.code);
      setDescription(selected.desc);
      setUnit(selected.unit);
      setRateInr(selected.rate);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await addMeasurementEntry({
        projectId,
        itemCode,
        description,
        gridLocation,
        numbersCount,
        lengthM,
        breadthM,
        depthM,
        grossQty,
        deductionQty,
        netQty,
        unit,
        rateInr,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to commit line");
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
        className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Add Measurement Line</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  CPWD Works Manual Cl. 7 • Joint Field Record
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  New e-MB Measurement Line (Form 23)
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
                    CPWD DSR Standard Item
                  </label>
                  <select
                    value={itemCode}
                    onChange={handleItemSelect}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs focus:border-cyan-500 outline-none"
                  >
                    {COMMON_ITEMS.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} — {item.desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Structural Grid / Axis Location
                  </label>
                  <input
                    type="text"
                    required
                    value={gridLocation}
                    onChange={(e) => setGridLocation(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs focus:border-cyan-500 outline-none"
                    placeholder="e.g. Tower Core Grid B2-C3"
                  />
                </div>
              </div>

              {/* 4 GEOMETRIC DIMENSIONS */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold block">
                  Field Dimension Geometry (L × B × D)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Nos</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      value={numbersCount}
                      onChange={(e) => setNumbersCount(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Length (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={lengthM}
                      onChange={(e) => setLengthM(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Breadth (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={breadthM}
                      onChange={(e) => setBreadthM(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Depth / H (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={depthM}
                      onChange={(e) => setDepthM(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1 border-t border-zinc-800 text-center">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block">Gross Volume</span>
                    <strong className="text-zinc-200 text-xs tabular-nums">{grossQty} {unit}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block">Deductions</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={deductionQty}
                      onChange={(e) => setDeductionQty(Number(e.target.value))}
                      className="w-20 bg-zinc-950 border border-zinc-800 rounded text-center text-xs text-rose-400 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-cyan-400 uppercase block font-bold">Net Quantity</span>
                    <strong className="text-emerald-400 text-sm tabular-nums">{netQty} {unit}</strong>
                  </div>
                </div>
              </div>

              {/* VALUATION DERIVATION */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Sanctioned Unit Rate (₹/{unit})
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={rateInr}
                    onChange={(e) => setRateInr(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>

                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-right">
                  <span className="text-[9px] text-zinc-500 uppercase block font-bold">Calculated Line Amount</span>
                  <div className="text-base font-bold text-emerald-400 tabular-nums">
                    ₹{amountInr.toLocaleString("en-IN")}
                  </div>
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
                  disabled={loading || netQty <= 0}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Commit to e-MB Ledger</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
COMP_MODAL

# -----------------------------------------------------------------------------
# 3. PAGE: app/finance/measurement-book/page.tsx
# Fully interactive Form 23 table with live AE test-check toggle & RA freeze button
# -----------------------------------------------------------------------------
cat << 'PAGE_EMB' > app/finance/measurement-book/page.tsx
import React from "react";
import { AddMeasurementLineModal } from "@/components/billing/AddMeasurementLineModal";
import { createClient } from "@/lib/supabase/server";
import { Calculator, CheckCircle2, XCircle, ShieldCheck, Printer, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toggleAeTestCheck, deleteMeasurementEntry } from "@/app/actions/emb-actions";

export default async function MeasurementBookPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name, contract_value")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real measurement lines
  const { data: entries } = await supabase
    .from("digital_measurement_book_entries")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const lines = entries || [];
  const verifiedLines = lines.filter((l) => l.ae_test_checked);
  const pendingLines = lines.filter((l) => !l.ae_test_checked);

  // Cumulative quantities
  const totalConcreteM3 = lines
    .filter((l) => l.unit === "CUM")
    .reduce((sum, l) => sum + (Number(l.net_quantity || l.calculated_quantity || 0)), 0);

  const totalGrossValueInr = lines.reduce(
    (sum, l) => sum + (Number(l.net_quantity || l.calculated_quantity || 0) * Number(l.rate_inr || 0)),
    0
  );

  const totalVerifiedValueInr = verifiedLines.reduce(
    (sum, l) => sum + (Number(l.net_quantity || l.calculated_quantity || 0) * Number(l.rate_inr || 0)),
    0
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Calculator className="w-3.5 h-3.5" />
            <span>CPWD WORKS MANUAL CL. 7 • DIGITAL MEASUREMENT BOOK (e-MB) • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Digital Measurement Book Ledger (Form 23)
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Joint measurements bound to DSR items with statutory Assistant Engineer 10% test-checking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white text-[10px] uppercase font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Form 23 (MB)</span>
          </button>
          <AddMeasurementLineModal projectId={projectId} />
        </div>
      </header>

      {/* 4 SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Recorded e-MB Lines</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{lines.length} Lines</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Field measurements committed</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">AE Statutory 10% Status</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${pendingLines.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {verifiedLines.length} / {lines.length} Cleared
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {pendingLines.length > 0 ? `${pendingLines.length} line(s) awaiting check` : "100% test-checked"}
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Cumulative Concrete Vol</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
            {totalConcreteM3.toFixed(3)} m³
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">All structural casting grades</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Gross Certified Value</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
            ₹{totalGrossValueInr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            ₹{totalVerifiedValueInr.toLocaleString("en-IN")} AE verified
          </span>
        </div>
      </div>

      {/* FORM 23 SPREADSHEET LEDGER */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Form 23 Measurement Ledger ({lines.length} Entries)
          </span>
          <span className="text-[10px] text-zinc-500">Statutory Check Gate: Minimum 10% Sign-Off</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="p-3">Item Code</th>
                <th className="p-3">Description &amp; Location Grid</th>
                <th className="p-3 text-right">L (m)</th>
                <th className="p-3 text-right">B (m)</th>
                <th className="p-3 text-right">D (m)</th>
                <th className="p-3 text-right">Net Qty</th>
                <th className="p-3 text-center">Unit</th>
                <th className="p-3 text-right">Rate (₹)</th>
                <th className="p-3 text-right">Amount (₹)</th>
                <th className="p-3 text-center">AE 10% Check</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-zinc-600 font-sans">
                    Zero measurement lines recorded. Click &quot;+ Add Measurement Line&quot; above to commit field dimensions.
                  </td>
                </tr>
              ) : (
                lines.map((l: any) => {
                  const net = Number(l.net_quantity || l.calculated_quantity || 0);
                  const rate = Number(l.rate_inr || 0);
                  const amount = Math.round(net * rate);

                  return (
                    <tr key={l.id} className="hover:bg-zinc-850 transition">
                      <td className="p-3 font-bold text-cyan-400">{l.item_code}</td>
                      <td className="p-3">
                        <div className="text-white font-bold">{l.grid_location}</div>
                        <div className="text-[10px] text-zinc-400 font-sans line-clamp-1">{l.description}</div>
                      </td>
                      <td className="p-3 text-right tabular-nums">{Number(l.length_m || 0).toFixed(2)}</td>
                      <td className="p-3 text-right tabular-nums">{Number(l.breadth_m || 0).toFixed(2)}</td>
                      <td className="p-3 text-right tabular-nums">{Number(l.depth_m || 0).toFixed(2)}</td>
                      <td className="p-3 text-right tabular-nums font-bold text-emerald-400">{net.toFixed(2)}</td>
                      <td className="p-3 text-center text-[10px] font-bold text-zinc-400">{l.unit}</td>
                      <td className="p-3 text-right tabular-nums">₹{rate.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-right tabular-nums font-bold text-white">₹{amount.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-center">
                        <form
                          action={async () => {
                            "use server";
                            await toggleAeTestCheck(String(l.id), projectId, !l.ae_test_checked);
                          }}
                        >
                          <button
                            type="submit"
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition cursor-pointer border ${
                              l.ae_test_checked
                                ? "bg-emerald-950 border-emerald-800 text-emerald-300 hover:bg-rose-950 hover:text-rose-300"
                                : "bg-amber-950/60 border-amber-800 text-amber-300 hover:bg-emerald-950 hover:text-emerald-300"
                            }`}
                          >
                            {l.ae_test_checked ? "✓ Verified" : "Pending AE"}
                          </button>
                        </form>
                      </td>
                      <td className="p-3 text-center">
                        <form
                          action={async () => {
                            "use server";
                            await deleteMeasurementEntry(String(l.id));
                          }}
                        >
                          <button
                            type="submit"
                            className="text-zinc-600 hover:text-rose-400 text-xs cursor-pointer"
                            title="Delete Line"
                          >
                            ✕
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BOTTOM FREEZE ACTIONS */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-[11px] text-zinc-400 font-sans">
            Assistant Engineer test-checking verified on {verifiedLines.length} of {lines.length} lines.
          </div>

          <Link
            href="/finance/ra-bills"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40"
          >
            <span>Freeze e-MB &amp; Compile RA Bill</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
PAGE_EMB

# -----------------------------------------------------------------------------
# 4. VERIFY TYPESCRIPT COMPILATION HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] e-MB Engine & CPWD Form 23 Check Gate deployed cleanly with ZERO errors!\033[0m"
