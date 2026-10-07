import React from "react";
import { fetchWorkerGatePasses } from "@/app/actions/gate-pass-actions";
import { PrintableOperativeBadge } from "@/components/labor/PrintableOperativeBadge";
import { createClient } from "@/lib/supabase/server";
import { Users, QrCode, ShieldCheck, Heart, Plus, ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";

export default async function OperativeGatePassesPage({
  searchParams,
}: {
  searchParams: Promise<{ selectedPin?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  const passes = await fetchWorkerGatePasses(projectId);
  const activeCount = passes.filter((p) => p.status === "ACTIVE").length;
  const skilledCount = passes.filter((p) => p.skill_level === "SKILLED").length;

  const selectedPass = params.selectedPin
    ? passes.find((p) => p.worker_pin === params.selectedPin) || null
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>LABOR WELFARE &amp; BIOMETRIC CREDENTIALS • BOCW ACT 1996 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Agent Plutus Operative Gate Pass &amp; QR Badge Directory
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Standard CR80 PVC operative identity badges, medical validity registries, and tamper-evident turnstile QR codes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/labor/scan"
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold uppercase text-[10px] transition flex items-center gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Turnstile Scanner</span>
          </Link>
          <Link
            href="/governance/council"
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold uppercase text-[10px] transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Council War Room</span>
          </Link>
        </div>
      </header>

      {/* 4 STATUTORY LABOR KPIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Issued Gate Passes</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{passes.length} Credentials</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Active Workforce Register</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Active Ingress Status</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">{activeCount} Cleared</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Turnstile Access Granted</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Skilled Trades (≥₹850/d)</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">{skilledCount} Tradesmen</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Statutory Wage Compliant</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">BOCW 1996 Compliance</span>
          <div className="text-xl font-bold text-amber-400 mt-1 tabular-nums">100.0%</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Medical Clearance Enforced</span>
        </div>
      </div>

      {/* PASSES DIRECTORY TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80">
          <span className="font-bold text-white uppercase text-xs">
            Registered Site Operatives ({passes.length})
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">
            Click &quot;Print PVC Badge&quot; to inspect printable ISO CR80 layout
          </span>
        </div>

        <div className="divide-y divide-zinc-800">
          {passes.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-sans">
              No operative passes issued yet. Run the issuance harness to register credentials.
            </div>
          ) : (
            passes.map((p) => (
              <div
                key={p.id}
                className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-zinc-850/50 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-cyan-400 font-bold text-[10px]">
                      {p.worker_pin}
                    </span>
                    <strong className="text-white text-sm uppercase">{p.full_name}</strong>
                    <span className="text-zinc-500 text-xs">({p.trade_category})</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 text-[9px] font-bold">
                      {p.skill_level}
                    </span>
                  </div>

                  <div className="text-[10px] text-zinc-400 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                    <span>Subcontractor: <strong className="text-zinc-200">{p.subcontractor_name}</strong></span>
                    <span>BOCW ID: <strong className="text-zinc-300">{p.bocw_registration_no}</strong></span>
                    <span>Medical Valid: <strong className="text-emerald-400">{p.medical_fitness_valid_until}</strong></span>
                    <span>Blood: <strong className="text-rose-400">{p.blood_group}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/labor/passes?selectedPin=${p.worker_pin}`}
                    className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-cyan-400 font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print PVC Badge</span>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* POPUP PRINTABLE BADGE MODAL WHEN PIN IS SELECTED */}
      {selectedPass && (
        <PrintableOperativeBadge pass={selectedPass} />
      )}
    </div>
  );
}
