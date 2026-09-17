export interface EvmPoint {
  period: string;
  pv: number;
  ev: number;
  ac: number;
}

export interface EvmSummary {
  pv: number;
  ev: number;
  ac: number;
  cpi: number;
  spi: number;
  sv: number;
  cv: number;
}

export function buildEvmCurve(projectBudgetInr = 325000000): EvmPoint[] {
  const baseline = [0, 0.14, 0.3, 0.52, 0.71, 0.86, 0.96, 1];
  const earned = [0, 0.12, 0.26, 0.48, 0.67, 0.8, 0.9, 0.94];
  const actual = [0, 0.14, 0.32, 0.57, 0.76, 0.9, 1.04, 1.09];
  const periods = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

  return periods.map((period, index) => ({
    period,
    pv: Number((projectBudgetInr * baseline[index]).toFixed(0)),
    ev: Number((projectBudgetInr * earned[index]).toFixed(0)),
    ac: Number((projectBudgetInr * actual[index]).toFixed(0)),
  }));
}

export function summarizeEvmCurve(points: EvmPoint[]): EvmSummary {
  const last = points[points.length - 1];
  const pv = last.pv;
  const ev = last.ev;
  const ac = last.ac;
  const cpi = ac > 0 ? ev / ac : 1;
  const spi = pv > 0 ? ev / pv : 1;
  const sv = ev - pv;
  const cv = ev - ac;

  return { pv, ev, ac, cpi, spi, sv, cv };
}

export function formatEvmCurrency(value: number): string {
  if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(2)} Lakh`;
  return `₹${value.toLocaleString("en-IN")}`;
}
