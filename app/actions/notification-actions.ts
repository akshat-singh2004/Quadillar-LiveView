"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export interface CouncilNotification {
  id: string;
  project_id: string;
  channel: "GOVERNOR_DIRECTIVE" | "SITE_TELEMETRY";
  governor_code: string;
  title: string;
  summary: string;
  severity: "critical" | "warning" | "info" | "nominal";
  action_url: string;
  action_label: string;
  metadata?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface DispatchNotificationPayload {
  projectId?: string;
  channel: "GOVERNOR_DIRECTIVE" | "SITE_TELEMETRY";
  governorCode: string;
  title: string;
  summary: string;
  severity: "critical" | "warning" | "info" | "nominal";
  actionUrl: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-service-key";
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function fetchCouncilNotifications(projectId = "GOMTI-NAGAR-PH1-FITOUT"): Promise<{
  governorDirectives: CouncilNotification[];
  siteTelemetry: CouncilNotification[];
  unreadCount: number;
}> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("council_notifications")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) throw error;
    const items = (data || []) as CouncilNotification[];

    return {
      governorDirectives: items.filter((n) => n.channel === "GOVERNOR_DIRECTIVE"),
      siteTelemetry: items.filter((n) => n.channel === "SITE_TELEMETRY"),
      unreadCount: items.filter((n) => !n.is_read).length,
    };
  } catch (err: any) {
    console.error("[fetchCouncilNotifications notice]:", err.message);
    return { governorDirectives: [], siteTelemetry: [], unreadCount: 0 };
  }
}

export async function dispatchCouncilNotification(payload: DispatchNotificationPayload) {
  try {
    const supabase = getSupabase();
    const projectId = payload.projectId || "GOMTI-NAGAR-PH1-FITOUT";

    const { data, error } = await supabase
      .from("council_notifications")
      .insert({
        project_id: projectId,
        channel: payload.channel,
        governor_code: payload.governorCode,
        title: payload.title,
        summary: payload.summary,
        severity: payload.severity,
        action_url: payload.actionUrl,
        action_label: payload.actionLabel || "Inspect",
        metadata: payload.metadata || {},
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to dispatch notification." };
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    const supabase = getSupabase();
    await supabase.from("council_notifications").update({ is_read: true }).eq("id", id);
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function markAllNotificationsAsRead(projectId = "GOMTI-NAGAR-PH1-FITOUT") {
  try {
    const supabase = getSupabase();
    await supabase.from("council_notifications").update({ is_read: true }).eq("project_id", projectId);
    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
