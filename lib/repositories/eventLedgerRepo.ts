import crypto from "node:crypto";
import { getSupabaseAdmin, type StorageMode } from "@/lib/server/supabaseAdmin";
import {
  EXTREME_TG03_FIXTURE,
  evaluateMolecularGovernor,
} from "@/lib/engines/molecularGovernor";

export type LedgerEventType =
  | "GENESIS"
  | "STATE_MUTATION"
  | "TRIANGULATION_ALERT"
  | "KINETIC_ACTION"
  | "IOT_INTERLOCK";

export interface GovernorLedgerEvent {
  projectId: string;
  seq: number;
  eventType: LedgerEventType;
  actor: string;
  source: string;
  mode: string;
  httpStatus: number;
  frozenInr: number;
  netReleaseInr: number;
  violationCount: number;
  diffJson: Record<string, unknown>;
  snapshotHash: string;
  prevHash: string;
  chainHash: string;
  recordedAtUtc: string;
}

export interface ChainVerificationResult {
  valid: boolean;
  projectId: string;
  checkedEvents: number;
  headSeq: number;
  headHash: string;
  tamperedSeq: number | null;
  expectedHash: string | null;
  actualHash: string | null;
  reason: string;
}

export const GENESIS_PREV_HASH = "0".repeat(64);

