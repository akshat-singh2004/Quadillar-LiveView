import { NextRequest, NextResponse } from "next/server";
import {
  CONSTRUCTION_PROFILES,
  QUADMAX_FUNCTION_REGISTRY,
  ConstructionProfileId,
  GovernorId,
  executeQuadmaxFunction,
  dispatchVanguardGovernorQuery,
} from "@/lib/agents/quadillarAgentMesh";

export async function GET() {
  return NextResponse.json({
    kernel: "QUADMAX.AI",
    profiles: CONSTRUCTION_PROFILES,
    functions: QUADMAX_FUNCTION_REGISTRY.map(({ execute: _exec, ...meta }) => meta),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { functionId, query, prompt, governor, profileId } = body || {};

    if (typeof functionId === "string" && functionId.trim().length > 0) {
      const result = executeQuadmaxFunction(functionId.trim());
      return NextResponse.json({ ok: true, result });
    }

    const inputText = String(query ?? prompt ?? "Project Vanguard executive pulse");
    const result = dispatchVanguardGovernorQuery(
      inputText,
      governor as GovernorId | undefined,
      profileId as ConstructionProfileId | undefined
    );
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Invalid QUADMAX kernel payload" },
      { status: 400 }
    );
  }
}
