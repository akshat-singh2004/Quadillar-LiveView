"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type NotificationType = "rfi" | "drawing" | "change-order";

export interface ProjectNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  targetId?: string;
  targetType?: string;
  assignee?: string;
  status?: string;
  actionLabel?: string;
  read?: boolean;
  action_url?: string;
}

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: ProjectNotification[];
  onOpenItem?: (item: { id?: string; type?: string }) => void;
}

export function NotificationDrawer({ open, onClose, notifications, onOpenItem }: NotificationDrawerProps) {
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    if (!notifications.length) return;
    const latest = notifications[notifications.length - 1];
    const typeMessage = latest.type === "rfi" ? "assigned to your role" : latest.type === "drawing" ? "published to GFC" : "requires budget approval";

    toast(typeMessage, {
      description: latest.message,
      action: {
        label: latest.actionLabel ?? "Review",
        onClick: () => onOpenItem?.({ id: latest.targetId, type: latest.targetType }),
      },
    });
  }, [notifications, onOpenItem]);

  const unread = useMemo(() => notifications.filter((item) => !readIds.includes(item.id)), [notifications, readIds]);

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(9,9,11,0.72)", backdropFilter: "blur(8px)", zIndex: 70, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <aside style={{ width: 400, maxWidth: "92vw", height: "100vh", background: "rgba(10,10,12,0.98)", borderLeft: "1px solid rgba(255,255,255,0.08)", padding: 20, color: "#f5f5f5" }} onClick={(event) => event.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#a1a1aa" }}>Notifications</div>
            <h3 style={{ margin: "8px 0 0", fontSize: 26, letterSpacing: "-0.04em" }}>Realtime activity</h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, padding: "8px 12px", color: "#f5f5f5", cursor: "pointer" }}>Close</button>
        </div>

        <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
          {notifications.length === 0 ? <div style={{ color: "#94a3b8" }}>No new notifications.</div> : notifications.map((notification) => (
            <div key={notification.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div style={{ fontWeight: 700 }}>{notification.title}</div>
                <span style={{ background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: "4px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#cbd5e1" }}>{notification.type}</span>
              </div>
              <div style={{ marginTop: 8, color: "#cbd5e1", lineHeight: 1.5 }}>{notification.message}</div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ color: "#94a3b8", fontSize: 11 }}>{new Date(notification.createdAt).toLocaleString("en-IN")}</div>
                <button type="button" onClick={() => { setReadIds((current) => current.includes(notification.id) ? current : [...current, notification.id]); onOpenItem?.({ id: notification.targetId, type: notification.targetType }); }} style={{ background: "#f8fafc", color: "#0f172a", border: "none", borderRadius: 10, padding: "8px 10px", fontWeight: 700, cursor: "pointer" }}>{notification.actionLabel ?? "Open"}</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, color: "#94a3b8", fontSize: 12 }}>Unread: {unread.length}</div>
      </aside>
    </div>
  );
}
