"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  CloudRain,
  Wind,
  Thermometer,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  FileText,
  Clock,
  ExternalLink,
  Lock,
} from "lucide-react";
import type { MicroclimateTelemetryReading } from "@/types/construction";
import { logWeatherDelayHindrance } from "@/app/actions/weather-actions";

export interface MicroclimateGaugesProps {
  projectId?: string;
  initialReading?: MicroclimateTelemetryReading;
  linkedTaskId?: string;
  onHindranceLogged?: () => void;
}

const DEFAULT_READING: MicroclimateTelemetryReading = {
  id: "telemetry-active-node",
  projectId: "GOMTI-NAGAR-PH1-FITOUT",
  location: "Tower A / Level 14 External Deck",
  temperatureC: 32.4,
  windKmH: 41.5,
  rainfallMmHr: 6.2,
  humidityPercent: 84,
  capturedAt: new Date().toISOString(),
  status: "Full Stoppage",
  trigger: ["Wind >= 38 km/h (Crane Hold)", "Rain >= 5 mm/hr (Concrete/Paint Hold)"],
};

export function MicroclimateGauges({
  projectId = "GOMTI-NAGAR-PH1-FITOUT",
  initialReading = DEFAULT_READING,
  linkedTaskId,
  onHindranceLogged,
}: MicroclimateGaugesProps) {
  const [reading, setReading] = useState<MicroclimateTelemetryReading>(initialReading);
  const [isPending, startTransition] = useTransition();
  const [eotReceipt, setEotReceipt] = useState<{
    hindranceNumber: string;
    criticalPath: boolean;
    floatConsumed: number;
    slippageDays: number;
    clause: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Concrete & Safety Threshold Evaluation
  const weatherStatus = useMemo(() => {
    const isWindStoppage = reading.windKmH >= 38;
    const isRainStoppage = reading.rainfallMmHr >= 5.0;
    const isThermalWarning = reading.temperatureC >= 40 || reading.temperatureC <= 5;
    const isRestricted = reading.windKmH >= 28 || reading.rainfallMmHr >= 2.5;

    const triggers: string[] = [];
    if (isWindStoppage) triggers.push("Wind speed ≥ 38 km/h (IS 7293 Crane & Scaffolding Suspension)");
    if (isRainStoppage) triggers.push("Precipitation ≥ 5.0 mm/h (IS 456 Cl. 13.3 Pouring & External Coating Stop)");
    if (isThermalWarning) triggers.push("Thermal threshold breach (IS 7861 Hot/Cold Weather Protocol)");

    if (isWindStoppage || isRainStoppage) {
      return {
        level: "FULL_STOPPAGE",
        label: "Mandatory Stoppage In Force",
        badgeClass: "bg-rose-950/80 border-rose-800 text-rose-300",
        indicatorClass: "bg-rose-500 animate-ping",
        triggers,
      };
    }

    if (isRestricted || triggers.length > 0) {
      return {
        level: "RESTRICTED",
        label: "Restricted Operations Warning",
        badgeClass: "bg-amber-950/80 border-amber-800 text-amber-300",
        indicatorClass: "bg-amber-500 animate-pulse",
        triggers: triggers.length > 0 ? triggers : ["Marginal atmospheric conditions: proceed under watch"],
      };
    }

    return {
      level: "NOMINAL",
      label: "Nominal Operations Cleared",
      badgeClass: "bg-emerald-950/80 border-emerald-800 text-emerald-300",
      indicatorClass: "bg-emerald-500",
      triggers: ["All environmental telemetry within IS & OSHA working tolerances"],
    };
  }, [reading]);

  // Convert Telemetry Breach to Legal EOT Claim
  const handleConvertStoppageToClaim = () => {
    setErrorMessage(null);

    startTransition(async () => {
      const res = await logWeatherDelayHindrance({
        projectId: reading.projectId || projectId,
        affectedTaskId: linkedTaskId,
        location: reading.location,
        temperatureC: reading.temperatureC,
        windKmH: reading.windKmH,
        rainfallMmHr: reading.rainfallMmHr,
        humidityPercent: reading.humidityPercent,
        triggerDescriptions: weatherStatus.triggers,
        estimatedDelayDays: 1,
      });

      if (res.success && res.assessment) {
        setEotReceipt({
          hindranceNumber: res.assessment.hindranceNumber,
          criticalPath: res.assessment.criticalPathImpacted,
          floatConsumed: res.assessment.consumedFloatDays,
          slippageDays: res.assessment.projectCompletionSlippageDays,
          clause: res.assessment.suggestedClauseRef,
        });
        if (onHindranceLogged) onHindranceLogged();
      } else {
        setErrorMessage(res.error || "Failed to commit weather delay hindrance.");
      }
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 font-mono text-xs select-none relative space-y-4 p-5">
      {/* HEADER BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${weatherStatus.indicatorClass}`} />
            <span className="text-[10px] tracking-widest text-zinc-400 uppercase font-bold">
              MICROCLIMATE TELEMETRY ARRAY • SENSOR NODE #04
            </span>
          </div>
          <h2 className="text-base font-bold text-zinc-100 font-mono mt-0.5">
            {reading.location}
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Synchronized at: {new Date(reading.capturedAt).toLocaleTimeString()} • Station ID: {reading.id}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1.5 border text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 ${weatherStatus.badgeClass}`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{weatherStatus.label}</span>
          </span>
        </div>
      </div>

      {/* ERROR FEEDBACK */}
      {errorMessage && (
        <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-300 flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* NOTARIZED EOT RECEIPT */}
      {eotReceipt && (
        <div className="p-4 bg-amber-950/40 border border-amber-800/90 text-amber-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5 text-xs text-amber-300">
              <CheckCircle2 className="h-4 w-4 text-amber-400" />
              <span>DELAY NOTICE SERVED: {eotReceipt.hindranceNumber}</span>
            </span>
            <span className="text-[10px] bg-amber-950 border border-amber-700 px-2 py-0.5 font-bold">
              SECTION 65B NOTARIZED
            </span>
          </div>
          <div className="text-[11px] text-amber-300/90 space-y-0.5">
            <div>
              <strong>Contractual Authority:</strong> {eotReceipt.clause}
            </div>
            <div>
              <strong>CPM Impact:</strong> Consumed {eotReceipt.floatConsumed}d float • Critical Path Breached:{" "}
              {eotReceipt.criticalPath ? (
                <span className="text-rose-400 font-bold">YES ({eotReceipt.slippageDays}d Slippage)</span>
              ) : (
                <span className="text-emerald-400 font-bold">NO (Buffered within float)</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SENSOR GAUGES GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Wind Velocity */}
        <div
          className={`p-3.5 border bg-zinc-950/60 ${reading.windKmH >= 38
              ? "border-rose-800/80 bg-rose-950/20"
              : "border-zinc-800"
            }`}
        >
          <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase font-bold">
            <span>Wind Velocity</span>
            <Wind className={`h-3.5 w-3.5 ${reading.windKmH >= 38 ? "text-rose-400" : "text-zinc-500"}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span
              className={`text-2xl font-bold tabular-nums ${reading.windKmH >= 38 ? "text-rose-400" : "text-zinc-100"
                }`}
            >
              {reading.windKmH.toFixed(1)}
            </span>
            <span className="text-[10px] text-zinc-500">km/h</span>
          </div>
          {/* Progress Bar */}
          <div className="mt-2.5 h-1.5 w-full bg-zinc-800 overflow-hidden">
            <div
              style={{ width: `${Math.min(100, (reading.windKmH / 60) * 100)}%` }}
              className={`h-full ${reading.windKmH >= 38 ? "bg-rose-500" : "bg-sky-500"}`}
            />
          </div>
          <span className="block text-[9px] text-zinc-500 mt-1">Limit: 38 km/h (Crane Stop)</span>
        </div>

        {/* Rainfall Intensity */}
        <div
          className={`p-3.5 border bg-zinc-950/60 ${reading.rainfallMmHr >= 5.0
              ? "border-rose-800/80 bg-rose-950/20"
              : "border-zinc-800"
            }`}
        >
          <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase font-bold">
            <span>Precipitation Rate</span>
            <CloudRain className={`h-3.5 w-3.5 ${reading.rainfallMmHr >= 5.0 ? "text-rose-400" : "text-zinc-500"}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span
              className={`text-2xl font-bold tabular-nums ${reading.rainfallMmHr >= 5.0 ? "text-rose-400" : "text-zinc-100"
                }`}
            >
              {reading.rainfallMmHr.toFixed(1)}
            </span>
            <span className="text-[10px] text-zinc-500">mm/hr</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-zinc-800 overflow-hidden">
            <div
              style={{ width: `${Math.min(100, (reading.rainfallMmHr / 15) * 100)}%` }}
              className={`h-full ${reading.rainfallMmHr >= 5.0 ? "bg-rose-500" : "bg-sky-500"}`}
            />
          </div>
          <span className="block text-[9px] text-zinc-500 mt-1">Limit: 5 mm/hr (Concrete Stop)</span>
        </div>

        {/* Ambient Temperature */}
        <div
          className={`p-3.5 border bg-zinc-950/60 ${reading.temperatureC >= 40
              ? "border-amber-800/80 bg-amber-950/20"
              : "border-zinc-800"
            }`}
        >
          <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase font-bold">
            <span>Ambient Temp</span>
            <Thermometer className="h-3.5 w-3.5 text-zinc-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-zinc-100 tabular-nums">
              {reading.temperatureC.toFixed(1)}
            </span>
            <span className="text-[10px] text-zinc-500">°C</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-zinc-800 overflow-hidden">
            <div
              style={{ width: `${Math.min(100, (reading.temperatureC / 50) * 100)}%` }}
              className={`h-full ${reading.temperatureC >= 40 ? "bg-amber-500" : "bg-emerald-500"}`}
            />
          </div>
          <span className="block text-[9px] text-zinc-500 mt-1">IS 7861 Range: 5°C – 40°C</span>
        </div>

        {/* Relative Humidity */}
        <div className="p-3.5 border border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] uppercase font-bold">
            <span>Relative Humidity</span>
            <Droplets className="h-3.5 w-3.5 text-zinc-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-zinc-100 tabular-nums">
              {reading.humidityPercent.toFixed(0)}
            </span>
            <span className="text-[10px] text-zinc-500">%</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full bg-zinc-800 overflow-hidden">
            <div
              style={{ width: `${Math.min(100, reading.humidityPercent)}%` }}
              className="h-full bg-cyan-500"
            />
          </div>
          <span className="block text-[9px] text-zinc-500 mt-1">Slump Loss &amp; Curing Factor</span>
        </div>
      </div>

      {/* STATUTORY CODIFIED CRITERIA & ACTIONS */}
      <div className="border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-zinc-500" />
            <span>Active Environmental Interlocks &amp; Statutory Thresholds</span>
          </span>
          <span className="text-[10px] text-zinc-500 font-normal">
            FIDIC Cl. 8.4(c) • CPWD GCC Cl. 5.1
          </span>
        </div>

        <ul className="space-y-1.5 text-[11px] text-zinc-300">
          {weatherStatus.triggers.map((t, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>

        <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[10px] text-zinc-500">
            Clicking will notify Chronos, lock the delay in the Hindrance Register, and compute CPM slippage.
          </div>

          <button
            type="button"
            disabled={isPending || weatherStatus.level === "NOMINAL"}
            onClick={handleConvertStoppageToClaim}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${weatherStatus.level === "FULL_STOPPAGE"
                ? "bg-rose-600 hover:bg-rose-500 text-white"
                : "bg-amber-600 hover:bg-amber-500 text-zinc-950"
              }`}
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Submitting EOT Evidence...</span>
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5" />
                <span>Log Contemporaneous EOT Stoppage</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MicroclimateGauges;