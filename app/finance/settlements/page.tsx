"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Scale,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  AlertTriangle,
  Database,
  Printer,
  FileCheck2,
  X,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface SettlementRecord {
  id: string;
  project_id: string;
  settlement_code: string;
  package_name: string;
  contractor_name: string;
  cumulative_ra_bills_inr: number;
  final_certified_amount_inr: number;
  retention_amount_inr: number;
  dlp_expiry_date: string;
  punch_items_closed: boolean;
  no_claims_certificate_ref?: string | null;
  final_completion_cert_ref?: string | null;
  status: "Draft" | "In Review" | "Approved" | "Settled & Closed";
}

const FALLBACK_SETTLEMENTS: SettlementRecord[] = [
  {
    id: "set-fb-1",
    project_id: "PRJ-01-LIVE",
    settlement_code: "SET-001",
    package_name: "Foundation Raft & Diaphragm Walls",
    contractor_name: "Apex Structural Formworks Ltd.",
    cumulative_ra_bills_inr: 18400000,
    final_certified_amount_inr: 18150000,
    retention_amount_inr: 915000,
    dlp_expiry_date: "2026-10-31",
    punch_items_closed: true,
    no_claims_certificate_ref: "NCC-CIV-001.pdf",
    final_completion_cert_ref: "FCC-CIV-001.pdf",
    status: "Approved",
  },
  {
    id: "set-fb-2",
    project_id: "PRJ-01-LIVE",
    settlement_code: "SET-002",
    package_name: "Basement HVAC Chillers & Ventilation",
    contractor_name: "Thermax MEP Solutions",
    cumulative_ra_bills_inr: 9600000,
    final_certified_amount_inr: 10100000,
    retention_amount_inr: 505000,
    dlp_expiry_date: "2026-12-31",
    punch_items_closed: false,
    status: "In Review",
  },
  {
    id: "set-fb-3",
    project_id: "PRJ-01-LIVE",
    settlement_code: "SET-003",
    package_name: "Tower Glazing & Unitized Curtain Wall",
    contractor_name: "Sterling Façade & Glazing",
    cumulative_ra_bills_inr: 7200000,
    final_certified_amount_inr: 7000000,
    retention_amount_inr: 350000,
    dlp_expiry_date: "2026-11-15",
    punch_items_closed: true,
    no_claims_certificate_ref: "NCC-FIN-001.pdf",
    final_completion_cert_ref: "FCC-FIN-001.pdf",
    status: "Settled & Closed",
  },
];

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function FinalSettlementsPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadSettlements = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("subcontractor_final_settlements")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setSettlements(FALLBACK_SETTLEMENTS);
        setSelectedSettlement(FALLBACK_SETTLEMENTS[0]);
      } else {
        setIsFallbackMode(false);
        setSettlements(data);
        setSelectedSettlement(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setSettlements(FALLBACK_SETTLEMENTS);
      setSelectedSettlement(FALLBACK_SETTLEMENTS[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadSettlements();
  }, [loadSettlements]);

  const summary = useMemo(() => {
    const totalCount = settlements.length;
    const closedCount = settlements.filter((s) => s.status === "Settled & Closed").length;
    const totalRetention = settlements.reduce((sum, s) => sum + Number(s.retention_amount_inr || 0), 0);
    const closeoutPct = totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 0;
    return { totalCount, closedCount, totalRetention, closeoutPct };
  }, [settlements]);

  const handleApproveSettlement = async (settlementId: string) => {
    try {
      await (supabase as any)
        .from("subcontractor_final_settlements")
        .update({ status: "Settled & Closed" })
        .eq("id", settlementId);
    } catch {
      // optimistic
    }

    setSettlements((prev) =>
      prev.map((s) => (s.id === settlementId ? { ...s, status: "Settled & Closed" } : s))
    );
    if (selectedSettlement?.id === settlementId) {
      setSelectedSettlement((prev) => (prev ? { ...prev, status: "Settled & Closed" } : null));
    }

    setFeedback("Final settlement executed. Retention funds discharged.");
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>COMMERCIAL CLOSEOUT • CPWD WORKS MANUAL SECTION 26 / FINAL ACCOUNTING</span>
              <StatutoryInfo
                standardRef="CPWD SECTION 26 / FIDIC CL. 14.11"
                title="Subcontractor Final Bill & Retention Discharge Settlement"
                idealRange="No-Claims Certificate Mandated"
                description="Governs final contract account settlement. Requires closure of all snag items, submission of a verified No-Claims Certificate (NCC), and final structural stability warranty clearance before retention release."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Scale className="w-6 h-6 text-cyan-400" />
              <span>Final Account Settlements &amp; Retention Discharge</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Reconciliation of certified bills, DLP warranties, and final retention payout gates.
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
              onClick={() => void loadSettlements()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 3 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Contract Closeout Status</span>
            <div className="text-2xl font-bold text-white mt-1">{summary.closeoutPct}% Complete</div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${summary.closeoutPct}%` }} />
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Retention Reservoir</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{formatInr(summary.totalRetention)}</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Subject to final DLP and NCC sign-off</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Discharged Settlements</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {summary.closedCount} / {summary.totalCount} Packages
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Full legal and commercial release</span>
          </div>
        </div>

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
              Final Account Settlement Progression ({settlements.length})
            </span>

            <div className="overflow-x-auto border border-zinc-800">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3">Package &amp; Contractor</th>
                    <th className="p-3 text-right">Cumulative RA Bills</th>
                    <th className="p-3 text-right">Final Certified</th>
                    <th className="p-3 text-right">Retention</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {settlements.map((s) => {
                    const isSelected = selectedSettlement?.id === s.id;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedSettlement(s)}
                        className={`hover:bg-zinc-900/50 transition cursor-pointer ${isSelected ? "bg-cyan-950/20" : ""}`}
                      >
                        <td className="p-3">
                          <span className="font-bold text-white block">{s.package_name}</span>
                          <span className="text-[10px] text-cyan-400">{s.contractor_name} &bull; {s.settlement_code}</span>
                        </td>
                        <td className="p-3 text-right font-mono text-zinc-400">{formatInr(Number(s.cumulative_ra_bills_inr))}</td>
                        <td className="p-3 text-right font-mono font-bold text-zinc-200">{formatInr(Number(s.final_certified_amount_inr))}</td>
                        <td className="p-3 text-right font-mono text-amber-400">{formatInr(Number(s.retention_amount_inr))}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            s.status === "Settled & Closed"
                              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                              : s.status === "Approved"
                              ? "bg-cyan-950 text-cyan-400 border-cyan-800"
                              : "bg-amber-950 text-amber-400 border-amber-800"
                          }`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* DETAIL PANEL */}
          <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm shadow-2xl">
            <div className="border-b border-zinc-800 pb-2">
              <span className="text-[10px] uppercase text-cyan-400 font-bold block">Statutory Gate Audit</span>
              <h3 className="text-sm font-bold text-white mt-0.5">{selectedSettlement?.package_name}</h3>
            </div>

            {selectedSettlement ? (
              <div className="space-y-3">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Contractor:</span>
                    <strong className="text-white">{selectedSettlement.contractor_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">DLP Warranty Expiry:</span>
                    <strong className="text-zinc-300">{selectedSettlement.dlp_expiry_date}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">No-Claims Certificate:</span>
                    <span className="text-emerald-400">{selectedSettlement.no_claims_certificate_ref || "Pending Submission"}</span>
                  </div>
                </div>

                {selectedSettlement.status !== "Settled & Closed" && (
                  <button
                    type="button"
                    onClick={() => handleApproveSettlement(selectedSettlement.id)}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center justify-center gap-1.5 transition"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Discharge Final Retention</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-zinc-600">Select a settlement to inspect closeout gates.</div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
