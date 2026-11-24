import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  EXTREME_TG03_FIXTURE,
  evaluateMolecularGovernor,
} from "@/lib/engines/molecularGovernor";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();

  // 1. Deterministic Molecular Governor self-check
  const snap = evaluateMolecularGovernor(EXTREME_TG03_FIXTURE);
  const governorOk =
    snap.escrow.httpStatus === 422 &&
    snap.escrow.netCertifiedReleaseInr === 17900880 &&
    snap.bsaSec63Ledger.rowHash.length === 64;

  // 2. Supabase connectivity & free-tier keep-warm ping
  let dbStatus: "ok" | "unconfigured" | "error" = "unconfigured";
  let dbLatencyMs: number | null = null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    const dbStart = Date.now();
    try {
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      const { error } = await supabase.from("field_evidence_packets").select("id").limit(1);
      dbLatencyMs = Date.now() - dbStart;
      dbStatus = error ? "error" : "ok";
    } catch {
      dbLatencyMs = Date.now() - dbStart;
      dbStatus = "error";
    }
  }

  const healthy = governorOk && dbStatus !== "error";

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      timestampUtc: new Date().toISOString(),
      uptimeCheckMs: Date.now() - started,
      governor: {
        ok: governorOk,
        violationsChecked: snap.violations.length,
        hashPrefix: snap.bsaSec63Ledger.rowHash.slice(0, 12),
      },
      supabase: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
