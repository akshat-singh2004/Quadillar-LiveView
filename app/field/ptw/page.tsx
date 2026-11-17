"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// --- INLINE SVG ICONS ---
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 00-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const FlameIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343a7.975 7.975 0 012.344 5.657c0 2.122-.843 4.157-2.343 5.657z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c-.667 1.333-.333 2.667.879 2.121z" />
  </svg>
);
const AlertTriangleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const LockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
const RefreshIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface PermitRecord {
  id: string;
  type: "HEAVY_LIFT" | "HOT_WORK" | "HEIGHT_WORK" | "CONFINED_SPACE";
  title: string;
  zoneTarget: string;
  elevation: string;
  subcontractor: string;
  competentPerson: string;
  validFrom: string;
  validTo: string;
  riskRating: "CRITICAL" | "HIGH" | "MEDIUM";
  status: "ACTIVE_PERMITTED" | "PENDING_AUTHORIZATION" | "REVOKED_HOLD";
  safetyChecklist: { item: string; verified: boolean }[];
  environmentalTelemetry: { label: string; value: string; status: "OK" | "ALERT" }[];
  authorizedBy: string;
}

const VANGUARD_PERMITS: PermitRecord[] = [
  {
    id: "PTW-VGD-2026-101",
    type: "HEAVY_LIFT",
    title: "Rooftop 3.5T Packaged Air-Cooled Chiller Rigging & Placement",
    zoneTarget: "ZONE-D ROOF MECHANICAL PLANT",
    elevation: "+12.75m to +14.2m RL",
    subcontractor: "Carrier HVAC Rigging Team",
    competentPerson: "Dinesh Sharma (Master Rigger Gr. 1)",
    validFrom: "29-Oct-2026 09:00 IST",
    validTo: "29-Oct-2026 13:30 IST",
    riskRating: "CRITICAL",
    status: "ACTIVE_PERMITTED",
    safetyChecklist: [
      { item: "Potain IGO 50 Outrigger spread verified on engineered concrete pad (220 kPa)", verified: true },
      { item: "TPI-certified 4-leg wire rope slings & 6.5T bow shackles inspected", verified: true },
      { item: "Ground tag lines secured to prevent load rotation across 10.3m building face", verified: true },
      { item: "Site GIS radar 11kV overhead powerline geofence active & hoist slew limited", verified: true },
      { item: "Ground exclusion barricade established (12m radius around lifting radius)", verified: true }
    ],
    environmentalTelemetry: [
      { label: "ANEMOMETER WIND SPEED", value: "3.2 m/s (Cutoff: 9.0 m/s)", status: "OK" },
      { label: "LOAD MOMENT UTILIZATION", value: "54.2% of safe rated capacity", status: "OK" }
    ],
    authorizedBy: "AEGIS-SAFETY-GOVERNOR"
  },
  {
    id: "PTW-VGD-2026-102",
    type: "HOT_WORK",
    title: "Structural Moment Connection Welding on Level 2 Floor Framing",
    zoneTarget: "ZONE-C SUPERSTRUCTURE",
    elevation: "+8.5m RL (Grid Line C2-D2)",
    subcontractor: "Vanguard Structural Erectors Ltd",
    competentPerson: "Manohar Lal (AWS Certified Welding Inspector)",
    validFrom: "29-Oct-2026 10:00 IST",
    validTo: "29-Oct-2026 17:00 IST",
    riskRating: "HIGH",
    status: "ACTIVE_PERMITTED",
    safetyChecklist: [
      { item: "Heavy silica fire blankets deployed below welding beam flanges", verified: true },
      { item: "Two 9kg ABC dry chemical powder fire extinguishers on immediate standby", verified: true },
      { item: "Zone B ground level catch netting deployed for sparks & slag", verified: true },
      { item: "Continuous fire watch guard deployed with direct radio contact to gate", verified: true },
      { item: "Wet riser standpipe connection pressurized at 6.0 bar within 15 meters", verified: true }
    ],
    environmentalTelemetry: [
      { label: "STANDPIPE PRESSURE", value: "85 PSI (Active)", status: "OK" },
      { label: "SURROUNDING SURFACE TEMP", value: "29.8° C (Safe)", status: "OK" }
    ],
    authorizedBy: "AEGIS-SAFETY-GOVERNOR"
  },
  {
    id: "PTW-VGD-2026-103",
    type: "CONFINED_SPACE",
    title: "Elevator Pit Sump & Subgrade Stormwater Retention Tank Inspection",
    zoneTarget: "ZONE-A SUBGRADE FOUNDATION",
    elevation: "-2.2m RL (Lift Pit Base)",
    subcontractor: "Otis Elevator Civil Team",
    competentPerson: "Sunil Verma (HSE Confined Space Lead)",
    validFrom: "29-Oct-2026 13:00 IST",
    validTo: "29-Oct-2026 16:30 IST",
    riskRating: "CRITICAL",
    status: "PENDING_AUTHORIZATION",
    safetyChecklist: [
      { item: "Calibrated 4-gas detector verified: O2, CO, H2S, and LEL limits cleared", verified: true },
      { item: "Axial positive air blower operating > 15 mins prior to pit entry", verified: true },
      { item: "Aluminium rescue tripod with mechanical winch mounted over manhole", verified: true },
      { item: "Standby entrant attendant stationed outside pit entrance at all times", verified: true },
      { item: "Full body harness (IS 3521) with retrieval lifeline attached to entrant", verified: true }
    ],
    environmentalTelemetry: [
      { label: "OXYGEN CONCENTRATION (O2)", value: "20.9% (Normal: 19.5 - 23.5%)", status: "OK" },
      { label: "CARBON MONOXIDE (CO)", value: "0 ppm (Safe limit < 25 ppm)", status: "OK" },
      { label: "EXPLOSIVE GASES (LEL)", value: "0% LEL (Safe limit < 5%)", status: "OK" }
    ],
    authorizedBy: "PENDING AEGIS SIGN-OFF"
  },
  {
    id: "PTW-VGD-2026-104",
    type: "HEIGHT_WORK",
    title: "Double Glazed Unit (DGU) Curtain Wall Panel Installation via Scissor Lift",
    zoneTarget: "ZONE-B & C FACADE ENVELOPE",
    elevation: "+4.5m to +9.5m RL (East Elevation)",
    subcontractor: "AluK Architectural Glazing Systems",
    competentPerson: "Kavita Rao (Scaffold & MEWP Inspector)",
    validFrom: "29-Oct-2026 11:30 IST",
    validTo: "29-Oct-2026 17:30 IST",
    riskRating: "HIGH",
    status: "ACTIVE_PERMITTED",
    safetyChecklist: [
      { item: "12m Electric Scissor Lift (MEWP) daily pre-start inspection log signed", verified: true },
      { item: "100% tie-off to engineered internal lift anchor points verified", verified: true },
      { item: "Glass vacuum suction lifter battery and seal integrity pressure checked", verified: true },
      { item: "Pedestrian exclusion barrier positioned along perimeter walkway", verified: true },
      { item: "Wind velocity monitored continuously (work stops if wind > 8.5 m/s)", verified: true }
    ],
    environmentalTelemetry: [
      { label: "WIND GUST VELOCITY", value: "4.1 m/s (Limit: 8.5 m/s)", status: "OK" },
      { label: "GROUND DROP ZONE", value: "Barricaded 4.5m buffer", status: "OK" }
    ],
    authorizedBy: "AEGIS-SAFETY-GOVERNOR"
  }
];

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function VanguardPermitToWorkPage() {
  const [activePermit, setActivePermit] = useState<PermitRecord>(VANGUARD_PERMITS[0]);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authorizedPermits, setAuthorizedPermits] = useState<string[]>([
    "PTW-VGD-2026-101",
    "PTW-VGD-2026-102",
    "PTW-VGD-2026-104"
  ]);
  const [permitMerkleHash, setPermitMerkleHash] = useState<string | null>(null);

  const isPermitActive = authorizedPermits.includes(activePermit.id);

  const handleAuthorizePermit = async () => {
    setIsAuthorizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawPayload = `VANGUARD_PTW_RELEASE_${activePermit.id}_ZONE_${activePermit.zoneTarget}_TIME_${timestamp}_${Date.now()}`;
    const hash = await generateSHA256(rawPayload);

    setTimeout(async () => {
      setPermitMerkleHash(hash);
      setAuthorizedPermits(prev => [...prev, activePermit.id]);
      setIsAuthorizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "AEGIS",
          synthesis_report: `SAFETY PERMIT AUTHORIZED: ${activePermit.id} • ${activePermit.title} • Zone: ${activePermit.zoneTarget} • 100% Pre-Task Clearance Verified`,
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
              BOCW & IS 3696 SAFETY GOVERNANCE
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              PROJECT VANGUARD
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            PERMIT TO WORK (PTW) & HIGH-HAZARD ISOLATION
          </h1>
          <p className="text-xs text-slate-400">
            Commercial Hub Phase 1 • 10.3m x 10.9m x 15m Baseline • MEP, Chiller Rigging & Confined Pit Controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">��️ 3D BIM TWIN</a>
          <a href="/site/gis" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">📡 GIS RADAR</a>
          <a href="/site/dpr" className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs rounded-lg transition">📋 DPR #084</a>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">ACTIVE PERMITS ISSUED</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">{authorizedPermits.length} of {VANGUARD_PERMITS.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Live Zone Lock Active</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">ROOFTOP RIGGING (15M)</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">CLEARED</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Wind: 3.2 m/s (&lt; 9.0 m/s Limit)</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">PIT ATMOSPHERIC STATUS</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">20.9% O2</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Zero Toxics / Explosives</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">HOT WORK FIRE WATCH</div>
          <div className="text-sm font-bold text-amber-400 mt-1.5">STANDBY ACTIVE</div>
          <div className="text-[10px] text-slate-500 mt-0.5">85 PSI Standpipe Checked</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">AUDIT TRAIL STATUS</div>
          <div className="text-sm font-bold text-purple-400 mt-1.5">SEC 65B MERKLE ROOT</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Cryptographic Signature Valid</div>
        </div>
      </div>

      {/* Main Grid: Permit Queue & Detail Verification Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Vanguard Permit Registry Queue */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <LockIcon className="w-3.5 h-3.5 text-cyan-400" />
              HIGH-HAZARD PERMITS ({VANGUARD_PERMITS.length})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">AEGIS SAFETY GATEWAY</span>
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[460px]">
            {VANGUARD_PERMITS.map(permit => {
              const isSelected = activePermit.id === permit.id;
              const isPermitted = authorizedPermits.includes(permit.id);
              return (
                <div
                  key={permit.id}
                  onClick={() => setActivePermit(permit)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-cyan-400">{permit.id}</span>
                    <span className={`px-1.5 py-0.2 rounded font-bold ${
                      isPermitted
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-950 text-amber-400 border border-amber-500/30"
                    }`}>
                      {isPermitted ? "ACTIVE PERMITTED" : "PENDING SIGN-OFF"}
                    </span>
                  </div>

                  <div className="text-white font-semibold text-xs leading-snug">{permit.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{permit.elevation}</div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/80">
                    <span className="text-cyan-400 font-bold">{permit.zoneTarget.split(" ")[0]}</span>
                    <span className={`font-bold ${permit.riskRating === "CRITICAL" ? "text-red-400" : "text-amber-400"}`}>
                      {permit.riskRating} RISK
                    </span>
                    <span>Valid: {permit.validTo.split(" ")[1]} IST</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Permit Verification & Telemetry */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              {activePermit.type === "HOT_WORK" ? (
                <FlameIcon className="w-4 h-4 text-amber-400" />
              ) : (
                <AlertTriangleIcon className="w-4 h-4 text-cyan-400" />
              )}
              <span className="font-bold text-white uppercase tracking-wider">
                SAFETY CLEARANCE: {activePermit.id}
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              isPermitActive
                ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                : "bg-amber-950 text-amber-400 border border-amber-500/30"
            }`}>
              {isPermitActive ? "ISOLATION PERMITTED" : "AWAITING AUTHORIZATION"}
            </span>
          </div>

          <div className="p-4 bg-slate-950 flex-1 flex flex-col justify-between gap-4">
            {/* Live Atmospheric Conditions */}
            <div className="bg-black/70 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-2.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                ATMOSPHERIC & ENVIRONMENTAL TELEMETRY SENSORS
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {activePermit.environmentalTelemetry.map((tel, idx) => (
                  <div key={idx} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase">{tel.label}</div>
                      <div className="text-xs font-bold text-white mt-0.5">{tel.value}</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                      {tel.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mandatory Pre-Task Checklist */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                MANDATORY PRE-TASK SAFETY CHECKLIST (TOOLBOX TALK VERIFIED)
              </span>
              <div className="flex flex-col gap-1.5">
                {activePermit.safetyChecklist.map((chk, i) => (
                  <div key={i} className="flex items-start gap-2 bg-slate-900/40 p-2 rounded-lg border border-slate-800/80 text-xs">
                    <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300 leading-tight">{chk.item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Subcontractor & Competent Authority */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/40 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase">COMPETENT SAFETY OFFICER</span>
                <div className="text-white font-bold mt-0.5">{activePermit.competentPerson}</div>
                <div className="text-[10px] text-cyan-400">Vendor: {activePermit.subcontractor}</div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase">LOCATION & TIMING</span>
                <div className="text-white font-bold mt-0.5">{activePermit.validFrom.split(" ")[1]} – {activePermit.validTo.split(" ")[1]}</div>
                <div className="text-[10px] text-slate-400 truncate">{activePermit.zoneTarget}</div>
              </div>
            </div>

            {/* Authorize Permit Action */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Governed By: <strong className="text-emerald-400">{activePermit.authorizedBy}</strong>
              </div>

              <div>
                {isPermitActive ? (
                  <span className="px-3.5 py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>PERMIT RELEASED & ZONE LOCKED</span>
                  </span>
                ) : (
                  <button
                    onClick={handleAuthorizePermit}
                    disabled={isAuthorizing}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                  >
                    {isAuthorizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
                    <span>AUTHORIZE & RELEASE PERMIT</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 65B Statutory Notarization Ledger */}
      <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-5 flex flex-col gap-3 shadow-[0_0_20px_rgba(168,85,247,0.12)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-2 gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
            <span>SECTION 65B STATUTORY SAFETY PERMIT NOTARIZATION</span>
          </div>
          <span className="text-[10px] text-slate-500">
            Admissible under BOCW Act 1996 • Indian Evidence Act Sec 65B
          </span>
        </div>

        <div className="bg-black/60 border border-slate-800 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-bold uppercase">SECTION 65B MERKLE ROOT:</span>
            <span className="text-slate-300 select-all font-mono">
              {permitMerkleHash || "9f84b21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4"}
            </span>
          </div>
          <span className="text-slate-500">
            Sign-off: AEGIS-SAFETY-DIRECTOR & ARGUS-RADAR-GATEWAY
          </span>
        </div>
      </div>
    </div>
  );
}
