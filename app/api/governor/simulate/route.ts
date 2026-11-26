import { NextRequest } from "next/server";
import { jsonError, jsonOk, readJsonBody } from "@/lib/server/http";
import { getGovernorState } from "@/lib/repositories/governorRepo";
import { simulateScenarioFork } from "@/lib/domain/ontologyEngine";
import { hydratePortfolioGovernorState } from "@/lib/domain/portfolioRegistry";
import type { MolecularInput } from "@/lib/engines/molecularGovernor";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await readJsonBody<{
    projectId?: string;
    scenarioName?: string;
    overrides?: Partial<MolecularInput>;
  }>(req);

  if (!body || !body.overrides || typeof body.overrides !== "object") {
    return jsonError("Request must include an 'overrides' object with MolecularInput fields.", 400);
  }

  const rawLive = await getGovernorState(body.projectId);
  const live = hydratePortfolioGovernorState(body.projectId, rawLive);
  const simulation = simulateScenarioFork(
    live.input,
    body.overrides,
    body.scenarioName || "Executive What-If Fork"
  );

  return jsonOk({
    ok: true,
    projectId: live.projectId,
    projectName: live.project.name,
    storageMode: live.storageMode,
    simulation,
  });
}
