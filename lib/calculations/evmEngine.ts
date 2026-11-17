/**
 * PROJECT VANGUARD: EARNED VALUE MANAGEMENT (EVM) & S-CURVE FORECASTING ENGINE
 * Formulated strictly under:
 * - IS 15883 (Part 1 & 2): Construction Project Management - Guidelines
 * - ANSI/PMI 19-006-2019 (The Standard for Earned Value Management)
 * - ISO 21508:2018 (Earned Value Management in Project and Programme Management)
 *
 * Mathematically models the cumulative S-curve via generalized logistic distributions,
 * calculates PV (BCWS), EV (BCWP), AC (ACWP), Cost/Schedule Performance Indices,
 * and executes dual-index asymptotic forecasting (EAC, VAC, TCPI).
 */

export interface EvmProjectBaseline {
  totalBudgetAtCompletionBacInr: number; // BAC derived from physical BIM BOQ
  plannedDurationWeeks: number;           // Total contract duration (e.g., 24 weeks)
  reportingWeek: number;                  // Current tracking week (e.g., Week 12)
  zoneWeightages: {
    zoneA_Foundation: number; // 0.18
    zoneB_Podium: number;     // 0.24
    zoneC_Superstructure: number; // 0.36
    zoneD_RoofMep: number;    // 0.22
  };
}

export interface ZonePhysicalProgress {
  zoneA_ProgressPct: number; // 0 to 100
  zoneB_ProgressPct: number;
  zoneC_ProgressPct: number;
  zoneD_ProgressPct: number;
  actualCostIncurredInr: number; // Actual site expenditure (ACWP)
}

export interface S說urveDataPoint {
  week: number;
  plannedValueInr: number;  // PV (BCWS)
  earnedValueInr: number | null;   // EV (BCWP)
  actualCostInr: number | null;    // AC (ACWP)
  forecastEacInr: number | null;   // Projected trajectory
}

export interface EvmCalculationResult {
  bacInr: number;
  pvInr: number;
  evInr: number;
  acInr: number;
  cvInr: number;
  svInr: number;
  cpi: number;
  spi: number;
  eacInr: number;
  eacCompositeInr: number;
  vacInr: number;
  tcpiBac: number;
  tcpiEac: number;
  projectedDurationWeeks: number;
  scheduleDelayWeeks: number;
  costStatus: "UNDER_BUDGET" | "ON_BUDGET" | "COST_OVERRUN";
  scheduleStatus: "AHEAD_OF_SCHEDULE" | "ON_SCHEDULE" | "SCHEDULE_SLIPPAGE";
  sCurvePoints: S說urveDataPoint[];
}

// 1. Sigmoidal Logistic S-Curve Distribution: PV(t) = BAC / (1 + exp(-k * (t - t0)))
export function calculatePlannedValueAtWeek(week: number, totalWeeks: number, bac: number): number {
  if (week <= 0) return 0;
  if (week >= totalWeeks) return bac;

  // Normalized midpoint t0 = totalWeeks / 2, steepness k = 6 / totalWeeks
  const t0 = totalWeeks / 2;
  const k = 6.0 / totalWeeks;
  const rawLogistic = 1 / (1 + Math.exp(-k * (week - t0)));

  // Normalize endpoints to guarantee exact 0 at week 0 and exact BAC at totalWeeks
  const minLogistic = 1 / (1 + Math.exp(-k * (0 - t0)));
  const maxLogistic = 1 / (1 + Math.exp(-k * (totalWeeks - t0)));
  const normalizedFactor = (rawLogistic - minLogistic) / (maxLogistic - minLogistic);

  return +(bac * normalizedFactor).toFixed(2);
}

