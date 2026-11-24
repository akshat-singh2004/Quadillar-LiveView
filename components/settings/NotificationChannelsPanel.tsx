"use client";

import React, { useEffect, useState } from "react";
import {
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_STORAGE_KEY,
  fireDesktopDevicePopup,
  type AlertSeverityFloor,
  type NotificationPreferences,
  type NotificationTriggers,
} from "@/lib/notifications/preferences";

const TRIGGER_META: Array<{ key: keyof NotificationTriggers; title: string; desc: string; tag: string }> = [
  {
    key: "escrowHold422",
    title: "HTTP 422 Escrow Payment Holds",
    desc: "Instant alert when a BOQ tranche freezes on RA Bills",
    tag: "CRITICAL",
  },
  {
    key: "concreteMaturityLock",
    title: "IS 456 Concrete / Maturity / Thermal Lock",
    desc: "Fires on cube failure, core >70°C, or premature stripping attempt",
    tag: "CRITICAL",
  },
  {
    key: "craneWindLockout",
    title: "IS 875 Crane Wind Lockout & EOT",
    desc: "Fires when gust drops crane FoS below 1.50 and logs EOT stoppage",
    tag: "HIGH",
  },
  {
    key: "weighbridgeShortage",
    title: "CPWD Clause 42 Gate Shortage",
    desc: "Fires when weighbridge variance exceeds ±3% and triggers 2x penalty",
    tag: "HIGH",
  },
  {
    key: "offlineSyncAndDup409",
    title: "Field Evidence Sync & HTTP 409 Duplicate",
    desc: "Notifies when offline captures flush or a duplicate photo hash is blocked",
    tag: "OPS",
  },
  {
    key: "dailyDprDigest",
    title: "Daily Site Progress Digest (DPR)",
    desc: "Single evening summary of Green-verified EVM, labor, and active holds",
    tag: "DIGEST",
  },
];

