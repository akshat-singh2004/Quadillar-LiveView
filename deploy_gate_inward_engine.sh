#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Creating required directory structures...\033[0m"
mkdir -p lib/logistics app/actions components/logistics app/site/gate-inward

echo -e "\033[1;36m[+] Deploying Gate Inward & Digital Weighbridge Telemetry Engine (CPWD Form 31)...\033[0m"

# -----------------------------------------------------------------------------
# 1. ENGINE: lib/logistics/weighbridge-engine.ts
# Pure algorithmic validation for weighbridge gross-tare-net & MTC checks
# -----------------------------------------------------------------------------
cat << 'LIB_WEIGHBRIDGE' > lib/logistics/weighbridge-engine.ts
export interface WeighbridgeIntakeParams {
  challanWeightMt: number;
  grossWeightMt: number;
  tareWeightMt: number;
  materialCategory: string;
  hasMtcCertificate: boolean;
}

export interface WeighbridgeVerificationResult {
  netWeightMt: number;
  varianceMt: number;
  variancePct: number;
  isToleranceAcceptable: boolean; // Variance <= 0.5% (Legal Metrology standard)
  isDisputeRequired: boolean;     // 0.5% < Variance <= 2.5%
  isVehicleDiverted: boolean;     // Variance > 2.5% or Missing MTC for primary materials
  status: "CLEARED_UNLOADED" | "REJECTED_DIVERTED" | "VARIANCE_DEBIT_FLAG";
  rejectionReason?: string;
  verdict: string;
}

export class WeighbridgeEngine {
  /**
   * Evaluates Weighbridge ticket per CPWD Works Manual Cl. 13 & Legal Metrology Rules:
   * - Net Weight = Gross Weight - Tare Weight
   * - Variance = |Net Weight - Challan Weight| / Challan Weight * 100%
   * - Rejection if Variance > 2.5% or MTC missing for structural steel/cement
   */
  static verifyConsignment(params: WeighbridgeIntakeParams): WeighbridgeVerificationResult {
    const netWeightMt = parseFloat(Math.max(0, params.grossWeightMt - params.tareWeightMt).toFixed(3));
    const varianceMt = parseFloat((netWeightMt - params.challanWeightMt).toFixed(3));
    const variancePct = params.challanWeightMt > 0
      ? parseFloat(((Math.abs(varianceMt) / params.challanWeightMt) * 100).toFixed(2))
      : 0;

    const isStructuralPrimary =
      params.materialCategory === "STEEL_REBAR" ||
      params.materialCategory === "STRUCTURAL_STEEL" ||
      params.materialCategory === "CEMENT_BULKER";

    const isMtcCompliant = !isStructuralPrimary || params.hasMtcCertificate;

    let isVehicleDiverted = false;
    let isDisputeRequired = false;
    let isToleranceAcceptable = false;
    let status: WeighbridgeVerificationResult["status"] = "CLEARED_UNLOADED";
    let rejectionReason: string | undefined;

    if (!isMtcCompliant) {
      isVehicleDiverted = true;
      status = "REJECTED_DIVERTED";
      rejectionReason = "MANDATORY MTC MISSING: Structural steel/cement unloading without Mill Test Certificate prohibited under IS 456 Cl. 5.6.";
    } else if (variancePct > 2.5) {
      isVehicleDiverted = true;
      status = "REJECTED_DIVERTED";
      rejectionReason = `WEIGHT VARIANCE BREACH: Discrepancy of ${variancePct}% (${varianceMt} MT) exceeds 2.5% statutory rejection ceiling. Consignment diverted.`;
    } else if (variancePct > 0.5) {
      isDisputeRequired = true;
      status = "VARIANCE_DEBIT_FLAG";
    } else {
      isToleranceAcceptable = true;
    }

    let verdict = `CONSIGNMENT CLEARED: Net payload ${netWeightMt} MT verified within ±0.5% tolerance.`;
    if (isVehicleDiverted) {
      verdict = `CONSIGNMENT DIVERTED: ${rejectionReason}`;
    } else if (isDisputeRequired) {
      verdict = `VARIANCE FLAGGED: Net weight differs by ${variancePct}% (${varianceMt} MT). GRS certified with debit note adjustment.`;
    }

    return {
      netWeightMt,
      varianceMt,
      variancePct,
      isToleranceAcceptable,
      isDisputeRequired,
      isVehicleDiverted,
      status,
      rejectionReason,
      verdict,
    };
  }
}
LIB_WEIGHBRIDGE

