/**
 * PROJECT VANGUARD: STATUTORY NON-CONFORMANCE (NCR) & DEFECT LIEN ENGINE
 * Formulated strictly under:
 * - IS 456:2000 Clause 17 (Inspection, Testing and Quality Acceptance of Structure)
 * - IS 13311 (Part 1):1992 (Non-Destructive Testing: Ultrasonic Pulse Velocity - UPV)
 * - IS 13311 (Part 2):1992 (Non-Destructive Testing: Rebound Hammer Test)
 * - ASTM C597 / BS 1881-203 (Standard Test Method for Pulse Velocity Through Concrete)
 * - ISO 9001:2015 Clause 8.7 (Control of Nonconforming Outputs)
 * - CPWD Works Manual Section 31 (Defect Liability & Running Bill Lien Withholding)
 *
 * Mathematically evaluates:
 * 1. UPV Sonic Velocity: V = (L / T) in km/s and IS 13311 Table 2 quality classification
 * 2. Combined SonReb Method: Correlating UPV (km/s) and Rebound Index (R) to in-situ strength:
 *      f_est = a * (V)^b * (R)^c
 * 3. Commercial Defect Lien Withholding: Automatic financial deduction from Running Account (RA) bills
 *    combining structural value, testing provisions, and carbon fiber / pressure grouting rectification costs.
 */

export type NcrSeverityLevel = "CRITICAL_STRUCTURAL" | "MAJOR_SERVICEABILITY" | "MINOR_AESTHETIC";

export type NcrLifecycleStatus =
  | "ISSUED_HOLD_WORK"
  | "INVESTIGATION_NDT_ACTIVE"
  | "RECTIFICATION_SUBMITTED"
  | "VERIFIED_LIEN_RELEASED";

export interface NonDestructiveTestInput {
  pathLengthMm: number;        // Direct transmission transducer separation distance (e.g. 450mm column)
  transitTimeMicroSec: number; // Oscilloscope measured wave arrival time (e.g. 108.5 microseconds)
  reboundNumberR: number;      // Schmidt Rebound Hammer median index (e.g. 28 to 44)
  calibratedConcreteGrade: number; // Target f_ck (e.g. 35 for M35)
}

export interface NcrRecordItem {
  ncrId: string;
  itemNo: number;
  title: string;
  affectedZone: "ZONE_A" | "ZONE_B" | "ZONE_C" | "ZONE_D";
  cpmActivityId: string;       // Linked to CPM Network (e.g. ACT-04 Podium Columns)
  severity: NcrSeverityLevel;
  status: NcrLifecycleStatus;
  defectCategory: "HONEYCOMBING_SEGREGATION" | "LOW_28D_CUBE_STRENGTH" | "COLD_JOINT_DELAMINATION" | "COVER_DEFICIENCY";
  dateLogged: string;
  identifiedBy: string;       // Lead PMC Quality Auditor (CBRE)
  contractorRepresentative: string; // L&T Quality In-charge
  affectedElementVolumeM3: number;
  baseScheduleRatePerM3Inr: number;
  rectificationCostEstimateInr: number;
  ndtReadings: NonDestructiveTestInput;
  lienWithheldAmountInr: number;
  section65bHash: string;
}

export interface UpvEvaluationResult {
  pulseVelocityKmPerSec: number;
  qualityRating: "EXCELLENT" | "GOOD" | "MEDIUM_QUESTIONABLE" | "DOUBTFUL_POROUS";
  isHomogeneous: boolean;
  estimatedStrengthSonRebMpa: number;
  strengthRetentionPct: number;
  complianceWithTarget: boolean;
}

// 1. IS 13311 (Part 1):1992 Table 2: Ultrasonic Pulse Velocity (UPV) Evaluation
// V = L / T (km/s)
export function evaluateUpvQuality(input: NonDestructiveTestInput): UpvEvaluationResult {
  if (input.transitTimeMicroSec <= 0 || input.pathLengthMm <= 0) {
    return {
      pulseVelocityKmPerSec: 0,
      qualityRating: "DOUBTFUL_POROUS",
      isHomogeneous: false,
      estimatedStrengthSonRebMpa: 0,
      strengthRetentionPct: 0,
      complianceWithTarget: false
    };
  }

  // Velocity V (km/s) = (Length in mm) / (Time in microseconds)
  const velocityKmPerSec = +(input.pathLengthMm / input.transitTimeMicroSec).toFixed(3);

  // IS 13311 Table 2 Criteria:
  // > 4.5 km/s: Excellent
  // 3.5 - 4.5 km/s: Good
  // 3.0 - 3.5 km/s: Medium (Questionable)
  // < 3.0 km/s: Doubtful (Core sampling mandatory)
  let rating: UpvEvaluationResult["qualityRating"] = "EXCELLENT";
  if (velocityKmPerSec > 4.5) {
    rating = "EXCELLENT";
  } else if (velocityKmPerSec >= 3.5) {
    rating = "GOOD";
  } else if (velocityKmPerSec >= 3.0) {
    rating = "MEDIUM_QUESTIONABLE";
  } else {
    rating = "DOUBTFUL_POROUS";
  }

  // 2. Combined SonReb Method (Bungey & RILEM TC-43 standard correlation)
  // f_est = a * (V)^b * (R)^c
  // Empirical constants for siliceous aggregate OPC 53 mix: a = 0.0286, b = 2.85, c = 1.05
  const sonRebStrengthMpa = +(
    0.0286 *
    Math.pow(velocityKmPerSec, 2.85) *
    Math.pow(input.reboundNumberR, 1.05)
  ).toFixed(2);

  const retentionPct = +((sonRebStrengthMpa / input.calibratedConcreteGrade) * 100).toFixed(1);
  const compliance = sonRebStrengthMpa >= input.calibratedConcreteGrade * 0.85; // 85% in-situ threshold per IS 456 Cl. 17.4.3

  return {
    pulseVelocityKmPerSec: velocityKmPerSec,
    qualityRating: rating,
    isHomogeneous: velocityKmPerSec >= 3.5,
    estimatedStrengthSonRebMpa: sonRebStrengthMpa,
    strengthRetentionPct: retentionPct,
    complianceWithTarget: compliance
  };
}

// 3. CPWD Section 31 Commercial Defect Lien Calculation:
// Lien = (Affected Volume * Base Rate * Severity Factor) + Rectification Estimate + Statutory Escrow Buffer
export function calculateFinancialDefectLien(
  volumeM3: number,
  baseRatePerM3: number,
  severity: NcrSeverityLevel,
  rectificationEstimateInr: number
): number {
  let severityMultiplier = 1.0;
  if (severity === "CRITICAL_STRUCTURAL") severityMultiplier = 1.50; // 150% withholding
  else if (severity === "MAJOR_SERVICEABILITY") severityMultiplier = 1.20; // 120% withholding
  else severityMultiplier = 0.80;

  const baseWithholding = volumeM3 * baseRatePerM3 * severityMultiplier;
  const totalLien = baseWithholding + rectificationEstimateInr;

  return +totalLien.toFixed(2);
}
