"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useGovernor } from "@/context/GovernorContext";
import {
  idbClearPackets,
  idbEstimateStorageMb,
  idbListPackets,
  idbPutPacket,
  type BandwidthProfile,
  type FieldEvidencePacket,
} from "@/lib/offline/fieldVaultIdb";

interface LiveWeatherState {
  windSpeedMs: number;
  windSpeedKmh: number;
  tempC: number;
  rainMm: number;
  pressureHpa: number;
  fetchedAt: string;
}

interface NetworkInformationLike {
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  downlink?: number;
  saveData?: boolean;
  addEventListener?: (type: string, cb: () => void) => void;
  removeEventListener?: (type: string, cb: () => void) => void;
}

interface BrowserBarcodeDetector {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string; format: string }>>;
}

const ZONE_ANCHORS = [
  { zoneId: "ZONE-1", bimGlobalId: "SLAB-Z1", label: "Zone 1 — Foundation / Slab" },
  { zoneId: "ZONE-2", bimGlobalId: "SLAB-Z2", label: "Zone 2 — East Bay" },
  { zoneId: "ZONE-3", bimGlobalId: "SLAB-Z3", label: "Zone 3 — Hotel Core" },
  { zoneId: "ZONE-4", bimGlobalId: "TG-03", label: "Zone 4 — Transfer Girder TG-03" },
  { zoneId: "ZONE-5", bimGlobalId: "CORE-Z5", label: "Zone 5 — MEP Risers" },
  { zoneId: "ZONE-6", bimGlobalId: "CORE-Z6", label: "Zone 6 — Roof / Crown" },
  { zoneId: "FOAP-PILOT", bimGlobalId: "FOAP-BAY-01", label: "FOAP Studio Bay (Pilot)" },
];

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256BytesPure(bytes: Uint8Array): string {
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map((v) => v.toString(16).padStart(8, "0")).join("");
}

