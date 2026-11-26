import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";
import { getGovernorState } from "@/lib/repositories/governorRepo";
import { buildSiteOntologyGraph, simulateScenarioFork, traceBlastRadius } from "@/lib/domain/ontologyEngine";
import { fetchLiveSiteWeather } from "@/lib/mcp/outboundConnectors";
import { getAndVerifyProjectChain } from "@/lib/repositories/eventLedgerRepo";
import { VANGUARD_CLEAN_POUR_FIXTURE, VANGUARD_FRAUD_FIXTURE, evaluateFiveWayTriangulation, type TriangulationInput } from "@/lib/domain/triangulationEngine";
import type { MolecularInput } from "@/lib/engines/molecularGovernor";
import {
  parseConcreteGradeMpa,
  validateIs456CoreTest,
} from "@/lib/grounding/is456Validator";
import { CubeStatisticalAcceptanceEngine } from "@/lib/agents/sub-agents/aegis/cube-statistics";
import { findBimZone } from "@/lib/grounding/bimZoneRegistry";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

export const runtime = "nodejs";

const MCP_PROTOCOL_VERSION = "2025-03-26";
const SERVER_INFO = {
  name: "quadillar-liveview-mcp",
  version: "3.1.0",
  title: "Quadillar LiveView Construction Operating Kernel MCP",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
};

