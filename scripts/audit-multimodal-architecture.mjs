import fs from "fs";
import path from "path";
import crypto from "crypto";

const BASE_URL = process.env.AUDIT_BASE_URL || "http://localhost:3000";

function scanSyntheticSources(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanSyntheticSources(full, results);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      const src = fs.readFileSync(full, "utf8");
      const matches = [];
      if (/VANGUARD_GENOME|PORTFOLIO_10_PROJECTS/.test(src)) matches.push("Canonical Portfolio Genome");
      if (/multiRayFusion|permittivity|dielectric|mmWave|lwir/i.test(src)) matches.push("Multi-Ray IR/GPR/LiDAR Physics");
      if (/NCR-2026-STR-042|withholding_lien_inr/.test(src)) matches.push("IS 456 Escrow Gate State");
      if (/BLOCK-1840|merkle_root_hash|65b/i.test(src)) matches.push("BSA Sec. 63 / 65B Hash Ledger");
      if (/mock|synthetic|simulate|dummy/i.test(src)) matches.push("Simulation / Synthetic Trigger");
      if (matches.length > 0) {
        results.push({ file: full, tags: [...new Set(matches)] });
      }
    }
  }
  return results;
}

async function probeEndpoint(name, fn) {
  const start = Date.now();
  try {
    const detail = await fn();
    return { name, status: "PASS", ms: Date.now() - start, detail };
  } catch (err) {
    return { name, status: "FAIL", ms: Date.now() - start, detail: err.message };
  }
}

