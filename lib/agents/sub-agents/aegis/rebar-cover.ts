export type EnvironmentalExposure = "MILD" | "MODERATE" | "SEVERE" | "VERY_SEVERE" | "EXTREME";

export class RebarCoverDurabilityAuditor {
  /**
   * IS 456:2000 Table 16 Nominal Cover to Meet Durability Requirements
   */
  static getRequiredNominalCoverMm(exposure: EnvironmentalExposure, memberType: "SLAB" | "BEAM" | "COLUMN" | "FOOTING"): number {
    let baseCoverMm = 20;
    switch (exposure) {
      case "MILD": baseCoverMm = 20; break;
      case "MODERATE": baseCoverMm = 30; break;
      case "SEVERE": baseCoverMm = 45; break;
      case "VERY_SEVERE": baseCoverMm = 50; break;
      case "EXTREME": baseCoverMm = 75; break;
    }

    if (memberType === "COLUMN") return Math.max(baseCoverMm, 40);
    if (memberType === "BEAM") return Math.max(baseCoverMm, 25);
    if (memberType === "FOOTING") return Math.max(baseCoverMm, 50);
    return baseCoverMm;
  }

  static auditCoverBlockInstallation(params: {
    exposure: EnvironmentalExposure;
    memberType: "SLAB" | "BEAM" | "COLUMN" | "FOOTING";
    installedCoverMm: number;
  }): { compliant: boolean; requiredMm: number; installedMm: number; deltaMm: number } {
    const requiredMm = this.getRequiredNominalCoverMm(params.exposure, params.memberType);
    const compliant = params.installedCoverMm >= requiredMm;
    return {
      compliant,
      requiredMm,
      installedMm: params.installedCoverMm,
      deltaMm: params.installedCoverMm - requiredMm,
    };
  }
}
