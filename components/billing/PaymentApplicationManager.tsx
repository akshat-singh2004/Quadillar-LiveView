"use client";

import React, { useState } from "react";
import { 
  AlertTriangle, 
  ArrowRight, 
  Banknote, 
  CheckCircle2, 
  Clock, 
  Coins, 
  FileCheck, 
  FileText, 
  Lock, 
  Receipt, 
  ShieldAlert, 
  ShieldCheck, 
  Unlock 
} from "lucide-react";
import { useActiveRole } from "@/context/RoleContext";

export interface PaymentApplicationRecord {
  id: string;
  project_id: string;
  bill_number: string;
  contractor_name: string;
  trade_package: string;
  scheduled_value_inr: number;
  previous_billed_inr: number;
  current_work_completed_inr: number;
  stored_materials_inr: number;
  retainage_rate: number;
  retainage_amount_inr: number;
  labor_cess_inr: number;
  net_payable_inr: number;
  status: "Draft" | "QS_Audited" | "Certified" | "Disbursed" | "Held";
  quality_gate_passed: boolean;
  concrete_cubes_passed: boolean;
  certified_by?: string | null;
  certified_at?: string | null;
  created_at: string;
}

interface Props {
  applications: PaymentApplicationRecord[];
  onStatusChange: (id: string, nextStatus: PaymentApplicationRecord["status"]) => Promise<void>;
}

