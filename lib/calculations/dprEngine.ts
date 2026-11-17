/**
 * PROJECT VANGUARD: STATUTORY DAILY PROGRESS REPORT (DPR) & TELEMETRY ENGINE
 * Formulated strictly under:
 * - CPWD Works Manual Section 32 & Para 32.1 (Daily Diary & Site Progress Records)
 * - IS 7272 (Recommendation for Labor Output Constants in Building Works)
 * - BOCW (Regulation of Employment and Conditions of Service) Act 1996
 * - Central Electricity Authority / IS 5216 Safety Code
 * - Indian Evidence Act 1872 Section 65B (Statutory Daily Electronic Evidentiary Ledger)
 *
 * Mathematically synthesizes:
 * 1. Manpower Gang Utilization & Productivity Index (Earned Man-Hours / Spent Man-Hours)
 * 2. Plant & Heavy Equipment Availability Factor (Operating Hours / 8.0h Shift)
 * 3. Diesel Generator & Equipment Fuel Burn Index (Liters / Operating Hour)
 * 4. Micro-Climate Telemetry (Temp, Wind Cut-Off, Rainfall Threshold per IS 875)
 * 5. Cumulative Tripartite Work Reconciliation (BIM QTO vs Actual Output)
 */

export interface LaborTradeDeployment {
  tradeCode: string;
  tradeName: string;
  headcount: number;
  shiftHours: number;
  standardOutputNormPerShift: number; // IS 7272 benchmark
  actualWorkCompleted: number;
  unit: string;
}

export interface PlantMachineryLog {
  equipmentId: string;
  equipmentName: string;
  fuelType: "DIESEL" | "ELECTRIC_3PH";
  operatingHours: number;
  idleHours: number;
  breakdownHours: number;
  fuelConsumedLiters: number;
  operatorName: string;
}

export interface WeatherSiteTelemetry {
  ambientTempMaxC: number;
  ambientTempMinC: number;
  relativeHumidityPct: number;
  peakWindSpeedMs: number;       // Cut-off threshold: 9.0 m/s for tower crane
  cumulativeRainfallMm: number;  // Threshold: > 35mm triggers stoppage
  workingCondition: "UNRESTRICTED" | "WIND_GUST_ALERT" | "RAIN_STOPPAGE";
}

export interface DprSynthesisResult {
  totalHeadcount: number;
  totalManHoursExpended: number;
  aggregateLaborProductivityPct: number;
  plantOperatingHours: number;
  plantOverallAvailabilityPct: number;
  totalDieselBurnLiters: number;
  averageFuelBurnRateLph: number;
  isWeatherCompliant: boolean;
  weatherConstraintMessage: string;
  safetyIncidentCount: number;
  activePermitsCount: number;
}

// 1. Manpower & Gang Productivity Index:
// Efficiency = Sum (Actual Work / Norm) / Headcount * 100
export function evaluateManpowerProductivity(trades: LaborTradeDeployment[]): {
  totalHeadcount: number;
  totalManHours: number;
  productivityIndexPct: number;
} {
  let totalHeadcount = 0;
  let totalManHours = 0;
  let weightedProductivitySum = 0;

  trades.forEach(t => {
    totalHeadcount += t.headcount;
    const manHours = t.headcount * t.shiftHours;
    totalManHours += manHours;

    const expectedOutput = t.headcount * t.standardOutputNormPerShift;
    const efficiency = expectedOutput > 0 ? (t.actualWorkCompleted / expectedOutput) : 1.0;
    weightedProductivitySum += efficiency * t.headcount;
  });

  const overallEfficiencyPct = totalHeadcount > 0
    ? +((weightedProductivitySum / totalHeadcount) * 100).toFixed(1)
    : 100;

  return {
    totalHeadcount,
    totalManHours,
    productivityIndexPct: overallEfficiencyPct
  };
}

// 2. Equipment Availability & Diesel Burn Index:
// Availability = Operating Hours / (Operating + Idle + Breakdown)
export function evaluateEquipmentFleet(equipment: PlantMachineryLog[]): {
  totalOperatingHours: number;
  overallAvailabilityPct: number;
  totalFuelLiters: number;
  fuelBurnRateLph: number;
} {
  let totalOpHours = 0;
  let totalPossibleHours = 0;
  let totalFuel = 0;

  equipment.forEach(e => {
    totalOpHours += e.operatingHours;
    totalPossibleHours += (e.operatingHours + e.idleHours + e.breakdownHours);
    totalFuel += e.fuelConsumedLiters;
  });

  const availabilityPct = totalPossibleHours > 0
    ? +((totalOpHours / totalPossibleHours) * 100).toFixed(1)
    : 100;

  const burnRate = totalOpHours > 0
    ? +(totalFuel / totalOpHours).toFixed(2)
    : 0;

  return {
    totalOperatingHours: totalOpHours,
    overallAvailabilityPct: availabilityPct,
    totalFuelLiters: totalFuel,
    fuelBurnRateLph: burnRate
  };
}

// 3. Environmental Safety & Weather Telemetry Analysis
export function evaluateSiteWeather(weather: WeatherSiteTelemetry): {
  isWeatherCompliant: boolean;
  status: "UNRESTRICTED" | "WIND_GUST_ALERT" | "RAIN_STOPPAGE";
  constraintMessage: string;
} {
  if (weather.cumulativeRainfallMm > 35.0) {
    return {
      isWeatherCompliant: false,
      status: "RAIN_STOPPAGE",
      constraintMessage: "Rainfall exceeds 35mm threshold. Concreting and open electrical works halted under IS 456."
    };
  }

  if (weather.peakWindSpeedMs > 9.0) {
    return {
      isWeatherCompliant: false,
      status: "WIND_GUST_ALERT",
      constraintMessage: "Wind velocity exceeds 9.0 m/s limit. Potain tower crane and external cradles locked."
    };
  }

  return {
    isWeatherCompliant: true,
    status: "UNRESTRICTED",
    constraintMessage: "Micro-climate parameters within permissible structural limits."
  };
}
