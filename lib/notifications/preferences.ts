export type AlertSeverityFloor = "CRITICAL_ONLY" | "HIGH_AND_CRITICAL" | "ALL";

export interface NotificationTriggers {
  escrowHold422: boolean;
  concreteMaturityLock: boolean;
  craneWindLockout: boolean;
  weighbridgeShortage: boolean;
  offlineSyncAndDup409: boolean;
  dailyDprDigest: boolean;
}

export interface NotificationPreferences {
  userKey: string;
  smsEnabled: boolean;
  smsPhone: string;
  whatsappEnabled: boolean;
  whatsappPhone: string;
  emailEnabled: boolean;
  emailAddress: string;
  devicePushEnabled: boolean;
  minSeverity: AlertSeverityFloor;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  bypassQuietForCritical: boolean;
  triggers: NotificationTriggers;
  updatedAtUtc: string;
}

export const NOTIFICATION_STORAGE_KEY = "quadillar_notification_prefs_v1";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  userKey: "default-operator",
  smsEnabled: false,
  smsPhone: "+91 ",
  whatsappEnabled: false,
  whatsappPhone: "+91 ",
  emailEnabled: true,
  emailAddress: "",
  devicePushEnabled: false,
  minSeverity: "HIGH_AND_CRITICAL",
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00",
  bypassQuietForCritical: true,
  triggers: {
    escrowHold422: true,
    concreteMaturityLock: true,
    craneWindLockout: true,
    weighbridgeShortage: true,
    offlineSyncAndDup409: true,
    dailyDprDigest: false,
  },
  updatedAtUtc: new Date().toISOString(),
};

export function normalizeIndianPhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  return digits;
}

export async function fireDesktopDevicePopup(opts: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<{ ok: boolean; via?: "service-worker" | "window"; reason?: string }> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { ok: false, reason: "This browser does not support native desktop/device notifications." };
  }

  let perm = Notification.permission;
  if (perm === "default") {
    perm = await Notification.requestPermission();
  }
  if (perm !== "granted") {
    return { ok: false, reason: "Permission denied. Allow notifications in your browser site settings." };
  }

  const targetUrl = opts.url || "/finance/ra-bills";

  // Prefer Service Worker notification (works reliably across PC Chrome/Edge & installed Android PWA)
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(opts.title, {
          body: opts.body,
          tag: opts.tag || "quadillar-alert",
          data: { url: targetUrl },
        });
        return { ok: true, via: "service-worker" };
      }
    }
  } catch {
    // Fall back to direct window Notification API
  }

  const n = new Notification(opts.title, {
    body: opts.body,
    tag: opts.tag || "quadillar-alert",
  });
  n.onclick = () => {
    window.focus();
    window.location.href = targetUrl;
  };
  return { ok: true, via: "window" };
}
