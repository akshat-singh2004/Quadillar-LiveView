/**
 * PROJECT VANGUARD: REBAR BBS & 1D BILLET CUTTING STOCK OPTIMIZER
 * Formulated strictly under:
 * - IS 2502:1963 (Bending and Fixing of Bars for Concrete Reinforcement)
 * - IS 456:2000 (Clauses 26.2 Development Length, 26.5 Reinforcement Detailing)
 * - SP 34 (Handbook on Concrete Reinforcement and Detailing)
 *
 * Mathematically derives cutting lengths with bend deductions and executes
 * First-Fit Decreasing (FFD) stock nesting on 12.0m commercial mill lengths
 * to calculate steel utilization and scrap percentage.
 */

export interface StructuralMemberBarSpec {
  memberTag: string;
  memberType: "BEAM" | "COLUMN" | "SLAB" | "STIRRUP";
  barDiaMm: number;        // Nominal bar diameter (e.g., 8, 10, 12, 16, 20, 25, 32 mm)
  steelGradeMpa: number;   // Yield stress fy (e.g. 550 for Fe 550D)
  concreteGradeMpa: number;// Target fck (e.g. 35 for M35)
  spanLengthM: number;     // Physical bay span (e.g. 10.3m X-bay or 10.9m Z-bay)
  clearCoverMm: number;    // Concrete cover (e.g., 25mm for slabs, 40mm for beams/cols)
  quantityPerMember: number;
  totalMembersCount: number;
  shapeType: "STRAIGHT_WITH_HOOKS" | "CRANKED_BENT_UP" | "RECTANGULAR_TIE" | "COLUMN_VERTICAL";
}

export interface BilletStockCut {
  barId: string;
  lengthMm: number;
  memberTag: string;
}

export interface NestedStockBar {
  barIndex: number;
  stockLengthMm: number; // 12,000 mm (12m standard commercial billet)
  cuts: BilletStockCut[];
  totalCutLengthMm: number;
  offcutMm: number;
  isScrap: boolean; // Offcut < 1200mm is non-recoverable site scrap
}

// 1. IS 456 Cl. 26.2.1 Development Length (L_d) in Tension
// L_d = (phi * sigma_s) / (4 * tau_bd) where sigma_s = 0.87 * fy
export function calculateDevelopmentLength(barDiaMm: number, fyMpa: number, fckMpa: number): number {
  // Design bond stress tau_bd per IS 456 Table 26.2.1.1 for plain bars in tension
  let tauBd = 1.2;
  if (fckMpa >= 40) tauBd = 1.9;
  else if (fckMpa >= 35) tauBd = 1.7;
  else if (fckMpa >= 30) tauBd = 1.5;
  else if (fckMpa >= 25) tauBd = 1.4;

  // Deformed Fe 550D bars receive a 60% increase in bond stress
  const tauBdDeformed = tauBd * 1.6;
  const sigmaS = 0.87 * fyMpa;
  const ldMm = (barDiaMm * sigmaS) / (4 * tauBdDeformed);

  return Math.ceil(ldMm);
}

// 2. Unit Weight of Rebar per Linear Meter (Density = 7850 kg/m3)
// W = (pi * (d/2000)^2 * 7850) = d^2 / 162.28 kg/m
export function calculateUnitWeightKgPerM(barDiaMm: number): number {
  return +(Math.pow(barDiaMm, 2) / 162.28).toFixed(3);
}

// 3. IS 2502:1963 Clause 4.2 Bend Deductions:
// - 45 deg bend:  deduct 1d
// - 90 deg bend:  deduct 2d
// - 135 deg bend: deduct 3d
// - 180 deg hook: deduct 4d (or add 9d hook extension minus 2d bend)
export function calculateCuttingLengthMm(spec: StructuralMemberBarSpec): {
  grossLengthMm: number;
  bendDeductionMm: number;
  netCuttingLengthMm: number;
  ldMm: number;
} {
  const d = spec.barDiaMm;
  const ld = calculateDevelopmentLength(d, spec.steelGradeMpa, spec.concreteGradeMpa);
  let grossLengthMm = 0;
  let bendDeductionMm = 0;

  if (spec.shapeType === "STRAIGHT_WITH_HOOKS") {
    // Primary Beam Longitudinal Bottom Bar spanning clear bay with anchorage Ld into columns
    const clearSpanMm = spec.spanLengthM * 1000 - 2 * spec.clearCoverMm;
    const anchorageBothEnds = 2 * ld;
    grossLengthMm = clearSpanMm + anchorageBothEnds;
    // Two 90-degree anchorage bends: 2 * (2d) = 4d
    bendDeductionMm = 2 * (2 * d);
  } else if (spec.shapeType === "RECTANGULAR_TIE") {
    // Beam Stirrup / Column Tie: Perimeter = 2*(B - 2c) + 2*(D - 2c) + 2*(135 deg seismic hooks @ 10d)
    const bMm = 300 - 2 * spec.clearCoverMm; // 300mm beam width
    const dMm = 450 - 2 * spec.clearCoverMm; // 450mm beam depth
    const hookExtensions = 2 * (10 * d);    // 135-degree anti-torsion hook per IS 13920
    grossLengthMm = 2 * (bMm + dMm) + hookExtensions;
    // Three 90-degree corner bends + Two 135-degree hook bends: 3*(2d) + 2*(3d) = 12d
    bendDeductionMm = 3 * (2 * d) + 2 * (3 * d);
  } else if (spec.shapeType === "COLUMN_VERTICAL") {
    // Column Vertical Bar across single 3.75m storey lift + compression lap length (50d per IS 456 Cl. 26.2.5.1)
    const storeyHeightMm = (spec.spanLengthM / 4) * 1000; // 15m / 4 storeys = 3,750 mm
    const lapLengthMm = 50 * d;
    grossLengthMm = storeyHeightMm + lapLengthMm;
    bendDeductionMm = 0; // straight bar
  } else {
    // Default slab distribution straight bar
    grossLengthMm = spec.spanLengthM * 1000 - 2 * spec.clearCoverMm;
    bendDeductionMm = 0;
  }

  const netCuttingLengthMm = Math.max(100, grossLengthMm - bendDeductionMm);

  return {
    grossLengthMm,
    bendDeductionMm,
    netCuttingLengthMm,
    ldMm: ld
  };
}

