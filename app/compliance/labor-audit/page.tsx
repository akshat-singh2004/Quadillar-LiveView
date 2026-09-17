"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  HardHat,
  Lock,
  MinusCircle,
  Percent,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export interface StatutoryClearanceRecord {
  id: string;
  project_id: string;
  contractor_name: string;
  trade_package: string;
  compliance_month: string;
  headcount_deployed: number;
  gross_wages_payable_inr: number;
  epf_ecr_challan_number?: string | null;
  epf_remitted_inr: number;
  epf_verified: boolean;
  esi_challan_number?: string | null;
  esi_remitted_inr: number;
  esi_verified: boolean;
  bocw_cess_remitted_inr: number;
  wage_muster_signed: boolean;
  compliance_status: "PENDING_AUDIT" | "COMPLIANT_CLEARED" | "NON_COMPLIANT_BLOCKED" | "CONDITIONAL_PASS";
  clearance_certificate_ref: string;
  audited_by?: string | null;
  audited_at?: string | null;
  created_at: string;
}

function formatInr(val: number) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function LaborCompliancePage() {
  const { project, role, tier } = useActiveRole();
  const [records, setRecords] = useState<StatutoryClearanceRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<StatutoryClearanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadComplianceData = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("subcontractor_statutory_clearances")
        .select("*")
        .eq("project_id", project.id)
        .order("compliance_month", { ascending: false });

      if (data) {
        setRecords(data as StatutoryClearanceRecord[]);
        if (!selectedRecord && data.length > 0) {
          setSelectedRecord(data[0] as StatutoryClearanceRecord);
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, [project.id, selectedRecord]);

  useEffect(() => {
    void loadComplianceData();

    const channel = supabase
      .channel(`statutory_sync_${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subcontractor_statutory_clearances" }, () => void loadComplianceData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [project.id, loadComplianceData]);

  const summary = useMemo(() => {
    const totalHeadcount = records.reduce((sum, r) => sum + Number(r.headcount_deployed || 0), 0);
    const compliantCount = records.filter((r) => r.compliance_status === "COMPLIANT_CLEARED").length;
    const blockedCount = records.filter((r) => r.compliance_status === "NON_COMPLIANT_BLOCKED").length;
    const totalWelfareCess = records.reduce((sum, r) => sum + Number(r.bocw_cess_remitted_inr || 0), 0);

    return { totalHeadcount, compliantCount, blockedCount, totalWelfareCess };
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      r.contractor_name.toLowerCase().includes(q) ||
      r.trade_package.toLowerCase().includes(q) ||
      r.clearance_certificate_ref.toLowerCase().includes(q)
    );
  }, [records, search]);

  const handleAuditToggle = async (id: string, field: "epf_verified" | "esi_verified" | "wage_muster_signed") => {
    if (!selectedRecord) return;
    setActionInProgress(id);

    const nextVal = !selectedRecord[field];
    const updatePayload: Partial<StatutoryClearanceRecord> = {
      [field]: nextVal,
      audited_by: role.label,
      audited_at: new Date().toISOString(),
    };

    const nextEpf = field === "epf_verified" ? nextVal : selectedRecord.epf_verified;
    const nextEsi = field === "esi_verified" ? nextVal : selectedRecord.esi_verified;
    const nextMuster = field === "wage_muster_signed" ? nextVal : selectedRecord.wage_muster_signed;

    if (nextEpf && nextEsi && nextMuster) {
      updatePayload.compliance_status = "COMPLIANT_CLEARED";
    } else {
      updatePayload.compliance_status = "NON_COMPLIANT_BLOCKED";
    }

    await supabase.from("subcontractor_statutory_clearances").update(updatePayload).eq("id", id);
    await loadComplianceData();
    setActionInProgress(null);
  };

  const handlePrintClearance = () => {
    if (!selectedRecord) return;
    const printWin = window.open("", "_blank", "width=1000,height=850");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Labor Statutory Clearance Certificate — ${selectedRecord.clearance_certificate_ref}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 19px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .status-box { padding: 12px; border-radius: 6px; margin: 18px 0; font-weight: bold; border: 1px solid #09090b; }
    .cleared { background: #f0fdf4; border-color: #22c55e; color: #15803d; }
    .blocked { background: #fef2f2; border-color: #ef4444; color: #b91c1c; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 50px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 36px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · Labor Law Compliance</div>
      <h1 class="title">BOCW, EPF & ESI Statutory Clearance Certificate</h1>
      <div class="meta">Certificate Ref: ${selectedRecord.clearance_certificate_ref} · Project: ${project.name} (${project.id})</div>
    </div>
    <div style="font-size: 11px; font-family: monospace;">Audit Month: ${selectedRecord.compliance_month}</div>
  </div>

  <div class="status-box ${selectedRecord.compliance_status === 'COMPLIANT_CLEARED' ? 'cleared' : 'blocked'}">
    COMMERCIAL PAYMENT GATE: ${selectedRecord.compliance_status.replace(/_/g, ' ')}
  </div>

  <table>
    <tr><th>Contractor Entity</th><td colspan="3"><strong>${selectedRecord.contractor_name}</strong></td></tr>
    <tr><th>Trade Package</th><td>${selectedRecord.trade_package}</td><th>Headcount Deployed</th><td class="tar">${selectedRecord.headcount_deployed} Workers</td></tr>
    <tr><th>Gross Monthly Wage Roll</th><td class="tar">₹${Math.round(selectedRecord.gross_wages_payable_inr).toLocaleString("en-IN")}</td><th>1% BOCW Welfare Cess</th><td class="tar">₹${Math.round(selectedRecord.bocw_cess_remitted_inr).toLocaleString("en-IN")}</td></tr>
  </table>

  <table>
    <thead>
      <tr><th>Statutory Parameter</th><th>Challan / ECR Reference</th><th class="tar">Amount Remitted (₹)</th><th>Verification Seal</th></tr>
    </thead>
    <tbody>
      <tr><td>EPF Employee Contribution (12% + 12%)</td><td>${selectedRecord.epf_ecr_challan_number || 'Missing / Not Submitted'}</td><td class="tar">₹${Math.round(selectedRecord.epf_remitted_inr).toLocaleString("en-IN")}</td><td>${selectedRecord.epf_verified ? 'VERIFIED' : 'PENDING'}</td></tr>
      <tr><td>ESI Health Insurance (3.25% + 0.75%)</td><td>${selectedRecord.esi_challan_number || 'Missing / Not Submitted'}</td><td class="tar">₹${Math.round(selectedRecord.esi_remitted_inr).toLocaleString("en-IN")}</td><td>${selectedRecord.esi_verified ? 'VERIFIED' : 'PENDING'}</td></tr>
      <tr><td>Signed Monthly Wage Muster</td><td>Form B Under Central Minimum Wages Rules</td><td class="tar">—</td><td>${selectedRecord.wage_muster_signed ? 'SIGNED & ATTESTED' : 'UNVERIFIED'}</td></tr>
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>Safety & Labor Compliance Officer</div>
      <div style="color: #64748b;">Challans verified against EPFO/ESIC portal.</div>
      <div class="sig">Labor Officer Seal</div>
    </div>
    <div>
      <div>Subcontractor Representative</div>
      <div style="color: #64748b;">Muster wages distributed without deductions.</div>
      <div class="sig">Contractor Attestation</div>
    </div>
    <div>
      <div>Principal Architect / Consultant</div>
      <div style="color: #64748b;">Commercial payment gate clearance approved.</div>
      <div class="sig">Consultant Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        LOADING STATUTORY LABOR & BOCW COMPLIANCE REGISTER...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>BOCW Act 1996 · EPFO & ESIC Governance</span>
              <span>·</span>
              <span className="text-zinc-400">{project.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Labor Statutory Compliance & Challan Audit
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Strict vendor clearance hold-gate. Unverified EPF/ESI challans or unsigned muster rolls automatically freeze payment disbursement on progressive RA Bills.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrintClearance}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Compliance Certificate</span>
            </button>
            <Link
              href="/finance/ra-bills"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-sm"
            >
              <span>Audit in RA Bills</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 4 PRIMARY STATUTORY GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Governed Site Workforce</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {summary.totalHeadcount} Artisans
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Covered across active trade packages</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Compliant & Cleared Packages</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {summary.compliantCount} Cleared
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Full EPF, ESI & BOCW remittance verified</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Statutory Hold-Gate Blocked</span>
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold font-mono mt-2 ${summary.blockedCount > 0 ? "text-rose-400" : "text-zinc-400"}`}>
              {summary.blockedCount} Blocked
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Commercial payout release locked</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>1% BOCW Welfare Pool</span>
              <Scale className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-400 mt-2">
              {formatInr(summary.totalWelfareCess)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Labor Welfare Board cess deposited</div>
          </div>
        </div>

        {/* 2-COLUMN SPLIT: AUDIT TABLE (LEFT) vs COMPLIANCE INSPECTOR (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: COMPLIANCE LEDGER (8 cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Monthly Statutory Audits
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">
                  Subcontractor Challan Verification Register
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search contractor, trade, ref..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-cyan-400 w-52"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filtered.map((item) => {
                const isSelected = selectedRecord?.id === item.id;
                const isCleared = item.compliance_status === "COMPLIANT_CLEARED";

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedRecord(item)}
                    className={`rounded-xl border p-4 transition cursor-pointer flex items-center justify-between gap-4 ${
                      isSelected
                        ? "border-cyan-500/50 bg-cyan-950/20"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {item.contractor_name}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          Month: {item.compliance_month.slice(0, 7)}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isCleared
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                        }`}>
                          {item.compliance_status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-zinc-200">
                        {item.trade_package} · {item.headcount_deployed} Workers
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        Wage Roll: {formatInr(item.gross_wages_payable_inr)} · BOCW Cess: {formatInr(item.bocw_cess_remitted_inr)}
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono text-xs">
                      <div className={item.epf_verified ? "text-emerald-400 font-bold" : "text-rose-400"}>
                        EPF: {item.epf_verified ? "VERIFIED" : "PENDING"}
                      </div>
                      <div className={item.esi_verified ? "text-emerald-400 font-bold" : "text-rose-400 mt-0.5"}>
                        ESI: {item.esi_verified ? "VERIFIED" : "PENDING"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: STATUTORY VERIFICATION DESK (4 cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 flex flex-col justify-between space-y-4">
            {selectedRecord ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                      Compliance Hold-Gate
                    </span>
                    <h3 className="text-sm font-bold text-white mt-0.5">
                      {selectedRecord.clearance_certificate_ref}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {selectedRecord.compliance_month.slice(0, 7)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Subcontractor:</span>
                    <strong className="text-white">{selectedRecord.contractor_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Trade Package:</span>
                    <span className="text-zinc-200">{selectedRecord.trade_package}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-zinc-800/60 font-mono">
                    <span className="text-zinc-400">Gross Wage Roll:</span>
                    <strong className="text-white">{formatInr(selectedRecord.gross_wages_payable_inr)}</strong>
                  </div>
                </div>

                {/* 3-STEP VERIFICATION TOGGLE SWITCHES */}
                <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                    Statutory Portal Verification Checklist:
                  </span>

                  <button
                    type="button"
                    disabled={actionInProgress === selectedRecord.id}
                    onClick={() => handleAuditToggle(selectedRecord.id, "epf_verified")}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition ${
                      selectedRecord.epf_verified
                        ? "border-emerald-800/80 bg-emerald-950/20 text-emerald-300"
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">EPF ECR Electronic Challan</div>
                      <div className="text-[10px] font-mono mt-0.5 opacity-80">
                        Ref: {selectedRecord.epf_ecr_challan_number || "Unsubmitted"}
                      </div>
                    </div>
                    {selectedRecord.epf_verified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={actionInProgress === selectedRecord.id}
                    onClick={() => handleAuditToggle(selectedRecord.id, "esi_verified")}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition ${
                      selectedRecord.esi_verified
                        ? "border-emerald-800/80 bg-emerald-950/20 text-emerald-300"
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">ESIC Monthly Contribution Slip</div>
                      <div className="text-[10px] font-mono mt-0.5 opacity-80">
                        Ref: {selectedRecord.esi_challan_number || "Unsubmitted"}
                      </div>
                    </div>
                    {selectedRecord.esi_verified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={actionInProgress === selectedRecord.id}
                    onClick={() => handleAuditToggle(selectedRecord.id, "wage_muster_signed")}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition ${
                      selectedRecord.wage_muster_signed
                        ? "border-emerald-800/80 bg-emerald-950/20 text-emerald-300"
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">Form B Signed Wage Register</div>
                      <div className="text-[10px] font-mono mt-0.5 opacity-80">
                        Artisan signature / thumbprint muster
                      </div>
                    </div>
                    {selectedRecord.wage_muster_signed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-400" />
                    )}
                  </button>
                </div>

                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-[11px] text-zinc-400">
                  {selectedRecord.audited_by ? (
                    <div>Audited by {selectedRecord.audited_by}</div>
                  ) : (
                    <div>Awaiting statutory labor audit seal</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                Select a subcontractor compliance audit record to review challan proofs.
              </div>
            )}

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              Central Labour Act 1970 / BOCW Act 1996
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}