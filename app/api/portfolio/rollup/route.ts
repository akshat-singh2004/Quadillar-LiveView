import { jsonOk } from "@/lib/server/http";
import { getGovernorState } from "@/lib/repositories/governorRepo";
import {
  computePortfolioRollup,
  hydratePortfolioGovernorState,
  listPortfolioProjects,
} from "@/lib/domain/portfolioRegistry";

export const dynamic = "force-dynamic";

export async function GET() {
  const roster = listPortfolioProjects();

  const hydrated = await Promise.all(
    roster.map(async (item) => {
      const raw = await getGovernorState(item.projectId);
      const state = hydratePortfolioGovernorState(item.projectId, raw);
      return {
        project: state.project,
        snapshot: state.snapshot,
        storageMode: state.storageMode,
      };
    })
  );

  const rollup = computePortfolioRollup(hydrated);
  return jsonOk({
    ok: true,
    generatedAtUtc: new Date().toISOString(),
    rollup,
  });
}
