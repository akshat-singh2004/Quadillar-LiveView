import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/server/http";
import { getAndVerifyProjectChain } from "@/lib/repositories/eventLedgerRepo";
import { EXTREME_TG03_FIXTURE } from "@/lib/engines/molecularGovernor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId") || EXTREME_TG03_FIXTURE.projectId;
  const simulateTamper = req.nextUrl.searchParams.get("simulateTamper") === "1";

  const result = await getAndVerifyProjectChain(projectId, simulateTamper);
  return jsonOk({
    ok: true,
    ...result,
  });
}
