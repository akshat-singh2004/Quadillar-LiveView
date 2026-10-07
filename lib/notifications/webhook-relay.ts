import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export interface WebhookAlertPayload {
  projectId: string;
  eventType: "CRITICAL_INTERLOCK_TRIPPED" | "QUALITY_HOLD_ENGAGED" | "CURE_NOTICE_SERVED" | string;
  governorCode: string;
  title: string;
  summary: string;
  statutoryStandard: string;
  severity: "critical" | "warning" | "info";
  actionUrl: string;
  merkleSealHash?: string;
  metadata?: Record<string, any>;
}

export interface WebhookDeliveryResult {
  subscriptionId: string;
  channelName: string;
  channelType: string;
  endpointUrl: string;
  httpStatus: number;
  deliveryStatus: "DELIVERED" | "FAILED" | "SIMULATED";
  latencyMs: number;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-service-key";
  return createClient(url, key, { auth: { persistSession: false } });
}

export class ExternalWebhookRelay {
  /**
   * Broadcast an urgent alert payload to all subscribed channels
   */
  static async broadcastAlert(alert: WebhookAlertPayload): Promise<WebhookDeliveryResult[]> {
    const supabase = getSupabase();
    const results: WebhookDeliveryResult[] = [];

    try {
      // 1. Fetch active subscriptions for the project
      const { data: subs, error } = await supabase
        .from("external_webhook_subscriptions")
        .select("*")
        .eq("project_id", alert.projectId)
        .eq("is_active", true);

      if (error || !subs || subs.length === 0) {
        return [];
      }

      const timestamp = new Date().toISOString();

      // 2. Format standard JSON webhook payload
      const standardPayload = {
        event: alert.eventType,
        governor: alert.governorCode,
        standard: alert.statutoryStandard,
        severity: alert.severity,
        title: alert.title,
        summary: alert.summary,
        actionUrl: alert.actionUrl,
        merkleSealHash: alert.merkleSealHash || "HERMES-SEC65B-PENDING",
        projectId: alert.projectId,
        timestamp,
        metadata: alert.metadata || {},
      };

      const payloadString = JSON.stringify(standardPayload);

      // 3. Dispatch in parallel to all endpoints
      const deliveryPromises = subs.map(async (sub) => {
        const startTime = Date.now();
        let httpStatus = 200;
        let deliveryStatus: "DELIVERED" | "FAILED" | "SIMULATED" = "DELIVERED";

        // Generate HMAC-SHA256 signature header for payload verification
        const signature = crypto
          .createHmac("sha256", sub.secret_token)
          .update(payloadString)
          .digest("hex");

        // If endpoint is a placeholder or simulation URL
        if (
          sub.endpoint_url.includes("example.com") ||
          sub.endpoint_url.includes("placeholder") ||
          sub.endpoint_url.includes("localhost")
        ) {
          deliveryStatus = "SIMULATED";
          httpStatus = 200;
        } else {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);

            const res = await fetch(sub.endpoint_url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-LiveView-Signature": `sha256=${signature}`,
                "X-LiveView-Event": alert.eventType,
                "X-LiveView-Timestamp": timestamp,
                "User-Agent": "Quadillar-LiveView-Webhook-Relay/2.4",
              },
              body: payloadString,
              signal: controller.signal,
            });

            clearTimeout(timeout);
            httpStatus = res.status;
            if (!res.ok) deliveryStatus = "FAILED";
          } catch (e) {
            httpStatus = 500;
            deliveryStatus = "FAILED";
          }
        }

        const latencyMs = Date.now() - startTime;

        // Log delivery audit to database
        await supabase.from("webhook_dispatch_logs").insert({
          project_id: alert.projectId,
          subscription_id: sub.id,
          event_type: alert.eventType,
          governor_code: alert.governorCode,
          payload_snapshot: standardPayload,
          http_status: httpStatus,
          delivery_status: deliveryStatus,
          latency_ms: latencyMs,
          created_at: timestamp,
        });

        return {
          subscriptionId: sub.id,
          channelName: sub.channel_name,
          channelType: sub.channel_type,
          endpointUrl: sub.endpoint_url,
          httpStatus,
          deliveryStatus,
          latencyMs,
        };
      });

      return await Promise.all(deliveryPromises);
    } catch (err: any) {
      console.error("[ExternalWebhookRelay error]:", err.message);
      return [];
    }
  }
}
