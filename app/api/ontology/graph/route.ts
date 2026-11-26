import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/server/http";
import { getGovernorState } from "@/lib/repositories/governorRepo";
import { buildSiteOntologyGraph, traceBlastRadius } from "@/lib/domain/ontologyEngine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId") || undefined;
  const focusNode = req.nextUrl.searchParams.get("focusNode");

  const state = await getGovernorState(projectId);
  const graph = buildSiteOntologyGraph(state.input, state.snapshot);
  const blastRadius = traceBlastRadius(graph, focusNode || `ASSET:${state.input.zoneId}`);

  return jsonOk({
    ok: true,
    storageMode: state.storageMode,
    mode: state.mode,
    graph,
    blastRadius,
  });
}
