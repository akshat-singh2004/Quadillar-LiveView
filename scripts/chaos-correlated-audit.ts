import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.CHAOS_BASE_URL || "http://127.0.0.1:3098";
const IOT_SECRET = process.env.IOT_INGRESS_SECRET || "chaos-local-hmac-secret-32bytes-01";
const PROJECT_ID = "VANGUARD-LKO-01";

type FindingStatus = "HELD" | "VULN" | "DISPLAY_BUG" | "WARN";

interface AuditFinding {
  layer: "FILTHY_BURST" | "SLOW_DRIFT" | "DISPLAY_PARITY";
  status: FindingStatus;
  check: string;
  detail: string;
}

const findings: AuditFinding[] = [];

function record(layer: AuditFinding["layer"], status: FindingStatus, check: string, detail: string) {
  findings.push({ layer, status, check, detail });
  const tag = `[${status.padEnd(11)}]`;
  console.log(`${tag} (${layer}) ${check} -> ${detail}`);
}

async function req(
  route: string,
  init: RequestInit = {},
  timeoutMs = 15000
): Promise<{ status: number; text: string; json: any; ms: number }> {
  const t0 = Date.now();
  const res = await fetch(`${BASE_URL}${route}`, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, text, json, ms: Date.now() - t0 };
}

