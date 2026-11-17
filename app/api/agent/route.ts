import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  dispatchVanguardGovernorQuery,
  GovernorId,
} from "@/lib/agents/quadillarAgentMesh";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt : "";
    const governor = body?.governor as GovernorId | undefined;
    const notarize = Boolean(body?.notarize);

    const synthesis = dispatchVanguardGovernorQuery(prompt, governor);
    const timestampIso = new Date().toISOString();
    const merkleHash = crypto
      .createHash("sha256")
      .update(`${synthesis.merklePayload}_${timestampIso}`)
      .digest("hex");

    if (notarize) {
      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: synthesis.projectId,
          primary_governor: `${synthesis.primaryGovernor}-KERNEL`,
          synthesis_report: `${synthesis.headline} • ${synthesis.summary}`,
          merkle_root_hash: merkleHash,
        });
      } catch (dbErr) {
        // Non-blocking if offline
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: timestampIso,
      merkleHash,
      notarized: notarize,
      synthesis,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Agent kernel dispatch failed" },
      { status: 400 }
    );
  }
}