async function computeSha256(bytes: Uint8Array): Promise<string> {
  if (typeof window !== "undefined" && window.isSecureContext && window.crypto?.subtle) {
    const copy = new Uint8Array(bytes);
    const digest = await window.crypto.subtle.digest("SHA-256", copy.buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return sha256BytesPure(bytes);
}

function detectNetworkTier(): {
  effectiveType: string;
  saveData: boolean;
  resolvedProfile: Exclude<BandwidthProfile, "auto">;
} {
  if (typeof navigator === "undefined") {
    return { effectiveType: "4g", saveData: false, resolvedProfile: "standard" };
  }
  const conn = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  const eff = conn?.effectiveType || "4g";
  const saveData = Boolean(conn?.saveData);
  if (saveData || eff === "slow-2g") return { effectiveType: eff, saveData, resolvedProfile: "manifest-only" };
  if (eff === "2g" || eff === "3g") return { effectiveType: eff, saveData, resolvedProfile: "ultra-lite" };
  return { effectiveType: eff, saveData, resolvedProfile: "standard" };
}

export function ZeroCostFieldCapturePanel() {
  const { input, patchInput } = useGovernor();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedAnchor, setSelectedAnchor] = useState(ZONE_ANCHORS[3]);
  const [qrPayload, setQrPayload] = useState("");
  const [noteText, setNoteText] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<string | null>(null);

  // Offline / Bandwidth Controls
  const [isOnline, setIsOnline] = useState(true);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [bandwidthMode, setBandwidthMode] = useState<BandwidthProfile>("auto");
  const [netTier, setNetTier] = useState("4g");
  const [storageMb, setStorageMb] = useState<{ usedMb: number; quotaMb: number } | null>(null);
  const [syncing, setSyncing] = useState(false);

  // 6-DoF Pose + GPS
  const [gps, setGps] = useState<{ lat: number; lon: number; acc: number } | null>(null);
  const [pose, setPose] = useState<{ yaw: number | null; pitch: number | null; roll: number | null }>({
    yaw: null,
    pitch: null,
    roll: null,
  });
  const [sensorsActive, setSensorsActive] = useState(false);

  // Voice memo
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [voiceSec, setVoiceSec] = useState(0);

  // Free Open-Meteo Weather
  const [weather, setWeather] = useState<LiveWeatherState | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // IndexedDB Evidence Queue
  const [packets, setPackets] = useState<FieldEvidencePacket[]>([]);

  const effectiveOnline = isOnline && !simulateOffline;
  const resolvedProfile: Exclude<BandwidthProfile, "auto"> =
    bandwidthMode === "auto" ? detectNetworkTier().resolvedProfile : bandwidthMode;

  const refreshVault = useCallback(async () => {
    const [rows, est] = await Promise.all([idbListPackets(), idbEstimateStorageMb()]);
    setPackets(rows);
    setStorageMb(est);
  }, []);

  const syncSinglePacket = useCallback(
    async (pkt: FieldEvidencePacket): Promise<FieldEvidencePacket> => {
      const sendMedia = pkt.bandwidthProfile !== "manifest-only";
      const res = await fetch("/api/field-captures/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pkt,
          thumbDataUrl: sendMedia ? pkt.thumbDataUrl : null,
          mediaUploaded: sendMedia,
        }),
      });

      if (res.status === 409) {
        const updated: FieldEvidencePacket = {
          ...pkt,
          synced: false,
          rejectedDuplicate: true,
          syncError: "HTTP 409 DUPLICATE SHA-256",
        };
        await idbPutPacket(updated);
        return updated;
      }

      if (!res.ok) {
        const updated: FieldEvidencePacket = {
          ...pkt,
          synced: false,
          syncError: `HTTP ${res.status}`,
        };
        await idbPutPacket(updated);
        return updated;
      }

      const data = (await res.json()) as { storageMode?: "supabase" | "edge_ledger_fallback"; mediaUploaded?: boolean };
      const updated: FieldEvidencePacket = {
        ...pkt,
        synced: true,
        rejectedDuplicate: false,
        syncError: null,
        mediaUploaded: Boolean(data.mediaUploaded),
        storageMode: data.storageMode,
      };
      await idbPutPacket(updated);
      return updated;
    },
    []
  );

  const flushPendingQueue = useCallback(async () => {
    if (!effectiveOnline) {
      setStatusMsg("Offline mode active — packets stay safely queued in IndexedDB.");
      return;
    }
    const current = await idbListPackets();
    const pending = current.filter((p) => !p.synced && !p.rejectedDuplicate);
    if (pending.length === 0) {
      setStatusMsg("All IndexedDB evidence packets are already synced.");
      return;
    }

    setSyncing(true);
    let okCount = 0;
    let dupCount = 0;
    let failCount = 0;

    for (const pkt of pending) {
      try {
        const resPkt = await syncSinglePacket(pkt);
        if (resPkt.synced) okCount++;
        else if (resPkt.rejectedDuplicate) dupCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    await refreshVault();
    setSyncing(false);
    setStatusMsg(
      `Queue Flush Done: ${okCount} synced${dupCount > 0 ? `, ${dupCount} blocked (HTTP 409)` : ""}${failCount > 0 ? `, ${failCount} retrying later` : ""}.`
    );
  }, [effectiveOnline, refreshVault, syncSinglePacket]);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    setNetTier(detectNetworkTier().effectiveType);
    refreshVault();

    const onUp = () => {
      setIsOnline(true);
      setNetTier(detectNetworkTier().effectiveType);
    };
    const onDown = () => setIsOnline(false);

    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);

    const conn = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    const onConnChange = () => setNetTier(detectNetworkTier().effectiveType);
    conn?.addEventListener?.("change", onConnChange);

    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
      conn?.removeEventListener?.("change", onConnChange);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    };
  }, [refreshVault]);

  // Auto-flush IndexedDB queue whenever connectivity returns
  useEffect(() => {
    if (effectiveOnline && packets.some((p) => !p.synced && !p.rejectedDuplicate)) {
      flushPendingQueue();
    }
  }, [effectiveOnline, flushPendingQueue, packets]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera API unavailable in this browser context. Use 'Test Frame' on PC.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError(
        err instanceof Error ? `${err.message} — Use 'Test Frame' for PC testing.` : "Camera blocked."
      );
    }
  }, []);

  const enableSensors = useCallback(async () => {
    setStatusMsg("Locking GPS + 6-DoF orientation…");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps({
            lat: Math.round(pos.coords.latitude * 1e5) / 1e5,
            lon: Math.round(pos.coords.longitude * 1e5) / 1e5,
            acc: Math.round(pos.coords.accuracy),
          });
        },
        () => setGps({ lat: 26.8467, lon: 80.9462, acc: 12 }),
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setGps({ lat: 26.8467, lon: 80.9462, acc: 12 });
    }

    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (typeof DOE?.requestPermission === "function") {
      try {
        await DOE.requestPermission();
      } catch {
        // Continue with GPS
      }
    }

    const handler = (ev: DeviceOrientationEvent) => {
      setPose({
        yaw: ev.alpha !== null ? Math.round(ev.alpha * 10) / 10 : null,
        pitch: ev.beta !== null ? Math.round(ev.beta * 10) / 10 : null,
        roll: ev.gamma !== null ? Math.round(ev.gamma * 10) / 10 : null,
      });
    };
    window.addEventListener("deviceorientation", handler);
    setSensorsActive(true);
    setStatusMsg("GPS + 6-DoF Plumb Sensors Active");
  }, []);

  const applyQrCode = useCallback((raw: string) => {
    setQrPayload(raw);
    const upper = raw.toUpperCase();
    const matched = ZONE_ANCHORS.find(
      (z) => upper.includes(z.zoneId) || upper.includes(z.bimGlobalId)
    );
    if (matched) setSelectedAnchor(matched);
    setStatusMsg(`QR Anchor Locked: ${raw}${matched ? ` → ${matched.zoneId} (${matched.bimGlobalId})` : ""}`);
  }, []);

  const scanQrFromCamera = useCallback(async () => {
    const DetectorCtor = (
      window as unknown as {
        BarcodeDetector?: new (opts?: { formats?: string[] }) => BrowserBarcodeDetector;
      }
    ).BarcodeDetector;

    if (!DetectorCtor || !videoRef.current || !cameraActive) {
      setStatusMsg("Native QR scanner unavailable — paste Zone QR / GST e-Way / NABL ULR below.");
      return;
    }
    try {
      const detector = new DetectorCtor({ formats: ["qr_code", "code_128"] });
      const codes = await detector.detect(videoRef.current);
      if (codes.length > 0) applyQrCode(codes[0].rawValue);
      else setStatusMsg("No QR code detected in frame — hold steady and tap Scan QR again.");
    } catch {
      setStatusMsg("QR scan failed — enter Zone/ULR/e-Way code manually.");
    }
  }, [applyQrCode, cameraActive]);

  const toggleVoiceMemo = useCallback(async () => {
    if (recordingVoice) {
      recorderRef.current?.stop();
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      setRecordingVoice(false);
      setStatusMsg(`Hinglish voice note sealed (${voiceSec}s)`);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatusMsg("Microphone unavailable — type Hinglish snag note in text box.");
      return;
    }
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(audioStream);
      recorderRef.current = rec;
      rec.onstop = () => audioStream.getTracks().forEach((t) => t.stop());
      rec.start();
      setVoiceSec(0);
      setRecordingVoice(true);
      voiceTimerRef.current = setInterval(() => setVoiceSec((s) => s + 1), 1000);
      setStatusMsg("Recording Hinglish audio note… tap again to stop.");
    } catch {
      setStatusMsg("Mic permission denied — type Hinglish snag note instead.");
    }
  }, [recordingVoice, voiceSec]);

  const pullLiveWeather = useCallback(async () => {
    if (!effectiveOnline) {
      setStatusMsg("Offline — Open-Meteo sync deferred until signal returns.");
      return;
    }
    setWeatherLoading(true);
    const lat = gps?.lat ?? 26.8467;
    const lon = gps?.lon ?? 80.9462;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}¤t=temperature_2m,rain,wind_speed_10m,surface_pressure&wind_speed_unit=ms`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const cur = data.current;
      const windSpeedMs = Number(cur.wind_speed_10m ?? 0);
      const next: LiveWeatherState = {
        windSpeedMs: Math.round(windSpeedMs * 10) / 10,
        windSpeedKmh: Math.round(windSpeedMs * 3.6 * 10) / 10,
        tempC: Number(cur.temperature_2m ?? 0),
        rainMm: Number(cur.rain ?? 0),
        pressureHpa: Number(cur.surface_pressure ?? 1013.2),
        fetchedAt: new Date().toLocaleTimeString(),
      };
      setWeather(next);
      patchInput({ windSpeedMs: next.windSpeedMs });
      setStatusMsg(`Open-Meteo synced (${next.windSpeedKmh} km/h, ${next.pressureHpa} hPa) → Governor updated.`);
    } catch {
      setStatusMsg("Open-Meteo unreachable — continuing in offline mode.");
    } finally {
      setWeatherLoading(false);
    }
  }, [effectiveOnline, gps, patchInput]);

  const captureEvidence = useCallback(
    async (simulateFrame = false) => {
      setDuplicateAlert(null);
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Adaptive resolution & JPEG quality based on bandwidth tier
      const isLite = resolvedProfile === "ultra-lite" || resolvedProfile === "manifest-only";
      canvas.width = isLite ? 480 : 800;
      canvas.height = isLite ? 270 : 450;
      const jpegQuality = isLite ? 0.48 : 0.78;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (!simulateFrame && cameraActive && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "#09090b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
        ctx.fillStyle = "#e4e4e7";
        ctx.font = "bold 16px monospace";
        ctx.fillText(`QUADILLAR FIELD • ${selectedAnchor.zoneId} (${selectedAnchor.bimGlobalId})`, 24, 54);
        ctx.font = "12px monospace";
        ctx.fillStyle = "#a1a1aa";
        ctx.fillText(`UTC: ${new Date().toISOString()}`, 24, 88);
        ctx.fillText(`PROFILE: ${resolvedProfile.toUpperCase()}`, 24, 114);
        ctx.fillText(`QR: ${qrPayload || "NO_QR"}`, 24, 140);
        ctx.fillText(`NOTE: ${noteText || "Visual inspection capture"}`, 24, 166);
      }

      const thumbDataUrl = canvas.toDataURL("image/jpeg", jpegQuality);
      const base64 = thumbDataUrl.split(",")[1] || "";
      const rawBin = atob(base64);
      const bytes = new Uint8Array(rawBin.length);
      for (let i = 0; i < rawBin.length; i++) bytes[i] = rawBin.charCodeAt(i);

      const sha256 = await computeSha256(bytes);

      if (packets.some((p) => p.sha256 === sha256)) {
        setDuplicateAlert(`HTTP 409 DUPLICATE REJECTED — Hash ${sha256.slice(0, 14)} already exists in IndexedDB vault.`);
        window.dispatchEvent(new CustomEvent("quadillar:field-event", {
          detail: {
            id: `dup-409-${sha256.slice(0, 10)}`,
            trigger: "offlineSyncAndDup409",
            severity: "HIGH",
            title: "HTTP 409 Duplicate Evidence Blocked",
            body: `Recycled photo hash ${sha256.slice(0, 12)} rejected on ${selectedAnchor.zoneId} (${selectedAnchor.bimGlobalId}).`,
            url: "/site/dpr",
          },
        }));
        return;
      }

      const plumbDev = pose.pitch !== null ? Math.round(Math.abs(90 - Math.abs(pose.pitch)) * 10) / 10 : null;
      const packet: FieldEvidencePacket = {
        id: `CAP-${Date.now().toString(36).toUpperCase()}`,
        projectId: input.projectId,
        recordedAtUtc: new Date().toISOString(),
        zoneId: selectedAnchor.zoneId,
        bimGlobalId: selectedAnchor.bimGlobalId,
        qrPayload: qrPayload.trim() || null,
        noteText: noteText.trim() || "Live field camera capture",
        voiceDurationSec: voiceSec,
        sha256,
        lat: gps?.lat ?? null,
        lon: gps?.lon ?? null,
        gpsAccuracyM: gps?.acc ?? null,
        yawDeg: pose.yaw,
        pitchDeg: pose.pitch,
        rollDeg: pose.roll,
        plumbDeviationDeg: plumbDev,
        plumbPass: plumbDev !== null ? plumbDev <= 0.5 : null,
        weatherWindMs: weather?.windSpeedMs ?? null,
        surfacePressureHpa: weather?.pressureHpa ?? null,
        bandwidthProfile: resolvedProfile,
        payloadBytes: resolvedProfile === "manifest-only" ? 1400 : bytes.length,
        thumbDataUrl,
        mediaUploaded: false,
        synced: false,
      };

      // Always write to IndexedDB FIRST (zero data loss even if tab closes immediately)
      await idbPutPacket(packet);

      if (effectiveOnline) {
        try {
          const syncedPkt = await syncSinglePacket(packet);
          if (syncedPkt.rejectedDuplicate) {
            setDuplicateAlert(`HTTP 409 SERVER REJECTED — Duplicate SHA-256 ${sha256.slice(0, 14)}.`);
            window.dispatchEvent(new CustomEvent("quadillar:field-event", {
              detail: {
                id: `dup-409-srv-${sha256.slice(0, 10)}`,
                trigger: "offlineSyncAndDup409",
                severity: "HIGH",
                title: "HTTP 409 Server Duplicate Blocked",
                body: `Supabase ledger rejected duplicate SHA-256 ${sha256.slice(0, 12)} on ${selectedAnchor.bimGlobalId}.`,
                url: "/site/dpr",
              },
            }));
          } else if (syncedPkt.synced) {
            const kb = Math.round(syncedPkt.payloadBytes / 1024);
            setStatusMsg(
              `Sealed & Synced ${syncedPkt.id} (${kb} KB • ${syncedPkt.bandwidthProfile}) → ${syncedPkt.storageMode}`
            );
          } else {
            setStatusMsg(`Saved to IndexedDB (${packet.id}) — sync retry queued.`);
          }
        } catch {
          setStatusMsg(`Network dropped — ${packet.id} safely queued in IndexedDB.`);
        }
      } else {
        setStatusMsg(`OFFLINE VAULTED ${packet.id} (${Math.round(bytes.length / 1024)} KB) — auto-syncs on signal.`);
      }

      await refreshVault();
      setVoiceSec(0);
      setNoteText("");
    },
    [
      cameraActive,
      effectiveOnline,
      gps,
      input.projectId,
      noteText,
      packets,
      pose,
      qrPayload,
      refreshVault,
      resolvedProfile,
      selectedAnchor,
      syncSinglePacket,
      voiceSec,
      weather,
    ]
  );

  const pendingCount = packets.filter((p) => !p.synced && !p.rejectedDuplicate).length;

  return (
    <section className="mb-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-emerald-300">
              ₹0 OFFLINE-FIRST FIELD INSTRUMENT
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              INDEXEDDB VAULT • 2G COMPRESSION • HTTP 409 DEDUP • BSA SEC 63
            </span>
          </div>
          <h2 className="mt-1 text-base font-bold text-white">Zero-Cost Evidence Capture & Low-Bandwidth Queue</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span
            className={`rounded-full px-2.5 py-0.5 font-bold ${
              effectiveOnline
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
            }`}
          >
            {effectiveOnline ? `ONLINE (${netTier.toUpperCase()})` : "OFFLINE VAULT MODE"}
          </span>
          <button
            type="button"
            onClick={() => setSimulateOffline((s) => !s)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-300 hover:text-white"
          >
            {simulateOffline ? "Go Back Online" : "Test Offline"}
          </button>
          <Link
            href="/site/qr-anchors"
            className="rounded border border-sky-500/40 bg-sky-950/50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300 hover:bg-sky-900/50"
          >
            Print ₹5 Zone QRs →
          </Link>
        </div>
      </div>

      {/* Bandwidth & Offline Queue Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-zinc-400">BANDWIDTH:</span>
          {(["auto", "standard", "ultra-lite", "manifest-only"] as BandwidthProfile[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setBandwidthMode(m)}
              className={`rounded px-2 py-1 text-[11px] font-semibold ${
                bandwidthMode === m
                  ? "bg-sky-600 text-white"
                  : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white"
              }`}
            >
              {m === "auto"
                ? `Auto (${resolvedProfile})`
                : m === "standard"
                ? "4G (~90KB)"
                : m === "ultra-lite"
                ? "2G Lite (~22KB)"
                : "Hash Only (~1.5KB)"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {storageMb && (
            <span className="hidden sm:inline text-[11px] text-zinc-500">
              IDB {storageMb.usedMb} MB used
            </span>
          )}
          <button
            type="button"
            disabled={syncing || pendingCount === 0 || !effectiveOnline}
            onClick={flushPendingQueue}
            className="min-h-[34px] rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 px-3 text-[11px] font-bold text-white"
          >
            {syncing ? "Flushing…" : `Sync Pending (${pendingCount})`}
          </button>
        </div>
      </div>

      {/* Zone Anchor + QR + Hinglish Note */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono uppercase text-zinc-400">1. Zone / BIM Anchor</label>
          <select
            value={selectedAnchor.zoneId}
            onChange={(e) => {
              const found = ZONE_ANCHORS.find((z) => z.zoneId === e.target.value);
              if (found) setSelectedAnchor(found);
            }}
            className="w-full min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs font-mono text-white"
          >
            {ZONE_ANCHORS.map((z) => (
              <option key={z.zoneId} value={z.zoneId}>
                {z.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-mono uppercase text-zinc-400">2. Zone QR / GST e-Way / NABL ULR</label>
          <input
            type="text"
            value={qrPayload}
            onChange={(e) => setQrPayload(e.target.value)}
            placeholder="QUADILLAR|ZONE-4|TG-03 or ULR / e-Way No."
            className="w-full min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs font-mono text-white placeholder:text-zinc-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-mono uppercase text-zinc-400">3. Hinglish Snag / Pour Note</label>
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="e.g. TG-03 beam honeycombing + 28mm sag"
            className="w-full min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-white placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Camera Viewport + Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-black overflow-hidden">
          <div className="relative aspect-video bg-zinc-950 flex items-center justify-center">
            <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${cameraActive ? "block" : "hidden"}`} />
            {!cameraActive && (
              <div className="p-4 text-center space-y-2">
                <div className="text-xs font-mono text-zinc-400">GALLERY UPLOAD BLOCKED (ANTI-SPOOF)</div>
                <div className="text-[11px] text-zinc-500">
                  {cameraError || "Start live rear camera or use Test Frame on PC."}
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-zinc-900/90 border-t border-zinc-800">
            <button
              type="button"
              onClick={cameraActive ? stopCamera : startCamera}
              className="min-h-[46px] rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white px-2"
            >
              {cameraActive ? "Stop Cam" : "Live Camera"}
            </button>
            <button
              type="button"
              onClick={() => captureEvidence(!cameraActive)}
              className="min-h-[46px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white px-2"
            >
              {cameraActive ? "Seal Photo" : "Test Frame"}
            </button>
            <button
              type="button"
              onClick={scanQrFromCamera}
              className="min-h-[46px] rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white px-2"
            >
              Scan QR
            </button>
            <button
              type="button"
              onClick={toggleVoiceMemo}
              className={`min-h-[46px] rounded-lg text-xs font-semibold text-white px-2 ${
                recordingVoice ? "bg-red-600 animate-pulse" : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            >
              {recordingVoice ? `Stop (${voiceSec}s)` : "Hinglish Mic"}
            </button>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-xs font-mono">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg bg-zinc-950 p-2.5 border border-zinc-800">
              <div className="text-[10px] text-zinc-400">GPS POSITION</div>
              <div className="mt-1 font-bold text-zinc-100">
                {gps ? `${gps.lat}, ${gps.lon}` : "Not locked"}
              </div>
              <div className="text-[10px] text-zinc-500">{gps ? `±${gps.acc}m accuracy` : "Tap Enable 6-DoF"}</div>
            </div>

            <div className="rounded-lg bg-zinc-950 p-2.5 border border-zinc-800">
              <div className="text-[10px] text-zinc-400">6-DOF POSE / PLUMB</div>
              <div className="mt-1 font-bold text-zinc-100">
                {pose.yaw !== null ? `Y:${pose.yaw}° P:${pose.pitch}°` : sensorsActive ? "Listening…" : "Idle"}
              </div>
              <div className="text-[10px] text-zinc-500">Plumb limit: ±0.5° vertical</div>
            </div>

            <div className="rounded-lg bg-zinc-950 p-2.5 border border-zinc-800">
              <div className="text-[10px] text-zinc-400">OPEN-METEO WIND / RAIN</div>
              <div className="mt-1 font-bold text-sky-300">
                {weather ? `${weather.windSpeedKmh} km/h • ${weather.rainMm}mm` : "Not synced"}
              </div>
              <div className="text-[10px] text-zinc-500">
                {weather ? `${weather.tempC}°C @ ${weather.fetchedAt}` : "Free live site feed"}
              </div>
            </div>

            <div className="rounded-lg bg-zinc-950 p-2.5 border border-zinc-800">
              <div className="text-[10px] text-zinc-400">BAROMETRIC BASELINE</div>
              <div className="mt-1 font-bold text-emerald-300">
                {weather ? `${weather.pressureHpa} hPa` : "1013.2 hPa ref"}
              </div>
              <div className="text-[10px] text-zinc-500">~0.4 hPa/floor delta</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={enableSensors}
              className="min-h-[44px] rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold"
            >
              Enable 6-DoF
            </button>
            <button
              type="button"
              disabled={weatherLoading}
              onClick={pullLiveWeather}
              className="min-h-[44px] rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold"
            >
              {weatherLoading ? "Syncing…" : "Sync Weather"}
            </button>
            <button
              type="button"
              onClick={() => {
                patchInput({ lidarDeviationMm: 28 });
                setStatusMsg(`Injected 28mm defect on ${selectedAnchor.bimGlobalId} → Governor updated.`);
              }}
              className="min-h-[44px] rounded-lg bg-red-600/90 hover:bg-red-500 text-white font-semibold"
            >
              Flag 28mm Defect
            </button>
          </div>
        </div>
      </div>

      {duplicateAlert && (
        <div className="rounded-lg border border-red-500 bg-red-950/60 px-3 py-2 text-xs font-mono font-bold text-red-200">
          {duplicateAlert}
        </div>
      )}
      {statusMsg && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono text-emerald-300">
          {statusMsg}
        </div>
      )}

      {/* IndexedDB Evidence Strip */}
      {packets.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>
              INDEXEDDB EVIDENCE VAULT ({packets.length} TOTAL • {pendingCount} PENDING SYNC)
            </span>
            <button
              type="button"
              onClick={async () => {
                await idbClearPackets();
                await refreshVault();
                setStatusMsg("IndexedDB vault cleared.");
              }}
              className="text-zinc-500 hover:text-zinc-200 underline"
            >
              Clear Vault
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {packets.slice(0, 6).map((p) => (
              <div
                key={p.id}
                className={`flex gap-2.5 rounded-lg border p-2.5 text-[11px] font-mono ${
                  p.rejectedDuplicate
                    ? "border-red-500/60 bg-red-950/30"
                    : p.synced
                    ? "border-emerald-500/30 bg-zinc-900/70"
                    : "border-amber-500/40 bg-amber-950/20"
                }`}
              >
                <img
                  src={p.thumbDataUrl}
                  alt={p.id}
                  className="h-14 w-20 shrink-0 rounded object-cover border border-zinc-800"
                />
                <div className="min-w-0 space-y-0.5">
                  <div className="font-bold text-white truncate">
                    {p.id} • {p.zoneId} ({p.bimGlobalId})
                  </div>
                  <div className="text-zinc-300 truncate">{p.noteText}</div>
                  <div className="text-emerald-400 truncate">SHA256: {p.sha256.slice(0, 14)}…</div>
                  <div className="text-zinc-400 truncate">
                    {p.rejectedDuplicate
                      ? "BLOCKED 409"
                      : p.synced
                      ? `SYNCED (${p.mediaUploaded ? `${Math.round(p.payloadBytes / 1024)}KB` : "MANIFEST 1.5KB"})`
                      : "QUEUED OFFLINE"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
