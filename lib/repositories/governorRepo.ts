import { getSupabaseAdmin, type StorageMode } from "@/lib/server/supabaseAdmin";
import { appendGovernorEvent } from "@/lib/repositories/eventLedgerRepo";
import {
  EXTREME_TG03_FIXTURE,
  evaluateMolecularGovernor,
  type GovernorSnapshot,
  type MolecularInput,
} from "@/lib/engines/molecularGovernor";

export type GovernorMode = "stress-test" | "compliant" | "custom";

export interface GovernorStateRecord {
  storageMode: StorageMode;
  projectId: string;
  mode: GovernorMode;
  revision: number;
  updatedAtUtc: string;
  input: MolecularInput;
  snapshot: GovernorSnapshot;
}

const g = globalThis as typeof globalThis & {
  __quadillarGovRepoCache?: Map<string, Omit<GovernorStateRecord, "storageMode" | "snapshot">>;
};
const memCache = (g.__quadillarGovRepoCache ??= new Map());

export async function getGovernorState(projectId = EXTREME_TG03_FIXTURE.projectId): Promise<GovernorStateRecord> {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("governor_snapshots")
        .select("project_id, mode, revision, input_payload, updated_at")
        .eq("project_id", projectId)
        .maybeSingle();

      if (!error) {
        if (data?.input_payload) {
          const input = data.input_payload as MolecularInput;
          return {
            storageMode: "supabase",
            projectId,
            mode: (data.mode as GovernorMode) || "custom",
            revision: Number(data.revision || 0),
            updatedAtUtc: String(data.updated_at || new Date().toISOString()),
            input,
            snapshot: evaluateMolecularGovernor(input),
          };
        }
        return {
          storageMode: "supabase",
          projectId,
          mode: "stress-test",
          revision: 0,
          updatedAtUtc: EXTREME_TG03_FIXTURE.recordedAtUtc,
          input: EXTREME_TG03_FIXTURE,
          snapshot: evaluateMolecularGovernor(EXTREME_TG03_FIXTURE),
        };
      }
    } catch {
      // Fall through cleanly to memory fallback
    }
  }

  const cached = memCache.get(projectId);
  const activeInput = cached?.input ?? EXTREME_TG03_FIXTURE;
  return {
    storageMode: "edge_fallback",
    projectId,
    mode: cached?.mode ?? "stress-test",
    revision: cached?.revision ?? 0,
    updatedAtUtc: cached?.updatedAtUtc ?? activeInput.recordedAtUtc,
    input: activeInput,
    snapshot: evaluateMolecularGovernor(activeInput),
  };
}

export async function saveGovernorState(params: {
  projectId?: string;
  mode?: GovernorMode;
  revision?: number;
  input?: Partial<MolecularInput>;
}): Promise<GovernorStateRecord> {
  const mergedInput: MolecularInput = {
    ...EXTREME_TG03_FIXTURE,
    ...(params.input || {}),
    recordedAtUtc: params.input?.recordedAtUtc || new Date().toISOString(),
  };

  const projectId = params.projectId || mergedInput.projectId;
  const mode: GovernorMode = params.mode || "custom";
  const revision = typeof params.revision === "number" && params.revision > 0 ? params.revision : Date.now();
  const snapshot = evaluateMolecularGovernor(mergedInput);
  const updatedAtUtc = new Date().toISOString();

  memCache.set(projectId, { projectId, mode, revision, input: mergedInput, updatedAtUtc });

  try {
    await appendGovernorEvent({
      projectId,
      eventType: "STATE_MUTATION",
      actor: "governor-operator",
      source: "governorRepo.saveGovernorState",
      mode,
      httpStatus: snapshot.escrow.httpStatus,
      frozenInr: snapshot.escrow.frozenInr,
      netReleaseInr: snapshot.escrow.netCertifiedReleaseInr,
      violationCount: snapshot.violations.length,
      diffJson: {
        revision,
        zoneId: mergedInput.zoneId,
        windSpeedMs: mergedInput.windSpeedMs,
        violationCodes: snapshot.violations.map((v) => v.code),
      },
      snapshotHash: snapshot.bsaSec63Ledger.rowHash,
      recordedAtUtc: updatedAtUtc,
    });
  } catch {
    // Non-blocking audit mirror
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { error } = await supabase.from("governor_snapshots").upsert(
        {
          project_id: projectId,
          mode,
          revision,
          input_payload: mergedInput,
          row_hash: snapshot.bsaSec63Ledger.rowHash,
          http_status: snapshot.escrow.httpStatus,
          frozen_inr: snapshot.escrow.frozenInr,
          net_release_inr: snapshot.escrow.netCertifiedReleaseInr,
          violation_count: snapshot.violations.length,
          updated_at: updatedAtUtc,
        },
        { onConflict: "project_id" }
      );

      if (!error) {
        return {
          storageMode: "supabase",
          projectId,
          mode,
          revision,
          updatedAtUtc,
          input: mergedInput,
          snapshot,
        };
      }
    } catch {
      // Fall through gracefully
    }
  }

  return {
    storageMode: "edge_fallback",
    projectId,
    mode,
    revision,
    updatedAtUtc,
    input: mergedInput,
    snapshot,
  };
}
