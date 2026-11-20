export type MemoryCategory = "EPISODIC_EVENT" | "STATE_DELTA" | "EXECUTIVE_DIRECTIVE";

export type MemorySourceModule =
  | "FIELD_VOICE_INGRESS"
  | "WEBCAM_SPOOF_SCANNER"
  | "IS456_ESCROW_GATE"
  | "BIM_MILLIMETER_HEATMAP"
  | "IOT_EDGE_BURST"
  | "PRINCIPAL_ARCHITECT";

export interface MemoryEngram {
  id: string;
  timestampIso: string;
  timeLabel: string;
  category: MemoryCategory;
  source: MemorySourceModule;
  projectCode: string;
  projectName: string;
  zoneOrElement: string;
  title: string;
  detail: string;
  beforeState?: string;
  afterState?: string;
  financialDeltaInr?: number;
  sha256Ref?: string;
  requiresFollowUp?: boolean;
}

const MEMORY_STORAGE_KEY = "quadmax-executive-memory-cortex-v1";
const MAX_LOCAL_ENGRAMS = 80;

const SEED_BASELINE_ENGRAMS: MemoryEngram[] = [
  {
    id: "MEM-SEED-001",
    timestampIso: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    timeLabel: "BASELINE",
    category: "STATE_DELTA",
    source: "IS456_ESCROW_GATE",
    projectCode: "PRJ-01",
    projectName: "Project Vanguard Commercial Hub",
    zoneOrElement: "BIT-4-TG03 (Level 3 Transfer Girder M50)",
    title: "28-Day Cube Break Failure Triggered Automatic Escrow Hold",
    detail: "Cube compressive strength 41.2 MPa fell below 46.0 MPa M50 acceptance with post-deshuttering honeycombing.",
    beforeState: "₹4,50,000 RA Tranche Unencumbered",
    afterState: "LOCKED — ₹4,50,000 Lien Active (NCR-2026-STR-042)",
    financialDeltaInr: -450000,
    sha256Ref: "8806a21acb4ebb84",
    requiresFollowUp: true,
  },
  {
    id: "MEM-SEED-002",
    timestampIso: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    timeLabel: "BASELINE",
    category: "STATE_DELTA",
    source: "BIM_MILLIMETER_HEATMAP",
    projectCode: "PRJ-02",
    projectName: "Summit Corporate Building (Gomti Nagar)",
    zoneOrElement: "12th Floor Grid B4–B7 Perimeter Wall W-04",
    title: "Perimeter Wall Cast 1,000 mm (1.00 m) Off-Grid & 9 Days Ahead of WBS",
    detail: "Terrestrial LiDAR detected +1,000 mm outward displacement from GFC axis prior to MEP sleeve sign-off.",
    beforeState: "GFC Design Axis X = 24.000 m (0.0 mm)",
    afterState: "As-Built Cast X = 25.000 m (+1,000 mm Drift)",
    financialDeltaInr: -1250000,
    sha256Ref: "3f90a21acb4ebb84",
    requiresFollowUp: true,
  },
];

export function getMemoryEngrams(): MemoryEngram[] {
  if (typeof window === "undefined") return SEED_BASELINE_ENGRAMS;
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(SEED_BASELINE_ENGRAMS));
      return SEED_BASELINE_ENGRAMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return SEED_BASELINE_ENGRAMS;
}

export function recordMemoryEngram(
  input: Omit<MemoryEngram, "id" | "timestampIso" | "timeLabel"> & {
    id?: string;
    timestampIso?: string;
  }
): MemoryEngram {
  const now = input.timestampIso || new Date().toISOString();
  const engram: MemoryEngram = {
    ...input,
    id: input.id || `MEM-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    timestampIso: now,
    timeLabel: new Date(now).toTimeString().slice(0, 8),
  };

  if (typeof window !== "undefined") {
    try {
      const existing = getMemoryEngrams();
      const deduped = existing.filter((e) => e.id !== engram.id);
      const next = [engram, ...deduped].slice(0, MAX_LOCAL_ENGRAMS);
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("quadillar-memory-updated", { detail: engram }));
    } catch {}

    // Fire-and-forget sync to server memory cortex for cross-device recall
    void fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engram }),
    }).catch(() => {});
  }

  return engram;
}

export function pinExecutiveDirective(directiveText: string, projectCode = "ALL-10"): MemoryEngram {
  return recordMemoryEngram({
    category: "EXECUTIVE_DIRECTIVE",
    source: "PRINCIPAL_ARCHITECT",
    projectCode,
    projectName: projectCode === "ALL-10" ? "All 10 Portfolio Sites" : projectCode,
    zoneOrElement: "Standing Principal Mandate",
    title: directiveText.trim(),
    detail: `Pinned executive rule enforced by QUADMAX.AI across portfolio audits and payment gates.`,
    requiresFollowUp: false,
  });
}

export function clearSessionMemoryToBaseline(): MemoryEngram[] {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(SEED_BASELINE_ENGRAMS));
      window.dispatchEvent(new CustomEvent("quadillar-memory-updated"));
    } catch {}
  }
  return SEED_BASELINE_ENGRAMS;
}

export function buildMemoryContextDigest(engrams: MemoryEngram[]): {
  totalEngrams: number;
  directives: string[];
  recentEvents: Array<{
    time: string;
    source: string;
    project: string;
    zone: string;
    title: string;
    delta?: string;
    followUp?: boolean;
  }>;
  unresolvedFollowUps: string[];
} {
  const directives = engrams
    .filter((e) => e.category === "EXECUTIVE_DIRECTIVE")
    .map((e) => e.title);

  const recentEvents = engrams.slice(0, 12).map((e) => ({
    time: e.timeLabel,
    source: e.source,
    project: `${e.projectCode} (${e.projectName})`,
    zone: e.zoneOrElement,
    title: e.title,
    delta: e.beforeState && e.afterState ? `${e.beforeState} -> ${e.afterState}` : undefined,
    followUp: e.requiresFollowUp,
  }));

  const unresolvedFollowUps = engrams
    .filter((e) => e.requiresFollowUp)
    .slice(0, 5)
    .map((e) => `[${e.projectCode} • ${e.zoneOrElement}] ${e.title}`);

  return {
    totalEngrams: engrams.length,
    directives,
    recentEvents,
    unresolvedFollowUps,
  };
}
