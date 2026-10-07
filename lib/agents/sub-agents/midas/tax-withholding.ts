export class StatutoryTaxWithholdingAuditor {
  /**
   * Standard 5-tier statutory commercial deduction waterfall:
   * 1. 5% Retention Escrow (CPWD Cl. 1A / FIDIC Cl. 14.3)
   * 2. 1% BOCW Welfare Cess (BOCW Act 1996)
   * 3. 2% GST TDS (Section 51 CGST Act)
   * 4. 2% Income Tax TDS (Section 194C IT Act)
   */
  static computeDeductions(grossValuationInr: number): {
    retentionInr: number;
    bocwCessInr: number;
    gstTdsInr: number;
    incomeTaxTdsInr: number;
    totalStatutoryDeductionsInr: number;
    netPayableInr: number;
  } {
    const retentionInr = Math.round(grossValuationInr * 0.05);
    const bocwCessInr = Math.round(grossValuationInr * 0.01);
    const gstTdsInr = Math.round(grossValuationInr * 0.02);
    const incomeTaxTdsInr = Math.round(grossValuationInr * 0.02);
    const totalStatutoryDeductionsInr = retentionInr + bocwCessInr + gstTdsInr + incomeTaxTdsInr;
    const netPayableInr = Math.max(0, grossValuationInr - totalStatutoryDeductionsInr);

    return {
      retentionInr,
      bocwCessInr,
      gstTdsInr,
      incomeTaxTdsInr,
      totalStatutoryDeductionsInr,
      netPayableInr,
    };
  }
}
