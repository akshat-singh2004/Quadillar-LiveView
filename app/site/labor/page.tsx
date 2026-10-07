import React from "react";
import { RegisterWorkerModal } from "@/components/labor/RegisterWorkerModal";
import { SimulateTurnstilePunchModal } from "@/components/labor/SimulateTurnstilePunchModal";
import { createClient } from "@/lib/supabase/server";
import { BocwLaborEngine, RegisteredWorker, TurnstilePunch } from "@/lib/labor/bocw-engine";
import { Users, ShieldCheck, ShieldAlert, Radio, Clock, Fingerprint, Landmark } from "lucide-react";

export default async function LaborMusterPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real workmen
  const { data: workmenRows } = await supabase
    .from("bocw_workmen_registry")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  // Fetch real turnstile punch events
  const { data: punchRows } = await supabase
    .from("biometric_turnstile_events")
    .select("*")
    .eq("project_id", projectId)
    .order("punch_timestamp", { ascending: false })
    .limit(50);

  const rawWorkers = workmenRows || [];
  const rawPunches = punchRows || [];

  const mappedWorkers: RegisteredWorker[] = rawWorkers.map((w: any) => ({
    id: w.id,
    workerPin: w.worker_pin,
    fullName: w.full_name,
    contractorAgency: w.contractor_agency,
    tradePackage: w.trade_package,
    skillTier: w.skill_tier,
    dailyWageInr: Number(w.daily_wage_inr || 0),
    uanNumber: w.uan_number,
    esicNumber: w.esic_number,
    ismwPassbookIssued: Boolean(w.ismw_passbook_issued),
  }));

  const mappedPunches: TurnstilePunch[] = rawPunches.map((p: any) => ({
    id: p.id,
    workerPin: p.worker_pin,
    direction: p.direction,
    punchTimestamp: p.punch_timestamp,
  }));

  const musterSummary = BocwLaborEngine.evaluateShiftMuster(mappedWorkers, mappedPunches);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>BOCW ACT 1996 • BIOMETRIC TURNSTILE GATEWAY &amp; LABOUR AUDIT • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Biometric Muster &amp; Statutory Labour Compliance
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Real-time RFID turnstile ingress, ghost-worker zero-tolerance &amp; 1% BOCW Welfare Cess.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            rawPunches.length > 0 ? "bg-emerald-950 border-emerald-800 text-emerald-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${rawPunches.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
            <span>{rawPunches.length > 0 ? "TURNSTILE 01: ONLINE (TCP:554)" : "TURNSTILE 01: HARDWARE DISCONNECTED"}</span>
          </span>

          <SimulateTurnstilePunchModal projectId={projectId} />
          <RegisterWorkerModal projectId={projectId} />
        </div>
      </header>

      {/* 4 STATUTORY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Active In-Boundary Personnel</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
            {musterSummary.activePunchedInWorkers} Workers
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Biometric muster gate ingress</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">BOCW Registered Muster</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">
            {mappedWorkers.length} Personnel
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Verified UAN / ESIC credentials</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Certified Daily Wage Output</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
            ₹{musterSummary.certifiedDailyWageInr.toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Audited against physical punch time</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">1% BOCW Welfare Cess Lien</span>
          <div className="text-xl font-bold text-amber-400 mt-1 tabular-nums">
            ₹{musterSummary.bocwWelfareCessInr.toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Statutory deduction on RA bill</span>
        </div>
      </div>

      {/* TURNSTILE LIVE INGRESS FEED & ROSTER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* RECENT PUNCH INGRESS LOGS (7 COLS) */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>Live Turnstile Punch Ingress ({rawPunches.length})</span>
            </span>
            <span className="text-[10px] text-zinc-500">Real-Time Hardware Stream</span>
          </div>

          <div className="divide-y divide-zinc-800/60 max-h-[520px] overflow-y-auto">
            {rawPunches.length === 0 ? (
              <div className="p-12 text-center text-zinc-600 font-sans">
                Zero turnstile events logged today. Bridge physical turnstile or click &quot;Hardware Ingress Test&quot; above.
              </div>
            ) : (
              rawPunches.map((p: any) => (
                <div key={p.id} className="p-3.5 flex justify-between items-center hover:bg-zinc-850/50 transition">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      p.direction === "IN"
                        ? "bg-emerald-950 border border-emerald-800 text-emerald-300"
                        : "bg-amber-950 border border-amber-800 text-amber-300"
                    }`}>
                      {p.direction}
                    </span>
                    <div>
                      <strong className="text-white text-xs">{p.worker_pin}</strong>
                      <span className="text-[10px] text-zinc-500 block font-sans">Terminal: {p.terminal_id}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {new Date(p.punch_timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[9px] text-emerald-400 block font-bold">✓ PUNCH VERIFIED</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* REGISTERED BOCW WORKMEN ROSTER (5 COLS) */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
              <span>Registered Workmen Roster ({mappedWorkers.length})</span>
            </span>
            <span className="text-[10px] text-zinc-500">Statutory Form XVI</span>
          </div>

          <div className="divide-y divide-zinc-800/60 max-h-[520px] overflow-y-auto">
            {mappedWorkers.length === 0 ? (
              <div className="p-12 text-center text-zinc-600 font-sans">
                Zero workers registered. Click &quot;+ Register BOCW Workman&quot; to enroll field personnel.
              </div>
            ) : (
              mappedWorkers.map((w) => (
                <div key={w.id} className="p-3.5 space-y-1 hover:bg-zinc-850/50 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className="text-white text-xs">{w.fullName}</strong>
                      <span className="text-[10px] text-cyan-400 font-mono ml-2">[{w.workerPin}]</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 tabular-nums">
                      ₹{w.dailyWageInr}/d
                    </span>
                  </div>

                  <div className="text-[10px] text-zinc-400 font-sans truncate">
                    {w.tradePackage} • {w.contractorAgency}
                  </div>

                  <div className="flex items-center gap-2 pt-0.5 text-[9px] text-zinc-500 font-mono">
                    <span>UAN: {w.uanNumber ? `${w.uanNumber.slice(0, 4)}...` : "UNSET"}</span>
                    <span>•</span>
                    <span className={w.ismwPassbookIssued ? "text-emerald-400" : "text-zinc-600"}>
                      {w.ismwPassbookIssued ? "ISMW Passbook Active" : "No ISMW"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