# -----------------------------------------------------------------------------
# 2. ACTION: app/actions/gate-inward-actions.ts
# Commits GRS records and notarizes through Hermes
# -----------------------------------------------------------------------------
cat << 'ACTION_GATE' > app/actions/gate-inward-actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { WeighbridgeEngine } from "@/lib/logistics/weighbridge-engine";
import { HermesAgent } from "@/lib/agents/hermes";

export interface InwardTruckPayload {
  projectId: string;
  vehicleNumber: string;
  vendorName: string;
  materialCategory: string;
  challanNumber: string;
  challanWeightMt: number;
  grossWeightMt: number;
  tareWeightMt: number;
  mtcBatchNumber?: string;
  hasMtcCertificate: boolean;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Gate Inward actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function logInwardTruckRecord(payload: InwardTruckPayload) {
  try {
    const supabase = getSupabase();

    // 1. Run algorithmic weighbridge verification
    const evalResult = WeighbridgeEngine.verifyConsignment({
      challanWeightMt: payload.challanWeightMt,
      grossWeightMt: payload.grossWeightMt,
      tareWeightMt: payload.tareWeightMt,
      materialCategory: payload.materialCategory,
      hasMtcCertificate: payload.hasMtcCertificate,
    });

    const now = new Date();
    const grsNumber = `GRS-${now.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    // 2. Commit record into gate_inward_records table
    const { data, error } = await supabase
      .from("gate_inward_records")
      .insert({
        project_id: payload.projectId,
        grs_number: grsNumber,
        vehicle_number: payload.vehicleNumber.toUpperCase(),
        vendor_name: payload.vendorName,
        material_category: payload.materialCategory,
        challan_number: payload.challanNumber,
        challan_weight_mt: payload.challanWeightMt,
        gross_weight_mt: payload.grossWeightMt,
        tare_weight_mt: payload.tareWeightMt,
        net_weight_mt: evalResult.netWeightMt,
        weight_variance_pct: evalResult.variancePct,
        mtc_batch_number: payload.mtcBatchNumber || null,
        mtc_verified: payload.hasMtcCertificate,
        status: evalResult.status,
        rejection_reason: evalResult.rejectionReason || null,
        security_officer: "Security Gate Ingress",
        weighbridge_operator: "Digital Scale Telemetry",
        created_at: now.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Cryptographic Section 65B Audit Trail
    await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Gate Inward GRS Issued: ${grsNumber} [${payload.vehicleNumber}]`,
      actionCategory: "MATERIALS_GATE_INWARD_RECEIPT",
      moduleRef: String(data.id),
      details: { payload, evalResult } as Record<string, unknown>,
      signatoryName: "Agent Argus (Site Telemetry Governor)",
      signatoryRole: "Autonomous Weighbridge Auditor",
      severity: evalResult.isVehicleDiverted ? "warning" : "verified",
    });

    revalidatePath("/site/gate-inward");
    revalidatePath("/materials/reconciliation");
    revalidatePath("/");

    return { success: true, data, evalResult };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to commit gate inward record." };
  }
}
ACTION_GATE

# -----------------------------------------------------------------------------
# 3. MODAL: components/logistics/LogInwardTruckModal.tsx
# Field intake dialog for Gross/Tare weights, Challan variance & MTC checks
# -----------------------------------------------------------------------------
cat << 'COMP_GATE_MODAL' > components/logistics/LogInwardTruckModal.tsx
"use client";

import React, { useState } from "react";
import { logInwardTruckRecord } from "@/app/actions/gate-inward-actions";
import { Truck, Plus, Loader2, Scale, ShieldCheck, ShieldAlert } from "lucide-react";

interface Props {
  projectId: string;
}

const MATERIAL_CATEGORIES = [
  { code: "STEEL_REBAR", label: "Fe 500D TMT Reinforcement Steel (IS 1786)" },
  { code: "CEMENT_BULKER", label: "OPC 53 Grade Cement Bulker (IS 269)" },
  { code: "AGGREGATE_20MM", label: "Coarse Aggregate 20mm (IS 383)" },
  { code: "SAND_ZONE_II", label: "Manufactured Sand Zone II (IS 383)" },
  { code: "RMC_CONCRETE", label: "Ready-Mix Concrete (RMC) Transit Mixer" },
];

