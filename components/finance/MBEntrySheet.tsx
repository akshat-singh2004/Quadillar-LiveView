"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  ShieldCheck,
  Calculator,
  Lock,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";
import { recordMBEntry, verifyMBEntry } from "@/app/actions/mb-actions";
import { generateRABillFromMB } from "@/app/actions/billing-pipeline";

// ---------------------------------------------------------------------------
// Type Definitions (Strictly mapped to electronic_measurement_book schema)
// ---------------------------------------------------------------------------

export type UnitType = "cum" | "sqm" | "m" | "Rmt" | "MT" | "Nos";

export interface MBLineItem {
  id: string;
  itemCode: string;
  description: string;
  locationGrid: string;
  structuralElement: string;
  linkedPourCardRef: string;
  linkedBimGuid: string;
  nos: number;
  lengthM: number;
  breadthM: number;
  depthM: number;
  grossQuantity: number;
  deductionQuantity: number;
  netQuantity: number;
  unit: UnitType;
  sanctionedRateInr: number;
  totalAmountInr: number;
  aeTestChecked: boolean;
  aeAuditorName?: string;
  eeTestChecked: boolean;
  eeAuditorName?: string;
  isBilled: boolean;
  raBillNo?: string;
}

export interface BOQReferenceItem {
  id: string;
  item_code: string;
  item_description: string;
  unit: string;
  sanctioned_rate_inr?: number;
}

export interface MBEntrySheetProps {
  initialEntries?: Record<string, unknown>[];
  projectId?: string;
  sanctionedBoqItems?: BOQReferenceItem[];
  workOrderRef?: string;
  contractorName?: string;
}

// ---------------------------------------------------------------------------
// IS 1200 Dimensional Calculation Engine
// ---------------------------------------------------------------------------

function computeLineQuantities(
  nos: number,
  len: number,
  breadth: number,
  depth: number,
  deduction: number,
  unit: UnitType,
  rate: number
): { gross: number; net: number; amount: number } {
  const n = Math.max(1, nos || 1);
  const l = Math.max(0, len || 0);
  const b = breadth > 0 ? breadth : 1;
  const d = depth > 0 ? depth : 1;
  const ded = Math.max(0, deduction || 0);

  let gross = 0;
  if (unit === "cum") {
    gross = n * l * (breadth || 1) * (depth || 1);
  } else if (unit === "sqm") {
    gross = n * l * (breadth || 1);
  } else if (unit === "m" || unit === "Rmt") {
    gross = n * l;
  } else {
    gross = n * (l || 1);
  }

  gross = parseFloat(gross.toFixed(3));
  const net = parseFloat(Math.max(0, gross - ded).toFixed(3));
  const amount = parseFloat((net * (rate || 0)).toFixed(2));

  return { gross, net, amount };
}

// ---------------------------------------------------------------------------
// Client Component: MBEntrySheet
// ---------------------------------------------------------------------------

