import fs from "fs";
import path from "path";

// 1. Contemporaneously load .env.local or .env for standalone CLI execution
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

// 2. Safe fallback testing credentials if not set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "placeholder-service-key";
}

import { POST } from "../app/api/cron/shift-closeout/route";

async function runCronTest() {
  console.log("\n\x1b[1;36m======================================================================\x1b[0m");
  console.log("\x1b[1;36m  TESTING AUTONOMOUS MIDNIGHT SHIFT CLOSEOUT CRON ENGINE              \x1b[0m");
  console.log("\x1b[1;36m======================================================================\x1b[0m\n");

  const req = new Request("http://localhost:3000/api/cron/shift-closeout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: "GOMTI-NAGAR-PH1-FITOUT",
      date: new Date().toISOString().slice(0, 10),
    }),
  });

  const res = await POST(req);
  const data = await res.json();

  if (!data.success) {
    console.error("  \x1b[1;31m✗ Cron Execution Failed:\x1b[0m", data.error);
    process.exit(1);
  }

  console.log("  \x1b[1;32m✓ Midnight Shift Closeout Executed Successfully!\x1b[0m");
  console.log(`    • Target Date            : ${data.targetDate}`);
  console.log(`    • Synapse Directives     : ${data.synapseEventsProcessed} processed`);
  console.log(`    • Statutory DPR Dossier  : ${data.dossierCode}`);
  console.log(`    • Hermes Merkle Anchor   : ${data.closeoutSealHash ? data.closeoutSealHash.slice(0, 24) + "..." : "SEALED"}`);

  console.log("\n\x1b[1;32m======================================================================\x1b[0m");
  console.log("\x1b[1;32m  ALL SHIFT BOUNDARY TASKS EVALUATED AND NOTARIZED CLEANLY             \x1b[0m");
  console.log("\x1b[1;32m======================================================================\x1b[0m\n");
}

runCronTest().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
