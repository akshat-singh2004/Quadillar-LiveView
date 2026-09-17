"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import supabase from "@/app/lib/supabase";
import { flushOfflineQueue, getOfflineQueue } from "@/app/lib/offlineQueue";

type RealtimeStatus = "SUBSCRIBED" | "CONNECTING" | "CLOSED" | "CHANNEL_ERROR";

const SYNTHETIC_LATENCY_MS = 148;

export default function ConnectionStatusBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== "undefined" ? window.navigator.onLine : true,
  );
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("CONNECTING");
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshQueueCount = () => {
    const queue = getOfflineQueue();
    const activeCount = queue.filter((item) => item.status !== "FAILED").length;
    setPendingQueueCount(activeCount);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);

    try {
      await flushOfflineQueue(supabase);
      refreshQueueCount();
    } catch (error) {
      console.warn("Offline sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    refreshQueueCount();

    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleSyncComplete = () => {
      refreshQueueCount();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("quadillar:sync-complete", handleSyncComplete);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("quadillar:sync-complete", handleSyncComplete);
    };
  }, []);

  useEffect(() => {
    const channel = supabase.channel("system_health");

    const sub = channel.subscribe((status, err) => {
      if (err) {
        console.warn("Realtime channel error:", err);
      }

      if (status === "SUBSCRIBED") {
        setRealtimeStatus("SUBSCRIBED");
      } else if (status === "CHANNEL_ERROR") {
        setRealtimeStatus("CHANNEL_ERROR");
      } else if (status === "CLOSED" || status === "TIMED_OUT") {
        setRealtimeStatus("CLOSED");
      } else {
        setRealtimeStatus("CONNECTING");
      }
    });

    return () => {
      void sub;
      void channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    if (realtimeStatus === "SUBSCRIBED" || realtimeStatus === "CONNECTING") {
      void handleSyncNow();
    }
  }, [isOnline, realtimeStatus]);

  const offlineMode = !isOnline || realtimeStatus === "CLOSED" || realtimeStatus === "CHANNEL_ERROR";
  const reconnectingMode = isOnline && (realtimeStatus === "CONNECTING" || isSyncing);

  if (offlineMode) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,760px)] -translate-x-1/2">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 px-4 py-3 shadow-lg shadow-amber-200/40 ring-1 ring-black/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <WifiOff className="h-4 w-4" />
            </div>
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <CloudOff className="h-4 w-4" />
                <span>Site Network Offline — Working in Cached Mode.</span>
              </div>
              <div className="text-xs text-amber-800/80">
                {pendingQueueCount} logs queued locally.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSyncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {isSyncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      </div>
    );
  }

  if (reconnectingMode) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,760px)] -translate-x-1/2">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 px-4 py-3 shadow-lg shadow-sky-200/40 ring-1 ring-black/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <RefreshCw className="h-4 w-4 animate-spin" />
            </div>
            <div className="min-w-0 text-left">
              <div className="text-sm font-semibold text-sky-900">
                Reconnecting to LiveView... Syncing {pendingQueueCount} site logs.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,520px)] -translate-x-1/2">
      <div className="flex items-center justify-center rounded-full border border-emerald-200 bg-white/90 px-4 py-2 shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <Wifi className="h-4 w-4" />
          <span>Live Realtime Link Active</span>
          <span className="text-[11px] text-emerald-600/80">{SYNTHETIC_LATENCY_MS} ms</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
      </div>
    </div>
  );
}
