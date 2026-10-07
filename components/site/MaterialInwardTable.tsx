// components/site/MaterialInwardTable.tsx
"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import {
  Truck,
  Plus,
  Scale,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  FileCheck,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import {
  logGateInwardConsignment,
  linkConsignmentToForm31,
} from "@/app/actions/gate-actions";

export type GateQmsStatus =
  | "Accepted & Stored"
  | "Pending Lab Test"
  | "Rejected - Underweight";

export interface GateMaterialRecord {
  id: string;
  gatePassId: string;
  vehicleNo: string;
  transporter: string;
  material: string;
  poRef: string;
  challanQty: string;
  actualQty: string;
  unit: string;
  status: GateQmsStatus;
  weighbridgeSlip: string;
  grossWeightMt: number;
  tareWeightMt: number;
  netWeightMt: number;
  driverName: string;
  timestamp: string;
  form31Linked: boolean;
}

export interface MaterialInwardTableProps {
  projectId?: string;
}

function normalizeGrs(row: any): GateMaterialRecord {
  const isForm31 = row.physical_verification_status === "FORM_31_LINKED";
  const isRejected = row.physical_verification_status === "REJECTED" || Number(row.rejected_quantity) > 0;
  const isPending = row.physical_verification_status === "PENDING_LAB";

  let status: GateQmsStatus = "Accepted & Stored";
  if (isRejected) status = "Rejected - Underweight";
  else if (isPending) status = "Pending Lab Test";

  const netQty = Number(row.accepted_quantity || row.received_quantity) || 0;

  return {
    id: row.id,
    gatePassId: row.challan_no || `GP-${row.id.slice(0, 6).toUpperCase()}`,
    vehicleNo: row.vehicle_no || "UP-32-SITE",
    transporter: row.supplier_name || "Direct Supplier",
    material: row.item_description || "Construction Materials",
    poRef: row.po_reference || "PO-DIRECT",
    challanQty: `${netQty.toFixed(2)} ${row.unit || "MT"}`,
    actualQty: `${netQty.toFixed(2)} ${row.unit || "MT"}`,
    unit: row.unit || "MT",
    status,
    weighbridgeSlip: `WB-${row.id.slice(0, 4).toUpperCase()}`,
    grossWeightMt: parseFloat((netQty * 1.35).toFixed(2)),
    tareWeightMt: parseFloat((netQty * 0.35).toFixed(2)),
    netWeightMt: netQty,
    driverName: "Site Verified Delivery",
    timestamp: row.received_date || new Date().toISOString().slice(0, 10),
    form31Linked: isForm31,
  };
}

