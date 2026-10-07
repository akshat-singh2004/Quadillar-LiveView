import { createClient } from "@supabase/supabase-js";
import { HermesAgent } from "./hermes";

export type CouncilEventType =
  | "STRUCTURAL_NCR_ISSUED"
  | "WEATHER_CUTOFF_TRIGGERED"
  | "GHOST_WORKERS_DETECTED"
  | "ASSET_GROUNDED_SAFETY_HOLD"
  | "CRITICAL_PATH_SLIPPAGE";

export interface CouncilEventPayload {
  projectId: string;
  eventType: CouncilEventType;
  sourceAgent: string;
  targetAgent: string;
  payload: Record<string, any>;
  actionTaken: string;
  [key: string]: unknown;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Council Synapse.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export class CouncilSynapse {
  /**
   * Broadcasts an inter-agent reactive directive across governors
   */
  static async dispatch(event: CouncilEventPayload): Promise<void> {
    try {
      const supabase = getSupabase();

      // 1. Log event into reactive message bus
      await supabase.from("council_interagent_events").insert({
        project_id: event.projectId,
        event_type: event.eventType,
        source_agent: event.sourceAgent,
        target_agent: event.targetAgent,
        payload: event.payload,
        action_taken: event.actionTaken,
        acknowledged: true,
      });

      // 2. Cryptographically seal inter-agent communication via Hermes
      await HermesAgent.notarizeTransaction({
        projectId: event.projectId,
        actionTitle: `Council Synapse: ${event.sourceAgent} -> ${event.targetAgent} [${event.eventType}]`,
        actionCategory: "COUNCIL_A2A_COMMUNICATION",
        moduleRef: event.eventType,
        details: event as unknown as Record<string, unknown>,
        signatoryName: `Autonomous Council Synapse (${event.sourceAgent})`,
        signatoryRole: "AI Inter-Agent Event Broker",
        severity: "info",
      });
    } catch (err: any) {
      console.warn("[Council Synapse Notice]: Failed to dispatch reactive event:", err.message);
    }
  }
}