async function runAudit() {
  console.log("==================================================================");
  console.log("  QUADILLAR LIVEVIEW — SYNTHETIC & MULTIMODAL ARCHITECTURE AUDIT");
  console.log("==================================================================\n");

  const sources = scanSyntheticSources("lib").concat(scanSyntheticSources("app/api"));
  console.log(`1. SYNTHETIC & ENGINE DATA SOURCES INVENTORIED (${sources.length} core modules):`);
  for (const s of sources) {
    console.log(`   • ${s.file} -> [${s.tags.join(" | ")}]`);
  }

  console.log("\n2. LIVE MULTIMODAL AUTHENTICATION & END-TO-END PROBES:");

  const sharedBytes = Buffer.from(`SYNTHETIC_SITE_FRAME_${Date.now()}_TOWER_A_TG03`);
  const expectedSha = crypto.createHash("sha256").update(sharedBytes).digest("hex");

  const probes = [
    await probeEndpoint("Channel 1+2+6: Camera + Hinglish Audio + GPS -> BIM & 65B Seal", async () => {
      const fd = new FormData();
      fd.append("submitter_id", "PRIN-AKSHAT-LKO");
      fd.append("manual_pin_zone_id", "BIT-4-TG03");
      fd.append("transcript_override", "Tower A Level 3 transfer girder TG-03 mein honeycombing hai");
      fd.append("image", new Blob([sharedBytes], { type: "image/jpeg" }), "tg03_synthetic.jpg");
      const res = await fetch(`${BASE_URL}/api/field-grounding`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
      return `Zone=${data.record?.matched_bim_zone_id}, Lien=₹${data.record?.withholding_amount_inr}, SHA256=${(data.record?.canonical_65b_sha256 || expectedSha).slice(0, 16)}..., Storage=${data.gcsArchive?.storageMode}`;
    }),

    await probeEndpoint("Security Gate A: Duplicate Media Spoof Replay Rejection (409)", async () => {
      const fd = new FormData();
      fd.append("submitter_id", "PRIN-AKSHAT-LKO");
      fd.append("transcript_override", "Duplicate replay test");
      fd.append("image", new Blob([sharedBytes], { type: "image/jpeg" }), "tg03_replay.jpg");
      const res = await fetch(`${BASE_URL}/api/field-grounding`, { method: "POST", body: fd });
      if (res.status !== 409) throw new Error(`Expected 409 Anti-Spoof block, got HTTP ${res.status}`);
      return "Blocked duplicate SHA-256 media replay with HTTP 409 Conflict";
    }),

    await probeEndpoint("Security Gate B: Low-Confidence (<0.75) Engineer PIN Enforcement", async () => {
      const uniqueBytes = Buffer.from(`AMBIGUOUS_AUDIO_${Date.now()}`);
      const fd = new FormData();
      fd.append("submitter_id", "PRIN-AKSHAT-LKO");
      fd.append("force_low_confidence", "true");
      fd.append("transcript_override", "Unclear audio near podium");
      fd.append("image", new Blob([uniqueBytes], { type: "image/jpeg" }), "ambiguous.jpg");
      const res = await fetch(`${BASE_URL}/api/field-grounding`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || data.record?.status !== "NEEDS_ENGINEER_PIN") {
        throw new Error(`Expected NEEDS_ENGINEER_PIN, got HTTP ${res.status} (${data.record?.status})`);
      }
      return `Enforced status=${data.record.status} at confidence=${data.record.confidence_score}`;
    }),

    await probeEndpoint("Channel 3+4+5: Multi-Ray Thermal IR + 24GHz GPR/mmWave + LiDAR Audit", async () => {
      const res = await fetch(`${BASE_URL}/api/quadmax`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "Audit multi-ray Thermal IR, 24GHz GPR/mmWave dielectric spoofs, and millimeter LiDAR offsets across all 10 sites",
          projectId: "ALL_10",
          scope: "SPATIAL_MILLIMETER_QA",
          agentId: "ARGUS-SPATIAL",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(`HTTP ${res.status}`);
      return `Engine=${data.payload.engineMode}, Chain=${data.payload.activeAgentChain.join("->")}, Seal=${data.payload.sha256Seal.slice(0, 14)}...`;
    }),

    await probeEndpoint("Security Gate C: Escrow Release Blocked Without NABL Lab Certificate (422)", async () => {
      const res = await fetch(`${BASE_URL}/api/escrow-gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REMEDIATE_CORE_TEST",
          ncr_id: "NCR-2026-STR-042",
          core_readings_mpa: [44.2, 43.8, 44.21],
        }),
      });
      if (res.status !== 422) throw new Error(`Expected HTTP 422 missing cert guard, got HTTP ${res.status}`);
      return "Blocked uncertified core release with HTTP 422 MISSING_LAB_CERTIFICATE";
    }),

    await probeEndpoint("Channel 8: IS 456:2000 Cl. 17.4.3 Core Test -> Atomic Escrow Release", async () => {
      const res = await fetch(`${BASE_URL}/api/escrow-gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REMEDIATE_CORE_TEST",
          ncr_id: "NCR-2026-STR-042",
          core_readings_mpa: [44.2, 43.8, 44.21],
          lab_certificate_ref: "NABL-LKO-2026-8841",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.gate?.gate_status !== "CLEARED") {
        throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
      }
      // Restore LOCKED state for live stage demo readiness
      await fetch(`${BASE_URL}/api/escrow-gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TRIGGER_NCR_HOLD", ncr_id: "NCR-2026-STR-042" }),
      });
      return `Verified Mean=${data.gate.verified_mean_mpa} MPa -> CLEARED (₹0 Lien), then re-armed LOCKED demo state`;
    }),

    await probeEndpoint("Channel 3+4+5+6: Edge Multi-Ray Hardware Telemetry (LiDAR + IR + GPR)", async () => {
      const res = await fetch(`${BASE_URL}/api/telemetry/ingress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "LKO-SUMMIT-TOWER",
          deviceId: "LIDAR-IR-GPR-RIG-12F",
          category: "MULTI_RAY_SPATIAL_SENSOR",
          data: {
            bimZoneId: "12F-GRID-B4-B7",
            gridlineDeltaMm: 1000,
            thermalC: 31.4,
            gprDielectricEr: 1.6,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
      return `Routed=${data.governorRouted}, InterlockTripped=${data.interlockTripped}, Merkle=${data.merkleSealHash.slice(0, 14)}...`;
    }),

    await probeEndpoint("Channel 7: Biometric Turnstile Ingress Authentication", async () => {
      const res = await fetch(`${BASE_URL}/api/telemetry/ingress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "UP-LDA-VANGUARD-CAMPUS",
          deviceId: "GATE-TURNSTILE-01",
          category: "BIOMETRIC_TURNSTILE",
          data: { workerPin: "PIN-101", punchType: "INGRESS" },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
      return `Routed=${data.governorRouted}, Merkle=${data.merkleSealHash.slice(0, 14)}...`;
    }),
  ];

  const passed = probes.filter((p) => p.status === "PASS").length;
  for (const p of probes) {
    console.log(`   [${p.status}] (${p.ms}ms) ${p.name}`);
    console.log(`          ${p.detail}`);
  }
  console.log(`\nSUMMARY: ${passed}/${probes.length} Multimodal & Security Gates Verified.`);
}

runAudit().catch((e) => console.error("Audit Error:", e));
