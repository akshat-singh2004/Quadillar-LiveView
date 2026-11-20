"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic, Square, Upload, Camera, WifiOff, Wifi, MapPin,
  AlertTriangle, RefreshCw, X, CheckCircle2,
} from "lucide-react";
import { BIM_ZONE_REGISTRY } from "@/lib/grounding/bimZoneRegistry";
import { FieldGroundingRecord } from "@/lib/grounding/fieldGroundingSchema";
import {
  enqueueOfflineCapture,
  listOfflineCaptures,
  OfflineFieldCapture,
  removeOfflineCapture,
} from "@/lib/grounding/offlineFieldQueue";
import GovernanceCouncilTrace from "./GovernanceCouncilTrace";

export interface FieldGroundingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordCommitted: (record: FieldGroundingRecord) => void;
  onFocusBimZone?: (zoneId: string) => void;
}

export default function FieldGroundingDrawer({
  isOpen,
  onClose,
  onRecordCommitted,
  onFocusBimZone,
}: FieldGroundingDrawerProps) {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioName, setAudioName] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitterId, setSubmitterId] = useState<string>("PRIN-AKSHAT-LKO");
  const [manualZoneOverride, setManualZoneOverride] = useState<string>("");

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSec, setRecordingSec] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [simulateBasementOffline, setSimulateBasementOffline] = useState<boolean>(false);
  const [browserOnline, setBrowserOnline] = useState<boolean>(true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineFieldCapture[]>([]);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [activeRecord, setActiveRecord] = useState<FieldGroundingRecord | null>(null);
  const [pendingPinZone, setPendingPinZone] = useState<string>("BIT-4-TG03");
  const [isConfirmingPin, setIsConfirmingPin] = useState<boolean>(false);

  const effectiveOnline = browserOnline && !simulateBasementOffline;

  const refreshQueue = useCallback(async () => {
    const items = await listOfflineCaptures();
    setOfflineQueue(items);
  }, []);

  const submitFormPayload = useCallback(
    async (params: {
      audio: Blob | null;
      audioFilename: string;
      image: Blob | null;
      imageFilename: string;
      capturedAt: string;
      submitter: string;
      pinZone: string;
    }) => {
      const fd = new FormData();
      if (params.audio) fd.append("audio", params.audio, params.audioFilename || "field_note.webm");
      if (params.image) fd.append("image", params.image, params.imageFilename || "site_photo.jpg");
      fd.append("captured_at", params.capturedAt);
      fd.append("submitter_id", params.submitter);
      if (params.pinZone) fd.append("manual_pin_zone_id", params.pinZone);

      const res = await fetch("/api/field-grounding", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Field grounding failed");
      return data.record as FieldGroundingRecord;
    },
    []
  );

  const flushOfflineQueue = useCallback(async () => {
    if (!effectiveOnline || isSyncingQueue) return;
    const queued = await listOfflineCaptures();
    if (queued.length === 0) return;

    setIsSyncingQueue(true);
    setErrorBanner(null);
    try {
      for (const item of queued) {
        const rec = await submitFormPayload({
          audio: item.audioBlob,
          audioFilename: item.audioName,
          image: item.imageBlob,
          imageFilename: item.imageName,
          capturedAt: item.capturedAt,
          submitter: item.submitterId,
          pinZone: item.manualPinZoneId,
        });
        await removeOfflineCapture(item.queueId);
        setActiveRecord(rec);
        if (rec.status === "COMMITTED") onRecordCommitted(rec);
        else setPendingPinZone(rec.matched_bim_zone_id || "BIT-4-TG03");
      }
    } catch (err: any) {
      setErrorBanner(err?.message || "Offline sync interrupted");
    } finally {
      await refreshQueue();
      setIsSyncingQueue(false);
    }
  }, [effectiveOnline, isSyncingQueue, onRecordCommitted, refreshQueue, submitFormPayload]);

  useEffect(() => {
    setBrowserOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    refreshQueue();
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refreshQueue]);

  useEffect(() => {
    if (effectiveOnline && offlineQueue.length > 0) flushOfflineQueue();
  }, [effectiveOnline, offlineQueue.length, flushOfflineQueue]);

  const startRecording = async () => {
    setErrorBanner(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioName(`voice_log_${Date.now()}.${mimeType === "audio/webm" ? "webm" : "ogg"}`);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSec(0);
      timerRef.current = window.setInterval(() => setRecordingSec((s) => s + 1), 1000);
    } catch {
      setErrorBanner("Microphone access denied or unavailable — upload an audio file (.ogg/.webm/.mp3/.wav) below.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    if (!audioBlob && !imageFile) {
      setErrorBanner("Record a Hindi/Hinglish voice note or attach a site photograph first.");
      return;
    }
    const capturedAt = new Date().toISOString();

    if (!effectiveOnline) {
      await enqueueOfflineCapture({
        queueId: `OFFLINE-${Date.now()}`,
        capturedAt,
        submitterId,
        manualPinZoneId: manualZoneOverride,
        audioBlob,
        audioName: audioName || "basement_note.webm",
        imageBlob: imageFile,
        imageName: imageFile?.name || "basement_capture.jpg",
        previewLabel: [audioName, imageFile?.name].filter(Boolean).join(" + "),
      });
      setAudioBlob(null);
      setAudioName("");
      setImageFile(null);
      await refreshQueue();
      return;
    }

    setIsSubmitting(true);
    try {
      const rec = await submitFormPayload({
        audio: audioBlob,
        audioFilename: audioName || "voice_log.webm",
        image: imageFile,
        imageFilename: imageFile?.name || "site_photo.jpg",
        capturedAt,
        submitter: submitterId,
        pinZone: manualZoneOverride,
      });
      setActiveRecord(rec);
      setAudioBlob(null);
      setAudioName("");
      setImageFile(null);
      if (rec.status === "COMMITTED") onRecordCommitted(rec);
      else setPendingPinZone(rec.matched_bim_zone_id || "BIT-4-TG03");
    } catch (err: any) {
      setErrorBanner(err?.message || "Ingestion error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmEngineerPin = async () => {
    if (!activeRecord) return;
    setIsConfirmingPin(true);
    setErrorBanner(null);
    try {
      const res = await fetch("/api/field-grounding/confirm-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record: activeRecord, pinned_zone_id: pendingPinZone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to pin zone");
      const committed = data.record as FieldGroundingRecord;
      setActiveRecord(committed);
      onRecordCommitted(committed);
    } catch (err: any) {
      setErrorBanner(err?.message || "Zone confirmation failed");
    } finally {
      setIsConfirmingPin(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm font-mono">
      <div className="w-full max-w-xl bg-zinc-950 border-l border-zinc-800 h-full overflow-y-auto p-5 flex flex-col gap-4 text-zinc-100 shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-800 pb-3.5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              GEMINI 3.8 FLASH MULTIMODAL INGRESS • ZERO-THINKING LATENCY
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              Field Telemetry & Vernacular Voice Grounding
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={async () => {
                await Promise.all([
                  fetch("/api/field-grounding", { method: "DELETE" }),
                  fetch("/api/demo-reset", { method: "POST" }),
                ]);
                setActiveRecord(null);
                setErrorBanner(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold text-zinc-300 transition"
              title="Clear rehearsal hashes & reset NCR-2026-STR-042 lock"
            >
              Reset Stage
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 text-[11px]">
          <div className="flex items-center gap-2">
            {effectiveOnline ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Wifi className="w-3.5 h-3.5" /> SITE UPLINK ONLINE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <WifiOff className="w-3.5 h-3.5" /> BASEMENT OFFLINE (INDEXEDDB QUEUE)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSimulateBasementOffline((v) => !v)}
            className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition ${
              simulateBasementOffline
                ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {simulateBasementOffline ? "Exit Basement Simulation" : "Simulate Dead-Zone Basement"}
          </button>
        </div>

        {offlineQueue.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-amber-300">
                {offlineQueue.length} Field Capture(s) Queued in IndexedDB
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                Original capture timestamps locked • Auto-syncs on connectivity restore
              </div>
            </div>
            <button
              type="button"
              disabled={!effectiveOnline || isSyncingQueue}
              onClick={flushOfflineQueue}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-[10px] font-bold flex items-center gap-1.5 disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingQueue ? "animate-spin" : ""}`} />
              Sync Now
            </button>
          </div>
        )}

        <form onSubmit={handleIngest} className="flex flex-col gap-3.5">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                1. VERNACULAR VOICE NOTE (HINDI / HINGLISH)
              </span>
              {audioBlob && <span className="text-[10px] text-emerald-400 font-bold">✓ {audioName}</span>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="py-2.5 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                  <Mic className="w-3.5 h-3.5 text-rose-500" />
                  Record Voice Note
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="py-2.5 px-3 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 animate-pulse"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop ({recordingSec}s)
                </button>
              )}

              <label className="py-2.5 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 text-zinc-400" />
                Upload Audio
                <input
                  type="file"
                  accept="audio/ogg,audio/webm,audio/mp3,audio/mpeg,audio/wav"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setAudioBlob(f); setAudioName(f.name); }
                  }}
                />
              </label>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                2. JOBSITE PHOTOGRAPH (JPEG / PNG)
              </span>
              {imageFile && (
                <span className="text-[10px] text-emerald-400 font-bold truncate max-w-[200px]">
                  ✓ {imageFile.name}
                </span>
              )}
            </div>

            <label className="py-3 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-dashed border-zinc-700 text-zinc-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition">
              <Camera className="w-4 h-4 text-zinc-400" />
              {imageFile ? "Replace Site Photo" : "Capture / Attach Structural Photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold">SUPERVISOR / ENGINEER ID</label>
              <input
                type="text"
                value={submitterId}
                onChange={(e) => setSubmitterId(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-zinc-600"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-400 uppercase font-bold">BIM ZONE (AUTO-DETECT OR PIN)</label>
              <select
                value={manualZoneOverride}
                onChange={(e) => setManualZoneOverride(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2 text-zinc-100 text-xs focus:outline-none focus:border-zinc-600"
              >
                <option value="">Auto-Match via Gemini 3.8 Flash</option>
                {BIM_ZONE_REGISTRY.map((z) => (
                  <option key={z.zoneId} value={z.zoneId}>
                    {z.zoneId} — {z.bitId}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errorBanner && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorBanner}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs tracking-wide transition disabled:opacity-50"
          >
            {isSubmitting
              ? "GROUNDING MULTIMODAL TELEMETRY VIA GEMINI 3.8 FLASH..."
              : effectiveOnline
              ? "INGEST & GROUND TO 3D BIM + ESCROW LEDGER"
              : "SAVE TO OFFLINE BASEMENT QUEUE (INDEXEDDB)"}
          </button>
        </form>

        {activeRecord && (
          <div className="flex flex-col gap-3 border-t border-zinc-800 pt-4">
            {activeRecord.status === "NEEDS_ENGINEER_PIN" ? (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex flex-col gap-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    NEEDS ENGINEER PIN (CONFIDENCE {(activeRecord.confidence_score * 100).toFixed(0)}%)
                  </span>
                  <span className="text-[10px] text-amber-200/80">SAFEGUARD ACTIVE</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Spatial location in field log was ambiguous. Confirm the exact 3D BIM member below before mutating BIM state or freezing milestone escrow:
                </p>
                <div className="flex gap-2">
                  <select
                    value={pendingPinZone}
                    onChange={(e) => setPendingPinZone(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs text-zinc-100"
                  >
                    {BIM_ZONE_REGISTRY.map((z) => (
                      <option key={z.zoneId} value={z.zoneId}>
                        {z.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={isConfirmingPin}
                    onClick={handleConfirmEngineerPin}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shrink-0"
                  >
                    {isConfirmingPin ? "Pinning..." : "Confirm Pin"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  COMMITTED • {activeRecord.zone_label}
                </span>
                {onFocusBimZone && (
                  <button
                    type="button"
                    onClick={() => {
                      onFocusBimZone(activeRecord.matched_bim_zone_id);
                      onClose();
                    }}
                    className="text-[10px] font-bold text-zinc-100 underline"
                  >
                    Focus 3D BIM →
                  </button>
                )}
              </div>
            )}

            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-3.5 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>PROVENANCE: {activeRecord.provenance_label}</span>
                <span>CONFIDENCE: {(activeRecord.confidence_score * 100).toFixed(0)}%</span>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase font-bold">VERBATIM HINGLISH TRANSCRIPT</div>
                <p className="text-zinc-200 italic mt-0.5">“{activeRecord.transcript_vernacular}”</p>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase font-bold">STRUCTURAL ENGINEERING LOG</div>
                <p className="text-zinc-300 mt-0.5 leading-relaxed">{activeRecord.engineering_summary}</p>
              </div>
            </div>

            <GovernanceCouncilTrace record={activeRecord} />
          </div>
        )}
      </div>
    </div>
  );
}
