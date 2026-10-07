"use client";

import React, { useState } from "react";
import { BBSDetailModal } from "@/components/engineering/BBSDetailModal";
import { saveBBSchedule } from "@/app/actions/bbs-actions";
import { CheckCircle2, AlertTriangle, Layers } from "lucide-react";

interface ScheduleItem {
  id: string;
  element_tag?: string;
  elementTag?: string;
  member_type?: string;
  memberType?: string;
  bar_diameter_mm?: number;
  diameterMm?: number;
  number_of_bars?: number;
  numberOfBars?: number;
  cut_length_m?: number;
  cutLengthPerBarM?: number;
  scrap_pct?: number;
  scrapRatePct?: number;
  total_weight_mt?: number;
  totalWeightMt?: number;
  status?: string;
}

interface Props {
  projectId: string;
  initialSchedules: ScheduleItem[];
}

export function BBSClientManager({ projectId, initialSchedules }: Props) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>(initialSchedules);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSaveSchedule = async (data: any) => {
    const res = await saveBBSchedule({
      projectId,
      elementTag: data.elementTag,
      memberType: data.memberType,
      diameterMm: data.diameterMm,
      barShape: data.barShape,
      numberOfBars: data.numberOfBars,
      spacingCcMm: data.spacingCcMm,
      clearCoverMm: data.clearCoverMm,
      cutLengthPerBarM: data.cutLengthPerBarM,
      bendDeductionMm: data.bendDeductionMm,
      residualScrapLengthM: data.residualScrapLengthM,
      scrapRatePct: data.scrapRatePct,
      totalLengthM: data.totalLengthM,
      totalWeightMt: data.totalWeightMt,
      status: data.status,
    });

    if (res.success && res.data) {
      setSchedules((prev) => [res.data, ...prev]);
      setFeedback(`Schedule for [${data.elementTag}] committed and saved to project steel ledger.`);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <BBSDetailModal onSave={handleSaveSchedule} />
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* SCHEDULES TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Committed Rebar Cutting Schedules ({schedules.length})</span>
          </span>
          <span className="text-[10px] text-zinc-500">Fabrication Yard Dispatch</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="p-3">Element Tag</th>
                <th className="p-3">Member Type</th>
                <th className="p-3 text-right">Dia (mm)</th>
                <th className="p-3 text-right">Bars</th>
                <th className="p-3 text-right">Cut Length (m)</th>
                <th className="p-3 text-right">Scrap Rate</th>
                <th className="p-3 text-right">Total Weight</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-600 font-sans">
                    Zero customized schedules committed yet. Click &quot;New BBS Schedule&quot; above to calculate bar cut lists.
                  </td>
                </tr>
              ) : (
                schedules.map((item) => {
                  const tag = item.element_tag || item.elementTag || "Element";
                  const member = item.member_type || item.memberType || "Column";
                  const dia = item.bar_diameter_mm || item.diameterMm || 20;
                  const bars = item.number_of_bars || item.numberOfBars || 1;
                  const cutM = Number(item.cut_length_m || item.cutLengthPerBarM || 0);
                  const scrap = Number(item.scrap_pct || item.scrapRatePct || 2.4);
                  const wt = Number(item.total_weight_mt || item.totalWeightMt || 0);

                  return (
                    <tr key={item.id} className="hover:bg-zinc-850 transition">
                      <td className="p-3 font-bold text-white">{tag}</td>
                      <td className="p-3 text-zinc-400">{member}</td>
                      <td className="p-3 text-right font-bold text-cyan-400">{dia} mm</td>
                      <td className="p-3 text-right tabular-nums">{bars}</td>
                      <td className="p-3 text-right tabular-nums">{cutM.toFixed(2)} m</td>
                      <td className="p-3 text-right tabular-nums font-bold text-emerald-400">{scrap.toFixed(1)}%</td>
                      <td className="p-3 text-right tabular-nums text-white font-bold">{wt.toFixed(3)} MT</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] uppercase font-bold">
                          {item.status || "Approved"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
