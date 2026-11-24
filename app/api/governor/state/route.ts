import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  EXTREME_TG03_FIXTURE,
  evaluateMolecularGovernor,
  type MolecularInput,
} from "@/lib/engines/molecularGovernor";

export const dynamic = "force-dynamic";

interface StoredGovernorRecord {
  projectId: string;
  mode: "stress-test" | "compliant" | "custom";
  revision: number;
  input: MolecularInput;
  updatedAtUtc: string;
}

const g = globalThis as typeof globalThis & {
  __quadillarGovState?: Map<string, StoredGovernorRecord>;
};
const memStore = (g.__quadillarGovState ??= new Map());

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId") || EXTREME_TG03_FIXTURE.projectId;
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("governor_snapshots")
        .select("project_id, mode, revision, input_payload, updated_at")
        .eq("project_id", projectId)
        .maybeSingle();

      if (!error) {
        if (data?.input_payload) {
          const input = data.input_payload as MolecularInput;
          const snapshot = evaluateMolecularGovernor(input);
          return NextResponse.json({
            storageMode: "supabase",
            projectId,
            mode: (data.mode as StoredGovernorRecord["mode"]) || "custom",
            revision: Number(data.revision || 0),
            updatedAtUtc: String(data.updated_at || new Date().toISOString()),
            input,
            snapshot,
          });
        }
        const fallbackSnapshot = evaluateMolecularGovernor(EXTREME_TG03_FIXTURE);
        return NextResponse.json({
          storageMode: "supabase",
          projectId,
          mode: "stress-test",
          revision: 0,
          updatedAtUtc: EXTREME_TG03_FIXTURE.recordedAtUtc,
          input: EXTREME_TG03_FIXTURE,
          snapshot: fallbackSnapshot,
        });
      }
    } catch {
      // Fall through to memory ledger
    }
  }

  const cached = memStore.get(projectId);
  const activeInput = cached?.input ?? EXTREME_TG03_FIXTURE;
  const snapshot = evaluateMolecularGovernor(activeInput);

  return NextResponse.json({
    storageMode: "edge_fallback",
    projectId,
    mode: cached?.mode ?? "stress-test",
    revision: cached?.revision ?? 0,
    updatedAtUtc: cached?.updatedAtUtc ?? activeInput.recordedAtUtc,
    input: activeInput,
    snapshot,
  });
}

export async function POST(req: NextRequest) {
  let body: {
    projectId?: string;
    mode?: "stress-test" | "compliant" | "custom";
    revision?: number;
    input?: Partial<MolecularInput>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mergedInput: MolecularInput = {
    ...EXTREME_TG03_FIXTURE,
    ...(body.input || {}),
    recordedAtUtc: body.input?.recordedAtUtc || new Date().toISOString(),
  };

  const projectId = body.projectId || mergedInput.projectId;
  const mode = body.mode || "custom";
  const revision = typeof body.revision === "number" && body.revision > 0 ? body.revision : Date.now();
  const snapshot = evaluateMolecularGovernor(mergedInput);
  const updatedAtUtc = new Date().toISOString();

  memStore.set(projectId, {
    projectId,
    mode,
    revision,
    input: mergedInput,
    updatedAtUtc,
  });

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("governor_snapshots").upsert(
        {
          project_id: projectId,
          mode,
          revision,
          input_payload: mergedInput,
          row_hash: snapshot.bsaSec63Ledger.rowHash,
          http_status: snapshot.escrow.httpStatus,
          frozen_inr: snapshot.escrow.frozenInr,
          net_release_inr: snapshot.escrow.netCertifiedReleaseInr,
          violation_count: snapshot.violations.length,
          updated_at: updatedAtUtc,
        },
        { onConflict: "project_id" }
      );

      if (!error) {
        return NextResponse.json(
          {
            ok: true,
            storageMode: "supabase",
            projectId,
            mode,
            revision,
            updatedAtUtc,
            input: mergedInput,
            snapshot,
          },
          { headers: { "X-BSA-Sec63-Hash": snapshot.bsaSec63Ledger.rowHash } }
        );
      }
    } catch {
      // Fall through gracefully
    }
  }

  return NextResponse.json(
    {
      ok: true,
      storageMode: "edge_fallback",
      projectId,
      mode,
      revision,
      updatedAtUtc,
      input: mergedInput,
      snapshot,
    },
    { headers: { "X-BSA-Sec63-Hash": snapshot.bsaSec63Ledger.rowHash } }
  );
}
