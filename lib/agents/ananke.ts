import { OeeFleetEngine } from "./sub-agents/ananke/oee-engine";
import { HermesAgent } from "./hermes";

export class AnankeAgent {
  static evaluateAssetTelematics(params: {
    assetCode: string;
    category: string;
    plannedOperatingHours: number;
    actualOperatingHours: number;
    idlingHours: number;
    fuelConsumedLiters: number;
    oemRatedFuelBurnLph: number;
    outputVolumeM3: number;
    targetVolumeM3: number;
    fitnessExpiryDateIso: string;
  }) {
    const oee = OeeFleetEngine.compute(
      params.actualOperatingHours,
      params.plannedOperatingHours,
      params.outputVolumeM3,
      params.targetVolumeM3
    );

    const effectiveHours = Math.max(0.5, params.actualOperatingHours);
    const burnRate = params.fuelConsumedLiters / effectiveHours;
    const fuelVariancePct = params.oemRatedFuelBurnLph > 0
      ? parseFloat((((burnRate - params.oemRatedFuelBurnLph) / params.oemRatedFuelBurnLph) * 100).toFixed(1))
      : 0;

    const isFitnessExpired = new Date(params.fitnessExpiryDateIso).getTime() < Date.now();
    const isFuelPilferageFlagged = fuelVariancePct > 15.0;

    let operationalStatus: "ONLINE" | "GROUNDED_SAFETY_HOLD" | "MAINTENANCE_FLAG" = "ONLINE";
    if (isFitnessExpired) operationalStatus = "GROUNDED_SAFETY_HOLD";
    else if (isFuelPilferageFlagged) operationalStatus = "MAINTENANCE_FLAG";

    return {
      assetCode: params.assetCode,
      overallOeePct: oee,
      fuelVariancePct,
      isFuelPilferageFlagged,
      isFitnessExpired,
      operationalStatus,
    };
  }
}
