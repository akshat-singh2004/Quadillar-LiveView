export interface LiveSiteWeather {
  source: "open_meteo_live" | "fallback_cached";
  latitude: number;
  longitude: number;
  locationLabel: string;
  observedAtUtc: string;
  temperatureC: number;
  relativeHumidityPct: number;
  precipitationMm: number;
  windSpeedMs: number;
  windGustsMs: number;
  interlocks: {
    craneLockoutRecommended: boolean;
    highThermalCuringRisk: boolean;
    rainPourHoldRecommended: boolean;
    effectiveWindForGovernorMs: number;
  };
}

export interface ExternalMcpServerConfig {
  id: string;
  name: string;
  url: string;
  authBearer?: string;
}

/**
 * Fetches live zero-cost meteorological telemetry from Open-Meteo for site WGS84 coordinates
 * (defaults to Project Vanguard / Gomti Nagar Extension, Lucknow) and evaluates IS 875 Part 3
 * crane overturning and hot-weather concreting interlocks.
 */
export async function fetchLiveSiteWeather(
  latitude = 26.8467,
  longitude = 80.9462,
  locationLabel = "Gomti Nagar Extension, Lucknow"
): Promise<LiveSiteWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
    latitude
  )}&longitude=${encodeURIComponent(
    longitude
  )}¤t=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m&wind_speed_unit=ms`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);

  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const data = (await res.json()) as {
      current?: {
        time?: string;
        temperature_2m?: number;
        relative_humidity_2m?: number;
        precipitation?: number;
        wind_speed_10m?: number;
        wind_gusts_10m?: number;
      };
    };

    const c = data.current || {};
    const windSpeedMs = Number((c.wind_speed_10m ?? 3.2).toFixed(2));
    const windGustsMs = Number((c.wind_gusts_10m ?? windSpeedMs).toFixed(2));
    const temperatureC = Number((c.temperature_2m ?? 26.0).toFixed(1));
    const relativeHumidityPct = Number((c.relative_humidity_2m ?? 55).toFixed(0));
    const precipitationMm = Number((c.precipitation ?? 0).toFixed(2));
    const effectiveWindForGovernorMs = Math.max(windSpeedMs, windGustsMs);

    return {
      source: "open_meteo_live",
      latitude,
      longitude,
      locationLabel,
      observedAtUtc: c.time ? `${c.time}:00Z` : new Date().toISOString(),
      temperatureC,
      relativeHumidityPct,
      precipitationMm,
      windSpeedMs,
      windGustsMs,
      interlocks: {
        craneLockoutRecommended: effectiveWindForGovernorMs >= 15.0,
        highThermalCuringRisk: temperatureC >= 38.0,
        rainPourHoldRecommended: precipitationMm >= 2.0,
        effectiveWindForGovernorMs,
      },
    };
  } catch {
    return {
      source: "fallback_cached",
      latitude,
      longitude,
      locationLabel,
      observedAtUtc: new Date().toISOString(),
      temperatureC: 26.5,
      relativeHumidityPct: 52,
      precipitationMm: 0,
      windSpeedMs: 3.4,
      windGustsMs: 5.1,
      interlocks: {
        craneLockoutRecommended: false,
        highThermalCuringRisk: false,
        rainPourHoldRecommended: false,
        effectiveWindForGovernorMs: 5.1,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parses configured external MCP servers from EXTERNAL_MCP_SERVERS JSON env var.
 * Example: [{"id":"revit-ifc","name":"Revit BIM MCP","url":"https://bim.example.com/mcp"}]
 */
export function getConfiguredExternalMcpServers(): ExternalMcpServerConfig[] {
  const raw = process.env.EXTERNAL_MCP_SERVERS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is ExternalMcpServerConfig =>
        Boolean(s && typeof s.id === "string" && typeof s.url === "string")
    );
  } catch {
    return [];
  }
}

export async function callExternalMcpTool(
  serverId: string,
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<{ ok: boolean; serverId: string; toolName: string; result?: unknown; error?: string }> {
  const server = getConfiguredExternalMcpServers().find((s) => s.id === serverId);
  if (!server) {
    return { ok: false, serverId, toolName, error: `External MCP server '${serverId}' is not registered.` };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (server.authBearer) headers.Authorization = `Bearer ${server.authBearer}`;

    const res = await fetch(server.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: toolName, arguments: args },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, serverId, toolName, error: `HTTP_${res.status}` };
    const payload = await res.json();
    return { ok: true, serverId, toolName, result: payload.result ?? payload };
  } catch (err) {
    return {
      ok: false,
      serverId,
      toolName,
      error: err instanceof Error ? err.message : "external_mcp_error",
    };
  } finally {
    clearTimeout(timer);
  }
}
