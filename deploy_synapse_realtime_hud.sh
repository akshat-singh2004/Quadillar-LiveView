#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Creating components/governance/SynapseRealtimeAlertListener.tsx...\033[0m"
mkdir -p components/governance

cat << 'COMP_ALERT' > components/governance/SynapseRealtimeAlertListener.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AlertTriangle, ShieldAlert, Zap, X, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface SynapseEvent {
  id: string;
  event_type: string;
  source_agent: string;
  target_agent: string;
  action_taken: string;
  created_at: string;
}

export function SynapseRealtimeAlertListener({ projectId = "GOMTI-NAGAR-PH1-FITOUT" }: { projectId?: string }) {
  const [activeAlerts, setActiveAlerts] = useState<SynapseEvent[]>([]);
  const [executing, setExecuting] = useState(false);
  const router = useRouter();

  // Poll for the latest unacknowledged or critical inter-agent events
  const pollSynapseBus = useCallback(async () => {
    try {
      const res = await fetch(`/api/synapse/daemon?projectId=${projectId}`);
      const data = await res.json();

      // If any fresh cascade occurred or pending events exist
      if (data.success && data.cascadesTriggered && data.cascadesTriggered.length > 0) {
        const freshAlert: SynapseEvent = {
          id: `ALERT-${Date.now()}`,
          event_type: "REACTIVE_CASCADE_TRIGGERED",
          source_agent: "Council Synapse",
          target_agent: "Site Operators",
          action_taken: data.cascadesTriggered[0],
          created_at: new Date().toISOString(),
        };
        setActiveAlerts((prev) => [freshAlert, ...prev.slice(0, 2)]);
      }
    } catch {
      // Gracefully handle offline or network hiccups without throwing
    }
  }, [projectId]);

  useEffect(() => {
    // Initial fetch and 20s interval polling
    pollSynapseBus();
    const interval = setInterval(pollSynapseBus, 20000);
    return () => clearInterval(interval);
  }, [pollSynapseBus]);

  const handleExecuteCascade = async () => {
    setExecuting(true);
    try {
      const res = await fetch("/api/synapse/daemon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveAlerts([]);
        router.refresh();
      }
    } finally {
      setExecuting(false);
    }
  };

  if (activeAlerts.length === 0) return null;

  const currentAlert = activeAlerts[0];

  return (
    <div className="bg-rose-950/90 border-b border-rose-800 text-rose-200 px-4 py-2 text-xs font-mono flex items-center justify-between gap-3 shadow-2xl animate-in slide-in-from-top duration-300 z-50">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="p-1 rounded bg-rose-900 border border-rose-700 text-rose-300 animate-pulse shrink-0">
          <ShieldAlert className="w-4 h-4 text-rose-300" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <strong className="text-white uppercase tracking-wider text-[11px]">
              AUTONOMOUS STATUTORY INTERLOCK ACTIVE
            </strong>
            <span className="text-[10px] text-rose-400 font-sans">
              [{currentAlert.source_agent} &rarr; {currentAlert.target_agent}]
            </span>
          </div>
          <p className="text-[11px] text-rose-300 truncate font-sans">
            {currentAlert.action_taken}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleExecuteCascade}
          disabled={executing}
          className="px-3 py-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold uppercase rounded text-[10px] transition cursor-pointer flex items-center gap-1 shadow"
        >
          {executing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          <span>Enforce Cascade</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAlerts([])}
          className="text-rose-400 hover:text-white p-1 cursor-pointer"
          title="Dismiss Banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
COMP_ALERT

echo -e "\033[1;36m[+] Integrating SynapseRealtimeAlertListener into CouncilNavigationShell...\033[0m"

node -e '
const fs = require("fs");
const file = "components/layout/CouncilNavigationShell.tsx";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  if (!content.includes("SynapseRealtimeAlertListener")) {
    content = content.replace(
      /import \{/g,
      `import { SynapseRealtimeAlertListener } from "@/components/governance/SynapseRealtimeAlertListener";\nimport {`
    );

    content = content.replace(
      /<main className="flex-1 overflow-y-auto min-w-0">/,
      `<main className="flex-1 overflow-y-auto min-w-0 flex flex-col">\n        <SynapseRealtimeAlertListener />`
    );

    fs.writeFileSync(file, content, "utf8");
    console.log("  ✓ Integrated SynapseRealtimeAlertListener into " + file);
  }
}
'

echo -e "\033[1;33m[*] Re-running Hardware Ingress Test Harness with npx tsx...\033[0m"
npx tsx scripts/test-iot-telemetry-ingress.ts

echo -e "\033[1;36m[+] Verifying full workspace TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Real-time Synapse HUD deployed cleanly with ZERO TypeScript errors!\033[0m"
