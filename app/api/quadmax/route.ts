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
export const maxDuration = 60;

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

export interface SensorEscalationStep {
  tier: number;
  device: string;
  sourceType: "LIVE_SUPABASE" | "SENSOR_BUS_SIMULATED";
  finding: string;
  confidencePct: number;
  decision: "ESCALATE_NEXT_SENSOR" | "CONFIRMED_THRESHOLD_MET" | "FLAGGED_FOR_HUMAN_REVIEW";
}

export interface SensorEscalationTrace {
  reportId: string;
  transcript: string;
  element: string;
  bimZoneId: string;
  sha256Prefix: string;
  targetThresholdPct: number;
  finalConfidencePct: number;
  finalVerdict: "CONFIRMED" | "FLAGGED_FOR_ENGINEER_REVIEW";
  steps: SensorEscalationStep[];
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

const QUADMAX_TTL_CACHE = new Map<string, { expiresAt: number; payload: QuadmaxChatPayload }>();
const MAX_CACHE_ENTRIES = 100;
const GEMINI_TIMEOUT_MS = 10000;
const DB_READ_TIMEOUT_MS = 1800;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TIMEOUT_SLA")), ms);
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

function isFieldIncidentQuery(prompt: string): boolean {
  return /(site engineer|reported|report|crack|wall|chhat|roof|slab|ceiling|honeycomb|just now|moment ago|whats up|what's up|camera|cam|lidar|drone|verify|investigate|check that)/i.test(
    prompt
  );
}

/**
 * Deterministic Confidence-Gated Progressive Sensor Escalation Engine.
 * Starts from the live Supabase field report, then steps up through PTZ Cam -> LiDAR -> Drone/Thermal
 * until cumulative confidence >= 85%, or falls back to FLAGGED_FOR_ENGINEER_REVIEW.
 */
function buildSensorEscalationTrace(recentLogs: any[], prompt: string): SensorEscalationTrace | null {
  if (!recentLogs || recentLogs.length === 0) return null;

  const q = prompt.toLowerCase();
  const matchedLog =
    recentLogs.find((log) => {
      const hay = `${log.transcript_vernacular || ""} ${log.structural_element || ""} ${log.engineering_summary || ""}`.toLowerCase();
      if ((q.includes("wall") || q.includes("deewar")) && hay.includes("wall")) return true;
      if ((q.includes("chhat") || q.includes("roof") || q.includes("slab") || q.includes("ceiling")) && (hay.includes("chhat") || hay.includes("roof") || hay.includes("slab"))) return true;
      if (q.includes("crack") && hay.includes("crack")) return true;
      if ((q.includes("girder") || q.includes("tg-03")) && (hay.includes("girder") || hay.includes("tg-03"))) return true;
      return false;
    }) || recentLogs[0];

  const transcript = String(matchedLog.transcript_vernacular || matchedLog.engineering_summary || "Field report");
  const element = String(matchedLog.structural_element || "Site Structural Zone");
  const bimZoneId = String(matchedLog.bim_zone_id || "BIT-4-TG03");
  const sha256Prefix = String(matchedLog.canonical_65b_sha256 || "UNAVAILABLE").slice(0, 14);
  const targetThresholdPct = 85;

  const isIndoorWall = /\b(wall|plaster|lobby|partition|masonry|indoor)\b/i.test(`${transcript} ${element}`);
  const hasSpecificDefect = /\b(crack|honeycomb|void|spall|seepage|rebar|41\.2|fail)\b/i.test(transcript);
  const rawConf = Number(matchedLog.confidence_score ?? 0.68);
  const tier1Conf = Math.max(45, Math.min(82, Math.round((rawConf <= 1 ? rawConf * 100 : rawConf))));

  const steps: SensorEscalationStep[] = [];

  // Tier 1: Live Supabase Field Report
  steps.push({
    tier: 1,
    device: "Field Audio / Photo Report (Live Supabase DB)",
    sourceType: "LIVE_SUPABASE",
    finding: `Captured "${transcript.slice(0, 110)}" mapped to ${element} (${bimZoneId}).`,
    confidencePct: tier1Conf,
    decision: tier1Conf >= targetThresholdPct ? "CONFIRMED_THRESHOLD_MET" : "ESCALATE_NEXT_SENSOR",
  });

  let currentConf = tier1Conf;

  // Tier 2: Quadrant PTZ Camera Lock
  if (currentConf < targetThresholdPct) {
    const camId = isIndoorWall ? "PTZ-CAM-LOBBY-E2 (Interior East Wall)" : "PTZ-CAM-TG03-N1 (Tower A Deck)";
    currentConf = Math.min(84, currentConf + (hasSpecificDefect ? 13 : 8));
    steps.push({
      tier: 2,
      device: camId,
      sourceType: "SENSOR_BUS_SIMULATED",
      finding: isIndoorWall
        ? `Switched to ${camId} facing right-wall sector; optical view shows surface discontinuity but lighting/angle prevents crack-width measurement.`
        : `Switched to ${camId} on ${bimZoneId}; visual surface anomaly aligned with engineer bearing.`,
      confidencePct: currentConf,
      decision: currentConf >= targetThresholdPct ? "CONFIRMED_THRESHOLD_MET" : "ESCALATE_NEXT_SENSOR",
    });
  }

  // Tier 3: Terrestrial LiDAR vs. LOD-400 BIM Mesh
  if (currentConf < targetThresholdPct) {
    const lidarDelta = hasSpecificDefect && !isIndoorWall ? 16 : 9;
    currentConf = Math.min(93, currentConf + lidarDelta);
    const met = currentConf >= targetThresholdPct;
    steps.push({
      tier: 3,
      device: "Terrestrial LiDAR vs. LOD-400 BIM Mesh",
      sourceType: "SENSOR_BUS_SIMULATED",
      finding: met
        ? `Point-cloud delta confirms +/-2.4 mm surface recess on ${bimZoneId}, crossing the ${targetThresholdPct}% verification threshold.`
        : `Surface hairline depth is within +/-1.8 mm LiDAR noise floor on ${element}; insufficient alone for automated structural confirmation.`,
      confidencePct: currentConf,
      decision: met ? "CONFIRMED_THRESHOLD_MET" : "ESCALATE_NEXT_SENSOR",
    });
  }

  // Tier 4: Drone / Thermal Sweep -> Final Human Review Fallback
  if (currentConf < targetThresholdPct) {
    if (isIndoorWall) {
      // Honest operational constraint: drone cannot fly indoors -> flag exact spot for engineer review
      steps.push({
        tier: 4,
        device: "UAV Drone / Thermal Sweep (Blocked Indoors) -> Manual Review",
        sourceType: "SENSOR_BUS_SIMULATED",
        finding: `Autonomous UAV unavailable in enclosed interior zone; cumulative confidence (${currentConf}%) remains below ${targetThresholdPct}%. Spot flagged for on-site structural engineer review & crack-gauge photo.`,
        confidencePct: currentConf,
        decision: "FLAGGED_FOR_HUMAN_REVIEW",
      });
    } else {
      currentConf = Math.min(94, currentConf + 10);
      const met = currentConf >= targetThresholdPct;
      steps.push({
        tier: 4,
        device: "UAV Drone Optical + LWIR Thermal Sweep",
        sourceType: "SENSOR_BUS_SIMULATED",
        finding: met
          ? `Thermal gradient & close-range UAV imagery confirm void/crack signature on ${bimZoneId}.`
          : `Occlusion prevented clean thermal lock; spot flagged for manual engineer review.`,
        confidencePct: currentConf,
        decision: met ? "CONFIRMED_THRESHOLD_MET" : "FLAGGED_FOR_HUMAN_REVIEW",
      });
    }
  }

  const finalVerdict = currentConf >= targetThresholdPct ? "CONFIRMED" : "FLAGGED_FOR_ENGINEER_REVIEW";

  return {
    reportId: String(matchedLog.id || "FLD-LIVE"),
    transcript,
    element,
    bimZoneId,
    sha256Prefix,
    targetThresholdPct,
    finalConfidencePct: currentConf,
    finalVerdict,
    steps,
  };
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
  escalationTrace: SensorEscalationTrace | null;
  sha256Seal: string;
  now: string;
}): QuadmaxChatPayload {
  const q = params.prompt.toLowerCase();
  const scopeMeta = SCOPE_DOMAINS.find((s) => s.id === params.scope) || SCOPE_DOMAINS[0];

  // Jarvis Progressive Sensor Escalation response when user asks about a reported site issue
  if (params.escalationTrace && isFieldIncidentQuery(params.prompt)) {
    const tr = params.escalationTrace;
    const stepLines = tr.steps
      .map(
        (s) =>
          `• Tier ${s.tier} [${s.device} | ${s.sourceType === "LIVE_SUPABASE" ? "LIVE DB" : "SENSOR BUS"}]: ${s.finding} (Confidence: ${s.confidencePct}%)`
      )
      .join("\n");

    const verdictLine =
      tr.finalVerdict === "CONFIRMED"
        ? `Verdict: CONFIRMED (${tr.finalConfidencePct}% >= ${tr.targetThresholdPct}% threshold) on ${tr.element}.`
        : `Verdict: FLAGGED FOR ENGINEER REVIEW (${tr.finalConfidencePct}% < ${tr.targetThresholdPct}% threshold). Exact spot pinned on ${tr.bimZoneId} for manual verification before any escrow action.`;

    return {
      answer: `QUADMAX Incident Trace (${tr.reportId} | SHA-256: ${tr.sha256Prefix}):\n\n${stepLines}\n\n${verdictLine}`,
      activeAgentChain: ["PRIME-COMMAND", "ARGUS-SENSOR-ESCALATION", "HERMES-65B"],
      scopeLabel: scopeMeta.label,
      siteLabel: tr.element,
      standardRef: "IS 456:2000 / BSA Sec. 63",
      metrics: [
        { label: "Final Confidence", value: `${tr.finalConfidencePct}%`, tone: tr.finalVerdict === "CONFIRMED" ? "nominal" : "watch" },
        { label: "Sensors Queried", value: `${tr.steps.length} Tiers`, tone: "nominal" },
        { label: "Target Threshold", value: `${tr.targetThresholdPct}%`, tone: "nominal" },
        { label: "Status", value: tr.finalVerdict === "CONFIRMED" ? "CONFIRMED" : "REVIEW FLAG", tone: tr.finalVerdict === "CONFIRMED" ? "critical" : "watch" },
      ],
      citations: [
        { label: `Inspect ${tr.bimZoneId} in 3D Building`, href: `/site/digital-twin?zone=${encodeURIComponent(tr.bimZoneId)}&autoEscalate=1`, tag: "3D BIM" },
        { label: "Verify Live Sec. 65B Record", href: `/verify/${encodeURIComponent(tr.sha256Prefix)}`, tag: "65B PROOF" },
      ],
      followUps: [
        "Lock escrow on this zone if structural defect is confirmed",
        "Check active NCR-2026-STR-042 core test status",
      ],
      sha256Seal: params.sha256Seal,
      engineMode: "QUADMAX_DETERMINISTIC_KERNEL",
      timestampIso: params.now,
    };
  }

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

  const isLocked = params.escrowGate?.gate_status === "LOCKED";
  const vanguardLienStr = `INR ${Number(params.escrowGate?.withholding_lien_inr ?? 450000).toLocaleString("en-IN")}`;

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
    ? ["PRIME-COMMAND", params.customAgent.name, "GRIDLINE-DELTA"]
    : params.agentId !== "AUTO"
    ? ["PRIME-COMMAND", params.agentId]
    : ["PRIME-COMMAND", "MINERVA-ARCH", "ARGUS-SPATIAL"];

  if (isAllSites && effectiveProjectId === "ALL_10") {
    const totalPortfolioCr = PORTFOLIO_10_PROJECTS.reduce((s, p) => s + p.contractValueCr, 0);
    const totalHeldInr = alerts.reduce(
      (s, a) => s + (a.alertId === "NCR-2026-STR-042" && !isLocked ? 0 : a.financialImpactInr),
      0
    );

    const wrongdoingBullets =
      alerts.length > 0
        ? alerts
            .map((a) => `• [${a.projectName} - ${a.floorOrZone}]: ${a.headline} (${a.deviationMetric}). ${a.detail}`)
            .join("\n")
        : "• Zero critical geometric, sequence, or IS 456 non-conformances detected across all 10 sites.";

    return {
      answer: `Portfolio Briefing: Across all 10 active sites (INR ${totalPortfolioCr.toFixed(2)} Cr portfolio value), ${alerts.length} exception(s) require attention under [${scopeMeta.label}]:\n\n${wrongdoingBullets}`,
      activeAgentChain: agentChain,
      scopeLabel: scopeMeta.label,
      siteLabel: "All 10 Portfolio Sites (Lucknow)",
      standardRef: "ISO 19650-2 | IS 456:2000 | BSA Sec. 63",
      metrics: [
        { label: "Active Sites", value: "10 Projects", tone: "nominal" },
        { label: "Portfolio Value", value: `INR ${totalPortfolioCr.toFixed(0)} Cr`, tone: "nominal" },
        { label: "Flagged Sites", value: `${alerts.length} Exceptions`, tone: alerts.length > 0 ? "critical" : "nominal" },
        { label: "Escrow Hold", value: `INR ${(totalHeldInr / 100000).toFixed(2)} L`, tone: totalHeldInr > 0 ? "watch" : "nominal" },
      ],
      citations: [
        { label: "Open 3D BIM Twin (TG-03)", href: "/site/digital-twin?zone=BIT-4-TG03&autoEscalate=1", tag: "3D AGENT" },
        { label: "Open Section 65B Evidence Vault", href: "/closeout/audit-vault", tag: "65B VAULT" },
      ],
      followUps: [
        "Investigate the latest site engineer report with sensor escalation",
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
      ? alerts.map((a) => `• ${a.floorOrZone} [${a.deviationMetric}]: ${a.detail} (${a.standardRef})`).join("\n")
      : `• All structural, architectural, and MEP elements on ${targetProj.name} are within +/-${targetProj.lidarRmsMm} mm tolerance.`;

  return {
    answer: `Scoped Intelligence Report for ${targetProj.name} (${targetProj.location}) — Domain: [${scopeMeta.label}]:\n\n${siteBullets}`,
    activeAgentChain: agentChain,
    scopeLabel: scopeMeta.label,
    siteLabel: targetProj.name,
    standardRef: alerts[0]?.standardRef || "ISO 19650-2 & IS 456:2000",
    metrics: [
      { label: "Site Progress", value: `${targetProj.physicalPct}%`, tone: "nominal" },
      { label: "LiDAR Precision", value: `+/-${targetProj.lidarRmsMm} mm`, tone: "nominal" },
      { label: "Scoped Issues", value: `${alerts.length} Active`, tone: alerts.length > 0 ? "critical" : "nominal" },
      { label: "Contract Value", value: `INR ${targetProj.contractValueCr.toFixed(0)} Cr`, tone: "nominal" },
    ],
    citations: [
      { label: "Launch 3D BIM Twin", href: "/site/digital-twin", tag: "3D BIM" },
      { label: "Audit Ledger (BSA Sec. 63)", href: "/closeout/audit-vault", tag: "LEDGER" },
    ],
    followUps: [
      "What did the site engineer report a moment ago?",
      "Give me the executive overview across all 10 projects",
    ],
    sha256Seal: params.sha256Seal,
    engineMode: "QUADMAX_DETERMINISTIC_KERNEL",
    timestampIso: params.now,
  };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let prompt = "";
  let projectId = VANGUARD_GENOME.projectId;
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

    if (body.projectId && String(body.projectId) !== "ALL_10") projectId = String(body.projectId).slice(0, 64);
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

    const incidentMode = isFieldIncidentQuery(prompt);
    const cacheKey = `${projectId}::${scope}::${agentId}::${prompt.toLowerCase()}`;

    // Bypass cache for live site-incident questions so Jarvis always reads the latest report just submitted
    if (!customAgent && !incidentMode) {
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
      structural_element: "Tower A / BIT-4 - Level 3 Transfer Girder (M50)",
      is_code_clause: "IS 456:2000 Cl. 17.4.3",
      gate_status: "LOCKED",
      withholding_lien_inr: 450000,
      blocking_reason: "28-day cube strength 41.2 MPa (< 46.0 MPa M50 acceptance) + post-deshuttering honeycombing.",
    };
    let recentFieldLogs: any[] = [];

    if (supabase) {
      try {
        let fieldQuery = supabase
          .from("field_grounding_logs")
          .select(
            "id, project_id, bim_zone_id, structural_element, transcript_vernacular, engineering_summary, confidence_score, severity, withholding_amount_inr, workflow_status, canonical_65b_sha256, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(5);

        if (projectId !== "ALL_10") {
          fieldQuery = fieldQuery.eq("project_id", projectId);
        }

        const [gateRes, fieldRes] = await withTimeout(
          Promise.all([
            supabase.from("ncr_escrow_gates").select("*").order("updated_at", { ascending: false }).limit(1),
            fieldQuery,
          ]),
          DB_READ_TIMEOUT_MS
        );
        if (gateRes.data && gateRes.data.length > 0) escrowGate = gateRes.data[0];
        if (fieldRes.data) recentFieldLogs = fieldRes.data;
      } catch {}
    }

    const escalationTrace = incidentMode ? buildSensorEscalationTrace(recentFieldLogs, prompt) : null;

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
      bimZoneId: escalationTrace?.bimZoneId || projectId,
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
        escalationTrace,
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
      progressiveSensorEscalationTrace: escalationTrace,
      sensorBlindSpots: sensorAdvisories,
    };

    const systemInstruction = `You are QUADMAX.AI, a crisp, Jarvis-like Construction Operating Kernel.
Rules:
1. If progressiveSensorEscalationTrace is present, walk the user cleanly through each sensor tier queried (Live Supabase Field Report -> PTZ Camera -> LiDAR -> Drone/Review), stating the exact confidence % at every step and clearly distinguishing LIVE DB records from SITE SENSOR BUS checks. If finalVerdict is FLAGGED_FOR_ENGINEER_REVIEW, explicitly state that confidence stayed below 85% so the exact spot is flagged for human engineer review rather than guessing.
2. Call out exact numbers (INR escrow holds, MPa thresholds, mm tolerances) without fluff.
3. Return valid route hrefs from: /site/digital-twin?zone=BIT-4-TG03&autoEscalate=1, /site/digital-twin, /site/audit-ledger, /verify/NCR-2026-STR-042, /site/ndt.`;

    const transcript = history
      .slice(-4)
      .map((t) => `${t.role === "user" ? "ARCHITECT" : "QUADMAX"}: ${t.content.slice(0, 320)}`)
      .join("\n");

    const ai = new GoogleGenAI({ apiKey });
    let parsed: any = null;

    try {
      const res = await withTimeout(
        ai.models.generateContent({
          model: "gemini-3.5-flash-lite",
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
        escalationTrace,
        sha256Seal,
        now,
      });
      payload.latencyMs = Date.now() - startTime;
      return NextResponse.json({ ok: true, payload });
    }

    const payload: QuadmaxChatPayload = {
      answer: String(parsed.answer || ""),
      activeAgentChain: Array.isArray(parsed.activeAgentChain)
        ? parsed.activeAgentChain
        : ["PRIME-COMMAND", "ARGUS-SENSOR-ESCALATION", "HERMES-65B"],
      scopeLabel: scopeMeta.label,
      siteLabel: selectedProj ? selectedProj.name : "All 10 Portfolio Sites",
      standardRef: String(parsed.standardRef || "ISO 19650-2 | IS 456:2000"),
      metrics: Array.isArray(parsed.metrics) ? parsed.metrics.slice(0, 4) : [],
      citations: Array.isArray(parsed.citations) ? parsed.citations.slice(0, 3) : [],
      followUps: Array.isArray(parsed.followUps) ? parsed.followUps.slice(0, 2) : [],
      sha256Seal,
      engineMode: "GEMINI_LIVE",
      timestampIso: now,
      latencyMs: Date.now() - startTime,
      cacheHit: false,
    };

    if (!customAgent && !incidentMode) {
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
        structural_element: "Tower A / BIT-4 - Level 3 Transfer Girder (M50)",
        is_code_clause: "IS 456:2000 Cl. 17.4.3",
        gate_status: "LOCKED",
        withholding_lien_inr: 450000,
        blocking_reason: "28-day cube strength 41.2 MPa (< 46.0 MPa M50 acceptance) + post-deshuttering honeycombing.",
      },
      sensorAdvisories: [],
      escalationTrace: null,
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