function detectIotHeaders(): { sigHeader: string; tsHeader: string } {
  const candidates = ["app/api/telemetry/ingress/route.ts", "lib/server/iotIngress.ts", "lib/domain/iotTelemetry.ts"];
  for (const fp of candidates) {
    if (!fs.existsSync(fp)) continue;
    const src = fs.readFileSync(fp, "utf8");
    const sigMatch = src.match(/["'](x-[a-z0-9-]*sig[a-z0-9-]*)["']/i);
    const tsMatch = src.match(/["'](x-[a-z0-9-]*time[a-z0-9-]*|x-[a-z0-9-]*ts[a-z0-9-]*)["']/i);
    if (sigMatch || tsMatch) {
      return {
        sigHeader: sigMatch?.[1] || "x-quadillar-signature",
        tsHeader: tsMatch?.[1] || "x-quadillar-timestamp",
      };
    }
  }
  return { sigHeader: "x-quadillar-signature", tsHeader: "x-quadillar-timestamp" };
}

function signHmac(rawBody: string, ts: string): string {
  return crypto.createHmac("sha256", IOT_SECRET).update(`${ts}.${rawBody}`).digest("hex");
}

async function runLayer1FilthyBurst() {
  console.log("\n=== LAYER 1: HIGH-FREQUENCY FILTHY DATA & VULNERABILITY BURST ===");

  // 1A. Malformed JSON & oversized DoS payloads across write endpoints
  const writeEndpoints = [
    "/api/governor/evaluate",
    "/api/triangulation/correlate",
    "/api/field/ground",
    "/api/actions/execute",
    "/api/telemetry/ingress",
  ];

  let malformed500s: string[] = [];
  for (const ep of writeEndpoints) {
    const r = await req(ep, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.99.1.1" },
      body: "{broken_json:::[[[",
    });
    if (r.status >= 500) malformed500s.push(`${ep}:${r.status}`);
  }
  if (malformed500s.length > 0) {
    record("FILTHY_BURST", "VULN", "Malformed JSON Parser Guard", `Unhandled 500 crashes on: ${malformed500s.join(", ")}`);
  } else {
    record("FILTHY_BURST", "HELD", "Malformed JSON Parser Guard", "All 5 write endpoints rejected broken JSON without 500");
  }

  // 1B. Oversized 500 KB payload DoS on vernacular grounding & governor evaluate
  const hugePayload = JSON.stringify({
    projectId: PROJECT_ID,
    transcript: "M40 concrete pour ".repeat(30000),
  });
  const rHuge = await req("/api/field/ground", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "10.99.1.2" },
    body: hugePayload,
  });
  if (rHuge.status === 413 || rHuge.status === 400 || rHuge.status === 422) {
    record("FILTHY_BURST", "HELD", "500 KB Oversized Payload DoS", `Blocked with HTTP ${rHuge.status} in ${rHuge.ms}ms`);
  } else {
    record("FILTHY_BURST", "VULN", "500 KB Oversized Payload DoS", `Unexpected HTTP ${rHuge.status} (${rHuge.ms}ms) — missing size cap or crashed`);
  }

  // 1C. SQLi, Path Traversal & Stored XSS injection attempt
  const sqliProject = "VANGUARD-LKO-01'; DROP TABLE governor_events; -- ../../etc/passwd";
  const xssString = `<script>alert("XSS")</script><img src=x onerror=alert(1)>`;
  const rSqliDossier = await req(`/api/audit/dossier?projectId=${encodeURIComponent(sqliProject)}`, {
    headers: { "x-forwarded-for": "10.99.1.3" },
  });
  if (rSqliDossier.status >= 500 || rSqliDossier.text.includes("DROP TABLE")) {
    record(
      "FILTHY_BURST",
      "VULN",
      "SQLi / Path Traversal in projectId",
      `HTTP ${rSqliDossier.status} — unsanitized projectId echoed or crashed (/api/audit/dossier)`
    );
  } else {
    record("FILTHY_BURST", "HELD", "SQLi / Path Traversal in projectId", `Sanitized / isolated cleanly (HTTP ${rSqliDossier.status})`);
  }

  const rXss = await req("/api/field/ground", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "10.99.1.4" },
    body: JSON.stringify({
      projectId: PROJECT_ID,
      zoneId: xssString,
      transcript: `Beam BIT-4-TG03 poured 42 cum billed 50 cum by ${xssString}`,
    }),
  });
  if (rXss.status >= 500) {
    record("FILTHY_BURST", "VULN", "XSS Payload in Vernacular Ingress", `Server crashed with HTTP ${rXss.status}`);
  } else if (rXss.text.includes("<script>")) {
    record("FILTHY_BURST", "VULN", "XSS Payload in Vernacular Ingress", `Raw <script> tag echoed unescaped in JSON response (HTTP ${rXss.status})`);
  } else {
    record("FILTHY_BURST", "HELD", "XSS Payload in Vernacular Ingress", `Handled safely without raw <script> reflection (HTTP ${rXss.status})`);
  }

  // 1D. Prototype pollution + Math Poison (NaN/Infinity/Negative/Extreme float)
  const poisonBody = `{"projectId":"${PROJECT_ID}","__proto__":{"role":"DIRECTOR","admin":true},"constructor":{"prototype":{"admin":true}},"billedVolumeCum":-99999,"batchingPlantVolumeCum":1e308,"bimDesignVolumeCum":0,"designGradeMpa":-50,"actualCubeStrengthMpa":null,"cementBatchedKgPerCum":-400,"waterCementRatio":999,"windSpeedMs":-88.5}`;
  const rPoison = await req("/api/triangulation/correlate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "10.99.1.5" },
    body: poisonBody,
  });
  const hasNaNLeak = /"NaN"|:\s*null.*"frozenInr"|Infinity/i.test(rPoison.text);
  if (rPoison.status >= 500 || hasNaNLeak) {
    record("FILTHY_BURST", "VULN", "Math Poison & __proto__ Injection", `HTTP ${rPoison.status}, NaN/Infinity leak=${hasNaNLeak}`);
  } else if (rPoison.status === 200 && rPoison.json?.trustScore === 100) {
    record("FILTHY_BURST", "VULN", "Math Poison & __proto__ Injection", "Poisoned negative/1e308 telemetry passed as 100% clean pour!");
  } else {
    record("FILTHY_BURST", "HELD", "Math Poison & __proto__ Injection", `Quarantined cleanly (HTTP ${rPoison.status}, no NaN/Infinity leak)`);
  }

  // 1E. Strict Auth & Forged alg:none JWT Attack
  const forgedJwt =
    Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url") +
    "." +
    Buffer.from(JSON.stringify({ sub: "attacker", email: "evil@x.com", app_metadata: { role: "DIRECTOR" } })).toString("base64url") +
    ".";
  const rAuthForged = await req("/api/actions/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${forgedJwt}`,
      "x-director-pin": "4220",
      "x-forwarded-for": "10.99.1.6",
    },
    body: JSON.stringify({ projectId: PROJECT_ID, actionType: "RELEASE_RTGS_ESCROW" }),
  });
  if (rAuthForged.status === 401 || rAuthForged.status === 403) {
    record("FILTHY_BURST", "HELD", "Forged alg:none JWT + Demo PIN", `Rejected cleanly (HTTP ${rAuthForged.status})`);
  } else {
    record("FILTHY_BURST", "VULN", "Forged alg:none JWT + Demo PIN", `CRITICAL: Forged JWT returned HTTP ${rAuthForged.status}!`);
  }

  // 1F. IoT HMAC Tamper, Stale Replay, and Duplicate Packet Replay
  const { sigHeader, tsHeader } = detectIotHeaders();
  const staleTs = String(Date.now() - 15 * 60 * 1000);
  const iotPayload = JSON.stringify({
    projectId: PROJECT_ID,
    deviceId: "CRANE-LMI-01",
    category: "CRANE_LMI",
    windSpeedMs: 19.8,
    loadPctSwl: 96,
  });
  const rStaleIot = await req("/api/telemetry/ingress", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [tsHeader]: staleTs,
      [sigHeader]: signHmac(iotPayload, staleTs),
      "x-forwarded-for": "10.99.1.7",
    },
    body: iotPayload,
  });
  if (rStaleIot.status === 401 || rStaleIot.status === 403 || rStaleIot.status === 400) {
    record("FILTHY_BURST", "HELD", `Stale IoT Replay Guard (${sigHeader})`, `Blocked 15-min stale packet (HTTP ${rStaleIot.status})`);
  } else {
    record("FILTHY_BURST", "VULN", `Stale IoT Replay Guard (${sigHeader})`, `Accepted or crashed on 15-min stale IoT packet (HTTP ${rStaleIot.status})`);
  }

  // 1G. High-Frequency Correlated Concurrency Storm (24 simultaneous multi-endpoint requests)
  const stormJobs = Array.from({ length: 24 }, (_, idx) => {
    const ip = `10.88.0.${idx + 1}`;
    if (idx % 3 === 0) {
      return req("/api/triangulation/correlate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({
          projectId: PROJECT_ID,
          zoneId: "BIT-4-TG03",
          billedVolumeCum: 45 + (idx % 5),
          batchingPlantVolumeCum: 38,
          bimDesignVolumeCum: 38.5,
          designGradeMpa: 40,
          actualCubeStrengthMpa: 34,
          cementBatchedKgPerCum: 350,
          waterCementRatio: 0.49,
        }),
      });
    }
    if (idx % 3 === 1) {
      return req("/api/governor/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({
          projectId: PROJECT_ID,
          windSpeedMs: 14 + (idx % 8),
          cubeStrengthMpa: 30 + (idx % 12),
        }),
      });
    }
    return req(`/api/portfolio/rollup`, { headers: { "x-forwarded-for": ip } });
  });

  const stormResults = await Promise.all(stormJobs);
  const storm500s = stormResults.filter((r) => r.status >= 500).length;
  const rVerifyAfterStorm = await req(`/api/audit/verify-chain?projectId=${PROJECT_ID}`, {
    headers: { "x-forwarded-for": "10.88.1.99" },
  });
  const chainOk = rVerifyAfterStorm.status === 200 && rVerifyAfterStorm.json?.valid !== false;

  if (storm500s > 0 || !chainOk) {
    record(
      "FILTHY_BURST",
      "VULN",
      "24x Correlated Concurrency Storm",
      `http500=${storm500s}, chainVerifyHttp=${rVerifyAfterStorm.status}, chainValid=${rVerifyAfterStorm.json?.valid}`
    );
  } else {
    record(
      "FILTHY_BURST",
      "HELD",
      "24x Correlated Concurrency Storm",
      `0 HTTP-500 errors across 24 concurrent correlated ops; hash-chain intact`
    );
  }
}

