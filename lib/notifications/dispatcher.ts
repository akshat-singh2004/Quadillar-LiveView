import {
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_STORAGE_KEY,
  fireDesktopDevicePopup,
  type NotificationPreferences,
  type NotificationTriggers,
} from "@/lib/notifications/preferences";

export type AlertSeverity = "CRITICAL" | "HIGH" | "OPS";

export interface GovernanceAlertEvent {
  id: string;
  trigger: keyof NotificationTriggers;
  severity: AlertSeverity;
  title: string;
  body: string;
  url: string;
}

export interface DispatchDecision {
  allowed: boolean;
  reason: string;
  channels: {
    devicePush: boolean;
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
}

export function parseHHMM(hhmm: string): number {
  const [hStr, mStr] = (hhmm || "00:00").split(":");
  const h = Math.max(0, Math.min(23, Number(hStr) || 0));
  const m = Math.max(0, Math.min(59, Number(mStr) || 0));
  return h * 60 + m;
}

export function getIstMinutes(date = new Date()): number {
  const utcMins = date.getUTCHours() * 60 + date.getUTCMinutes();
  return (utcMins + 330) % 1440;
}

export function isWithinQuietHours(nowMins: number, startHHMM: string, endHHMM: string): boolean {
  const start = parseHHMM(startHHMM);
  const end = parseHHMM(endHHMM);
  if (start === end) return false;
  if (start < end) return nowMins >= start && nowMins < end;
  // Overnight wrap (e.g. 22:00 -> 07:00)
  return nowMins >= start || nowMins < end;
}

export function evaluateAlertPolicy(
  prefs: NotificationPreferences,
  event: GovernanceAlertEvent,
  nowIstMins = getIstMinutes()
): DispatchDecision {
  const empty = { devicePush: false, email: false, sms: false, whatsapp: false };

  if (!prefs.triggers[event.trigger]) {
    return { allowed: false, reason: "trigger_disabled", channels: empty };
  }

  if (prefs.minSeverity === "CRITICAL_ONLY" && event.severity !== "CRITICAL") {
    return { allowed: false, reason: "below_severity_floor", channels: empty };
  }
  if (prefs.minSeverity === "HIGH_AND_CRITICAL" && event.severity === "OPS") {
    return { allowed: false, reason: "below_severity_floor", channels: empty };
  }

  if (prefs.quietHoursEnabled && isWithinQuietHours(nowIstMins, prefs.quietStart, prefs.quietEnd)) {
    const canBypass = event.severity === "CRITICAL" && prefs.bypassQuietForCritical;
    if (!canBypass) {
      return { allowed: false, reason: "suppressed_by_ist_quiet_hours", channels: empty };
    }
  }

  const channels = {
    devicePush: Boolean(prefs.devicePushEnabled),
    email: Boolean(prefs.emailEnabled && prefs.emailAddress?.trim().includes("@")),
    sms: Boolean(prefs.smsEnabled && prefs.smsPhone.replace(/[^\d]/g, "").length >= 10),
    whatsapp: Boolean(prefs.whatsappEnabled && prefs.whatsappPhone.replace(/[^\d]/g, "").length >= 10),
  };

  const anyActive = channels.devicePush || channels.email || channels.sms || channels.whatsapp;
  return {
    allowed: anyActive,
    reason: anyActive ? "ok" : "no_channels_enabled",
    channels,
  };
}

export function readSavedNotificationPrefs(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFS;
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...parsed,
      triggers: { ...DEFAULT_NOTIFICATION_PREFS.triggers, ...(parsed.triggers || {}) },
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

const cooldownMap = new Map<string, number>();
const COOLDOWN_MS = 10_000;

export async function dispatchGovernanceAlert(
  event: GovernanceAlertEvent
): Promise<{ dispatched: boolean; reason: string; firedChannels: string[] }> {
  const now = Date.now();
  const prev = cooldownMap.get(event.id) ?? 0;
  if (now - prev < COOLDOWN_MS) {
    return { dispatched: false, reason: "cooldown_active", firedChannels: [] };
  }

  const prefs = readSavedNotificationPrefs();
  const decision = evaluateAlertPolicy(prefs, event);
  if (!decision.allowed) {
    return { dispatched: false, reason: decision.reason, firedChannels: [] };
  }

  cooldownMap.set(event.id, now);
  const firedChannels: string[] = [];

  if (decision.channels.devicePush) {
    const res = await fireDesktopDevicePopup({
      title: event.title,
      body: event.body,
      url: event.url,
      tag: `quadillar-${event.id}`,
    });
    if (res.ok) firedChannels.push(`pc-popup(${res.via})`);
  }

  const remoteTargets: Array<["email" | "sms" | "whatsapp", string]> = [];
  if (decision.channels.email) remoteTargets.push(["email", prefs.emailAddress]);
  if (decision.channels.sms) remoteTargets.push(["sms", prefs.smsPhone]);
  if (decision.channels.whatsapp) remoteTargets.push(["whatsapp", prefs.whatsappPhone]);

  if (remoteTargets.length > 0 && typeof navigator !== "undefined" && navigator.onLine) {
    await Promise.allSettled(
      remoteTargets.map(async ([channel, target]) => {
        const r = await fetch("/api/notifications/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel,
            target,
            subject: `[Quadillar LiveView] ${event.title}`,
            message: `${event.title} — ${event.body}`,
          }),
        });
        if (r.ok) firedChannels.push(channel);
      })
    );
  }

  return { dispatched: firedChannels.length > 0, reason: "dispatched", firedChannels };
}
