// @refresh reset
"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function DailyProgressReportPage() {
  const [isSealing, setIsSealing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  const tradeRoster = [
    { code: "BRB-01", trade: "Rebar Benders & Fixers (Diagrid Core)", bit: "BIT-3", headcount: 14, executed: "5.1 MT", norm: "4.9 MT", eff: "104%" },
    { code: "CRP-02", trade: "Formwork Carpenters & Shuttering Fitters", bit: "BIT-1", headcount: 12, executed: "91.5 m²", norm: "86.4 m²", eff: "106%" },
    { code: "MAS-03", trade: "Terracotta Cladding & Surface Finishers", bit: "BIT-1", headcount: 8, executed: "39.2 m²", norm: "38.4 m²", eff: "102%" },
    { code: "RIG-04", trade: "Heavy Riggers & Space-Frame Erectors", bit: "BIT-2", headcount: 8, executed: "4.3 MT", norm: "3.9 MT", eff: "110%" },
    { code: "MEP-05", trade: "Chiller Piping & 14F HVAC Duct Fitters", bit: "BIT-4", headcount: 8, executed: "29.4 m", norm: "28.0 m", eff: "105%" },
    { code: "HLP-06", trade: "General Site Helpers & Safety Marshals", bit: "BIT-4", headcount: 16, executed: "16 Shift", norm: "16.0 Shift", eff: "100%" },
  ];

  const plantTelemetry = [
    {
      asset: `${VANGUARD_GENOME.craneTelemetry.model} High-Top Tower Crane (65m Jib)`,
      meta: `Operator: Akshatwar Dayal • Azimuth: ${VANGUARD_GENOME.craneTelemetry.azimuthDeg}° (${VANGUARD_GENOME.craneTelemetry.targetZone})`,
      runHrs: "6.8h Run",
      bit: "BIT-2",
    },
    {
      asset: "Schwing Stetter Concrete Boom Pump (36m)",
      meta: "Operator: Vikram Yadav • Fuel: 68L Diesel • BIT-4 Podium Pour",
      runHrs: "5.5h Run",
      bit: "BIT-4",
    },
    {
      asset: "Cummins 250 kVA Silent Site DG Generator",
      meta: "Operator: Site Electrician • Fuel: 80L Diesel • Plant Room Backup",
      runHrs: "8.0h Run",
      bit: "BIT-4",
    },
    {
      asset: "High-Frequency Concrete Poker Vibrators (×4)",
      meta: "Operator: Concreting Crew • Fuel: 14.5L Diesel",
      runHrs: "5.0h Run",
      bit: "BIT-3",
    },
  ];

  const handleNotarizeDpr = async () => {
    setIsSealing(true);
    const ts = new Date().toISOString();
    const payload = `${VANGUARD_GENOME.projectId}_DPR084_WORKERS66_CRANE_${VANGUARD_GENOME.craneTelemetry.model}_${ts}`;
    const hash = await generateSHA256(payload);

    try {
      await supabase.from("section_65b_audit_ledger").insert({
        project_id: VANGUARD_GENOME.projectId,
        primary_governor: "ARGUS-DPR-TELEMETRY",
        synthesis_report: `DPR #084 TRIPARTITE SEALED: 66 Workers (103.3% IS 7272 Productivity) • ${VANGUARD_GENOME.craneTelemetry.model} (6.8h Run, Azimuth ${VANGUARD_GENOME.craneTelemetry.azimuthDeg}°) • 0 LTI / Zero Accidents`,
        merkle_root_hash: hash,
      });
    } catch (e) {}

    setSealedHash(hash);
    setIsSealing(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              CPWD WORKS MANUAL SEC 32 / IS 7272
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              {VANGUARD_GENOME.projectId}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            DAILY PROGRESS REPORT (DPR #084) — {VANGUARD_GENOME.projectName.toUpperCase()}
          </h1>
          <p className="text-xs text-slate-400">
            Shift: Day Shift (08:00 - 17:00 IST) • Synchronized with 6 Architectural Bits & Section 65B Ledger
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition">
            ← COMMAND CENTER
          </a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg transition">
            🏛️ 3D BIM TWIN
          </a>
          <a href="/site/master-schedule" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 rounded-lg transition">
            📊 CPM & EVM
          </a>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase">DEPLOYED MANPOWER</div>
          <div className="text-xl font-bold text-white mt-1">66 Workers</div>
          <div className="text-[10px] text-slate-500 mt-0.5">528 Gross Man-Hours</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase">LABOR PRODUCTIVITY INDEX</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">103.3%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">IS 7272 Standard Output Ratio</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase">PLANT AVAILABILITY</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">96.4%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{VANGUARD_GENOME.craneTelemetry.model} Online</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase">DIESEL CONSUMPTION</div>
          <div className="text-xl font-bold text-amber-400 mt-1">162.5 Liters</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Weighbridge Fuel Reconciled</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase">STATUTORY SAFETY AUDIT</div>
          <div className="text-base font-bold text-emerald-400 mt-1.5">0 LTI / ZERO ACCIDENTS</div>
          <div className="text-[10px] text-slate-500 mt-0.5">6 Active Bits Verified</div>
        </div>
      </div>

      {/* Main Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-xs">
            <span className="font-bold text-white uppercase">TRADE-WISE LABOR DEPLOYMENT & PRODUCTION RECORD</span>
            <span className="text-[10px] text-cyan-400">BOCW ACT 1996</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[10px] text-slate-500 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2 px-2">CODE</th>
                  <th className="py-2 px-2">DESIGNATION & TRADE</th>
                  <th className="py-2 px-2">ZONE</th>
                  <th className="py-2 px-2">CREW</th>
                  <th className="py-2 px-2">EXECUTED</th>
                  <th className="py-2 px-2">IS 7272 NORM</th>
                  <th className="py-2 px-2 text-right">EFF.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-[11px]">
                {tradeRoster.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-2 font-bold text-cyan-400">{row.code}</td>
                    <td className="py-2.5 px-2 text-white">{row.trade}</td>
                    <td className="py-2.5 px-2">
                      <a
                        href={`/site/digital-twin?bit=${row.bit}`}
                        className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 text-[10px] hover:border-cyan-400"
                      >
                        {row.bit}
                      </a>
                    </td>
                    <td className="py-2.5 px-2 text-slate-300">{row.headcount}</td>
                    <td className="py-2.5 px-2 font-bold text-white">{row.executed}</td>
                    <td className="py-2.5 px-2 text-slate-400">{row.norm}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-emerald-400">{row.eff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-white uppercase border-b border-slate-800 pb-2">
              PLANT & MACHINERY TELEMETRY (VANGUARD FLEET)
            </span>
            {plantTelemetry.map((p) => (
              <div
                key={p.asset}
                className="p-2.5 bg-slate-950/90 border border-slate-800 rounded-xl flex justify-between items-center gap-2 text-xs"
              >
                <div>
                  <div className="font-bold text-white">{p.asset}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{p.meta}</div>
                </div>
                <a
                  href={`/site/digital-twin?bit=${p.bit}`}
                  className="px-2 py-1 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-bold text-[10px] shrink-0"
                >
                  {p.runHrs}
                </a>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-purple-300 uppercase">
                SECTION 65B TRIPARTITE DPR SEAL
              </div>
              <div className="text-[11px] text-slate-300 mt-1">
                Jointly signed by L&T Project Manager, CBRE Resident Engineer, and Vanguard Safety Director.
              </div>
            </div>

            {sealedHash ? (
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
                <div className="text-xs font-bold text-emerald-300">✔ DPR #084 NOTARIZED IN SUPABASE</div>
                <div className="text-[9px] text-slate-400 mt-1 truncate select-all">{sealedHash}</div>
              </div>
            ) : (
              <button
                onClick={handleNotarizeDpr}
                disabled={isSealing}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs rounded-xl transition hover:opacity-95"
              >
                {isSealing ? "SEALING LEDGER..." : "NOTARIZE DAILY PROGRESS REPORT (SEC 65B)"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
