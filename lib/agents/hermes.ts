import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface AuditRecordPayload {
  projectId: string;
  actionTitle: string;
  actionCategory: string;
  moduleRef: string;
  details: Record<string, unknown> | string;
  signatoryName: string;
  signatoryRole: string;
  severity: "info" | "warning" | "critical" | "verified" | "severe";
  ipFingerprint?: string;
}

export interface ChainedAuditBlock {
  id?: string;
  blockHash: string;
  sha256Hash: string;
  hash: string;
  previousHash: string;
  timestamp: string;
  payload: AuditRecordPayload;
}

const GUARANTEED_FALLBACK_PROJECT_ID = "GOMTI-NAGAR-PH1-FITOUT";
const DEFAULT_ACTIVE_PROJECT_ID = "UP-LDA-VANGUARD-CAMPUS";

const VERIFIED_PROJECT_IDS = new Set<string>([
  "GOMTI-NAGAR-PH1-FITOUT",
  "GOMTI-NAGAR-PH2-EXPANSION",
  "LUCKNOW-TECHPARK-PH1",
]);

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase credentials for Agent Hermes.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function ensureProjectRowExists(
  supabase: SupabaseClient,
  rawProjectId?: string | null
): Promise<string> {
  const trimmed = (rawProjectId || "").trim();
  const canonicalId =
    !trimmed || trimmed.toUpperCase() === "ALL_10"
      ? DEFAULT_ACTIVE_PROJECT_ID
      : trimmed;

  if (VERIFIED_PROJECT_IDS.has(canonicalId)) {
    return canonicalId;
  }

  // Fast path: check existing row
  const { data: existing } = await supabase
    .from("projects")
    .select("project_id")
    .eq("project_id", canonicalId)
    .maybeSingle();

  if (existing?.project_id) {
    VERIFIED_PROJECT_IDS.add(canonicalId);
    return canonicalId;
  }

  // Path 2: SECURITY DEFINER RPC (safe under anon key + RLS)
  const { error: rpcError } = await supabase.rpc("ensure_project_exists", {
    p_project_id: canonicalId,
    p_project_name: canonicalId,
    p_project_code: canonicalId.slice(0, 16),
    p_contract_value: 0,
  });

  if (!rpcError) {
    VERIFIED_PROJECT_IDS.add(canonicalId);
    return canonicalId;
  }

  // Path 3: Direct upsert fallback
  const { error: upsertError } = await supabase.from("projects").upsert(
    {
      project_id: canonicalId,
      project_name: canonicalId,
      project_code: canonicalId.slice(0, 16),
      contract_value: 0,
      committed_capital: 0,
      tier: "COMMERCIAL",
      active_stage: "EXECUTION",
      status: "ACTIVE",
      gcc_protocol: "CPWD Works Manual / FIDIC Red Book",
    },
    { onConflict: "project_id", ignoreDuplicates: true }
  );

  if (!upsertError) {
    VERIFIED_PROJECT_IDS.add(canonicalId);
    return canonicalId;
  }

  return GUARANTEED_FALLBACK_PROJECT_ID;
}

export class HermesAgent {
  static async notarizeTransaction(payload: AuditRecordPayload): Promise<{
    blockHash: string;
    sha256Hash: string;
    hash: string;
    id?: string;
  }> {
    const supabase = getSupabase();
    const timestamp = new Date().toISOString();
    const resolvedProjectId = await ensureProjectRowExists(
      supabase,
      payload.projectId
    );

    const { data: latest } = await supabase
      .from("immutable_audit_logs")
      .select("merkle_root_hash, id")
      .eq("project_id", resolvedProjectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousHash =
      latest?.merkle_root_hash ||
      "GENESIS_BLOCK_00000000000000000000000000000000";

    const detailsText =
      typeof payload.details === "string"
        ? payload.details
        : JSON.stringify(payload.details ?? {});

    const serialized = JSON.stringify({
      previousHash,
      timestamp,
      projectId: resolvedProjectId,
      actionTitle: payload.actionTitle,
      actionCategory: payload.actionCategory,
      moduleRef: payload.moduleRef,
      details: detailsText,
    });
    const blockHash = crypto.createHash("sha256").update(serialized).digest("hex");

    const row = {
      project_id: resolvedProjectId,
      action_title: payload.actionTitle || payload.actionCategory || "SYSTEM_EVENT",
      action_category: payload.actionCategory || "GOVERNANCE_EVENT",
      module_ref: payload.moduleRef || "LIVEVIEW-CORE",
      details: detailsText,
      signatory_name: payload.signatoryName || "Agent Hermes",
      signatory_role: payload.signatoryRole || "Autonomous Notarizer",
      ip_fingerprint: payload.ipFingerprint || "127.0.0.1",
      status: "SEALED",
      severity: payload.severity || "verified",
      merkle_root_hash: blockHash,
      previous_block_hash: previousHash,
      created_at: timestamp,
    };

    let { data, error } = await supabase
      .from("immutable_audit_logs")
      .insert(row)
      .select("id")
      .single();

    if (
      error &&
      (error.code === "23503" || error.message?.includes("project_id_fkey"))
    ) {
      VERIFIED_PROJECT_IDS.delete(resolvedProjectId);
      const retry = await supabase
        .from("immutable_audit_logs")
        .insert({
          ...row,
          project_id: GUARANTEED_FALLBACK_PROJECT_ID,
          details: JSON.stringify({
            requestedProjectId: payload.projectId,
            originalDetails: payload.details,
          }),
        })
        .select("id")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.warn(
        "[Hermes Notarization Notice]: Failed to commit block:",
        error.message
      );
    }

    return {
      blockHash,
      sha256Hash: blockHash,
      hash: blockHash,
      id: data?.id,
    };
  }
}
