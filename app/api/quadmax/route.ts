import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import { evaluateCampusMultiRayFusion } from "@/lib/spatial/multiRayFusionEngine";
import { computeCanonical65BDigest } from "@/lib/grounding/sha256Vault";
import {
  getAllPortfolioAlerts,
  HIERARCHICAL_AGENT_MESH,
  PORTFOLIO_10_PROJECTS,
  SCOPE_DOMAINS,
  ScopeDomainId,
} from "@/lib/agents/portfolioSentinelMesh";

export const runtime = "nodejs";

export interface ChatTurnInput {
  role: "user" | "assistant";
  content: string;
}

export interface QuadmaxCitation {
  label: string;
  href: string;
  tag: string;
}

export interface QuadmaxMetricPill {
  label: string;
  value: string;
  tone: "nominal" | "watch" | "critical";
}

export interface CustomAgentSpec {
  id: string;
  name: string;
  scope: ScopeDomainId;
  projectId: string;
  toleranceMm: number;
  instruction: string;
}

export interface QuadmaxChatPayload {
  answer: string;
  activeAgentChain: string[];
  scopeLabel: string;
  siteLabel: string;
  standardRef: string;
  metrics: QuadmaxMetricPill[];
  citations: QuadmaxCitation[];
  followUps: string[];
  sha256Seal: string;
  engineMode: "GEMINI_LIVE" | "QUADMAX_DETERMINISTIC_KERNEL";
  timestampIso: string;
  latencyMs?: number;
  cacheHit?: boolean;
}

// 30-second bounded TTL cache for sub-5ms repeated stage briefings
const QUADMAX_TTL_CACHE = new Map<string, { expiresAt: number; payload: QuadmaxChatPayload }>();
const MAX_CACHE_ENTRIES = 100;
const GEMINI_TIMEOUT_MS = 3200;
const DB_READ_TIMEOUT_MS = 750;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("GEMINI_TIMEOUT_SLA")), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const PORTFOLIO_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    activeAgentChain: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    answer: {
      type: Type.STRING,
    },
    standardRef: { type: Type.STRING },
    metrics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          value: { type: Type.STRING },
          tone: { type: Type.STRING, enum: ["nominal", "watch", "critical"] },
        },
        required: ["label", "value", "tone"],
      },
    },
    citations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          href: { type: Type.STRING },
          tag: { type: Type.STRING },
        },
        required: ["label", "href", "tag"],
      },
    },
    followUps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["activeAgentChain", "answer", "standardRef", "metrics", "citations", "followUps"],
};

