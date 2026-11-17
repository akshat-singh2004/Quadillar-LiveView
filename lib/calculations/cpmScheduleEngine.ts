import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

export interface WbsCpmActivity {
  wbsId: string;
  bitId: string;
  name: string;
  durationDays: number;
  predecessors: string[];
  budgetCr: number;
  percentComplete: number;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  freeFloat: number;
  isCritical: boolean;
}

export interface VanguardEvmSummary {
  bacCr: number;
  pvCr: number;
  evCr: number;
  acCr: number;
  svCr: number;
  cvCr: number;
  spi: number;
  cpi: number;
  eacCr: number;
  vacCr: number;
  tcpi: number;
  criticalFloatDays: number;
}

export function computeVanguardCpmNetwork(): WbsCpmActivity[] {
  const rawTasks: Omit<
    WbsCpmActivity,
    "earlyStart" | "earlyFinish" | "lateStart" | "lateFinish" | "totalFloat" | "freeFloat" | "isCritical"
  >[] = [
    { wbsId: "WBS-01", bitId: "BIT-4", name: "IS 2911 Bored Piling & Podium Transfer Slab (+4.5m RL)", durationDays: 140, predecessors: [], budgetCr: 132.20, percentComplete: 94 },
    { wbsId: "WBS-02", bitId: "BIT-3", name: "14-Storey RCC Shear Core & Diagrid Exoskeleton (+54.0m RL)", durationDays: 260, predecessors: ["WBS-01"], budgetCr: 210.50, percentComplete: 66 },
    { wbsId: "WBS-03", bitId: "BIT-1", name: "48m Span Terracotta Bridge Arch & Turf Amphitheatre (+12.0m)", durationDays: 180, predecessors: ["WBS-01"], budgetCr: 118.40, percentComplete: 78 },
    { wbsId: "WBS-04", bitId: "BIT-2", name: "2,100-Ton Geodesic Space-Frame & Kalzip Silver Dome (+16.5m)", durationDays: 210, predecessors: ["WBS-01"], budgetCr: 164.80, percentComplete: 85 },
    { wbsId: "WBS-05", bitId: "BIT-5", name: "East Composite Steel-Concrete Wing (+28.0m RL)", durationDays: 170, predecessors: ["WBS-01"], budgetCr: 108.60, percentComplete: 58 },
    { wbsId: "WBS-06", bitId: "BIT-6", name: "Cantilevered Steel Helipad Deck (+23.0m RL)", durationDays: 75, predecessors: ["WBS-05"], budgetCr: 54.00, percentComplete: 72 },
    { wbsId: "WBS-07", bitId: "BIT-3", name: "4-Car Lift Bank, 14F HVAC Risers & 2,400 TR Chiller Integration", durationDays: 130, predecessors: ["WBS-02", "WBS-04"], budgetCr: 52.00, percentComplete: 42 },
    { wbsId: "WBS-08", bitId: "BIT-4", name: "Integrated Commissioning, Statutory NOC & Section 65B Handover", durationDays: 60, predecessors: ["WBS-03", "WBS-06", "WBS-07"], budgetCr: 24.00, percentComplete: 15 },
  ];

  const map = new Map<string, WbsCpmActivity>();
  rawTasks.forEach((t) => {
    map.set(t.wbsId, {
      ...t,
      earlyStart: 0,
      earlyFinish: t.durationDays,
      lateStart: 0,
      lateFinish: 0,
      totalFloat: 0,
      freeFloat: 0,
      isCritical: false,
    });
  });

  // Forward Pass
  map.forEach((task) => {
    const es =
      task.predecessors.length === 0
        ? 0
        : Math.max(...task.predecessors.map((pid) => map.get(pid)?.earlyFinish ?? 0));
    task.earlyStart = es;
    task.earlyFinish = es + task.durationDays;
  });

  const projectEnd = Math.max(...Array.from(map.values()).map((t) => t.earlyFinish));

  // Backward Pass
  const reversed = Array.from(map.values()).reverse();
  reversed.forEach((task) => {
    const successors = Array.from(map.values()).filter((other) =>
      other.predecessors.includes(task.wbsId)
    );
    const lf =
      successors.length === 0
        ? projectEnd
        : Math.min(...successors.map((s) => s.lateStart));
    task.lateFinish = lf;
    task.lateStart = lf - task.durationDays;
    task.totalFloat = task.lateStart - task.earlyStart;
    const minSuccEs =
      successors.length === 0
        ? projectEnd
        : Math.min(...successors.map((s) => s.earlyStart));
    task.freeFloat = minSuccEs - task.earlyFinish;
    task.isCritical = task.totalFloat === 0;
  });

  return Array.from(map.values());
}

export function computeVanguardEvmMetrics(): VanguardEvmSummary {
  const fin = VANGUARD_GENOME.financials;
  const bacCr = fin.epcBaselineCr; // 864.50 Cr
  const evCr = fin.certifiedToDateCr; // 534.26 Cr
  const pvCr = 534.26; // On Baseline (0d float)
  const acCr = +(evCr / fin.cpi).toFixed(2); // 526.88 Cr
  const svCr = +(evCr - pvCr).toFixed(2);
  const cvCr = +(evCr - acCr).toFixed(2);
  const spi = +(evCr / pvCr).toFixed(3);
  const cpi = fin.cpi;
  const eacCr = +(bacCr / cpi).toFixed(2);
  const vacCr = +(bacCr - eacCr).toFixed(2);
  const tcpi = +((bacCr - evCr) / (bacCr - acCr)).toFixed(3);

  return {
    bacCr,
    pvCr,
    evCr,
    acCr,
    svCr,
    cvCr,
    spi,
    cpi,
    eacCr,
    vacCr,
    tcpi,
    criticalFloatDays: 0,
  };
}