// 4. 1D Cutting Stock Optimizer (First-Fit Decreasing Knapsack Algorithm)
export function solve1DCuttingStock(
  demands: { tag: string; lengthMm: number; count: number }[],
  stockLengthMm = 12000
): {
  stockBars: NestedStockBar[];
  totalStockBarsUsed: number;
  totalSteelWeightKg: number;
  totalCutWeightKg: number;
  totalOffcutWeightKg: number;
  scrapWeightKg: number;
  scrapPercentage: number;
  materialEfficiencyPct: number;
} {
  // Flatten demands into individual cuts
  const allCuts: BilletStockCut[] = [];
  demands.forEach(d => {
    for (let i = 0; i < d.count; i++) {
      allCuts.push({
        barId: `${d.tag}#${i + 1}`,
        lengthMm: d.lengthMm,
        memberTag: d.tag
      });
    }
  });

  // Sort descending: First-Fit Decreasing (FFD)
  allCuts.sort((a, b) => b.lengthMm - a.lengthMm);

  const stockBars: NestedStockBar[] = [];

  allCuts.forEach(cut => {
    let placed = false;
    for (const bar of stockBars) {
      if (bar.totalCutLengthMm + cut.lengthMm <= bar.stockLengthMm) {
        bar.cuts.push(cut);
        bar.totalCutLengthMm += cut.lengthMm;
        bar.offcutMm = bar.stockLengthMm - bar.totalCutLengthMm;
        bar.isScrap = bar.offcutMm < 1200; // Offcuts < 1.2m cannot be reused as structural dowels
        placed = true;
        break;
      }
    }

    if (!placed) {
      const newBar: NestedStockBar = {
        barIndex: stockBars.length + 1,
        stockLengthMm,
        cuts: [cut],
        totalCutLengthMm: cut.lengthMm,
        offcutMm: stockLengthMm - cut.lengthMm,
        isScrap: (stockLengthMm - cut.lengthMm) < 1200
      };
      stockBars.push(newBar);
    }
  });

  // Compute steel masses (assuming average nominal diameter reference for unit conversion)
  const totalStockLengthMm = stockBars.length * stockLengthMm;
  const totalRequiredCutLengthMm = allCuts.reduce((acc, c) => acc + c.lengthMm, 0);
  const totalOffcutLengthMm = totalStockLengthMm - totalRequiredCutLengthMm;
  const totalScrapLengthMm = stockBars.reduce((acc, b) => acc + (b.isScrap ? b.offcutMm : 0), 0);

  // Conversion reference: 20mm bar baseline (2.466 kg/m)
  const refWeightPerM = calculateUnitWeightKgPerM(20);
  const totalStockWeightKg = +((totalStockLengthMm / 1000) * refWeightPerM).toFixed(1);
  const totalCutWeightKg = +((totalRequiredCutLengthMm / 1000) * refWeightPerM).toFixed(1);
  const totalOffcutWeightKg = +((totalOffcutLengthMm / 1000) * refWeightPerM).toFixed(1);
  const scrapWeightKg = +((totalScrapLengthMm / 1000) * refWeightPerM).toFixed(1);

  const materialEfficiencyPct = totalStockLengthMm > 0
    ? +((totalRequiredCutLengthMm / totalStockLengthMm) * 100).toFixed(2)
    : 100;
  const scrapPercentage = totalStockLengthMm > 0
    ? +((totalScrapLengthMm / totalStockLengthMm) * 100).toFixed(2)
    : 0;

  return {
    stockBars,
    totalStockBarsUsed: stockBars.length,
    totalSteelWeightKg: totalStockWeightKg,
    totalCutWeightKg: totalCutWeightKg,
    totalOffcutWeightKg: totalOffcutWeightKg,
    scrapWeightKg,
    scrapPercentage,
    materialEfficiencyPct
  };
}