function buildPortfolioDeterministicSynthesis(params: {
  prompt: string;
  projectId: string;
  scope: ScopeDomainId;
  agentId: string;
  customAgent?: CustomAgentSpec | null;
  escrowGate: any;
  sensorAdvisories: Array<{ zoneId: string; confidencePct: number; blindSpot: string; recommendation: string }>;
  sha256Seal: string;
  now: string;
}): QuadmaxChatPayload {
  const q = params.prompt.toLowerCase();
  const isAllSites = params.projectId === "ALL_10" && !q.includes("summit") && !q.includes("vanguard");
  const effectiveProjectId = q.includes("summit")
    ? "LKO-SUMMIT-TOWER"
    : q.includes("vanguard")
    ? VANGUARD_GENOME.projectId
    : params.projectId;

  const projectNode =
    effectiveProjectId === "ALL_10"
      ? null
      : PORTFOLIO_10_PROJECTS.find((p) => p.projectId === effectiveProjectId) || PORTFOLIO_10_PROJECTS[0];

  const scopeMeta = SCOPE_DOMAINS.find((s) => s.id === params.scope) || SCOPE_DOMAINS[0];
  const isLocked = params.escrowGate?.gate_status === "LOCKED";
  const vanguardLienStr = `₹${Number(params.escrowGate?.withholding_lien_inr ?? 450000).toLocaleString("en-IN")}`;

  const alerts = getAllPortfolioAlerts(effectiveProjectId, params.scope).map((a) => {
    if (a.alertId === "NCR-2026-STR-042") {
      return {
        ...a,
        severity: isLocked ? ("CRITICAL" as const) : ("WATCH" as const),
        headline: isLocked
          ? `Transfer Girder TG-03 Cube Break & Honeycombing Hold (${vanguardLienStr} Locked)`
          : `Transfer Girder TG-03 Cleared via IS 456 Core Test (${params.escrowGate?.verified_mean_mpa ?? 44.07} MPa)`,
      };
    }
    return a;
  });

  const agentChain = params.customAgent
    ? ["PRIME-COMMAND", params.customAgent.name, "μ-GRIDLINE-DELTA"]
    : params.agentId !== "AUTO"
    ? ["PRIME-COMMAND", params.agentId]
    : ["PRIME-COMMAND", "MINERVA-ARCH", "ARGUS-SPATIAL", "μ-GRIDLINE-DELTA"];

  if (isAllSites && effectiveProjectId === "ALL_10") {
    const totalPortfolioCr = PORTFOLIO_10_PROJECTS.reduce((s, p) => s + p.contractValueCr, 0);
    const totalHeldInr = alerts.reduce(
      (s, a) => s + (a.alertId === "NCR-2026-STR-042" && !isLocked ? 0 : a.financialImpactInr),
      0
    );

    const wrongdoingBullets =
      alerts.length > 0
        ? alerts
            .map(
              (a) =>
                `• [${a.projectName} — ${a.floorOrZone}]: ${a.headline} (${a.deviationMetric}). ${a.detail}`
            )
            .join("\n")
        : "• Zero critical geometric, sequence, or IS 456 non-conformances detected across all 10 sites.";

    return {
      answer: `Portfolio Briefing • Principal Architect: Across all 10 active sites (₹${totalPortfolioCr.toFixed(2)} Cr portfolio value, 1.3–2.0 mm LiDAR RMS registration), ${alerts.length} exception(s) require your attention under [${scopeMeta.label}]:\n\n${wrongdoingBullets}`,
      activeAgentChain: agentChain,
      scopeLabel: scopeMeta.label,
      siteLabel: "All 10 Portfolio Sites (Lucknow)",
      standardRef: "ISO 19650-2 • IS 456:2000 • BSA Sec. 63",
      metrics: [
        { label: "Active Sites", value: "10 Projects", tone: "nominal" },
        { label: "Portfolio Value", value: `₹${totalPortfolioCr.toFixed(0)} Cr`, tone: "nominal" },
        { label: "Flagged Sites", value: `${alerts.length} Exceptions`, tone: alerts.length > 0 ? "critical" : "nominal" },
        { label: "Escrow / Risk Hold", value: `₹${(totalHeldInr / 100000).toFixed(2)} L`, tone: totalHeldInr > 0 ? "watch" : "nominal" },
      ],
      citations: [
        { label: "Inspect Vanguard TG-03 in 3D BIM", href: "/site/digital-twin?zone=BIT-4-TG03&ncr=NCR-2026-STR-042", tag: "3D BIM" },
        { label: "Open Section 65B Evidence Vault", href: "/site/audit-ledger", tag: "65B VAULT" },
      ],
      followUps: [
        "Drill into Summit Building 12th Floor 1.00 m wall offset",
        "Focus strictly on Project Vanguard Commercial Hub",
      ],
      sha256Seal: params.sha256Seal,
      engineMode: "QUADMAX_DETERMINISTIC_KERNEL",
      timestampIso: params.now,
    };
  }

  const targetProj = projectNode || PORTFOLIO_10_PROJECTS[0];
  const siteBullets =
    alerts.length > 0
      ? alerts
          .map((a) => `• ${a.floorOrZone} [${a.deviationMetric}]: ${a.detail} (${a.standardRef})`)
          .join("\n")
      : `• All structural, architectural, and MEP elements on ${targetProj.name} are within ±${targetProj.lidarRmsMm} mm GFC tolerance for [${scopeMeta.label}].`;

  const sensorNote =
    targetProj.projectId === VANGUARD_GENOME.projectId && params.sensorAdvisories.length > 0
      ? `\n\nMulti-Ray Sensor Advisory: ${params.sensorAdvisories
          .map((s) => `${s.zoneId} (${s.blindSpot.replace(/_/g, " ")})`)
          .join(", ")} flagged for additional thermal/mmWave coverage.`
      : "";

  return {
    answer: `Scoped Intelligence Report for ${targetProj.name} (${targetProj.location}) — Domain: [${scopeMeta.label}]:\n\n${siteBullets}${sensorNote}`,
    activeAgentChain: agentChain,
    scopeLabel: scopeMeta.label,
    siteLabel: targetProj.name,
    standardRef: alerts[0]?.standardRef || "ISO 19650-2 & IS 456:2000",
    metrics: [
      { label: "Site Progress", value: `${targetProj.physicalPct}%`, tone: "nominal" },
      { label: "LiDAR Precision", value: `±${targetProj.lidarRmsMm} mm RMS`, tone: "nominal" },
      { label: "Scoped Issues", value: `${alerts.length} Active`, tone: alerts.length > 0 ? "critical" : "nominal" },
      { label: "Contract Value", value: `₹${targetProj.contractValueCr.toFixed(0)} Cr`, tone: "nominal" },
    ],
    citations: [
      { label: "Launch 3D BIM & Multi-Ray Twin", href: "/site/digital-twin", tag: "3D BIM" },
      { label: "Audit Ledger (BSA Sec. 63)", href: "/site/audit-ledger", tag: "LEDGER" },
    ],
    followUps: [
      "Give me the executive overview across all 10 projects",
      "Check multi-ray sensor blind spots and curing hydration",
    ],
    sha256Seal: params.sha256Seal,
    engineMode: "QUADMAX_DETERMINISTIC_KERNEL",
    timestampIso: params.now,
  };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let prompt = "";
  let projectId = "ALL_10";
  let scope: ScopeDomainId = "ALL_SCOPES";
  let agentId = "AUTO";
  let customAgent: CustomAgentSpec | null = null;
  let history: ChatTurnInput[] = [];

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    prompt = String(body.query || "")
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .trim()
      .slice(0, 1200);

    if (body.projectId) projectId = String(body.projectId).slice(0, 64);
    if (body.scope) scope = body.scope as ScopeDomainId;
    if (body.agentId) agentId = String(body.agentId).slice(0, 64);
    if (body.customAgent && typeof body.customAgent === "object") {
      customAgent = body.customAgent as CustomAgentSpec;
    }
    if (Array.isArray(body.history)) {
      history = body.history
        .slice(-6)
        .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string");
    }

    if (!prompt) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Fast path: 30-second TTL cache check for repeated queries without custom agent mutations
    const cacheKey = `${projectId}::${scope}::${agentId}::${prompt.toLowerCase()}`;
    if (!customAgent) {
      const cached = QUADMAX_TTL_CACHE.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return NextResponse.json({
          ok: true,
          payload: {
            ...cached.payload,
            latencyMs: Date.now() - startTime,
            cacheHit: true,
          },
        });
      }
    }

    const supabase = getServerSupabase();
    let escrowGate: any = {
      ncr_id: "NCR-2026-STR-042",
      bim_zone_id: "BIT-4-TG03",
      structural_element: "Tower A / BIT-4 – Level 3 Transfer Girder (M50)",
      is_code_clause: "IS 456:2000 Cl. 17.4.3",
      gate_status: "LOCKED",
      withholding_lien_inr: 450000,
      blocking_reason: "28-day cube strength 41.2 MPa (< 46.0 MPa M50 acceptance) + post-deshuttering honeycombing.",
    };
    let recentFieldLogs: any[] = [];

    if (supabase) {
      try {
        const [gateRes, fieldRes] = await withTimeout(
          Promise.all([
            supabase.from("ncr_escrow_gates").select("*").order("updated_at", { ascending: false }).limit(1),
            supabase
              .from("field_grounding_logs")
              .select("id, bim_zone_id, severity, engineering_summary, withholding_amount_inr, workflow_status")
              .order("created_at", { ascending: false })
              .limit(3),
          ]),
          DB_READ_TIMEOUT_MS
        );
        if (gateRes.data && gateRes.data.length > 0) escrowGate = gateRes.data[0];
        if (fieldRes.data) recentFieldLogs = fieldRes.data;
      } catch {}
    }

    const sensorAdvisories = evaluateCampusMultiRayFusion()
      .filter((z) => z.advisory !== null)
      .map((z) => ({
        zoneId: z.zoneId,
        confidencePct: z.compositeConfidencePct,
        blindSpot: z.advisory!.blindSpotType,
        recommendation: z.advisory!.recommendedHardware,
      }));

    const now = new Date().toISOString();
    const sha256Seal = computeCanonical65BDigest({
      rawMediaSha256: `QUADMAX:${projectId}:${scope}:${prompt}`,
      vernacularTranscript: prompt,
      bimZoneId: projectId,
      utcTimestamp: now,
      submitterId: customAgent?.name || agentId,
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const payload = buildPortfolioDeterministicSynthesis({
        prompt,
        projectId,
        scope,
        agentId,
        customAgent,
        escrowGate,
        sensorAdvisories,
        sha256Seal,
        now,
      });
      payload.latencyMs = Date.now() - startTime;
      return NextResponse.json({ ok: true, payload });
    }

    const scopeMeta = SCOPE_DOMAINS.find((s) => s.id === scope) || SCOPE_DOMAINS[0];
    const selectedProj =
      projectId === "ALL_10"
        ? null
        : PORTFOLIO_10_PROJECTS.find((p) => p.projectId === projectId) || null;

    // Compact portfolio digest (~65% fewer input tokens for faster Gemini round-trip)
    const compactPortfolio = PORTFOLIO_10_PROJECTS.map((p) => ({
      id: p.projectId,
      code: p.code,
      name: p.name,
      cr: p.contractValueCr,
      pct: p.physicalPct,
      rmsMm: p.lidarRmsMm,
      alerts: p.activeAlerts.map((a) => `${a.floorOrZone}: ${a.headline} (${a.deviationMetric})`),
    }));

    const livePortfolioContext = {
      siteFilter: selectedProj ? selectedProj.name : "ALL_10_SITES",
      scopeFilter: scopeMeta.label,
      agentNode: customAgent || HIERARCHICAL_AGENT_MESH.find((a) => a.id === agentId) || "AUTO_3_TIER",
      sites: compactPortfolio,
      vanguardEscrowGate: escrowGate,
      recentFieldLogs,
      sensorBlindSpots: sensorAdvisories,
    };

    const systemInstruction = `You are QUADMAX.AI Construction Operating Kernel for 10 active sites in Lucknow, India.
Be crisp, factual, and millimeter-precise:
1. Call out any geometric offset (e.g., Summit Building 12th-floor wall cast 1,000 mm / 1.00 m off-grid 9d early), concrete test failure (Vanguard NCR-2026-STR-042), or dielectric spoof.
2. Honor siteFilter and scopeFilter strictly.
3. Return valid route hrefs from: /site/digital-twin?zone=BIT-4-TG03&ncr=NCR-2026-STR-042, /site/digital-twin, /site/audit-ledger, /site/ndt, /schedule/gantt.`;

    const transcript = history
      .slice(-4)
      .map((t) => `${t.role === "user" ? "ARCHITECT" : "QUADMAX"}: ${t.content.slice(0, 320)}`)
      .join("\n");

    const ai = new GoogleGenAI({ apiKey });
    let parsed: any = null;

    try {
      const res = await withTimeout(
        ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${transcript ? `PRIOR:\n${transcript}\n\n` : ""}CMD: "${prompt}"\n\nTELEMETRY:\n${JSON.stringify(
                    livePortfolioContext
                  )}`,
                },
              ],
            },
          ],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: PORTFOLIO_RESPONSE_SCHEMA,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        GEMINI_TIMEOUT_MS
      );
      if (res.text) parsed = JSON.parse(res.text);
    } catch {}

    if (!parsed) {
      const payload = buildPortfolioDeterministicSynthesis({
        prompt,
        projectId,
        scope,
        agentId,
        customAgent,
        escrowGate,
        sensorAdvisories,
        sha256Seal,
        now,
      });
      payload.latencyMs = Date.now() - startTime;
      if (!customAgent) {
        if (QUADMAX_TTL_CACHE.size >= MAX_CACHE_ENTRIES) {
          const oldest = QUADMAX_TTL_CACHE.keys().next().value;
          if (oldest) QUADMAX_TTL_CACHE.delete(oldest);
        }
        QUADMAX_TTL_CACHE.set(cacheKey, { expiresAt: Date.now() + 30000, payload });
      }
      return NextResponse.json({ ok: true, payload });
    }

    const payload: QuadmaxChatPayload = {
      answer: String(parsed.answer || ""),
      activeAgentChain: Array.isArray(parsed.activeAgentChain)
        ? parsed.activeAgentChain
        : ["PRIME-COMMAND", "MINERVA-ARCH", "μ-GRIDLINE-DELTA"],
      scopeLabel: scopeMeta.label,
      siteLabel: selectedProj ? selectedProj.name : "All 10 Portfolio Sites",
      standardRef: String(parsed.standardRef || "ISO 19650-2 • IS 456:2000"),
      metrics: Array.isArray(parsed.metrics) ? parsed.metrics.slice(0, 4) : [],
      citations: Array.isArray(parsed.citations) ? parsed.citations.slice(0, 3) : [],
      followUps: Array.isArray(parsed.followUps) ? parsed.followUps.slice(0, 2) : [],
      sha256Seal,
      engineMode: "GEMINI_LIVE",
      timestampIso: now,
      latencyMs: Date.now() - startTime,
      cacheHit: false,
    };

    if (!customAgent) {
      if (QUADMAX_TTL_CACHE.size >= MAX_CACHE_ENTRIES) {
        const oldest = QUADMAX_TTL_CACHE.keys().next().value;
        if (oldest) QUADMAX_TTL_CACHE.delete(oldest);
      }
      QUADMAX_TTL_CACHE.set(cacheKey, { expiresAt: Date.now() + 30000, payload });
    }

    return NextResponse.json({ ok: true, payload });
  } catch {
    const now = new Date().toISOString();
    const fallback = buildPortfolioDeterministicSynthesis({
      prompt: prompt || "overview of all 10 projects",
      projectId,
      scope,
      agentId,
      customAgent,
      escrowGate: {
        ncr_id: "NCR-2026-STR-042",
        bim_zone_id: "BIT-4-TG03",
        structural_element: "Tower A / BIT-4 – Level 3 Transfer Girder (M50)",
        is_code_clause: "IS 456:2000 Cl. 17.4.3",
        gate_status: "LOCKED",
        withholding_lien_inr: 450000,
        blocking_reason: "28-day cube strength 41.2 MPa (< 46.0 MPa M50 acceptance) + post-deshuttering honeycombing.",
      },
      sensorAdvisories: [],
      sha256Seal: computeCanonical65BDigest({
        rawMediaSha256: "QUADMAX-FALLBACK",
        vernacularTranscript: prompt || "overview",
        bimZoneId: projectId,
        utcTimestamp: now,
        submitterId: "PRIME-COMMAND",
      }),
      now,
    });
    fallback.latencyMs = Date.now() - startTime;
    return NextResponse.json({ ok: true, payload: fallback });
  }
}
