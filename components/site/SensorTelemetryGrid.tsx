"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { SiteSensorTelemetry } from "@/types/construction";

const seedSensors: SiteSensorTelemetry[] = [
  { id: "sensor-1", projectId: "proj-1", metric: "Wind Anemometer", location: "Tower Crane 02 / Roofline", value: 31, unit: "km/h", threshold: 38, status: "Healthy", timestamp: new Date().toISOString(), trend: [24, 27, 26, 31, 29, 31] },
  { id: "sensor-2", projectId: "proj-1", metric: "Concrete Cure Temperature", location: "Level 03 / S-204 pour", value: 27.4, unit: "°C", threshold: 30, status: "Healthy", timestamp: new Date().toISOString(), trend: [22, 24, 26, 25, 27, 27.4] },
  { id: "sensor-3", projectId: "proj-1", metric: "Noise", location: "North Facade / Steel erection", value: 68, unit: "dB", threshold: 85, status: "Healthy", timestamp: new Date().toISOString(), trend: [55, 59, 62, 66, 68, 68] },
  { id: "sensor-4", projectId: "proj-1", metric: "Air Quality PM2.5", location: "Site entry / PM2.5", value: 22, unit: "µg/m³", threshold: 90, status: "Healthy", timestamp: new Date().toISOString(), trend: [18, 20, 19, 22, 24, 22] },
  { id: "sensor-5", projectId: "proj-1", metric: "Air Quality PM10", location: "Site entry / PM10", value: 48, unit: "µg/m³", threshold: 150, status: "Healthy", timestamp: new Date().toISOString(), trend: [42, 45, 43, 48, 51, 48] },
];

function formatTrendPath(values: number[]) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);

  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 120;
      const y = 44 - ((value - min) / range) * 28;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export function SensorTelemetryGrid() {
  const [sensors, setSensors] = useState<SiteSensorTelemetry[]>(seedSensors);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const channel = supabase.channel("iot-telemetry");

    const subscription = channel
      .on("postgres_changes", { event: "*", schema: "public", table: "iot_sensor_telemetry" }, (payload) => {
        const row = payload.new as Partial<SiteSensorTelemetry> & Record<string, unknown>;
        const next: SiteSensorTelemetry = {
          id: String(row.id ?? `sensor-${Date.now()}`),
          projectId: String(row.project_id ?? "proj-1"),
          metric: (row.metric as SiteSensorTelemetry["metric"]) ?? "Wind Anemometer",
          location: String(row.location ?? "Site zone"),
          value: Number(row.value ?? 0),
          unit: String(row.unit ?? ""),
          threshold: Number(row.threshold ?? 0),
          status: (row.status as SiteSensorTelemetry["status"]) ?? "Healthy",
          timestamp: String(row.timestamp ?? new Date().toISOString()),
          trend: Array.isArray(row.trend) ? row.trend.map((item) => Number(item)) : [0, 1, 2],
        };

        setSensors((current) => {
          const existing = current.find((sensor) => sensor.id === next.id);
          if (existing) {
            return current.map((sensor) => (sensor.id === next.id ? next : sensor));
          }
          return [...current, next];
        });
      })
      .subscribe();

    return () => {
      void subscription;
      void supabase.removeChannel(channel);
    };
  }, []);

  const hazardPresent = sensors.some((sensor) => sensor.metric === "Wind Anemometer" && sensor.value > 38);

  const cards = useMemo(
    () => sensors.map((sensor) => {
      const isCritical = sensor.metric === "Wind Anemometer" ? sensor.value > 38 : sensor.value > sensor.threshold * 0.9;
      const statusColor = isCritical ? "#f87171" : sensor.status === "Watch" ? "#fbbf24" : "#34d399";

      return {
        ...sensor,
        statusColor,
        dial: sensor.metric === "Wind Anemometer" ? Math.min((sensor.value / sensor.threshold) * 100, 100) : Math.min((sensor.value / Math.max(sensor.threshold, 1)) * 100, 100),
      };
    }),
    [sensors],
  );

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {hazardPresent ? (
        <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(248,113,113,0.5)", borderRadius: 16, padding: "12px 16px", color: "#fee2e2", fontWeight: 800 }}>
          ⚠️ Wind hazard lockout active: tower crane wind exceeds safe operating threshold.
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
        {cards.map((sensor) => (
          <div key={sensor.id} style={{ background: "rgba(15,23,42,0.82)", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 18, padding: 18, display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>{sensor.metric}</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{sensor.value}{sensor.unit}</div>
              </div>
              <div style={{ padding: "6px 10px", borderRadius: 999, background: `${sensor.statusColor}22`, border: `1px solid ${sensor.statusColor}`, color: sensor.statusColor, fontSize: 12, fontWeight: 800 }}>
                {sensor.status}
              </div>
            </div>

            <div style={{ position: "relative", height: 80, display: "grid", placeItems: "center" }}>
              <div style={{ width: 120, height: 120, borderRadius: "50%", border: "12px solid rgba(148,163,184,0.12)", borderTopColor: sensor.statusColor, transform: "rotate(-90deg)" }} />
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                <div style={{ width: 2, height: 44, background: sensor.statusColor, borderRadius: 999, transform: `translateY(-${(sensor.dial / 100) * 30}px) rotate(${(sensor.dial / 100) * 180 - 90}deg)`, transformOrigin: "center bottom" }} />
              </div>
            </div>

            <svg viewBox="0 0 120 48" width="100%" height="48" aria-label={`${sensor.metric} trend`}>
              <path d={formatTrendPath(sensor.trend)} fill="none" stroke={sensor.statusColor} strokeWidth="2.5" strokeLinecap="round" />
            </svg>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, color: "#cbd5e1" }}>
              <span>{sensor.location}</span>
              <span>{new Date(sensor.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
