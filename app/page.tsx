"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import { FieldGroundingRecord } from "@/lib/grounding/fieldGroundingSchema";
import FieldGroundingDrawer from "@/components/field/FieldGroundingDrawer";
import QualityEscrowKillSwitch from "@/components/commercial/QualityEscrowKillSwitch";
import ProvenancePill from "@/components/ui/ProvenancePill";

interface AuditStreamEntry {
  id: string;
  timeStr: string;
  governor: string;
  provenance: string;
  title: string;
  detail: string;
  hash: string;
}

export default function MasterCommandCenterPage() {
  const router = useRouter();
  const [craneAzimuth, setCraneAzimuth] = useState<number>(VANGUARD_GENOME.craneTelemetry.azimuthDeg);
  const [craneTilt, setCraneTilt] = useState<number>(-24.0);
  const [airspaceBreach, setAirspaceBreach] = useState<boolean>(false);

  const [isFieldDrawerOpen, setIsFieldDrawerOpen] = useState<boolean>(false);
  const [latestFieldRecord, setLatestFieldRecord] = useState<FieldGroundingRecord | null>(null);

  // Telemetry freshness timestamp (>15m triggers STALE TELEMETRY warning pill)
  const [iotTimestampIso, setIotTimestampIso] = useState<string>(() => new Date().toISOString());
  const [simulateStaleFeed, setSimulateStaleFeed] = useState<boolean>(false);

  const effectiveTelemetryIso = simulateStaleFeed
    ? new Date(Date.now() - 22 * 60 * 1000).toISOString()
    : iotTimestampIso;

  const [auditEntries, setAuditEntries] = useState<AuditStreamEntry[]>([
    {
      id: "BLOCK-18402",
      timeStr: "12:15:28",
      governor: "MINERVA-BIM",
      provenance: "LOD-400 BIM Sync",
      title: "Kalzip Silver Dome Standing-Seam Acoustic Inspection Certified",
      detail:
        "BIT-2 ACOUSTIC AUDITORIUM • Standing seam tolerance < 1.5mm • 2,100-Ton space-frame certified (Node #14B Δ 4.2mm tracked)",
      hash: "8806a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4",
    },
    {
      id: "BLOCK-18401",
      timeStr: "11:48:10",
      governor: "THEMIS-NDT",
      provenance: "Lab Core Certificate",
      title: "Column C2 Post-Grout SonReb Integrity Certified & Lien Released",
      detail:
        "BIT-4 PODIUM • SikaGrout 214 injection verified at 32.8 MPa (IS 13311 UPV 4.25 km/s) • ₹2,08,720 lien unblocked",
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
            provenance: "BSA Sec. 63 / Sec. 65B Vault",
            title: (row.synthesis_report || "").split("•")[0] || "Section 65B Telemetry Attestation",
            detail: row.synthesis_report || "",
            hash: row.merkle_root_hash || "",
          }));
          setAuditEntries((prev) => [...mapped, ...prev].slice(0, 5));
        }
      } catch {}
    };
    fetchRecentLedger();
  }, []);

  const handleSimulateBreach = () => {
    const next = !airspaceBreach;
    setAirspaceBreach(next);
    setIotTimestampIso(new Date().toISOString());
    if (next) {
      setCraneAzimuth(74.0);
    } else {
      setCraneAzimuth(VANGUARD_GENOME.craneTelemetry.azimuthDeg);
    }
  };

  // Compute crane jib endpoint on 2D site radar
  const rad = (craneAzimuth * Math.PI) / 180;
  const jibEndX = 85 + Math.cos(rad) * 58;
  const jibEndY = 95 + Math.sin(rad) * 58;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      {/* Top Statutory Governance Header (Dark Monotone Apple HIG Glassmorphism) */}
      <div className="border-b border-zinc-800/90 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              STATUTORY PROJECT GOVERNANCE • {VANGUARD_GENOME.projectId}
            </span>
            <ProvenancePill
              source="Live IoT Feed"
              lastUpdatedIso={effectiveTelemetryIso}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            {VANGUARD_GENOME.projectName}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {VANGUARD_GENOME.subtitle} • Baseline ₹{VANGUARD_GENOME.financials.epcBaselineCr.toFixed(2)} Cr
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setSimulateStaleFeed((s) => !s);
              if (simulateStaleFeed) setIotTimestampIso(new Date().toISOString());
            }}
            className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition ${
              simulateStaleFeed
                ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                : "bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 text-zinc-300"
            }`}
          >
            {simulateStaleFeed ? "Restore Live Sensor Heartbeat" : "Test >15m Stale Feed"}
          </button>

          <a
            href="/site/digital-twin"
            className="px-3.5 py-2 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-bold rounded-xl transition flex items-center gap-2"
          >
            <span>🏛️ OPEN 3D BIM TWIN</span>
          </a>

          <button
            type="button"
            onClick={() => setIsFieldDrawerOpen(true)}
            className="px-3.5 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl transition flex items-center gap-2 shadow-sm"
          >
            <span>🎙️ FIELD VOICE & PHOTO INGRESS</span>
          </button>
        </div>
      </div>

      {/* Top 5 Canonical KPI Strip with Provenance Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div className="bg-zinc-900/70 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">EPC BASELINE</span>
            <ProvenancePill source="UP-LDA Escrow Ledger" />
          </div>
          <div className="text-xl font-bold text-white">
            ₹{VANGUARD_GENOME.financials.epcBaselineCr.toFixed(2)} Cr
          </div>
          <div className="text-[10px] text-zinc-500">Major: VANGUARD-CAMPUS</div>
        </div>

        <a
          href="/site/digital-twin"
          className="bg-zinc-900/70 hover:bg-zinc-900 backdrop-blur-md border border-zinc-800 hover:border-zinc-600 p-4 rounded-2xl transition flex flex-col justify-between gap-2"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">CERTIFIED BIM</span>
            <ProvenancePill source="LOD-400 BIM Sync" />
          </div>
          <div className="text-xl font-bold text-white">
            {VANGUARD_GENOME.bits.length} Architectural Bits
          </div>
          <div className="text-[10px] text-zinc-400">As-Built Sync Verified →</div>
        </a>

        <div className="bg-zinc-900/70 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">RETENTION (5%)</span>
            <ProvenancePill source="UP-LDA Escrow Ledger" />
          </div>
          <div className="text-xl font-bold text-amber-400">
            ₹{VANGUARD_GENOME.financials.statutoryRetentionCr.toFixed(2)} Cr
          </div>
          <div className="text-[10px] text-zinc-500">UP-LDA Escrow Reserved</div>
        </div>

        <div className="bg-zinc-900/70 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">CERTIFIED RA BILLS</span>
            <ProvenancePill source="Lab Core Certificate" />
          </div>
          <div className="text-xl font-bold text-emerald-400">
            ₹{VANGUARD_GENOME.financials.certifiedToDateCr.toFixed(2)} Cr
          </div>
          <div className="text-[10px] text-zinc-500">
            {VANGUARD_GENOME.financials.overallPhysicalProgressPct}% Physical Progress
          </div>
        </div>

        <div className="bg-zinc-900/70 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">CURING & CPI</span>
            <ProvenancePill source="Live IoT Feed" lastUpdatedIso={effectiveTelemetryIso} />
          </div>
          <div className="text-xl font-bold text-white">
            31.4°C • CPI {VANGUARD_GENOME.financials.cpi.toFixed(3)}
          </div>
          <div className="text-[10px] text-zinc-500">
            RH 68% • M50 Soffit Node #TG-03
          </div>
        </div>
      </div>

      {/* Bidirectional Quality-to-Escrow Kill Switch & 3-Agent Governance Trace */}
      <QualityEscrowKillSwitch
        latestFieldRecord={latestFieldRecord}
        onFocusBimZone={(zoneId, ncrId) => {
          const qs = new URLSearchParams({ zone: zoneId });
          if (ncrId) qs.set("ncr", ncrId);
          router.push(`/site/digital-twin?${qs.toString()}`);
        }}
        onAuditAppend={(entry) =>
          setAuditEntries((prev) =>
            [
              {
                ...entry,
                provenance: "Lab Core Certificate",
              },
              ...prev,
            ].slice(0, 6)
          )
        }
      />

      {/* Middle Row: Crane Reality Gateway + Section 65B Notarized Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Vanguard Campus Reality Gateway (Tower Crane 01) */}
        <div className="lg:col-span-6 bg-zinc-900/70 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  airspaceBreach ? "bg-rose-500 animate-ping" : "bg-emerald-400"
                }`}
              />
              <span className="font-bold text-zinc-100 uppercase tracking-wider">
                VANGUARD CAMPUS REALITY GATEWAY (TOWER CRANE 01)
              </span>
            </div>
            <ProvenancePill source="Live IoT Feed" lastUpdatedIso={effectiveTelemetryIso} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* 2D Site Slew & Geofence Radar */}
            <div className="md:col-span-7 bg-zinc-950 border border-zinc-800/90 rounded-xl p-2 flex items-center justify-center">
              <svg viewBox="0 0 260 185" className="w-full h-44">
                <circle
                  cx="85"
                  cy="95"
                  r="64"
                  fill="none"
                  stroke="#27272a"
                  strokeDasharray="3 3"
                />
                <text x="36" y="24" fill="#71717a" fontSize="7" fontFamily="monospace">
                  CRANE-01 (65M JIB RADIUS)
                </text>

                {/* Crane Jib Boom */}
                <line
                  x1="85"
                  y1="95"
                  x2={jibEndX}
                  y2={jibEndY}
                  stroke={airspaceBreach ? "#ef4444" : "#e4e4e7"}
                  strokeWidth="3"
                />
                <circle cx="85" cy="95" r="4" fill="#f4f4f5" />

                {/* BIT-2 Silver Dome Footprint */}
                <ellipse
                  cx="195"
                  cy="65"
                  rx="34"
                  ry="18"
                  fill={airspaceBreach ? "rgba(239,68,68,0.18)" : "rgba(244,244,245,0.06)"}
                  stroke={airspaceBreach ? "#ef4444" : "#71717a"}
                />
                <text
                  x="165"
                  y="42"
                  fill={airspaceBreach ? "#f87171" : "#a1a1aa"}
                  fontSize="7"
                  fontFamily="monospace"
                >
                  BIT-2 DOME (16.5M)
                </text>

                {/* BIT-1 Green Wedge Trapezoid */}
                <polygon
                  points="168,105 222,105 236,155 154,155"
                  fill="rgba(16,185,129,0.08)"
                  stroke="#52525b"
                />
                <text x="163" y="135" fill="#a1a1aa" fontSize="7" fontFamily="monospace">
                  BIT-1 GREEN WEDGE
                </text>
              </svg>
            </div>

            {/* BIM Zone PTZ & Crane LMI Telemetry */}
            <div className="md:col-span-5 bg-zinc-950/95 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between gap-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-bold uppercase">
                  BIM ZONE PTZ & LMI
                </span>
                <span className="text-[9px] text-emerald-400 font-bold">LMI SYNC</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-lg p-2 text-center">
                <div>
                  <div className="text-[9px] text-zinc-500">SLEW</div>
                  <div className="text-[11px] font-bold text-zinc-100">{craneAzimuth.toFixed(1)}°</div>
                </div>
                <div className="border-x border-zinc-800">
                  <div className="text-[9px] text-zinc-500">TROLLEY</div>
                  <div className="text-[11px] font-bold text-zinc-100">
                    {craneAzimuth < 20 ? "48.5m" : craneAzimuth < 55 ? "38.0m" : "54.0m"}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-zinc-500">PTZ PITCH</div>
                  <div className="text-[11px] font-bold text-zinc-100">{craneTilt.toFixed(1)}°</div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-zinc-500 uppercase font-bold">
                  SNAP PTZ TO BIM ZONE
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: "BIT-1 WEDGE", az: 38.5, tilt: -24.0 },
                    { label: "BIT-2 DOME", az: 10.0, tilt: -16.5 },
                    { label: "GATE YARD", az: 78.0, tilt: -34.0 },
                  ].map((z) => {
                    const active = Math.abs(craneAzimuth - z.az) < 1;
                    return (
                      <button
                        key={z.label}
                        type="button"
                        onClick={() => {
                          setCraneAzimuth(z.az);
                          setCraneTilt(z.tilt);
                          setIotTimestampIso(new Date().toISOString());
                        }}
                        className={`py-1.5 px-1 rounded border text-[9px] font-bold transition ${
                          active
                            ? "bg-zinc-100 border-white text-zinc-950"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                        }`}
                      >
                        {z.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSimulateBreach}
                className={`w-full py-2 px-2 rounded-lg border font-bold text-[10px] transition ${
                  airspaceBreach
                    ? "bg-rose-500 text-white border-rose-400 animate-pulse"
                    : "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/40"
                }`}
              >
                {airspaceBreach
                  ? "⚠ AIRSPACE LOCK ENGAGED — RESET"
                  : "SIMULATE BOOM AIRSPACE BREACH"}
              </button>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-2 flex flex-wrap justify-between gap-2 text-[10px] text-zinc-400">
            <span>
              TARGET: <strong className="text-zinc-100">BIT-2 Silver Dome</strong>
            </span>
            <span>
              BOOM: <strong className="text-zinc-100">65m ({VANGUARD_GENOME.craneTelemetry.model})</strong>
            </span>
            <span>
              LATENCY:{" "}
              <strong className="text-emerald-400">
                {VANGUARD_GENOME.craneTelemetry.latencyMs} ms
              </strong>
            </span>
          </div>
        </div>

        {/* Right: Section 65B Notarized Audit Stream */}
        <div className="lg:col-span-6 bg-zinc-900/70 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-zinc-800 pb-2.5 text-xs">
            <span className="font-bold text-emerald-400 uppercase tracking-wider">
              🛡️ SECTION 65B / BSA NOTARIZED AUDIT STREAM
            </span>
            <ProvenancePill source="BSA Sec. 63 / Sec. 65B Vault" />
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-64">
            {auditEntries.map((entry) => (
              <div
                key={entry.id + entry.timeStr}
                className="p-3 bg-zinc-950/90 border border-zinc-800 rounded-xl flex flex-col gap-1.5 text-xs"
              >
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className="font-bold text-white">{entry.title}</span>
                  <div className="flex items-center gap-1.5">
                    <ProvenancePill source={entry.provenance} />
                    <span className="text-[10px] text-zinc-500">{entry.timeStr}</span>
                  </div>
                </div>
                <div className="text-[11px] text-zinc-400 leading-relaxed">{entry.detail}</div>
                <div className="flex justify-between items-center pt-1.5 mt-0.5 border-t border-zinc-900 text-[10px]">
                  <span className="text-zinc-300 truncate max-w-[70%]">
                    SHA-256: {entry.hash}
                  </span>
                  <span className="text-emerald-400 font-bold">BSA Sec. 63 Sealed 🔒</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Primary View Governors (4) — Dark Monotone Glassmorphism */}
      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-zinc-200 uppercase tracking-wider">
            PRIMARY VIEW GOVERNORS (4)
          </span>
          <span className="text-[10px] text-zinc-500">
            Deterministic domain governors monitoring VANGUARD campus
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
                className="bg-zinc-900/70 hover:bg-zinc-900 backdrop-blur-md border border-zinc-800 hover:border-zinc-600 p-4 rounded-2xl flex flex-col justify-between gap-3 transition"
              >
                <div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-sm">{gov.id}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                      {gov.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{gov.role}</div>
                  <div className="text-[11px] text-zinc-300 mt-2.5 leading-relaxed">
                    {"> "}
                    {gov.summary}
                  </div>
                </div>
                <div className="pt-2 border-t border-zinc-800/80 flex justify-between items-center text-[10px] text-zinc-300">
                  <span>Open Governor Terminal</span>
                  <span className="font-bold text-white">{gov.metric} →</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Multimodal Field Telemetry & Voice Ingress Drawer */}
      <FieldGroundingDrawer
        isOpen={isFieldDrawerOpen}
        onClose={() => setIsFieldDrawerOpen(false)}
        onRecordCommitted={(rec) => {
          setLatestFieldRecord(rec);
          setAuditEntries((prev) =>
            [
              {
                id: rec.id,
                timeStr: new Date(rec.ingested_at).toTimeString().slice(0, 8),
                governor: "QUADMAX-GEMINI-2.5",
                provenance: rec.provenance_label || "Verified Field Audio + Photo",
                title: `[${rec.linked_ncr_id}] ${rec.zone_label}`,
                detail: `${rec.engineering_summary} (${rec.is_code_clause})`,
                hash: rec.canonical_65b_sha256,
              },
              ...prev,
            ].slice(0, 6)
          );
        }}
        onFocusBimZone={(zoneId) =>
          router.push(`/site/digital-twin?zone=${encodeURIComponent(zoneId)}`)
        }
      />
    </div>
  );
}
