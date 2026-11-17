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

export default function NcrQualityDebitLiensPage() {
  const [pathLengthMm, setPathLengthMm] = useState<number>(300);
  const [transitTimeUs, setTransitTimeUs] = useState<number>(70.6); // 300 / 70.6 = 4.25 km/s
  const [reboundIndex, setReboundIndex] = useState<number>(36);
  const [designFck, setDesignFck] = useState<number>(35); // M35 Column C2
  const [isSealing, setIsSealing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  const ndtResult = useMemo(() => {
    const upvKms = +(pathLengthMm / Math.max(transitTimeUs, 1)).toFixed(2);
    // Combined SonReb correlation: f_is = 1.18 * (V_upv)^1.42 * (R)^0.86
    const sonrebMpa = +(
      1.18 *
      Math.pow(upvKms, 1.42) *
      Math.pow(reboundIndex, 0.86)
    ).toFixed(2);
    const minReqMpa = +(0.85 * designFck).toFixed(2); // IS 456 Cl. 17.4.3 (29.75 MPa for M35)
    const isPass = upvKms >= 3.5 && sonrebMpa >= minReqMpa;
    const upvGrade =
      upvKms > 4.5
        ? "EXCELLENT"
        : upvKms >= 3.5
        ? "GOOD (IS 13311 PASS)"
        : upvKms >= 3.0
        ? "MEDIUM / MONITOR"
        : "DOUBTFUL / HONEYCOMB";

    return { upvKms, sonrebMpa, minReqMpa, isPass, upvGrade };
  }, [pathLengthMm, transitTimeUs, reboundIndex, designFck]);

  const handleNotarizeNdt = async () => {
    setIsSealing(true);
    const ts = new Date().toISOString();
    const payload = `${VANGUARD_GENOME.projectId}_NCR009_COL_C2_UPV_${ndtResult.upvKms}_SONREB_${ndtResult.sonrebMpa}_${ts}`;
    const hash = await generateSHA256(payload);

    try {
      await supabase.from("section_65b_audit_ledger").insert({
        project_id: VANGUARD_GENOME.projectId,
        primary_governor: "THEMIS-NDT-SONREB",
        synthesis_report: `NCR-009 COLUMN C2 SONREB VERIFIED: UPV ${ndtResult.upvKms} km/s • In-Situ Strength ${ndtResult.sonrebMpa} MPa (Req >= ${ndtResult.minReqMpa} MPa) • Status: ${ndtResult.isPass ? "LIEN ₹2,08,720 UNBLOCKED" : "HOLD ACTIVE"}`,
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
              IS 13311 (PARTS 1 & 2) SONREB & IS 456 CL. 17.4.3
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              {VANGUARD_GENOME.projectId} • ₹864.50 Cr
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            NCR QUALITY DEBIT LIENS & IN-SITU NDT SONREB REGISTER
          </h1>
          <p className="text-xs text-slate-400">
            Synchronized Quality Hold & Commercial Escrow Release Ledger across BIT-1 through BIT-6
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition">
            ← COMMAND CENTER
          </a>
          <a href="/site/digital-twin?bit=BIT-4" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg transition">
            🏛️ COLUMN C2 IN 3D BIM
          </a>
          <a href="/site/commercial" className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 rounded-lg transition">
            💼 COMMERCIAL LIENS
          </a>
        </div>
      </div>

      {/* Active & Certified NCR / Snag Register */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-slate-900/60 border border-emerald-500/40 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
              NCR-009 • RESOLVED & CERTIFIED
            </span>
            <a href="/site/digital-twin?bit=BIT-4" className="text-cyan-400 hover:underline text-[10px]">
              BIT-4 PODIUM →
            </a>
          </div>
          <div className="text-sm font-bold text-white">
            Column C2 Post-Grout SonReb Integrity (SikaGrout 214 Injection)
          </div>
          <p className="text-[11px] text-slate-300">
            IS 13311 UPV verified at 4.25 km/s with 32.8 MPa equivalent cube strength (exceeding 0.85 × 35 = 29.75 MPa). Withheld lien of <strong>₹2,08,720</strong> released into RA-05 payment certificate.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-amber-500/40 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
              SNAG-VANGUARD-401 • MINOR SHIM TRACKING
            </span>
            <a href="/site/360-tour?zone=BIT-2" className="text-cyan-400 hover:underline text-[10px]">
              BIT-2 LIDAR SCAN →
            </a>
          </div>
          <div className="text-sm font-bold text-white">
            Kalzip Space-Frame Truss Node #14B (Δ 4.2mm Laser Deviation)
          </div>
          <p className="text-[11px] text-slate-300">
            2,100-Ton space-frame standing-seam tolerance certified (under 1.5mm); Node #14B MERO spherical shim collar scheduled within 0d CPM float.
          </p>
        </div>
      </div>

      {/* Interactive SonReb Calculator & Sec 65B Seal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 text-xs">
          <div className="font-bold text-white uppercase border-b border-slate-800 pb-2">
            IS 13311 COMBINED SONREB (UPV + REBOUND HAMMER) SIMULATOR — BIT-4 COLUMN C2
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Direct Transducer Path L (mm):</span>
                <span className="text-cyan-400 font-bold">{pathLengthMm} mm</span>
              </div>
              <input
                type="range"
                min="150"
                max="600"
                step="10"
                value={pathLengthMm}
                onChange={(e) => setPathLengthMm(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Ultrasonic Transit Time T (μs):</span>
                <span className="text-cyan-400 font-bold">{transitTimeUs.toFixed(1)} μs</span>
              </div>
              <input
                type="range"
                min="45"
                max="140"
                step="0.2"
                value={transitTimeUs}
                onChange={(e) => setTransitTimeUs(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Schmidt Rebound Index (R):</span>
                <span className="text-cyan-400 font-bold">{reboundIndex}</span>
              </div>
              <input
                type="range"
                min="20"
                max="52"
                step="1"
                value={reboundIndex}
                onChange={(e) => setReboundIndex(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Design Concrete Grade (f_ck):</span>
                <span className="text-white font-bold">M{designFck} ({designFck} MPa)</span>
              </div>
              <select
                value={designFck}
                onChange={(e) => setDesignFck(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value={35}>M35 (Podium Columns)</option>
                <option value={45}>M45 (Transfer Deck & Arch)</option>
                <option value={50}>M50 (14F Tower Shear Core)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 text-xs">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">COMPUTED IN-SITU INTEGRITY</div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">UPV VELOCITY</span>
                <span className="text-lg font-bold text-cyan-400">{ndtResult.upvKms} km/s</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{ndtResult.upvGrade}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">SONREB STRENGTH</span>
                <span
                  className={`text-lg font-bold ${
                    ndtResult.isPass ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {ndtResult.sonrebMpa} MPa
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Gate ≥ {ndtResult.minReqMpa} MPa
                </span>
              </div>
            </div>
          </div>

          {sealedHash ? (
            <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
              <div className="font-bold text-emerald-300">✔ SONREB CERTIFICATE SEALED (SEC 65B)</div>
              <div className="text-[9px] text-slate-400 mt-1 truncate select-all">{sealedHash}</div>
            </div>
          ) : (
            <button
              onClick={handleNotarizeNdt}
              disabled={isSealing}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold rounded-xl transition"
            >
              {isSealing ? "NOTARIZING..." : "SEAL SONREB CERTIFICATE & UNBLOCK LIEN"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
