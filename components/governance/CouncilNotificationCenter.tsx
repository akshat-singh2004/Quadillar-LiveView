"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { interlockAudio } from "@/lib/audio/interlock-chime";
import { Volume2, VolumeX } from "lucide-react";
import {
  fetchCouncilNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  CouncilNotification,
} from "@/app/actions/notification-actions";
import {
  Bell,
  X,
  Bot,
  Radio,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCheck,
  Clock,
  ChevronRight,
  Loader2,
} from "lucide-react";

export function CouncilNotificationCenter({ projectId = "GOMTI-NAGAR-PH1-FITOUT" }: { projectId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"DIRECTIVES" | "TELEMETRY">("DIRECTIVES");
  const [directives, setDirectives] = useState<CouncilNotification[]>([]);
  const [telemetry, setTelemetry] = useState<CouncilNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loadNotifications = useCallback(async () => {
    try {
      const data = await fetchCouncilNotifications(projectId);
      setDirectives(data.governorDirectives);
      setTelemetry(data.siteTelemetry);
      setUnreadCount(data.unreadCount);
    } catch {
      // Graceful offline fallback
    }
  }, [projectId]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 12000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleNotificationClick = async (notif: CouncilNotification) => {
    if (!notif.is_read) {
      await markNotificationAsRead(notif.id);
      setDirectives((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
      setTelemetry((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setIsOpen(false);
    router.push(notif.action_url);
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    await markAllNotificationsAsRead(projectId);
    setDirectives((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setTelemetry((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    setLoading(false);
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "critical":
        return {
          badge: "bg-rose-950 border-rose-800 text-rose-300",
          icon: <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />,
        };
      case "warning":
        return {
          badge: "bg-amber-950 border-amber-800 text-amber-300",
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
        };
      case "nominal":
        return {
          badge: "bg-emerald-950 border-emerald-800 text-emerald-300",
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />,
        };
      default:
        return {
          badge: "bg-cyan-950 border-cyan-800 text-cyan-300",
          icon: <Info className="w-4 h-4 text-cyan-400 shrink-0" />,
        };
    }
  };

  const activeList = activeTab === "DIRECTIVES" ? directives : telemetry;

  return (
    <div className="font-mono text-xs select-none">
      {/* TRIGGER BUTTON WITH LIVE UNREAD BADGE */}
      <button
        type="button"
        onClick={() => {
          interlockAudio.playWarningPing();
          setIsOpen(true);
          loadNotifications();
        }}
        className="relative p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer flex items-center justify-center"
        title="Council Notifications & Alerts"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-bold text-[9px] animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* SLIDE-OVER DRAWER OVERLAY */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* DRAWER HEADER */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                    Statutory Event Stream
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-bold text-[9px]">
                      {unreadCount} Unread
                    </span>
                  )}
                </div>
                <h2 className="text-sm font-bold text-white uppercase mt-0.5">
                  Council Notification Center
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={loading}
                    className="p-1.5 text-zinc-400 hover:text-white text-[10px] uppercase flex items-center gap-1 cursor-pointer transition"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => interlockAudio.playCriticalAlarm()}
                  className="p-1.5 text-zinc-400 hover:text-rose-400 text-[10px] uppercase flex items-center gap-1 cursor-pointer transition"
                  title="Test Audible Interlock Siren"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* SEPARATE DUAL-WINDOW TABS */}
            <div className="grid grid-cols-2 border-b border-zinc-800 bg-zinc-900/40 text-center font-bold text-[10px] uppercase">
              <button
                type="button"
                onClick={() => setActiveTab("DIRECTIVES")}
                className={`py-2.5 flex items-center justify-center gap-1.5 transition cursor-pointer border-b-2 ${
                  activeTab === "DIRECTIVES"
                    ? "border-cyan-500 text-cyan-400 bg-zinc-900"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Governor Directives ({directives.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("TELEMETRY")}
                className={`py-2.5 flex items-center justify-center gap-1.5 transition cursor-pointer border-b-2 ${
                  activeTab === "TELEMETRY"
                    ? "border-amber-500 text-amber-400 bg-zinc-900"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Site Telemetry Feeds ({telemetry.length})</span>
              </button>
            </div>

            {/* NOTIFICATION CARDS LIST */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeList.length === 0 ? (
                <div className="p-12 text-center text-zinc-600 font-sans space-y-2">
                  <CheckCheck className="w-8 h-8 text-zinc-700 mx-auto" />
                  <p className="text-xs">No pending notifications in this channel.</p>
                  <p className="text-[10px] text-zinc-600">All systems operating within nominal baselines.</p>
                </div>
              ) : (
                activeList.map((item) => {
                  const style = getSeverityStyle(item.severity);
                  const timeAgo = new Date(item.created_at).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 ${
                        item.is_read
                          ? "bg-zinc-900/40 border-zinc-850 hover:bg-zinc-900 text-zinc-400"
                          : "bg-zinc-900 border-zinc-750 hover:border-zinc-600 text-zinc-200 shadow-lg"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {style.icon}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${style.badge}`}>
                                {item.governor_code}
                              </span>
                              {!item.is_read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              )}
                            </div>
                            <strong className="text-white text-xs uppercase block mt-0.5 leading-snug">
                              {item.title}
                            </strong>
                          </div>
                        </div>

                        <span className="text-[9px] text-zinc-500 font-mono flex items-center gap-1 shrink-0">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{timeAgo}</span>
                        </span>
                      </div>

                      <p className="text-[11px] font-sans text-zinc-300 leading-relaxed pl-6">
                        {item.summary}
                      </p>

                      {/* CONTEXTUAL ACTION DEEP LINK */}
                      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-cyan-400 font-bold pl-6">
                        <span className="text-zinc-500 font-mono text-[9px] truncate max-w-[200px]">
                          Target: {item.action_url}
                        </span>
                        <div className="flex items-center gap-1 hover:text-cyan-300">
                          <span>{item.action_label}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* DRAWER FOOTER */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex justify-between items-center text-[10px] text-zinc-500">
              <span>Section 65B Certified Events</span>
              <span className="text-cyan-400">Clicking an alert routes to the module</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