export function NotificationChannelsPanel() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS);
  const [browserPerm, setBrowserPerm] = useState<string>("checking");
  const [saving, setSaving] = useState(false);
  const [storageBadge, setStorageBadge] = useState<string>("local");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("Notification" in window) setBrowserPerm(Notification.permission);
      else setBrowserPerm("unsupported");

      try {
        const cached = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as Partial<NotificationPreferences>;
          setPrefs((prev) => ({
            ...prev,
            ...parsed,
            triggers: { ...prev.triggers, ...(parsed.triggers || {}) },
          }));
        }
      } catch {
        // Ignore storage errors
      }
    }

    fetch("/api/settings/notifications?userKey=default-operator")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.preferences) {
          setPrefs(data.preferences as NotificationPreferences);
          setStorageBadge(data.storageMode || "edge_fallback");
          try {
            localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(data.preferences));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const updatePrefs = (patch: Partial<NotificationPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch, updatedAtUtc: new Date().toISOString() };
      try {
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleTrigger = (key: keyof NotificationTriggers) => {
    updatePrefs({
      triggers: { ...prefs.triggers, [key]: !prefs.triggers[key] },
    });
  };

  const saveAll = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(prefs));
      const res = await fetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (res.ok && data.preferences) {
        setPrefs(data.preferences);
        setStorageBadge(data.storageMode || "saved");
        setFeedback(`Notification settings saved (${data.storageMode}).`);
      } else {
        setFeedback(data.error || "Saved locally — cloud sync deferred.");
      }
    } catch {
      setFeedback("Offline — settings saved locally and ready when online.");
    } finally {
      setSaving(false);
    }
  };

  const handleEnableDevicePush = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setFeedback("Desktop notifications are unsupported in this browser.");
      return;
    }
    const perm = await Notification.requestPermission();
    setBrowserPerm(perm);
    if (perm === "granted") {
      updatePrefs({ devicePushEnabled: true });
      const res = await fireDesktopDevicePopup({
        title: "Quadillar LiveView — PC Alerts Enabled",
        body: "Critical HTTP 422 holds, concrete maturity locks, and crane wind stoppages will pop up here.",
        url: "/finance/ra-bills",
      });
      setFeedback(
        res.ok
          ? `Live PC/Device popup fired via ${res.via}.`
          : res.reason || "Permission granted."
      );
    } else {
      updatePrefs({ devicePushEnabled: false });
      setFeedback("Browser blocked notification permission. Enable it in the address bar lock icon.");
    }
  };

  const handleTestDesktopPopup = async () => {
    setTestingChannel("device");
    const res = await fireDesktopDevicePopup({
      title: "HTTP 422 Hold • Transfer Girder TG-03",
      body: "₹62,00,000 frozen on RA-BILL-14 (IS 456 cube & thermal breach). Click to inspect.",
      url: "/finance/ra-bills",
      tag: `quadillar-test-${Date.now()}`,
    });
    setBrowserPerm(typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");
    setFeedback(res.ok ? `Desktop popup dispatched (${res.via}). Click it to test deep-link.` : res.reason || "Popup failed.");
    setTestingChannel(null);
  };

  const handleTestRemoteChannel = async (channel: "sms" | "whatsapp" | "email", target: string) => {
    if (!target.trim() || target.trim() === "+91") {
      setFeedback(`Enter a valid destination for ${channel.toUpperCase()} before testing.`);
      return;
    }
    setTestingChannel(channel);
    setFeedback(null);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, target }),
      });
      const data = await res.json();
      setFeedback(data.detail || data.error || "Test completed.");
    } catch {
      setFeedback("Offline — remote channel test requires network access.");
    } finally {
      setTestingChannel(null);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 text-zinc-100 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-sky-500/20 border border-sky-500/30 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-sky-300">
              NOTIFICATION DISPATCH ROUTER
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              SMS • WHATSAPP (FUTURE-READY) • EMAIL • PC POPUPS ({storageBadge.toUpperCase()})
            </span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-white">Alert Channels & Device Notifications</h2>
          <p className="text-xs text-zinc-400">
            Choose where Molecular Governor holds, site safety lockouts, and daily updates reach you.
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={saveAll}
          className="min-h-[44px] shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 text-xs font-bold text-white"
        >
          {saving ? "Saving…" : "Save Notification Settings"}
        </button>
      </div>

      {/* 4 Channel Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. PC & Device Popups */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">PC & Device Popups</h3>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                    browserPerm === "granted"
                      ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                      : browserPerm === "denied"
                      ? "bg-red-600/20 text-red-300 border border-red-500/30"
                      : "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {browserPerm}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">
                Native Windows, macOS & mobile browser banner popups with 1-click jump to blocked bills.
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={prefs.devicePushEnabled}
                onChange={(e) => {
                  if (e.target.checked && browserPerm !== "granted") {
                    handleEnableDevicePush();
                  } else {
                    updatePrefs({ devicePushEnabled: e.target.checked });
                  }
                }}
                className="h-5 w-5 accent-emerald-500 rounded"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleEnableDevicePush}
              className="min-h-[40px] rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3 text-xs font-semibold text-white"
            >
              {browserPerm === "granted" ? "Re-Verify Permission" : "Enable PC Popups"}
            </button>
            <button
              type="button"
              disabled={testingChannel === "device"}
              onClick={handleTestDesktopPopup}
              className="min-h-[40px] rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-3 text-xs font-bold text-white"
            >
              {testingChannel === "device" ? "Firing…" : "Fire Live PC Popup"}
            </button>
          </div>
        </div>

        {/* 2. Email Alerts */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Email Notifications</h3>
                <span className="rounded bg-emerald-600/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                  RESEND READY
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">
                Audit manifests, RA Bill HTTP 422 holds, and daily DPR digests sent to your inbox.
              </p>
            </div>
            <input
              type="checkbox"
              checked={prefs.emailEnabled}
              onChange={(e) => updatePrefs({ emailEnabled: e.target.checked })}
              className="h-5 w-5 accent-emerald-500 rounded shrink-0"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={prefs.emailAddress}
              onChange={(e) => updatePrefs({ emailAddress: e.target.value })}
              placeholder="director@company.com"
              className="flex-1 min-h-[42px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs font-mono text-white placeholder:text-zinc-500"
            />
            <button
              type="button"
              disabled={testingChannel === "email"}
              onClick={() => handleTestRemoteChannel("email", prefs.emailAddress)}
              className="min-h-[42px] shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3 text-xs font-semibold text-white"
            >
              {testingChannel === "email" ? "Sending…" : "Test Mail"}
            </button>
          </div>
        </div>

        {/* 3. Mobile Messages (SMS) */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Mobile Messages (SMS)</h3>
                <span className="rounded bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                  LOW-SIGNAL / DLT
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">
                Works over 2G cellular when mobile data is dead on site. Best for critical holds.
              </p>
            </div>
            <input
              type="checkbox"
              checked={prefs.smsEnabled}
              onChange={(e) => updatePrefs({ smsEnabled: e.target.checked })}
              className="h-5 w-5 accent-emerald-500 rounded shrink-0"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="tel"
              value={prefs.smsPhone}
              onChange={(e) => updatePrefs({ smsPhone: e.target.value })}
              placeholder="+91 98XXXXXXXX"
              className="flex-1 min-h-[42px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs font-mono text-white placeholder:text-zinc-500"
            />
            <button
              type="button"
              disabled={testingChannel === "sms"}
              onClick={() => handleTestRemoteChannel("sms", prefs.smsPhone)}
              className="min-h-[42px] shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3 text-xs font-semibold text-white"
            >
              {testingChannel === "sms" ? "Testing…" : "Test SMS"}
            </button>
          </div>
        </div>

        {/* 4. WhatsApp Bot Updates (Future Setup Ready) */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">WhatsApp Updates</h3>
                <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                  WHATSAPP BOT READY
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">
                Pre-enroll your WhatsApp number for automated site alerts & Hinglish update threads via Meta Cloud API.
              </p>
            </div>
            <input
              type="checkbox"
              checked={prefs.whatsappEnabled}
              onChange={(e) => updatePrefs({ whatsappEnabled: e.target.checked })}
              className="h-5 w-5 accent-emerald-500 rounded shrink-0"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="tel"
              value={prefs.whatsappPhone}
              onChange={(e) => updatePrefs({ whatsappPhone: e.target.value })}
              placeholder="+91 98XXXXXXXX (WhatsApp)"
              className="flex-1 min-h-[42px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs font-mono text-white placeholder:text-zinc-500"
            />
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => updatePrefs({ whatsappPhone: prefs.smsPhone })}
                className="min-h-[42px] rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 px-2.5 text-[11px] font-mono text-zinc-300"
              >
                Same as SMS
              </button>
              <button
                type="button"
                disabled={testingChannel === "whatsapp"}
                onClick={() => handleTestRemoteChannel("whatsapp", prefs.whatsappPhone)}
                className="min-h-[42px] rounded-lg border border-emerald-500/40 bg-emerald-950/60 hover:bg-emerald-900/60 px-3 text-xs font-semibold text-emerald-200"
              >
                {testingChannel === "whatsapp" ? "Testing…" : "Preview Bot"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Event Triggers Matrix */}
      <div className="space-y-2.5">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
          Subscribed Governance Triggers
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {TRIGGER_META.map((t) => (
            <label
              key={t.key}
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                prefs.triggers[t.key]
                  ? "border-zinc-700 bg-zinc-900/90"
                  : "border-zinc-800/80 bg-zinc-950 opacity-75"
              }`}
            >
              <input
                type="checkbox"
                checked={prefs.triggers[t.key]}
                onChange={() => toggleTrigger(t.key)}
                className="mt-0.5 h-4 w-4 accent-sky-500 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">{t.title}</span>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300">
                    {t.tag}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-400">{t.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Severity Floor & Quiet Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 text-xs">
        <div className="space-y-1.5">
          <div className="font-mono uppercase text-[11px] text-zinc-400">Minimum Alert Severity</div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["CRITICAL_ONLY", "Critical Only"],
                ["HIGH_AND_CRITICAL", "High + Critical"],
                ["ALL", "All Updates"],
              ] as Array<[AlertSeverityFloor, string]>
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => updatePrefs({ minSeverity: val })}
                className={`min-h-[36px] rounded-lg px-3 font-mono text-[11px] font-semibold ${
                  prefs.minSeverity === val
                    ? "bg-sky-600 text-white"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono uppercase text-[11px] text-zinc-400">Quiet Hours (IST)</span>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.quietHoursEnabled}
                onChange={(e) => updatePrefs({ quietHoursEnabled: e.target.checked })}
                className="h-4 w-4 accent-sky-500"
              />
              Enable
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono">
            <input
              type="time"
              disabled={!prefs.quietHoursEnabled}
              value={prefs.quietStart}
              onChange={(e) => updatePrefs({ quietStart: e.target.value })}
              className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-white disabled:opacity-40"
            />
            <span className="text-zinc-500">to</span>
            <input
              type="time"
              disabled={!prefs.quietHoursEnabled}
              value={prefs.quietEnd}
              onChange={(e) => updatePrefs({ quietEnd: e.target.value })}
              className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-white disabled:opacity-40"
            />
            <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.bypassQuietForCritical}
                onChange={(e) => updatePrefs({ bypassQuietForCritical: e.target.checked })}
                className="h-3.5 w-3.5 accent-red-500"
              />
              Always ring on Critical safety/422
            </label>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono text-emerald-300">
          {feedback}
        </div>
      )}
    </section>
  );
}
