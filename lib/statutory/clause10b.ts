"use server";

// ============================================================================
// CPWD Statutory Computation Engine: Clause 10B & Form 31
// Mobilisation Advance, Diminishing Balance Interest & Secured Material Advances
// Works Manual 2024 / GCC Clause 10B / CPWD Form 31
// File: lib/statutory/clause10b.ts
// ============================================================================

export interface RABillScheduleInput {
  billNumber: string;
  billDate: string;
  grossCertifiedWork: number;
  cumulativeGrossWork: number;
}

export interface MobilisationScheduleRow {
  billNumber: string;
  billDate: string;
  cumulativeGrossWork: number;
  grossWorkPercentage: number;
  isInRecoveryWindow: boolean;
  openingPrincipal: number;
  principalDeduction: number;
  interestDeduction: number;
  totalDeduction: number;
  closingPrincipal: number;
  daysAccrued: number;
  status: "PENDING_WINDOW" | "ACTIVE_RECOVERY" | "RECOVERED" | "WINDOW_BREACH";
}

export interface SecuredMaterialItem {
  id: string;
  description: string;
  hsnCode: string;
  unit: string;
  siteQuantity: number;
  consumedQuantity: number;
  invoiceRate: number;
  marketRate: number;
  isImperishable: boolean;
  isSafeCustodyPledged: boolean;
}

export interface SecuredAdvanceItemResult extends SecuredMaterialItem {
  effectiveUnitRate: number;
  admissibleRate75: number;
  grossAdmissibleAdvance: number;
  recoveredAdvance: number;
  outstandingAdvance: number;
  consumptionPercentage: number;
  complianceOk: boolean;
}

export interface Form31Result {
  items: SecuredAdvanceItemResult[];
  totalGrossAdmissible: number;
  totalRecovered: number;
  totalOutstanding: number;
  allPledgedSafeCustody: boolean;
}

export interface Clause10BInput {
  contractBaseline: number;
  disbursedAmount: number;
  disbursalDate: string;
  interestRatePerAnnum?: number; // default 10%
  raBills: RABillScheduleInput[];
  form31Items: SecuredMaterialItem[];
}

export interface Clause10BResult {
  contractBaseline: number;
  maxAllowableMobilisation: number;
  disbursedAmount: number;
  isWithin10PercentLimit: boolean;
  recoveryCommencementThreshold: number; // 10% of Baseline
  recoveryCompletionThreshold: number;   // 80% of Baseline
  totalPrincipalRecovered: number;
  totalInterestAccrued: number;
  outstandingMobilisationBalance: number;
  schedule: MobilisationScheduleRow[];
  form31: Form31Result;
  overallOutstandingLiability: number;
  statusBadge: "CLOSED" | "ACTIVE_RECOVERY" | "DELAY_FLAG";
}

/**
 * Calculates Form 31 Secured Advance on Materials.
 * Rule: 75% of min(invoiceRate, marketRate) for imperishable, safely stored materials.
 */
export async function calculateForm31SecuredAdvance(
  items: SecuredMaterialItem[]
): Promise<Form31Result> {
  let totalGrossAdmissible = 0;
  let totalRecovered = 0;
  let totalOutstanding = 0;
  let allPledgedSafeCustody = true;

  const processedItems: SecuredAdvanceItemResult[] = items.map((item) => {
    const effectiveUnitRate = Math.min(item.invoiceRate, item.marketRate);
    const admissibleRate75 = Number((effectiveUnitRate * 0.75).toFixed(2));
    const grossAdmissibleAdvance = Number((item.siteQuantity * admissibleRate75).toFixed(2));
    const recoveredAdvance = Number((item.consumedQuantity * admissibleRate75).toFixed(2));
    const outstandingAdvance = Number((grossAdmissibleAdvance - recoveredAdvance).toFixed(2));
    const consumptionPercentage =
      item.siteQuantity > 0 ? Number(((item.consumedQuantity / item.siteQuantity) * 100).toFixed(2)) : 0;

    const complianceOk = item.isImperishable && item.isSafeCustodyPledged;
    if (!complianceOk) allPledgedSafeCustody = false;

    totalGrossAdmissible += grossAdmissibleAdvance;
    totalRecovered += recoveredAdvance;
    totalOutstanding += outstandingAdvance;

    return {
      ...item,
      effectiveUnitRate,
      admissibleRate75,
      grossAdmissibleAdvance,
      recoveredAdvance,
      outstandingAdvance,
      consumptionPercentage,
      complianceOk,
    };
  });

  return {
    items: processedItems,
    totalGrossAdmissible: Number(totalGrossAdmissible.toFixed(2)),
    totalRecovered: Number(totalRecovered.toFixed(2)),
    totalOutstanding: Number(totalOutstanding.toFixed(2)),
    allPledgedSafeCustody,
  };
}

/**
 * Calculates Clause 10B Mobilisation Advance Diminishing Balance Amortisation.
 *
 * Rules:
 * 1. Principal capped at 10% of tender value.
 * 2. 10% p.a. simple interest on diminishing balance.
 * 3. Recovery window: Starts at 10% gross work, concludes 100% by 80% gross work.
 */