function formatInr(val: number) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Number(val).toLocaleString("en-IN")}`;
}

export function PaymentApplicationManager({ applications, onStatusChange }: Props) {
  const { role } = useActiveRole();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Permission Logic Derived From Unified RoleContext
  const canQSAudit = role.id === "QS_BILLING" || role.id === "PMC_LEAD";
  const canCertify = role.id === "PRINCIPAL_ARCHITECT" || role.id === "PMC_LEAD";
  const canDisburse = role.id === "CLIENT_EXECUTIVE" || role.id === "PMC_LEAD";

  const executeTransition = async (id: string, next: PaymentApplicationRecord["status"]) => {
    setActionInProgress(id);
    await onStatusChange(id, next);
    setActionInProgress(null);
  };

  return (
    <div className="space-y-6">
      
      {/* SUMMARY TABLE */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
        <div className="border-b border-zinc-800/80 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Running Account Payment Applications
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            Governed under CPWD Clause 10CC & Standard FIDIC Retainage Rules
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Bill Ref</th>
                <th className="px-5 py-3">Trade & Contractor</th>
                <th className="px-5 py-3 text-right">Contract Cap</th>
                <th className="px-5 py-3 text-right">Gross Claimed</th>
                <th className="px-5 py-3 text-right">Retainage (5%)</th>
                <th className="px-5 py-3 text-right">Net Payable</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-zinc-500 text-xs font-sans">
                    No active RA applications recorded.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-zinc-900/40 transition">
                    <td className="px-5 py-4 font-bold text-white tracking-wide">
                      {app.bill_number}
                    </td>
                    <td className="px-5 py-4 font-sans">
                      <div className="font-semibold text-zinc-200">{app.trade_package}</div>
                      <div className="text-[11px] text-zinc-500">{app.contractor_name}</div>
                    </td>
                    <td className="px-5 py-4 text-right text-zinc-400">
                      {formatInr(app.scheduled_value_inr)}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-zinc-200">
                      {formatInr(Number(app.current_work_completed_inr) + Number(app.stored_materials_inr))}
                    </td>
                    <td className="px-5 py-4 text-right text-amber-400">
                      -{formatInr(app.retainage_amount_inr)}
                    </td>
                    <td className="px-5 py-4 text-right font-extrabold text-emerald-400">
                      {formatInr(app.net_payable_inr)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        app.status === "Disbursed"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                          : app.status === "Certified"
                          ? "bg-cyan-950 text-cyan-300 border border-cyan-800/60"
                          : app.status === "QS_Audited"
                          ? "bg-blue-950 text-blue-300 border border-blue-800/60"
                          : app.status === "Held"
                          ? "bg-rose-950 text-rose-400 border border-rose-800/60"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}>
                        {app.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED STATUTORY BILL WATERFALL CARDS */}
      <div className="space-y-4">
        {applications.map((app) => {
          const isGateBlocked = !app.quality_gate_passed || !app.concrete_cubes_passed;

          return (
            <div
              key={app.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-xl backdrop-blur-sm space-y-6"
            >
              {/* TOP APPLICATION BAR */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800/80 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      {app.bill_number}
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-xs text-zinc-400 font-semibold">
                      {app.contractor_name}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-1">
                    {app.trade_package}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {isGateBlocked ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800/60 text-xs font-bold">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      Quality Hold-Gate Blocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60 text-xs font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Stage Gates Verified
                    </span>
                  )}
                </div>
              </div>

              {/* DEDUCTION WATERFALL BREAKDOWN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase">01. Current Work</div>
                  <div className="text-base font-bold text-white font-mono mt-1">
                    {formatInr(app.current_work_completed_inr)}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Joint measurement recorded</div>
                </div>

                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase">02. Stored Materials</div>
                  <div className="text-base font-bold text-white font-mono mt-1">
                    {formatInr(app.stored_materials_inr)}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">75% secured advance limit</div>
                </div>

                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5">
                  <div className="text-[10px] font-mono text-amber-400 uppercase">03. Retainage Held (5%)</div>
                  <div className="text-base font-bold text-amber-400 font-mono mt-1">
                    -{formatInr(app.retainage_amount_inr)}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Defect liability reserve</div>
                </div>

                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5">
                  <div className="text-[10px] font-mono text-amber-400 uppercase">04. Labor Welfare (1%)</div>
                  <div className="text-base font-bold text-amber-400 font-mono mt-1">
                    -{formatInr(app.labor_cess_inr)}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">BOCW statutory cess</div>
                </div>

                <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/20 p-3.5">
                  <div className="text-[10px] font-mono text-emerald-400 uppercase font-bold">05. Net Disbursed Payout</div>
                  <div className="text-xl font-extrabold text-emerald-300 font-mono mt-0.5">
                    {formatInr(app.net_payable_inr)}
                  </div>
                  <div className="text-[10px] text-emerald-500/80 mt-0.5">Direct bank transfer value</div>
                </div>
              </div>

              {/* PROGRESSION ACTION TOOLBAR */}
              <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-zinc-400">
                  {app.certified_by ? (
                    <span className="text-emerald-400 font-mono flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Certified by {app.certified_by} on {new Date(app.certified_at!).toLocaleDateString("en-IN")}
                    </span>
                  ) : (
                    <span>
                      Current Status: <strong className="text-zinc-200">{app.status.replace("_", " ")}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Step 1: QS Audit */}
                  {app.status === "Draft" && canQSAudit && (
                    <button
                      type="button"
                      disabled={actionInProgress === app.id}
                      onClick={() => executeTransition(app.id, "QS_Audited")}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                    >
                      Audit & Seal MB Quantities
                    </button>
                  )}

                  {/* Step 2: Consultant Certification */}
                  {app.status === "QS_Audited" && canCertify && (
                    <button
                      type="button"
                      disabled={isGateBlocked || actionInProgress === app.id}
                      onClick={() => executeTransition(app.id, "Certified")}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
                        !isGateBlocked
                          ? "bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-md shadow-cyan-950/50 cursor-pointer"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed"
                      }`}
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Certify RA Payment Certificate</span>
                    </button>
                  )}

                  {/* Step 3: Client Escrow Release */}
                  {app.status === "Certified" && canDisburse && (
                    <button
                      type="button"
                      disabled={actionInProgress === app.id}
                      onClick={() => executeTransition(app.id, "Disbursed")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-emerald-950/50"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Disburse Escrow Funds</span>
                    </button>
                  )}

                  {app.status === "Disbursed" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-800/60 text-emerald-300 font-mono text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Escrow Disbursed
                    </span>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}