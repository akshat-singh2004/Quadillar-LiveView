import { NextResponse } from "next/server";
import { ExternalWebhookRelay, WebhookAlertPayload } from "@/lib/notifications/webhook-relay";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-service-key";
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "GOMTI-NAGAR-PH1-FITOUT";
    const supabase = getSupabase();

    const [subsRes, logsRes] = await Promise.all([
      supabase.from("external_webhook_subscriptions").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase.from("webhook_dispatch_logs").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(20),
    ]);

    return NextResponse.json({
      success: true,
      subscriptions: subsRes.data || [],
      recentLogs: logsRes.data || [],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload: WebhookAlertPayload = {
      projectId: body.projectId || "GOMTI-NAGAR-PH1-FITOUT",
      eventType: body.eventType || "CRITICAL_INTERLOCK_TRIPPED",
      governorCode: body.governorCode || "Argus",
      title: body.title || "Emergency Statutory Hold Dispatched",
      summary: body.summary || "Microclimate wind gust exceeded 38.0 km/h ceiling. Height work operations frozen.",
      statutoryStandard: body.statutoryStandard || "IS 13367 / BOCW Central R. 34",
      severity: body.severity || "critical",
      actionUrl: body.actionUrl || "/telemetry/live",
      merkleSealHash: body.merkleSealHash,
    };

    const results = await ExternalWebhookRelay.broadcastAlert(payload);

    return NextResponse.json({
      success: true,
      dispatchedCount: results.length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