export function MBEntrySheet({
  initialEntries = [],
  projectId = "PRJ-DEFAULT",
  sanctionedBoqItems = [],
  workOrderRef = "WO-COMMERCIAL-01",
  contractorName = "Lead EPC Contractor",
}: MBEntrySheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [lines, setLines] = useState<MBLineItem[]>([]);
  const [statutoryLockConfirmed, setStatutoryLockConfirmed] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Synchronize DB entries to state
  useEffect(() => {
    if (initialEntries && initialEntries.length > 0) {
      setLines(
        initialEntries.map((e) => {
          const nos = Number(e.number_of_items ?? e.multiplier ?? 1);
          const len = Number(e.length_m || 0);
          const breadth = Number(e.breadth_m || 0);
          const depth = Number(e.depth_m ?? e.height_or_depth_m ?? 0);
          const deduction = Number(e.deductions_quantity ?? e.deduction_quantity ?? 0);
          const unit = ((e.unit as string) || "cum") as UnitType;
          const rate = Number(e.sanctioned_rate_inr ?? e.unit_rate ?? 0);

          const { gross, net, amount } = computeLineQuantities(
            nos,
            len,
            breadth,
            depth,
            deduction,
            unit,
            rate
          );

          return {
            id: String(e.id),
            itemCode: String(e.mb_item_code ?? e.item_code ?? ""),
            description: String(e.description ?? e.item_description ?? ""),
            locationGrid: String(e.location_grid ?? ""),
            structuralElement: String(e.structural_element ?? ""),
            linkedPourCardRef: String(e.linked_pour_card_ref ?? ""),
            linkedBimGuid: String(e.linked_bim_guid ?? ""),
            nos,
            lengthM: len,
            breadthM: breadth,
            depthM: depth,
            grossQuantity: Number(e.calculated_quantity ?? gross),
            deductionQuantity: deduction,
            netQuantity: Number(e.net_quantity ?? net),
            unit,
            sanctionedRateInr: rate,
            totalAmountInr: Number(e.total_amount_inr ?? e.total_amount ?? amount),
            aeTestChecked: Boolean(e.ae_test_checked ?? e.is_verified),
            aeAuditorName: (e.ae_auditor_name as string) || undefined,
            eeTestChecked: Boolean(e.ee_test_checked),
            eeAuditorName: (e.ee_auditor_name as string) || undefined,
            isBilled: Boolean(e.is_billed || e.linked_ra_bill_no),
            raBillNo: (e.linked_ra_bill_no as string) || undefined,
          };
        })
      );
    } else {
      setLines([]);
    }
  }, [initialEntries]);

  // Form State for Entry Modal
  const [newLine, setNewLine] = useState({
    itemCode: "",
    description: "",
    locationGrid: "",
    structuralElement: "",
    linkedPourCardRef: "",
    linkedBimGuid: "",
    nos: 1,
    lengthM: "",
    breadthM: "",
    depthM: "",
    deductionQty: "",
    unit: "cum" as UnitType,
    rateInr: "",
  });

  // Financial Subtotals & Running Unit Ledger
  const { subtotalsByUnit, grandTotalAmountInr, unverifiedLinesCount } = useMemo(() => {
    const unitMap: Record<UnitType, number> = {
      cum: 0,
      sqm: 0,
      m: 0,
      Rmt: 0,
      MT: 0,
      Nos: 0,
    };
    let totalAmt = 0;
    let unverified = 0;

    lines.forEach((l) => {
      unitMap[l.unit] = (unitMap[l.unit] || 0) + (l.netQuantity || 0);
      totalAmt += l.totalAmountInr || 0;
      if (!l.aeTestChecked) unverified++;
    });

    return {
      subtotalsByUnit: unitMap,
      grandTotalAmountInr: totalAmt,
      unverifiedLinesCount: unverified,
    };
  }, [lines]);

  // In-Place Dimensional Calculation Handler
  const handleUpdateField = (
    id: string,
    field: "nos" | "lengthM" | "breadthM" | "depthM" | "deductionQuantity" | "sanctionedRateInr" | "description",
    val: number | string
  ) => {
    setLines((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };

        const { gross, net, amount } = computeLineQuantities(
          updated.nos,
          updated.lengthM,
          updated.breadthM,
          updated.depthM,
          updated.deductionQuantity,
          updated.unit,
          updated.sanctionedRateInr
        );

        return {
          ...updated,
          grossQuantity: gross,
          netQuantity: net,
          totalAmountInr: amount,
        };
      })
    );
  };

  // Statutory Check-Measurement Signature
  const handleToggleAeCheck = (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;

    setLines((prev) =>
      prev.map((item) => (item.id === id ? { ...item, aeTestChecked: nextStatus } : item))
    );

    startTransition(async () => {
      const res = await verifyMBEntry(id);
      if (!res.success) {
        setLines((prev) =>
          prev.map((item) => (item.id === id ? { ...item, aeTestChecked: currentStatus } : item))
        );
        setStatusMessage({
          text: `Check-Measurement Verification Failed: ${res.error}`,
          type: "error",
        });
      } else {
        setStatusMessage({
          text: "Item successfully test-checked per CPWD Cl. 7.",
          type: "success",
        });
      }
    });
  };

  // Add Measurement Line Submission
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLine.itemCode.trim() || !newLine.description.trim()) {
      setStatusMessage({
        text: "Validation Error: Item Code and Description are mandatory.",
        type: "error",
      });
      return;
    }

    startTransition(async () => {
      const nos = Number(newLine.nos) || 1;
      const len = parseFloat(newLine.lengthM) || 0;
      const breadth = parseFloat(newLine.breadthM) || 0;
      const depth = parseFloat(newLine.depthM) || 0;
      const deduction = parseFloat(newLine.deductionQty) || 0;
      const rate = parseFloat(newLine.rateInr) || 0;

      const { gross, net, amount } = computeLineQuantities(
        nos,
        len,
        breadth,
        depth,
        deduction,
        newLine.unit,
        rate
      );

      const formData = new FormData();
      formData.append("projectId", projectId);
      formData.append("itemCode", newLine.itemCode.trim());
      formData.append("description", newLine.description.trim());
      formData.append("locationGrid", newLine.locationGrid.trim());
      formData.append("structuralElement", newLine.structuralElement.trim());
      formData.append("linkedPourCardRef", newLine.linkedPourCardRef.trim());
      formData.append("linkedBimGuid", newLine.linkedBimGuid.trim());
      formData.append("workOrderRef", workOrderRef);
      formData.append("contractorName", contractorName);
      formData.append("numberOfItems", nos.toString());
      formData.append("lengthM", len.toString());
      formData.append("breadthM", breadth.toString());
      formData.append("depthM", depth.toString());
      formData.append("calculatedQuantity", gross.toString());
      formData.append("deductionsQuantity", deduction.toString());
      formData.append("netQuantity", net.toString());
      formData.append("unit", newLine.unit);
      formData.append("sanctionedRateInr", rate.toString());
      formData.append("totalAmountInr", amount.toString());

      const res = await recordMBEntry(formData);

      if (res.success) {
        setIsAddModalOpen(false);
        setNewLine({
          itemCode: "",
          description: "",
          locationGrid: "",
          structuralElement: "",
          linkedPourCardRef: "",
          linkedBimGuid: "",
          nos: 1,
          lengthM: "",
          breadthM: "",
          depthM: "",
          deductionQty: "",
          unit: "cum",
          rateInr: "",
        });
        setStatusMessage({
          text: "Measurement successfully logged into the Electronic Measurement Book.",
          type: "success",
        });
        router.refresh();
      } else {
        setStatusMessage({
          text: `Failed to insert measurement: ${res.error}`,
          type: "error",
        });
      }
    });
  };

  // Compile & Freeze to Running Account Bill
  const handleCommitToRa = () => {
    if (lines.length === 0) {
      setStatusMessage({
        text: "Electronic Measurement Book has zero active lines. Record field work before generating bill.",
        type: "error",
      });
      return;
    }

    if (unverifiedLinesCount > 0 && !statutoryLockConfirmed) {
      setStatusMessage({
        text: "Statutory Block: Assistant Engineer / SEOR 10% test-check acceptance must be confirmed before compiling RA Bill.",
        type: "error",
      });
      return;
    }

    startTransition(async () => {
      const res = await generateRABillFromMB(projectId);

      if (res.success && res.bill) {
        setStatusMessage({
          text: `E-MB sealed and generated RA Bill: ${res.bill.ra_bill_number}. Redirecting to Commercial Ledger...`,
          type: "success",
        });
        setTimeout(() => {
          router.push("/finance/ra-bills");
        }, 1500);
      } else {
        setStatusMessage({
          text: `Compilation Error: ${res.error || "Failed to generate bill from current measurements."}`,
          type: "error",
        });
      }
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 font-mono text-xs select-none relative">
      {/* Loading Overlay */}
      {isPending && (
        <div className="absolute inset-0 z-30 bg-zinc-950/60 backdrop-blur-[1px] flex items-center justify-center">
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 px-5 py-3 shadow-2xl">
            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
            <span className="text-zinc-200 text-xs font-semibold">Committing Ledger Transaction...</span>
          </div>
        </div>
      )}

      {/* HEADER TOOLBAR */}
      <div className="p-4 border-b border-zinc-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] tracking-widest text-zinc-400 uppercase font-bold">
              CPWD WORKS MANUAL CL. 7 • DIGITAL MEASUREMENT BOOK (E-MB)
            </span>
          </div>
          <h2 className="text-base font-bold text-zinc-100 font-mono mt-0.5 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>Digital Measurement Book Ledger</span>
          </h2>
          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
            PROJECT: <span className="text-zinc-300 font-bold">{projectId}</span> • CONTRACTOR:{" "}
            <span className="text-zinc-300 font-bold">{contractorName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            disabled={isPending}
            className="bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-bold uppercase tracking-wider text-xs px-3.5 py-2 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add Measurement Line</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold uppercase tracking-wider text-xs px-3.5 py-2 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Print Form 23 (MB)</span>
          </button>
        </div>
      </div>

      {/* NOTIFICATION FEEDBACK */}
      {statusMessage && (
        <div
          className={`m-4 p-3 border flex items-center justify-between gap-3 text-xs ${statusMessage.type === "success"
              ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
              : statusMessage.type === "error"
                ? "bg-rose-950/80 border-rose-800 text-rose-300"
                : "bg-zinc-950 border-zinc-700 text-zinc-300"
            }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "error" ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-zinc-500 hover:text-zinc-200 uppercase text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* METRIC STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-zinc-800/80 bg-zinc-950/40 divide-x divide-zinc-800/80 text-[11px]">
        <div className="p-3">
          <span className="text-zinc-500 block text-[10px] uppercase">Recorded Lines</span>
          <span className="text-zinc-100 font-bold tabular-nums text-sm">{lines.length}</span>
        </div>
        <div className="p-3">
          <span className="text-zinc-500 block text-[10px] uppercase">Unverified Items</span>
          <span
            className={`font-bold tabular-nums text-sm ${unverifiedLinesCount > 0 ? "text-amber-400" : "text-emerald-400"
              }`}
          >
            {unverifiedLinesCount} Pending
          </span>
        </div>
        <div className="p-3">
          <span className="text-zinc-500 block text-[10px] uppercase">Concrete Vol. (CUM)</span>
          <span className="text-zinc-100 font-bold tabular-nums text-sm">
            {subtotalsByUnit.cum.toFixed(3)} m³
          </span>
        </div>
        <div className="p-3">
          <span className="text-zinc-500 block text-[10px] uppercase">Gross Certified Value</span>
          <span className="text-emerald-400 font-bold tabular-nums text-sm">
            ₹{grandTotalAmountInr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* IS 1200 MEASUREMENT SPREADSHEET */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-950/80 text-[10px] text-zinc-500 uppercase tracking-wider">
              <th className="py-2.5 px-3 font-normal whitespace-nowrap">Item Code</th>
              <th className="py-2.5 px-3 font-normal min-w-[220px]">Description &amp; Location Grid</th>
              <th className="py-2.5 px-2 font-normal text-right whitespace-nowrap">Nos</th>
              <th className="py-2.5 px-2 font-normal text-right whitespace-nowrap">L (m)</th>
              <th className="py-2.5 px-2 font-normal text-right whitespace-nowrap">B (m)</th>
              <th className="py-2.5 px-2 font-normal text-right whitespace-nowrap">D/H (m)</th>
              <th className="py-2.5 px-2 font-normal text-right whitespace-nowrap text-zinc-400">Gross</th>
              <th className="py-2.5 px-2 font-normal text-right whitespace-nowrap text-rose-400">Ded.</th>
              <th className="py-2.5 px-3 font-normal text-right whitespace-nowrap text-zinc-200">Net Quantity</th>
              <th className="py-2.5 px-2 font-normal text-center whitespace-nowrap">Unit</th>
              <th className="py-2.5 px-2.5 font-normal text-right whitespace-nowrap">Rate (₹)</th>
              <th className="py-2.5 px-3 font-normal text-right whitespace-nowrap">Amount (₹)</th>
              <th className="py-2.5 px-3 font-normal text-center whitespace-nowrap">AE 10% Test Check</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {lines.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-zinc-600 font-sans text-xs">
                  Zero measurement lines recorded. Click &quot;+ Add Measurement Line&quot; to begin.
                </td>
              </tr>
            ) : (
              lines.map((line) => {
                return (
                  <tr
                    key={line.id}
                    className={`hover:bg-zinc-800/30 transition-colors ${line.isBilled ? "opacity-60 bg-zinc-950/40" : ""
                      }`}
                  >
                    {/* Item Code */}
                    <td className="py-2 px-3 font-bold text-zinc-200 whitespace-nowrap">
                      {line.itemCode}
                      {line.linkedPourCardRef && (
                        <span className="block text-[9px] text-zinc-500 font-normal">
                          PC: {line.linkedPourCardRef}
                        </span>
                      )}
                    </td>

                    {/* Description & Structural Location */}
                    <td className="py-2 px-3 text-zinc-300">
                      <input
                        type="text"
                        disabled={line.isBilled || isPending}
                        value={line.description}
                        onChange={(e) => handleUpdateField(line.id, "description", e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-zinc-500 text-zinc-200 text-xs focus:outline-none"
                      />
                      {(line.structuralElement || line.locationGrid) && (
                        <span className="text-[10px] text-zinc-500 block truncate">
                          {line.structuralElement} {line.locationGrid ? `[${line.locationGrid}]` : ""}
                        </span>
                      )}
                    </td>

                    {/* Nos */}
                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      <input
                        type="number"
                        min={1}
                        disabled={line.isBilled || isPending}
                        value={line.nos}
                        onChange={(e) =>
                          handleUpdateField(line.id, "nos", parseInt(e.target.value, 10) || 1)
                        }
                        className="w-10 bg-zinc-950 border border-zinc-800 text-right px-1 py-0.5 text-xs text-zinc-100 tabular-nums focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                      />
                    </td>

                    {/* Length */}
                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      <input
                        type="number"
                        step="0.001"
                        disabled={line.isBilled || isPending}
                        value={line.lengthM || ""}
                        onChange={(e) =>
                          handleUpdateField(line.id, "lengthM", parseFloat(e.target.value) || 0)
                        }
                        className="w-14 bg-zinc-950 border border-zinc-800 text-right px-1 py-0.5 text-xs text-zinc-100 tabular-nums focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                      />
                    </td>

                    {/* Breadth */}
                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      <input
                        type="number"
                        step="0.001"
                        disabled={line.isBilled || isPending}
                        value={line.breadthM || ""}
                        onChange={(e) =>
                          handleUpdateField(line.id, "breadthM", parseFloat(e.target.value) || 0)
                        }
                        placeholder="-"
                        className="w-14 bg-zinc-950 border border-zinc-800 text-right px-1 py-0.5 text-xs text-zinc-100 tabular-nums focus:outline-none focus:border-zinc-600 placeholder:text-zinc-700 disabled:opacity-50"
                      />
                    </td>

                    {/* Depth/Height */}
                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      <input
                        type="number"
                        step="0.001"
                        disabled={line.isBilled || isPending}
                        value={line.depthM || ""}
                        onChange={(e) =>
                          handleUpdateField(line.id, "depthM", parseFloat(e.target.value) || 0)
                        }
                        placeholder="-"
                        className="w-14 bg-zinc-950 border border-zinc-800 text-right px-1 py-0.5 text-xs text-zinc-100 tabular-nums focus:outline-none focus:border-zinc-600 placeholder:text-zinc-700 disabled:opacity-50"
                      />
                    </td>

                    {/* Gross */}
                    <td className="py-2 px-2 text-right text-zinc-400 tabular-nums whitespace-nowrap">
                      {line.grossQuantity.toFixed(3)}
                    </td>

                    {/* Deduction */}
                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      <input
                        type="number"
                        step="0.001"
                        disabled={line.isBilled || isPending}
                        value={line.deductionQuantity || ""}
                        onChange={(e) =>
                          handleUpdateField(
                            line.id,
                            "deductionQuantity",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0.00"
                        className="w-12 bg-zinc-950 border border-zinc-800 text-right px-1 py-0.5 text-xs text-rose-400 tabular-nums focus:outline-none focus:border-rose-700 placeholder:text-zinc-700 disabled:opacity-50"
                      />
                    </td>

                    {/* Net Quantity */}
                    <td className="py-2 px-3 text-right font-bold text-zinc-100 tabular-nums whitespace-nowrap">
                      {line.netQuantity.toFixed(3)}
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 text-zinc-300 text-[10px] font-bold">
                        {line.unit}
                      </span>
                    </td>

                    {/* Sanctioned Rate */}
                    <td className="py-2 px-2.5 text-right tabular-nums whitespace-nowrap">
                      <input
                        type="number"
                        step="0.01"
                        disabled={line.isBilled || isPending}
                        value={line.sanctionedRateInr || ""}
                        onChange={(e) =>
                          handleUpdateField(
                            line.id,
                            "sanctionedRateInr",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-16 bg-zinc-950 border border-zinc-800 text-right px-1 py-0.5 text-xs text-zinc-300 tabular-nums focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                      />
                    </td>

                    {/* Amount */}
                    <td className="py-2 px-3 text-right font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                      ₹{line.totalAmountInr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>

                    {/* AE Check Status Button */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        disabled={line.isBilled || isPending}
                        onClick={() => handleToggleAeCheck(line.id, line.aeTestChecked)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] border uppercase tracking-wider font-bold transition-colors cursor-pointer disabled:cursor-not-allowed ${line.aeTestChecked
                            ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                            : "bg-amber-950/50 border-amber-800 text-amber-400 hover:bg-amber-900/40"
                          }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${line.aeTestChecked ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                            }`}
                        />
                        <span>{line.aeTestChecked ? "AE Checked ✓" : "Pending Check"}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* STATUTORY VERIFICATION & BILL FREEZE CONSOLE */}
      <div className="border-t border-zinc-800/80 bg-zinc-950/90 p-5 space-y-4">
        {/* Running Subtotals */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/60 text-xs">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
            <Calculator className="h-3.5 w-3.5 text-zinc-500" />
            <span>Cumulative Running Measurement Quantities:</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(subtotalsByUnit).map(([u, val]) => (
              <div key={u} className="bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-[11px]">
                <span className="text-zinc-500 uppercase mr-1">{u}:</span>
                <strong className="text-zinc-200 tabular-nums">{val.toFixed(3)}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Dual Signature Statutory Gateway */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-900 p-4 border border-zinc-800 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">
              Field Measurement Originator
            </div>
            <div className="flex items-center gap-2 text-zinc-200 text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="font-semibold">Recorded by Site Measurement Engineer</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              Recorded measurements bound to work order: {workOrderRef}
            </div>
          </div>

          <div className="flex flex-col justify-between space-y-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                Assistant Engineer / Resident Engineer (Statutory Check Gate)
              </div>
              <div className="text-[11px] text-zinc-300 mt-0.5">
                CPWD Works Manual Mandatory Minimum 10% Check Measurement Sign-off
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setStatutoryLockConfirmed(!statutoryLockConfirmed)}
                className={`w-11 h-6 border transition-colors flex items-center p-0.5 cursor-pointer ${statutoryLockConfirmed
                    ? "bg-emerald-600 border-emerald-500 justify-end"
                    : "bg-zinc-950 border-zinc-700 justify-start"
                  }`}
              >
                <span className="h-4 w-4 bg-zinc-100 block" />
              </button>
              <span
                className={`text-xs font-bold ${statutoryLockConfirmed ? "text-emerald-400" : "text-zinc-500"
                  }`}
              >
                {statutoryLockConfirmed
                  ? "Statutory 10% Test Check Confirmed ✓"
                  : "Pending Confirmation"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Commit Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            <span>Pushed entries are frozen into Form 26 RA Bill Ledger.</span>
          </div>

          <button
            type="button"
            disabled={isPending || lines.length === 0}
            onClick={handleCommitToRa}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold uppercase tracking-wider text-xs px-6 py-2.5 transition-colors cursor-pointer flex items-center gap-2"
          >
            <span>Freeze E-MB &amp; Compile RA Bill</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* POPUP MODAL: Add Measurement Line */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100 border-b border-zinc-800 pb-3 flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-400" />
              <span>Record New E-MB Field Measurement</span>
            </h3>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              {/* BOQ Item Reference */}
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  BOQ / SOR Item Reference *
                </label>
                {sanctionedBoqItems.length > 0 ? (
                  <select
                    value={newLine.itemCode}
                    onChange={(e) => {
                      const selected = sanctionedBoqItems.find(
                        (b) => b.item_code === e.target.value
                      );
                      setNewLine({
                        ...newLine,
                        itemCode: e.target.value,
                        description: selected?.item_description || newLine.description,
                        unit: (selected?.unit as UnitType) || newLine.unit,
                        rateInr: selected?.sanctioned_rate_inr
                          ? selected.sanctioned_rate_inr.toString()
                          : newLine.rateInr,
                      });
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 outline-none focus:border-zinc-600"
                  >
                    <option value="">-- Select from Project Sanctioned BOQ --</option>
                    {sanctionedBoqItems.map((b) => (
                      <option key={b.id} value={b.item_code}>
                        {b.item_code} - {b.item_description.substring(0, 35)}...
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. CPWD-DSR-4.1.3"
                    value={newLine.itemCode}
                    onChange={(e) => setNewLine({ ...newLine, itemCode: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 outline-none focus:border-zinc-600 uppercase"
                  />
                )}
              </div>

              {/* Description & Structural Location */}
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Description of Work *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Reinforced cement concrete M30 grade in beams, lintels and columns..."
                  value={newLine.description}
                  onChange={(e) => setNewLine({ ...newLine, description: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-100 outline-none focus:border-zinc-600 text-xs"
                />
              </div>

              {/* Spatial References */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                    Location Grid
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grid C2-D4 Level 03"
                    value={newLine.locationGrid}
                    onChange={(e) => setNewLine({ ...newLine, locationGrid: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-zinc-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                    Linked Pour Card
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PC-M30-L3-014"
                    value={newLine.linkedPourCardRef}
                    onChange={(e) => setNewLine({ ...newLine, linkedPourCardRef: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-zinc-100 outline-none uppercase"
                  />
                </div>
              </div>

              {/* Dimensions Input (IS 1200) */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-1">Nos</label>
                  <input
                    type="number"
                    min={1}
                    value={newLine.nos}
                    onChange={(e) =>
                      setNewLine({ ...newLine, nos: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-zinc-100 text-right outline-none tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-1">Length (m)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    placeholder="0.00"
                    value={newLine.lengthM}
                    onChange={(e) => setNewLine({ ...newLine, lengthM: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-zinc-100 text-right outline-none tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-1">Breadth (m)</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.00"
                    value={newLine.breadthM}
                    onChange={(e) => setNewLine({ ...newLine, breadthM: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-zinc-100 text-right outline-none tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-1">Depth/Ht (m)</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.00"
                    value={newLine.depthM}
                    onChange={(e) => setNewLine({ ...newLine, depthM: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-zinc-100 text-right outline-none tabular-nums"
                  />
                </div>
              </div>

              {/* Deductions, Unit, and Rate */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                    Deductions (Qty)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={newLine.deductionQty}
                    onChange={(e) => setNewLine({ ...newLine, deductionQty: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-rose-400 text-right outline-none tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-1">Unit</label>
                  <select
                    value={newLine.unit}
                    onChange={(e) => setNewLine({ ...newLine, unit: e.target.value as UnitType })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-zinc-100 outline-none text-center"
                  >
                    <option value="cum">cum</option>
                    <option value="sqm">sqm</option>
                    <option value="m">m</option>
                    <option value="Rmt">Rmt</option>
                    <option value="MT">MT</option>
                    <option value="Nos">Nos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                    Sanctioned Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="₹ 0.00"
                    value={newLine.rateInr}
                    onChange={(e) => setNewLine({ ...newLine, rateInr: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-emerald-400 text-right outline-none tabular-nums"
                  />
                </div>
              </div>

              {/* Computed Preview */}
              <div className="p-2.5 bg-zinc-950 border border-zinc-800 text-[11px] flex justify-between items-center text-zinc-400">
                <span>Computed Net Valuation:</span>
                <span className="font-bold text-emerald-400 text-xs">
                  ₹
                  {computeLineQuantities(
                    newLine.nos,
                    parseFloat(newLine.lengthM) || 0,
                    parseFloat(newLine.breadthM) || 0,
                    parseFloat(newLine.depthM) || 0,
                    parseFloat(newLine.deductionQty) || 0,
                    newLine.unit,
                    parseFloat(newLine.rateInr) || 0
                  ).amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isPending}
                  className="px-3.5 py-1.5 border border-zinc-700 text-zinc-300 hover:text-zinc-100 uppercase text-xs disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Commit to E-MB</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MBEntrySheet;