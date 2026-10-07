export class MicroclimateWeatherAuditor {
  static evaluate(windSpeedKmh: number, rainfallRateMmh: number, tempC: number): {
    permitted: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];
    if (windSpeedKmh > 38.0) reasons.push(`HIGH WIND STOPPAGE: Gusts ${windSpeedKmh} km/h exceed 38 km/h crane cutoff (IS 13367).`);
    if (rainfallRateMmh > 5.0) reasons.push(`PRECIPITATION STOPPAGE: Rain ${rainfallRateMmh} mm/h exceeds concreting limits.`);
    if (tempC > 40.0) reasons.push(`HOT WEATHER HOLD: Ambient ${tempC}°C requires ice-slurry batching (IS 456 Cl. 13.3).`);
    return { permitted: reasons.length === 0, reasons };
  }
}
