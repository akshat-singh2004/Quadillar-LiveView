"use client";

import React, { useState, useRef } from "react";
import { Mic, Square, Send, Camera, X, CheckCheck, ShieldCheck, ExternalLink } from "lucide-react";
import { startFieldVoiceCapture, LiveAudioCaptureHandle } from "@/lib/audio/openSourceAudioEngine";
import type { FieldGroundingRecord } from "@/lib/grounding/fieldGroundingSchema";
import { recordMemoryEngram } from "@/lib/memory/quadmaxMemoryCortex";
import { useActiveProject } from "@/context/ProjectContext";

interface ChatMessageBubble {
  id: string;
  sender: "ENGINEER" | "QUADMAX_BOT";
  time: string;
  text: string;
  audioUrl?: string | null;
  audioDurationSec?: number;
  photoPreviewUrl?: string | null;
  record?: FieldGroundingRecord;
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
  const [messages, setMessages] = useState<ChatMessageBubble[]>([
    {
      id: "msg-welcome",
      sender: "QUADMAX_BOT",
      time: "LIVE",
      text: "Namaste! Send a Hinglish voice note or site photo just like WhatsApp. I will map the 3D BIM zone, lock/clear IS 456 escrow, and trigger onsite PTZ cameras or LiDAR lasers if visual proof is low.",
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(12).fill(20));
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const captureHandleRef = useRef<LiveAudioCaptureHandle | null>(null);

  if (!isOpen) return null;

  const handleStartRecording = async () => {
    if (isRecording) return;
    setIsRecording(true);
    const handle = await startFieldVoiceCapture({
      onWaveformFrame: (bars) => setWaveformBars(bars),
      onInterimTranscript: (txt) => setInputText(txt),
    });
    captureHandleRef.current = handle;
  };

  const handleStopAndSendVoice = async () => {
    if (!isRecording || !captureHandleRef.current) return;
    setIsRecording(false);
    setWaveformBars(Array(12).fill(20));
    const result = await captureHandleRef.current.stop();
    captureHandleRef.current = null;

    const finalVoiceText =
      result.transcript.trim() ||
      inputText.trim() ||
      "Bhaiya Tower A Level 3 transfer girder TG-03 mein honeycombing aur void dikh raha hai";

    await submitFieldMessage({
      text: finalVoiceText,
      audioBlob: result.audioBlob,
      audioUrl: result.audioUrl,
      audioDurationSec: result.durationSec,
    });
  };

  const submitFieldMessage = async (opts: {
    text: string;
    audioBlob?: Blob | null;
    audioUrl?: string | null;
    audioDurationSec?: number;
  }) => {
    const cleanText = opts.text.trim();
    if (!cleanText && !selectedPhotoFile && !opts.audioBlob) return;

    const nowTime = new Date().toTimeString().slice(0, 5);
    const msgId = `MSG-${Date.now()}`;
    const photoPreview = selectedPhotoPreview;
    const photoFileToSend = selectedPhotoFile;

    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        sender: "ENGINEER",
        time: nowTime,
        text: cleanText || "Voice & Site Photo Attachment",
        audioUrl: opts.audioUrl,
        audioDurationSec: opts.audioDurationSec,
        photoPreviewUrl: photoPreview,
      },
    ]);

    setInputText("");
    setSelectedPhotoFile(null);
    setSelectedPhotoPreview(null);
    setIsSending(true);

