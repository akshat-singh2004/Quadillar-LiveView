"use server";

// ============================================================================
// CPWD Statutory Computation Engine: Final Bill (Cl. 9), Retention (Cl. 17),
// and No-Claims Absolute Discharge (CPWD Form 65)
// Works Manual 2024 / GCC Clause 9 & 17 / FIDIC Red Book Clause 14.9 & 14.11
// File: lib/statutory/clause9_17.ts
// ============================================================================

export interface FinalBillInput {
  measuredWorkValue: number;
  clause12VariationsValue: number;
  clause10ccEscalationValue: number;
  priorRaBillsPaid: number;
  unrecoveredAdvances: number;
  leviedLiquidatedDamages: number;
  retentionPercentage?: number; // default 5%
  isTocCertified: boolean;
  tocCertificationDate?: string;
  dlpMonths?: number;
}

export interface RetentionBreakdown {
  totalRetentionAccumulated: number;
  retentionPercentage: number;
  stage1TocRelease: number;
  stage1Released: boolean;
  stage2DlpRelease: number;
  stage2DlpReleaseDate: string;
  stage2DaysRemaining: number;
  stage2Released: boolean;
  activeEscrowHolding: number;
}

export interface FinalBillWaterfall {
  measuredWorkValue: number;
  clause12VariationsValue: number;
  clause10ccEscalationValue: number;
  grossFinalValue: number;
  priorRaBillsPaid: number;
  grossBillDifference: number;
  bocwCess1Percent: number;
  gstTds2Percent: number;
  unrecoveredAdvances: number;
  leviedLiquidatedDamages: number;
  retentionDeductionNet: number;
  stage1TocCredit: number;
  terminalNetPayable: number;
}

export interface Clause9_17Result {
  waterfall: FinalBillWaterfall;
  retention: RetentionBreakdown;
  noClaimsForm65: {
    formCode: string;
    isExecuted: boolean;
    certificateHash: string;
    statutoryLegalStatement: string;
    signatoryDesignation: string;
  };
  auditCompliancePassed: boolean;
  statutorySummaryText: string;
}

function addMonthsToDate(dateStr: string, months: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + months, day));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function calculateDaysRemaining(targetDateStr: string): number {
  const [year, month, day] = targetDateStr.split("-").map(Number);
  const targetMs = Date.UTC(year, month - 1, day);
  const nowMs = Date.now();
  const diffDays = Math.round((targetMs - nowMs) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Computes the Terminal Payment Waterfall under CPWD Clause 9,
 * 50/50 Staged Retention Release under CPWD Clause 17, and generates
 * the Form 65 absolute discharge parameters.
 */
export async function calculateFinalBillAndRetention(
  input: FinalBillInput
): Promise<Clause9_17Result> {
  const {
    measuredWorkValue = 425000000,
    clause12VariationsValue = 3875500,
    clause10ccEscalationValue = 5295500,
    priorRaBillsPaid = 385000000,
    unrecoveredAdvances = 0,
    leviedLiquidatedDamages = 0,
    retentionPercentage = 5, // 5% standard
    isTocCertified = true,
    tocCertificationDate = "2026-11-30",
    dlpMonths = 12,
  } = input;

  // 1. Gross Final Value
  const grossFinalValue = Number(
    (
      measuredWorkValue +
      clause12VariationsValue +
      clause10ccEscalationValue
    ).toFixed(2)
  );

  const grossBillDifference = Number(
    (grossFinalValue - priorRaBillsPaid).toFixed(2)
  );

  // 2. Statutory Deductions
  // 1% BOCW Welfare Cess on the final adjusted increment
  const bocwCess1Percent = Number((grossBillDifference * 0.01).toFixed(2));

  // 2% GST TDS under Section 51 CGST Act on the final adjusted increment
  const gstTds2Percent = Number((grossBillDifference * 0.02).toFixed(2));

  // 3. Clause 17 Retention / Security Deposit (5% of Gross Final Value)
  const totalRetentionAccumulated = Number(
    (grossFinalValue * (retentionPercentage / 100)).toFixed(2)
  );

  // 50/50 Staged Release: 50% on TOC, 50% held till DLP
  const stage1TocRelease = Number(
    (totalRetentionAccumulated * 0.5).toFixed(2)
  );
  const stage2DlpRelease = Number(
    (totalRetentionAccumulated - stage1TocRelease).toFixed(2)
  );

  const stage2DlpReleaseDate = addMonthsToDate(tocCertificationDate, dlpMonths);
  const stage2DaysRemaining = calculateDaysRemaining(stage2DlpReleaseDate);

  const activeEscrowHolding = isTocCertified
    ? stage2DlpRelease
    : totalRetentionAccumulated;

  // Incremental retention deduction on the final bill
  const retentionDeductionNet = Number((grossBillDifference * 0.05).toFixed(2));

  // 50% TOC credit released into final payment if Taking-Over is certified
  const stage1TocCredit = isTocCertified ? stage1TocRelease : 0;

  // 4. Terminal Net Payable to Contractor
  const terminalNetPayable = Number(
    (
      grossBillDifference -
      bocwCess1Percent -
      gstTds2Percent -
      unrecoveredAdvances -
      leviedLiquidatedDamages -
      retentionDeductionNet +
      stage1TocCredit
    ).toFixed(2)
  );

  const waterfall: FinalBillWaterfall = {
    measuredWorkValue,
    clause12VariationsValue,
    clause10ccEscalationValue,
    grossFinalValue,
    priorRaBillsPaid,
    grossBillDifference,
    bocwCess1Percent,
    gstTds2Percent,
    unrecoveredAdvances,
    leviedLiquidatedDamages,
    retentionDeductionNet,
    stage1TocCredit,
    terminalNetPayable,
  };

  const retention: RetentionBreakdown = {
    totalRetentionAccumulated,
    retentionPercentage,
    stage1TocRelease,
    stage1Released: isTocCertified,
    stage2DlpRelease,
    stage2DlpReleaseDate,
    stage2DaysRemaining,
    stage2Released: false,
    activeEscrowHolding,
  };

  const noClaimsForm65 = {
    formCode: "CPWD-FORM-65-FINAL-DISCHARGE",
    isExecuted: false,
    certificateHash: "SHA256:d82e441b8a901c4481bc92eef81109a128e46920f7ca1",
    statutoryLegalStatement:
      "I/We, the Contractor, hereby certify that upon realization of the terminal payment of this Final Bill, no claims, disputes, or arbitrations whatsoever shall lie against the Employer under this Agreement. This undertaking constitutes an unconditional and irrevocable absolute discharge under Section 63 of the Indian Contract Act and CPWD Form 65.",
    signatoryDesignation: "Principal Architect & Lead Commercial Auditor",
  };

  const auditCompliancePassed =
    grossFinalValue > 0 &&
    terminalNetPayable >= 0 &&
    activeEscrowHolding === stage2DlpRelease;

  const statutorySummaryText = `Final Bill certified under CPWD Clause 9 at gross value ₹${grossFinalValue.toLocaleString(
    "en-IN",
    { minimumFractionDigits: 2 }
  )}. Clause 17 Stage 1 (50%) Retention of ₹${stage1TocRelease.toLocaleString(
    "en-IN",
    { minimumFractionDigits: 2 }
  )} released upon TOC; Stage 2 escrow of ₹${stage2DlpRelease.toLocaleString(
    "en-IN",
    { minimumFractionDigits: 2 }
  )} locked until ${stage2DlpReleaseDate}.`;

  return {
    waterfall,
    retention,
    noClaimsForm65,
    auditCompliancePassed,
    statutorySummaryText,
  };
}
