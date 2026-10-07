import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export interface AuditRecordPayload {
  projectId: string;
  actionTitle: string;
  actionCategory: string;
  moduleRef: string;
  details: Record<string, unknown>;
  signatoryName: string;
  signatoryRole: string;
  severity: "info" | "warning" | "critical" | "verified";
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

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Agent Hermes.");
  return createClient(url, key, { auth: { persistSession: false } });
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

    const { data: latest } = await supabase
      .from("immutable_audit_logs")
      .select("merkle_root_hash, id")
      .eq("project_id", payload.projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousHash = latest?.merkle_root_hash || "GENESIS_BLOCK_00000000000000000000000000000000";
    const serialized = JSON.stringify({ previousHash, timestamp, payload });
    const blockHash = crypto.createHash("sha256").update(serialized).digest("hex");

    const { data, error } = await supabase
      .from("immutable_audit_logs")
      .insert({
        project_id: payload.projectId,
        action_title: payload.actionTitle,
        action_category: payload.actionCategory,
        module_ref: payload.moduleRef,
        details: payload.details,
        signatory_name: payload.signatoryName,
        signatory_role: payload.signatoryRole,
        severity: payload.severity,
        merkle_root_hash: blockHash,
        previous_block_hash: previousHash,
        created_at: timestamp,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[Hermes Notarization Notice]: Failed to commit block:", error.message);
    }

    return {
      blockHash,
      sha256Hash: blockHash,
      hash: blockHash,
      id: data?.id,
    };
  }
}
