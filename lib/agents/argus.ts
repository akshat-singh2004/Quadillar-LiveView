import { MicroclimateWeatherAuditor } from "./sub-agents/argus/weather-auditor";
import { HermesAgent } from "./hermes";

export class ArgusAgent {
  static evaluateMicroclimate(params: { windSpeedKmh: number; rainfallRateMmh: number; temperatureC: number }) {
    return MicroclimateWeatherAuditor.evaluate(params.windSpeedKmh, params.rainfallRateMmh, params.temperatureC);
  }
}
