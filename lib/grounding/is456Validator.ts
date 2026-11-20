export interface Is456CoreValidationResult {
  passed: boolean;
  characteristicGradeMpa: number;
  requiredMeanMpa: number;
  requiredMinIndividualMpa: number;
  actualMeanMpa: number;
  actualMinIndividualMpa: number;
  equivalentReadingsMpa: number[];
  inputMode: "EQUIVALENT_CUBE" | "RAW_CORE";
  clauseRef: string;
  reason: string;
}

export interface CoreValidationOptions {
  inputMode?: "EQUIVALENT_CUBE" | "RAW_CORE";
  lengthToDiameterRatio?: number; // L/D between 1.0 and 2.0 per IS 516 (Part 4)
  coreDiameterMm?: number;        // e.g., 75mm or 100mm
}

export function parseConcreteGradeMpa(gradeLabel?: string | number | null): number {
  if (typeof gradeLabel === "number" && Number.isFinite(gradeLabel) && gradeLabel > 0) {
    return gradeLabel;
  }
  const match = String(gradeLabel || "").match(/M\s*(\d{2,3})/i);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed >= 15 && parsed <= 120) return parsed;
  }
  return 50;
}

/**
 * IS 516 (Part 4) conversion from raw cylindrical core strength to equivalent cube strength:
 * F_ld = 2 / (1.5 + D/L) for 1.0 <= L/D <= 2.0; diameter correction 1.03 for d < 75mm;
 * cylinder-to-cube multiplier = 1.25.
 */
export function convertRawCoreToEquivalentCubeMpa(
  rawCoreMpa: number,
  lengthToDiameterRatio = 2.0,
  coreDiameterMm = 75
): number {
  const clampedLd = Math.min(2.0, Math.max(1.0, lengthToDiameterRatio));
  const fLd = 2.0 / (1.5 + 1.0 / clampedLd);
  const fDia = coreDiameterMm < 70 ? 1.06 : coreDiameterMm < 75 ? 1.03 : 1.0;
  return Number((rawCoreMpa * fLd * fDia * 1.25).toFixed(2));
}

export function validateIs456CoreTest(
  coreReadingsMpa: number[],
  characteristicGradeMpa: number | string = 50,
  options: CoreValidationOptions = {}
): Is456CoreValidationResult {
  const safeGrade = parseConcreteGradeMpa(characteristicGradeMpa);
  const inputMode = options.inputMode || "EQUIVALENT_CUBE";
  const safeArray = Array.isArray(coreReadingsMpa) ? coreReadingsMpa : [];
  const rawValid = safeArray.filter((n) => Number.isFinite(n) && n > 0 && n < 250);

  const equivalentReadingsMpa =
    inputMode === "RAW_CORE"
      ? rawValid.map((v) =>
          convertRawCoreToEquivalentCubeMpa(
            v,
            options.lengthToDiameterRatio ?? 2.0,
            options.coreDiameterMm ?? 75
          )
        )
      : rawValid.map((v) => Number(v.toFixed(2)));

  const requiredMeanMpa = Number((safeGrade * 0.85).toFixed(2));
  const requiredMinIndividualMpa = Number((safeGrade * 0.75).toFixed(2));

  if (equivalentReadingsMpa.length < 3) {
    return {
      passed: false,
      characteristicGradeMpa: safeGrade,
      requiredMeanMpa,
      requiredMinIndividualMpa,
      actualMeanMpa: 0,
      actualMinIndividualMpa: 0,
      equivalentReadingsMpa,
      inputMode,
      clauseRef: "IS 456:2000 Cl. 17.4.3 / IS 516 (Part 4)",
      reason: "Minimum 3 valid extracted concrete cores are mandatory under IS 456:2000 Cl. 17.4.2.",
    };
  }

  const actualMeanMpa = Number(
    (equivalentReadingsMpa.reduce((a, b) => a + b, 0) / equivalentReadingsMpa.length).toFixed(2)
  );
  const actualMinIndividualMpa = Number(Math.min(...equivalentReadingsMpa).toFixed(2));
  const meanPass = actualMeanMpa >= requiredMeanMpa;
  const minPass = actualMinIndividualMpa >= requiredMinIndividualMpa;
  const passed = meanPass && minPass;

  const reason = passed
    ? `Verified ${actualMeanMpa} MPa equivalent cube mean (>= ${requiredMeanMpa} MPa) and ${actualMinIndividualMpa} MPa min (>= ${requiredMinIndividualMpa} MPa) for M${safeGrade} per IS 456:2000 Cl. 17.4.3.`
    : !meanPass
    ? `REJECTED: Equivalent cube mean ${actualMeanMpa} MPa is below 85% threshold (${requiredMeanMpa} MPa for M${safeGrade}).`
    : `REJECTED: Lowest equivalent core ${actualMinIndividualMpa} MPa is below 75% minimum (${requiredMinIndividualMpa} MPa for M${safeGrade}).`;

  return {
    passed,
    characteristicGradeMpa: safeGrade,
    requiredMeanMpa,
    requiredMinIndividualMpa,
    actualMeanMpa,
    actualMinIndividualMpa,
    equivalentReadingsMpa,
    inputMode,
    clauseRef: "IS 456:2000 Cl. 17.4.3 / IS 516 (Part 4)",
    reason,
  };
}