export function LogInwardTruckModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [vehicleNumber, setVehicleNumber] = useState("UP-32-BN-8812");
  const [vendorName, setVendorName] = useState("TATA Steel Ltd / Authorized Stockist");
  const [materialCategory, setMaterialCategory] = useState(MATERIAL_CATEGORIES[0].code);
  const [challanNumber, setChallanNumber] = useState("DC-2026-9041");
  const [challanWeightMt, setChallanWeightMt] = useState(25.400);
  const [grossWeightMt, setGrossWeightMt] = useState(38.250);
  const [tareWeightMt, setTareWeightMt] = useState(12.890);
  const [mtcBatchNumber, setMtcBatchNumber] = useState("TATA-HT-44812");
  const [hasMtcCertificate, setHasMtcCertificate] = useState(true);

  // Live net weight & variance preview
  const netWeightPreview = parseFloat(Math.max(0, grossWeightMt - tareWeightMt).toFixed(3));
  const varianceMtPreview = parseFloat((netWeightPreview - challanWeightMt).toFixed(3));
  const variancePctPreview = challanWeightMt > 0
    ? parseFloat(((Math.abs(varianceMtPreview) / challanWeightMt) * 100).toFixed(2))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await logInwardTruckRecord({
        projectId,
        vehicleNumber,
        vendorName,
        materialCategory,
        challanNumber,
        challanWeightMt,
        grossWeightMt,
        tareWeightMt,
        mtcBatchNumber,
        hasMtcCertificate,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to commit weighbridge record.");
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
        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Log Inward Truck</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  CPWD Form 31 • Legal Metrology Act 2009
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Log Weighbridge Inward Ticket
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
                    Vehicle Registration Number
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold uppercase"
                    placeholder="e.g. UP-32-BN-8812"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Vendor / Material Supplier
                  </label>
                  <input
                    type="text"
                    required
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                    placeholder="e.g. TATA Steel / UltraTech"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Material Specification
                  </label>
                  <select
                    value={materialCategory}
                    onChange={(e) => setMaterialCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  >
                    {MATERIAL_CATEGORIES.map((m) => (
                      <option key={m.code} value={m.code}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Delivery Challan Number
                  </label>
                  <input
                    type="text"
                    required
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>
              </div>

              {/* WEIGHBRIDGE METROLOGY DERIVATION (Gross - Tare = Net) */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold block flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  <span>Weighbridge Dual-Pass Telemetry (Gross &amp; Tare)</span>
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Challan Wt (MT)</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={challanWeightMt}
                      onChange={(e) => setChallanWeightMt(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Scale Gross (MT)</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={grossWeightMt}
                      onChange={(e) => setGrossWeightMt(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Scale Tare (MT)</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={tareWeightMt}
                      onChange={(e) => setTareWeightMt(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800 items-center">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block">Measured Net Payload</span>
                    <strong className="text-emerald-400 text-base tabular-nums">{netWeightPreview.toFixed(3)} MT</strong>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-zinc-500 uppercase block">Challan Variance</span>
                    <span className={`text-xs font-bold tabular-nums ${variancePctPreview <= 0.5 ? "text-emerald-400" : variancePctPreview <= 2.5 ? "text-amber-400" : "text-rose-400"}`}>
                      {variancePctPreview}% ({varianceMtPreview >= 0 ? `+${varianceMtPreview}` : varianceMtPreview} MT)
                    </span>
                  </div>
                </div>
              </div>

              {/* MTC QUALITY ATTESTATION */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Mill Test Cert (MTC) Heat / Batch #
                  </label>
                  <input
                    type="text"
                    value={mtcBatchNumber}
                    onChange={(e) => setMtcBatchNumber(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-mono"
                    placeholder="e.g. SAIL-HT-9921"
                  />
                </div>

                <div className="pt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mtcCheck"
                    checked={hasMtcCertificate}
                    onChange={(e) => setHasMtcCertificate(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="mtcCheck" className="text-zinc-300 text-xs select-none cursor-pointer">
                    MTC Attached &amp; IS Verified
                  </label>
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
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generate GRS Form 31</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
COMP_GATE_MODAL

# -----------------------------------------------------------------------------
# 4. PAGE: app/site/gate-inward/page.tsx
# Fully wired Gate Inward view connected to live gate_inward_records
# -----------------------------------------------------------------------------
cat << 'PAGE_GATE' > app/site/gate-inward/page.tsx
import React from "react";
import { LogInwardTruckModal } from "@/components/logistics/LogInwardTruckModal";
import { createClient } from "@/lib/supabase/server";
import { Truck, ShieldCheck, ShieldAlert, Scale, CheckCircle2, XCircle } from "lucide-react";

export default async function GateInwardPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real gate inward records
  const { data: records } = await supabase
    .from("gate_inward_records")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const activeRecords = records || [];

  const totalTonnageInward = activeRecords
    .filter((r) => r.status === "CLEARED_UNLOADED" || r.status === "VARIANCE_DEBIT_FLAG")
    .reduce((sum, r) => sum + (Number(r.net_weight_mt) || 0), 0);

  const rejectedCount = activeRecords.filter((r) => r.status === "REJECTED_DIVERTED").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Truck className="w-3.5 h-3.5" />
            <span>SITE LOGISTICS &amp; INWARD RECONCILIATION • CPWD WORKS MANUAL CL. 13 &amp; FORM 31 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Gate Inward &amp; Digital Weighbridge Telemetry
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Dual-pass weighbridge gross/tare measurement, Legal Metrology tolerance checks &amp; Mill Test Certificate (MTC) audit.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            activeRecords.length > 0 ? "bg-emerald-950 border-emerald-800 text-emerald-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${activeRecords.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
            <span>{activeRecords.length > 0 ? "WEIGHBRIDGE TELEMETRY LINKED" : "WEIGHBRIDGE TELEMETRY UNPAIRED"}</span>
          </span>

          <LogInwardTruckModal projectId={projectId} />
        </div>
      </header>

      {/* 4 STATUTORY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Vehicles Logged</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{activeRecords.length} Trucks</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Dual-pass weighbridge entries</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Tonnage Inward</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
            {totalTonnageInward.toFixed(3)} MT
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Net payload cleared for storage</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Rejected / Diverted</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${rejectedCount > 0 ? "text-rose-400" : "text-zinc-300"}`}>
            {rejectedCount} Vehicles
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {rejectedCount > 0 ? "Variance > 2.5% or Missing MTC" : "Zero vehicles rejected"}
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Legal Metrology Stamping</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">Valid 2026</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Scale tolerance &plusmn;0.5% enforced</span>
        </div>
      </div>

      {/* GRS FORM 31 SPREADSHEET TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Goods Received Sheets (GRS) Ledger ({activeRecords.length})
          </span>
          <span className="text-[10px] text-zinc-500">CPWD Form 31 Statutory Advance Gate</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="p-3">GRS Number</th>
                <th className="p-3">Vehicle #</th>
                <th className="p-3">Vendor / Material</th>
                <th className="p-3 text-right">Challan Wt</th>
                <th className="p-3 text-right">Gross Wt</th>
                <th className="p-3 text-right">Tare Wt</th>
                <th className="p-3 text-right">Net Wt</th>
                <th className="p-3 text-right">Variance</th>
                <th className="p-3 text-center">MTC</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {activeRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-zinc-600 font-sans">
                    Zero inward consignments logged. Click &quot;+ Log Inward Truck&quot; above to record delivery challans and scale weights.
                  </td>
                </tr>
              ) : (
                activeRecords.map((r: any) => {
                  const isRejected = r.status === "REJECTED_DIVERTED";
                  const isDebit = r.status === "VARIANCE_DEBIT_FLAG";

                  return (
                    <tr key={r.id} className="hover:bg-zinc-850 transition">
                      <td className="p-3 font-bold text-cyan-400">{r.grs_number}</td>
                      <td className="p-3 font-bold text-white">{r.vehicle_number}</td>
                      <td className="p-3">
                        <div className="text-zinc-200 font-bold">{r.material_category}</div>
                        <div className="text-[10px] text-zinc-400 font-sans line-clamp-1">{r.vendor_name}</div>
                      </td>
                      <td className="p-3 text-right tabular-nums">{Number(r.challan_weight_mt).toFixed(3)} MT</td>
                      <td className="p-3 text-right tabular-nums">{Number(r.gross_weight_mt).toFixed(3)} MT</td>
                      <td className="p-3 text-right tabular-nums">{Number(r.tare_weight_mt).toFixed(3)} MT</td>
                      <td className="p-3 text-right tabular-nums font-bold text-emerald-400">
                        {Number(r.net_weight_mt).toFixed(3)} MT
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        <span className={`font-bold ${Number(r.weight_variance_pct) <= 0.5 ? "text-emerald-400" : Number(r.weight_variance_pct) <= 2.5 ? "text-amber-400" : "text-rose-400"}`}>
                          {Number(r.weight_variance_pct).toFixed(2)}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          r.mtc_verified ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-rose-950 text-rose-300 border border-rose-800"
                        }`}>
                          {r.mtc_verified ? "Verified" : "Missing"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          isRejected
                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                            : isDebit
                            ? "bg-amber-950 text-amber-300 border border-amber-800"
                            : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
PAGE_GATE

# -----------------------------------------------------------------------------
# 5. VERIFY COMPILATION HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Gate Inward & Digital Weighbridge Telemetry Engine deployed cleanly with ZERO errors!\033[0m"
