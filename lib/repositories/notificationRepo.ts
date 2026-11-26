import { getSupabaseAdmin, type StorageMode } from "@/lib/server/supabaseAdmin";
import {
  DEFAULT_NOTIFICATION_PREFS,
  normalizeIndianPhone,
  type NotificationPreferences,
} from "@/lib/notifications/preferences";

const g = globalThis as typeof globalThis & {
  __quadillarNotifRepoCache?: Map<string, NotificationPreferences>;
};
const memCache = (g.__quadillarNotifRepoCache ??= new Map());

function rowToPrefs(row: Record<string, unknown>): NotificationPreferences {
  return {
    userKey: String(row.user_key || "default-operator"),
    smsEnabled: Boolean(row.sms_enabled),
    smsPhone: String(row.sms_phone || ""),
    whatsappEnabled: Boolean(row.whatsapp_enabled),
    whatsappPhone: String(row.whatsapp_phone || ""),
    emailEnabled: Boolean(row.email_enabled),
    emailAddress: String(row.email_address || ""),
    devicePushEnabled: Boolean(row.device_push_enabled),
    minSeverity: (row.min_severity as NotificationPreferences["minSeverity"]) || "HIGH_AND_CRITICAL",
    quietHoursEnabled: Boolean(row.quiet_hours_enabled),
    quietStart: String(row.quiet_start || "22:00"),
    quietEnd: String(row.quiet_end || "07:00"),
    bypassQuietForCritical: row.bypass_quiet_for_critical !== false,
    triggers: {
      ...DEFAULT_NOTIFICATION_PREFS.triggers,
      ...((row.triggers as Partial<NotificationPreferences["triggers"]>) || {}),
    },
    updatedAtUtc: String(row.updated_at || new Date().toISOString()),
  };
}

export async function getNotificationPrefs(userKey = "default-operator"): Promise<{
  storageMode: StorageMode;
  preferences: NotificationPreferences;
}> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_key", userKey)
        .maybeSingle();

      if (!error) {
        return {
          storageMode: "supabase",
          preferences: data ? rowToPrefs(data) : { ...DEFAULT_NOTIFICATION_PREFS, userKey },
        };
      }
    } catch {
      // Fall through to memory cache
    }
  }

  return {
    storageMode: "edge_fallback",
    preferences: memCache.get(userKey) || { ...DEFAULT_NOTIFICATION_PREFS, userKey },
  };
}

export async function saveNotificationPrefs(
  patch: Partial<NotificationPreferences>
): Promise<{ storageMode: StorageMode; preferences: NotificationPreferences }> {
  const userKey = (patch.userKey || "default-operator").trim().slice(0, 120);
  const merged: NotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...patch,
    userKey,
    smsPhone: normalizeIndianPhone(patch.smsPhone || ""),
    whatsappPhone: normalizeIndianPhone(patch.whatsappPhone || ""),
    emailAddress: (patch.emailAddress || "").trim(),
    triggers: {
      ...DEFAULT_NOTIFICATION_PREFS.triggers,
      ...(patch.triggers || {}),
    },
    updatedAtUtc: new Date().toISOString(),
  };

  memCache.set(userKey, merged);

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { error } = await supabase.from("notification_preferences").upsert(
        {
          user_key: merged.userKey,
          sms_enabled: merged.smsEnabled,
          sms_phone: merged.smsPhone,
          whatsapp_enabled: merged.whatsappEnabled,
          whatsapp_phone: merged.whatsappPhone,
          email_enabled: merged.emailEnabled,
          email_address: merged.emailAddress,
          device_push_enabled: merged.devicePushEnabled,
          min_severity: merged.minSeverity,
          quiet_hours_enabled: merged.quietHoursEnabled,
          quiet_start: merged.quietStart,
          quiet_end: merged.quietEnd,
          bypass_quiet_for_critical: merged.bypassQuietForCritical,
          triggers: merged.triggers,
          updated_at: merged.updatedAtUtc,
        },
        { onConflict: "user_key" }
      );

      if (!error) {
        return { storageMode: "supabase", preferences: merged };
      }
    } catch {
      // Fall through gracefully
    }
  }

  return { storageMode: "edge_fallback", preferences: merged };
}
