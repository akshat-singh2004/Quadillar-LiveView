"use client";

import React, { useState, useRef } from "react";
import {
  Mic,
  Square,
  Send,
  Camera,
  X,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
  WifiOff,
  Box,
} from "lucide-react";
import { startFieldVoiceCapture, LiveAudioCaptureHandle } from "@/lib/audio/openSourceAudioEngine";
import type { FieldGroundingRecord } from "@/lib/grounding/fieldGroundingSchema";
import { recordMemoryEngram } from "@/lib/memory/quadmaxMemoryCortex";
import { useActiveProject } from "@/context/ProjectContext";

interface ReportEntry {
  id: string;
  sender: "ENGINEER" | "SYSTEM";
  time: string;
  text: string;
  audioUrl?: string | null;
  audioDurationSec?: number;
  photoPreviewUrl?: string | null;
  record?: FieldGroundingRecord;
  isError?: boolean;
}

interface WhatsAppFieldCommsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordCommitted?: (record: FieldGroundingRecord) => void;
}

export default function WhatsAppFieldCommsDrawer({
  isOpen,
  onClose,
  onRecordCommitted,
}: WhatsAppFieldCommsDrawerProps) {
  const { activeProject } = useActiveProject();
  const [entries, setEntries] = useState<ReportEntry[]>([
    {
      id: "entry-init",
      sender: "SYSTEM",
      time: "READY",
      text: "Speak, snap a photo, or type what you see on site. The system automatically maps the building zone, runs IS 456 checks, updates escrow holds, and seals legal proof.",
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(12).fill(20));
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const captureHandleRef = useRef<LiveAudioCaptureHandle | null>(null);

  if (!isOpen) return null;

  const handleStartRecording = async () => {
    if (isRecording) return;
    setNotice(null);
    setIsRecording(true);
    try {
      const handle = await startFieldVoiceCapture({
        onWaveformFrame: (bars) => setWaveformBars(bars),
        onInterimTranscript: (txt) => setInputText(txt),
      });
      captureHandleRef.current = handle;
    } catch {
      setIsRecording(false);
      setNotice("Microphone unavailable. Check browser permissions or type your report below.");
    }
  };

  const handleStopAndSendVoice = async () => {
    if (!isRecording || !captureHandleRef.current) return;
    setIsRecording(false);
    setWaveformBars(Array(12).fill(20));
    const result = await captureHandleRef.current.stop();
    captureHandleRef.current = null;

    const finalVoiceText = result.transcript.trim() || inputText.trim();
    if (!finalVoiceText && !result.audioBlob) {
      setNotice("No speech captured. Tap the microphone again or type your site observation.");
      return;
    }

    await submitFieldReport({
      text: finalVoiceText || "Voice recording captured on site",
      audioBlob: result.audioBlob,
      audioUrl: result.audioUrl,
      audioDurationSec: result.durationSec,
    });
  };

  const submitFieldReport = async (opts: {
    text: string;
    audioBlob?: Blob | null;
    audioUrl?: string | null;
    audioDurationSec?: number;
  }) => {
    const cleanText = opts.text.trim();
    if (!cleanText && !selectedPhotoFile && !opts.audioBlob) return;

    setNotice(null);
    const nowTime = new Date().toTimeString().slice(0, 5);
    const entryId = `RPT-${Date.now()}`;
    const photoPreview = selectedPhotoPreview;
    const photoFileToSend = selectedPhotoFile;

    setEntries((prev) => [
      ...prev,
      {
        id: entryId,
        sender: "ENGINEER",
        time: nowTime,
        text: cleanText || "Site Photo / Audio Report",
        audioUrl: opts.audioUrl,
        audioDurationSec: opts.audioDurationSec,
        photoPreviewUrl: photoPreview,
      },
    ]);

    setInputText("");
    setSelectedPhotoFile(null);
    setSelectedPhotoPreview(null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setEntries((prev) => [
        ...prev,
        {
          id: `SYS-OFFLINE-${Date.now()}`,
          sender: "SYSTEM",
          time: nowTime,
          text: "No internet connection detected. Reconnect to sync and seal this report to the project ledger.",
          isError: true,
        },
      ]);
      return;
    }

    setIsSending(true);

    try {
      const fd = new FormData();
      fd.append("project_id", activeProject.projectId);
      fd.append("submitter_id", "SITE-ENG-LKO-01");
      if (cleanText) {
        fd.append("transcript_override", cleanText);
      }

      if (photoFileToSend) {
        fd.append("image", photoFileToSend);
      }
      if (opts.audioBlob) {
        fd.append("audio", opts.audioBlob, `site-voice-${Date.now()}.webm`);
      }

      const res = await fetch("/api/field-grounding", { method: "POST", body: fd });
      const data = await res.json();

      if (res.ok && data?.record) {
        const rec = data.record as FieldGroundingRecord;
        recordMemoryEngram({
          category: "EPISODIC_EVENT",
          source: "FIELD_VOICE_INGRESS",
          projectCode: activeProject.code,
          projectName: activeProject.name,
          zoneOrElement: rec.zone_label,
          title: `Site Report: ${rec.transcript_vernacular.slice(0, 80)}`,
          detail: rec.engineering_summary,
          beforeState: "Field Report Submitted",
          afterState:
            rec.escrow_action === "FREEZE_MILESTONE"
              ? `Escrow Locked (INR ${rec.withholding_amount_inr.toLocaleString("en-IN")})`
              : "Logged and Sealed (BSA Sec. 63)",
          financialDeltaInr:
            rec.escrow_action === "FREEZE_MILESTONE" ? -rec.withholding_amount_inr : 0,
          sha256Ref: rec.canonical_65b_sha256.slice(0, 16),
          requiresFollowUp: rec.escrow_action === "FREEZE_MILESTONE",
        });

        onRecordCommitted?.(rec);

        setEntries((prev) => [
          ...prev,
          {
            id: `SYS-${Date.now()}`,
            sender: "SYSTEM",
            time: new Date().toTimeString().slice(0, 5),
            text: `${rec.engineering_summary}`,
            record: rec,
          },
        ]);
      } else {
        setEntries((prev) => [
          ...prev,
          {
            id: `SYS-ERR-${Date.now()}`,
            sender: "SYSTEM",
            time: new Date().toTimeString().slice(0, 5),
            text: data?.error || "Could not process report. Please attach a clear note, voice clip, or photo.",
            isError: true,
          },
        ]);
      }
    } catch {
      setEntries((prev) => [
        ...prev,
        {
          id: `SYS-NET-${Date.now()}`,
          sender: "SYSTEM",
          time: new Date().toTimeString().slice(0, 5),
          text: "Network error while syncing report to server. Please retry.",
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-end p-0 sm:p-4 font-sans">
      <div className="w-full max-w-md h-full sm:h-[88vh] bg-zinc-950 border border-zinc-800 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Clean Header */}
        <div className="px-4 py-3.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm text-white leading-tight">
                Report Site Issue
              </div>
              <div className="text-[11px] text-zinc-400 truncate max-w-[260px]">
                {activeProject.name}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {entries.map((m) => {
            const isEngineer = m.sender === "ENGINEER";
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[92%] ${
                  isEngineer ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                <div
                  className={`p-3 rounded-xl space-y-2 border ${
                    m.isError
                      ? "bg-rose-950/40 border-rose-500/40 text-rose-200"
                      : isEngineer
                      ? "bg-emerald-500/15 border-emerald-500/35 text-zinc-100"
                      : "bg-zinc-900 border-zinc-800 text-zinc-200"
                  }`}
                >
                  {m.photoPreviewUrl && (
                    <img
                      src={m.photoPreviewUrl}
                      alt="Site attachment"
                      className="w-full max-h-44 object-cover rounded-lg border border-zinc-700"
                    />
                  )}
                  {m.audioUrl && (
                    <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                      <audio controls src={m.audioUrl} className="w-full h-7" />
                    </div>
                  )}

                  {m.record ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-white">
                          {m.record.zone_label}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            m.record.escrow_action === "FREEZE_MILESTONE"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/35"
                          }`}
                        >
                          {m.record.escrow_action === "FREEZE_MILESTONE"
                            ? `HOLD: INR ${m.record.withholding_amount_inr.toLocaleString("en-IN")}`
                            : "LOGGED"}
                        </span>
                      </div>

                      <p className="leading-relaxed text-zinc-300">{m.text}</p>

                      <div className="pt-2 border-t border-zinc-800 space-y-1.5 text-[10.5px] font-mono">
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Zone: {m.record.matched_bim_zone_id}</span>
                          <span>{m.record.is_code_clause}</span>
                        </div>
                        <div className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>
                            {m.record.persisted_to_supabase
                              ? "Saved to Ledger"
                              : "Local Draft"}{" "}
                            | {m.record.canonical_65b_sha256.slice(0, 16)}
                          </span>
                        </div>
                        <a
                          href={`/site/digital-twin?zone=${encodeURIComponent(
                            m.record.matched_bim_zone_id
                          )}&autoEscalate=1¬e=${encodeURIComponent(
                            m.record.transcript_vernacular
                          )}`}
                          className="mt-1 py-2 px-3 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-sans font-semibold inline-flex items-center justify-center gap-1.5 w-full transition"
                        >
                          <Box className="w-3.5 h-3.5" />
                          <span>Inspect Zone in 3D Building</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="leading-relaxed">{m.text}</p>
                  )}

                  <div className="flex items-center justify-end text-[10px] text-zinc-500">
                    <span>{m.time}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="text-xs text-zinc-400 flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Verifying zone, running IS 456 rules, and sealing record...</span>
            </div>
          )}
        </div>

        {/* Inline Notice */}
        {notice && (
          <div className="px-4 py-2 bg-amber-950/40 border-t border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Selected Photo Preview */}
        {selectedPhotoPreview && (
          <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <img
                src={selectedPhotoPreview}
                alt="Preview"
                className="w-9 h-9 rounded-lg object-cover border border-zinc-700"
              />
              <span>Photo attached</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPhotoFile(null);
                setSelectedPhotoPreview(null);
              }}
              className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              aria-label="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Active Recording Indicator */}
        {isRecording && (
          <div className="px-4 py-2.5 bg-rose-950/40 border-t border-rose-500/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-medium text-rose-200">
                Recording site audio (Hindi / Hinglish / English)...
              </span>
            </div>
            <div className="flex items-end gap-1 h-4">
              {waveformBars.map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${Math.max(20, h)}%` }}
                  className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                />
              ))}
            </div>
          </div>
        )}

        {/* Simple Input Bar: Photo, Text, or Speak */}
        <div className="p-3 bg-zinc-900 border-t border-zinc-800 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitFieldReport({ text: inputText });
            }}
            className="flex items-center gap-2"
          >
            <label
              className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 cursor-pointer shrink-0"
              title="Attach site photo"
            >
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setSelectedPhotoFile(file);
                  setSelectedPhotoPreview(URL.createObjectURL(file));
                }}
              />
            </label>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe the issue or tap mic..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 outline-none focus:border-zinc-500"
            />

            {inputText.trim() || selectedPhotoFile ? (
              <button
                type="submit"
                disabled={isSending}
                className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold shrink-0 cursor-pointer disabled:opacity-50"
                title="Submit site report"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : isRecording ? (
              <button
                type="button"
                onClick={handleStopAndSendVoice}
                className="p-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-semibold shrink-0 cursor-pointer"
                title="Stop and submit recording"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartRecording}
                className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold shrink-0 cursor-pointer"
                title="Record voice note"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Subtle demo helper for loud pitch halls (not disguised as a site feature) */}
          <div className="flex items-center justify-between text-[10.5px] text-zinc-500 px-1">
            <span>Supports voice, camera photo, or text</span>
            <button
              type="button"
              onClick={() =>
                setInputText(
                  "Transfer Girder TG-03 Level 3 28-day M50 cube failed at 41.2 MPa with soffit honeycombing"
                )
              }
              className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2 cursor-pointer"
            >
              Load sample text
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
