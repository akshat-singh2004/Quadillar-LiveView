export interface WindLatchState {
  active: boolean;
  latchedPeakWindMs: number;
  latchedAtUtc: string | null;
  requiresManualClearance: boolean;
}

const MAX_TRACKED_PROJECTS = 250;
const CRANE_LOCKOUT_THRESHOLD_MS = 15.0;

const windLatches = new Map<string, { peakWindMs: number; latchedAtUtc: string }>();

export function resetWindLatch(projectId?: string): void {
  if (projectId) {
    windLatches.delete(projectId.trim().toUpperCase());
  } else {
    windLatches.clear();
  }
}

/**
 * Safety-first crane wind interlock latch:
 * Once gust velocity reaches >= 15.0 m/s (IS 875 Part 3), lockout stays latched
 * even if subsequent anemometer ticks dip below threshold until explicit manual clearance.
 */
export function evaluateWindLatch(
  projectId: string,
  incomingWindMs: number | undefined,
  clearSafetyLatch = false
): { effectiveWindMs: number | undefined; latch: WindLatchState } {
  const key = (projectId || "VANGUARD-LKO-01").trim().toUpperCase();

  if (clearSafetyLatch) {
    windLatches.delete(key);
    return {
      effectiveWindMs: incomingWindMs,
      latch: {
        active: false,
        latchedPeakWindMs: 0,
        latchedAtUtc: null,
        requiresManualClearance: false,
      },
    };
  }

  const validIncoming = typeof incomingWindMs === "number" && Number.isFinite(incomingWindMs) && incomingWindMs >= 0
    ? incomingWindMs
    : undefined;

  if (validIncoming !== undefined && validIncoming >= CRANE_LOCKOUT_THRESHOLD_MS) {
    if (!windLatches.has(key) && windLatches.size >= MAX_TRACKED_PROJECTS) {
      const oldest = windLatches.keys().next().value;
      if (oldest) windLatches.delete(oldest);
    }
    const prev = windLatches.get(key);
    const peak = prev ? Math.max(prev.peakWindMs, validIncoming) : validIncoming;
    const nowIso = new Date().toISOString();
    windLatches.set(key, { peakWindMs: peak, latchedAtUtc: prev?.latchedAtUtc || nowIso });
  }

  const existing = windLatches.get(key);
  if (existing) {
    return {
      effectiveWindMs: validIncoming !== undefined ? Math.max(validIncoming, existing.peakWindMs) : existing.peakWindMs,
      latch: {
        active: true,
        latchedPeakWindMs: existing.peakWindMs,
        latchedAtUtc: existing.latchedAtUtc,
        requiresManualClearance: true,
      },
    };
  }

  return {
    effectiveWindMs: validIncoming,
    latch: {
      active: false,
      latchedPeakWindMs: 0,
      latchedAtUtc: null,
      requiresManualClearance: false,
    },
  };
}
