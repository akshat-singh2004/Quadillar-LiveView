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

async function simulateOfflineOutboxDrain() {
  console.log("\n\x1b[1;36m======================================================================\x1b[0m");
  console.log("\x1b[1;36m  TESTING OFFLINE FIELD OUTBOX PERSISTENCE & SEQUENTIAL FIFO REPLAY   \x1b[0m");
  console.log("\x1b[1;36m======================================================================\x1b[0m\n");

  // Simulated queue of actions captured while jobsite had ZERO cellular signal
  const offlineOutbox = [
    {
      queueId: "OFFLINE-CTM-8491",
      offlineTimestamp: "2026-10-07T05:45:00.000Z",
      category: "CTM_LOAD_CELL",
      deviceId: "CTM-FIELD-BASEMENT-01",
      protocol: "MODBUS_TCP",
      payload: {
        pourCardId: "PC-BASEMENT-B2",
        ageDays: 28,
        targetFckMpa: 35,
        failureLoadKn: 918,
        operatorName: "Site QA Tech (Offline Queue)",
      },
    },
    {
      queueId: "OFFLINE-TURNSTILE-8492",
      offlineTimestamp: "2026-10-07T05:46:12.000Z",
      category: "BIOMETRIC_TURNSTILE",
      deviceId: "TURNSTILE-GATE-NORTH",
      protocol: "WIEGAND",
      payload: {
        workerPin: "PIN-104",
        punchType: "INGRESS",
      },
    },
    {
      queueId: "OFFLINE-ANEMO-8493",
      offlineTimestamp: "2026-10-07T05:48:30.000Z",
      category: "WEATHER_ANEMOMETER",
      deviceId: "ANEMO-CRANE-TOWER-02",
      protocol: "HTTP_REST",
      payload: {
        windSpeedKmh: 21.4,
        rainfallRateMmh: 0.0,
      },
    },
  ];

  console.log(`\x1b[1;33m[*] Step 1: Simulating offline accumulation of ${offlineOutbox.length} field records...\x1b[0m`);
  offlineOutbox.forEach((item, idx) => {
    console.log(`  [${idx + 1}] ID: ${item.queueId} | Category: ${item.category} | Captured At: ${item.offlineTimestamp}`);
  });

  console.log(`\n\x1b[1;33m[*] Step 2: Network connectivity restored -> Initiating FIFO Outbox Drain...\x1b[0m`);

  for (let i = 0; i < offlineOutbox.length; i++) {
    const item = offlineOutbox[i];

    const req = new Request("http://localhost:3000/api/telemetry/ingress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "GOMTI-NAGAR-PH1-FITOUT",
        deviceId: item.deviceId,
        protocol: item.protocol,
        category: item.category,
        payload: {
          ...item.payload,
          _offlineRecordedAt: item.offlineTimestamp,
          _offlineReplayId: item.queueId,
        },
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    if (!data.success) {
      console.error(`  \x1b[1;31m✗ Replay Failed for ${item.queueId}:\x1b[0m`, data.error);
      process.exit(1);
    }

    console.log(`  \x1b[1;32m✓ Replayed ${item.queueId}\x1b[0m -> Routed: ${data.governorRouted} | Merkle Block: ${data.merkleSealHash.slice(0, 24)}...`);
  }

  console.log("\n\x1b[1;32m======================================================================\x1b[0m");
  console.log("\x1b[1;32m  ALL OFFLINE OUTBOX RECORDS REPLAYED & NOTARIZED WITH 100% SUCCESS   \x1b[0m");
  console.log("\x1b[1;32m======================================================================\x1b[0m\n");
}

simulateOfflineOutboxDrain().catch((err) => {
  console.error("Simulation fault:", err);
  process.exit(1);
});