export async function calculateClause10B(
  input: Clause10BInput
): Promise<Clause10BResult> {
  const {
    contractBaseline = 450000000,
    disbursedAmount = 45000000,
    disbursalDate = "2024-04-01",
    interestRatePerAnnum = 0.10, // 10% p.a.
    raBills = [],
    form31Items = [],
  } = input;

  const maxAllowableMobilisation = Number((contractBaseline * 0.10).toFixed(2));
  const isWithin10PercentLimit = disbursedAmount <= maxAllowableMobilisation + 0.01;

  const recoveryCommencementThreshold = Number((contractBaseline * 0.10).toFixed(2));
  const recoveryCompletionThreshold = Number((contractBaseline * 0.80).toFixed(2));
  const recoveryWindowSpan = recoveryCompletionThreshold - recoveryCommencementThreshold; // 70% of tender

  let currentPrincipal = disbursedAmount;
  let lastBillDate = new Date(disbursalDate);
  let totalPrincipalRecovered = 0;
  let totalInterestAccrued = 0;

  const schedule: MobilisationScheduleRow[] = [];

  for (let i = 0; i < raBills.length; i++) {
    const bill = raBills[i];
    const billDate = new Date(bill.billDate);
    const timeDiffMs = billDate.getTime() - lastBillDate.getTime();
    const daysAccrued = Math.max(0, Math.round(timeDiffMs / (1000 * 60 * 60 * 24)));

    const grossWorkPercentage =
      contractBaseline > 0
        ? Number(((bill.cumulativeGrossWork / contractBaseline) * 100).toFixed(2))
        : 0;

    const isInRecoveryWindow =
      bill.cumulativeGrossWork >= recoveryCommencementThreshold &&
      bill.cumulativeGrossWork <= recoveryCompletionThreshold;

    const openingPrincipal = currentPrincipal;

    // Simple Interest @ 10% p.a. on diminishing opening principal
    const interestDeduction =
      openingPrincipal > 0 && daysAccrued > 0
        ? Number((openingPrincipal * interestRatePerAnnum * (daysAccrued / 365)).toFixed(2))
        : 0;

    // Statutory Pro-rata Recovery in 10% to 80% window
    let principalDeduction = 0;
    if (openingPrincipal > 0) {
      if (grossWorkPercentage >= 10 && grossWorkPercentage <= 80) {
        // Recovery rate = (disbursedAmount / recoveryWindowSpan) * bill.grossCertifiedWork
        const targetRate = recoveryWindowSpan > 0 ? disbursedAmount / recoveryWindowSpan : 0;
        const calculatedDeduction = bill.grossCertifiedWork * targetRate;
        principalDeduction = Math.min(openingPrincipal, Number(calculatedDeduction.toFixed(2)));
      } else if (grossWorkPercentage > 80) {
        // Must be 100% recovered if past 80%
        principalDeduction = openingPrincipal;
      }
    }

    const closingPrincipal = Number(Math.max(0, openingPrincipal - principalDeduction).toFixed(2));
    const totalDeduction = Number((principalDeduction + interestDeduction).toFixed(2));

    let status: MobilisationScheduleRow["status"] = "PENDING_WINDOW";
    if (closingPrincipal === 0 && openingPrincipal > 0) {
      status = "RECOVERED";
    } else if (isInRecoveryWindow && principalDeduction > 0) {
      status = "ACTIVE_RECOVERY";
    } else if (grossWorkPercentage > 80 && closingPrincipal > 0) {
      status = "WINDOW_BREACH";
    }

    schedule.push({
      billNumber: bill.billNumber,
      billDate: bill.billDate,
      cumulativeGrossWork: bill.cumulativeGrossWork,
      grossWorkPercentage,
      isInRecoveryWindow,
      openingPrincipal,
      principalDeduction,
      interestDeduction,
      totalDeduction,
      closingPrincipal,
      daysAccrued,
      status,
    });

    currentPrincipal = closingPrincipal;
    lastBillDate = billDate;
    totalPrincipalRecovered += principalDeduction;
    totalInterestAccrued += interestDeduction;
  }

  const outstandingMobilisationBalance = Number(currentPrincipal.toFixed(2));
  const form31Result = await calculateForm31SecuredAdvance(form31Items);

  const overallOutstandingLiability = Number(
    (outstandingMobilisationBalance + form31Result.totalOutstanding).toFixed(2)
  );

  let statusBadge: "CLOSED" | "ACTIVE_RECOVERY" | "DELAY_FLAG" = "ACTIVE_RECOVERY";
  if (outstandingMobilisationBalance === 0 && form31Result.totalOutstanding === 0) {
    statusBadge = "CLOSED";
  } else if (schedule.some((r) => r.status === "WINDOW_BREACH")) {
    statusBadge = "DELAY_FLAG";
  }

  return {
    contractBaseline,
    maxAllowableMobilisation,
    disbursedAmount,
    isWithin10PercentLimit,
    recoveryCommencementThreshold,
    recoveryCompletionThreshold,
    totalPrincipalRecovered: Number(totalPrincipalRecovered.toFixed(2)),
    totalInterestAccrued: Number(totalInterestAccrued.toFixed(2)),
    outstandingMobilisationBalance,
    schedule,
    form31: form31Result,
    overallOutstandingLiability,
    statusBadge,
  };
}