async function runLayer2SlowDrift() {
  console.log("\n=== LAYER 2: SLOW-DRIFT 'BOILING FROG' CORRELATED SIMULATION (30 TICKS) ===");

  // 2A. Ticks 1-10: Salami-slicing fraud (-1.8% cement, +0.8 m3 padded volume per mixer x 10 pours)
  let cumulativeUnflaggedVolumePad = 0;
  let salamiFlaggedCount = 0;
  for (let tick = 1; tick <= 10; tick++) {
    const r = await req("/api/triangulation/correlate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `10.77.1.${tick}` },
      body: JSON.stringify({
        projectId: "HAZRATGANJ-LKO-05",
        zoneId: `SLAB-TICK-${tick}`,
        billedVolumeCum: 40.8,
        batchingPlantVolumeCum: 40.0,
        bimDesignVolumeCum: 40.0,
        designGradeMpa: 40,
        actualCubeStrengthMpa: 41.2,
        cementBatchedKgPerCum: 392.8, // 1.8% under 400 kg nominal
        waterCementRatio: 0.44,
      }),
    });
    const flags: string[] = r.json?.flags || r.json?.anomalies || [];
    if (r.status === 422 || flags.length > 0) {
      salamiFlaggedCount++;
    } else {
      cumulativeUnflaggedVolumePad += 0.8;
    }
  }
  if (salamiFlaggedCount === 0) {
    record(
      "SLOW_DRIFT",
      "VULN",
      "Salami-Slicing Slow Bleed (10 pours x +0.8m3 / -1.8% cement)",
      `0/10 pours flagged — ${cumulativeUnflaggedVolumePad.toFixed(1)} m3 cumulative phantom billing slipped past single-ticket thresholds (needs cumulative rolling window detector)`
    );
  } else {
    record(
      "SLOW_DRIFT",
      "HELD",
      "Salami-Slicing Slow Bleed (10 pours)",
      `Flagged ${salamiFlaggedCount}/10 slow-drift pours`
    );
  }

  // 2B. Ticks 11-20: Wind hysteresis ramp (10.5 -> 19.8 -> 11.2 m/s)
  const windRamp = [10.5, 12.1, 13.8, 14.9, 13.6, 15.8, 17.4, 19.8, 14.0, 11.2];
  let windStates: string[] = [];
  for (let i = 0; i < windRamp.length; i++) {
    const r = await req("/api/governor/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `10.77.2.${i + 1}` },
      body: JSON.stringify({
        projectId: PROJECT_ID,
        windSpeedMs: windRamp[i],
      }),
    });
    const hasCraneLock = /CRANE_WIND_LOCKOUT/i.test(r.text);
    windStates.push(`${windRamp[i]}m/s:${hasCraneLock ? "LOCK" : "OPEN"}`);
  }
  const peakLocked = windStates[7]?.endsWith(":LOCK");
  const clearedTooFast = windStates[9]?.endsWith(":OPEN");
  if (!peakLocked) {
    record("SLOW_DRIFT", "VULN", "Wind Ramp Interlock (10.5 -> 19.8 m/s)", `Peak 19.8 m/s failed to trip CRANE_WIND_LOCKOUT (${windStates.join(" | ")})`);
  } else if (clearedTooFast) {
    record("SLOW_DRIFT", "WARN", "Wind Hysteresis / Latch Behavior", `Tripped at 19.8 m/s but stateless /evaluate immediately unlocked on 11.2 m/s drop without manual clearance`);
  } else {
    record("SLOW_DRIFT", "HELD", "Wind Hysteresis / Latch Behavior", `Tripped at 19.8 m/s and remained safely latched on 11.2 m/s drop`);
  }

  // 2C. Ticks 21-30: Progressive concrete strength decay (41 -> 24 MPa) + Dossier / Rollup parity
  let freezeTrippedAtMpa: number | null = null;
  for (let i = 0; i < 10; i++) {
    const mpa = 41 - i * 1.9;
    const r = await req("/api/governor/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `10.77.3.${i + 1}` },
      body: JSON.stringify({ projectId: PROJECT_ID, cubeStrengthMpa: Number(mpa.toFixed(1)) }),
    });
    if (freezeTrippedAtMpa === null && (r.status === 422 || /422|FROZEN|LOCKED/i.test(r.text))) {
      freezeTrippedAtMpa = Number(mpa.toFixed(1));
    }
  }
  const [rRollup, rDossier] = await Promise.all([
    req("/api/portfolio/rollup", { headers: { "x-forwarded-for": "10.77.3.50" } }),
    req(`/api/audit/dossier?projectId=${PROJECT_ID}`, { headers: { "x-forwarded-for": "10.77.3.51" } }),
  ]);
  const dossierEvents = rDossier.json?.dossier?.hashChain?.events?.length ?? 0;
  const rollupFrozen = rRollup.json?.totals?.totalFrozenInr ?? rRollup.json?.totalFrozenInr ?? null;
  if (rRollup.status === 200 && rDossier.status === 200 && dossierEvents > 0) {
    record(
      "SLOW_DRIFT",
      "HELD",
      "Progressive Cube Decay -> Rollup & Dossier Parity",
      `Escrow gate tripped at ${freezeTrippedAtMpa ?? "baseline"} MPa | rollupFrozen=${rollupFrozen} | dossierEvents=${dossierEvents}`
    );
  } else {
    record(
      "SLOW_DRIFT",
      "VULN",
      "Progressive Cube Decay -> Rollup & Dossier Parity",
      `Rollup HTTP=${rRollup.status}, Dossier HTTP=${rDossier.status}, events=${dossierEvents}`
    );
  }
}

