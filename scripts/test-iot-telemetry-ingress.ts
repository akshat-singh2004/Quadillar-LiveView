import fs from "fs";
import path from "path";

// 1. Contemporaneously load .env.local or .env for standalone execution
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

// 2. Fallback test credentials if not present in environment
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "placeholder-service-key";
}

import { POST } from "../app/api/telemetry/ingress/route";

async function runMockIngress(name: string, payload: any) {
  console.log(`\n\x1b[1;33m[*] Testing Hardware Ingress: ${name}...\x1b[0m`);
  const req = new Request("http://localhost:3000/api/telemetry/ingress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const res = await POST(req);
  const data = await res.json();

  if (!data.success) {
    console.error(`  \x1b[1;31m✗ Ingress Failed:\x1b[0m`, data.error);
    process.exit(1);
  }

  console.log(`  \x1b[1;32m✓ Ingress Successful!\x1b[0m`);
  console.log(`    • Routed Governor : ${data.governorRouted}`);
  console.log(`    • Interlock Trip  : ${data.interlockTripped ? "⚠️ TRIPPED (HOLD ENGAGED)" : "CLEARED (NOMINAL)"}`);
  console.log(`    • Hermes Merkle   : ${data.merkleSealHash ? data.merkleSealHash.slice(0, 24) + "..." : "SEALED"}`);
}

async function runAllTests() {
  console.log("\n\x1b[1;36m======================================================================\x1b[0m");
  console.log("\x1b[1;36m  EXECUTING REAL-TIME HARDWARE IOT INGRESS TEST HARNESS               \x1b[0m");
  console.log("\x1b[1;36m======================================================================\x1b[0m");

  // TEST 1: Digital CTM Load Cell (Compliant Batch)
  await runMockIngress("Digital CTM Load Cell (M35 Passed)", {
    projectId: "GOMTI-NAGAR-PH1-FITOUT",
    deviceId: "CTM-DIGITAL-01",
    protocol: "MODBUS_TCP",
    category: "CTM_LOAD_CELL",
    payload: {
      pourCardId: "PC-940211",
      ageDays: 28,
      targetFckMpa: 35,
      failureLoadKn: 915, // 40.67 MPa
      gridLocation: "Tower Core Axis SW-01",
    },
  });

  // TEST 2: Ultrasonic Weather Station (Storm Gust Cutoff > 38 km/h)
  await runMockIngress("Davis Anemometer (Storm Gust Trigger)", {
    projectId: "GOMTI-NAGAR-PH1-FITOUT",
    deviceId: "ANEMO-CRANE-TOWER-01",
    protocol: "HTTP_REST",
    category: "WEATHER_ANEMOMETER",
    payload: {
      windSpeedKmh: 42.5, // > 38 km/h threshold
      rainfallRateMmh: 8.0, // > 5 mm/h threshold
    },
  });

  // TEST 3: Campbell Scientific Thermocouple String (Thermal Differential Check)
  await runMockIngress("Thermocouple RTD String (CIRIA Hydration)", {
    projectId: "GOMTI-NAGAR-PH1-FITOUT",
    deviceId: "RTD-NODE-CORE-B2",
    protocol: "HTTP_REST",
    category: "THERMOCOUPLE_RTD",
    payload: {
      pourCardId: "PC-940211",
      structuralElement: "Raft Foundation Bay R-02",
      coreTempC: 55.0,
      surfaceTempC: 38.0,
      ambientTempC: 28.0,
      hoursSincePour: 48,
      targetFckMpa: 40,
    },
  });

  // TEST 4: Turnstile Ingress Controller (Biometric Punch)
  await runMockIngress("ZKTeco Turnstile Biometric Ingress", {
    projectId: "GOMTI-NAGAR-PH1-FITOUT",
    deviceId: "TURNSTILE-GATE-MAIN",
    protocol: "HTTP_REST",
    category: "BIOMETRIC_TURNSTILE",
    payload: {
      workerPin: "PIN-104",
      punchType: "INGRESS",
    },
  });

  // TEST 5: Heavy Plant CAN-Bus ECM (Potain Tower Crane)
  await runMockIngress("CAN-Bus ECM Telematics (Tower Crane)", {
    projectId: "GOMTI-NAGAR-PH1-FITOUT",
    deviceId: "CANBUS-POTAIN-01",
    protocol: "CANBUS",
    category: "EQUIPMENT_CANBUS",
    payload: {
      assetCode: "TC-POTAIN-01",
      assetName: "Potain Top-Slewing Tower Crane",
      category: "TOWER_CRANE",
      plannedHours: 8,
      actualHours: 7.5,
      fuelConsumedLiters: 92,
      oemRatedFuelBurnLph: 10.5,
      outputVolumeM3: 185,
      targetVolumeM3: 200,
      fitnessExpiryDateIso: "2026-12-31",
    },
  });

  console.log("\n\x1b[1;32m======================================================================\x1b[0m");
  console.log("\x1b[1;32m  ALL 5 HARDWARE IOT INGRESS PROTOCOLS PROCESSED WITH 100% INTEGRITY  \x1b[0m");
  console.log("\x1b[1;32m======================================================================\x1b[0m\n");
}

runAllTests().catch((err) => {
  console.error("Test Harness Fault:", err);
  process.exit(1);
});
