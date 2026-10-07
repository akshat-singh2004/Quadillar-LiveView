"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Boxes,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Layers,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Database,
  RefreshCw,
  Eye,
} from "lucide-react";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

interface PhaseSim {
  id: string;
  name: string;
  plannedStart: string;
  plannedEnd: string;
  progressPct: number;
  status: "COMPLETE" | "IN_PROGRESS" | "QUEUED";
  clashesCount: number;
}

const SIM_PHASES: PhaseSim[] = [
  { id: "p1", name: "Deep Excavation & Diaphragm Wall Capping", plannedStart: "2026-01-10", plannedEnd: "2026-03-15", progressPct: 100, status: "COMPLETE", clashesCount: 0 },
  { id: "p2", name: "Foundation Raft & Core Plinth Casting", plannedStart: "2026-03-16", plannedEnd: "2026-05-30", progressPct: 100, status: "COMPLETE", clashesCount: 0 },
  { id: "p3", name: "Basement B1-B3 Substructure & Post-Tensioned Slabs", plannedStart: "2026-06-01", plannedEnd: "2026-08-15", progressPct: 100, status: "COMPLETE", clashesCount: 0 },
  { id: "p4", name: "Superstructure Tower Core Slipform (L1 - L16)", plannedStart: "2026-08-16", plannedEnd: "2026-11-30", progressPct: 62, status: "IN_PROGRESS", clashesCount: 1 },
  { id: "p5", name: "Facade Unitized Curtain Wall & Glazing Envelope", plannedStart: "2026-10-15", plannedEnd: "2027-02-28", progressPct: 0, status: "QUEUED", clashesCount: 2 },
  { id: "p6", name: "Internal Turnkey Fit-Outs & MEP Commissioning", plannedStart: "2027-01-01", plannedEnd: "2027-05-30", progressPct: 0, status: "QUEUED", clashesCount: 0 },
];

export default function FourDSimulatorPage() {
  const { project } = useActiveRole();
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(38);
  const [activePhaseIndex, setActivePhaseIndex] = useState(3);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentWeek((prev) => {
          if (prev >= 52) {
            setIsPlaying(false);
            return 52;
          }
          return prev + 1;
        });
      }, 700);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>ENGINEERING INTELLIGENCE • 4D BIM SPATIAL-TEMPORAL DIGITAL TWIN</span>
              <StatutoryInfo
                standardRef="ISO 19650-2 / PAS 1192 4D BIM"
                title="4D BIM Construction Sequencing & Timeline Simulator"
                idealRange="Sequencing Variance: 0 Days"
                description="Simulates planned baseline sequencing (Primavera P6 / CPM) against field as-built telemetry. Detects spatial-temporal erection clashes prior to crane lift mobilization."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Boxes className="w-6 h-6 text-cyan-400" />
              <span>4D BIM Construction Sequencing Simulator</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Visual timeline progression, 3D element scheduling interlocks, and critical path variance detection.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? "Pause Simulation" : "Run 4D Simulation"}</span>
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentWeek(1);
              }}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 4 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Simulated Timeline Horizon</span>
            <div className="text-2xl font-bold text-white mt-1">Week {currentWeek} of 52</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">FY 2026-27 Construction Cycle</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Overall Sequencing Progress</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">68.4%</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">+2.1% Ahead of CPM baseline</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Spatial Clashes Identified</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">3 Active Clashes</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Resolved before field shuttering</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Critical Path Status</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">Zero Float Breach</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Tower Core casting on critical track</span>
          </div>
        </div>

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          
          {/* SIMULATION PHASES (7 cols) */}
          <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase">4D Work Breakdown Phases</span>
              <span className="text-zinc-500 text-[10px]">WBS Level 3 CPM Sequencing</span>
            </div>

            <div className="space-y-3">
              {SIM_PHASES.map((p, idx) => {
                const isActive = activePhaseIndex === idx;
                return (
                  <div
                    key={p.id}
                    onClick={() => setActivePhaseIndex(idx)}
                    className={`p-4 rounded border transition cursor-pointer space-y-2.5 ${
                      isActive ? "border-cyan-500/60 bg-cyan-950/20" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-xs">{p.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        p.status === "COMPLETE"
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                          : p.status === "IN_PROGRESS"
                          ? "bg-cyan-950 text-cyan-400 border-cyan-800 animate-pulse"
                          : "bg-zinc-900 text-zinc-500 border-zinc-800"
                      }`}>
                        {p.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-cyan-400 h-full rounded-full transition-all" style={{ width: `${p.progressPct}%` }} />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>Schedule: <strong className="text-zinc-300">{p.plannedStart} &rarr; {p.plannedEnd}</strong></span>
                      <span>Progress: <strong className="text-cyan-400">{p.progressPct}%</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: DIGITAL TWIN SIMULATION CONSOLE (5 cols) */}
          <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 p-6 space-y-5 rounded-sm shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase text-cyan-400 font-bold">Spatial Simulation Telemetry</span>
                <h3 className="text-sm font-bold text-white mt-0.5">{SIM_PHASES[activePhaseIndex].name}</h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Start Horizon:</span>
                  <strong className="text-zinc-200">{SIM_PHASES[activePhaseIndex].plannedStart}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Completion Milestone:</span>
                  <strong className="text-zinc-200">{SIM_PHASES[activePhaseIndex].plannedEnd}</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-zinc-850">
                  <span className="text-zinc-500">Element Progress:</span>
                  <strong className="text-cyan-400 font-bold">{SIM_PHASES[activePhaseIndex].progressPct}% Cast</strong>
                </div>
              </div>

              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-2 text-xs">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">4D Clash Interlocks:</span>
                {SIM_PHASES[activePhaseIndex].clashesCount > 0 ? (
                  <div className="p-3 bg-amber-950/40 border border-amber-800 rounded text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{SIM_PHASES[activePhaseIndex].clashesCount} spatial clash(es) detected with MEP layout.</span>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Zero geometric or scheduling clashes in this phase.</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-800">
                <Link
                  href="/engineering/clashes"
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold uppercase rounded flex items-center justify-center gap-2 transition"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Inspect BIM Clash Matrix</span>
                </Link>
              </div>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