const MCP_TOOLS = [
  {
    name: "get_project_escrow_status",
    description:
      "Query live Supabase commercial escrow gate status, active NCR holds, withholding lien (INR), and concrete grade rules for a construction project.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "Project ID (e.g., UP-LDA-VANGUARD-CAMPUS or LKO-SUMMIT-TOWER).",
        },
      },
    },
  },
  {
    name: "validate_is456_core_test",
    description:
      "Validate extracted concrete core readings against IS 456:2000 Clause 17.4.3 and IS 516 (Part 4) equivalent cube strength conversion (mean >= 0.85 fck, min >= 0.75 fck).",
    inputSchema: {
      type: "object",
      properties: {
        concrete_grade: {
          type: "string",
          description: "Characteristic concrete grade (e.g., M25, M30, M40, M50).",
        },
        core_readings_mpa: {
          type: "array",
          items: { type: "number" },
          description: "Minimum 3 extracted concrete core strength readings in MPa.",
        },
        input_mode: {
          type: "string",
          enum: ["EQUIVALENT_CUBE", "RAW_CORE"],
          description: "Whether readings are already equivalent cube strengths or raw core crushing strengths.",
        },
        ld_ratio: {
          type: "number",
          description: "Core length-to-diameter ratio L/D (1.0 to 2.0) when input_mode is RAW_CORE.",
        },
        core_diameter_mm: {
          type: "number",
          description: "Core diameter in mm (e.g., 75 or 100) when input_mode is RAW_CORE.",
        },
      },
      required: ["concrete_grade", "core_readings_mpa"],
    },
  },
  {
    name: "evaluate_is456_cube_batch",
    description:
      "Evaluate 150x150mm concrete cube test specimens against IS 456:2000 Clause 15.4 (+/-15% individual spread validity) and Amendment 4 Table 11 statistical acceptance criteria.",
    inputSchema: {
      type: "object",
      properties: {
        concrete_grade: {
          type: "string",
          description: "Target concrete grade (e.g., M25, M40, M50).",
        },
        failure_loads_kn: {
          type: "array",
          items: { type: "number" },
          description: "Minimum 3 cube failure loads in kN (150x150mm = 22,500 mm2 cross-section).",
        },
      },
      required: ["concrete_grade", "failure_loads_kn"],
    },
  },
  {
    name: "verify_section_65b_hash",
    description:
      "Verify a SHA-256 Merkle/record hash against Quadillar LiveView's trigger-locked Postgres Section 65B / BSA Sec. 63 statutory audit ledger.",
    inputSchema: {
      type: "object",
      properties: {
        hash_prefix: {
          type: "string",
          description: "Full 64-character SHA-256 hash or prefix (minimum 8 hex characters).",
        },
      },
      required: ["hash_prefix"],
    },
  },
  {
    name: "get_bim_zone_spec",
    description:
      "Look up LOD-400 BIM spatial zone coordinates, structural member metadata, concrete grade, and linked NCR reference.",
    inputSchema: {
      type: "object",
      properties: {
        bim_zone_id: {
          type: "string",
          description: "BIM zone identifier (e.g., BIT-4-TG03, BIT-2-DOME, BIT-4-PODIUM).",
        },
      },
      required: ["bim_zone_id"],
    },
  },
  {
    name: "get_live_governor_state",
    description:
      "Read the authoritative live Molecular Governor state from Supabase, including HTTP 200/422 gate status, active IS 456/IS 875/CPWD Clause 42 violations, frozen INR, net certified RTGS, and BSA Section 63 SHA-256 hash.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "Project ID (defaults to active VANGUARD-LKO-01).",
        },
      },
    },
  },
  {
    name: "trace_causal_blast_radius",
    description:
      "Build the live Site Ontology Graph (Project -> Zone -> Sensor -> Rules -> Permits -> Escrow -> BSA Ledger) and trace downstream blocked permits, rupee exposure, and structured Kinetic Action Proposals.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "Project ID (optional).",
        },
        focus_node_id: {
          type: "string",
          description: "Optional node ID to trace from (defaults to active ASSET:<zoneId>).",
        },
      },
    },
  },
  {
    name: "simulate_governor_shock",
    description:
      "Fork live Molecular Governor state in memory (zero DB mutation) to simulate compound site shocks (e.g., wind gust, concrete core failure, LiDAR deviation) and return exact rupee, permit, and violation deltas.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project ID (optional)." },
        scenario_name: { type: "string", description: "Label for this what-if fork." },
        wind_speed_ms: { type: "number", description: "Simulated wind speed in m/s (IS 875 crane lockout >= 15 m/s)." },
        overrides: {
          type: "object",
          description: "Optional partial MolecularInput field overrides.",
        },
      },
    },
  },
  {
    name: "get_live_site_weather",
    description:
      "Fetch live hyperlocal GPS weather telemetry (wind speed, gusts, temperature, rain) via Open-Meteo and evaluate live IS 875 crane lockout and hot-weather curing interlocks.",
    inputSchema: {
      type: "object",
      properties: {
        latitude: { type: "number", description: "Site latitude (default 26.8467 Lucknow)." },
        longitude: { type: "number", description: "Site longitude (default 80.9462 Lucknow)." },
        location_label: { type: "string", description: "Site name." },
      },
    },
  },
  {
    name: "verify_audit_hash_chain",
    description:
      "Cryptographically re-hash and verify the append-only BSA Section 63 governor_events chain from genesis to head, detecting any byte-level tampering or deleted sequence numbers.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project ID (optional)." },
        simulate_tamper: { type: "boolean", description: "If true, runs a read-only ₹1 tamper simulation in memory to demonstrate detection." },
      },
    },
  },
  {
    name: "run_triangulation_audit",
    description:
      "Run the 5-way Cross-Signal Triangulation Lie Detector (Paper Challan vs. Gate Weighbridge ANPR vs. Batching PLC vs. Revit BIM Quantity vs. In-Situ Curing Maturity) to detect ghost billing, grade dilution, and CPWD Clause 42 cement shortages.",
    inputSchema: {
      type: "object",
      properties: {
        preset: { type: "string", enum: ["fraud", "clean"], description: "Fixture baseline (defaults to Vanguard TG-03 fraud scenario)." },
        overrides: { type: "object", description: "Optional partial TriangulationInput fields to override." },
      },
    },
  },
];

const getServerSupabase = getSupabaseAdmin;

