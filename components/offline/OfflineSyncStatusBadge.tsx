"use client";

import React, { useEffect, useState } from "react";
import { OfflineSyncEngine } from "@/lib/offline/sync-queue";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export function OfflineSyncStatusBadge() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  const checkQueue = async () => {
    try {
      const pending = await OfflineSyncEngine.getPendingActions();
      setPendingCount(pending.length);
    } catch {
      // Ignored in SSR or non-IDB environments
    }
  };

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = async () => {
      setIsOnline(true);
      await checkQueue();
      await triggerDrain();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    checkQueue();
    const interval = setInterval(checkQueue, 4000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const triggerDrain = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setLastSyncResult(null);

    try {
      const res = await OfflineSyncEngine.drainQueue();
      if (res.syncedCount > 0) {
        setLastSyncResult(`Synced ${res.syncedCount} offline record(s)`);
        setTimeout(() => setLastSyncResult(null), 5000);
      }
      await checkQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 font-mono text-[10px]">
      {/* NETWORK CONNECTIVITY BADGE */}
      <span
        className={`px-2 py-0.5 rounded border font-bold uppercase flex items-center gap-1 ${
          isOnline
            ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
            : "bg-rose-950/80 border-rose-800 text-rose-300 animate-pulse"
        }`}
      >
        {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-rose-400" />}
        <span>{isOnline ? "ONLINE" : "OFFLINE CACHE ACTIVE"}</span>
      </span>

      {/* PENDING QUEUE BUTTON */}
      {pendingCount > 0 && (
        <button
          type="button"
          onClick={triggerDrain}
          disabled={!isOnline || isSyncing}
          className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 font-bold uppercase hover:bg-amber-900 transition flex items-center gap-1 cursor-pointer"
          title="Click to replay queued offline records to server"
        >
          {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          <span>{pendingCount} Pending</span>
        </button>
      )}

      {lastSyncResult && (
        <span className="text-emerald-400 font-sans flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>{lastSyncResult}</span>
        </span>
      )}
    </div>
  );
}
