"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { Wifi, WifiOff } from "lucide-react";

export function ConnectionStatusBanner() {
  const [latency, setLatency] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function pingDatabase() {
      const start = performance.now();
      try {
        const { error } = await supabase.from("projects").select("project_id").limit(1);
        if (error) throw error;
        const duration = Math.round(performance.now() - start);
        if (isMounted) {
          setLatency(duration);
          setIsOnline(true);
        }
      } catch {
        if (isMounted) {
          setLatency(null);
          setIsOnline(false);
        }
      }
    }

    void pingDatabase();
    const interval = setInterval(pingDatabase, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed bottom-3 right-4 z-50 select-none font-mono text-[10px]">
      <div className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 shadow-xl backdrop-blur-md transition-colors ${
        isOnline
          ? "bg-zinc-950/90 border-zinc-800 text-zinc-400"
          : "bg-rose-950/90 border-rose-800 text-rose-300"
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full ${
          isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
        }`} />
        {isOnline ? (
          <>
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span>Postgres Realtime Link</span>
            {latency !== null && (
              <span className="text-zinc-500 font-bold tabular-nums">({latency}ms)</span>
            )}
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 text-rose-400" />
            <span className="font-bold">Database Link Disconnected</span>
          </>
        )}
      </div>
    </div>
  );
}

export default ConnectionStatusBanner;
