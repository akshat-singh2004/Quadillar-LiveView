import React from "react";
import { LiveTelemetryStreamHUD } from "@/components/telemetry/LiveTelemetryStreamHUD";
import { Radio, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LiveTelemetryPage() {
  const projectId = "GOMTI-NAGAR-PH1-FITOUT";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>REAL-TIME HARDWARE SENSOR RADAR • EDGE TELEMETRY STREAM • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Live Field IoT Telemetry &amp; WebSocket Radar HUD
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            Gomti Nagar Extension Commercial Hub Ph-1 • Real-time ingress feeds for anemometers, concrete thermocouples, CTM digital load cells, and turnstiles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/governance/council"
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold uppercase text-[10px] transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Council War Room</span>
          </Link>
        </div>
      </header>

      <LiveTelemetryStreamHUD projectId={projectId} />
    </div>
  );
}