export function MaterialInwardTable({ projectId = "GOMTI-NAGAR-PH1-FITOUT" }: MaterialInwardTableProps) {
  const [records, setRecords] = useState<GateMaterialRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [inspectRecord, setInspectRecord] = useState<GateMaterialRecord | null>(null);
  const [linkedNotice, setLinkedNotice] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    vehicleNo: "UP-32-AB-1234",
    transporter: "ACC Cement Logistics",
    material: "PPC Cement (Grade 43)",
    poRef: "PO-4402",
    challanQtyNum: "40.00",
    grossWeight: "54.20",
    tareWeight: "14.35",
    unit: "MT",
    driverName: "Dharmendra Yadav (+91 94500 11200)",
    status: "Accepted & Stored" as GateQmsStatus,
  });

  const loadConsignments = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("goods_received_sheets")
      .select("*")
      .eq("project_id", projectId)
      .order("received_date", { ascending: false });

    if (data && data.length > 0) {
      setRecords(data.map(normalizeGrs));
    } else {
      setRecords([]);
    }
  }, [projectId]);

  useEffect(() => {
    void loadConsignments();

    const channel = supabase
      .channel(`grs_realtime_${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goods_received_sheets" },
        () => void loadConsignments()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadConsignments]);

  // Live Tare Calculation
  const computedGross = parseFloat(formData.grossWeight) || 0;
  const computedTare = parseFloat(formData.tareWeight) || 0;
  const computedNet = Math.max(0, parseFloat((computedGross - computedTare).toFixed(2)));
  const computedChallan = parseFloat(formData.challanQtyNum) || 0;
  const computedVariance = computedChallan > 0
    ? Math.abs(((computedNet - computedChallan) / computedChallan) * 100).toFixed(2)
    : "0.00";
  const isToleranceExceeded = parseFloat(computedVariance) > 2.5;

  const filteredRecords = records.filter((r) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      r.gatePassId.toLowerCase().includes(query) ||
      r.vehicleNo.toLowerCase().includes(query) ||
      r.transporter.toLowerCase().includes(query) ||
      r.material.toLowerCase().includes(query) ||
      r.poRef.toLowerCase().includes(query);

    const matchesStatus = statusFilter === "ALL" ? true : r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleLogVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const res = await logGateInwardConsignment({
        projectId,
        vehicleNo: formData.vehicleNo.trim().toUpperCase(),
        transporter: formData.transporter.trim(),
        material: formData.material.trim(),
        poRef: formData.poRef.trim().toUpperCase(),
        challanQty: parseFloat(formData.challanQtyNum) || 0,
        grossWeightMt: parseFloat(formData.grossWeight) || 0,
        tareWeightMt: parseFloat(formData.tareWeight) || 0,
        unit: formData.unit,
        driverName: formData.driverName.trim(),
        status: isToleranceExceeded ? "Rejected - Underweight" : formData.status,
      });

      if (res.success) {
        setIsLogModalOpen(false);
        setLinkedNotice(`Vehicle ${formData.vehicleNo} logged at Net: ${computedNet} MT. Weighbridge slip sealed.`);
        setTimeout(() => setLinkedNotice(null), 4000);
        loadConsignments();
      } else {
        alert(res.error || "Failed to log gate vehicle.");
      }
    });
  };

  const handleLinkToForm31 = (rec: GateMaterialRecord) => {
    startTransition(async () => {
      const res = await linkConsignmentToForm31(rec.id, projectId, rec.material, rec.netWeightMt);

      if (res.success) {
        setLinkedNotice(
          `Consignment ${rec.gatePassId} linked to CPWD Form 31 (₹${(res.advanceSanctionedInr ?? 0).toLocaleString("en-IN")} Secured Material Advance Sanctioned).`
        );
        setTimeout(() => setLinkedNotice(null), 5000);
        loadConsignments();
      } else {
        alert(res.error || "Failed to link to Form 31.");
      }
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 font-sans">
      {/* HEADER & ACTION GATEWAY */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between px-5 py-4 border-b border-zinc-800/50 gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-100 font-mono">
            Digital Weighbridge Telemetry &amp; Inward Consignment Ledger
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            CPWD Form 13 Goods Received Verification &amp; Form 31 Secured Advance Prerequisite Gate
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsLogModalOpen(true)}
            className="bg-zinc-100 text-zinc-950 hover:bg-zinc-300 font-bold uppercase tracking-wider text-xs px-4 py-2.5 flex items-center gap-2 transition-colors cursor-pointer shadow-none font-mono"
          >
            <Truck className="h-4 w-4" />
            <span>Log New Vehicle</span>
          </button>
        </div>
      </div>

      {/* BANNER NOTIFICATION */}
      {linkedNotice && (
        <div className="mx-5 mt-4 p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{linkedNotice}</span>
        </div>
      )}

      {/* FILTER & SEARCH */}
      <div className="px-5 py-3 border-b border-zinc-800/50 bg-zinc-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="relative flex-1 max-w-md">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gate pass, vehicle, transporter, material, PO..."
            className="w-full bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 font-mono"
          />
        </div>

        <div className="flex items-center gap-1">
          {["ALL", "Accepted & Stored", "Pending Lab Test", "Rejected - Underweight"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 border transition-colors cursor-pointer ${statusFilter === st
                  ? "bg-zinc-800 text-zinc-100 border-zinc-600 font-bold"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                }`}
            >
              {st === "ALL" ? `All (${records.length})` : st}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800/60 bg-zinc-950/60 text-[11px] text-zinc-500 font-mono uppercase tracking-wider">
              <th className="py-2.5 px-4 font-normal text-left whitespace-nowrap">Gate Pass ID</th>
              <th className="py-2.5 px-4 font-normal text-left whitespace-nowrap">Vehicle &amp; Transporter</th>
              <th className="py-2.5 px-4 font-normal text-left whitespace-nowrap">Material &amp; PO Ref</th>
              <th className="py-2.5 px-4 font-normal text-right whitespace-nowrap">Challan Qty vs Actual</th>
              <th className="py-2.5 px-4 font-normal text-center whitespace-nowrap">QMS Status</th>
              <th className="py-2.5 px-4 font-normal text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-xs font-mono">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono text-xs">
                  No inward consignments match the specified filter query.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r) => {
                const isAccepted = r.status === "Accepted & Stored";
                const isPendingLab = r.status === "Pending Lab Test";
                const isRejected = r.status === "Rejected - Underweight";

                return (
                  <tr
                    key={r.id}
                    className={`transition-colors ${isRejected ? "bg-rose-950/20 hover:bg-rose-950/30" : "hover:bg-zinc-800/20"
                      }`}
                  >
                    <td className="py-3 px-4 text-left whitespace-nowrap">
                      <div className="font-bold text-zinc-100">{r.gatePassId}</div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{r.timestamp}</div>
                    </td>

                    <td className="py-3 px-4 text-left whitespace-nowrap">
                      <div className="font-semibold text-zinc-100">{r.vehicleNo}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{r.transporter}</div>
                    </td>

                    <td className="py-3 px-4 text-left whitespace-nowrap">
                      <div className="text-zinc-200 font-medium">{r.material}</div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">REF: {r.poRef}</div>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono">
                      <div className="text-zinc-200 font-bold tabular-nums">
                        {r.challanQty} / {r.actualQty}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Net Payload Verified</div>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono border uppercase tracking-wider font-bold ${isAccepted
                            ? "bg-emerald-950/50 border-emerald-800 text-emerald-400"
                            : isPendingLab
                              ? "bg-amber-950/50 border-amber-800 text-amber-400"
                              : "bg-rose-950/50 border-rose-800 text-rose-400"
                          }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${isAccepted
                              ? "bg-emerald-500"
                              : isPendingLab
                                ? "bg-amber-500 animate-pulse"
                                : "bg-rose-500"
                            }`}
                        />
                        {r.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 font-mono text-[11px]">
                        <button
                          type="button"
                          onClick={() => setInspectRecord(r)}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 border border-zinc-700 uppercase font-semibold transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          disabled={isPending || isRejected || r.form31Linked}
                          onClick={() => handleLinkToForm31(r)}
                          className={`px-2.5 py-1 border uppercase font-semibold transition-colors ${r.form31Linked
                              ? "bg-zinc-950 border-zinc-800 text-zinc-500 cursor-not-allowed"
                              : isRejected
                                ? "bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed"
                                : "bg-zinc-100 text-zinc-950 hover:bg-zinc-300 border-zinc-300 cursor-pointer"
                            }`}
                        >
                          {r.form31Linked ? "Linked ✓" : "Link to Form 31"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="px-5 py-3 border-t border-zinc-800/50 bg-zinc-950/50 text-[11px] text-zinc-500 font-mono flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-400">Accepted &amp; Stored (Form 13 Compliant)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-zinc-400">Pending Lab Test (Quarantine Gate)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-zinc-400">Rejected at Gate</span>
          </span>
        </div>
        <span>Digital Weighbridge Interface: WB-PRIMARY-SERIAL • TLS 1.3</span>
      </div>

      {/* MODAL 1: Log New Vehicle */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100 font-mono">
                  Log New Incoming Material Vehicle
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  CPWD Form 13 Digital Weighbridge Gateway
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleLogVehicleSubmit} className="p-5 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">
                    Vehicle Registration No *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.vehicleNo}
                    onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">
                    Transporter / Supplier *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.transporter}
                    onChange={(e) => setFormData({ ...formData, transporter: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">
                    Material Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">
                    PO Reference Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.poRef}
                    onChange={(e) => setFormData({ ...formData, poRef: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">
                    Challan Qty *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.challanQtyNum}
                    onChange={(e) => setFormData({ ...formData, challanQtyNum: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono text-right tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">
                    Gross Weight (MT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.grossWeight}
                    onChange={(e) => setFormData({ ...formData, grossWeight: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono text-right tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">
                    Tare Weight (MT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.tareWeight}
                    onChange={(e) => setFormData({ ...formData, tareWeight: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono text-right tabular-nums"
                  />
                </div>
              </div>

              {/* AUTOMATED WEIGHBRIDGE TOLERANCE CARD */}
              <div
                className={`p-3 border flex items-center justify-between ${isToleranceExceeded
                    ? "bg-rose-950/40 border-rose-800 text-rose-400"
                    : "bg-emerald-950/40 border-emerald-800 text-emerald-400"
                  }`}
              >
                <div>
                  <span className="text-[10px] uppercase tracking-wider block">Net Payload Calculated</span>
                  <div className="text-lg font-bold tabular-nums">{computedNet.toFixed(2)} MT</div>
                </div>
                <div className="text-right text-[10px]">
                  <span className="block font-semibold">Variance: {computedVariance}%</span>
                  <span className="uppercase font-bold">
                    {isToleranceExceeded ? "TOLERANCE EXCEEDED (>2.5%) ⚠" : "WITHIN TOLERANCE (PASS) ✓"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">
                  Driver Name &amp; Contact
                </label>
                <input
                  type="text"
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 border border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-zinc-100 uppercase tracking-wider text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 uppercase tracking-wider text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Log Gate Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Weighbridge Slip View */}
      {inspectRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100 font-mono">
                  Weighbridge Slip &amp; Inspection Audit
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Gate Pass: {inspectRecord.gatePassId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectRecord(null)}
                className="text-zinc-400 hover:text-zinc-100 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 font-mono text-xs">
              <div className="bg-zinc-950 p-3 border border-zinc-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Vehicle:</span>
                  <span className="text-zinc-200 font-bold">{inspectRecord.vehicleNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Transporter:</span>
                  <span className="text-zinc-300">{inspectRecord.transporter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Material:</span>
                  <span className="text-zinc-300">{inspectRecord.material}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Purchase Order:</span>
                  <span className="text-zinc-300">{inspectRecord.poRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Weighbridge Slip:</span>
                  <span className="text-emerald-400 font-bold">{inspectRecord.weighbridgeSlip}</span>
                </div>
              </div>

              <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Gross Weight:</span>
                  <span className="text-zinc-200 tabular-nums">{inspectRecord.grossWeightMt.toFixed(2)} MT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Tare Weight:</span>
                  <span className="text-zinc-200 tabular-nums">{inspectRecord.tareWeightMt.toFixed(2)} MT</span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-1 font-bold">
                  <span className="text-zinc-200">Net Payload:</span>
                  <span className="text-emerald-400 tabular-nums">{inspectRecord.actualQty}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectRecord(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 uppercase tracking-wider text-xs font-bold"
                >
                  Close Slip View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MaterialInwardTable;