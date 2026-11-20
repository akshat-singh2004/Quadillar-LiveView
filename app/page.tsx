"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ArrowUpRight, ShieldCheck, Activity } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import { FieldGroundingRecord } from "@/lib/grounding/fieldGroundingSchema";
import FieldGroundingDrawer from "@/components/field/FieldGroundingDrawer";
import LiveWebcamSpoofScanner from "@/components/field/LiveWebcamSpoofScanner";
import ComplianceCertificateModal from "@/components/commercial/ComplianceCertificateModal";
import QualityEscrowKillSwitch from "@/components/commercial/QualityEscrowKillSwitch";
import ProvenancePill from "@/components/ui/ProvenancePill";
import { useActiveProject } from "@/context/ProjectContext";
import { useLiveviewTheme } from "@/lib/theme/liveviewTheme";

interface AuditStreamEntry {
  id: string;
  timeStr: string;
  governor: string;
  provenance: string;
  title: string;
  detail: string;
  hash: string;
}

interface GovernorTerminalOption {
  label: string;
  href: string;
  metric: string;
}

interface GovernorCardSpec {
  id: string;
  name: string;
  domain: string;
  status: string;
  summary: string;
  defaultHref: string;
  defaultMetric: string;
  terminals: GovernorTerminalOption[];
}

const GOVERNOR_DIRECTORY: GovernorCardSpec[] = [
  {
    id: "ARGUS",
    name: "ARGUS",
    domain: "Site CV, LiDAR & Drone Radar",
    status: "NOMINAL",
    summary: "Liebherr 280 EC-H radar locked over Green Wedge & Silver Dome (Azimuth 38.5°).",
    defaultHref: "/site/360-tour?zone=BIT-2",
    defaultMetric: "12 ms Latency",
    terminals: [
      { label: "360° LiDAR Reality Tour (BIT-2)", href: "/site/360-tour?zone=BIT-2", metric: "28,500 Pts" },
      { label: "Crane & Wind Stability Envelope", href: "/site/wind-stability", metric: "47 m/s Safe" },
      { label: "Structural NDT & SonReb Register", href: "/site/ndt", metric: "32.8 MPa" },
      { label: "Permit-to-Work (PTW) & HSE", href: "/site/ptw", metric: "9 Active PTWs" },
      { label: "Weighbridge & Gate Inward", href: "/site/weighbridge", metric: "±0.35% Var" },
    ],
  },
  {
    id: "MIDAS",
    name: "MIDAS",
    domain: "Commercial, BOQ & Escrow Billing",
    status: "NOMINAL",
    summary: "CPWD 5% statutory retention (₹43.22 Cr) & tensile/cladding ledger reconciled.",
    defaultHref: "/site/commercial",
    defaultMetric: "CPI 1.014",
    terminals: [
      { label: "Commercial & RA Billing Ledger", href: "/site/commercial", metric: "₹534.26 Cr" },
      { label: "CPWD Clause 42 Material Recon", href: "/site/material-recon", metric: "1.82% Rebar" },
      { label: "Clause 10CA / 10CC Escalation", href: "/finance/price-escalation", metric: "+₹4.86 Cr" },
      { label: "UP-LDA Statutory Escrow Gates", href: "/system/commercial-gates", metric: "Active" },
      { label: "Executive EVM S-Curve", href: "/executive/evm-scurve", metric: "CPI 1.014" },
    ],
  },
  {
    id: "MINERVA",
    name: "MINERVA",
    domain: "3D BIM, Multi-Ray & Spatial LOD-400",
    status: "NOMINAL",
    summary: "Zero spatial clashes between 4-car lift bank & 14th-fl HVAC risers; Node #14B tracked.",
    defaultHref: "/site/digital-twin",
    defaultMetric: "6 Bits Verified",
    terminals: [
      { label: "Federated 3D BIM & Multi-Ray Twin", href: "/site/digital-twin", metric: "LOD-400" },
      { label: "Master CPM Schedule & Gantt", href: "/schedule/gantt", metric: "0d Float" },
      { label: "Navisworks Clash Matrix", href: "/engineering/clashes", metric: "0 Clashes" },
      { label: "As-Built & COBie Handover Vault", href: "/handover/as-built", metric: "94.6% Linked" },
      { label: "Scan-vs-BIM Deviation Audit", href: "/quality/scan-vs-bim", metric: "1.8 mm RMS" },
    ],
  },
  {
    id: "HERMES",
    name: "HERMES",
    domain: "BSA Sec. 63 / Sec. 65B Notarization",
    status: "NOMINAL",
    summary: "Section 65B tamper-evident hash chain sealed for Gomti Nagar campus.",
    defaultHref: "/site/audit-ledger",
    defaultMetric: "Block #18402",
    terminals: [
      { label: "Section 65B / BSA Evidence Vault", href: "/site/audit-ledger", metric: "Block #18402" },
      { label: "Hindrance & SCL EOT Register", href: "/site/hindrance-eot", metric: "₹0 LD Risk" },
      { label: "NCR & Defect Lien Register", href: "/site/ncr-defect-liens", metric: "1 Active Hold" },
      { label: "Studio Workspace & Project Tokens", href: "/workspace", metric: "10 Sites" },
    ],
  },
];

