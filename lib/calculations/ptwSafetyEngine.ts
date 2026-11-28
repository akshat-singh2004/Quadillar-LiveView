/**
 * PROJECT VANGUARD: PERMIT TO WORK (PTW) & HIGH-HAZARD SAFETY GOVERNOR
 * Formulated strictly under:
 * - IS 3521:1999 (Industrial Safety Belts and Full-Body Harnesses)
 * - IS 3696 (Part 1 & 2): Safety Code for Scaffolds and Ladders
 * - IS 3016: Code of Practice for Fire Precautions in Welding and Cutting Operations
 * - IS 2825 / OSHA 1910.146 (Confined Space Entry Standards)
 * - Central Electricity Authority (CEA) Safety Regulations (Lockout / Tagout - LOTO)
 * - Directorate General of Factory Advice Service and Labour Institutes (DGFASLI)
 *
 * Mathematically evaluates:
 * 1. Fall Arrest Dynamic Impact Force (IS 3521 Limit: <= 6.0 kN):
 *      F_impact = (m * g * h_free) / d_deceleration
 * 2. Confined Space Atmospheric Gas Telemetry (O2, LEL, H2S, CO):
 *      O2: 19.5% - 23.5%, LEL <= 10%, H2S <= 10 ppm, CO <= 25 ppm
 * 3. Hot Work Fire Watch Thermal Dissipation: 60-minute post-weld cool-down
 * 4. Micro-climate Wind Gust Interlock: Cut-off at v_wind > 9.0 m/s (IS 875 Part 3)
 */

export type PermitHazardCategory =
  | "WORK_AT_HEIGHT"     // > 2.0m height (Roof deck 15.0m, Facade scaffolding)
  | "HOT_WORK_WELDING"   // Structural moment frame welding, gas cutting
  | "CONFINED_SPACE"     // Basement lift pit (-3.5m), underground storm sump
  | "ELECTRICAL_LOTO"    // 415V substation energization, transformer rack
  | "HEAVY_CRANE_LIFT";  // 3.5T Chiller tandem rigging with Potain IGO 50

export type PermitStatus =
  | "APPROVED_ACTIVE"
  | "SUSPENDED_WEATHER"
  | "SAFETY_LOCKOUT_INTERLOCKED"
  | "CLOSED_CERTIFIED";

export interface ConfinedSpaceGasTelemetry {
  oxygenPct: number;             // Safe: 19.5% to 23.5%
  lowerExplosiveLimitPct: number;// Safe: < 10% LEL
  hydrogenSulfidePpm: number;    // Safe: <= 10 ppm
  carbonMonoxidePpm: number;     // Safe: <= 25 ppm
}

export interface FallArrestKinematics {
  workerMassKg: number;           // Standard: 100 kg (Worker + Toolbelt)
  freeFallDistanceM: number;      // Lanyard length + anchor drop (e.g. 1.8m)
  decelerationStrokeM: number;    // Energy absorber deployment (0.6m standard)
}

export interface PermitToWorkItem {
  permitId: string;
  permitNumber: string;
  category: PermitHazardCategory;
  title: string;
  locationZone: "ZONE_A" | "ZONE_B" | "ZONE_C" | "ZONE_D";
  cpmActivityId: string;          // Linked to CPM Schedule (e.g. ACT-06, ACT-09)
  executingContractor: string;
  leadPermitHolder: string;
  validFrom: string;
  validTo: string;
  status: PermitStatus;
  windSpeedThresholdMs: number;  // 9.0 m/s limit
  gasTelemetry?: ConfinedSpaceGasTelemetry;
  fallArrest?: FallArrestKinematics;
  fireWatchMinutesRemaining?: number;
  mandatoryPpeChecks: {
    doubleLanyardHarness: boolean;
    gasMonitorCalibrated: boolean;
    fireExtinguisherPlaced: boolean;
    insulatedRescueHook: boolean;
  };
  section65bHash: string;
}

