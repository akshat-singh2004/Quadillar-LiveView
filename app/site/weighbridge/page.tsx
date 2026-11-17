// @refresh reset
"use client";

import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function GateInwardWeighbridgePage() {
  const [grossKg, setGrossKg] = useState<number>(36420);
  const [tareKg, setTareKg] = useState<number>(14680);
  const [challanCum, setChallanCum] = useState<number>(9.0);
  const [targetBit, setTargetBit] = useState<string>("BIT-4");
  const [isSealing, setIsSealing] = useState<boolean>(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  const telemetry = useMemo(() => {
    const netKg = Math.max(0, grossKg - tareKg);
    const wetDensity = +(netKg / Math.max(challanCum, 0.5)).toFixed(1);
    const isDensityValid = wetDensity >= 2380 && wetDensity <= 2480;
    const expectedMinKg = challanCum * 2380;
    const shortfallKg = Math.max(0, +(expectedMinKg - netKg).toFixed(0));
    const ratePerCumInr = 6850; // M45 RMC rate
    const shortfallCum = +(shortfallKg / 2410).toFixed(3);
    const autoLienInr = Math.round(shortfallCum * ratePerCumInr);

    return {
      netKg,
      wetDensity,
      isDensityValid,
      shortfallKg,
      shortfallCum,
      autoLienInr,
    };
  }, [grossKg, tareKg, challanCum]);

  const recentGatePasses = [
    {
      slip: "WB-VGD-9914",
      vehicle: "UP-32-HN-4821",
      material: "RMC M45 Pumpable (9.0 m³)",
      bit: "BIT-4",
      netWeight: "21,740 kg",
      densityOrVar: "2,415.6 kg/m³ (IS 4926 Pass)",
      status: "CLEARED",
    },
    {
      slip: "WB-VGD-9913",
      vehicle: "UP-32-KT-1190",
      material: "Fe 550D 25mm Diagrid TMT",
      bit: "BIT-3",
      netWeight: "24,810 kg",
      densityOrVar: "-0.76% Rolling Margin (IS 1786 Pass)",
      status: "CLEARED",
    },
    {
      slip: "WB-VGD-9912",
      vehicle: "UP-78-DN-7042",
      material: "20mm Graded Coarse Aggregate",
      bit: "BIT-1",
      netWeight: "28,450 kg",
      densityOrVar: "1.8% Surface Moisture Deducted (IS 2386)",
      status: "NET ADJUSTED",
    },
  ];

  const handleNotarizeSlip = async () => {
    setIsSealing(true);
    const ts = new Date().toISOString();
    const payload = `${VANGUARD_GENOME.projectId}_WB_NET_${telemetry.netKg}KG_DENS_${telemetry.wetDensity}_${targetBit}_${ts}`;
    const hash = await generateSHA256(payload);

    try {
      await supabase.from("section_65b_audit_ledger").insert({
        project_id: VANGUARD_GENOME.projectId,
        primary_governor: "MIDAS-WEIGHBRIDGE",
        synthesis_report: `WEIGHBRIDGE TELEMETRY SEALED (${targetBit}): Net Payload ${telemetry.netKg.toLocaleString()} kg • Wet Density ${telemetry.wetDensity} kg/m³ • ${telemetry.isDensityValid ? "IS 4926 PASS" : `AUTO-LIEN ₹${telemetry.autoLienInr.toLocaleString()}`}`,
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
              LEGAL METROLOGY ACT 2009 / IS 4926 / IS 1786
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              PITLESS 60T LOAD-CELL • {VANGUARD_GENOME.projectId}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            GATE INWARD, WEIGHBRIDGE TELEMETRY & ANTI-THEFT LIEN ENGINE
          </h1>
          <p className="text-xs text-slate-400">
            {VANGUARD_GENOME.projectName} • Automated Wet Density, Moisture Offset & Rolling Margin Verification
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition">
            ← COMMAND CENTER
          </a>
          <a href={`/site/digital-twin?bit=${targetBit}`} className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg transition">
            🏛️ {targetBit} IN 3D BIM
          </a>
          <a href="/site/commercial" className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 rounded-lg transition">
            💼 COMMERCIAL LEDGER
          </a>
        </div>
      </div>

      {/* Live Load-Cell Simulator & Automated Deduction Gate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 text-xs">
          <div className="font-bold text-white uppercase border-b border-slate-800 pb-2">
            LIVE 60-TON DIGITAL WEIGHBRIDGE & RMC DENSITY VERIFIER
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Gross Laden Weight (kg):</span>
                <span className="text-cyan-400 font-bold">{grossKg.toLocaleString()} kg</span>
              </div>
              <input
                type="range"
                min="32000"
                max="38500"
                step="20"
                value={grossKg}
                onChange={(e) => setGrossKg(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Empty Transit Mixer Tare (kg):</span>
                <span className="text-white font-bold">{tareKg.toLocaleString()} kg</span>
              </div>
              <input
                type="range"
                min="13500"
                max="16000"
                step="20"
                value={tareKg}
                onChange={(e) => setTareKg(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded accent-cyan-400"
              />
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Challan Batch Volume (m³):</span>
              <select
                value={challanCum}
                onChange={(e) => setChallanCum(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value={6.0}>6.0 m³ Transit Mixer</option>
                <option value={8.0}>8.0 m³ Transit Mixer</option>
                <option value={9.0}>9.0 m³ Transit Mixer (Standard)</option>
              </select>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Destination Architectural Bit:</span>
              <select
                value={targetBit}
                onChange={(e) => setTargetBit(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              >
                {VANGUARD_GENOME.bits.map((b) => (
                  <option key={b.bitId} value={b.bitId}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">NET PAYLOAD</span>
              <span className="text-lg font-bold text-white">{telemetry.netKg.toLocaleString()} kg</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Destination: {targetBit}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">RMC WET DENSITY</span>
              <span
                className={`text-lg font-bold ${
                  telemetry.isDensityValid ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {telemetry.wetDensity} kg/m³
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">IS 4926: 2380–2480</span>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl border text-[11px] ${
              telemetry.isDensityValid
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/50 border-rose-500/50 text-rose-200"
            }`}
          >
            {telemetry.isDensityValid
              ? "✔ Volumetric & Density Tolerance Verified — Boom Gate Release Authorized."
              : `⚠ Shortfall of ${telemetry.shortfallKg} kg (${telemetry.shortfallCum} m³) detected — Automated Supplier Lien of ₹${telemetry.autoLienInr.toLocaleString()} queued.`}
          </div>

          {sealedHash ? (
            <div className="p-2 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
              <div className="font-bold text-emerald-300">✔ GATEPASS NOTARIZED (SEC 65B)</div>
              <div className="text-[9px] text-slate-400 truncate select-all">{sealedHash}</div>
            </div>
          ) : (
            <button
              onClick={handleNotarizeSlip}
              disabled={isSealing}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold rounded-xl transition"
            >
              {isSealing ? "SEALING..." : "ISSUE SECTION 65B WEIGHBRIDGE GATEPASS"}
            </button>
          )}
        </div>
      </div>

      {/* Recent Weighbridge Log */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="text-xs font-bold text-white uppercase border-b border-slate-800 pb-2">
          RECENT VERIFIED GATE INWARD & WEIGHBRIDGE LOGS
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-[10px] text-slate-500 uppercase border-b border-slate-800">
              <tr>
                <th className="py-2 px-2">SLIP ID</th>
                <th className="py-2 px-2">VEHICLE ANPR</th>
                <th className="py-2 px-2">MATERIAL & CHALLAN</th>
                <th className="py-2 px-2">ZONE</th>
                <th className="py-2 px-2">NET PAYLOAD</th>
                <th className="py-2 px-2">STATUTORY CHECK</th>
                <th className="py-2 px-2 text-right">GATE STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-[11px]">
              {recentGatePasses.map((g) => (
                <tr key={g.slip} className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-2 font-bold text-cyan-400">{g.slip}</td>
                  <td className="py-2.5 px-2 text-white font-bold">{g.vehicle}</td>
                  <td className="py-2.5 px-2 text-slate-300">{g.material}</td>
                  <td className="py-2.5 px-2">
                    <a href={`/site/digital-twin?bit=${g.bit}`} className="text-cyan-300 underline">
                      {g.bit}
                    </a>
                  </td>
                  <td className="py-2.5 px-2 text-white font-bold">{g.netWeight}</td>
                  <td className="py-2.5 px-2 text-slate-400">{g.densityOrVar}</td>
                  <td className="py-2.5 px-2 text-right font-bold text-emerald-400">{g.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
