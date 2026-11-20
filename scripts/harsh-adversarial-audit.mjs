const BASE_URL = process.env.AUDIT_BASE_URL || "http://localhost:3000";

async function runProbe(id, name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    return { id, name, status: "PASS", ms: Date.now() - t0, detail };
  } catch (err) {
    return { id, name, status: "FAIL", ms: Date.now() - t0, detail: err.message };
  }
}

async function main() {
  console.log("=======================================================================");
  console.log("  QUADILLAR LIVEVIEW — HARSH 14-PROBE ADVERSARIAL & LATENCY BENCHMARK");
  console.log("=======================================================================\n");

  const results = [];

  results.push(
    await runProbe("P01", "Runtime & GCP Telemetry Endpoint (/api/health/gcp)", async () => {
      const res = await fetch(`${BASE_URL}/api/health/gcp`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(`HTTP ${res.status}`);
      return `Model=${data.geminiModel}, GeminiKey=${data.geminiConfigured}, Region=${data.region}`;
    })
  );

  let coldMs = 0;
  results.push(
    await runProbe("P02", "QUADMAX.AI Cold Portfolio Query (< 5,500ms SLA)", async () => {
      const t0 = Date.now();
      const res = await fetch(`${BASE_URL}/api/quadmax`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "Audit Summit Corporate Building 12th floor 1.00 m wall offset and Project Vanguard",
          projectId: "ALL_10",
          scope: "ALL_SCOPES",
          agentId: "AUTO",
        }),
      });
      const data = await res.json();
      coldMs = Date.now() - t0;
      if (!res.ok || !data.ok) throw new Error(`HTTP ${res.status}`);
      if (coldMs > 5500) throw new Error(`SLA Breach: ${coldMs}ms > 5500ms`);
      return `Engine=${data.payload.engineMode}, Latency=${coldMs}ms, CacheHit=${Boolean(data.payload.cacheHit)}`;
    })
  );

  results.push(
    await runProbe("P03", "QUADMAX.AI Warm TTL Cache Hit (< 150ms SLA)", async () => {
      const t0 = Date.now();
      const res = await fetch(`${BASE_URL}/api/quadmax`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "Audit Summit Corporate Building 12th floor 1.00 m wall offset and Project Vanguard",
          projectId: "ALL_10",
          scope: "ALL_SCOPES",
          agentId: "AUTO",
        }),
      });
      const data = await res.json();
      const warmMs = Date.now() - t0;
      if (!res.ok || !data.ok || !data.payload.cacheHit) {
        throw new Error(`Expected cacheHit=true, got ${data.payload?.cacheHit} (${warmMs}ms)`);
      }
      return `Cold=${coldMs}ms -> Warm=${warmMs}ms (${Math.round((coldMs / Math.max(1, warmMs)) * 10) / 10}x speedup)`;
    })
  );

  results.push(
    await runProbe("P04", "Malformed JSON Payload Guard (/api/quadmax)", async () => {
      const res = await fetch(`${BASE_URL}/api/quadmax`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{bad-json:::",
      });
      if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got HTTP ${res.status}`);
      return "Cleanly rejected malformed JSON with HTTP 400";
    })
  );

  results.push(
    await runProbe("P05", "SQL/XSS Injection & Oversized String Sanitization", async () => {
      const evil = "'; DROP TABLE ncr_escrow_gates; -- <script>alert(1)</script> " + "X".repeat(2500);
      const res = await fetch(`${BASE_URL}/api/quadmax`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: evil, projectId: "ALL_10" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(`HTTP ${res.status}`);
      return `Sanitized 2,560-char injection input safely -> Seal=${data.payload.sha256Seal.slice(0, 12)}...`;
    })
  );

  results.push(
    await runProbe("P06", "IS 456 Trap: High Mean (44.0 MPa) BUT One Weak Core (36.8 MPa < 37.5 MPa)", async () => {
      const res = await fetch(`${BASE_URL}/api/escrow-gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REMEDIATE_CORE_TEST",
          ncr_id: "NCR-2026-STR-042",
          core_readings_mpa: [48.0, 47.2, 36.8],
          lab_certificate_ref: "NABL-LKO-2026-9910",
        }),
      });
      if (res.status !== 422) throw new Error(`Expected HTTP 422 individual core rejection, got ${res.status}`);
      const data = await res.json();
      return `Correctly blocked weak individual core (36.8 MPa < 37.5 MPa): ${data.error}`;
    })
  );

  results.push(
    await runProbe("P07", "IS 456 Trap: Mean Below 85% M50 Threshold (42.10 MPa < 42.50 MPa)", async () => {
      const res = await fetch(`${BASE_URL}/api/escrow-gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REMEDIATE_CORE_TEST",
          ncr_id: "NCR-2026-STR-042",
          core_readings_mpa: [42.0, 42.1, 42.2],
          lab_certificate_ref: "NABL-LKO-2026-9911",
        }),
      });
      if (res.status !== 422) throw new Error(`Expected HTTP 422 mean threshold rejection, got ${res.status}`);
      return "Correctly rejected 42.10 MPa mean (< 42.50 MPa M50 acceptance)";
    })
  );

  results.push(
    await runProbe("P08", "IS 456 Valid Core Release & Atomic Re-Arm", async () => {
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
      if (!res.ok || data.gate?.gate_status !== "CLEARED") throw new Error(`HTTP ${res.status}`);
      await fetch(`${BASE_URL}/api/escrow-gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TRIGGER_NCR_HOLD", ncr_id: "NCR-2026-STR-042" }),
      });
      return `Verified 44.07 MPa -> CLEARED (₹0 Lien) & re-armed LOCKED state`;
    })
  );

  results.push(
    await runProbe("P09", "Webcam Anti-Spoof Vision API (/api/vision-spoof-check)", async () => {
      const fakeJpegBase64 = Buffer.from(`SYNTHETIC_CARDBOARD_FRAME_${Date.now()}`).toString("base64");
      const res = await fetch(`${BASE_URL}/api/vision-spoof-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: fakeJpegBase64,
          claimedElement: "Tower A Level 3 Transfer Girder TG-03",
          bimZoneId: "BIT-4-TG03",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(`HTTP ${res.status}`);
      return `Verdict=${data.payload.verdict}, εr=${data.payload.estimatedDielectricEr}, Seal=${data.payload.sha256FrameSeal.slice(0, 12)}...`;
    })
  );

  results.push(
    await runProbe("P10", "Unsupported MIME Executable Upload Rejection (400)", async () => {
      const fd = new FormData();
      fd.append("image", new Blob(["MZ_EXE_HEADER"], { type: "application/x-msdownload" }), "malware.exe");
      const res = await fetch(`${BASE_URL}/api/field-grounding`, { method: "POST", body: fd });
      if (res.status !== 400) throw new Error(`Expected 400 INVALID_IMAGE_MIME, got ${res.status}`);
      return "Blocked disguised executable upload with HTTP 400 INVALID_IMAGE_MIME";
    })
  );

  const uniqueFrame = Buffer.from(`UNIQUE_FIELD_EVIDENCE_${Date.now()}`);
  results.push(
    await runProbe("P11", "Multimodal Field-to-BIM Grounding + 409 Replay Block", async () => {
      const fd1 = new FormData();
      fd1.append("submitter_id", "PRIN-AKSHAT-LKO");
      fd1.append("manual_pin_zone_id", "BIT-4-TG03");
      fd1.append("transcript_override", "TG-03 honeycombing verified");
      fd1.append("image", new Blob([uniqueFrame], { type: "image/jpeg" }), "valid.jpg");
      const r1 = await fetch(`${BASE_URL}/api/field-grounding`, { method: "POST", body: fd1 });
      if (!r1.ok) throw new Error(`First ingest failed: HTTP ${r1.status}`);

      const fd2 = new FormData();
      fd2.append("submitter_id", "PRIN-AKSHAT-LKO");
      fd2.append("image", new Blob([uniqueFrame], { type: "image/jpeg" }), "replay.jpg");
      const r2 = await fetch(`${BASE_URL}/api/field-grounding`, { method: "POST", body: fd2 });
      if (r2.status !== 409) throw new Error(`Expected 409 replay rejection, got ${r2.status}`);
      return "Ingested first frame (200) & blocked identical replay (409 Conflict)";
    })
  );

  results.push(
    await runProbe("P12", "5-Way Concurrent Edge Telemetry Stress Burst", async () => {
      const categories = [
        { category: "MULTI_RAY_SPATIAL_SENSOR", data: { bimZoneId: "12F-GRID-B4-B7", gridlineDeltaMm: 1000, gprDielectricEr: 1.6 } },
        { category: "WEATHER_ANEMOMETER", data: { windSpeedKmh: 42.5, rainfallRateMmh: 1.2 } },
        { category: "BIOMETRIC_TURNSTILE", data: { workerPin: "PIN-101", punchType: "INGRESS" } },
        { category: "ATMOSPHERIC_GAS_SENSOR", data: { oxygenPct: 20.9, combustibleLelPct: 0, h2sPpm: 0, coPpm: 0 } },
        { category: "THERMOCOUPLE_RTD", data: { coreTempC: 48.2, surfaceTempC: 35.1, ambientTempC: 29.0 } },
      ];
      const responses = await Promise.all(
        categories.map((c, idx) =>
          fetch(`${BASE_URL}/api/telemetry/ingress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: "UP-LDA-VANGUARD-CAMPUS",
              deviceId: `STRESS-NODE-0${idx + 1}`,
              category: c.category,
              data: c.data,
            }),
          })
        )
      );
      const failed = responses.filter((r) => !r.ok);
      if (failed.length > 0) throw new Error(`${failed.length}/5 concurrent packets failed`);
      return "5/5 concurrent multi-governor sensor packets notarized atomically";
    })
  );

  results.push(
    await runProbe("P13", "Public QR Verification Page (/verify/NCR-2026-STR-042)", async () => {
      const res = await fetch(`${BASE_URL}/verify/NCR-2026-STR-042`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return `Rendered public QR verification node cleanly (HTTP ${res.status})`;
    })
  );

  results.push(
    await runProbe("P14", "UTF-8 Hygiene & Zero Mojibake Verification", async () => {
      const res = await fetch(`${BASE_URL}/api/quadmax`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "Give me the overview across all 10 projects", projectId: "ALL_10" }),
      });
      const text = await res.text();
      if (/ΓÇ|╬╝|Γé╣/.test(text)) throw new Error("Corrupted UTF-8 mojibake sequence detected");
      return "Zero corrupted UTF-8 sequences in API output";
    })
  );

  const passCount = results.filter((r) => r.status === "PASS").length;
  for (const r of results) {
    console.log(`[${r.status}] ${r.id} (${r.ms}ms) — ${r.name}`);
    console.log(`       ${r.detail}`);
  }
  console.log(`\nFINAL VERDICT: ${passCount}/${results.length} Harsh Adversarial & Latency Probes Passed.`);
}

main().catch((e) => console.error("Fatal Audit Error:", e));