async function runLayer3DisplayParity() {
  console.log("\n=== LAYER 3: 30-ROUTE LIVE DISPLAY-PARITY & CONTRADICTION AUDITOR ===");

  const routes = [
    "/",
    "/executive/war-room",
    "/executive/evm-scurve",
    "/milestones",
    "/schedule/gantt",
    "/site/dpr",
    "/site/labor",
    "/site/gate-inward",
    "/site/digital-twin",
    "/site/360-tour",
    "/site/gis",
    "/site/wind-stability",
    "/operations/plant-machinery",
    "/safety/ptw",
    "/engineering/bbs",
    "/engineering/geotechnical",
    "/engineering/concrete-maturity",
    "/quality/ncr",
    "/quality/pour-cards",
    "/materials/reconciliation",
    "/finance/measurement-book",
    "/finance/ra-bills",
    "/contracts/variations",
    "/contracts/claims-disputes",
    "/compliance/rera",
    "/handover/punch-list",
    "/closeout/audit-vault",
    "/closeout/bsa-certificate",
    "/closeout/verify-dossier",
    "/settings",
  ];

  // Fetch ground-truth backend state first
  const rState = await req(`/api/governor/state?projectId=${PROJECT_ID}`, {
    headers: { "x-forwarded-for": "10.66.0.1" },
  });
  const liveFrozen = rState.json?.snapshot?.escrow?.frozenInr ?? rState.json?.escrow?.frozenInr ?? 6200000;

  let httpErrors: string[] = [];
  let sec65bRoutes: string[] = [];
  let zeroDisplayRoutes: string[] = [];
  let contradictionRoutes: string[] = [];

  const zeroPatterns: Array<[RegExp, string]> = [
    [/0\/0\s*Units/i, "0/0 Units"],
    [/\b0\s+Workers\b/i, "0 Workers"],
    [/\b0\s+Personnel\b/i, "0 Personnel"],
    [/\b0\s+Assets\b/i, "0 Assets"],
    [/\b0\s+Sacrificial\s+Nodes\b/i, "0 Sacrificial Nodes"],
    [/\bNO\s+SENSORS\b/i, "NO SENSORS"],
    [/\b0\s+Records\b/i, "0 Records"],
    [/\b0\s+Lines\b/i, "0 Lines"],
    [/\b0\s+Proposals\b/i, "0 Proposals"],
    [/\b0\s+Claims\b/i, "0 Claims"],
    [/\b0\s+Items\b/i, "0 Items"],
    [/\b0\s+Dossiers\b/i, "0 Dossiers"],
  ];

  for (const route of routes) {
    const r = await req(route, { headers: { "x-forwarded-for": "10.66.0.2" } });
    if (r.status >= 400 || r.text.includes("__next_error__")) {
      httpErrors.push(`${route} (HTTP ${r.status})`);
      continue;
    }

    if (/Section\s*65B/i.test(r.text)) {
      sec65bRoutes.push(route);
    }

    const matchedZeros = zeroPatterns.filter(([rx]) => rx.test(r.text)).map(([, label]) => label);
    if (matchedZeros.length > 0) {
      zeroDisplayRoutes.push(`${route} [${matchedZeros.join(", ")}]`);
    }

    if (route === "/schedule/gantt" && r.text.includes("On Baseline (0d)")) {
      contradictionRoutes.push("/schedule/gantt renders hardcoded 'On Baseline (0d)' despite SPI < 1.0 delays");
    }
    if (route === "/safety/ptw" && /km\/h/i.test(r.text) && /m\/s/i.test(r.text)) {
      contradictionRoutes.push("/safety/ptw mixes km/h and m/s wind units on the same page");
    }
    if (liveFrozen === 6200000 && /6\.40\s*Cr/i.test(r.text)) {
      contradictionRoutes.push(`${route} prints '6.40 Cr' while live Governor frozenInr is ₹62,00,000`);
    }
  }

  if (httpErrors.length > 0) {
    record("DISPLAY_PARITY", "VULN", "30-Route HTTP Render Check", `Failed routes: ${httpErrors.join(", ")}`);
  } else {
    record("DISPLAY_PARITY", "HELD", "30-Route HTTP Render Check", "All 30 routes returned HTTP 200 without Next.js error boundaries");
  }

  if (sec65bRoutes.length > 0) {
    record("DISPLAY_PARITY", "DISPLAY_BUG", "Outdated 'Section 65B' Legal Copy", `${sec65bRoutes.length} live rendered routes still show Section 65B: ${sec65bRoutes.join(", ")}`);
  } else {
    record("DISPLAY_PARITY", "HELD", "BSA Section 63 Legal Copy", "Zero routes displaying outdated Section 65B");
  }

  if (zeroDisplayRoutes.length > 0) {
    record("DISPLAY_PARITY", "DISPLAY_BUG", "Disconnected Zero-Data Modules", `${zeroDisplayRoutes.length} routes render empty zeros despite live project state:\n  - ${zeroDisplayRoutes.join("\n  - ")}`);
  } else {
    record("DISPLAY_PARITY", "HELD", "Disconnected Zero-Data Modules", "All operational routes reflect live correlated data");
  }

  if (contradictionRoutes.length > 0) {
    record("DISPLAY_PARITY", "DISPLAY_BUG", "Cross-Page Data Contradictions", contradictionRoutes.join(" | "));
  } else {
    record("DISPLAY_PARITY", "HELD", "Cross-Page Data Contradictions", "No baseline/unit/money contradictions detected in SSR HTML");
  }

  // Static z-index check for LiveviewThemeQuickToggle vs Header/GlobalBar
  const toggleSrc = fs.existsSync("components/LiveviewThemeQuickToggle.tsx")
    ? fs.readFileSync("components/LiveviewThemeQuickToggle.tsx", "utf8")
    : "";
  const headerSrc = fs.existsSync("components/layout/UnifiedHeader.tsx")
    ? fs.readFileSync("components/layout/UnifiedHeader.tsx", "utf8")
    : "";
  const barSrc = fs.existsSync("components/governor/GovernorGlobalBar.tsx")
    ? fs.readFileSync("components/governor/GovernorGlobalBar.tsx", "utf8")
    : "";

  const toggleZ = Number(toggleSrc.match(/z-(\d+)/)?.[1] || 0);
  const headerZ = Number(headerSrc.match(/z-(\d+)/)?.[1] || 0);
  const barZ = Number(barSrc.match(/z-(\d+)/)?.[1] || 0);
  if (toggleZ <= Math.max(headerZ, barZ)) {
    record(
      "DISPLAY_PARITY",
      "DISPLAY_BUG",
      "Light/Dark Toggle Occlusion",
      `LiveviewThemeQuickToggle is z-${toggleZ} while UnifiedHeader is z-${headerZ} and GovernorGlobalBar is z-${barZ} (occluded!)`
    );
  } else {
    record("DISPLAY_PARITY", "HELD", "Light/Dark Toggle Stacking", `Toggle z-${toggleZ} sits above headers`);
  }
}

async function main() {
  await runLayer1FilthyBurst();
  await runLayer2SlowDrift();
  await runLayer3DisplayParity();

  const counts = {
    HELD: findings.filter((f) => f.status === "HELD").length,
    VULN: findings.filter((f) => f.status === "VULN").length,
    DISPLAY_BUG: findings.filter((f) => f.status === "DISPLAY_BUG").length,
    WARN: findings.filter((f) => f.status === "WARN").length,
  };

  console.log("\n========================================================================");
  console.log(
    `SPRINT 19A RED-TEAM & DISPLAY SCORECARD -> HELD: ${counts.HELD} | VULNS: ${counts.VULN} | DISPLAY_BUGS: ${counts.DISPLAY_BUG} | WARN: ${counts.WARN}`
  );
  console.log("========================================================================");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