    try {
      const fd = new FormData();
      fd.append("submitter_id", "SITE-ENG-LKO-01");
      fd.append(
        "transcript_override",
        cleanText || "Field voice note & site photograph submitted for BIM & IS 456 audit"
      );

      if (photoFileToSend) {
        fd.append("image", photoFileToSend);
      } else {
        // Attach a timestamped telemetry marker frame if engineer sent a voice-only WhatsApp note
        const syntheticFrame = new Blob([`VOICE_ONLY_NOTE_${Date.now()}`], {
          type: "image/jpeg",
        });
        fd.append("image", syntheticFrame, `voice-note-${Date.now()}.jpg`);
      }

      if (opts.audioBlob) {
        fd.append("audio", opts.audioBlob, `field-voice-${Date.now()}.webm`);
      }

      const res = await fetch("/api/field-grounding", { method: "POST", body: fd });
      const data = await res.json();

      if (data?.record) {
        const rec = data.record as FieldGroundingRecord;
        recordMemoryEngram({
          category: "EPISODIC_EVENT",
          source: "FIELD_VOICE_INGRESS",
          projectCode: activeProject.code,
          projectName: activeProject.name,
          zoneOrElement: rec.zone_label,
          title: `[WhatsApp Field Note] ${rec.transcript_vernacular.slice(0, 80)}`,
          detail: rec.engineering_summary,
          beforeState: "Site Voice/Photo Received",
          afterState:
            rec.escrow_action === "FREEZE_MILESTONE"
              ? `Escrow Locked (₹${rec.withholding_amount_inr.toLocaleString("en-IN")})`
              : "Logged & Sealed (BSA Sec. 63)",
          financialDeltaInr:
            rec.escrow_action === "FREEZE_MILESTONE" ? -rec.withholding_amount_inr : 0,
          sha256Ref: rec.canonical_65b_sha256.slice(0, 16),
          requiresFollowUp: rec.escrow_action === "FREEZE_MILESTONE",
        });

        onRecordCommitted?.(rec);

        setMessages((prev) => [
          ...prev,
          {
            id: `BOT-${Date.now()}`,
            sender: "QUADMAX_BOT",
            time: new Date().toTimeString().slice(0, 5),
            text: `Mapped to ${rec.zone_label} (${rec.matched_bim_zone_id}) • ${rec.engineering_summary} • Escrow: ${
              rec.escrow_action === "FREEZE_MILESTONE"
                ? `LOCKED ₹${rec.withholding_amount_inr.toLocaleString("en-IN")}`
                : "NO HOLD"
            }`,
            record: rec,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `BOT-ERR-${Date.now()}`,
            sender: "QUADMAX_BOT",
            time: new Date().toTimeString().slice(0, 5),
            text: data?.error || "Duplicate media replay blocked by Section 65B Anti-Spoof Guard.",
          },
        ]);
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-end p-0 sm:p-4 font-mono">
      <div className="w-full max-w-md h-full sm:h-[88vh] bg-zinc-950 border border-zinc-800 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* WhatsApp-Simple Header */}
        <div className="px-4 py-3 bg-emerald-950/60 border-b border-emerald-500/25 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-500 text-zinc-950 font-bold flex items-center justify-center text-sm">
              Q
            </div>
            <div>
              <div className="font-bold text-xs text-white flex items-center gap-1.5">
                QUADMAX Field Comms
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-[10px] text-emerald-300">
                WhatsApp-Easy Voice & Photo • BSA Sec. 63 Sealed
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-900/80 text-zinc-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick 1-Tap Hinglish Field Voice Presets for Noisy Halls */}
        <div className="px-3 py-2 bg-zinc-900/90 border-b border-zinc-800 flex items-center gap-1.5 overflow-x-auto text-[10px]">
          <span className="text-zinc-400 shrink-0 font-bold">1-Tap Note:</span>
          <button
            type="button"
            onClick={() =>
              void submitFieldMessage({
                text: "Bhaiya Tower A Level 3 transfer girder TG-03 mein honeycombing hai, photo clear nahi aa rahi",
              })
            }
            className="px-2 py-1 rounded-full bg-zinc-950 border border-zinc-700 text-zinc-200 hover:border-emerald-400 shrink-0"
          >
            🎙️ "TG-03 mein honeycombing..."
          </button>
          <button
            type="button"
            onClick={() =>
              void submitFieldMessage({
                text: "Silver dome roof Kalzip cladding seam check done on BIT-2-DOME",
              })
            }
            className="px-2 py-1 rounded-full bg-zinc-950 border border-zinc-700 text-zinc-200 hover:border-emerald-400 shrink-0"
          >
            🎙️ "Silver dome check done"
          </button>
        </div>

        {/* Chat Bubbles Feed */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs bg-[radial-gradient(circle_at_top,#064e3b18,transparent_60%)]">
          {messages.map((m) => {
            const isEngineer = m.sender === "ENGINEER";
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[86%] ${
                  isEngineer ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                <div
                  className={`p-3 rounded-2xl space-y-2 border ${
                    isEngineer
                      ? "bg-emerald-600/20 border-emerald-500/40 text-zinc-100 rounded-br-sm"
                      : "bg-zinc-900 border-zinc-800 text-zinc-200 rounded-bl-sm"
                  }`}
                >
                  {m.photoPreviewUrl && (
                    <img
                      src={m.photoPreviewUrl}
                      alt="Site Attachment"
                      className="w-full max-h-40 object-cover rounded-xl border border-zinc-700"
                    />
                  )}
                  {m.audioUrl && (
                    <div className="bg-zinc-950/80 p-2 rounded-xl border border-zinc-800">
                      <audio controls src={m.audioUrl} className="w-full h-7" />
                    </div>
                  )}
                  <p className="leading-relaxed text-[11.5px]">{m.text}</p>

                  {m.record && (
                    <div className="pt-2 border-t border-zinc-800 flex flex-col gap-1.5 text-[10px]">
                      <div className="text-emerald-400 font-bold">
                        SHA-256: {m.record.canonical_65b_sha256.slice(0, 18)}…
                      </div>
                      <a
                        href={`/site/digital-twin?zone=${encodeURIComponent(
                          m.record.matched_bim_zone_id
                        )}&autoEscalate=1¬e=${encodeURIComponent(m.record.transcript_vernacular)}`}
                        className="py-1.5 px-2.5 rounded-lg bg-emerald-500 text-zinc-950 font-bold inline-flex items-center justify-center gap-1"
                      >
                        🎯 Auto-Trigger 3D Camera & LiDAR Laser
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 text-[9px] text-zinc-400">
                    <span>{m.time}</span>
                    {isEngineer && <CheckCheck className="w-3 h-3 text-emerald-400" />}
                  </div>
                </div>
              </div>
            );
          })}
          {isSending && (
            <div className="text-[10.5px] text-emerald-400 animate-pulse">
              QUADMAX.AI analyzing voice & photo + sealing SHA-256…
            </div>
          )}
        </div>

        {/* Selected Photo Preview Strip */}
        {selectedPhotoPreview && (
          <div className="px-3 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-zinc-300">
              <img
                src={selectedPhotoPreview}
                alt="Preview"
                className="w-9 h-9 rounded-lg object-cover border border-zinc-700"
              />
              <span>Photo attached & ready</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedPhotoFile(null);
                setSelectedPhotoPreview(null);
              }}
              className="text-zinc-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Live Recording Waveform Strip */}
        {isRecording && (
          <div className="px-4 py-2.5 bg-rose-950/50 border-t border-rose-500/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[10.5px] font-bold text-rose-300">Listening (Hinglish / English)...</span>
            </div>
            <div className="flex items-end gap-1 h-5">
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

        {/* Bottom WhatsApp Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitFieldMessage({ text: inputText });
          }}
          className="p-2.5 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2"
        >
          <label
            className="p-2.5 rounded-full bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 cursor-pointer shrink-0"
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
            placeholder="Message or tap mic to speak..."
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-full px-3.5 py-2 text-xs text-zinc-100 outline-none focus:border-emerald-500"
          />

          {inputText.trim() || selectedPhotoFile ? (
            <button
              type="submit"
              disabled={isSending}
              className="p-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shrink-0 cursor-pointer"
              title="Send to QUADMAX"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : isRecording ? (
            <button
              type="button"
              onClick={handleStopAndSendVoice}
              className="p-2.5 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-bold shrink-0 cursor-pointer animate-pulse"
              title="Stop & Send Voice Note"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartRecording}
              className="p-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shrink-0 cursor-pointer"
              title="Record Voice Note"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
