"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import { useLiveviewTheme } from "@/lib/theme/liveviewTheme";

interface AuditStreamEntry {
  id: string;
  timeStr: string;
  governor: string;
  title: string;
  detail: string;
  hash: string;
}

export default function MasterCommandCenterPage() {
  const { isLight } = useLiveviewTheme();
  const [craneAzimuth, setCraneAzimuth] = useState<number>(VANGUARD_GENOME.craneTelemetry.azimuthDeg);
  const [craneTilt, setCraneTilt] = useState<number>(-24.0);
  const [airspaceBreach, setAirspaceBreach] = useState<boolean>(false);

  const [auditEntries, setAuditEntries] = useState<AuditStreamEntry[]>([
    {
      id: "BLOCK-18402",
      timeStr: "12:15:28",
      governor: "MINERVA-BIM",
      title: "Kalzip Silver Dome Standing-Seam Acoustic Inspection Certified",
      detail: "BIT-2 ACOUSTIC AUDITORIUM • Standing seam tolerance < 1.5mm • 2,100-Ton space-frame certified (Node #14B Δ 4.2mm tracked)",
      hash: "8806a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4",
    },
    {
      id: "BLOCK-18401",
      timeStr: "11:48:10",
      governor: "THEMIS-NDT",
      title: "Column C2 Post-Grout SonReb Integrity Certified & Lien Released",
      detail: "BIT-4 PODIUM • SikaGrout 214 injection verified at 32.8 MPa (IS 13311 UPV 4.25 km/s) • ₹2,08,720 lien unblocked",
      hash: "3f90a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4",
    },
  ]);

  useEffect(() => {
    const fetchRecentLedger = async () => {
      try {
        const { data } = await supabase
          .from("section_65b_audit_ledger")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(4);

        if (data && data.length > 0) {
          const mapped: AuditStreamEntry[] = data.map((row: any, idx: number) => ({
            id: `BLOCK-${18403 + idx}`,
            timeStr: new Date(row.created_at).toTimeString().slice(0, 8),
            governor: row.primary_governor || "HERMES-65B",
            title: (row.synthesis_report || "").split("•")[0] || "Section 65B Telemetry Attestation",
            detail: row.synthesis_report || "",
            hash: row.merkle_root_hash || "",
          }));
          setAuditEntries((prev) => [...mapped, ...prev].slice(0, 5));
        }
      } catch (e) {}
    };
    fetchRecentLedger();
  }, []);

  const handleSimulateBreach = () => {
    const next = !airspaceBreach;
    setAirspaceBreach(next);
    if (next) {
      setCraneAzimuth(74.0);
    } else {
      setCraneAzimuth(VANGUARD_GENOME.craneTelemetry.azimuthDeg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      {/* Top Statutory Governance Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
            STATUTORY PROJECT GOVERNANCE • {VANGUARD_GENOME.projectId}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
            {VANGUARD_GENOME.projectName}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {VANGUARD_GENOME.subtitle} • Baseline ₹{VANGUARD_GENOME.financials.epcBaselineCr.toFixed(2)} Cr
          </p>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          <a
            href="/site/digital-twin"
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 font-bold rounded-xl transition flex items-center gap-2"
          >
            <span>🏛️ OPEN VANGUARD 3D BIM TWIN</span>
          </a>
          <span className="px-3 py-2 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold rounded-xl">
            POSTGRES RLS ENFORCED
          </span>
        </div>
      </div>

      {/* Top 5 Canonical KPI Strip (100% Synced with Genome) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">EPC CONTRACT BASELINE</div>
          <div className="text-xl font-bold text-white mt-1">
            ₹{VANGUARD_GENOME.financials.epcBaselineCr.toFixed(2)} Cr
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Major: VANGUARD-CAMPUS</div>
        </div>

        <a
          href="/site/digital-twin"
          className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 p-4 rounded-2xl transition"
        >
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">CERTIFIED LOD-400 BIM</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">
            {VANGUARD_GENOME.bits.length} Architectural Bits
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">As-Built Sync Verified →</div>
        </a>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">STATUTORY RETENTION (5%)</div>
          <div className="text-xl font-bold text-amber-400 mt-1">
            ₹{VANGUARD_GENOME.financials.statutoryRetentionCr.toFixed(2)} Cr
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">UP-LDA Escrow Reserved</div>
        </div>

        <a
          href="/site/digital-twin?bit=BIT-4"
          className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 p-4 rounded-2xl transition"
        >
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">MEP / HVAC LOAD BALANCE</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">
            {VANGUARD_GENOME.mepPlant.totalCoolingTr.toLocaleString()} TR
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">3× 800-Ton VFD Chillers</div>
        </a>

        <a
          href="/site/master-schedule"
          className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 p-4 rounded-2xl transition"
        >
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">MASTER CPM FLOAT</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">On Baseline (0d)</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Kalzip Dome & Tower Aligned</div>
        </a>
      </div>

      {/* Middle Split: Vanguard Campus Reality Gateway (Liebherr 280 EC-H) & Section 65B Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Tower Crane 01 Radar & PTZ Slew Telemetry */}
        <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 text-xs">
            <span className="font-bold text-cyan-400 uppercase tracking-wider">
              • VANGUARD CAMPUS REALITY GATEWAY (TOWER CRANE 01)
            </span>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                ARGUS ACTIVE
              </span>
              <span className="text-slate-400">WEBRTC 30FPS</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center py-2">
            {/* Radar SVG */}
            <div className="md:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-center">
              <svg viewBox="0 0 260 190" className="w-full h-44">
                <circle cx="85" cy="95" r="68" fill="none" stroke={isLight ? "#CFC8B8" : "#1e293b"} strokeWidth="1" />
                <circle cx="85" cy="95" r="44" fill="none" stroke={isLight ? "#D8D2C5" : "#1e293b"} strokeDasharray="3 3" />
                <text x="48" y="22" fill="#64748b" fontSize="7" fontFamily="monospace">
                  CRANE 01 (65M JIB RADIUS)
                </text>
                {/* Jib Boom Line */}
                <line
                  x1="85"
                  y1="95"
                  x2={85 + Math.cos((craneAzimuth * Math.PI) / 180) * 66}
                  y2={95 + Math.sin((craneAzimuth * Math.PI) / 180) * 66}
                  stroke={airspaceBreach ? (isLight ? "#C04848" : "#f43f5e") : (isLight ? "#B27424" : "#facc15")}
                  strokeWidth="3"
                />
                <circle cx="85" cy="95" r="4" fill={isLight ? "#B27424" : "#facc15"} />

                {/* BIT-2 Silver Dome Footprint */}
                <ellipse cx="195" cy="65" rx="34" ry="18" fill={isLight ? "rgba(201,100,66,0.14)" : "rgba(56,189,248,0.12)"} stroke={isLight ? "#C96442" : "#38bdf8"} />
                <text x="165" y="42" fill={isLight ? "#C96442" : "#38bdf8"} fontSize="7" fontFamily="monospace">
                  BIT-2 DOME (16.5M)
                </text>

                {/* BIT-1 Green Wedge Trapezoid */}
                <polygon
                  points="168,105 222,105 236,155 154,155"
                  fill={isLight ? "rgba(59,122,87,0.14)" : "rgba(16,185,129,0.12)"}
                  stroke={isLight ? "#3B7A57" : "#10b981"}
                />
                <text x="163" y="135" fill={isLight ? "#3B7A57" : "#10b981"} fontSize="7" fontFamily="monospace">
                  BIT-1 GREEN WEDGE
                </text>
              </svg>
            </div>

            {/* PTZ Controls */}
            <div className="md:col-span-5 bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5 text-xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase">CRANE SLEW PTZ</div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">AZIMUTH</span>
                  <span className="text-cyan-400 font-bold">{craneAzimuth.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="180"
                  step="0.5"
                  value={craneAzimuth}
                  onChange={(e) => setCraneAzimuth(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">TILT</span>
                  <span className="text-cyan-400 font-bold">{craneTilt.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="0"
                  step="0.5"
                  value={craneTilt}
                  onChange={(e) => setCraneTilt(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <button
                onClick={handleSimulateBreach}
                className={`w-full py-2 px-2 rounded-lg border font-bold text-[10px] transition ${
                  airspaceBreach
                    ? "bg-rose-600 text-white border-rose-400 animate-pulse"
                    : "bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border-rose-500/40"
                }`}
              >
                {airspaceBreach ? "⚠ AIRSPACE LOCK ENGAGED — RESET" : "SIMULATE BOOM AIRSPACE BREACH"}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-2 flex justify-between text-[10px] text-slate-400">
            <span>TARGET: <strong className="text-white">BIT-2 Silver Dome</strong></span>
            <span>BOOM: <strong className="text-white">65m ({VANGUARD_GENOME.craneTelemetry.model})</strong></span>
            <span>LATENCY: <strong className="text-emerald-400">{VANGUARD_GENOME.craneTelemetry.latencyMs} ms</strong></span>
          </div>
        </div>

        {/* Right: Section 65B Notarized Audit Stream */}
        <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 text-xs">
            <span className="font-bold text-emerald-400 uppercase tracking-wider">
              🛡️ SECTION 65B NOTARIZED AUDIT STREAM
            </span>
            <span className="text-[10px] text-slate-400">BLOCK #18402</span>
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-60">
            {auditEntries.map((entry) => (
              <div
                key={entry.id + entry.timeStr}
                className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl flex flex-col gap-1 text-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">{entry.title}</span>
                  <span className="text-[10px] text-slate-500">{entry.timeStr}</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">{entry.detail}</div>
                <div className="flex justify-between items-center pt-1 mt-1 border-t border-slate-900 text-[10px]">
                  <span className="text-cyan-400 truncate max-w-[70%]">SHA-256: {entry.hash}</span>
                  <span className="text-emerald-400 font-bold">Verify Section 65B 🔒</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Primary View Governors (4) — Synced with Genome */}
      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-amber-400 uppercase tracking-wider">
            ★ PRIMARY VIEW GOVERNORS (4)
          </span>
          <span className="text-[10px] text-slate-500">
            Pinned governors monitoring critical VANGUARD domains
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {VANGUARD_GENOME.governors.map((gov) => {
            const targetRoute =
              gov.id === "ARGUS"
                ? "/site/360-tour?zone=BIT-2"
                : gov.id === "MINERVA"
                ? "/site/digital-twin"
                : gov.id === "MIDAS"
                ? "/site/master-schedule"
                : "/site/pour-cards";

            return (
              <a
                key={gov.id}
                href={targetRoute}
                className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 p-4 rounded-2xl flex flex-col justify-between gap-3 transition"
              >
                <div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-sm">{gov.id}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      {gov.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{gov.role}</div>
                  <div className="text-[11px] text-slate-300 mt-2.5 leading-relaxed">
                    {"> "}{gov.summary}
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-cyan-400">
                  <span>Open VANGUARD Governor Terminal</span>
                  <span>{gov.metric} →</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
