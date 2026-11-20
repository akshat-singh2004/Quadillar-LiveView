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
      description:
        "Ordered hierarchy of agents invoked, e.g. ['PRIME-COMMAND', 'MINERVA-ARCH', 'μ-GRIDLINE-DELTA'].",
    },
    answer: {
      type: Type.STRING,
      description:
        "QUADMAX.AI-grade executive & millimeter-precise engineering briefing. Use crisp paragraphs and • bullets. Clearly call out any site wrongdoing, floor/gridline offset in mm/m, out-of-sequence build, or escrow lien.",
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

  // Sync live Supabase NCR-2026-STR-042 state into PRJ-01 alert list
  const alerts = getAllPortfolioAlerts(
    effectiveProjectId,
    params.scope
  ).map((a) => {
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

  // Case A: Portfolio-Wide 10-Project Principal Architect Briefing
  if (isAllSites && effectiveProjectId === "ALL_10") {
    const totalPortfolioCr = PORTFOLIO_10_PROJECTS.reduce((s, p) => s + p.contractValueCr, 0);
    const totalHeldInr = alerts.reduce((s, a) => s + (a.alertId === "NCR-2026-STR-042" && !isLocked ? 0 : a.financialImpactInr), 0);

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

  // Case B: Single-Site & Single-Scope Precision Report
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
  let prompt = "";
  let projectId = "ALL_10";
  let scope: ScopeDomainId = "ALL_SCOPES";
  let agentId = "AUTO";
  let customAgent: CustomAgentSpec | null = null;
  let history: ChatTurnInput[] = [];

  try {
    const body = await req.json();
    prompt = String(body.query || "").trim();
    if (body.projectId) projectId = String(body.projectId);
    if (body.scope) scope = body.scope as ScopeDomainId;
    if (body.agentId) agentId = String(body.agentId);
    if (body.customAgent) customAgent = body.customAgent as CustomAgentSpec;
    if (Array.isArray(body.history)) {
      history = body.history
        .slice(-8)
        .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string");
    }

    if (!prompt) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
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
        const [gateRes, fieldRes] = await Promise.all([
          supabase.from("ncr_escrow_gates").select("*").order("updated_at", { ascending: false }).limit(2),
          supabase
            .from("field_grounding_logs")
            .select("id, bim_zone_id, severity, transcript_vernacular, engineering_summary, withholding_amount_inr, workflow_status, created_at")
            .order("created_at", { ascending: false })
            .limit(4),
        ]);
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
      return NextResponse.json({ ok: true, payload });
    }

    const scopeMeta = SCOPE_DOMAINS.find((s) => s.id === scope) || SCOPE_DOMAINS[0];
    const selectedProj =
      projectId === "ALL_10"
        ? null
        : PORTFOLIO_10_PROJECTS.find((p) => p.projectId === projectId) || null;

    const livePortfolioContext = {
      selectedSiteFilter: selectedProj ? selectedProj.name : "ALL 10 PORTFOLIO SITES",
      selectedScopeFilter: scopeMeta.label,
      selectedAgentNode: customAgent || HIERARCHICAL_AGENT_MESH.find((a) => a.id === agentId) || "AUTO_HIERARCHY",
      portfolio10Projects: PORTFOLIO_10_PROJECTS,
      vanguardLiveEscrowGate: escrowGate,
      vanguardRecentFieldVoiceLogs: recentFieldLogs,
      vanguardMultiRaySensorBlindSpots: sensorAdvisories,
      validRoutes: [
        { label: "Focus TG-03 in 3D BIM", href: "/site/digital-twin?zone=BIT-4-TG03&ncr=NCR-2026-STR-042", tag: "3D BIM" },
        { label: "3D BIM & Multi-Ray Twin", href: "/site/digital-twin", tag: "3D BIM" },
        { label: "Section 65B Audit Vault", href: "/site/audit-ledger", tag: "65B VAULT" },
        { label: "Structural NDT Register", href: "/site/ndt", tag: "IS 456 NDT" },
        { label: "Master CPM Schedule", href: "/schedule/gantt", tag: "CPM" },
      ],
    };

    const systemInstruction = `You are QUADMAX.AI (QUADMAX.AI Construction Operating Kernel) assisting the Principal Architect & EPC Executive across 10 active construction sites in Lucknow, India.
Be razor-sharp, proactive, and millimeter-accurate:
1. Explicitly flag any wrongdoing, geometric offset (such as Summit Corporate Building's 12th-floor wall cast 1,000 mm / 1.00 m off-grid 9 days ahead of sequence), concrete cube/core failure (Project Vanguard NCR-2026-STR-042), or dielectric spoof.
2. Strictly honor selectedSiteFilter and selectedScopeFilter: if a single site or single scope is selected, focus exclusively on that site and domain without diluting with unrelated sites.
3. Show which Management Agent -> Sub-Agent -> Micro-Agent (or Custom Agent) executed the verification in activeAgentChain.`;

    const transcript = history
      .map((t) => `${t.role === "user" ? "ARCHITECT" : "QUADMAX"}: ${t.content}`)
      .join("\n");

    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = ["gemini-3.8-flash", "gemini-3.8-flash-lite", "gemini-3.0-flash"];
    let parsed: any = null;

    for (const modelName of candidateModels) {
      try {
        const res = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${transcript ? `PRIOR THREAD:\n${transcript}\n\n` : ""}COMMAND: "${prompt}"\n\nLIVE_PORTFOLIO_TELEMETRY:
${JSON.stringify(livePortfolioContext)}`,
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
        });
        if (res.text) {
          parsed = JSON.parse(res.text);
          break;
        }
      } catch {}
    }

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
    };

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
    return NextResponse.json({ ok: true, payload: fallback });
  }
}
