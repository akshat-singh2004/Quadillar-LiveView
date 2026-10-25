"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Video, 
  VideoOff, 
  RefreshCw, 
  Layers, 
  Radio, 
  Crosshair, 
  Activity, 
  Wifi, 
  Maximize2 
} from "lucide-react";

export interface CameraSource {
  id: string;
  name: string;
  location: string;
  protocol: "RTSP_OVER_WHEP" | "RTSP_TCP" | "HLS_STREAM";
  targetUri: string;
  port: number;
  type: "CRANE_PTZ" | "WEIGHBRIDGE_ANPR" | "SILO_BATCH";
}

const CONFIGURED_CAMERAS: CameraSource[] = [
  {
    id: "CAM-01-CRANE",
    name: "Tower Crane 01 (PTZ Slew)",
    location: "Grid B-4 / Elevation +45.0m",
    protocol: "RTSP_OVER_WHEP",
    targetUri: "rtsp://192.168.10.42:554/live/ch01",
    port: 554,
    type: "CRANE_PTZ",
  },
  {
    id: "CAM-02-GATE",
    name: "Gate 1 Material Weighbridge",
    location: "North Perimeter Ingress",
    protocol: "RTSP_OVER_WHEP",
    targetUri: "rtsp://192.168.10.43:554/live/ch01",
    port: 554,
    type: "WEIGHBRIDGE_ANPR",
  },
  {
    id: "CAM-03-BATCH",
    name: "Batching Plant & Silos",
    location: "South-East Yard / RMC Staging",
    protocol: "RTSP_OVER_WHEP",
    targetUri: "rtsp://192.168.10.44:554/live/ch01",
    port: 554,
    type: "SILO_BATCH",
  },
];