export default function MasterCommandCenterPage() {
  const router = useRouter();
  const { activeProject } = useActiveProject();
  const { isLight } = useLiveviewTheme();
  const isVanguard = activeProject.projectId === VANGUARD_GENOME.projectId;

  const [craneAzimuth, setCraneAzimuth] = useState<number>(VANGUARD_GENOME.craneTelemetry.azimuthDeg);
  const [craneTilt, setCraneTilt] = useState<number>(-24.0);
  const [airspaceBreach, setAirspaceBreach] = useState<boolean>(false);

  const [isFieldDrawerOpen, setIsFieldDrawerOpen] = useState<boolean>(false);
  const [isSpoofScannerOpen, setIsSpoofScannerOpen] = useState<boolean>(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState<boolean>(false);
  const [latestFieldRecord, setLatestFieldRecord] = useState<FieldGroundingRecord | null>(null);

  const [iotTimestampIso, setIotTimestampIso] = useState<string>(() => new Date().toISOString());
  const [simulateStaleFeed, setSimulateStaleFeed] = useState<boolean>(false);

  // Per-Governor Selected Terminal State + Header Governor Filter
  const [governorFilter, setGovernorFilter] = useState<string>("ALL");
  const [selectedTerminals, setSelectedTerminals] = useState<Record<string, string>>({
    ARGUS: "/site/360-tour?zone=BIT-2",
    MIDAS: "/site/commercial",
    MINERVA: "/site/digital-twin",
    HERMES: "/site/audit-ledger",
  });

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
    const onBurst = (e: Event) => {
      const detail = (e as CustomEvent<any>).detail;
      if (!detail) return;
      setIotTimestampIso(new Date().toISOString());
      setAuditEntries((prev) =>
        [
          {
            id: `IOT-${Date.now()}`,
            timeStr: new Date().toTimeString().slice(0, 8),
            governor: "ARGUS-MULTI-RAY",
            provenance: "Live IoT Feed",
            title: `[${detail.projectCode}] Edge Multi-Ray LiDAR / IR / GPR Interlock`,
            detail: `${detail.projectName} • ${detail.zone} • Dielectric εr = 1.6 hollow anomaly sealed`,
            hash: detail.hash,
          },
          ...prev,
        ].slice(0, 6)
      );
    };
    window.addEventListener("quadillar-telemetry-burst", onBurst);
    return () => window.removeEventListener("quadillar-telemetry-burst", onBurst);
  }, []);

  const handleSimulateBreach = () => {
    const next = !airspaceBreach;
    setAirspaceBreach(next);
    setIotTimestampIso(new Date().toISOString());
    setCraneAzimuth(next ? 74.0 : VANGUARD_GENOME.craneTelemetry.azimuthDeg);
  };

  const rad = (craneAzimuth * Math.PI) / 180;
  const jibEndX = 85 + Math.cos(rad) * 58;
  const jibEndY = 95 + Math.sin(rad) * 58;

  const visibleGovernors =
    governorFilter === "ALL"
      ? GOVERNOR_DIRECTORY
      : GOVERNOR_DIRECTORY.filter((g) => g.id === governorFilter);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6 flex flex-col gap-5 font-mono max-w-[1600px] mx-auto">
      {/* 1. Clean Executive Header Bar */}
      <div className="border-b border-zinc-800/80 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              STATUTORY GOVERNANCE • {activeProject.code} • {activeProject.projectId}
            </span>
            <ProvenancePill source="Live IoT Feed" lastUpdatedIso={effectiveTelemetryIso} />
          </div>
          <h1 className="text-2xl md:text-[26px] font-bold tracking-tight text-white leading-tight">
            {activeProject.name}
          </h1>
          <p className="text-xs text-zinc-400">
            {activeProject.subtitle} • Baseline ₹{activeProject.contractValueCr.toFixed(2)} Cr
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
          <button
            type="button"
            onClick={() => {
              setSimulateStaleFeed((s) => !s);
              if (simulateStaleFeed) setIotTimestampIso(new Date().toISOString());
            }}
            className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition ${
              simulateStaleFeed
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                : "bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 text-zinc-300"
            }`}
          >
            {simulateStaleFeed ? "Restore Heartbeat" : "Test >15m Stale"}
          </button>

          <a
            href={`/site/digital-twin?project_id=${encodeURIComponent(activeProject.projectId)}`}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-bold rounded-xl transition inline-flex items-center gap-1.5"
          >
            <span>🏛️ 3D BIM TWIN</span>
          </a>

          <button
            type="button"
            onClick={() => setIsCertModalOpen(true)}
            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-bold rounded-xl transition inline-flex items-center gap-1.5"
          >
            <span>📄 65B QR CERT</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSpoofScannerOpen(true)}
            className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/45 text-rose-400 font-bold rounded-xl transition inline-flex items-center gap-1.5"
          >
            <span>📷 LIVE SPOOF SCAN</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFieldDrawerOpen(true)}
            className="px-3.5 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl transition inline-flex items-center gap-1.5 shadow-sm"
          >
            <span>🎙️ FIELD INGRESS</span>
          </button>
        </div>
      </div>

      {/* 2. Uniform, Pixel-Aligned 5-Card KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3.5 text-xs">
        <div className="bg-zinc-900/65 border border-zinc-800 p-4 rounded-2xl flex flex-col justify-between gap-2.5 min-h-[124px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate">
              EPC BASELINE
            </span>
            <ProvenancePill source="UP-LDA Escrow Ledger" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight tabular-nums">
            ₹{activeProject.contractValueCr.toFixed(2)} Cr
          </div>
          <div className="text-[10px] text-zinc-500 truncate">{activeProject.location}</div>
        </div>

        <a
          href="/site/digital-twin"
          className="bg-zinc-900/65 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-600 p-4 rounded-2xl transition flex flex-col justify-between gap-2.5 min-h-[124px]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate">
              SPATIAL BIM
            </span>
            <ProvenancePill source="LOD-400 BIM Sync" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight tabular-nums">
            {isVanguard ? "6 Bits" : `±${activeProject.lidarRmsMm.toFixed(1)} mm`}
          </div>
          <div className="text-[10px] text-zinc-400 flex items-center justify-between">
            <span>{isVanguard ? "LOD-400 Federated" : "LiDAR RMS Verified"}</span>
            <span className="font-bold">Open →</span>
          </div>
        </a>

        <div className="bg-zinc-900/65 border border-zinc-800 p-4 rounded-2xl flex flex-col justify-between gap-2.5 min-h-[124px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate">
              RETENTION (5%)
            </span>
            <ProvenancePill source="UP-LDA Escrow Ledger" />
          </div>
          <div className="text-2xl font-bold text-amber-500 tracking-tight tabular-nums">
            ₹{activeProject.retentionCr.toFixed(2)} Cr
          </div>
          <div className="text-[10px] text-zinc-500 truncate">UP-LDA Escrow Reserved</div>
        </div>

        <div className="bg-zinc-900/65 border border-zinc-800 p-4 rounded-2xl flex flex-col justify-between gap-2.5 min-h-[124px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate">
              CERTIFIED RA
            </span>
            <ProvenancePill source="Lab Core Certificate" />
          </div>
          <div className="text-2xl font-bold text-emerald-500 tracking-tight tabular-nums">
            ₹{activeProject.certifiedCr.toFixed(2)} Cr
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            {activeProject.physicalPct}% Physical Progress
          </div>
        </div>

        <div className="bg-zinc-900/65 border border-zinc-800 p-4 rounded-2xl flex flex-col justify-between gap-2.5 min-h-[124px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate">
              CURING & CPI
            </span>
            <ProvenancePill source="Live IoT Feed" lastUpdatedIso={effectiveTelemetryIso} />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight tabular-nums">
            31.4°C • {activeProject.cpi.toFixed(3)}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            RH 68% • Soffit Node #TG-03
          </div>
        </div>
      </div>

      {/* 3. Site-Specific Geometric / Sequence Deviation Alert (for Sites PRJ-02..PRJ-10) */}
      {!isVanguard && activeProject.activeAlerts.length > 0 && (
        <div className="bg-zinc-900/75 border border-rose-500/45 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              ⚠ ACTIVE SITE WRONGDOING & GEOMETRIC DEVIATION ({activeProject.code})
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/40 text-rose-400 text-[10px] font-bold">
              {activeProject.activeAlerts[0].deviationMetric}
            </span>
          </div>
          {activeProject.activeAlerts.map((al) => (
            <div
              key={al.alertId}
              className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="font-bold text-white">
                  [{al.alertId}] {al.headline} — {al.floorOrZone}
                </div>
                <div className="text-[11px] text-zinc-400 leading-relaxed">{al.detail}</div>
                <div className="text-[10px] text-amber-500 font-bold">
                  Escrow Hold: ₹{al.financialImpactInr.toLocaleString("en-IN")} • {al.standardRef}
                </div>
              </div>
              <a
                href={al.deepLink.href}
                className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-[11px] shrink-0 text-center"
              >
                {al.deepLink.label} →
              </a>
            </div>
          ))}
        </div>
      )}

      {/* 4. Bidirectional Quality-to-Escrow Kill Switch */}
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

      {/* 5. Reality Gateway + Section 65B Notarized Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 bg-zinc-900/65 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  airspaceBreach ? "bg-rose-500 animate-ping" : "bg-emerald-500"
                }`}
              />
              <span className="font-bold text-zinc-100 uppercase tracking-wider">
                {activeProject.code} REALITY GATEWAY (CRANE 01)
              </span>
            </div>
            <ProvenancePill source="Live IoT Feed" lastUpdatedIso={effectiveTelemetryIso} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-7 bg-zinc-950 border border-zinc-800 rounded-xl p-2 flex items-center justify-center">
              <svg viewBox="0 0 260 185" className="w-full h-44">
                <circle cx="85" cy="95" r="64" fill="none" stroke="#3f3f46" strokeDasharray="3 3" />
                <text x="36" y="24" fill="#71717a" fontSize="7" fontFamily="monospace">
                  CRANE-01 (65M JIB RADIUS)
                </text>
                <line
                  x1="85"
                  y1="95"
                  x2={jibEndX}
                  y2={jibEndY}
                  stroke={airspaceBreach ? "#ef4444" : "#10b981"}
                  strokeWidth="3"
                />
                <circle cx="85" cy="95" r="4" fill="#10b981" />
                <ellipse
                  cx="195"
                  cy="65"
                  rx="34"
                  ry="18"
                  fill={airspaceBreach ? "rgba(239,68,68,0.18)" : "rgba(16,185,129,0.08)"}
                  stroke={airspaceBreach ? "#ef4444" : "#71717a"}
                />
                <text
                  x="165"
                  y="42"
                  fill={airspaceBreach ? "#ef4444" : "#a1a1aa"}
                  fontSize="7"
                  fontFamily="monospace"
                >
                  BIT-2 DOME (16.5M)
                </text>
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

            <div className="md:col-span-5 bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between gap-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-bold uppercase">PTZ & LMI</span>
                <span className="text-[9px] text-emerald-500 font-bold">LMI SYNC</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-center">
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
                  <div className="text-[9px] text-zinc-500">PITCH</div>
                  <div className="text-[11px] font-bold text-zinc-100">{craneTilt.toFixed(1)}°</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: "BIT-1", az: 38.5, tilt: -24.0 },
                  { label: "BIT-2", az: 10.0, tilt: -16.5 },
                  { label: "YARD", az: 78.0, tilt: -34.0 },
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

              <button
                type="button"
                onClick={handleSimulateBreach}
                className={`w-full py-2 px-2 rounded-lg border font-bold text-[10px] transition ${
                  airspaceBreach
                    ? "bg-rose-500 text-white border-rose-400 animate-pulse"
                    : "bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border-rose-500/40"
                }`}
              >
                {airspaceBreach ? "⚠ RESET BREACH" : "SIMULATE BREACH"}
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
              LATENCY: <strong className="text-emerald-500">{VANGUARD_GENOME.craneTelemetry.latencyMs} ms</strong>
            </span>
          </div>
        </div>

        <div className="lg:col-span-6 bg-zinc-900/65 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-zinc-800 pb-2.5 text-xs">
            <span className="font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              SECTION 65B / BSA NOTARIZED AUDIT STREAM
            </span>
            <ProvenancePill source="BSA Sec. 63 / Sec. 65B Vault" />
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-64">
            {auditEntries.map((entry) => (
              <div
                key={entry.id + entry.timeStr}
                className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col gap-1.5 text-xs"
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
                  <span className="text-zinc-400 truncate max-w-[70%]">SHA-256: {entry.hash}</span>
                  <span className="text-emerald-500 font-bold">BSA Sec. 63 Sealed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Primary View Governors (With Interactive Sub-Module Dropdowns) */}
      <div className="flex flex-col gap-3 pb-12">
        <div className="flex flex-wrap justify-between items-center gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-zinc-100 uppercase tracking-wider">
              PRIMARY VIEW GOVERNORS ({visibleGovernors.length})
            </span>
          </div>

          {/* Section-Level Governor Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400 hidden sm:inline">FILTER GOVERNOR:</span>
            <select
              aria-label="Filter Primary View Governors"
              value={governorFilter}
              onChange={(e) => setGovernorFilter(e.target.value)}
              style={{
                backgroundColor: isLight ? "#FDFCF9" : "#09090B",
                borderColor: isLight ? "#D6CFC2" : "#27272A",
                color: isLight ? "#1F1E1B" : "#FAFAFA",
              }}
              className="rounded-xl border px-3 py-1.5 text-[11px] font-bold outline-none cursor-pointer"
            >
              <option value="ALL">All View Governors (4)</option>
              {GOVERNOR_DIRECTORY.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} — {g.domain}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 text-xs">
          {visibleGovernors.map((gov) => {
            const selectedHref = selectedTerminals[gov.id] || gov.defaultHref;
            const activeTerm =
              gov.terminals.find((t) => t.href === selectedHref) || gov.terminals[0];

            return (
              <div
                key={gov.id}
                className="bg-zinc-900/65 border border-zinc-800 hover:border-zinc-600 p-4 rounded-2xl flex flex-col justify-between gap-3 transition"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-sm tracking-tight">{gov.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/35 text-emerald-500 text-[10px] font-bold">
                      {gov.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-semibold">{gov.domain}</div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">{gov.summary}</p>
                </div>

                {/* Interactive Governor Sub-Module Dropdown + Direct Launch */}
                <div className="pt-2.5 border-t border-zinc-800/80 flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-zinc-400 uppercase font-bold">
                      SELECT {gov.name} TERMINAL
                    </span>
                    <div className="relative">
                      <select
                        aria-label={`${gov.name} Terminal Dropdown`}
                        value={selectedHref}
                        onChange={(e) => {
                          const nextHref = e.target.value;
                          setSelectedTerminals((prev) => ({ ...prev, [gov.id]: nextHref }));
                        }}
                        style={{
                          backgroundColor: isLight ? "#FDFCF9" : "#09090B",
                          borderColor: isLight ? "#D6CFC2" : "#27272A",
                          color: isLight ? "#1F1E1B" : "#FAFAFA",
                        }}
                        className="w-full appearance-none rounded-xl border px-2.5 py-1.5 pr-7 text-[10.5px] font-bold outline-none cursor-pointer"
                      >
                        {gov.terminals.map((term) => (
                          <option key={term.href} value={term.href}>
                            {term.label} ({term.metric})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push(selectedHref)}
                    className="w-full py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-100 font-bold text-[10.5px] flex items-center justify-between transition"
                  >
                    <span className="truncate pr-2">Launch {activeTerm.label.split("(")[0].trim()}</span>
                    <span className="inline-flex items-center gap-1 text-emerald-500 shrink-0">
                      {activeTerm.metric}
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <LiveWebcamSpoofScanner
        isOpen={isSpoofScannerOpen}
        onClose={() => setIsSpoofScannerOpen(false)}
        projectId={activeProject.projectId}
        projectName={activeProject.name}
        onAuditCommit={(v) =>
          setAuditEntries((prev) =>
            [
              {
                id: `VISION-${Date.now()}`,
                timeStr: new Date(v.timestampIso).toTimeString().slice(0, 8),
                governor: "ARGUS-VISION-3.8",
                provenance: "Verified Field Audio + Photo",
                title: `[${v.verdict}] ${v.materialDetected}`,
                detail: `${v.multiRayHardwareDirective} (Est. εr = ${v.estimatedDielectricEr})`,
                hash: v.sha256FrameSeal,
              },
              ...prev,
            ].slice(0, 6)
          )
        }
      />

      <ComplianceCertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        projectCode={activeProject.code}
        projectId={activeProject.projectId}
        projectName={activeProject.name}
        location={activeProject.location}
        contractValueCr={activeProject.contractValueCr}
      />

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
                governor: "QUADMAX-GEMINI-3.8",
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
