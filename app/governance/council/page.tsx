import React from "react";
import { fetchCouncilAggregatedPulse } from "@/app/actions/council-actions";
import { Generate65BCertificateModal } from "@/components/governance/Generate65BCertificateModal";
import { TriggerSynapseDaemonButton } from "@/components/governance/TriggerSynapseDaemonButton";
import { createClient } from "@/lib/supabase/server";
import {
  ShieldCheck,
  ShieldAlert,
  Radio,
  Cpu,
  Layers,
  Flame,
  Scale,
  DollarSign,
  Box,
  Wrench,
  Clock,
  Thermometer,
  Users,
  CheckCircle2,
  Lock,
} from "lucide-react";

export default async function CouncilWarRoomPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  const pulse = await fetchCouncilAggregatedPulse(projectId);

  // List of all 10 Executive Governors & their status
  const governors = [
    { name: "Aegis", title: "Structural Quality Governor", standard: "IS 456 / IS 14687", metric: `${pulse.openNcrsCount} Open NCRs`, status: pulse.openNcrsCount > 0 ? "HOLD" : "NOMINAL" },
    { name: "Argus", title: "HSE & Environmental Governor", standard: "BOCW 1998 / IS 3696", metric: pulse.gasRevokedPermits > 0 ? `${pulse.gasRevokedPermits} Gas Alerts` : "Wind Safe (≤38km/h)", status: pulse.gasRevokedPermits > 0 ? "HOLD" : "NOMINAL" },
    { name: "Midas", title: "Commercial Waterfall Governor", standard: "CPWD Works / FIDIC Cl. 14", metric: `₹${(pulse.totalGrossCertifiedInr / 100000).toFixed(1)}L Gross`, status: "NOMINAL" },
    { name: "Vulcan", title: "Materials & Metallurgy Governor", standard: "CPWD Cl. 42 / IS 2502", metric: `₹${(pulse.penalDebitsInr / 1000).toFixed(0)}k Penal Debit`, status: pulse.penalDebitsInr > 0 ? "HOLD" : "NOMINAL" },
    { name: "Daedalus", title: "Thermodynamics & Maturity Governor", standard: "ASTM C1074 / CIRIA C766", metric: pulse.thermalCrackHolds > 0 ? `${pulse.thermalCrackHolds} ΔT Breaches` : "Maturity Safe", status: pulse.thermalCrackHolds > 0 ? "HOLD" : "NOMINAL" },
    { name: "Plutus", title: "Labor & Welfare Governor", standard: "BOCW 1996 / Min Wages 1948", metric: pulse.ghostWorkersCount > 0 ? `${pulse.ghostWorkersCount} Ghost Workers` : "100% Ingress Match", status: pulse.ghostWorkersCount > 0 ? "HOLD" : "NOMINAL" },
    { name: "Ananke", title: "Fleet & Heavy Plant Governor", standard: "ISO 22400 / CPWD Form 31", metric: pulse.groundedFleetCount > 0 ? `${pulse.groundedFleetCount} Grounded` : "Fleet Online", status: pulse.groundedFleetCount > 0 ? "HOLD" : "NOMINAL" },
    { name: "Chronos", title: "Schedule & 4D Progress Governor", standard: "CPM Network / SCL Protocol", metric: pulse.openDelayDays > 0 ? `+${pulse.openDelayDays}d Delay` : "Schedule on Track", status: pulse.openDelayDays > 0 ? "HOLD" : "NOMINAL" },
    { name: "Themis", title: "Contract Claims & LD Governor", standard: "FIDIC Cl. 8.4 / CPWD Cl. 2", metric: "28d Notice Tracked", status: "NOMINAL" },
    { name: "Minerva", title: "Spatial BIM & Clashes Governor", standard: "ISO 19650-2 / PAS 1192", metric: pulse.activeHardClashes > 0 ? `${pulse.activeHardClashes} Hard Clashes` : "Zero Clashes", status: pulse.activeHardClashes > 0 ? "HOLD" : "NOMINAL" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>CENTRAL GOVERNANCE APEX • FULL COUNCIL SYNAPSE • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Executive Council War Room &amp; Hermes Section 65B Notary
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Unified orchestration across all 10 Statutory Governors with court-admissible electronic evidence affidavits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TriggerSynapseDaemonButton projectId={projectId} />
          <Generate65BCertificateModal projectId={projectId} />
        </div>
      </header>

      {/* 4 STRATEGIC COUNCIL KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Council Health Status</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">10/10 Governors Live</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Autonomous interlocks online</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Active Council Hold-Gates</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${pulse.totalActiveHolds > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {pulse.totalActiveHolds} Active Holds
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {pulse.totalActiveHolds > 0 ? "Quality, safety, or BIM locks" : "Site cleared for execution"}
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Withheld Liens</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
            ₹{((pulse.totalQualityLienInr + pulse.penalDebitsInr + pulse.ghostContraChargeInr) / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Quality liens &amp; penal debits</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Legal Evidence Standard</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">Section 65B Certified</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">SHA-256 Merkle chain integrity</span>
        </div>
      </div>

      {/* 10 EXECUTIVE GOVERNORS RADAR GRID */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-white uppercase">
            Executive Governors Telemetry Matrix (10 Agents)
          </span>
          <span className="text-[10px] text-zinc-500">FIDIC / CPWD / IS / BOCW Real-Time Compliance</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {governors.map((gov) => {
            const isHold = gov.status === "HOLD";
            return (
              <div
                key={gov.name}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
                  isHold ? "bg-rose-950/30 border-rose-800/80" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-white text-xs font-mono">{gov.name}</strong>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                      isHold ? "bg-rose-950 border border-rose-800 text-rose-300" : "bg-emerald-950 border border-emerald-800 text-emerald-300"
                    }`}>
                      {gov.status}
                    </span>
                  </div>
                  <span className="text-[9px] text-zinc-400 block font-sans truncate">{gov.title}</span>
                  <span className="text-[8px] text-zinc-500 block font-mono">{gov.standard}</span>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-800/80 flex justify-between items-center">
                  <span className={`text-[10px] font-mono font-bold ${isHold ? "text-rose-400" : "text-emerald-400"}`}>
                    {gov.metric}
                  </span>
                  {isHold ? (
                    <Lock className="w-3 h-3 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DUAL PANELS: LIVE SYNAPSE A2A STREAM & RECENT 65B AFFIDAVITS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: COUNCIL SYNAPSE REAL-TIME INTER-AGENT BUS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-white uppercase text-xs">
                Council Synapse: Autonomous Inter-Agent Stream
              </span>
            </div>
            <span className="text-[10px] text-cyan-400">Reactive Coordination</span>
          </div>

          <div className="divide-y divide-zinc-800 max-h-[420px] overflow-y-auto">
            {pulse.synapseEvents.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-sans">
                Zero reactive inter-agent events logged. Synapse directives fire autonomously when project boundaries trip.
              </div>
            ) : (
              pulse.synapseEvents.map((evt: any) => (
                <div key={evt.id} className="p-3.5 space-y-1 hover:bg-zinc-850/50 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-cyan-400">
                      {evt.source_agent} &rarr; {evt.target_agent}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono">
                      {new Date(evt.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-sans">
                    {evt.action_taken}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PANEL 2: RECENT SECTION 65B EVIDENCE CERTIFICATES */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-white uppercase text-xs">
                Hermes Section 65B Certified Ledger
              </span>
            </div>
            <span className="text-[10px] text-emerald-400">Tribunal Admissible</span>
          </div>

          <div className="p-5 space-y-4">
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5 text-[11px] font-sans">
              <strong className="text-white block font-mono text-xs">
                Statutory Evidence Act Admissibility Chain:
              </strong>
              <p className="text-zinc-400 leading-relaxed">
                All Governor decisions—from concrete cube failure liens to EOT claims approvals—are anchored into Hermes via SHA-256 Merkle hashes. Click <strong>&quot;+ Generate Section 65B Certificate&quot;</strong> to produce certified legal affidavits for arbitral hearings or court disputes.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                <span className="text-zinc-500 block uppercase">Hashing Standard</span>
                <strong className="text-white">SHA-256 Merkle Tree</strong>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                <span className="text-zinc-500 block uppercase">Statutory Jurisdiction</span>
                <strong className="text-emerald-400">Indian Evidence Act Sec. 65B</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