// 2. Full Analytical EVM Computation
export function calculateProjectEvm(
  baseline: EvmProjectBaseline,
  progress: ZonePhysicalProgress
): EvmCalculationResult {
  const bac = baseline.totalBudgetAtCompletionBacInr;
  const currentWeek = baseline.reportingWeek;
  const totalWeeks = baseline.plannedDurationWeeks;

  // Planned Value (PV / BCWS) at current week
  const pvInr = calculatePlannedValueAtWeek(currentWeek, totalWeeks, bac);

  // Earned Value (EV / BCWP) = Sum [ Zone Progress * Weight * BAC ]
  const evInr = +(
    bac * (
      (progress.zoneA_ProgressPct / 100) * baseline.zoneWeightages.zoneA_Foundation +
      (progress.zoneB_ProgressPct / 100) * baseline.zoneWeightages.zoneB_Podium +
      (progress.zoneC_ProgressPct / 100) * baseline.zoneWeightages.zoneC_Superstructure +
      (progress.zoneD_ProgressPct / 100) * baseline.zoneWeightages.zoneD_RoofMep
    )
  ).toFixed(2);

  const acInr = +progress.actualCostIncurredInr.toFixed(2);

  // Variances
  const cvInr = +(evInr - acInr).toFixed(2);
  const svInr = +(evInr - pvInr).toFixed(2);

  // Performance Indices
  const cpi = acInr > 0 ? +(evInr / acInr).toFixed(3) : 1.0;
  const spi = pvInr > 0 ? +(evInr / pvInr).toFixed(3) : 1.0;

  // Forecasting per ANSI/PMI 19-006:
  // 1. EAC standard (at current cost efficiency): EAC = BAC / CPI
  const eacInr = cpi > 0 ? +(bac / cpi).toFixed(2) : bac;

  // 2. EAC composite (accounting for both CPI and SPI drag): EAC = AC + (BAC - EV) / (CPI * SPI)
  const cpiSpiProduct = Math.max(0.1, cpi * spi);
  const eacCompositeInr = +(acInr + (bac - evInr) / cpiSpiProduct).toFixed(2);

  // Variance at Completion: VAC = BAC - EAC
  const vacInr = +(bac - eacInr).toFixed(2);

  // To-Complete Performance Index (TCPI)
  // TCPI_BAC = (BAC - EV) / (BAC - AC)
  const remainingWork = Math.max(0, bac - evInr);
  const remainingBudget = bac - acInr;
  const tcpiBac = remainingBudget > 0 ? +(remainingWork / remainingBudget).toFixed(3) : 9.99;

  // TCPI_EAC = (BAC - EV) / (EAC - AC)
  const revisedRemainingFunds = Math.max(1, eacInr - acInr);
  const tcpiEac = +(remainingWork / revisedRemainingFunds).toFixed(3);

  // Time Estimate at Completion: EAC_t = TotalWeeks / SPI
  const projectedDurationWeeks = spi > 0 ? +(totalWeeks / spi).toFixed(1) : totalWeeks;
  const scheduleDelayWeeks = +(projectedDurationWeeks - totalWeeks).toFixed(1);

  // Status classification
  const costStatus = cpi >= 1.0 ? (cpi === 1.0 ? "ON_BUDGET" : "UNDER_BUDGET") : "COST_OVERRUN";
  const scheduleStatus = spi >= 1.0 ? (spi === 1.0 ? "ON_SCHEDULE" : "AHEAD_OF_SCHEDULE") : "SCHEDULE_SLIPPAGE";

  // Generate 24-Week S-Curve Data Array
  const sCurvePoints: S說urveDataPoint[] = [];
  for (let w = 0; w <= totalWeeks; w++) {
    const plannedVal = calculatePlannedValueAtWeek(w, totalWeeks, bac);
    let earnedVal: number | null = null;
    let actualCst: number | null = null;
    let forecastVal: number | null = null;

    if (w <= currentWeek) {
      // Historical actual curve interpolation up to current reporting week
      const ratio = w / currentWeek;
      earnedVal = +(evInr * Math.pow(ratio, 1.15)).toFixed(2);
      actualCst = +(acInr * Math.pow(ratio, 1.08)).toFixed(2);
      forecastVal = actualCst;
    } else {
      // Future projected S-Curve trajectory merging at EAC
      const remainingWeeks = totalWeeks - currentWeek;
      const progressFraction = (w - currentWeek) / remainingWeeks;
      forecastVal = +(acInr + (eacInr - acInr) * progressFraction).toFixed(2);
    }

    sCurvePoints.push({
      week: w,
      plannedValueInr: plannedVal,
      earnedValueInr: earnedVal,
      actualCostInr: actualCst,
      forecastEacInr: forecastVal
    });
  }

  return {
    bacInr: bac,
    pvInr,
    evInr,
    acInr,
    cvInr,
    svInr,
    cpi,
    spi,
    eacInr,
    eacCompositeInr,
    vacInr,
    tcpiBac,
    tcpiEac,
    projectedDurationWeeks,
    scheduleDelayWeeks,
    costStatus,
    scheduleStatus,
    sCurvePoints
  };
}
