import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/server/http";
import { getGovernorState } from "@/lib/repositories/governorRepo";
import { buildSiteOntologyGraph, traceBlastRadius } from "@/lib/domain/ontologyEngine";
import { hydratePortfolioGovernorState } from "@/lib/domain/portfolioRegistry";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId") || undefined;
  const focusNode = req.nextUrl.searchParams.get("focusNode");

  const rawState = await getGovernorState(projectId);
  const state = hydratePortfolioGovernorState(projectId, rawState);
  const graph = buildSiteOntologyGraph(state.input, state.snapshot);
  const blastRadius = traceBlastRadius(graph, focusNode || `ASSET:${state.input.zoneId}`);

  return jsonOk({
    ok: true,
    storageMode: state.storageMode,
    mode: state.mode,
    project: {
      projectId: state.project.projectId,
      code: state.project.code,
      name: state.project.name,
      location: state.project.location,
      contractValueCr: state.project.contractValueCr,
      status: state.project.status,
    },
    graph,
    blastRadius,
  });
}
