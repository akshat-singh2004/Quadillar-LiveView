"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Radio, Camera, Crosshair, ShieldAlert, CheckCircle2, Sparkles, X } from "lucide-react";
import type { AutonomousEscalationResult } from "@/app/api/agents/escalate-zone/route";
import type { RayModality } from "@/lib/spatial/multiRayFusionEngine";
import { recordMemoryEngram } from "@/lib/memory/quadmaxMemoryCortex";
import { useActiveProject } from "@/context/ProjectContext";

interface AutonomousEscalationHudProps {
  isOpen: boolean;
  onClose: () => void;
  activeZoneId: string;
  autoTriggerOnMount?: boolean;
  initialTranscript?: string;
  onHardwareTriggered: (params: {
    zoneId: string;
    worldPos: [number, number, number];
    modalities: RayModality[];
    result: AutonomousEscalationResult;
  }) => void;
}

export default function AutonomousEscalationHud({
  isOpen,
  onClose,
  activeZoneId,
  autoTriggerOnMount = false,
  initialTranscript,
  onHardwareTriggered,
}: AutonomousEscalationHudProps) {
  const { activeProject } = useActiveProject();
  const [selectedZone, setSelectedZone] = useState<string>(activeZoneId || "BIT-4-TG03");
  const [transcript, setTranscript] = useState<string>(
    initialTranscript ||
      "Bhaiya Tower A Level 3 transfer girder TG-03 mein honeycombing aur internal void lag raha hai, photo clear nahi hai"
  );
  const [hasPhoto, setHasPhoto] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<AutonomousEscalationResult | null>(null);
  const autoFiredRef = useRef<boolean>(false);

  useEffect(() => {
    if (activeZoneId) setSelectedZone(activeZoneId);
  }, [activeZoneId]);

  useEffect(() => {
    if (initialTranscript) setTranscript(initialTranscript);
  }, [initialTranscript]);

  const executeEscalation = useCallback(
    async (zoneToAudit: string, voiceText: string, photoAttached: boolean) => {
      setIsRunning(true);
      try {
        const res = await fetch("/api/agents/escalate-zone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bimZoneId: zoneToAudit,
            transcript: voiceText,
            hasPhoto: photoAttached,
            photoQualityHint: "LOW_LUX_SURFACE_ONLY",
          }),
        });
        const data = await res.json();
        if (data?.payload) {
          const p = data.payload as AutonomousEscalationResult;
          setResult(p);

          recordMemoryEngram({
            category: "EPISODIC_EVENT",
            source: "BIM_MILLIMETER_HEATMAP",
            projectCode: activeProject.code,
            projectName: activeProject.name,
            zoneOrElement: `${p.bimZoneId} (${p.zoneLabel})`,
            title: `Autonomous 3D BIM Hardware Escalation: PTZ Camera + 905nm LiDAR + 24GHz Radar`,
            detail: p.finalEngineeringVerdict,
            beforeState: `Initial Photo Confidence ${p.initialPhotoConfidencePct}% (Insufficient)`,
            afterState: `98.4% Multi-Ray Confirmed (${p.escrowAction})`,
            financialDeltaInr: p.escrowAction === "LOCK_ESCROW_HOLD" ? -p.withholdingInr : 0,
            sha256Ref: p.sha256Seal.slice(0, 16),
            requiresFollowUp: p.escrowAction === "LOCK_ESCROW_HOLD",
          });

          onHardwareTriggered({
            zoneId: p.bimZoneId,
            worldPos: p.worldPos,
            modalities: p.activatedRayModalities,
            result: p,
          });
        }
      } finally {
        setIsRunning(false);
      }
    },
    [activeProject.code, activeProject.name, onHardwareTriggered]
  );

  useEffect(() => {
    if (isOpen && autoTriggerOnMount && !autoFiredRef.current) {
      autoFiredRef.current = true;
      void executeEscalation(activeZoneId || "BIT-4-TG03", transcript, hasPhoto);
    }
  }, [isOpen, autoTriggerOnMount, activeZoneId, transcript, hasPhoto, executeEscalation]);

  if (!isOpen) return null;

  const handleTriggerAutonomousLoop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRunning) return;
    await executeEscalation(selectedZone, transcript, hasPhoto);
  };

  return (
    <div className="bg-zinc-950/95 border border-zinc-800 rounded-2xl p-4 mb-2 font-mono text-xs shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-bold text-white uppercase tracking-wider">
            AUTONOMOUS MULTI-AGENT FIELD → CAMERA / LIDAR LASER / RADAR ESCALATION
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <form onSubmit={handleTriggerAutonomousLoop} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
        <div className="lg:col-span-3">
          <label className="text-[9.5px] text-zinc-400 uppercase font-bold">TARGET 3D BIM ZONE</label>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2 text-zinc-100 font-bold outline-none"
          >
            <option value="BIT-4-TG03">BIT-4-TG03 (Transfer Girder M50)</option>
            <option value="BIT-2-DOME">BIT-2-DOME (Kalzip Silver Dome)</option>
            <option value="BIT-1-WEDGE">BIT-1-WEDGE (Tower A Shear Core)</option>
            <option value="BIT-4-PODIUM">BIT-4-PODIUM (Column C2 Grout)</option>
          </select>
        </div>

        <div className="lg:col-span-5">
          <label className="text-[9.5px] text-zinc-400 uppercase font-bold">
            FIELD AUDIO TRANSCRIPT (HINGLISH / SITE VOICE)
          </label>
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 outline-none"
          />
        </div>

        <div className="lg:col-span-2 flex items-center gap-2 pb-2">
          <input
            id="hasPhotoCheck"
            type="checkbox"
            checked={hasPhoto}
            onChange={(e) => setHasPhoto(e.target.checked)}
            className="accent-emerald-500 w-4 h-4"
          />
          <label htmlFor="hasPhotoCheck" className="text-[10px] text-zinc-300 font-bold cursor-pointer">
            Low-Lux Photo Attached
          </label>
        </div>

        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={isRunning}
            className="w-full py-2 px-3 rounded-xl bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isRunning ? "Escalating..." : "Run Agent Loop"}
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-3.5 pt-3 border-t border-zinc-800 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
              STAGE 1 OPTICAL SUFFICIENCY: {result.initialPhotoConfidencePct}% — {result.insufficiencyReason}
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 ${
                result.escrowAction === "LOCK_ESCROW_HOLD"
                  ? "bg-rose-500/15 border border-rose-500/40 text-rose-400"
                  : "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400"
              }`}
            >
              {result.escrowAction === "LOCK_ESCROW_HOLD" ? (
                <ShieldAlert className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {result.escrowAction} ({result.finalConfidencePct}% Multi-Ray Confidence)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {result.hardwareTriggers.map((t) => (
              <div
                key={t.stepOrder}
                className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between text-[9.5px]">
                  <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                    {t.stepOrder === 1 ? <Camera className="w-3 h-3" /> : <Crosshair className="w-3 h-3" />}
                    STEP {t.stepOrder}: {t.agentName}
                  </span>
                  <span className="text-zinc-400 font-bold">{t.status}</span>
                </div>
                <div className="font-bold text-white text-[10.5px]">{t.hardwareId}</div>
                <div className="text-[10px] text-zinc-400">{t.actionTaken}</div>
                <div className="text-[10px] text-zinc-200 font-semibold pt-1 border-t border-zinc-800/80">
                  {t.telemetryReading}
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-200">
            <strong className="text-emerald-400">3D BIM & Escrow Verdict:</strong> {result.finalEngineeringVerdict}
          </div>
        </div>
      )}
    </div>
  );
}
