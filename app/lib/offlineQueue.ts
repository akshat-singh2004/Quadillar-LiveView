import type { SupabaseClient } from "@supabase/supabase-js";

export type QueueOperation = "INSERT" | "UPDATE";
export type QueueStatus = "PENDING" | "SYNCING" | "FAILED";

export interface QueuedAction {
  id: string;
  table: string;
  operation: QueueOperation;
  payload: Record<string, any>;
  timestamp: number;
  retryCount: number;
  status: QueueStatus;
  lastError?: string;
}

const STORAGE_KEY = "quadillar_offline_queue_v1";
const SYNC_COMPLETE_EVENT = "quadillar:sync-complete";

const safeParseQueue = (): QueuedAction[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is QueuedAction => {
      if (!item || typeof item !== "object") {
        return false;
      }

      return (
        typeof item.id === "string" &&
        typeof item.table === "string" &&
        (item.operation === "INSERT" || item.operation === "UPDATE") &&
        typeof item.timestamp === "number" &&
        typeof item.retryCount === "number" &&
        (item.status === "PENDING" || item.status === "SYNCING" || item.status === "FAILED") &&
        !!item.payload && typeof item.payload === "object"
      );
    });
  } catch (error) {
    console.warn("Failed to parse offline queue from localStorage:", error);
    return [];
  }
};

const persistQueue = (queue: QueuedAction[]) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn("Failed to persist offline queue to localStorage:", error);
  }
};

const dispatchSyncEvent = (count: number) => {
  if (typeof window === "undefined") {
    return;
  }

  const event = new CustomEvent(SYNC_COMPLETE_EVENT, {
    detail: {
      remaining: count,
      at: Date.now(),
    },
  });

  window.dispatchEvent(event);
};

export function getOfflineQueue(): QueuedAction[] {
  return safeParseQueue();
}

export function enqueueAction(
  table: string,
  operation: QueueOperation,
  payload: Record<string, any>,
): QueuedAction {
  const queue = getOfflineQueue();
  const action: QueuedAction = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    table,
    operation,
    payload: { ...payload },
    timestamp: Date.now(),
    retryCount: 0,
    status: "PENDING",
  };

  queue.push(action);
  persistQueue(queue);
  return action;
}

export function dequeueAction(id: string): void {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  persistQueue(queue);
}

export function clearFailedActions(): void {
  const queue = getOfflineQueue().filter((item) => item.status !== "FAILED");
  persistQueue(queue);
}

export async function flushOfflineQueue(
  supabase: SupabaseClient,
): Promise<{ synced: number; failed: number }> {
  const queue = getOfflineQueue();
  const pending = queue.filter((item) => item.status === "PENDING" || item.status === "SYNCING");

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    const fullQueue = getOfflineQueue();
    const matchIndex = fullQueue.findIndex((entry) => entry.id === item.id);

    if (matchIndex === -1) {
      continue;
    }

    const updatedQueue = [...fullQueue];
    updatedQueue[matchIndex] = {
      ...updatedQueue[matchIndex],
      status: "SYNCING",
      lastError: undefined,
    };
    persistQueue(updatedQueue);

    try {
      if (item.operation === "INSERT") {
        const { error } = await supabase.from(item.table).insert(item.payload);
        if (error) {
          throw error;
        }
      }

      if (item.operation === "UPDATE") {
        const updatePayload = { ...item.payload };
        const idValue = updatePayload.id;

        if (idValue === undefined || idValue === null || idValue === "") {
          throw new Error(`Missing id for UPDATE action on table ${item.table}`);
        }

        const { error } = await supabase
          .from(item.table)
          .update(updatePayload)
          .match({ id: idValue });

        if (error) {
          throw error;
        }
      }

      dequeueAction(item.id);
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error";
      const currentQueue = getOfflineQueue();
      const retryIndex = currentQueue.findIndex((entry) => entry.id === item.id);

      if (retryIndex >= 0) {
        const retryCount = currentQueue[retryIndex].retryCount + 1;
        const nextItem: QueuedAction = {
          ...currentQueue[retryIndex],
          retryCount,
          status: retryCount >= 3 ? "FAILED" : "PENDING",
          lastError: message,
          timestamp: Date.now(),
        };

        currentQueue[retryIndex] = nextItem;
        persistQueue(currentQueue);
      }

      if (retryIndex === -1) {
        failed += 1;
      } else {
        const finalStatus = currentQueue[retryIndex].status;
        if (finalStatus === "FAILED") {
          failed += 1;
        }
      }
    }
  }

  const finalQueueLength = getOfflineQueue().length;
  dispatchSyncEvent(finalQueueLength);

  return { synced, failed };
}

export function startOfflineQueueSync(supabase: SupabaseClient): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleOnline = () => {
    void flushOfflineQueue(supabase);
  };

  window.addEventListener("online", handleOnline);

  void flushOfflineQueue(supabase);

  return () => {
    window.removeEventListener("online", handleOnline);
  };
}
