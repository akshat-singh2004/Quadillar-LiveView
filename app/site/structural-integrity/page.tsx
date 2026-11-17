"use client";

import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  evaluateColumnNdtAudit,
  calculateUpvPulseVelocity,
  calculateSonRebInSituStrength,
  SonRebInspectionPoint,
  NdtForensicAuditResult
} from "@/lib/calculations/ndtInspectionEngine";

// --- INLINE SVG ICONS ---
const ActivityIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 00-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const LockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
const UnlockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 019.9-1" />
  </svg>
);
const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const RefreshIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function NdtInspectionPage() {
  const targetFck = 35.0; // M35 Concrete
  const contractualLienInr = 208720; // Beam-Column C2 Honeycombing Lien

  // Pre vs Post-Grouting State Switcher for Defective Column C2
  const [remediationPhase, setRemediationPhase] = useState<"PRE_GROUT_HONEYCOMB" | "POST_GROUT_REMEDIATED">("POST_GROUT_REMEDIATED");
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  // Column C2 Multi-Station SonReb Dataset across vertical height (0.5m to 3.5m)
  const inspectionStations: SonRebInspectionPoint[] = useMemo(() => {
    if (remediationPhase === "PRE_GROUT_HONEYCOMB") {
      // Defective porous honeycombed concrete state (Pre-grouting)
      return [
        {
          stationTag: "STN-C2-01",
          gridCoordinate: "Grid C2 (+0.6m RL)",
          upvReading: {
            pointId: "UPV-01",
            locationElevationM: 0.6,
            transmissionMode: "DIRECT",
            pathLengthMm: 450,
            transitTimeMicroSec: 156.0,
            pulseVelocityKmS: 2.88, // < 3.0 km/s (Doubtful / Honeycomb)
            gradingQuality: "DOUBTFUL_HONEYCOMB"
          },
          reboundReading: {
            reboundNumber: 24,
            impactAngleDeg: 0,
            correctedReboundNumber: 24,
            estimatedSingleStrengthMpa: 18.5
          },
          combinedSonRebStrengthMpa: 17.4,
          isAcceptableAgainst085Fck: false
        },
        {
          stationTag: "STN-C2-02",
          gridCoordinate: "Grid C2 (+1.5m RL)",
          upvReading: {
            pointId: "UPV-02",
            locationElevationM: 1.5,
            transmissionMode: "DIRECT",
            pathLengthMm: 450,
            transitTimeMicroSec: 148.0,
            pulseVelocityKmS: 3.04, // 3.04 km/s (Medium)
            gradingQuality: "MEDIUM_QUESTIONABLE"
          },
          reboundReading: {
            reboundNumber: 26,
            impactAngleDeg: 0,
            correctedReboundNumber: 26,
            estimatedSingleStrengthMpa: 21.2
          },
          combinedSonRebStrengthMpa: 20.1,
          isAcceptableAgainst085Fck: false
        },
        {
          stationTag: "STN-C2-03",
          gridCoordinate: "Grid C2 (+2.4m RL)",
          upvReading: {
            pointId: "UPV-03",
            locationElevationM: 2.4,
            transmissionMode: "DIRECT",
            pathLengthMm: 450,
            transitTimeMicroSec: 142.0,
            pulseVelocityKmS: 3.17,
            gradingQuality: "MEDIUM_QUESTIONABLE"
          },
          reboundReading: {
            reboundNumber: 28,
            impactAngleDeg: 0,
            correctedReboundNumber: 28,
            estimatedSingleStrengthMpa: 23.8
          },
          combinedSonRebStrengthMpa: 22.8,
          isAcceptableAgainst085Fck: false
        }
      ];
    }

    // Post-Remediation State: High-Strength Non-Shrink Micro-Concrete Injected
    return [
      {
        stationTag: "STN-C2-01",
        gridCoordinate: "Grid C2 (+0.6m RL - Post-Grout)",
        upvReading: {
          pointId: "UPV-01",
          locationElevationM: 0.6,
          transmissionMode: "DIRECT",
          pathLengthMm: 450,
          transitTimeMicroSec: 106.0,
          pulseVelocityKmS: 4.25, // 4.25 km/s (Good / Dense)
          gradingQuality: "GOOD"
        },
        reboundReading: {
          reboundNumber: 36,
          impactAngleDeg: 0,
          correctedReboundNumber: 36,
          estimatedSingleStrengthMpa: 33.5
        },
        combinedSonRebStrengthMpa: 32.8,
        isAcceptableAgainst085Fck: true
      },
      {
        stationTag: "STN-C2-02",
        gridCoordinate: "Grid C2 (+1.5m RL - Post-Grout)",
        upvReading: {
          pointId: "UPV-02",
          locationElevationM: 1.5,
          transmissionMode: "DIRECT",
          pathLengthMm: 450,
          transitTimeMicroSec: 104.0,
          pulseVelocityKmS: 4.33,
          gradingQuality: "GOOD"
        },
        reboundReading: {
          reboundNumber: 37,
          impactAngleDeg: 0,
          correctedReboundNumber: 37,
          estimatedSingleStrengthMpa: 34.8
        },
        combinedSonRebStrengthMpa: 34.2,
        isAcceptableAgainst085Fck: true
      },
      {
        stationTag: "STN-C2-03",
        gridCoordinate: "Grid C2 (+2.4m RL - Post-Grout)",
        upvReading: {
          pointId: "UPV-03",
          locationElevationM: 2.4,
          transmissionMode: "DIRECT",
          pathLengthMm: 450,
          transitTimeMicroSec: 108.0,
          pulseVelocityKmS: 4.17,
          gradingQuality: "GOOD"
        },
        reboundReading: {
          reboundNumber: 35,
          impactAngleDeg: 0,
          correctedReboundNumber: 35,
          estimatedSingleStrengthMpa: 31.9
        },
        combinedSonRebStrengthMpa: 31.4,
        isAcceptableAgainst085Fck: true
      }
    ];
  }, [remediationPhase]);

  // Compute live forensic audit
  const auditResult: NdtForensicAuditResult = useMemo(() => {
    return evaluateColumnNdtAudit(inspectionStations, targetFck, contractualLienInr);
  }, [inspectionStations, targetFck, contractualLienInr]);

  const handleSealNdtCertificate = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_NDT_COL_C2_PHASE_${remediationPhase}_STRENGTH_${auditResult.estimatedInSituStrengthMpa}_ACTION_${auditResult.contractualLienAction}_LIEN_${auditResult.lienAmountInr}_TIME_${timestamp}_${Date.now()}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "THEMIS-NDT-FORENSIC",
          synthesis_report: `NDT STRUCTURAL INTEGRITY CERTIFICATE NOTARIZED: Member ${auditResult.memberTag} • In-Situ Strength: ${auditResult.estimatedInSituStrengthMpa} MPa (${auditResult.strengthRatioPct}% f_ck) • UPV Velocity: ${auditResult.meanPulseVelocityKmS} km/s (${auditResult.overallVelocityGrade}) • Rebound Index: ${auditResult.meanReboundNumber} • Action: ${auditResult.contractualLienAction} • Contractual Lien ₹${auditResult.lienAmountInr.toLocaleString()} Released into Escrow`,
          merkle_root_hash: hash
        });
      } catch (e) {}
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              IS 13311 (PARTS 1 & 2) / IS 456 CL. 17.4
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              ULTRASONIC PULSE VELOCITY & REBOUND HAMMER
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            IN-SITU NDT STRUCTURAL INTEGRITY & LIEN CLEARANCE
          </h1>
          <p className="text-xs text-slate-400">
            Forensic Testing of Column C2 (NCR #009 Honeycombing) • Direct SonReb Strength Evaluation & Automated Contractual Lien Release
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">🏛️ 3D BIM TWIN</a>
          <a href="/site/commercial" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">💼 COMMERCIAL</a>
          <a href="/site/emb" className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs rounded-lg transition">📑 RA BILL #05</a>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">MEAN PULSE VELOCITY</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">
            {auditResult.meanPulseVelocityKmS} km/s
          </div>
          <div className={`text-[10px] mt-0.5 font-bold ${
            auditResult.overallVelocityGrade === "GOOD" || auditResult.overallVelocityGrade === "EXCELLENT"
              ? "text-emerald-400"
              : "text-red-400"
          }`}>
            IS 13311 Grade: {auditResult.overallVelocityGrade}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">MEAN REBOUND INDEX</div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">
            R = {auditResult.meanReboundNumber}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Horizontal Impact Calibration</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">IN-SITU COMBINED STRENGTH</div>
          <div className={`text-xl font-bold mt-1 font-mono ${auditResult.isStructuralIntegrityCertified ? "text-emerald-400" : "text-red-400"}`}>
            {auditResult.estimatedInSituStrengthMpa} MPa
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            IS 456 0.85 f_ck Limit: ≥ {auditResult.statutoryThreshold085FckMpa} MPa
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">CONTRACTUAL LIEN STATUS</div>
          <div className={`text-sm font-bold mt-1.5 flex items-center gap-1.5 ${
            auditResult.isStructuralIntegrityCertified ? "text-emerald-400" : "text-amber-400"
          }`}>
            {auditResult.isStructuralIntegrityCertified ? (
              <>
                <UnlockIcon className="w-4 h-4 text-emerald-400" />
                <span>LIEN RELEASED</span>
              </>
            ) : (
              <>
                <LockIcon className="w-4 h-4 text-amber-400" />
                <span>LIEN WITHHELD</span>
              </>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Withholding: ₹{auditResult.lienAmountInr.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">REMEDIATION STATUS</div>
          <div className="text-sm font-bold text-white mt-1.5">
            {remediationPhase === "POST_GROUT_REMEDIATED" ? "GROUTED & VERIFIED" : "HONEYCOMB DEFECT"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">SikaGrout 214 Injection</div>
        </div>
      </div>

      {/* Remediation Phase Toggle Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            FORENSIC AUDIT LIFECYCLE:
          </span>
          <button
            onClick={() => { setRemediationPhase("PRE_GROUT_HONEYCOMB"); setSealedHash(null); }}
            className={`px-3 py-1.5 rounded-xl border font-bold transition ${
              remediationPhase === "PRE_GROUT_HONEYCOMB"
                ? "bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                : "bg-slate-950 text-slate-400 border-slate-800"
            }`}
          >
            STAGE 1: DEFECT AUDIT (HONEYCOMB RECORDED)
          </button>
          <button
            onClick={() => { setRemediationPhase("POST_GROUT_REMEDIATED"); setSealedHash(null); }}
            className={`px-3 py-1.5 rounded-xl border font-bold transition ${
              remediationPhase === "POST_GROUT_REMEDIATED"
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                : "bg-slate-950 text-slate-400 border-slate-800"
            }`}
          >
            STAGE 2: POST-GROUT CLEARANCE (REMEDIATED)
          </button>
        </div>

        <span className="text-[10px] text-slate-500">
          Target Member: Column C2 (450x450mm • M35 RMC)
        </span>
      </div>

      {/* Main Grid: Multi-Station NDT Logbook & Transducer Ultrasonic Schematic */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Station-wise Ultrasonic & Rebound Hammer Inspection Table */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ActivityIcon className="w-3.5 h-3.5 text-cyan-400" />
              SONREB TEST SCHEDULE: COLUMN C2 (GRID C2)
            </span>
            <span className="text-cyan-400 font-mono text-[10px]">
              {inspectionStations.length} DIRECT TRANSMISSION STATIONS
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">STATION</th>
                  <th className="py-2.5 px-3">TRANSIT TIME</th>
                  <th className="py-2.5 px-3">PULSE VELOCITY</th>
                  <th className="py-2.5 px-3 text-center">REBOUND (R)</th>
                  <th className="py-2.5 px-3 text-right">SONREB STRENGTH</th>
                  <th className="py-2.5 px-3 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300 text-[11px]">
                {inspectionStations.map(stn => (
                  <tr key={stn.stationTag} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{stn.stationTag}</div>
                      <div className="text-[10px] text-slate-500 font-sans">{stn.gridCoordinate}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-white font-bold">{stn.upvReading.transitTimeMicroSec} µs</span>
                      <div className="text-[9px] text-slate-500">Path: 450mm</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-white">{stn.upvReading.pulseVelocityKmS} km/s</span>
                      <div className={`text-[9px] font-bold ${
                        stn.upvReading.gradingQuality === "GOOD" ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {stn.upvReading.gradingQuality.replace(/_/g, " ")}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-cyan-400">
                      {stn.reboundReading.correctedReboundNumber}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-white">
                      <span className={stn.combinedSonRebStrengthMpa >= 29.75 ? "text-emerald-400" : "text-red-400"}>
                        {stn.combinedSonRebStrengthMpa} MPa
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        stn.isAcceptableAgainst085Fck
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-950 text-red-400 border border-red-500/30"
                      }`}>
                        {stn.isAcceptableAgainst085Fck ? "PASSED (≥ 29.75)" : "FAILED (< 29.75)"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-400 flex flex-col md:flex-row justify-between gap-2">
            <span>
              Combined Formulation: f_is = 1.18 · (V_upv)^1.42 · (R)^0.86 calibrated per RILEM TC 43-CND.
            </span>
            <span className="font-bold text-white">
              Mean Strength: {auditResult.estimatedInSituStrengthMpa} MPa ({auditResult.strengthRatioPct}% of M35)
            </span>
          </div>
        </div>

        {/* Right: Direct Transducer Geometry & Automated Lien Clearance Card */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Direct Ultrasonic Probe Schematic */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              DIRECT TRANSMISSION TRANSDUCER SCHEMATIC (IS 13311)
            </span>

            {/* Visual Column Cross-Section with Transducers */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-3 w-full justify-center">
                {/* Transmitter Probe */}
                <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-500/50 text-center">
                  <div className="text-[9px] text-cyan-400 font-bold">TRANSMITTER</div>
                  <div className="text-xs font-mono font-bold text-white">54 kHz Tx</div>
                </div>

                {/* Ultrasonic Wave across 450mm Column */}
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[9px] text-slate-400 font-mono mb-0.5">
                    Path Length: 450 mm
                  </span>
                  <div className="w-full h-1 bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500 rounded relative">
                    <div className="absolute inset-0 bg-white/40 animate-pulse"></div>
                  </div>
                  <span className={`text-[10px] font-mono font-bold mt-1 ${
                    auditResult.isStructuralIntegrityCertified ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {remediationPhase === "POST_GROUT_REMEDIATED" ? "HOMOGENEOUS SOLID CORE" : "INTERNAL POROUS VOIDS DETECTED"}
                  </span>
                </div>

                {/* Receiver Probe */}
                <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-500/50 text-center">
                  <div className="text-[9px] text-cyan-400 font-bold">RECEIVER</div>
                  <div className="text-xs font-mono font-bold text-white">54 kHz Rx</div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400">
              IS 456 Cl. 17.4.3: In-situ core / NDT strength must achieve at least 85% of specified design strength (0.85 × f_ck = 29.75 MPa). If verified compliant post-rectification, financial lien is unblocked.
            </div>
          </div>

          {/* Section 65B Forensic NDT Certificate & Commercial Lien Release */}
          <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3 shadow-[0_0_20px_rgba(168,85,247,0.12)]">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">
                <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
                <span>SECTION 65B NDT CLEARANCE CERTIFICATE</span>
              </div>
              <div className="text-[11px] text-slate-300 leading-relaxed">
                Legally certifies the post-remediation compressive strength of Column C2, releasing the contractual lien into the interim payment certificate.
              </div>

              {/* Action Banner */}
              <div className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                auditResult.isStructuralIntegrityCertified
                  ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
                  : "bg-red-950/60 border-red-500/40 text-red-200"
              }`}>
                <div className="flex items-center gap-2">
                  {auditResult.isStructuralIntegrityCertified ? (
                    <UnlockIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <LockIcon className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold">
                      {auditResult.isStructuralIntegrityCertified ? "LIEN UNBLOCKING AUTHORIZED" : "LIEN WITHHELD (UNRESOLVED)"}
                    </div>
                    <div className="text-[10px] opacity-80">
                      Amount: ₹{auditResult.lienAmountInr.toLocaleString()} (Bill RA-05)
                    </div>
                  </div>
                </div>
                <span className="font-bold font-mono text-sm">
                  {auditResult.isStructuralIntegrityCertified ? "CLEARED" : "HOLD"}
                </span>
              </div>
            </div>

            <div>
              {sealedHash ? (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
                  <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>NDT CLEARANCE CERTIFICATE SEALED</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1 font-mono truncate select-all">
                    {sealedHash}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSealNdtCertificate}
                  disabled={isNotarizing || !auditResult.isStructuralIntegrityCertified}
                  className={`w-full py-2.5 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 ${
                    auditResult.isStructuralIntegrityCertified
                      ? "bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950"
                      : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                  }`}
                >
                  {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
                  <span>
                    {auditResult.isStructuralIntegrityCertified
                      ? "SEAL NDT CERTIFICATE & RELEASE LIEN (SEC 65B)"
                      : "CANNOT RELEASE: INSUFFICIENT IN-SITU STRENGTH"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