/**
 * Deterministic canonical JSON serializer so Postgres JSONB key reordering
 * never causes false tamper alarms when recomputing SHA-256 chain hashes.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

export function computeLedgerChainHash(
  e: Omit<GovernorLedgerEvent, "chainHash">
): string {
  const canonical = stableStringify({
    projectId: e.projectId,
    seq: Number(e.seq),
    eventType: e.eventType,
    actor: e.actor,
    source: e.source,
    mode: e.mode,
    httpStatus: Number(e.httpStatus),
    frozenInr: Number(e.frozenInr),
    netReleaseInr: Number(e.netReleaseInr),
    violationCount: Number(e.violationCount),
    diffJson: e.diffJson,
    snapshotHash: e.snapshotHash,
    prevHash: e.prevHash,
    recordedAtUtc: e.recordedAtUtc,
  });

  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export function verifyEventChain(
  projectId: string,
  events: GovernorLedgerEvent[]
): ChainVerificationResult {
  if (events.length === 0) {
    return {
      valid: true,
      projectId,
      checkedEvents: 0,
      headSeq: 0,
      headHash: GENESIS_PREV_HASH,
      tamperedSeq: null,
      expectedHash: null,
      actualHash: null,
      reason: "Ledger empty (awaiting genesis block).",
    };
  }

  const ordered = [...events].sort((a, b) => a.seq - b.seq);
  let expectedPrev = GENESIS_PREV_HASH;
  let expectedSeq = 1;

  for (const ev of ordered) {
    if (ev.seq !== expectedSeq) {
      return {
        valid: false,
        projectId,
        checkedEvents: expectedSeq - 1,
        headSeq: ordered[ordered.length - 1].seq,
        headHash: ordered[ordered.length - 1].chainHash,
        tamperedSeq: ev.seq,
        expectedHash: expectedPrev,
        actualHash: ev.prevHash,
        reason: `Sequence gap or deletion detected: expected seq #${expectedSeq}, found seq #${ev.seq}.`,
      };
    }

    if (ev.prevHash !== expectedPrev) {
      return {
        valid: false,
        projectId,
        checkedEvents: expectedSeq - 1,
        headSeq: ordered[ordered.length - 1].seq,
        headHash: ordered[ordered.length - 1].chainHash,
        tamperedSeq: ev.seq,
        expectedHash: expectedPrev,
        actualHash: ev.prevHash,
        reason: `Broken chain link at seq #${ev.seq}: prevHash does not match seq #${ev.seq - 1}.`,
      };
    }

    const recomputed = computeLedgerChainHash({
      projectId: ev.projectId,
      seq: ev.seq,
      eventType: ev.eventType,
      actor: ev.actor,
      source: ev.source,
      mode: ev.mode,
      httpStatus: ev.httpStatus,
      frozenInr: ev.frozenInr,
      netReleaseInr: ev.netReleaseInr,
      violationCount: ev.violationCount,
      diffJson: ev.diffJson,
      snapshotHash: ev.snapshotHash,
      prevHash: ev.prevHash,
      recordedAtUtc: ev.recordedAtUtc,
    });

    if (recomputed !== ev.chainHash) {
      return {
        valid: false,
        projectId,
        checkedEvents: expectedSeq - 1,
        headSeq: ordered[ordered.length - 1].seq,
        headHash: ordered[ordered.length - 1].chainHash,
        tamperedSeq: ev.seq,
        expectedHash: recomputed,
        actualHash: ev.chainHash,
        reason: `TAMPER DETECTED at seq #${ev.seq}: payload digest mismatch against sealed BSA Sec 63 chain_hash.`,
      };
    }

    expectedPrev = ev.chainHash;
    expectedSeq++;
  }

  const head = ordered[ordered.length - 1];
  return {
    valid: true,
    projectId,
    checkedEvents: ordered.length,
    headSeq: head.seq,
    headHash: head.chainHash,
    tamperedSeq: null,
    expectedHash: null,
    actualHash: null,
    reason: `All ${ordered.length} sequential events verified cryptographically intact (zero bytes altered).`,
  };
}

const g = globalThis as typeof globalThis & {
  __quadillarEventLedger?: Map<string, GovernorLedgerEvent[]>;
};
const memLedger = (g.__quadillarEventLedger ??= new Map());

function rowToEvent(row: Record<string, unknown>): GovernorLedgerEvent {
  return {
    projectId: String(row.project_id),
    seq: Number(row.seq),
    eventType: String(row.event_type) as LedgerEventType,
    actor: String(row.actor || "system"),
    source: String(row.source || "api"),
    mode: String(row.mode || "custom"),
    httpStatus: Number(row.http_status),
    frozenInr: Number(row.frozen_inr),
    netReleaseInr: Number(row.net_release_inr),
    violationCount: Number(row.violation_count),
    diffJson: (row.diff_json as Record<string, unknown>) || {},
    snapshotHash: String(row.snapshot_hash),
    prevHash: String(row.prev_hash),
    chainHash: String(row.chain_hash),
    recordedAtUtc: String(row.recorded_at_utc),
  };
}

function buildGenesisEvent(projectId: string): GovernorLedgerEvent {
  const snap = evaluateMolecularGovernor(EXTREME_TG03_FIXTURE);
  const base: Omit<GovernorLedgerEvent, "chainHash"> = {
    projectId,
    seq: 1,
    eventType: "GENESIS",
    actor: "molecular-governor-kernel",
    source: "bootstrap",
    mode: "stress-test",
    httpStatus: snap.escrow.httpStatus,
    frozenInr: snap.escrow.frozenInr,
    netReleaseInr: snap.escrow.netCertifiedReleaseInr,
    violationCount: snap.violations.length,
    diffJson: {
      zoneId: EXTREME_TG03_FIXTURE.zoneId,
      raBillNo: EXTREME_TG03_FIXTURE.raBillNo,
      note: "Genesis evidentiary anchor sealed under BSA Section 63",
    },
    snapshotHash: snap.bsaSec63Ledger.rowHash,
    prevHash: GENESIS_PREV_HASH,
    recordedAtUtc: EXTREME_TG03_FIXTURE.recordedAtUtc,
  };
  return { ...base, chainHash: computeLedgerChainHash(base) };
}

export async function listGovernorEvents(
  projectId = EXTREME_TG03_FIXTURE.projectId,
  limit = 50
): Promise<{ storageMode: StorageMode; events: GovernorLedgerEvent[] }> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("governor_events")
        .select("*")
        .eq("project_id", projectId)
        .order("seq", { ascending: true })
        .limit(limit);

      if (!error) {
        const rows = (data || []).map((r) => rowToEvent(r as Record<string, unknown>));
        if (rows.length === 0) {
          const genesis = buildGenesisEvent(projectId);
          await supabase.from("governor_events").insert({
            project_id: genesis.projectId,
            seq: genesis.seq,
            event_type: genesis.eventType,
            actor: genesis.actor,
            source: genesis.source,
            mode: genesis.mode,
            http_status: genesis.httpStatus,
            frozen_inr: genesis.frozenInr,
            net_release_inr: genesis.netReleaseInr,
            violation_count: genesis.violationCount,
            diff_json: genesis.diffJson,
            snapshot_hash: genesis.snapshotHash,
            prev_hash: genesis.prevHash,
            chain_hash: genesis.chainHash,
            recorded_at_utc: genesis.recordedAtUtc,
          });
          return { storageMode: "supabase", events: [genesis] };
        }
        return { storageMode: "supabase", events: rows };
      }
    } catch {
      // Fall through cleanly to memory ledger
    }
  }

  let list = memLedger.get(projectId);
  if (!list || list.length === 0) {
    list = [buildGenesisEvent(projectId)];
    memLedger.set(projectId, list);
  }
  return { storageMode: "edge_fallback", events: list.slice(-limit) };
}

export async function appendGovernorEvent(params: {
  projectId: string;
  eventType: LedgerEventType;
  actor?: string;
  source?: string;
  mode: string;
  httpStatus: number;
  frozenInr: number;
  netReleaseInr: number;
  violationCount: number;
  diffJson: Record<string, unknown>;
  snapshotHash: string;
  recordedAtUtc?: string;
}): Promise<{ storageMode: StorageMode; event: GovernorLedgerEvent }> {
  const { storageMode: currentMode, events } = await listGovernorEvents(params.projectId, 200);
  const last = events[events.length - 1];
  const nextSeq = last ? last.seq + 1 : 1;
  const prevHash = last ? last.chainHash : GENESIS_PREV_HASH;

  const base: Omit<GovernorLedgerEvent, "chainHash"> = {
    projectId: params.projectId,
    seq: nextSeq,
    eventType: params.eventType,
    actor: params.actor || "operator",
    source: params.source || "governor-api",
    mode: params.mode,
    httpStatus: params.httpStatus,
    frozenInr: params.frozenInr,
    netReleaseInr: params.netReleaseInr,
    violationCount: params.violationCount,
    diffJson: params.diffJson,
    snapshotHash: params.snapshotHash,
    prevHash,
    recordedAtUtc: params.recordedAtUtc || new Date().toISOString(),
  };

  const event: GovernorLedgerEvent = {
    ...base,
    chainHash: computeLedgerChainHash(base),
  };

  // Always update in-memory mirror
  const existing = memLedger.get(params.projectId) || events;
  memLedger.set(params.projectId, [...existing, event]);

  const supabase = getSupabaseAdmin();
  if (supabase && currentMode === "supabase") {
    try {
      const { error } = await supabase.from("governor_events").insert({
        project_id: event.projectId,
        seq: event.seq,
        event_type: event.eventType,
        actor: event.actor,
        source: event.source,
        mode: event.mode,
        http_status: event.httpStatus,
        frozen_inr: event.frozenInr,
        net_release_inr: event.netReleaseInr,
        violation_count: event.violationCount,
        diff_json: event.diffJson,
        snapshot_hash: event.snapshotHash,
        prev_hash: event.prevHash,
        chain_hash: event.chainHash,
        recorded_at_utc: event.recordedAtUtc,
      });
      if (!error) {
        return { storageMode: "supabase", event };
      }
    } catch {
      // Fall through to edge_fallback
    }
  }

  return { storageMode: "edge_fallback", event };
}

export async function getAndVerifyProjectChain(
  projectId = EXTREME_TG03_FIXTURE.projectId,
  simulateTamper = false
): Promise<{
  storageMode: StorageMode;
  simulatedTamperDemo: boolean;
  verification: ChainVerificationResult;
}> {
  const { storageMode, events } = await listGovernorEvents(projectId, 200);
  const working = events.map((e) => ({ ...e, diffJson: { ...e.diffJson } }));

  if (simulateTamper && working.length > 0) {
    // Read-only in-memory simulation: mutate ₹1 in the latest event without touching DB
    const targetIdx = working.length - 1;
    working[targetIdx].frozenInr = Number(working[targetIdx].frozenInr) + 1;
  }

  return {
    storageMode,
    simulatedTamperDemo: simulateTamper,
    verification: verifyEventChain(projectId, working),
  };
}
