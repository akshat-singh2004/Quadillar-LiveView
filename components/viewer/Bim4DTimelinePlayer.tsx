"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Activity,
} from "lucide-react";

import type { BimClashRecord, ProjectScheduleTask } from "@/types/construction";

export interface Bim4DTimelinePlayerProps {
  tasks?: ProjectScheduleTask[];
  clashes?: BimClashRecord[];
  initialDay?: number;
  totalDays?: number;
  startDate?: string;
  className?: string;
}

interface SchedulePhase {
  name: string;
  startDay: number;
  endDay: number;
  element: string;
}

const PHASES: SchedulePhase[] = [
  { name: "P1: Substructure & Raft", startDay: 0, endDay: 90, element: "Raft Foundation RF-01 to RF-03 (M35)" },
  { name: "P2: Ground Floor & Retaining", startDay: 91, endDay: 180, element: "Columns C01-C18 & Retaining Walls (M40)" },
  { name: "P3: Superstructure Slab L1-L3", startDay: 181, endDay: 280, element: "Slab L2 & Transfer Girder TG-01 (M30/M40)" },
  { name: "P4: Superstructure Slab L4-Roof", startDay: 281, endDay: 370, element: "Slab L4 & Shear Core SC-01 (M35)" },
  { name: "P5: MEP & Architectural Fitout", startDay: 371, endDay: 450, element: "HVAC Risers, Facade Glazing & ITP Signoff" },
];

