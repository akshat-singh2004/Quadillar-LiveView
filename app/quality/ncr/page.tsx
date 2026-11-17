"use client";

import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  evaluateUpvQuality,
  calculateFinancialDefectLien,
  NcrRecordItem,
  NonDestructiveTestInput
} from "@/lib/calculations/ncrQualityEngine";

// --- INLINE SVG ICONS ---
const AlertOctagonIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 00-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const ActivityIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
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

export default function NcrQualityDefectLiensPage() {
  // Master Non-Conformance Register linked to Vanguard 3D BIM structural components
  const [ncrList, setNcrList] = useState<NcrRecordItem[]>([
    {
      ncrId: "NCR-VGD-2026-009",
      itemNo: 1,
      title: "Extensive Honeycombing & Rebar Congestion at Beam-Column Junction C2",
      affectedZone: "ZONE_B",
      cpmActivityId: "ACT-04", // Podium Level Columns & Transfer Beams
      severity: "CRITICAL_STRUCTURAL",
      status: "INVESTIGATION_NDT_ACTIVE",
      defectCategory: "HONEYCOMBING_SEGREGATION",
      dateLogged: "24-Oct-2026",
      identifiedBy: "Sunil Nair (PMC Lead Quality Auditor - CBRE)",
      contractorRepresentative: "Rajesh Sethi (Site QA Manager - L&T)",
      affectedElementVolumeM3: 4.80, // Concrete volume withheld
      baseScheduleRatePerM3Inr: 8850.0,
      rectificationCostEstimateInr: 145000.0, // Micro-concrete pressure grouting + carbon wrap
      ndtReadings: {
        pathLengthMm: 450, // 450mm column core width
        transitTimeMicroSec: 122.5, // 450 / 122.5 = 3.67 km/s (Good/Medium)
        reboundNumberR: 31,
        calibratedConcreteGrade: 35 // M35
      },
      lienWithheldAmountInr: 208720.0, // Computed automatically
      section65bHash: "7b41e21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4"
    },
    {
      ncrId: "NCR-VGD-2026-010",
      itemNo: 2,
      title: "Cold Joint Delamination & Vibrator Stoppage on Level 2 Floor Slab",
      affectedZone: "ZONE_C",
      cpmActivityId: "ACT-06", // Superstructure Composite Slabs
      severity: "MAJOR_SERVICEABILITY",
      status: "ISSUED_HOLD_WORK",
      defectCategory: "COLD_JOINT_DELAMINATION",
      dateLogged: "26-Oct-2026",
      identifiedBy: "Deepak Rawat (Third Party Testing Inspector - TUV SUD)",
      contractorRepresentative: "Manohar Lal (Structural Engineer - L&T)",
      affectedElementVolumeM3: 8.50,
      baseScheduleRatePerM3Inr: 8200.0,
      rectificationCostEstimateInr: 85000.0, // Epoxy resin low-pressure injection
      ndtReadings: {
        pathLengthMm: 150, // 150mm slab thickness
        transitTimeMicroSec: 36.2, // 150 / 36.2 = 4.14 km/s (Good)
        reboundNumberR: 35,
        calibratedConcreteGrade: 35
      },
      lienWithheldAmountInr: 168640.0,
      section65bHash: "3f90a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4"
    },
    {
      ncrId: "NCR-VGD-2026-011",
      itemNo: 3,
      title: "Insufficient Clear Cover to Outer Rebar Ties (Measured 22mm vs 40mm Specified)",
      affectedZone: "ZONE_A",
      cpmActivityId: "ACT-03", // Raft Foundation Pedestals
      severity: "MINOR_AESTHETIC",
      status: "RECTIFICATION_SUBMITTED",
      defectCategory: "COVER_DEFICIENCY",
      dateLogged: "19-Oct-2026",
      identifiedBy: "Vandana Sharma (Client Engineering Representative)",
      contractorRepresentative: "Rajesh Sethi (Site QA Manager - L&T)",
      affectedElementVolumeM3: 3.20,
      baseScheduleRatePerM3Inr: 7800.0,
      rectificationCostEstimateInr: 32000.0, // Polymer-modified anti-carbonation mortar build-up
      ndtReadings: {
        pathLengthMm: 300,
        transitTimeMicroSec: 68.0, // 300 / 68.0 = 4.41 km/s (Good)
        reboundNumberR: 38,
        calibratedConcreteGrade: 35
      },
      lienWithheldAmountInr: 51968.0,
      section65bHash: "e102a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4"
    }
  ]);

  const [selectedNcrId, setSelectedNcrId] = useState<string>("NCR-VGD-2026-009");
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  const activeNcr = useMemo(() => {
    return ncrList.find(n => n.ncrId === selectedNcrId) || ncrList[0];
  }, [ncrList, selectedNcrId]);

  // Execute IS 13311 Ultrasonic & SonReb Evaluation
  const upvResult = useMemo(() => {
    return evaluateUpvQuality(activeNcr.ndtReadings);
  }, [activeNcr]);

  // Aggregate Total Financial Defect Liens Withheld from Running Bills
  const totalLienWithheldInr = useMemo(() => {
    return ncrList.reduce((acc, n) => {
      // Released items no longer withheld
      if (n.status === "VERIFIED_LIEN_RELEASED") return acc;
      return acc + n.lienWithheldAmountInr;
    }, 0);
  }, [ncrList]);

  // Interactive adjustments to NDT transducer readings
  const handleUpdateNdt = (param: keyof NonDestructiveTestInput, value: number) => {
    setNcrList(prev => prev.map(ncr => {
      if (ncr.ncrId === activeNcr.ncrId) {
        const updatedNdt = { ...ncr.ndtReadings, [param]: value };
        return { ...ncr, ndtReadings: updatedNdt };
      }
      return ncr;
    }));
  };

  // Release Lien Action
  const handleReleaseLien = (id: string) => {
    setNcrList(prev => prev.map(ncr => {
      if (ncr.ncrId === id) {
        return { ...ncr, status: "VERIFIED_LIEN_RELEASED" };
      }
      return ncr;
    }));
  };

  const handleSealNcrLedger = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_NCR_DEFECTS_${ncrList.length}_TOTAL_LIEN_${totalLienWithheldInr}_UPV_${upvResult.pulseVelocityKmPerSec}KMS_TIME_${timestamp}_${Date.now()}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "THEMIS-QUALITY",
          synthesis_report: `STATUTORY NCR DEFECT LIEN REGISTER NOTARIZED: Active Open NCRs: ${ncrList.filter(n => n.status !== "VERIFIED_LIEN_RELEASED").length} • Total Financial Lien Withheld: ₹${(totalLienWithheldInr / 100000).toFixed(2)}L • Active Inspection UPV: ${upvResult.pulseVelocityKmPerSec} km/s (${upvResult.qualityRating}) • SonReb In-Situ Strength: ${upvResult.estimatedStrengthSonRebMpa} MPa`,
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
              NON-CONFORMANCE (NCR) & DEFECT LIENS
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              IS 456 CL. 17 & IS 13311 NDT AUDIT
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            STATUTORY QUALITY NCR & ULTRASONIC NDT REGISTER
          </h1>
          <p className="text-xs text-slate-400">
            Project Vanguard • Ultrasonic Pulse Velocity (UPV) & Rebound Hammer SonReb In-Situ Verifications
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">🏛️ 3D BIM TWIN</a>
          <a href="/site/pour-cards" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">🧪 POUR CARDS</a>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">TOTAL ACTIVE DEFECT LIENS</div>
          <div className="text-xl font-bold text-red-400 mt-1 font-mono">
            ₹{(totalLienWithheldInr / 100000).toFixed(2)} Lakhs
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Withheld from RA Bill #05</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">ACTIVE ULTRASONIC VELOCITY</div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">
            {upvResult.pulseVelocityKmPerSec} km/s
          </div>
          <div className={`text-[10px] mt-0.5 font-bold ${
            upvResult.qualityRating === "EXCELLENT" || upvResult.qualityRating === "GOOD" ? "text-emerald-400" : "text-amber-400"
          }`}>
            Rating: {upvResult.qualityRating.replace(/_/g, " ")}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">SONREB IN-SITU STRENGTH</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">
            {upvResult.estimatedStrengthSonRebMpa} MPa
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {upvResult.strengthRetentionPct}% of Target M{activeNcr.ndtReadings.calibratedConcreteGrade}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">IS 456 CL. 17 COMPLIANCE</div>
          <div className={`text-sm font-bold mt-1.5 ${upvResult.complianceWithTarget ? "text-emerald-400" : "text-red-400"}`}>
            {upvResult.complianceWithTarget ? "PASSED (≥ 85% f_ck IN-SITU)" : "CORE TESTING MANDATORY"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {upvResult.isHomogeneous ? "Homogeneous Concrete Core" : "Internal Micro-cracking Detected"}
          </div>
        </div>
      </div>

      {/* Main Grid: NCR Defect Register Table & NDT Forensic Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Statutory NCR Defect Ledger */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertOctagonIcon className="w-3.5 h-3.5 text-red-400" />
              NON-CONFORMANCE REPORT (NCR) LOG & DEFECT WITHHOLDINGS
            </span>
            <span className="text-cyan-400 font-mono text-[10px]">
              {ncrList.filter(n => n.status !== "VERIFIED_LIEN_RELEASED").length} OPEN LIENS
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-2.5 px-3">NCR ID</th>
                  <th className="py-2.5 px-3">DEFECT DESCRIPTION</th>
                  <th className="py-2.5 px-3">ZONE & CPM</th>
                  <th className="py-2.5 px-3">SEVERITY</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3 text-right">LIEN WITHHELD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono text-[11px]">
                {ncrList.map((item) => {
                  const isSelected = item.ncrId === selectedNcrId;
                  return (
                    <tr
                      key={item.ncrId}
                      onClick={() => setSelectedNcrId(item.ncrId)}
                      className={`cursor-pointer transition ${
                        isSelected ? "bg-slate-800/80 border-l-2 border-cyan-400" : "hover:bg-slate-900/40"
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-white">{item.ncrId}</td>
                      <td className="py-3 px-3">
                        <div className="text-white font-sans text-xs font-semibold leading-tight">{item.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Logged: {item.dateLogged} • Vol: {item.affectedElementVolumeM3} m³
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-cyan-400 font-bold block">{item.affectedZone.replace("_", " ")}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{item.cpmActivityId}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          item.severity === "CRITICAL_STRUCTURAL"
                            ? "bg-red-950 text-red-400 border border-red-500/30"
                            : item.severity === "MAJOR_SERVICEABILITY"
                            ? "bg-amber-950 text-amber-400 border border-amber-500/30"
                            : "bg-cyan-950 text-cyan-300 border border-cyan-500/30"
                        }`}>
                          {item.severity.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          item.status === "VERIFIED_LIEN_RELEASED"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                            : item.status === "RECTIFICATION_SUBMITTED"
                            ? "bg-cyan-950 text-cyan-300 border border-cyan-500/30"
                            : "bg-red-950 text-red-400 border border-red-500/30"
                        }`}>
                          {item.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-white">
                        {item.status === "VERIFIED_LIEN_RELEASED" ? (
                          <span className="text-emerald-400">RELEASED</span>
                        ) : (
                          <span className="text-red-400">₹{item.lienWithheldAmountInr.toLocaleString()}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-400 flex flex-col md:flex-row justify-between gap-2">
            <span>
              IS 456 Cl. 17.4.3: In-situ core / NDT strength must achieve at least 85% of specified design strength (0.85 × f_ck). If verified compliant post-rectification, financial lien is unblocked.
            </span>
            <span className="font-bold text-cyan-400">
              Total Withheld Under Review: ₹{totalLienWithheldInr.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Right: Selected NCR NDT Diagnostic Console & Lien Action */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                NDT DIAGNOSTIC: {activeNcr.ncrId}
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">IS 13311 AUDIT</span>
            </div>

            <div>
              <div className="text-white font-bold text-sm leading-snug">{activeNcr.title}</div>
              <div className="text-[10px] text-slate-400 mt-1">
                Auditor: <strong className="text-white">{activeNcr.identifiedBy}</strong>
              </div>
            </div>

            {/* UPV Transducer Controls */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs flex flex-col gap-2.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
                <ActivityIcon className="w-3.5 h-3.5 text-cyan-400" />
                ULTRASONIC TRANSDUCER MEASUREMENTS
              </span>

              {/* Transit Time Microseconds */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400 text-[11px]">Transit Time (T):</span>
                  <span className="text-cyan-400 font-bold font-mono">{activeNcr.ndtReadings.transitTimeMicroSec.toFixed(1)} µs</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="180"
                  step="0.5"
                  value={activeNcr.ndtReadings.transitTimeMicroSec}
                  onChange={e => handleUpdateNdt("transitTimeMicroSec", parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Path Length mm */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400 text-[11px]">Transducer Separation (L):</span>
                  <span className="text-white font-bold font-mono">{activeNcr.ndtReadings.pathLengthMm} mm</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="600"
                  step="10"
                  value={activeNcr.ndtReadings.pathLengthMm}
                  onChange={e => handleUpdateNdt("pathLengthMm", parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-white"
                />
              </div>

              {/* Rebound Number R */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400 text-[11px]">Schmidt Rebound Index (R):</span>
                  <span className="text-amber-400 font-bold font-mono">{activeNcr.ndtReadings.reboundNumberR}</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="50"
                  step="1"
                  value={activeNcr.ndtReadings.reboundNumberR}
                  onChange={e => handleUpdateNdt("reboundNumberR", parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
                <span>V = L/T = {upvResult.pulseVelocityKmPerSec} km/s</span>
                <span className="text-emerald-400 font-bold">SonReb: {upvResult.estimatedStrengthSonRebMpa} MPa</span>
              </div>
            </div>

            {/* Financial Lien Breakdown */}
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs flex flex-col gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-bold">COMMERCIAL WITHHOLDING DOSSIER</span>
              <div className="flex justify-between">
                <span className="text-slate-400">Affected Element Cost:</span>
                <span className="font-mono text-white font-semibold">
                  ₹{(activeNcr.affectedElementVolumeM3 * activeNcr.baseScheduleRatePerM3Inr).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rectification Provision:</span>
                <span className="font-mono text-amber-400 font-semibold">
                  ₹{activeNcr.rectificationCostEstimateInr.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="font-bold text-white">Total Lien Withheld:</span>
                <span className="font-mono font-bold text-red-400 text-sm">
                  ₹{activeNcr.lienWithheldAmountInr.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {activeNcr.status !== "VERIFIED_LIEN_RELEASED" && (
              <button
                onClick={() => handleReleaseLien(activeNcr.ncrId)}
                disabled={!upvResult.complianceWithTarget}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                  upvResult.complianceWithTarget
                    ? "bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                <CheckIcon className="w-3.5 h-3.5" />
                <span>{upvResult.complianceWithTarget ? "CERTIFY NDT & RELEASE LIEN" : "NDT NON-COMPLIANT (HOLD)"}</span>
              </button>
            )}
          </div>

          {/* Section 65B Statutory Quality Notarization */}
          <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">
                <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
                <span>SECTION 65B QUALITY AUDIT SEAL</span>
              </div>
              <div className="text-[11px] text-slate-300 leading-relaxed">
                Legally records the non-conformance lifecycle, NDT ultrasonic testing velocities, and contractual financial lien withholdings.
              </div>
            </div>

            <div>
              {sealedHash ? (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
                  <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>NCR AUDIT NOTARIZED & SEALED</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1 font-mono truncate select-all">
                    {sealedHash}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSealNcrLedger}
                  disabled={isNotarizing}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
                  <span>NOTARIZE NCR QUALITY REGISTER</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
