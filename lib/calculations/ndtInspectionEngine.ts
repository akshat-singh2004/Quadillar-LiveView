/**
 * PROJECT VANGUARD: NON-DESTRUCTIVE TESTING (NDT) & STRUCTURAL INTEGRITY ENGINE
 * Formulated strictly under:
 * - IS 13311 (Part 1): 1992 (Non-Destructive Testing of Concrete - Ultrasonic Pulse Velocity)
 * - IS 13311 (Part 2): 1992 (Non-Destructive Testing of Concrete - Rebound Hammer)
 * - IS 456:2000 Clause 17.4.3 (In-Situ Concrete Acceptance Criteria: >= 0.85 f_ck)
 * - RILEM TC 43-CND / ASTM C597 (SonReb Combined Ultrasonic & Rebound Method)
 * - Indian Evidence Act Section 65B (Forensic Quality Clearance & Lien Unblocking)
 *
 * Specifically resolves:
 * Column C2 (Grid C2, 450x450mm Column) Honeycombing Defect (NCR #009)
 * Contractual Lien Withholding: ₹2,08,720 on Bill RA-05
 * 
 * Target Parameters:
 * - Design Concrete Grade: M35 (Specified f_ck = 35.0 MPa)
 * - Minimum In-Situ Acceptance Threshold (0.85 * f_ck): 29.75 MPa
 * - Minimum Sub-Location Threshold (0.75 * f_ck): 26.25 MPa
 */

export type UpvTransmissionMode = "DIRECT" | "SEMI_DIRECT" | "INDIRECT_SURFACE";

export interface UpvProbeReading {
  pointId: string;
  locationElevationM: number;
  transmissionMode: UpvTransmissionMode;
  pathLengthMm: number;        // e.g. 450mm across column face
  transitTimeMicroSec: number; // e.g. 108.4 microseconds
  pulseVelocityKmS: number;    // V = path / (time * 1000)
  gradingQuality: "EXCELLENT" | "GOOD" | "MEDIUM_QUESTIONABLE" | "DOUBTFUL_HONEYCOMB";
}

export interface ReboundHammerReading {
  reboundNumber: number;
  impactAngleDeg: number;      // 0 deg horizontal, -90 deg downwards, +90 deg upwards
  correctedReboundNumber: number;
  estimatedSingleStrengthMpa: number;
}

export interface SonRebInspectionPoint {
  stationTag: string;
  gridCoordinate: string;
  upvReading: UpvProbeReading;
  reboundReading: ReboundHammerReading;
  combinedSonRebStrengthMpa: number;
  isAcceptableAgainst085Fck: boolean;
}

export interface NdtForensicAuditResult {
  memberTag: string;
  memberType: "COLUMN" | "BEAM" | "SLAB";
  targetFckMpa: number;
  statutoryThreshold085FckMpa: number;
  meanPulseVelocityKmS: number;
  overallVelocityGrade: "EXCELLENT" | "GOOD" | "MEDIUM" | "POOR_DOUBTFUL";
  meanReboundNumber: number;
  estimatedInSituStrengthMpa: number;
  strengthRatioPct: number;
  isStructuralIntegrityCertified: boolean;
  contractualLienAction: "HOLD_LIEN_DEFECT_ACTIVE" | "RELEASE_UNBLOCK_LIEN";
  lienAmountInr: number;
  statutoryVerdict: string;
}

// 1. IS 13311 (Part 1) Table 1 Ultrasonic Velocity Grading:
// > 4.5 km/s: Excellent | 3.5 - 4.5: Good | 3.0 - 3.5: Medium | < 3.0: Doubtful
export function gradeUpvVelocity(velocityKmS: number): UpvProbeReading["gradingQuality"] {
  if (velocityKmS >= 4.50) return "EXCELLENT";
  if (velocityKmS >= 3.50) return "GOOD";
  if (velocityKmS >= 3.00) return "MEDIUM_QUESTIONABLE";
  return "DOUBTFUL_HONEYCOMB";
}

