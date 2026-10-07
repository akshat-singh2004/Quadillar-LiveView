export class StatutoryMinWageTierAuditor {
  static getStatutoryFloorWageInr(tier: "SKILLED" | "SEMI_SKILLED" | "UNSKILLED"): number {
    switch (tier) {
      case "SKILLED": return 850;
      case "SEMI_SKILLED": return 720;
      case "UNSKILLED": return 580;
    }
  }

  static auditWageCompliance(tier: "SKILLED" | "SEMI_SKILLED" | "UNSKILLED", paidWageInr: number): boolean {
    return paidWageInr >= this.getStatutoryFloorWageInr(tier);
  }
}
