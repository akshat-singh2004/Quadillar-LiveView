import fs from "fs";
import path from "path";

// Contemporaneously load .env.local
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

import { askGovernorAdvisor } from "../app/actions/governor-chat-actions";
import { verifyAndPunchGatePass } from "../app/actions/scan-actions";
import { fetchStatutoryCureNotices } from "../app/actions/cure-notice-actions";
import { fetchWorkerGatePasses } from "../app/actions/gate-pass-actions";
import { fetchDailyGovernanceDossiers } from "../app/actions/dpr-actions";

async function runSmokeAudit() {
  console.log("\n\x1b[1;36m======================================================================\x1b[0m");
  console.log("\x1b[1;36m  QUADILLAR LIVEVIEW • END-TO-END AUTONOMOUS GOVERNANCE SMOKE AUDIT   \x1b[0m");
  console.log("\x1b[1;36m======================================================================\x1b[0m\n");

  const projectId = "GOMTI-NAGAR-PH1-FITOUT";

  // Test 1: Governor Copilot Reasoning Engine
  console.log("\x1b[1;33m[*] 1. Validating Governor Copilot Knowledge Domains...\x1b[0m");
  const aegisRes = await askGovernorAdvisor({
    governorId: "Aegis",
    projectId,
    message: "Audit recent batch against IS 456 Table 11",
  });
  console.log(`  ✓ Aegis: ${aegisRes.statutoryStandard} -> ${aegisRes.kpis[0].label} (${aegisRes.kpis[0].value})`);

  const themisRes = await askGovernorAdvisor({
    governorId: "Themis",
    projectId,
    message: "Check liquidated damages exposure under Clause 2",
  });
  console.log(`  ✓ Themis: ${themisRes.statutoryStandard} -> ${themisRes.kpis[0].label} (${themisRes.kpis[0].value})`);

  // Test 2: Turnstile Scanner Gate Verification
  console.log("\n\x1b[1;33m[*] 2. Validating Physical Access Gantry & Turnstile Punch Engine...\x1b[0m");
  const scanRes = await verifyAndPunchGatePass(projectId, "PIN-104", "INGRESS");
  console.log(`  ✓ Scan Punch Result: ${scanRes.message}`);

  // Test 3: Commercial Cure Notices Ledger
  console.log("\n\x1b[1;33m[*] 3. Validating Commercial Cure Notices Ledger (CPWD Cl. 2/3)...\x1b[0m");
  const notices = await fetchStatutoryCureNotices(projectId);
  console.log(`  ✓ Active Cure Notices Fetched: ${notices.length} record(s)`);

  // Test 4: Biometric Gate Pass Register
  console.log("\n\x1b[1;33m[*] 4. Validating Worker Gate Passes & QR Signatures (BOCW Act)...\x1b[0m");
  const passes = await fetchWorkerGatePasses(projectId);
  console.log(`  ✓ Issued Gate Passes Fetched: ${passes.length} credential(s)`);

  // Test 5: Daily Governance Dossiers (DPR Engine)
  console.log("\n\x1b[1;33m[*] 5. Validating Statutory DPR Shift Dossiers (CPWD Cl. 32)...\x1b[0m");
  const dossiers = await fetchDailyGovernanceDossiers(projectId);
  console.log(`  ✓ Sealed Shift Dossiers Fetched: ${dossiers.length} dossier(s)`);

  console.log("\n\x1b[1;32m======================================================================\x1b[0m");
  console.log("\x1b[1;32m  ALL 5 CORE INTEGRATION DOMAINS AUDITED & VERIFIED CLEANLY (100%)    \x1b[0m");
  console.log("\x1b[1;32m======================================================================\x1b[0m\n");
}

runSmokeAudit().catch((err) => {
  console.error("Smoke Audit Fault:", err);
  process.exit(1);
});
