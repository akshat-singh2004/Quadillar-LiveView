export class OeeFleetEngine {
  static compute(operatingHours: number, plannedHours: number, actualOutput: number, targetOutput: number): number {
    const availability = plannedHours > 0 ? Math.min(1.0, operatingHours / plannedHours) : 0;
    const performance = targetOutput > 0 ? Math.min(1.0, actualOutput / targetOutput) : 1.0;
    return parseFloat((availability * performance * 100).toFixed(1));
  }
}
