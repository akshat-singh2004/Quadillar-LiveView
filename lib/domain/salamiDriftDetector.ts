export interface SalamiPourSample {
  projectId: string;
  zoneId?: string;
  billedVolumeCum: number;
  batchingPlantVolumeCum: number;
  cementBatchedKgPerCum?: number;
  nominalCementKgPerCum?: number;
  recordedAtUtc: string;
}

export interface SalamiDriftVerdict {
  triggered: boolean;
  windowSamples: number;
  consecutivePaddedPours: number;
  cumulativeVolumePadCum: number;
  cumulativeCementDeficitKg: number;
  flags: string[];
  recommendedAdditionalHoldInr: number;
  summary: string;
}

const MAX_PROJECTS = 200;
const MAX_WINDOW_PER_PROJECT = 20;
const RATE_PER_CUM_INR = 7800;

const projectWindows = new Map<string, SalamiPourSample[]>();

function toFiniteNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function resetSalamiDriftWindow(projectId?: string): void {
  if (projectId) {
    projectWindows.delete(projectId.toUpperCase());
  } else {
    projectWindows.clear();
  }
}

/**
 * Rolling-window cumulative detector for "boiling frog" / salami-slicing fraud:
 * catches repeated micro-padding (e.g., +0.8 m3 volume or -1.8% cement per pour)
 * that stays underneath single-ticket alarm tolerances.
 */
export function recordAndEvaluateSalamiDrift(raw: {
  projectId?: string;
  zoneId?: string;
  billedVolumeCum?: unknown;
  batchingPlantVolumeCum?: unknown;
  cementBatchedKgPerCum?: unknown;
  nominalCementKgPerCum?: unknown;
}): SalamiDriftVerdict {
  const key = (raw.projectId || "VANGUARD-LKO-01").trim().toUpperCase();
  const billed = toFiniteNumber(raw.billedVolumeCum, 0);
  const batched = toFiniteNumber(raw.batchingPlantVolumeCum, 0);
  const cementActual = raw.cementBatchedKgPerCum !== undefined ? toFiniteNumber(raw.cementBatchedKgPerCum, 400) : 400;
  const cementNominal = toFiniteNumber(raw.nominalCementKgPerCum, 400);

  if (!projectWindows.has(key) && projectWindows.size >= MAX_PROJECTS) {
    const oldestKey = projectWindows.keys().next().value;
    if (oldestKey) projectWindows.delete(oldestKey);
  }

  const list = projectWindows.get(key) || [];
  list.push({
    projectId: key,
    zoneId: raw.zoneId,
    billedVolumeCum: billed,
    batchingPlantVolumeCum: batched,
    cementBatchedKgPerCum: cementActual,
    nominalCementKgPerCum: cementNominal,
    recordedAtUtc: new Date().toISOString(),
  });
  if (list.length > MAX_WINDOW_PER_PROJECT) {
    list.splice(0, list.length - MAX_WINDOW_PER_PROJECT);
  }
  projectWindows.set(key, list);

  let cumulativeVolumePadCum = 0;
  let cumulativeCementDeficitKg = 0;
  let consecutivePaddedPours = 0;

  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    const volPad = s.billedVolumeCum > s.batchingPlantVolumeCum && s.batchingPlantVolumeCum > 0
      ? s.billedVolumeCum - s.batchingPlantVolumeCum
      : 0;
    const cemDef = (s.nominalCementKgPerCum ?? 400) > (s.cementBatchedKgPerCum ?? 400) && (s.cementBatchedKgPerCum ?? 0) > 0
      ? (s.nominalCementKgPerCum ?? 400) - (s.cementBatchedKgPerCum ?? 400)
      : 0;

    if (volPad > 0.15 || cemDef > 2) {
      consecutivePaddedPours++;
    } else {
      break;
    }
  }

  for (const s of list) {
    if (s.billedVolumeCum > s.batchingPlantVolumeCum && s.batchingPlantVolumeCum > 0) {
      cumulativeVolumePadCum += s.billedVolumeCum - s.batchingPlantVolumeCum;
    }
    if ((s.nominalCementKgPerCum ?? 400) > (s.cementBatchedKgPerCum ?? 400) && (s.cementBatchedKgPerCum ?? 0) > 0) {
      cumulativeCementDeficitKg += (s.nominalCementKgPerCum ?? 400) - (s.cementBatchedKgPerCum ?? 400);
    }
  }

  cumulativeVolumePadCum = Number(cumulativeVolumePadCum.toFixed(2));
  cumulativeCementDeficitKg = Number(cumulativeCementDeficitKg.toFixed(2));

  const flags: string[] = [];
  if (cumulativeVolumePadCum >= 3.0 || consecutivePaddedPours >= 4) {
    flags.push("CUMULATIVE_SALAMI_VOLUME_DRIFT");
  }
  if (cumulativeCementDeficitKg >= 30.0) {
    flags.push("CUMULATIVE_CEMENT_UNDERBATCH_DRIFT");
  }

  const triggered = flags.length > 0;
  const recommendedAdditionalHoldInr = triggered
    ? Math.round(cumulativeVolumePadCum * RATE_PER_CUM_INR + cumulativeCementDeficitKg * 420)
    : 0;

  return {
    triggered,
    windowSamples: list.length,
    consecutivePaddedPours,
    cumulativeVolumePadCum,
    cumulativeCementDeficitKg,
    flags,
    recommendedAdditionalHoldInr,
    summary: triggered
      ? `Rolling-window slow-bleed detected across ${list.length} pours (+${cumulativeVolumePadCum} m3 phantom volume, -${cumulativeCementDeficitKg} kg/m3 cumulative cement deficit).`
      : `Rolling window nominal (${list.length} pours tracked).`,
  };
}