// 2. Compute Velocity from Transit Time: V = (Path mm / Time µs)
export function calculateUpvPulseVelocity(
  pathMm: number,
  timeMicroSec: number,
  mode: UpvTransmissionMode = "DIRECT"
): { velocityKmS: number; grade: UpvProbeReading["gradingQuality"] } {
  if (timeMicroSec <= 0) return { velocityKmS: 0, grade: "DOUBTFUL_HONEYCOMB" };

  // For indirect surface transmission, velocity is typically reduced by ~15%
  const modeCorrection = mode === "DIRECT" ? 1.0 : mode === "SEMI_DIRECT" ? 1.05 : 1.18;
  const rawV = (pathMm / (timeMicroSec * 1000)) * 1000;
  const velocityKmS = +(rawV * (1 / modeCorrection)).toFixed(2);
  const grade = gradeUpvVelocity(velocityKmS);

  return { velocityKmS, grade };
}

// 3. Combined SonReb Formulation (RILEM TC 43-CND / IS 13311 Calibration):
// f_is = a * (V_upv)^b * (R)^c
// For M35 Grade with OPC 53 & crushed granite aggregates:
// a = 1.18, b = 1.42, c = 0.86
export function calculateSonRebInSituStrength(
  velocityKmS: number,
  reboundNumber: number
): number {
  if (velocityKmS <= 1.0 || reboundNumber <= 10) return 8.0;
  const a = 1.18;
  const b = 1.42;
  const c = 0.86;
  const strength = a * Math.pow(velocityKmS, b) * Math.pow(reboundNumber, c);
  return +strength.toFixed(2);
}

// 4. Synthesize Column C2 Multi-Station NDT Forensic Audit
export function evaluateColumnNdtAudit(
  stations: SonRebInspectionPoint[],
  targetFck = 35.0,
  withheldLienAmountInr = 208720
): NdtForensicAuditResult {
  const statutoryThreshold085 = +(targetFck * 0.85).toFixed(2); // 29.75 MPa

  const avgVelocity = +(
    stations.reduce((acc, s) => acc + s.upvReading.pulseVelocityKmS, 0) / stations.length
  ).toFixed(2);

  const avgRebound = +(
    stations.reduce((acc, s) => acc + s.reboundReading.correctedReboundNumber, 0) / stations.length
  ).toFixed(1);

  const avgInSituStrength = +(
    stations.reduce((acc, s) => acc + s.combinedSonRebStrengthMpa, 0) / stations.length
  ).toFixed(2);

  const minStationStrength = Math.min(...stations.map(s => s.combinedSonRebStrengthMpa));

  // IS 456 Cl. 17.4.3: Mean in-situ strength >= 0.85 f_ck AND no single reading < 0.75 f_ck (26.25 MPa)
  const isCertified = avgInSituStrength >= statutoryThreshold085 && minStationStrength >= (targetFck * 0.75);

  let overallGrade: NdtForensicAuditResult["overallVelocityGrade"] = "POOR_DOUBTFUL";
  if (avgVelocity >= 4.5) overallGrade = "EXCELLENT";
  else if (avgVelocity >= 3.5) overallGrade = "GOOD";
  else if (avgVelocity >= 3.0) overallGrade = "MEDIUM";

  const strengthRatioPct = +((avgInSituStrength / targetFck) * 100).toFixed(1);

  return {
    memberTag: "COL-C2",
    memberType: "COLUMN",
    targetFckMpa: targetFck,
    statutoryThreshold085FckMpa: statutoryThreshold085,
    meanPulseVelocityKmS: avgVelocity,
    overallVelocityGrade: overallGrade,
    meanReboundNumber: avgRebound,
    estimatedInSituStrengthMpa: avgInSituStrength,
    strengthRatioPct,
    isStructuralIntegrityCertified: isCertified,
    contractualLienAction: isCertified ? "RELEASE_UNBLOCK_LIEN" : "HOLD_LIEN_DEFECT_ACTIVE",
    lienAmountInr: withheldLienAmountInr,
    statutoryVerdict: isCertified
      ? `IN-SITU STRENGTH CERTIFIED: ${avgInSituStrength} MPa ACHIEVED (>= 29.75 MPa). UNBLOCK LIEN ₹${withheldLienAmountInr.toLocaleString()}`
      : `STRUCTURAL NON-CONFORMANCE ACTIVE: ${avgInSituStrength} MPa (< 29.75 MPa). RETAIN LIEN ₹${withheldLienAmountInr.toLocaleString()}`
  };
}
