"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Camera, ShieldAlert, CheckCircle2, Radio, X, Sparkles, Upload } from "lucide-react";
import type { VisionSpoofVerdict } from "@/app/api/vision-spoof-check/route";

interface LiveWebcamSpoofScannerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  onAuditCommit?: (verdict: VisionSpoofVerdict) => void;
}

export default function LiveWebcamSpoofScanner({
  isOpen,
  onClose,
  projectId,
  projectName,
  onAuditCommit,
}: LiveWebcamSpoofScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [claimedElement, setClaimedElement] = useState(
    "Tower A / BIT-4 – Level 3 Transfer Girder TG-03 (M50 Concrete)"
  );
  const [isScanning, setIsScanning] = useState(false);
  const [verdict, setVerdict] = useState<VisionSpoofVerdict | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let active = true;
    async function initCam() {
      setCameraError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError("Webcam API unavailable — use Upload / Synthetic Spoof Frame below.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch {
        setCameraError("Camera permission blocked — upload a photo or run Synthetic Cardboard Spoof test.");
      }
    }

    void initCam();
    return () => {
      active = false;
      stopCamera();
    };
  }, [isOpen, stopCamera]);

  const runForensicScan = async (imageBase64: string) => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/vision-spoof-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          claimedElement,
          bimZoneId: "BIT-4-TG03",
          projectId,
        }),
      });
      const data = await res.json();
      if (data?.payload) {
        setVerdict(data.payload);
        onAuditCommit?.(data.payload);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleCaptureLiveFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    await runForensicScan(dataUrl);
  };

  const handleSyntheticCardboardTest = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 480;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#b5895a";
    ctx.fillRect(0, 0, 480, 320);
    ctx.strokeStyle = "#7c5832";
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, 444, 284);
    ctx.fillStyle = "#3f2a14";
    ctx.font = "bold 20px monospace";
    ctx.fillText("CORRUGATED CARDBOARD EDGE SPOOF", 48, 150);
    ctx.font = "14px monospace";
    ctx.fillText("CLAIMED AS: M50 CONCRETE GIRDER TG-03", 68, 185);
    await runForensicScan(canvas.toDataURL("image/jpeg", 0.85));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        void runForensicScan(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs text-white uppercase tracking-wider">
              GEMINI 3.8 FLASH • LIVE ANTI-SPOOF & MULTI-RAY FORENSICS
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-bold">
              CONTRACTOR CLAIMED STRUCTURAL ELEMENT ({projectName})
            </label>
            <input
              type="text"
              value={claimedElement}
              onChange={(e) => setClaimedElement(e.target.value)}
              className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 font-bold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            {/* Live Camera Viewport */}
            <div className="md:col-span-6 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="relative aspect-video bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraReady ? "block" : "hidden"}`}
                />
                {!cameraReady && (
                  <div className="p-4 text-center text-[11px] text-zinc-400">
                    {cameraError || "Initializing live optical feed..."}
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="p-3 flex flex-col gap-2 bg-zinc-950 border-t border-zinc-800">
                <button
                  type="button"
                  disabled={isScanning || !cameraReady}
                  onClick={handleCaptureLiveFrame}
                  className="w-full py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 font-bold flex items-center justify-center gap-2 transition"
                >
                  <Sparkles className="w-4 h-4" />
                  {isScanning ? "Analyzing Frame via Gemini 3.8..." : "Snap Live Webcam Frame & Audit"}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isScanning}
                    onClick={handleSyntheticCardboardTest}
                    className="py-2 px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold text-[10px]"
                  >
                    Test Cardboard Spoof
                  </button>
                  <label className="py-2 px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer">
                    <Upload className="w-3 h-3" />
                    Upload Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
            </div>

            {/* Forensic Output HUD */}
            <div className="md:col-span-6 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 min-h-[260px] justify-between">
              {!verdict ? (
                <div className="my-auto text-center space-y-2 text-zinc-400">
                  <Radio className="w-7 h-7 mx-auto text-emerald-400 animate-pulse" />
                  <div className="font-bold text-zinc-200">
                    Hold any object or cardboard folder to the camera
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Gemini 3.8 Flash cross-examines surface cementitious texture against claimed M50 concrete and triggers 24 GHz mmWave / LWIR Thermal IR verification if spoofing is suspected.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg font-bold text-[10px] inline-flex items-center gap-1.5 ${
                          verdict.verdict === "AUTHENTIC_STRUCTURAL"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
                            : "bg-rose-500/15 text-rose-400 border border-rose-500/40"
                        }`}
                      >
                        {verdict.verdict === "AUTHENTIC_STRUCTURAL" ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5" />
                        )}
                        {verdict.verdict.replace(/_/g, " ")} ({verdict.confidencePct}%)
                      </span>
                      <span className="text-[10px] text-zinc-400 font-bold">
                        Est. εr = {verdict.estimatedDielectricEr}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <div className="text-[9px] text-zinc-400 uppercase font-bold">
                        DETECTED SURFACE MATERIAL
                      </div>
                      <div className="font-bold text-white mt-0.5">{verdict.materialDetected}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[9px] text-zinc-400 uppercase font-bold">
                        FORENSIC INDICATORS
                      </div>
                      {verdict.surfaceAnomalies.map((item, idx) => (
                        <div key={idx} className="text-[11px] text-zinc-300">
                          • {item}
                        </div>
                      ))}
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/35 text-[10.5px] text-amber-200">
                      <strong>Multi-Ray Directive:</strong> {verdict.multiRayHardwareDirective}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800 text-[9.5px] text-zinc-400 flex justify-between">
                    <span className="truncate max-w-[65%]">SHA-256: {verdict.sha256FrameSeal}</span>
                    <span className="text-emerald-400 font-bold">BSA Sec. 63 Sealed</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
