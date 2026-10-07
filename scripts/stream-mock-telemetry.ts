import fs from "fs";
import path from "path";

// Load .env.local
for (const envFile of [".env.local", ".env"]) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        const key = k.trim();
        if (!process.env[key]) {
          process.env[key] = v.join("=").trim().replace(/^["']|["']$/g, "");
        }
      }
    }
  }
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "placeholder-service-key";
}

import { POST } from "../app/api/telemetry/ingress/route";

async function pushPacket(payload: any) {
  const req = new Request("http://localhost:3000/api/telemetry/ingress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const res = await POST(req);
  return await res.json();
}

async function runLiveStreamingSimulation() {
  console.log("\n\x1b[1;36m======================================================================\x1b[0m");
  console.log("\x1b[1;36m  BROADCASTING REAL-TIME HARDWARE SENSOR TELEMETRY STREAM            \x1b[0m");
  console.log("\x1b[1;36m======================================================================\x1b[0m\n");

  const streamFrames = [
    {
      deviceId: "ANEMO-TOWER-01",
      protocol: "MODBUS_TCP",
      category: "WEATHER_ANEMOMETER",
      payload: { windSpeedKmh: 19.8, rainfallRateMmh: 0.0 },
    },
    {
      deviceId: "RTD-CORE-B2",
      protocol: "HTTP_REST",
      category: "THERMOCOUPLE_RTD",
      payload: { coreTempC: 53.2, surfaceTempC: 37.1, hoursSincePour: 38 },
    },
    {
      deviceId: "TURNSTILE-GATE-MAIN",
      protocol: "WIEGAND",
      category: "BIOMETRIC_TURNSTILE",
      payload: { workerPin: "PIN-104", punchType: "INGRESS" },
    },
    {
      deviceId: "CTM-DIGITAL-01",
      protocol: "MODBUS_TCP",
      category: "CTM_LOAD_CELL",
      payload: { failureLoadKn: 912, ageDays: 28, targetFckMpa: 35 },
    },
    {
      deviceId: "CANBUS-POTAIN-01",
      protocol: "CANBUS",
      category: "EQUIPMENT_CANBUS",
      payload: { assetCode: "TC-POTAIN-01", actualHours: 7.8, fuelConsumedLiters: 88 },
    },
  ];

  for (let i = 0; i < streamFrames.length; i++) {
    const frame = streamFrames[i];
    const res = await pushPacket({
      projectId: "GOMTI-NAGAR-PH1-FITOUT",
      deviceId: frame.deviceId,
      protocol: frame.protocol,
      category: frame.category,
      payload: frame.payload,
    });

    console.log(`\x1b[1;33m[PACKET ${i + 1}/5]\x1b[0m ${frame.category} from \x1b[1;37m${frame.deviceId}\x1b[0m`);
    console.log(`  • Status  : ${res.success ? "Ingested & Broadcast" : "Error"}`);
    console.log(`  • Interlock: ${res.interlockTripped ? "⚠️ TRIPPED" : "NOMINAL"}`);
    console.log(`  • Merkle  : ${res.merkleSealHash?.slice(0, 24)}...`);
    console.log("");
  }

  console.log("\x1b[1;32m======================================================================\x1b[0m");
  console.log("\x1b[1;32m  ALL 5 MOCK TELEMETRY PACKETS BROADCAST VIA WEBSOCKET INGRESS PIPELINE\x1b[0m");
  console.log("\x1b[1;32m======================================================================\x1b[0m\n");
}

runLiveStreamingSimulation().catch((err) => {
  console.error("Simulation fault:", err);
  process.exit(1);
});