async function executeTool(name: string, args: Record<string, any>) {
  switch (name) {
    case "get_project_escrow_status": {
      const projectId = String(args.project_id || VANGUARD_GENOME.projectId).trim();
      const supabase = getServerSupabase();
      if (!supabase) {
        return { error: "Supabase client unavailable in environment." };
      }
      const { data, error } = await supabase
        .from("ncr_escrow_gates")
        .select("*")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false })
        .limit(5);

      if (error) {
        return { project_id: projectId, error: error.message };
      }
      return {
        project_id: projectId,
        active_gates_count: (data || []).length,
        total_withholding_lien_inr: (data || []).reduce(
          (sum, g) => sum + (g.gate_status === "LOCKED" ? Number(g.withholding_lien_inr || 0) : 0),
          0
        ),
        gates: data || [],
      };
    }

    case "validate_is456_core_test": {
      const gradeMpa = parseConcreteGradeMpa(args.concrete_grade ?? 50);
      const readings = Array.isArray(args.core_readings_mpa)
        ? args.core_readings_mpa.map((n: unknown) => Number(n))
        : [];
      return validateIs456CoreTest(readings, gradeMpa, {
        inputMode: args.input_mode === "RAW_CORE" ? "RAW_CORE" : "EQUIVALENT_CUBE",
        lengthToDiameterRatio: Number(args.ld_ratio ?? 2.0),
        coreDiameterMm: Number(args.core_diameter_mm ?? 75),
      });
    }

    case "evaluate_is456_cube_batch": {
      const gradeMpa = parseConcreteGradeMpa(args.concrete_grade ?? 50);
      const loads = Array.isArray(args.failure_loads_kn)
        ? args.failure_loads_kn.map((n: unknown) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0)
        : [];
      if (loads.length < 3) {
        return {
          isBatchAccepted: false,
          error: "Minimum 3 cube failure loads in kN are required under IS 456:2000 Cl. 15.2.2.",
        };
      }
      const specimens = loads.map((kn: number, idx: number) => ({
        sampleId: `CUBE-${idx + 1}`,
        ageDays: 28,
        failureLoadKn: kn,
        crossSectionAreaMm2: 22500,
      }));
      return CubeStatisticalAcceptanceEngine.evaluateBatch(gradeMpa, specimens);
    }

    case "verify_section_65b_hash": {
      const prefix = String(args.hash_prefix || "").trim().toLowerCase();
      if (prefix.length < 8 || !/^[a-f0-9]+$/.test(prefix)) {
        return {
          verified: false,
          error: "Provide at least 8 hexadecimal characters of the SHA-256 hash.",
        };
      }
      const supabase = getServerSupabase();
      if (!supabase) {
        return { verified: false, error: "Supabase client unavailable." };
      }

      const { data: ledgerRows } = await supabase
        .from("section_65b_audit_ledger")
        .select("id, project_id, primary_governor, synthesis_report, merkle_root_hash, timestamp, notarized_by")
        .ilike("merkle_root_hash", `${prefix}%`)
        .order("timestamp", { ascending: false })
        .limit(5);

      const { data: fieldRows } = await supabase
        .from("field_grounding_logs")
        .select("id, project_id, bim_zone_id, structural_element, linked_ncr_id, canonical_65b_sha256, created_at")
        .ilike("canonical_65b_sha256", `${prefix}%`)
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: govRows } = await supabase
        .from("governor_snapshots")
        .select("project_id, mode, row_hash, http_status, frozen_inr, updated_at")
        .ilike("row_hash", `${prefix}%`)
        .limit(5);

      const { data: packetRows } = await supabase
        .from("field_evidence_packets")
        .select("id, project_id, zone_id, bim_global_id, sha256, recorded_at_utc")
        .ilike("sha256", `${prefix}%`)
        .limit(5);

      const totalMatches =
        (ledgerRows?.length || 0) +
        (fieldRows?.length || 0) +
        (govRows?.length || 0) +
        (packetRows?.length || 0);
      return {
        verified: totalMatches > 0,
        statutory_basis: "Bharatiya Sakshya Adhiniyam 2023 Sec. 63 / Indian Evidence Act Sec. 65B",
        postgres_immutability_enforced: true,
        match_count: totalMatches,
        ledger_matches: ledgerRows || [],
        field_record_matches: fieldRows || [],
        governor_snapshot_matches: govRows || [],
        field_evidence_packet_matches: packetRows || [],
      };
    }

    case "get_bim_zone_spec": {
      const zoneId = String(args.bim_zone_id || "BIT-4-TG03").trim();
      const meta = findBimZone(zoneId);
      return {
        requested_zone: zoneId,
        zone: meta,
      };
    }

    case "get_live_governor_state": {
      const projectId = args.project_id ? String(args.project_id).trim() : undefined;
      const state = await getGovernorState(projectId);
      return {
        storage_mode: state.storageMode,
        project_id: state.projectId,
        mode: state.mode,
        revision: state.revision,
        updated_at_utc: state.updatedAtUtc,
        http_status: state.snapshot.escrow.httpStatus,
        decision: state.snapshot.escrow.decision,
        frozen_inr: state.snapshot.escrow.frozenInr,
        clause42_penalty_inr: state.snapshot.escrow.clause42PenaltyInr,
        net_certified_release_inr: state.snapshot.escrow.netCertifiedReleaseInr,
        violations: state.snapshot.violations,
        bsa_sec63_hash: state.snapshot.bsaSec63Ledger.rowHash,
      };
    }

    case "trace_causal_blast_radius": {
      const projectId = args.project_id ? String(args.project_id).trim() : undefined;
      const state = await getGovernorState(projectId);
      const graph = buildSiteOntologyGraph(state.input, state.snapshot);
      const focusNodeId = args.focus_node_id ? String(args.focus_node_id).trim() : `ASSET:${state.input.zoneId}`;
      const blast = traceBlastRadius(graph, focusNodeId);
      return {
        project_id: state.projectId,
        summary: graph.summary,
        blast_radius: blast,
        proposed_actions: graph.proposedActions,
      };
    }

    case "simulate_governor_shock": {
      const projectId = args.project_id ? String(args.project_id).trim() : undefined;
      const state = await getGovernorState(projectId);
      const overrides: Partial<MolecularInput> = {
        ...(args.overrides && typeof args.overrides === "object" ? (args.overrides as Partial<MolecularInput>) : {}),
      };
      if (typeof args.wind_speed_ms === "number" && Number.isFinite(args.wind_speed_ms)) {
        overrides.windSpeedMs = args.wind_speed_ms;
      }
      const scenarioName = args.scenario_name ? String(args.scenario_name) : "MCP Agent What-If Fork";
      return simulateScenarioFork(state.input, overrides, scenarioName);
    }

    case "get_live_site_weather": {
      const lat = typeof args.latitude === "number" ? args.latitude : 26.8467;
      const lon = typeof args.longitude === "number" ? args.longitude : 80.9462;
      const label = args.location_label ? String(args.location_label) : "Gomti Nagar Extension, Lucknow";
      const [weather, liveState] = await Promise.all([
        fetchLiveSiteWeather(lat, lon, label),
        getGovernorState(),
      ]);
      const preview = simulateScenarioFork(
        liveState.input,
        { windSpeedMs: weather.interlocks.effectiveWindForGovernorMs },
        "Live GPS Weather Interlock Check"
      );
      return {
        weather,
        governor_impact_preview: {
          simulated_http_status: preview.simulated.httpStatus,
          newly_triggered_codes: preview.deltas.newlyTriggeredCodes,
          resolved_codes: preview.deltas.resolvedCodes,
        },
      };
    }

    case "verify_audit_hash_chain": {
      const projectId = args.project_id ? String(args.project_id).trim() : undefined;
      const simulateTamper = Boolean(args.simulate_tamper);
      return await getAndVerifyProjectChain(projectId, simulateTamper);
    }

    case "run_triangulation_audit": {
      const base = args.preset === "clean" ? VANGUARD_CLEAN_POUR_FIXTURE : VANGUARD_FRAUD_FIXTURE;
      const overrides =
        args.overrides && typeof args.overrides === "object"
          ? (args.overrides as Partial<TriangulationInput>)
          : {};
      return evaluateFiveWayTriangulation({ ...base, ...overrides });
    }

    default:
      throw new Error(`Unknown MCP tool: ${name}`);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  return NextResponse.json(
    {
      protocol: "Model Context Protocol (JSON-RPC 2.0)",
      protocolVersion: MCP_PROTOCOL_VERSION,
      serverInfo: SERVER_INFO,
      endpoint: "/api/mcp",
      tools: MCP_TOOLS,
      exampleRequest: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "validate_is456_core_test",
          arguments: {
            concrete_grade: "M50",
            core_readings_mpa: [44.2, 43.8, 44.21],
          },
        },
      },
    },
    { status: 200, headers: CORS_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: invalid JSON payload" },
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const id = body?.id ?? null;
  const method = String(body?.method || "");
  const params = (body?.params && typeof body.params === "object" ? body.params : {}) as Record<string, any>;

  try {
    if (method === "initialize") {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: MCP_PROTOCOL_VERSION,
            capabilities: { tools: { listChanged: false } },
            serverInfo: SERVER_INFO,
          },
        },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    if (method === "notifications/initialized" || method === "ping") {
      return NextResponse.json(
        { jsonrpc: "2.0", id, result: {} },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    if (method === "tools/list") {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: { tools: MCP_TOOLS },
        },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    if (method === "tools/call") {
      const toolName = String(params.name || "");
      const toolArgs =
        params.arguments && typeof params.arguments === "object" ? params.arguments : {};
      const output = await executeTool(toolName, toolArgs);

      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
            structuredContent: output,
            isError: false,
          },
        },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      },
      { status: 404, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: err?.message || "Internal MCP server error" },
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
