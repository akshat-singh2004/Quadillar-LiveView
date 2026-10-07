export interface WeighbridgeIntakeParams {
  challanWeightMt: number;
  grossWeightMt: number;
  tareWeightMt: number;
  materialCategory: string;
  hasMtcCertificate: boolean;
}

export interface WeighbridgeVerificationResult {
  netWeightMt: number;
  varianceMt: number;
  variancePct: number;
  isToleranceAcceptable: boolean; // Variance <= 0.5% (Legal Metrology standard)
  isDisputeRequired: boolean;     // 0.5% < Variance <= 2.5%
  isVehicleDiverted: boolean;     // Variance > 2.5% or Missing MTC for primary materials
  status: "CLEARED_UNLOADED" | "REJECTED_DIVERTED" | "VARIANCE_DEBIT_FLAG";
  rejectionReason?: string;
  verdict: string;
}

export class WeighbridgeEngine {
  /**
   * Evaluates Weighbridge ticket per CPWD Works Manual Cl. 13 & Legal Metrology Rules:
   * - Net Weight = Gross Weight - Tare Weight
   * - Variance = |Net Weight - Challan Weight| / Challan Weight * 100%
   * - Rejection if Variance > 2.5% or MTC missing for structural steel/cement
   */
  static verifyConsignment(params: WeighbridgeIntakeParams): WeighbridgeVerificationResult {
    const netWeightMt = parseFloat(Math.max(0, params.grossWeightMt - params.tareWeightMt).toFixed(3));
    const varianceMt = parseFloat((netWeightMt - params.challanWeightMt).toFixed(3));
    const variancePct = params.challanWeightMt > 0
      ? parseFloat(((Math.abs(varianceMt) / params.challanWeightMt) * 100).toFixed(2))
      : 0;

    const isStructuralPrimary =
      params.materialCategory === "STEEL_REBAR" ||
      params.materialCategory === "STRUCTURAL_STEEL" ||
      params.materialCategory === "CEMENT_BULKER";

    const isMtcCompliant = !isStructuralPrimary || params.hasMtcCertificate;

    let isVehicleDiverted = false;
    let isDisputeRequired = false;
    let isToleranceAcceptable = false;
    let status: WeighbridgeVerificationResult["status"] = "CLEARED_UNLOADED";
    let rejectionReason: string | undefined;

    if (!isMtcCompliant) {
      isVehicleDiverted = true;
      status = "REJECTED_DIVERTED";
      rejectionReason = "MANDATORY MTC MISSING: Structural steel/cement unloading without Mill Test Certificate prohibited under IS 456 Cl. 5.6.";
    } else if (variancePct > 2.5) {
      isVehicleDiverted = true;
      status = "REJECTED_DIVERTED";
      rejectionReason = `WEIGHT VARIANCE BREACH: Discrepancy of ${variancePct}% (${varianceMt} MT) exceeds 2.5% statutory rejection ceiling. Consignment diverted.`;
    } else if (variancePct > 0.5) {
      isDisputeRequired = true;
      status = "VARIANCE_DEBIT_FLAG";
    } else {
      isToleranceAcceptable = true;
    }

    let verdict = `CONSIGNMENT CLEARED: Net payload ${netWeightMt} MT verified within ±0.5% tolerance.`;
    if (isVehicleDiverted) {
      verdict = `CONSIGNMENT DIVERTED: ${rejectionReason}`;
    } else if (isDisputeRequired) {
      verdict = `VARIANCE FLAGGED: Net weight differs by ${variancePct}% (${varianceMt} MT). GRS certified with debit note adjustment.`;
    }

    return {
      netWeightMt,
      varianceMt,
      variancePct,
      isToleranceAcceptable,
      isDisputeRequired,
      isVehicleDiverted,
      status,
      rejectionReason,
      verdict,
    };
  }
}
