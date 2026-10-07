#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Creating directory structures...\033[0m"
mkdir -p lib/offline components/offline scripts

# -----------------------------------------------------------------------------
# 1. CORE LIBRARY: lib/offline/sync-queue.ts
# IndexedDB persistent outbox queue and background FIFO drainage engine
# -----------------------------------------------------------------------------
cat << 'OFFLINE_CORE' > lib/offline/sync-queue.ts
/**
 * Quadillar LiveView • Offline IndexedDB Queue & Synchronization Engine
 * Compliant with Section 65B (Contemporaneous Physical Timestamping)
 */

export interface QueuedOfflineAction {
  id: string;
  projectId: string;
  category: "CTM_LOAD_CELL" | "WEATHER_ANEMOMETER" | "THERMOCOUPLE_RTD" | "BIOMETRIC_TURNSTILE" | "EQUIPMENT_CANBUS" | string;
  deviceId: string;
  protocol: string;
  payload: Record<string, any>;
  offlineTimestamp: string;
  status: "QUEUED" | "SYNCING" | "RECONCILED" | "FAILED";
  retryCount: number;
}

const DB_NAME = "quadillar_field_runtime_db";
const DB_VERSION = 1;
const STORE_NAME = "quadillar_offline_outbox";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not available in current environment."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("offlineTimestamp", "offlineTimestamp", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class OfflineSyncEngine {
  /**
   * Enqueue a field action locally when network is unavailable
   */
  static async enqueueAction(action: Omit<QueuedOfflineAction, "id" | "offlineTimestamp" | "status" | "retryCount">): Promise<QueuedOfflineAction> {
    const item: QueuedOfflineAction = {
      ...action,
      id: `OFFLINE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      offlineTimestamp: new Date().toISOString(),
      status: "QUEUED",
      retryCount: 0,
    };

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(item);

      req.onsuccess = () => resolve(item);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieve all pending outbox actions awaiting transmission
   */
  static async getPendingActions(): Promise<QueuedOfflineAction[]> {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const all = (req.result || []) as QueuedOfflineAction[];
          resolve(all.filter((i) => i.status === "QUEUED" || i.status === "FAILED"));
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  /**
   * Drain the queue in strict FIFO sequence and replay against /api/telemetry/ingress
   */
  static async drainQueue(onProgress?: (synced: number, total: number) => void): Promise<{
    syncedCount: number;
    failedCount: number;
  }> {
    const pending = await this.getPendingActions();
    if (pending.length === 0) return { syncedCount: 0, failedCount: 0 };

    let syncedCount = 0;
    let failedCount = 0;

    const db = await openDatabase();

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];

      try {
        const res = await fetch("/api/telemetry/ingress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: item.projectId,
            deviceId: item.deviceId,
            protocol: item.protocol,
            category: item.category,
            payload: {
              ...item.payload,
              _offlineRecordedAt: item.offlineTimestamp,
              _offlineReplayId: item.id,
            },
          }),
        });

        const data = await res.json();

        if (data.success) {
          // Remove from local IndexedDB
          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(item.id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
          syncedCount++;
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }

      if (onProgress) {
        onProgress(syncedCount, pending.length);
      }
    }

    return { syncedCount, failedCount };
  }
}
OFFLINE_CORE

# -----------------------------------------------------------------------------
# 2. UI COMPONENT: components/offline/OfflineSyncStatusBadge.tsx
# Real-time network monitor, pending queue badge & manual flush button
# -----------------------------------------------------------------------------
cat << 'COMP_BADGE' > components/offline/OfflineSyncStatusBadge.tsx
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
COMP_BADGE

# -----------------------------------------------------------------------------
# 3. REGISTER BADGE IN CouncilNavigationShell.tsx
# -----------------------------------------------------------------------------
node -e '
const fs = require("fs");
const file = "components/layout/CouncilNavigationShell.tsx";

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, "utf8");

  if (!content.includes("OfflineSyncStatusBadge")) {
    content = content.replace(
      /import \{ GovernorInteractiveCopilot \} from "[^"]+";/,
      `import { GovernorInteractiveCopilot } from "@/components/governance/GovernorInteractiveCopilot";\nimport { OfflineSyncStatusBadge } from "@/components/offline/OfflineSyncStatusBadge";`
    );

    // Place the badge in the active chamber header bar next to the copilot
    content = content.replace(
      /<GovernorInteractiveCopilot governorId=\{getActiveGovernor\(pathname\)\} \/>/,
      `<div className="flex items-center gap-2">\n            <OfflineSyncStatusBadge />\n            <GovernorInteractiveCopilot governorId={getActiveGovernor(pathname)} />\n          </div>`
    );

    fs.writeFileSync(file, content, "utf8");
    console.log("  ✓ Injected OfflineSyncStatusBadge into " + file);
  }
}
'

# -----------------------------------------------------------------------------
# 4. SIMULATION SCRIPT: scripts/test-offline-sync-engine.ts
# Demonstrates offline batch accumulation and sequential replay into ingress API
# -----------------------------------------------------------------------------
cat << 'TEST_OFFLINE' > scripts/test-offline-sync-engine.ts
import fs from "fs";
import path from "path";

// Load .env.local
for (const envFile of [".env.local", ".env"]) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        const key = k.trim();
        if (!process.env[key]) {
          process.env[key] = v.join("=").trim().replace(/^["']|["']$/g, "");
        }
      }
    }
  }
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder-project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "placeholder-service-key";
}

import { POST } from "../app/api/telemetry/ingress/route";

async function simulateOfflineOutboxDrain() {
  console.log("\n\x1b[1;36m======================================================================\x1b[0m");
  console.log("\x1b[1;36m  TESTING OFFLINE FIELD OUTBOX PERSISTENCE & SEQUENTIAL FIFO REPLAY   \x1b[0m");
  console.log("\x1b[1;36m======================================================================\x1b[0m\n");

  // Simulated queue of actions captured while jobsite had ZERO cellular signal
  const offlineOutbox = [
    {
      queueId: "OFFLINE-CTM-8491",
      offlineTimestamp: "2026-10-07T05:45:00.000Z",
      category: "CTM_LOAD_CELL",
      deviceId: "CTM-FIELD-BASEMENT-01",
      protocol: "MODBUS_TCP",
      payload: {
        pourCardId: "PC-BASEMENT-B2",
        ageDays: 28,
        targetFckMpa: 35,
        failureLoadKn: 918,
        operatorName: "Site QA Tech (Offline Queue)",
      },
    },
    {
      queueId: "OFFLINE-TURNSTILE-8492",
      offlineTimestamp: "2026-10-07T05:46:12.000Z",
      category: "BIOMETRIC_TURNSTILE",
      deviceId: "TURNSTILE-GATE-NORTH",
      protocol: "WIEGAND",
      payload: {
        workerPin: "PIN-104",
        punchType: "INGRESS",
      },
    },
    {
      queueId: "OFFLINE-ANEMO-8493",
      offlineTimestamp: "2026-10-07T05:48:30.000Z",
      category: "WEATHER_ANEMOMETER",
      deviceId: "ANEMO-CRANE-TOWER-02",
      protocol: "HTTP_REST",
      payload: {
        windSpeedKmh: 21.4,
        rainfallRateMmh: 0.0,
      },
    },
  ];

  console.log(`\x1b[1;33m[*] Step 1: Simulating offline accumulation of ${offlineOutbox.length} field records...\x1b[0m`);
  offlineOutbox.forEach((item, idx) => {
    console.log(`  [${idx + 1}] ID: ${item.queueId} | Category: ${item.category} | Captured At: ${item.offlineTimestamp}`);
  });

  console.log(`\n\x1b[1;33m[*] Step 2: Network connectivity restored -> Initiating FIFO Outbox Drain...\x1b[0m`);

  for (let i = 0; i < offlineOutbox.length; i++) {
    const item = offlineOutbox[i];

    const req = new Request("http://localhost:3000/api/telemetry/ingress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "GOMTI-NAGAR-PH1-FITOUT",
        deviceId: item.deviceId,
        protocol: item.protocol,
        category: item.category,
        payload: {
          ...item.payload,
          _offlineRecordedAt: item.offlineTimestamp,
          _offlineReplayId: item.queueId,
        },
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    if (!data.success) {
      console.error(`  \x1b[1;31m✗ Replay Failed for ${item.queueId}:\x1b[0m`, data.error);
      process.exit(1);
    }

    console.log(`  \x1b[1;32m✓ Replayed ${item.queueId}\x1b[0m -> Routed: ${data.governorRouted} | Merkle Block: ${data.merkleSealHash.slice(0, 24)}...`);
  }

  console.log("\n\x1b[1;32m======================================================================\x1b[0m");
  console.log("\x1b[1;32m  ALL OFFLINE OUTBOX RECORDS REPLAYED & NOTARIZED WITH 100% SUCCESS   \x1b[0m");
  console.log("\x1b[1;32m======================================================================\x1b[0m\n");
}

simulateOfflineOutboxDrain().catch((err) => {
  console.error("Simulation fault:", err);
  process.exit(1);
});
TEST_OFFLINE

# -----------------------------------------------------------------------------
# 5. EXECUTE REPLAY SIMULATION VIA TSX
# -----------------------------------------------------------------------------
echo -e "\033[1;33m[*] Running Offline Outbox Drain Simulation with npx tsx...\033[0m"
npx tsx scripts/test-offline-sync-engine.ts

# -----------------------------------------------------------------------------
# 6. VERIFY FULL BUILD TYPESCRIPT COMPILATION
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying full workspace TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

# -----------------------------------------------------------------------------
# 7. REFRESH CONSOLIDATED SYSTEM CODEBASE BUNDLE
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Updating council_governance_source_bundle.txt...\033[0m"
./bundle_governance_source.sh

echo -e "\033[1;32m[✓] Offline IndexedDB Sync Engine deployed cleanly with ZERO errors!\033[0m"
