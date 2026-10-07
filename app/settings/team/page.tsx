import React from "react";
import { Users, ShieldCheck, ShieldAlert, Clock, Key, Shield } from "lucide-react";
import { StakeholderMatrix } from "@/components/settings/StakeholderMatrix";

// ---------------------------------------------------------------------------
// Server Component: Master Settings & Stakeholder Matrix
// ---------------------------------------------------------------------------

export default function TeamSettingsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 font-sans">
      <div className="grid grid-cols-12 gap-6">
        {/* ===================================================================
            TOP ROW (col-span-12): Dashboard Header
            =================================================================== */}
        <header className="col-span-12 bg-zinc-900 border border-zinc-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between px-5 py-4 border-b border-zinc-800/50">
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono tracking-widest text-zinc-400 uppercase">
                  ADMINISTRATIVE GOVERNANCE
                </span>
                <span className="text-zinc-600">/</span>
                <span className="text-xs font-mono tracking-tight text-zinc-400">
                  MULTI-TENANT RBAC &amp; STATUTORY IDENTITY VAULT
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-100 mt-1 uppercase font-mono">
                Master Settings &amp; Stakeholder Matrix
              </h1>
            </div>

            <div className="mt-3 md:mt-0 flex items-center gap-3 self-start md:self-auto">
              <div className="border border-zinc-800 bg-zinc-950 px-3 py-1.5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-500 font-medium">
                  ISO 19650-2 RBAC ACTIVE
                </span>
              </div>
              <div className="border border-zinc-800 bg-zinc-950 px-3 py-1.5">
                <span className="text-xs font-mono tabular-nums tracking-tight text-zinc-400 uppercase">
                  TENANT: QDL-LKO-2026
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 px-5 py-2.5 text-xs text-zinc-400 bg-zinc-950/40">
            <div className="text-left border-r border-zinc-800/50 pr-4">
              <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Security Framework</span>
              <span className="text-zinc-100 font-mono text-xs block truncate">CPWD Works Manual 2024 / ISO 19650</span>
            </div>
            <div className="text-left md:border-r border-zinc-800/50 px-0 md:px-4">
              <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Authentication Engine</span>
              <span className="text-emerald-400 font-mono text-xs block font-bold">Supabase Row-Level Security</span>
            </div>
            <div className="text-left border-r border-zinc-800/50 pr-4 md:px-4 mt-2 md:mt-0">
              <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Statutory ID Verification</span>
              <span className="text-zinc-100 font-mono text-xs block truncate">CoA, CIN, GSTIN, TAN Attested</span>
            </div>
            <div className="text-left pl-0 md:pl-4 mt-2 md:mt-0">
              <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Ledger Sync</span>
              <span className="text-zinc-100 font-mono text-xs block">Immutable Vault Telemetry</span>
            </div>
          </div>
        </header>

        {/* ===================================================================
            KPI CARDS (Three col-span-4 cards)
            =================================================================== */}

        {/* KPI 1: Active Stakeholders */}
        <div className="col-span-12 md:col-span-4 bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
                Active Stakeholders
              </span>
              <Users className="h-4 w-4 text-emerald-400" />
            </div>

            <div className="flex flex-col items-end my-1">
              <span className="font-mono tabular-nums tracking-tight text-3xl font-bold text-zinc-100 text-right">
                24
              </span>
              <span className="text-xs text-zinc-400 font-mono mt-0.5 text-right">
                Verified Identity Chains
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs font-mono">
            <span className="text-zinc-500">Active RBAC Tenants</span>
            <span className="text-emerald-400 font-mono">100% Attested</span>
          </div>
        </div>

        {/* KPI 2: Pending Statutory Verifications */}
        <div className="col-span-12 md:col-span-4 bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
                Pending Statutory Verifications
              </span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>

            <div className="flex flex-col items-end my-1">
              <span className="font-mono tabular-nums tracking-tight text-3xl font-bold text-amber-400 text-right">
                3
              </span>
              <span className="text-xs text-amber-400/80 font-mono mt-0.5 text-right">
                CoA / GSTIN Awaiting Attestation
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs font-mono">
            <span className="text-zinc-500">Compliance Hold</span>
            <span className="text-amber-400 font-mono">KYC Scrutiny Required</span>
          </div>
        </div>

        {/* KPI 3: Revoked Access Logs */}
        <div className="col-span-12 md:col-span-4 bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
                Revoked Access Logs
              </span>
              <ShieldAlert className="h-4 w-4 text-rose-500" />
            </div>

            <div className="flex flex-col items-end my-1">
              <span className="font-mono tabular-nums tracking-tight text-3xl font-bold text-rose-500 text-right">
                2
              </span>
              <span className="text-xs text-rose-400 font-mono mt-0.5 text-right">
                Contract Expiry / Suspended
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs font-mono">
            <span className="text-zinc-500">Security Quarantine</span>
            <span className="text-rose-400 font-mono font-semibold">Zero Active Breaches</span>
          </div>
        </div>

        {/* ===================================================================
            MAIN CONTENT (col-span-12): Stakeholder Matrix Component
            =================================================================== */}
        <section className="col-span-12">
          <StakeholderMatrix />
        </section>
      </div>
    </div>
  );
}
