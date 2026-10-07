"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import {
    calculateNurseSaulMaturity,
    estimateStrengthFromMaturity,
    forecast28DayStrength,
    TemperatureReading,
} from "@/lib/concreteMaturityEngine";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import {
    Activity,
    Flame,
    ShieldCheck,
    AlertTriangle,
    Clock,
    Layers,
    ArrowRight,
    TrendingUp,
} from "lucide-react";

export default function ConcreteMaturityPage() {
    const { project } = useActiveRole();
    const activeProjectId = project?.project_id || project?.id || "GOMTI-NAGAR-PH1-FITOUT";

    const [activeBatch, setActiveBatch] = useState("PC-2026-SLAB-009");
    const [designFck] = useState(30.0); // M30 design
    const [day3Strength, setDay3Strength] = useState("16.8");
    const [day7Strength, setDay7Strength] = useState("23.4");

    // Sample real-time thermocouple stream
    const [telemetry, setTelemetry] = useState<TemperatureReading[]>([
        { timestamp: "00h", coreTempC: 32, surfaceTempC: 28, ambientTempC: 27 },
        { timestamp: "06h", coreTempC: 44, surfaceTempC: 34, ambientTempC: 28 },
        { timestamp: "12h", coreTempC: 56, surfaceTempC: 41, ambientTempC: 30 },
        { timestamp: "18h", coreTempC: 58, surfaceTempC: 42, ambientTempC: 31 },
        { timestamp: "24h", coreTempC: 52, surfaceTempC: 39, ambientTempC: 29 },
        { timestamp: "36h", coreTempC: 46, surfaceTempC: 36, ambientTempC: 28 },
        { timestamp: "48h", coreTempC: 41, surfaceTempC: 33, ambientTempC: 28 },
        { timestamp: "60h", coreTempC: 37, surfaceTempC: 31, ambientTempC: 27 },
    ]);

    // Compute maturity progression over time
    const chartData = telemetry.map((pt, idx) => {
        const subSlice = telemetry.slice(0, idx + 1);
        const maturity = calculateNurseSaulMaturity(
            subSlice.map((s, i) => ({
                ...s,
                timestamp: new Date(Date.now() - (telemetry.length - 1 - i) * 6 * 3600000).toISOString(),
            }))
        );
        const strength = estimateStrengthFromMaturity(maturity, designFck);
        return {
            hour: pt.timestamp,
            core: pt.coreTempC,
            surface: pt.surfaceTempC,
            gradient: pt.coreTempC - pt.surfaceTempC,
            maturity,
            strengthMpa: strength,
        };
    });

    const latest = chartData[chartData.length - 1];
    const forecast28 = forecast28DayStrength(parseFloat(day3Strength), parseFloat(day7Strength));
    const isTargetAchieved = latest.strengthMpa >= designFck * 0.7;

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
            <div className="max-w-[1650px] mx-auto space-y-6">

                {/* HEADER */}
                <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                            CONCRETE DURABILITY • ASTM C1074 THERMAL MATURITY / IS 516 FORECASTING
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                            <Flame className="w-6 h-6 text-amber-500" />
                            <span>Concrete Maturity &amp; Strength Development Engine</span>
                        </h1>
                        <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                            Monitoring active hydration core temperatures on <strong className="text-zinc-200">{activeBatch}</strong> (Level 3 Suspended Slab Bay C3-D4).
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                        <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300">
                            GRADE: M30 (f_ck: 30.0 MPa)
                        </span>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950 border border-emerald-800 text-emerald-400">
                            <Activity className="w-3.5 h-3.5 animate-pulse" />
                            <span>THERMOCOUPLES LIVE</span>
                        </div>
                    </div>
                </header>

                {/* 4 PRIMARY METRIC TILES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="bg-zinc-900/60 border border-zinc-800 p-4">
                        <span className="text-[10px] text-zinc-500 uppercase block">Nurse-Saul Maturity</span>
                        <div className="text-2xl font-bold text-cyan-400 mt-1">
                            {latest.maturity.toLocaleString()} °C·Hrs
                        </div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">Datum T0 = -10.0°C</span>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 p-4">
                        <span className="text-[10px] text-zinc-500 uppercase block">In-Place Compressive Strength</span>
                        <div className="text-2xl font-bold text-emerald-400 mt-1">
                            {latest.strengthMpa} MPa
                        </div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">
                            {((latest.strengthMpa / designFck) * 100).toFixed(0)}% of design f_ck (Target 70%)
                        </span>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 p-4">
                        <span className="text-[10px] text-zinc-500 uppercase block">Core-to-Surface Gradient</span>
                        <div className={`text-2xl font-bold mt-1 ${latest.gradient > 20 ? "text-rose-400" : "text-zinc-100"}`}>
                            {latest.gradient.toFixed(1)} °C
                        </div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">Limit: &lt; 20°C (Thermal Shock)</span>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 p-4">
                        <span className="text-[10px] text-zinc-500 uppercase block">28-Day Strength Projection</span>
                        <div className="text-2xl font-bold text-amber-400 mt-1">
                            {forecast28} MPa
                        </div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">
                            {forecast28 >= designFck ? "Meets Sanctioned Margin" : "Audit Hold Required"}
                        </span>
                    </div>
                </div>

                {/* RECHARTS STRENGTH & MATURITY CURVE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
                        <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                            <span className="font-bold text-white uppercase text-xs">
                                Real-Time Strength Growth vs IS 456 Stripping Threshold
                            </span>
                            <span className="text-zinc-500 text-[10px]">Hour 0 to Hour 60 Hydration</span>
                        </div>

                        <div className="h-[360px] w-full pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                    <XAxis dataKey="hour" stroke="#71717a" fontSize={11} />
                                    <YAxis stroke="#71717a" fontSize={11} domain={[0, 35]} unit=" MPa" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", fontSize: "11px" }}
                                    />
                                    <ReferenceLine y={designFck * 0.7} label="70% f_ck Stripping Gate (21.0 MPa)" stroke="#10b981" strokeDasharray="4 4" />
                                    <Line type="monotone" dataKey="strengthMpa" name="Estimated Strength (MPa)" stroke="#38bdf8" strokeWidth={2.5} dot={{ fill: "#0284c7" }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* RIGHT: CUBE PROJECTION CRUSHING VALIDATOR */}
                    <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 text-xs">
                        <div className="border-b border-zinc-800 pb-2 flex justify-between items-center">
                            <span className="font-bold text-white uppercase">IS 516 Early Strength Projection</span>
                            <TrendingUp className="w-4 h-4 text-amber-400" />
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase block mb-1">3-Day Cube Crushing (MPa)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={day3Strength}
                                    onChange={(e) => setDay3Strength(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-white"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase block mb-1">7-Day Cube Crushing (MPa)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={day7Strength}
                                    onChange={(e) => setDay7Strength(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-white"
                                />
                            </div>

                            <div className="p-3 bg-zinc-950 border border-zinc-800 space-y-2 mt-2">
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-zinc-400">Design Specification:</span>
                                    <span className="font-bold text-white">{designFck}.0 MPa</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-zinc-400">Logarithmic 28d Forecast:</span>
                                    <span className="font-bold text-emerald-400">{forecast28} MPa</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-zinc-400">Early Stripping Margin:</span>
                                    <span className="font-bold text-cyan-400">
                                        {forecast28 > designFck ? `+${(forecast28 - designFck).toFixed(1)} MPa Safety Buffer` : "Deficit"}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <a
                                    href="/safety/formwork-stripping"
                                    className={`w-full py-2 px-3 rounded text-center block uppercase font-bold text-xs transition ${isTargetAchieved
                                            ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 cursor-pointer"
                                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                        }`}
                                >
                                    {isTargetAchieved ? "Authorize Formwork Stripping Permit →" : "Hold Active: Awaiting Attained Strength"}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    );
}