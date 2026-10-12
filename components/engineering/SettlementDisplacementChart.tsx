"use client";

import React, { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GeotechnicalReading, PileLoadReading } from "@/types/construction";

const defaultReadings: GeotechnicalReading[] = [];
const defaultPileCurve: PileLoadReading[] = [];

interface SettlementDisplacementChartProps {
  readings?: GeotechnicalReading[];
  pileCurve?: PileLoadReading[];
}

export function SettlementDisplacementChart({
  readings = defaultReadings,
  pileCurve = defaultPileCurve,
}: SettlementDisplacementChartProps) {
  const [view, setView] = useState<"movement" | "pile">("movement");
  const activeReadings = readings;
  const activePile = pileCurve;

  const latest = activeReadings[activeReadings.length - 1];
  const actionBreaches = activeReadings.filter(
    (item) => item.wallDeflectionMm >= 25 || item.prismSettlementMm >= 20
  ).length;

  const ultimateLoad =
    activePile.length > 0 ? (activePile[activePile.length - 1]?.loadKN ?? 0) : 0;
  const elasticReboundLimit = 10;

  return (
    <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl font-mono text-xs select-none space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800 pb-3">
        <div>
          <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            Instrument Cluster • 15-Minute Sync Interval
          </div>
          <h2 className="text-base font-bold text-white uppercase mt-0.5">
            Settlement &amp; Displacement Telemetry
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("movement")}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase text-[10px] transition cursor-pointer ${
              view === "movement"
                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/40"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            Movement History
          </button>
          <button
            type="button"
            onClick={() => setView("pile")}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase text-[10px] transition cursor-pointer ${
              view === "pile"
                ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/40"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            IS 2911 Pile Analyzer
          </button>
        </div>
      </div>

      {view === "movement" ? (
        <>
          {activeReadings.length === 0 ? (
            <div className="h-72 w-full flex flex-col items-center justify-center border border-dashed border-zinc-800 bg-zinc-950/40 rounded-xl text-zinc-500 font-mono text-xs">
              <span>Zero optical prism settlement or inclinometer telemetry recorded.</span>
              <span className="text-[10px] text-zinc-600 mt-1">
                Awaiting IS 2911 / IS 1893 deep foundation sensor ingress stream.
              </span>
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={activeReadings}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                  <XAxis dataKey="time" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      borderColor: "#27272a",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    itemStyle={{ color: "#fafafa" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <ReferenceLine
                    y={20}
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    label={{ value: "Warning (20mm)", fill: "#f59e0b", fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={25}
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    label={{ value: "Action (25mm)", fill: "#ef4444", fontSize: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="wallDeflectionMm"
                    name="Wall Deflection (mm)"
                    stroke="#f97316"
                    strokeWidth={2.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="prismSettlementMm"
                    name="Prism Settlement (mm)"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="piezometerLevelM"
                    name="Water Table (m)"
                    stroke="#a78bfa"
                    strokeWidth={2.5}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-800 text-center">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
              <span className="text-zinc-500 text-[10px] uppercase block font-bold">
                Latest Wall Deflection
              </span>
              <strong className="text-white text-sm mt-0.5 block tabular-nums">
                {latest?.wallDeflectionMm != null
                  ? `${latest.wallDeflectionMm} mm`
                  : "0.0 mm"}
              </strong>
            </div>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
              <span className="text-zinc-500 text-[10px] uppercase block font-bold">
                Latest Prism Settlement
              </span>
              <strong className="text-white text-sm mt-0.5 block tabular-nums">
                {latest?.prismSettlementMm != null
                  ? `${latest.prismSettlementMm} mm`
                  : "0.0 mm"}
              </strong>
            </div>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
              <span className="text-zinc-500 text-[10px] uppercase block font-bold">
                Action Limit Breaches
              </span>
              <strong
                className={`text-sm mt-0.5 block tabular-nums ${
                  actionBreaches > 0
                    ? "text-rose-400"
                    : activeReadings.length === 0
                    ? "text-zinc-500"
                    : "text-emerald-400"
                }`}
              >
                {actionBreaches > 0
                  ? `${actionBreaches} Alert(s)`
                  : activeReadings.length === 0
                  ? "NIL / NO SENSORS"
                  : "Zero (Nominal)"}
              </strong>
            </div>
          </div>
        </>
      ) : (
        <>
          {activePile.length === 0 ? (
            <div className="h-72 w-full flex flex-col items-center justify-center border border-dashed border-zinc-800 bg-zinc-950/40 rounded-xl text-zinc-500 font-mono text-xs">
              <span>Zero cyclic pile load test curves recorded.</span>
              <span className="text-[10px] text-zinc-600 mt-1">
                Log hydraulic jack pressure increments to plot settlement under IS 2911 (Part 4).
              </span>
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={activePile}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                  <XAxis dataKey="loadKN" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      borderColor: "#27272a",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    itemStyle={{ color: "#fafafa" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <ReferenceLine
                    y={elasticReboundLimit}
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    label={{
                      value: "Elastic Limit (10mm)",
                      fill: "#f59e0b",
                      fontSize: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="settlementMm"
                    name="Pile Settlement (mm)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-800 text-center">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
              <span className="text-zinc-500 text-[10px] uppercase block font-bold">
                Ultimate Load Capacity
              </span>
              <strong className="text-white text-sm mt-0.5 block tabular-nums">
                {activePile.length > 0
                  ? `${ultimateLoad.toLocaleString("en-IN")} kN`
                  : "0 kN (PENDING TEST)"}
              </strong>
            </div>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
              <span className="text-zinc-500 text-[10px] uppercase block font-bold">
                Elastic Rebound Limit
              </span>
              <strong className="text-amber-400 text-sm mt-0.5 block tabular-nums">
                {elasticReboundLimit} mm
              </strong>
            </div>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
              <span className="text-zinc-500 text-[10px] uppercase block font-bold">
                Design Standard
              </span>
              <strong className="text-cyan-400 text-sm mt-0.5 block">IS:2911 (Part 4)</strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default SettlementDisplacementChart;