// 1. IS 3521 Dynamic Fall Arrest Impact Force Calculation:
// F_impact = (m * g * h_free) / d_stroke (in kN)
export function calculateFallArrestImpactForceKn(kinematics: FallArrestKinematics): {
  impactForceKn: number;
  isCompliantWithIS3521: boolean; // Must be <= 6.0 kN
  safetyFactor: number;
} {
  const g = 9.81;
  const stroke = Math.max(0.05, kinematics.decelerationStrokeM);
  const rawForceNewtons = (kinematics.workerMassKg * g * kinematics.freeFallDistanceM) / stroke;
  const impactForceKn = +(rawForceNewtons / 1000).toFixed(2);

  const isCompliant = impactForceKn <= 6.0;
  const safetyFactor = +(6.0 / impactForceKn).toFixed(2);

  return {
    impactForceKn,
    isCompliantWithIS3521: isCompliant,
    safetyFactor
  };
}

// 2. IS 2825 Confined Space Multi-Gas Atmospheric Evaluation
export function evaluateAtmosphericSafety(gas: ConfinedSpaceGasTelemetry): {
  isAtmosphereSafe: boolean;
  oxygenStatus: "SAFE" | "OXYGEN_DEFICIENT" | "OXYGEN_ENRICHED";
  lelStatus: "SAFE" | "EXPLOSION_RISK";
  toxicityStatus: "SAFE" | "TOXIC_HAZARD";
  alertSummary: string;
} {
  let oxygenStatus: "SAFE" | "OXYGEN_DEFICIENT" | "OXYGEN_ENRICHED" = "SAFE";
  if (gas.oxygenPct < 19.5) oxygenStatus = "OXYGEN_DEFICIENT";
  else if (gas.oxygenPct > 23.5) oxygenStatus = "OXYGEN_ENRICHED";

  const lelStatus: "SAFE" | "EXPLOSION_RISK" = gas.lowerExplosiveLimitPct >= 10.0 ? "EXPLOSION_RISK" : "SAFE";
  const toxicityStatus: "SAFE" | "TOXIC_HAZARD" = (gas.hydrogenSulfidePpm > 10.0 || gas.carbonMonoxidePpm > 25.0) ? "TOXIC_HAZARD" : "SAFE";

  const isAtmosphereSafe = oxygenStatus === "SAFE" && lelStatus === "SAFE" && toxicityStatus === "SAFE";

  let alertSummary = "Atmospheric gas levels fully compliant with IS 2825 entry criteria.";
  if (!isAtmosphereSafe) {
    alertSummary = `SAFETY LOCKOUT: ${oxygenStatus !== "SAFE" ? oxygenStatus : ""} ${lelStatus !== "SAFE" ? "| LEL EXPLOSION HAZARD" : ""} ${toxicityStatus !== "SAFE" ? "| TOXIC GASES DETECTED" : ""}`.trim();
  }

  return {
    isAtmosphereSafe,
    oxygenStatus,
    lelStatus,
    toxicityStatus,
    alertSummary
  };
}

// 3. Environmental Wind-Gust Interlock Evaluator
export function evaluateWindSafetyInterlock(
  currentWindSpeedMs: number,
  category: PermitHazardCategory,
  limitMs = 9.0
): {
  isSuspendedDueToWind: boolean;
  windSpeedMs: number;
  operatingMarginMs: number;
} {
  // Heavy Crane and Work at Height are sensitive to wind gusts > 9.0 m/s
  const isWindSensitive = category === "WORK_AT_HEIGHT" || category === "HEAVY_CRANE_LIFT";
  const isSuspended = isWindSensitive && currentWindSpeedMs > limitMs;
  const margin = +(limitMs - currentWindSpeedMs).toFixed(1);

  return {
    isSuspendedDueToWind: isSuspended,
    windSpeedMs: currentWindSpeedMs,
    operatingMarginMs: margin
  };
}
