export interface OfflineFieldCapture {
  queueId: string;
  capturedAt: string;
  submitterId: string;
  manualPinZoneId: string;
  audioBlob: Blob | null;
  audioName: string;
  imageBlob: Blob | null;
  imageName: string;
  previewLabel: string;
}

const DB_NAME = "quadillar_field_offline_db";
const STORE_NAME = "pending_captures";
const DB_VERSION = 1;

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "queueId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Failed to open IndexedDB"));
  });
}

export async function enqueueOfflineCapture(item: OfflineFieldCapture): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function listOfflineCaptures(): Promise<OfflineFieldCapture[]> {
  try {
    const db = await openOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        db.close();
        const rows = (req.result || []) as OfflineFieldCapture[];
        rows.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
        resolve(rows);
      };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch {
    return [];
  }
}

export async function removeOfflineCapture(queueId: string): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(queueId);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
