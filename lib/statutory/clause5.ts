"use server";

// ============================================================================
// CPWD Statutory Computation Engine: Clause 2 (LD) & Clause 5 (Hindrance/EOT)
// Works Manual 2024 / GCC Clause 2 & 5 / FIDIC Red Book Clause 8.4 & 8.7
// File: lib/statutory/clause5.ts
// ============================================================================

export type AttributableParty = "Client" | "Contractor" | "Force Majeure";

export interface HindranceEvent {
  id: string;
  natureOfHindrance: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  attributableParty: AttributableParty;
  clauseRef?: string;
}

export interface ApportionedHindranceItem extends HindranceEvent {
  durationDays: number;
  overlappingDays: number;
  exclusiveDays: number;
  eotGrantedDays: number;
}

export interface Clause5Input {
  contractBaseline: number;
  delayedWorkValue: number;
  hindrances: HindranceEvent[];
  stipulatedCompletionDate: string;
}

export interface Clause5Result {
  contractBaseline: number;
  delayedWorkValue: number;
  totalGrossHindranceDays: number;
  totalUniqueDelayDays: number;
  totalOverlappingDays: number;
  justifiedEotDays: number;
  contractorDelayDays: number;
  revisedCompletionDate: string;
  // Clause 2 Liquidated Damages
  ldRatePerMonthPercentage: number;
  calculatedRawLd: number;
  statutory10PercentCap: number;
  projectedLd: number;
  isCapReached: boolean;
  excessOverCap: number;
  apportionedItems: ApportionedHindranceItem[];
  statutoryLdWarning: string | null;
}

function parseDateToUtc(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function formatUtcDate(utcMs: number): string {
  const d = new Date(utcMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates concurrent delay apportionment under CPWD Clause 5 and computes
 * strictly capped Liquidated Damages under CPWD Clause 2 (1.5% per month, hardcapped at 10%).
 */
export async function calculateClause5AndLD(
  input: Clause5Input
): Promise<Clause5Result> {
  const {
    contractBaseline = 450000000,
    delayedWorkValue = 450000000,
    hindrances = [],
    stipulatedCompletionDate = "2026-11-30",
  } = input;

  if (hindrances.length === 0) {
    const statutory10PercentCap = Number((contractBaseline * 0.1).toFixed(2));
    return {
      contractBaseline,
      delayedWorkValue,
      totalGrossHindranceDays: 0,
      totalUniqueDelayDays: 0,
      totalOverlappingDays: 0,
      justifiedEotDays: 0,
      contractorDelayDays: 0,
      revisedCompletionDate: stipulatedCompletionDate,
      ldRatePerMonthPercentage: 1.5,
      calculatedRawLd: 0,
      statutory10PercentCap,
      projectedLd: 0,
      isCapReached: false,
      excessOverCap: 0,
      apportionedItems: [],
      statutoryLdWarning: null,
    };
  }

  // 1. Map day-by-day occurrences across all events
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const dayMap = new Map<number, HindranceEvent[]>();

  let earliestMs = Infinity;
  let latestMs = -Infinity;

  for (const h of hindrances) {
    const startMs = parseDateToUtc(h.startDate);
    const endMs = parseDateToUtc(h.endDate);
    if (startMs < earliestMs) earliestMs = startMs;
    if (endMs > latestMs) latestMs = endMs;

    for (let t = startMs; t <= endMs; t += ONE_DAY_MS) {
      const list = dayMap.get(t) ?? [];
      list.push(h);
      dayMap.set(t, list);
    }
  }

  // 2. Classify each calendar day
  let totalUniqueDelayDays = dayMap.size;
  let totalOverlappingDays = 0;
  let contractorDelayDays = 0;
  let clientOrFmUniqueDays = 0;

  dayMap.forEach((events) => {
    if (events.length > 1) {
      totalOverlappingDays++;
    }

    const hasClientOrFm = events.some(
      (e) => e.attributableParty === "Client" || e.attributableParty === "Force Majeure"
    );
    const onlyContractor = events.every((e) => e.attributableParty === "Contractor");

    if (onlyContractor) {
      contractorDelayDays++;
    }

    if (hasClientOrFm) {
      clientOrFmUniqueDays++;
    }
  });

  // Statutory EOT Justification: Total Delay minus Contractor-caused delays
  const justifiedEotDays = Math.max(0, totalUniqueDelayDays - contractorDelayDays);

  // 3. Apportion metrics to individual events
  let totalGrossHindranceDays = 0;
  const apportionedItems: ApportionedHindranceItem[] = hindrances.map((h) => {
    const startMs = parseDateToUtc(h.startDate);
    const endMs = parseDateToUtc(h.endDate);
    const durationDays = Math.max(1, Math.round((endMs - startMs) / ONE_DAY_MS) + 1);
    totalGrossHindranceDays += durationDays;

    let overlappingDays = 0;
    let exclusiveDays = 0;

    for (let t = startMs; t <= endMs; t += ONE_DAY_MS) {
      const concurrent = dayMap.get(t) ?? [];
      if (concurrent.length > 1) {
        overlappingDays++;
      } else {
        exclusiveDays++;
      }
    }

    const eotGrantedDays =
      h.attributableParty === "Client" || h.attributableParty === "Force Majeure"
        ? durationDays
        : 0;

    return {
      ...h,
      durationDays,
      overlappingDays,
      exclusiveDays,
      eotGrantedDays,
    };
  });

  // 4. Compute Revised Stipulated Completion Date
  const stipulatedMs = parseDateToUtc(stipulatedCompletionDate);
  const revisedMs = stipulatedMs + justifiedEotDays * ONE_DAY_MS;
  const revisedCompletionDate = formatUtcDate(revisedMs);

  // 5. Clause 2 Liquidated Damages (LD) Capping
  // Rate: 1.5% per month (0.05% per day) on delayed work value
  const dailyLdRate = 0.015 / 30; // 0.0005 per day
  const calculatedRawLd = Number(
    (delayedWorkValue * (dailyLdRate * contractorDelayDays)).toFixed(2)
  );

  // Hard Cap at exactly 10% of Contract Baseline
  const statutory10PercentCap = Number((contractBaseline * 0.1).toFixed(2));
  const isCapReached = calculatedRawLd >= statutory10PercentCap;
  const projectedLd = Number(
    Math.min(statutory10PercentCap, calculatedRawLd).toFixed(2)
  );
  const excessOverCap = Number(
    Math.max(0, calculatedRawLd - statutory10PercentCap).toFixed(2)
  );

  const statutoryLdWarning = isCapReached
    ? `STATUTORY CEILING REACHED: Calculated Liquidated Damages of ₹${calculatedRawLd.toLocaleString(
        "en-IN",
        { minimumFractionDigits: 2 }
      )} exceeds the statutory 10.00% ceiling. Under CPWD Works Manual 2024 Clause 2, total compensation is capped at ₹${statutory10PercentCap.toLocaleString(
        "en-IN",
        { minimumFractionDigits: 2 }
      )}.`
    : null;

  return {
    contractBaseline,
    delayedWorkValue,
    totalGrossHindranceDays,
    totalUniqueDelayDays,
    totalOverlappingDays,
    justifiedEotDays,
    contractorDelayDays,
    revisedCompletionDate,
    ldRatePerMonthPercentage: 1.5,
    calculatedRawLd,
    statutory10PercentCap,
    projectedLd,
    isCapReached,
    excessOverCap,
    apportionedItems,
    statutoryLdWarning,
  };
}
