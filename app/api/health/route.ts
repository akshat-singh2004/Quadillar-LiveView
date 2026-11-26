import { getSupabaseAdmin, hasServiceRoleKey } from "@/lib/server/supabaseAdmin";
import { jsonOk } from "@/lib/server/http";
import {
  EXTREME_TG03_FIXTURE,
  evaluateMolecularGovernor,
} from "@/lib/engines/molecularGovernor";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();

  const snap = evaluateMolecularGovernor(EXTREME_TG03_FIXTURE);
  const governorOk =
    snap.escrow.httpStatus === 422 &&
    snap.escrow.netCertifiedReleaseInr === 17900880 &&
    snap.bsaSec63Ledger.rowHash.length === 64;

  let dbStatus: "ok" | "unconfigured" | "error" = "unconfigured";
  let dbLatencyMs: number | null = null;
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const dbStart = Date.now();
    try {
      const { error } = await supabase.from("field_evidence_packets").select("id").limit(1);
      dbLatencyMs = Date.now() - dbStart;
      dbStatus = error ? "error" : "ok";
    } catch {
      dbLatencyMs = Date.now() - dbStart;
      dbStatus = "error";
    }
  }

  const healthy = governorOk && dbStatus !== "error";

  return jsonOk(
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
        serviceRoleConfigured: hasServiceRoleKey(),
      },
    },
    healthy ? 200 : 503
  );
}
