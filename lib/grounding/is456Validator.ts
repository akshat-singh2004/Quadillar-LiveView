export interface Is456CoreValidationResult {
  passed: boolean;
  characteristicGradeMpa: number;
  requiredMeanMpa: number;
  requiredMinIndividualMpa: number;
  actualMeanMpa: number;
  actualMinIndividualMpa: number;
  clauseRef: string;
  reason: string;
}

export function validateIs456CoreTest(
  coreReadingsMpa: number[],
  characteristicGradeMpa = 50
): Is456CoreValidationResult {
  const valid = coreReadingsMpa.filter((n) => Number.isFinite(n) && n > 0);
  const requiredMeanMpa = Number((characteristicGradeMpa * 0.85).toFixed(2));
  const requiredMinIndividualMpa = Number((characteristicGradeMpa * 0.75).toFixed(2));

  if (valid.length < 3) {
    return {
      passed: false,
      characteristicGradeMpa,
      requiredMeanMpa,
      requiredMinIndividualMpa,
      actualMeanMpa: 0,
      actualMinIndividualMpa: 0,
      clauseRef: "IS 456:2000 Cl. 17.4.3",
      reason: "Minimum 3 extracted concrete cores are mandatory under IS 456:2000 Cl. 17.4.2.",
    };
  }

  const actualMeanMpa = Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2));
  const actualMinIndividualMpa = Number(Math.min(...valid).toFixed(2));
  const meanPass = actualMeanMpa >= requiredMeanMpa;
  const minPass = actualMinIndividualMpa >= requiredMinIndividualMpa;
  const passed = meanPass && minPass;

  const reason = passed
    ? `Verified ${actualMeanMpa} MPa mean (>= ${requiredMeanMpa} MPa) and ${actualMinIndividualMpa} MPa min (>= ${requiredMinIndividualMpa} MPa) per IS 456:2000 Cl. 17.4.3.`
    : !meanPass
    ? `REJECTED: Average equivalent core strength ${actualMeanMpa} MPa is below 85% threshold (${requiredMeanMpa} MPa for M${characteristicGradeMpa}).`
    : `REJECTED: Individual core reading ${actualMinIndividualMpa} MPa is below 75% minimum (${requiredMinIndividualMpa} MPa for M${characteristicGradeMpa}).`;

  return {
    passed,
    characteristicGradeMpa,
    requiredMeanMpa,
    requiredMinIndividualMpa,
    actualMeanMpa,
    actualMinIndividualMpa,
    clauseRef: "IS 456:2000 Cl. 17.4.3",
    reason,
  };
}