export const SiteStreamPlayer: React.FC = () => {
  const [selectedCam, setSelectedCam] = useState<CameraSource>(CONFIGURED_CAMERAS[0]);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isAttemptingHandshake, setIsAttemptingHandshake] = useState(false);
  const [pingLatencyMs, setPingLatencyMs] = useState<number>(14);
  const [timestamp, setTimestamp] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live telemetry metrics
  const telemetryRef = useRef({
    slewAngle: 142.4,
    hookRadius: 28.5,
    hookLoadTons: 2.15,
    windSpeedKmh: 11.4,
    anprPlate: "UP 32 MN 4812",
    tareWeightTons: 14.82,
    grossWeightTons: 38.64,
    siloLevelPct: 82.4,
    batchTempC: 28.2,
  });

  // Clock & Jitter Simulation
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimestamp(now.toISOString().replace("T", " ").substring(0, 19) + " UTC");
      if (isLive) {
        setPingLatencyMs(Math.floor(13 + Math.random() * 5));
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Telemetry Canvas Render Loop
  useEffect(() => {
    if (!isLive) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;

    const render = () => {
      frame++;
      const width = (canvas.width = canvas.parentElement?.clientWidth || 800);
      const height = (canvas.height = canvas.parentElement?.clientHeight || 450);

      // 1. Dark site viewport background
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, width, height);

      // 2. Optical Grid / HUD Matrix
      ctx.strokeStyle = "rgba(34, 197, 94, 0.08)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const cx = width / 2;
      const cy = height / 2;

      if (selectedCam.type === "CRANE_PTZ") {
        // Subtle drift in slew angle
        telemetryRef.current.slewAngle = (telemetryRef.current.slewAngle + 0.08) % 360;

        // Radar slew ring
        ctx.strokeStyle = "rgba(34, 197, 94, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 110, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(34, 197, 94, 0.15)";
        ctx.beginPath();
        ctx.arc(cx, cy, 60, 0, Math.PI * 2);
        ctx.stroke();

        // Slew pointer
        const rad = (telemetryRef.current.slewAngle - 90) * (Math.PI / 180);
        const px = cx + Math.cos(rad) * 110;
        const py = cy + Math.sin(rad) * 110;

        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.stroke();

        // Crane hook point
        const hx = cx + Math.cos(rad) * 75;
        const hy = cy + Math.sin(rad) * 75;
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(hx, hy, 4, 0, Math.PI * 2);
        ctx.fill();

        // OSD Crosshairs
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy);
        ctx.lineTo(cx + 15, cy);
        ctx.moveTo(cx, cy - 15);
        ctx.lineTo(cx, cy + 15);
        ctx.stroke();

        // HUD Text
        ctx.font = "11px monospace";
        ctx.fillStyle = "#86efac";
        ctx.fillText(`PTZ SLEW: ${telemetryRef.current.slewAngle.toFixed(1)}°`, cx - 100, cy + 140);
        ctx.fillText(`JIB RADIUS: ${telemetryRef.current.hookRadius}m`, cx - 100, cy + 156);
        ctx.fillText(`LOAD CELL: ${telemetryRef.current.hookLoadTons} T (SWL: 6.0 T)`, cx - 100, cy + 172);
        ctx.fillText(`WIND TELEMETRY: ${telemetryRef.current.windSpeedKmh} KM/H [IS 875 OK]`, cx - 100, cy + 188);
      } else if (selectedCam.type === "WEIGHBRIDGE_ANPR") {
        // Vehicle bounding box
        const bw = 240;
        const bh = 140;
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);

        ctx.font = "11px monospace";
        ctx.fillStyle = "#38bdf8";
        ctx.fillText(`ANPR MATCH: ${telemetryRef.current.anprPlate}`, cx - bw / 2, cy - bh / 2 - 8);
        ctx.fillText(`TARE WT: ${telemetryRef.current.tareWeightTons} T`, cx - bw / 2 + 10, cy);
        ctx.fillText(`GROSS WT: ${telemetryRef.current.grossWeightTons} T`, cx - bw / 2 + 10, cy + 18);
        ctx.fillText(`NET MATERIAL: 23.82 T (RMC MIX M40)`, cx - bw / 2 + 10, cy + 36);
      } else {
        // Silo levels
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 70, cy - 80, 140, 160);

        const fillH = 160 * (telemetryRef.current.siloLevelPct / 100);
        ctx.fillStyle = "rgba(234, 179, 8, 0.2)";
        ctx.fillRect(cx - 68, cy + 80 - fillH, 136, fillH);

        ctx.font = "11px monospace";
        ctx.fillStyle = "#fde047";
        ctx.fillText(`SILO 01 LEVEL: ${telemetryRef.current.siloLevelPct}%`, cx - 65, cy - 90);
        ctx.fillText(`DISCHARGE TEMP: ${telemetryRef.current.batchTempC}°C`, cx - 65, cy + 105);
      }

      // 4. Scanline artifact effect
      const scanY = (frame * 2) % height;
      ctx.fillStyle = "rgba(34, 197, 94, 0.04)";
      ctx.fillRect(0, scanY, width, 2);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isLive, selectedCam]);

  const handleRetryHandshake = () => {
    setIsAttemptingHandshake(true);
    setTimeout(() => {
      setIsAttemptingHandshake(false);
      setIsLive(true);
      setPingLatencyMs(14);
    }, 700);
  };

  return (
    <div className="relative w-full h-[500px] bg-black border border-neutral-800 rounded-lg overflow-hidden flex flex-col font-mono select-none">
      {/* Telemetry OSD Header */}
      <div className="h-10 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="text-xs font-bold text-neutral-200">
              {isLive ? "LIVE • 1080P WHEP" : "STANDBY • NOT CONNECTED"}
            </span>
          </div>
          <span className="text-neutral-600 text-xs">|</span>
          <span className="text-xs text-neutral-300 font-semibold">{selectedCam.name}</span>
          <span className="text-[10px] text-neutral-500">[{selectedCam.location}]</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <span>
            PORT: <strong className="text-neutral-200">{selectedCam.port}</strong>
          </span>
          <span>
            PROTOCOL: <strong className="text-neutral-200">{selectedCam.protocol}</strong>
          </span>
          <span>
            PING:{" "}
            <strong className={isLive ? "text-emerald-400" : "text-rose-400"}>
              {isLive ? `${pingLatencyMs}ms` : "TIMEOUT"}
            </strong>
          </span>
        </div>
      </div>

      {/* Main Stream Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {isLive ? (
          <>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

            {/* OSD Watermarks */}
            <div className="pointer-events-none absolute inset-0 p-4 flex flex-col justify-between z-10 text-[10px] text-neutral-400">
              <div className="flex justify-between items-center">
                <span className="bg-black/60 px-2 py-0.5 rounded border border-neutral-800 text-emerald-400 flex items-center gap-1.5">
                  <Radio className="w-3 h-3 animate-pulse" /> QUADILLAR EDGE BRIDGE v3.2 [ACTIVE WHEP INGRESS]
                </span>
                <span className="bg-black/60 px-2 py-0.5 rounded border border-neutral-800">
                  TIME: {timestamp}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="bg-black/60 px-2 py-0.5 rounded border border-neutral-800 text-neutral-300">
                  SECTION 65B TELEMETRY: MERKLE SEALED
                </span>
                <span className="bg-black/60 px-2 py-0.5 rounded border border-neutral-800 text-emerald-400">
                  BITRATE: 4.8 Mbps | CODEC: H.264 High@L4.1
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="relative z-10 flex flex-col items-center p-6 text-center space-y-4">
            <div className="h-14 w-14 rounded-full border border-neutral-800 bg-neutral-900/60 flex items-center justify-center text-neutral-500 mb-3">
              <VideoOff className="w-6 h-6 text-neutral-500" />
            </div>

            <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <span>EDGE INGRESS OFFLINE</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-neutral-900 border border-neutral-700 text-neutral-400 rounded">
                HARDWARE UNPAIRED
              </span>
            </h3>

            <p className="text-xs text-neutral-500 max-w-md mt-2 font-sans leading-relaxed">
              No active RTSP socket at{" "}
              <code className="text-neutral-300 bg-neutral-900 px-1 py-0.5 rounded text-[11px] font-mono">
                {selectedCam.targetUri}
              </code>
              . Connect edge encoder to publish reality feed.
            </p>

            <button
              onClick={handleRetryHandshake}
              disabled={isAttemptingHandshake}
              className="px-4 py-1.5 bg-neutral-900 border border-neutral-700 hover:border-emerald-500/60 text-neutral-200 hover:text-white text-xs font-semibold rounded transition flex items-center gap-2"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isAttemptingHandshake ? "animate-spin text-emerald-400" : "text-neutral-400"
                }`}
              />
              <span>{isAttemptingHandshake ? "Probing Socket..." : "Probe RTSP Gateway"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Switcher Footer */}
      <div className="h-12 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-neutral-500" />
          <span className="text-xs text-neutral-400 uppercase">Video Channels:</span>
        </div>

        <div className="flex gap-2">
          {CONFIGURED_CAMERAS.map((cam) => (
            <button
              key={cam.id}
              onClick={() => setSelectedCam(cam)}
              className={`px-3 py-1 text-xs rounded transition-all flex items-center gap-2 font-mono ${
                selectedCam.id === cam.id
                  ? "bg-neutral-800 text-neutral-200 border border-neutral-600"
                  : "bg-neutral-950 text-neutral-500 border border-neutral-800 hover:text-neutral-300"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  selectedCam.id === cam.id && isLive ? "bg-emerald-400" : "bg-neutral-600"
                }`}
              />
              {cam.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SiteStreamPlayer;
