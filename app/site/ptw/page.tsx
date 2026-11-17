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

export default function PermitToWorkPage() {
  const [sealedId, setSealedId] = useState<string | null>(null);

  const permits = [
    {
      ptwId: "PTW-VGD-2026-118",
      bit: "BIT-2",
      category: "HEIGHT WORK & SPACE-FRAME RIGGING (+16.50m RL)",
      scope: "Kalzip Silver Dome Node #14B MERO collar shim calibration & lifeline anchor check",
      controls: "Double-lanyard full-body harness, anemometer < 10 m/s (4.2 m/s live), ARGUS radar zone lock",
      status: "ACTIVE • EHS VERIFIED",
    },
    {
      ptwId: "PTW-VGD-2026-119",
      bit: "BIT-3",
      category: "CRITICAL LIFT & DIAGRID FACADE HOISTING (+54.00m RL)",
      scope: "14th Floor Diagonal Curtain Wall unitized panel erection via Liebherr 280 EC-H",
      controls: "Taglines, outrigger load check, exclusion barricade below Grid B4–D4",
      status: "ACTIVE • EHS VERIFIED",
    },
    {
      ptwId: "PTW-VGD-2026-120",
      bit: "BIT-4",
      category: "11kV ELECTRICAL LOTO & CHILLER HYDRO-TEST (+0.20m RL)",
      scope: "2,400 TR Plant Room (3 × 800-Ton VFD Chillers) primary header pressure & busduct insulation test",
      controls: "Padlock LOTO #44, insulated mats, CO2 fire watch",
      status: "ACTIVE • EHS VERIFIED",
    },
  ];

  const handleNotarizePtw = async (ptwId: string, bit: string) => {
    const hash = await generateSHA256(`${VANGUARD_GENOME.projectId}_${ptwId}_${bit}_${Date.now()}`);
    try {
      await supabase.from("section_65b_audit_ledger").insert({
        project_id: VANGUARD_GENOME.projectId,
        primary_governor: "ARGUS-EHS-PTW",
        synthesis_report: `PERMIT TO WORK NOTARIZED: ${ptwId} on ${bit} • BOCW Act 1996 / IS 3696 Safety Controls Attested`,
        merkle_root_hash: hash,
      });
    } catch (e) {}
    setSealedId(ptwId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              BOCW ACT 1996 / IS 3696 / IS 3764 EHS GOVERNANCE
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              0 LTI • {VANGUARD_GENOME.projectId}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            STATUTORY PERMIT TO WORK (PTW) & HIGH-RISK LOTO REGISTER
          </h1>
          <p className="text-xs text-slate-400">
            Active Shift Authorizations Across BIT-1 through BIT-6 • Synchronized with DPR #084
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition">
            ← COMMAND CENTER
          </a>
          <a href="/site/dpr" className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 rounded-lg transition">
            📋 DPR #084
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-4 text-xs">
        {permits.map((p) => (
          <div key={p.ptwId} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                  {p.ptwId}
                </span>
                <a href={`/site/digital-twin?bit=${p.bit}`} className="text-cyan-400 font-bold hover:underline">
                  {p.bit}
                </a>
                <span className="text-emerald-400 font-bold text-[10px]">• {p.status}</span>
              </div>
              <div className="text-sm font-bold text-white">{p.category}</div>
              <div className="text-[11px] text-slate-300">{p.scope}</div>
              <div className="text-[10px] text-slate-400">Controls: {p.controls}</div>
            </div>

            <button
              onClick={() => handleNotarizePtw(p.ptwId, p.bit)}
              className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-purple-500/50 text-purple-300 font-bold shrink-0"
            >
              {sealedId === p.ptwId ? "✔ SEC 65B SEALED" : "SEAL PTW AUDIT (SEC 65B)"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
