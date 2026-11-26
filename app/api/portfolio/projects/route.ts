import { jsonOk } from "@/lib/server/http";
import { listPortfolioProjects } from "@/lib/domain/portfolioRegistry";
import { EXTREME_TG03_FIXTURE } from "@/lib/engines/molecularGovernor";

export const dynamic = "force-dynamic";

export async function GET() {
  const projects = listPortfolioProjects();
  return jsonOk({
    ok: true,
    defaultProjectId: EXTREME_TG03_FIXTURE.projectId,
    count: projects.length,
    projects,
  });
}
