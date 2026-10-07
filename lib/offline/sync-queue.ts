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
