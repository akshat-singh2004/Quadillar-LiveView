"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Users, TrendingUp, Clock, HardHat, ArrowRight } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export function WorkforceScheduleTelemetryWidget() {
  const { project, tier } = useActiveRole();
  const [actualHeadcount, setActualHeadcount] = useState(tier === "RESIDENTIAL" ? 7 : 88);
  const [yieldEfficiency, setYieldEfficiency] = useState(96.4);

  useEffect(() => {
    async function loadWorkforceSnapshot() {
      const { data } = await supabase
        .from("labor_roster_entries")
        .select("actual_headcount, target_output_qty, achieved_output_qty")
        .eq("project_id", project.id);

      if (data && data.length > 0) {
        const totalActual = data.reduce((sum, item) => sum + Number(item.actual_headcount), 0);
        const totalTarget = data.reduce((sum, item) => sum + Number(item.target_output_qty), 0);
        const totalAchieved = data.reduce((sum, item) => sum + Number(item.achieved_output_qty), 0);

        setActualHeadcount(totalActual);
        if (totalTarget > 0) {
          setYieldEfficiency(Number(((totalAchieved / totalTarget) * 100).toFixed(1)));
        }
      }
    }
    void loadWorkforceSnapshot();
  }, [project.id]);

  return (
    <section className="grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-sm flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
            Site Workforce Muster & Yield
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div className="text-3xl font-extrabold font-mono text-white">
              {actualHeadcount} <span className="text-xs text-zinc-400 font-sans">Artisans on Site</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-emerald-400">{yieldEfficiency}%</div>
              <div className="text-[10px] text-zinc-400 uppercase">Gang Yield Index</div>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-cyan-400"
              style={{ width: `${Math.min(100, yieldEfficiency)}%` }}
            />
          </div>
        </div>
        <Link
          href="/site/labor"
          className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
        >
          <span>Open muster ledger</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-sm flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
            4D Schedule Critical Path Variance
          </div>
          <div className="mt-3 flex items-end gap-6 font-mono">
            <div>
              <div className="text-3xl font-extrabold text-emerald-400">8</div>
              <div className="text-[11px] text-zinc-400 font-sans mt-0.5">Tasks Ahead</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-rose-400">3</div>
              <div className="text-[11px] text-zinc-400 font-sans mt-0.5">Tasks Behind (Critical)</div>
            </div>
          </div>
        </div>
        <Link
          href="/schedule/gantt"
          className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
        >
          <span>Launch Critical Path Gantt</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}