import { jsonOk } from "@/lib/server/http";
import { getAiRouterDiagnostics } from "@/lib/ai/modelRouter";
import { getConfiguredExternalMcpServers } from "@/lib/mcp/outboundConnectors";

export const dynamic = "force-dynamic";

export async function GET() {
  const ai = getAiRouterDiagnostics();
  const externalMcp = getConfiguredExternalMcpServers().map((s) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    authConfigured: Boolean(s.authBearer),
  }));

  return jsonOk({
    ok: true,
    aiRouter: ai,
    mcpFabric: {
      inboundServerEndpoint: "/api/mcp",
      externalConnectorsCount: externalMcp.length,
      externalConnectors: externalMcp,
      builtInLiveConnectors: ["open_meteo_weather"],
    },
  });
}
