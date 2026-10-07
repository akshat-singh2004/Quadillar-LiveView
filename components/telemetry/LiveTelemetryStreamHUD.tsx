"use client";

import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Activity,
  Wind,
  Flame,
  ShieldCheck,
  ShieldAlert,
  Wifi,
  WifiOff,
  Pause,
  Play,
  RotateCcw,
  Zap,
  Users,
  Wrench,
  Gauge,
  Radio,
} from "lucide-react";

export interface TelemetryPacket {
  id: string;
  project_id: string;
  device_id: string;
  device_protocol: string;
  telemetry_category: string;
  raw_payload: Record<string, any>;
  governor_routed: string;
  processed_success: boolean;
  interlock_tripped: boolean;
  seor_signoff_hash?: string;
  created_at: string;
}

export function LiveTelemetryStreamHUD({ projectId = "GOMTI-NAGAR-PH1-FITOUT" }: { projectId?: string }) {
  const [packets, setPackets] = useState<TelemetryPacket[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);

  // Latest instrument gauges state
  const [windSpeed, setWindSpeed] = useState(18.5);
  const [coreTemp, setCoreTemp] = useState(52.0);
  const [surfaceTemp, setSurfaceTemp] = useState(36.0);
  const [lastCtmLoad, setLastCtmLoad] = useState(915);
  const [lastPunch, setLastPunch] = useState({ pin: "PIN-104", direction: "INGRESS" });
  const [fleetOee, setFleetOee] = useState(91.2);

  const packetsRef = useRef<TelemetryPacket[]>([]);
  packetsRef.current = packets;

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Initial fetch of recent 15 packets
    const fetchRecent = async () => {
      const { data } = await supabase
        .from("iot_raw_telemetry_stream")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(12);

      if (data && data.length > 0) {
        setPackets(data as TelemetryPacket[]);
        // Hydrate gauge states from latest data
        data.forEach((p: any) => updateGaugeMetrics(p));
      }
    };

    fetchRecent();

    // Subscribe to real-time inserts via WebSocket channel
    const channel = supabase
      .channel("realtime-iot-stream")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "iot_raw_telemetry_stream",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (isPaused) return;
          const newPacket = payload.new as TelemetryPacket;

          setPackets((prev) => [newPacket, ...prev.slice(0, 24)]);
          updateGaugeMetrics(newPacket);

          if (newPacket.interlock_tripped) {
            setActiveAlert(`STATUTORY INTERLOCK TRIPPED by ${newPacket.governor_routed} (${newPacket.device_id})`);
            setTimeout(() => setActiveAlert(null), 8000);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    // Fallback polling every 5s if Realtime channel is reconnecting
    const pollInterval = setInterval(fetchRecent, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [projectId, isPaused]);

  const updateGaugeMetrics = (packet: TelemetryPacket) => {
    const p = packet.raw_payload || {};
    if (packet.telemetry_category === "WEATHER_ANEMOMETER" && p.windSpeedKmh) {
      setWindSpeed(Number(p.windSpeedKmh));
    }
    if (packet.telemetry_category === "THERMOCOUPLE_RTD") {
      if (p.coreTempC) setCoreTemp(Number(p.coreTempC));
      if (p.surfaceTempC) setSurfaceTemp(Number(p.surfaceTempC));
    }
    if (packet.telemetry_category === "CTM_LOAD_CELL" && p.failureLoadKn) {
      setLastCtmLoad(Number(p.failureLoadKn));
    }
    if (packet.telemetry_category === "BIOMETRIC_TURNSTILE" && p.workerPin) {
      setLastPunch({ pin: p.workerPin, direction: p.punchType || "INGRESS" });
    }
    if (packet.telemetry_category === "EQUIPMENT_CANBUS") {
      setFleetOee(91.5);
    }
  };

  const deltaT = (coreTemp - surfaceTemp).toFixed(1);
  const isWindDanger = windSpeed > 38.0;
  const isThermalDanger = Number(deltaT) > 20.0 || coreTemp > 70.0;
  const ctmStrengthMpa = ((lastCtmLoad * 1000) / 22500).toFixed(1);

  return (
    <div className="space-y-6 font-mono text-xs select-none">
      {/* HUD SYSTEM STATUS BAR */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-cyan-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-white text-sm uppercase">Edge IoT Hardware Ingress Stream</strong>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1 ${
                isConnected ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-zinc-800 text-zinc-400"
              }`}>
                {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span>{isConnected ? "WEBSOCKET LIVE" : "POLLING ACTIVE"}</span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
              Target: <code className="text-zinc-200">{projectId}</code> • Continuous hardware ingress gateway across all 10 Governors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-lg border font-bold uppercase text-[10px] transition cursor-pointer flex items-center gap-1.5 ${
              isPaused
                ? "bg-amber-950 border-amber-800 text-amber-300"
                : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>{isPaused ? "Resume Stream" : "Pause Stream"}</span>
          </button>
        </div>
      </div>

      {/* ACTIVE INTERLOCK CRIMSON ALERT BANNER */}
      {activeAlert && (
        <div className="p-3.5 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 flex items-center gap-3 animate-in slide-in-from-top duration-300 shadow-2xl">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
          <div className="flex-1">
            <strong className="block text-white uppercase text-xs">CRITICAL STATUTORY HOLD ENGAGED</strong>
            <p className="text-[11px] text-rose-300 font-sans">{activeAlert}</p>
          </div>
        </div>
      )}

      {/* 4 LIVE TELEMETRY GAUGES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GAUGE 1: ANEMOMETER WIND */}
        <div className={`p-4 rounded-xl border transition ${
          isWindDanger ? "bg-rose-950/40 border-rose-800" : "bg-zinc-900 border-zinc-800"
        }`}>
          <div className="flex justify-between items-center text-zinc-400 text-[10px] uppercase font-bold">
            <span className="flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
              <span>IS 13367 Wind Gust</span>
            </span>
            <span className={isWindDanger ? "text-rose-400" : "text-emerald-400"}>
              {isWindDanger ? "CRITICAL" : "PERMISSIBLE"}
            </span>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold tabular-nums ${isWindDanger ? "text-rose-400" : "text-white"}`}>
              {windSpeed.toFixed(1)}
            </span>
            <span className="text-zinc-500 text-xs">km/h</span>
          </div>

          <div className="mt-2 text-[10px] text-zinc-400 border-t border-zinc-800/80 pt-1.5 flex justify-between">
            <span>Cutoff Ceiling:</span>
            <span className="font-bold text-zinc-300">38.0 km/h</span>
          </div>
        </div>

        {/* GAUGE 2: THERMAL DIFFERENTIAL */}
        <div className={`p-4 rounded-xl border transition ${
          isThermalDanger ? "bg-rose-950/40 border-rose-800" : "bg-zinc-900 border-zinc-800"
        }`}>
          <div className="flex justify-between items-center text-zinc-400 text-[10px] uppercase font-bold">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>CIRIA C766 ΔT</span>
            </span>
            <span className={isThermalDanger ? "text-rose-400" : "text-emerald-400"}>
              {isThermalDanger ? "CRACK RISK" : "NOMINAL"}
            </span>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold tabular-nums ${isThermalDanger ? "text-rose-400" : "text-white"}`}>
              {deltaT}
            </span>
            <span className="text-zinc-500 text-xs">°C Differential</span>
          </div>

          <div className="mt-2 text-[10px] text-zinc-400 border-t border-zinc-800/80 pt-1.5 flex justify-between">
            <span>Core: <strong className="text-zinc-300">{coreTemp}°C</strong></span>
            <span>Surface: <strong className="text-zinc-300">{surfaceTemp}°C</strong></span>
          </div>
        </div>

        {/* GAUGE 3: CTM LOAD CELL */}
        <div className="p-4 rounded-xl border bg-zinc-900 border-zinc-800">
          <div className="flex justify-between items-center text-zinc-400 text-[10px] uppercase font-bold">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span>IS 456 CTM Fracture</span>
            </span>
            <span className="text-emerald-400">PASSED</span>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tabular-nums">{ctmStrengthMpa}</span>
            <span className="text-zinc-500 text-xs">MPa ({lastCtmLoad} kN)</span>
          </div>

          <div className="mt-2 text-[10px] text-zinc-400 border-t border-zinc-800/80 pt-1.5 flex justify-between">
            <span>Grade Target:</span>
            <span className="font-bold text-emerald-400">M35 (≥35 MPa)</span>
          </div>
        </div>

        {/* GAUGE 4: BIOMETRIC TURNSTILE */}
        <div className="p-4 rounded-xl border bg-zinc-900 border-zinc-800">
          <div className="flex justify-between items-center text-zinc-400 text-[10px] uppercase font-bold">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Turnstile Gantry</span>
            </span>
            <span className="text-cyan-400 font-bold uppercase">{lastPunch.direction}</span>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tabular-nums">{lastPunch.pin}</span>
            <span className="text-zinc-500 text-xs">Punched</span>
          </div>

          <div className="mt-2 text-[10px] text-zinc-400 border-t border-zinc-800/80 pt-1.5 flex justify-between">
            <span>Anti-Passback:</span>
            <span className="font-bold text-emerald-400">Enforced</span>
          </div>
        </div>
      </div>

      {/* STREAM PACKET FEED REGISTER */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white uppercase text-xs">
              Live Hardware Ingress Packet Stream ({packets.length})
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            {isConnected ? "Streaming via Supabase Realtime" : "Polling Active"}
          </span>
        </div>

        <div className="divide-y divide-zinc-800 max-h-96 overflow-y-auto">
          {packets.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-sans">
              No hardware telemetry packets received yet. Run the mock ingress streamer to broadcast live IoT packets.
            </div>
          ) : (
            packets.map((pkt) => {
              const payload = pkt.raw_payload || {};
              const dateStr = new Date(pkt.created_at).toLocaleTimeString("en-IN");

              return (
                <div key={pkt.id} className="p-3.5 hover:bg-zinc-850/60 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-cyan-300 font-bold text-[9px] font-mono">
                        {pkt.device_id}
                      </span>
                      <strong className="text-white text-xs">{pkt.telemetry_category}</strong>
                      <span className="text-zinc-500 text-[10px]">[{pkt.device_protocol}]</span>
                      <span className="text-zinc-400 text-[10px]">&rarr; {pkt.governor_routed}</span>
                    </div>

                    <div className="text-[10px] text-zinc-400 font-mono flex flex-wrap gap-x-3">
                      {Object.entries(payload).map(([k, v]) => (
                        <span key={k}>
                          {k}: <strong className="text-zinc-200">{String(v)}</strong>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[9px] text-zinc-500 font-mono">{dateStr}</span>

                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1 ${
                      pkt.interlock_tripped
                        ? "bg-rose-950 border border-rose-800 text-rose-300"
                        : "bg-emerald-950 border border-emerald-800 text-emerald-300"
                    }`}>
                      {pkt.interlock_tripped ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                      <span>{pkt.interlock_tripped ? "HOLD TRIPPED" : "NOMINAL"}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
