"use client";

import React, { useState } from "react";
import { Zap, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  projectId: string;
}

export function TriggerSynapseDaemonButton({ projectId }: Props) {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const router = useRouter();

  const handleRun = async () => {
    setLoading(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/synapse/daemon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (data.success) {
        setLastResult(
          data.processedCount > 0
            ? `Processed ${data.processedCount} event(s)`
            : "Bus up-to-date (0 pending)"
        );
        router.refresh();
      } else {
        alert(data.error || "Failed to execute synapse daemon.");
      }
    } catch (err: any) {
      alert(err.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleRun}
        disabled={loading}
        className="px-3.5 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-950/40"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-cyan-300" />}
        <span>Process Synapse Queue</span>
      </button>

      {lastResult && (
        <span className="text-[10px] text-cyan-300 font-mono flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>{lastResult}</span>
        </span>
      )}
    </div>
  );
}
