export class CuttingStock1DBilletOptimizer {
  static getUnitWeightKgPerM(diameterMm: number): number {
    return parseFloat(((diameterMm * diameterMm) / 162.2).toFixed(3));
  }

  static optimize12mBillets(cutLengthsM: number[]): {
    billetsNeeded: number;
    totalWasteM: number;
    salvagedM: number;
    trueScrapPct: number;
    isCompliant: boolean;
  } {
    const stockLengthM = 12.0;
    const sorted = [...cutLengthsM].sort((a, b) => b - a);
    const bins: number[] = [];

    sorted.forEach((cut) => {
      let placed = false;
      for (let i = 0; i < bins.length; i++) {
        if (bins[i] + cut <= stockLengthM) {
          bins[i] = parseFloat((bins[i] + cut).toFixed(3));
          placed = true;
          break;
        }
      }
      if (!placed) bins.push(cut);
    });

    const billetsNeeded = bins.length;
    const totalStockM = billetsNeeded * stockLengthM;
    let totalWasteM = 0;
    let salvagedM = 0;

    bins.forEach((used) => {
      const offcut = stockLengthM - used;
      if (offcut >= 1.5) salvagedM += offcut;
      else totalWasteM += offcut;
    });

    const trueScrapPct = totalStockM > 0 ? parseFloat(((totalWasteM / totalStockM) * 100).toFixed(2)) : 0;
    return {
      billetsNeeded,
      totalWasteM: parseFloat(totalWasteM.toFixed(3)),
      salvagedM: parseFloat(salvagedM.toFixed(3)),
      trueScrapPct,
      isCompliant: trueScrapPct <= 3.0,
    };
  }
}