export function Bim4DTimelinePlayer({
  initialDay = 228,
  totalDays = 450,
  startDate = "2026-04-01",
  className = "",
}: Bim4DTimelinePlayerProps) {
  const [currentDay, setCurrentDay] = useState<number>(initialDay);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Compute Current Simulation Date from startDate + currentDay
  const baseTime = new Date(startDate).getTime();
  const currentDate = new Date(baseTime + currentDay * 86400000)
    .toISOString()
    .slice(0, 10);

  // Current Active Phase Determination
  const activePhase =
    PHASES.find((p) => currentDay >= p.startDay && currentDay <= p.endDay) ||
    PHASES[PHASES.length - 1];

  // Planned vs. Actual Variance Simulation
  // Days 140-280 experience a -14 day hindrance delay due to heavy monsoon
  let varianceDays = 0;
  let varianceLabel = "On Track";
  let isDelayed = false;

  if (currentDay >= 120 && currentDay <= 270) {
    varianceDays = -14;
    varianceLabel = "-14 Days Delay";
    isDelayed = true;
  } else if (currentDay > 270 && currentDay <= 340) {
    varianceDays = -6;
    varianceLabel = "-6 Days Delay";
    isDelayed = true;
  } else if (currentDay > 340) {
    varianceDays = 0;
    varianceLabel = "On Track (Recovered)";
    isDelayed = false;
  } else {
    varianceDays = 2;
    varianceLabel = "+2 Days Float (On Track)";
    isDelayed = false;
  }

  // Playback Timer Loop
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentDay((prev) => {
          if (prev >= totalDays) {
            setIsPlaying(false);
            return totalDays;
          }
          return prev + 1;
        });
      }, 500 / playbackSpeed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, totalDays]);

  const handleStepForward = () => {
    setCurrentDay((prev) => Math.min(totalDays, prev + 5));
  };

  const handleStepBackward = () => {
    setCurrentDay((prev) => Math.max(0, prev - 5));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentDay(0);
  };

  return (
    <footer
      className={`absolute bottom-0 left-0 w-full bg-zinc-950/95 backdrop-blur border-t border-zinc-800 p-4 z-30 select-none ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        {/* ===================================================================
            TOP ROW: Telemetry Overlays (Simulation Date, Variance, Active Phase)
            =================================================================== */}
        <div className="grid grid-cols-12 gap-4 items-center border-b border-zinc-800/60 pb-3">
          {/* Left: Navisworks 4D TimeLiner Badge */}
          <div className="col-span-12 md:col-span-4 flex items-center gap-3">
            <div className="border border-zinc-800 bg-zinc-900 px-2.5 py-1 flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-300 font-semibold">
                4D TIMELINER ENGINE
              </span>
            </div>
            <span className="font-mono text-xs text-zinc-400 tabular-nums">
              DAY <span className="text-zinc-100 font-bold">{currentDay}</span> / {totalDays}
            </span>
          </div>

          {/* Center: Current Simulation Date */}
          <div className="col-span-12 md:col-span-4 flex items-center justify-start md:justify-center gap-2 font-mono">
            <Calendar className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-xs uppercase tracking-wider text-zinc-400">Simulation Date:</span>
            <span className="text-sm font-bold text-zinc-100 tabular-nums tracking-tight">
              {currentDate}
            </span>
          </div>

          {/* Right: Planned vs Actual Variance */}
          <div className="col-span-12 md:col-span-4 flex items-center justify-start md:justify-end gap-2 font-mono">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Planned vs. Actual:</span>
            <span
              className={`text-xs font-bold tabular-nums px-2 py-0.5 border ${
                isDelayed
                  ? "bg-rose-950/50 border-rose-800/70 text-rose-500"
                  : "bg-emerald-950/50 border-emerald-800/70 text-emerald-500"
              }`}
            >
              {varianceLabel}
            </span>
          </div>
        </div>

        {/* ===================================================================
            MIDDLE ROW: Timeline Scrubber (Dense Navisworks Style Grid)
            =================================================================== */}
        <div className="flex flex-col gap-1.5">
          {/* Phase Track Representation */}
          <div className="grid grid-cols-5 gap-1 text-[10px] font-mono uppercase text-zinc-500 mb-0.5">
            {PHASES.map((phase) => {
              const isCurrent = currentDay >= phase.startDay && currentDay <= phase.endDay;
              const isPast = currentDay > phase.endDay;

              return (
                <div
                  key={phase.name}
                  className={`truncate px-1.5 py-0.5 border text-left transition-colors ${
                    isCurrent
                      ? "border-emerald-500 bg-emerald-950/30 text-emerald-300 font-semibold"
                      : isPast
                      ? "border-zinc-800 bg-zinc-900/50 text-zinc-400"
                      : "border-zinc-900 bg-zinc-950 text-zinc-600"
                  }`}
                  title={`${phase.name} (${phase.element})`}
                >
                  {phase.name}
                </div>
              );
            })}
          </div>

          {/* Interactive Range Scrubber */}
          <div className="relative flex items-center py-1">
            <input
              type="range"
              min={0}
              max={totalDays}
              value={currentDay}
              onChange={(e) => setCurrentDay(Number(e.target.value))}
              aria-label="4D Timeline Scrubber"
              className="w-full h-2 bg-zinc-900 border border-zinc-800 appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all focus:outline-none"
            />
          </div>

          {/* Timeline Milestones Subhead */}
          <div className="flex justify-between items-center text-[10px] font-mono tabular-nums text-zinc-500">
            <span>START: 2026-04-01 (DAY 0)</span>
            <span className="text-zinc-400 truncate max-w-md hidden sm:inline">
              ACTIVE ELEMENT: <span className="text-zinc-200">{activePhase.element}</span>
            </span>
            <span>TOC TARGET: 2027-06-25 (DAY {totalDays})</span>
          </div>
        </div>

        {/* ===================================================================
            BOTTOM ROW: Controls (Play, Pause, Step, Speed Multipliers)
            =================================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-700 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5 text-amber-400" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleStepBackward}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <SkipBack className="h-3.5 w-3.5" />
              <span>-5d</span>
            </button>

            <button
              type="button"
              onClick={handleStepForward}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <SkipForward className="h-3.5 w-3.5" />
              <span>Step Forward</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
              title="Reset Timeline to Day 0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Speed Multiplier & Status Legend */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5">
              {[1, 2, 5, 10].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-0.5 font-mono text-[11px] cursor-pointer transition-colors ${
                    playbackSpeed === spd
                      ? "bg-zinc-700 text-zinc-100 font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-3 font-mono text-[10px] text-zinc-400 border-l border-zinc-800 pl-3">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-none bg-emerald-500" />
                Completed
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-none bg-amber-500" />
                In Progress
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-none bg-rose-500" />
                Critical Delay
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Bim4DTimelinePlayer;
