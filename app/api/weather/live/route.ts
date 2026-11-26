import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/server/http";
import { fetchLiveSiteWeather } from "@/lib/mcp/outboundConnectors";
import { getGovernorState } from "@/lib/repositories/governorRepo";
import { simulateScenarioFork } from "@/lib/domain/ontologyEngine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat") || "26.8467");
  const lon = Number(req.nextUrl.searchParams.get("lon") || "80.9462");
  const label = req.nextUrl.searchParams.get("label") || "Gomti Nagar Extension, Lucknow";
  const projectId = req.nextUrl.searchParams.get("projectId") || undefined;

  const [weather, liveState] = await Promise.all([
    fetchLiveSiteWeather(Number.isFinite(lat) ? lat : 26.8467, Number.isFinite(lon) ? lon : 80.9462, label),
    getGovernorState(projectId),
  ]);

  const weatherImpactPreview = simulateScenarioFork(
    liveState.input,
    { windSpeedMs: weather.interlocks.effectiveWindForGovernorMs },
    "Live Meteorological Wind Injection"
  );

  return jsonOk({
    ok: true,
    weather,
    governorImpactPreview: {
      effectiveWindMs: weather.interlocks.effectiveWindForGovernorMs,
      simulatedHttpStatus: weatherImpactPreview.simulated.httpStatus,
      newlyTriggeredCodes: weatherImpactPreview.deltas.newlyTriggeredCodes,
      resolvedCodes: weatherImpactPreview.deltas.resolvedCodes,
    },
  });
}
