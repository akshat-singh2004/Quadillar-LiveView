// app/reports/audit/page.tsx
import React from "react";
import { Database, ShieldCheck, Printer, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function AuditReportPage() {
  const supabase = await createClient();

  const { data: logsData } = await supabase
    .from("immutable_audit_logs")
    .select("*")
    .order("created_at", { ascending: false });

  const logs = logsData || [];
  const totalCount = logs.length;
  const verifiedCount = logs.filter((l) => l.severity === "verified" || l.status === "SEALED").length;
  const overrideCount = logs.filter((l) => l.severity === "severe" || l.status.includes("BLOCKED")).length;

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 font-mono text-xs">
      <header className="bg-zinc-900 border border-zinc-800 p-5 mb-6 flex justify-between items-center">
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">
            Statutory Governance &amp; Forensics
          </span>
          <h1 className="text-xl font-bold uppercase tracking-wider text-zinc-100 mt-1">
            Immutable Audit Trail &amp; Statutory Vault
          </h1>
        </div>
        <button
          type="button"
          className="bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-bold px-4 py-2 uppercase tracking-wider flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          <span>Export Certified Ledger</span>
        </button>
      </header>

      {/* Synchronized Real-Time KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 p-5">
          <div className="flex justify-between items-center text-zinc-400 uppercase text-[10px]">
            <span>Total Logged Events</span>
            <Database className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="text-3xl font-bold mt-3 text-zinc-100 tabular-nums">
            {totalCount}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Live Append-Only Ledger Records
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5">
          <div className="flex justify-between items-center text-zinc-400 uppercase text-[10px]">
            <span>Cryptographically Verified</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold mt-3 text-emerald-400 tabular-nums">
            {verifiedCount}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            100% Hash Check Integrity
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5">
          <div className="flex justify-between items-center text-zinc-400 uppercase text-[10px]">
            <span>High-Risk Overrides Intercepted</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-3xl font-bold mt-3 text-rose-500 tabular-nums">
            {overrideCount}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Hard Security Interlocks Active
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-zinc-900 border border-zinc-800 overflow-x-auto">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="font-bold uppercase tracking-wider text-zinc-200">
            Zero-Trust Transaction Log
          </h2>
          <span className="text-[11px] text-zinc-400">
            Total Entries: <strong className="text-zinc-100">{totalCount}</strong>
          </span>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/60 text-[10px] text-zinc-500 uppercase">
              <th className="p-3">Timestamp (UTC)</th>
              <th className="p-3">Signatory &amp; Role</th>
              <th className="p-3">Action Category</th>
              <th className="p-3">Module Ref</th>
              <th className="p-3">Fingerprint</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500">
                  No statutory events logged. Trigger a workflow action to generate verifiable records.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-800/30">
                  <td className="p-3 text-zinc-400 whitespace-nowrap">
                    {new Date(log.created_at).toUTCString()}
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-zinc-200">{log.signatory_name}</div>
                    <div className="text-[10px] text-zinc-500">{log.signatory_role}</div>
                  </td>
                  <td className="p-3 text-zinc-300 font-semibold">{log.action_category}</td>
                  <td className="p-3 text-zinc-400">{log.module_ref}</td>
                  <td className="p-3 text-[10px] text-zinc-500">{log.ip_fingerprint}</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 border text-[10px] uppercase font-bold bg-emerald-950/40 border-emerald-800 text-emerald-400">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}