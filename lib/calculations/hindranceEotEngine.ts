/**
 * PROJECT VANGUARD: STATUTORY HINDRANCE REGISTER & EOT CLAIM ENGINE
 * Formulated strictly under:
 * - CPWD GCC Clause 5: Extension of Time for Delay & Form 24 (Hindrance Register)
 * - CPWD GCC Clause 2: Compensation for Delay / Liquidated Damages (Max 10% BAC)
 * - Society of Construction Law (SCL) Delay and Disruption Protocol (2nd Edition)
 * - Hudson's & Emden's Building Contract Overhead Prolongation Formulae
 * - Indian Contract Act 1872 Sections 55, 73 & 74 (Breach and Liquidated Damages)
 * - Indian Evidence Act Section 65B (Contemporaneous Delay Notarization)
 *
 * Project Vanguard Parameters:
 * - Contract Sanctioned BAC: ₹1,85,92,000 (₹1.8592 Cr)
 * - Contract Duration: 180 Calendar Days (01-May-2026 to 27-Oct-2026)
 * - Maximum Liquidated Damages Liability (10% BAC): ₹18,59,200
 */

export type HindranceClassification =
  | "EMPLOYER_RISK_EVENT"      // Client delay: GFC drawings, site access, client variations
  | "CONTRACTOR_RISK_EVENT"    // Contractor fault: Labor strike, plant breakdown, rework
  | "FORCE_MAJEURE_STATUTORY"; // Acts of God, unseasonal rain > 35mm, municipal stop-work order

export interface HindranceLogEvent {
  hindranceId: string;
  hindranceNo: string;
  wbsActivityId: string;       // Linked CPM task (e.g., ACT-06, ACT-09)
  activityDescription: string;
  classification: HindranceClassification;
  startDate: string;
  endDate: string;
  grossDurationDays: number;
  criticalPathTotalFloatDays: number; // Total Float (TF) of affected activity
  netCriticalDelayDays: number;        // Days impacting completion milestone
  isConcurrent: boolean;
  overlappingEventId?: string;
  statutoryNoticeServedWithinDays: number; // Must be <= 14 days per CPWD Cl. 5.2
  isNoticeCompliant: boolean;
  compensableStatus: "TIME_AND_COST" | "TIME_ONLY" | "NON_COMPENSABLE";
}

export interface EotSynthesisResult {
  totalGrossHindranceDays: number;
  netNonConcurrentCriticalDelayDays: number; // Entitlement under SCL Protocol
  proposedRevisedCompletionDate: string;
  contractorLiquidatedDamagesExposureInr: number;
  hudsonOverheadClaimInr: number;
  isLiquidatedDamagesShielded: boolean;
  statutorySummary: string;
}

// 1. Evaluate Net Critical Delay using SCL Time Impact Analysis (TIA):
// Net Critical Delay = max(0, Gross Duration - Total Float)
export function evaluateSingleHindranceImpact(
  grossDuration: number,
  totalFloat: number,
  classification: HindranceClassification,
  noticeDays = 7
): {
  netCriticalDays: number;
  compensable: HindranceLogEvent["compensableStatus"];
  isNoticeOk: boolean;
} {
  const isNoticeOk = noticeDays <= 14; // CPWD Cl. 5.2 14-day notice mandate
  const netCriticalDays = Math.max(0, grossDuration - totalFloat);

  let compensable: HindranceLogEvent["compensableStatus"] = "NON_COMPENSABLE";
  if (classification === "EMPLOYER_RISK_EVENT") {
    compensable = netCriticalDays > 0 ? "TIME_AND_COST" : "TIME_ONLY";
  } else if (classification === "FORCE_MAJEURE_STATUTORY") {
    compensable = "TIME_ONLY";
  }

  return { netCriticalDays, compensable, isNoticeOk };
}

// 2. Hudson's Prolongation Head Office Overhead & Profit Claim Formula:
// Claim = ( (h / 100) * (Contract Sum / Contract Period Days) ) * Compensable Delay Days
// h = 15.0% (Standard CPWD / SCL Head Office Overhead & Profit percentage)
export function calculateHudsonOverheadClaim(
  contractBacInr: number,
  contractPeriodDays: number,
  compensableDelayDays: number,
  overheadPct = 15.0
): number {
  if (contractPeriodDays <= 0 || compensableDelayDays <= 0) return 0;
  const dailyOverheadRate = (overheadPct / 100) * (contractBacInr / contractPeriodDays);
  return +(dailyOverheadRate * compensableDelayDays).toFixed(2);
}

// 3. Multi-Event Hindrance Register Synthesis & CPWD Cl. 2 Liquidated Damages Shield
export function evaluateHindrancesAndEot(
  hindrances: HindranceLogEvent[],
  contractBacInr = 18592000,
  contractPeriodDays = 180,
  originalCompletionDate = "27-Oct-2026"
): EotSynthesisResult {
  let grossDays = 0;
  let netCriticalDays = 0;
  let compensableCostDays = 0;

  hindrances.forEach(h => {
    grossDays += h.grossDurationDays;
    if (!h.isConcurrent) {
      netCriticalDays += h.netCriticalDelayDays;
      if (h.compensableStatus === "TIME_AND_COST") {
        compensableCostDays += h.netCriticalDelayDays;
      }
    }
  });

  // Calculate Hudson's Prolongation Claim
  const hudsonClaimInr = calculateHudsonOverheadClaim(
    contractBacInr,
    contractPeriodDays,
    compensableCostDays,
    15.0
  );

  // CPWD Clause 2 Liquidated Damages: 1% of BAC per week of unjustified delay, max 10% BAC
  const maxLdInr = +(contractBacInr * 0.10).toFixed(2); // ₹18,59,200
  // If contractor has unjustified delay (Contractor Risk on critical path):
  const unjustifiedDelayDays = hindrances
    .filter(h => h.classification === "CONTRACTOR_RISK_EVENT")
    .reduce((acc, h) => acc + h.netCriticalDelayDays, 0);

  const ldExposureInr = Math.min(
    maxLdInr,
    +((unjustifiedDelayDays / 7) * (0.01 * contractBacInr)).toFixed(2)
  );

  const isShielded = ldExposureInr === 0;

  // Compute New Date
  const orig = new Date(2026, 9, 27); // 27-Oct-2026
  orig.setDate(orig.getDate() + netCriticalDays);
  const revisedDateStr = orig.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  return {
    totalGrossHindranceDays: grossDays,
    netNonConcurrentCriticalDelayDays: netCriticalDays,
    proposedRevisedCompletionDate: revisedDateStr,
    contractorLiquidatedDamagesExposureInr: ldExposureInr,
    hudsonOverheadClaimInr: hudsonClaimInr,
    isLiquidatedDamagesShielded: isShielded,
    statutorySummary: `EOT Entitlement: ${netCriticalDays} Days • Extended Completion: ${revisedDateStr} • LD Shielded: ${isShielded ? "YES (₹0 LD)" : `₹${ldExposureInr.toLocaleString()} Risk`}`
  };
}
