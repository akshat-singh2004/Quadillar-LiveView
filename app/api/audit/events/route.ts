import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/server/http";
import { listGovernorEvents, verifyEventChain } from "@/lib/repositories/eventLedgerRepo";
import { EXTREME_TG03_FIXTURE } from "@/lib/engines/molecularGovernor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId") || EXTREME_TG03_FIXTURE.projectId;
  const rawLimit = Number(req.nextUrl.searchParams.get("limit") || "50");
  const limit = Number.isFinite(rawLimit) ? Math.min(200, Math.max(1, rawLimit)) : 50;

  const { storageMode, events } = await listGovernorEvents(projectId, limit);
  const integrity = verifyEventChain(projectId, events);

  return jsonOk({
    ok: true,
    storageMode,
    projectId,
    count: events.length,
    chainValid: integrity.valid,
    headHash: integrity.headHash,
    events,
  });
}
