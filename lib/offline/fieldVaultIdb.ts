export type BandwidthProfile = "auto" | "standard" | "ultra-lite" | "manifest-only";

export interface FieldEvidencePacket {
  id: string;
  projectId: string;
  recordedAtUtc: string;
  zoneId: string;
  bimGlobalId: string;
  qrPayload: string | null;
  noteText: string;
  voiceDurationSec: number;
  sha256: string;
  lat: number | null;
  lon: number | null;
  gpsAccuracyM: number | null;
  yawDeg: number | null;
  pitchDeg: number | null;
  rollDeg: number | null;
  plumbDeviationDeg: number | null;
  plumbPass: boolean | null;
  weatherWindMs: number | null;
  surfacePressureHpa: number | null;
  bandwidthProfile: Exclude<BandwidthProfile, "auto">;
  payloadBytes: number;
  thumbDataUrl: string;
  mediaUploaded: boolean;
  synced: boolean;
  rejectedDuplicate?: boolean;
  syncError?: string | null;
  storageMode?: "supabase" | "edge_ledger_fallback";
}

const DB_NAME = "quadillar_field_vault_v1";
const STORE_NAME = "evidence_packets";
const DB_VERSION = 1;

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by_sha256", "sha256", { unique: false });
        store.createIndex("by_recordedAt", "recordedAtUtc", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
  });
}

export async function idbListPackets(): Promise<FieldEvidencePacket[]> {
  try {
    const db = await openVaultDb();
    return await new Promise<FieldEvidencePacket[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const rows = (req.result as FieldEvidencePacket[]) || [];
        rows.sort((a, b) => (a.recordedAtUtc < b.recordedAtUtc ? 1 : -1));
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function idbPutPacket(packet: FieldEvidencePacket): Promise<void> {
  const db = await openVaultDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(packet);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbClearPackets(): Promise<void> {
  const db = await openVaultDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbEstimateStorageMb(): Promise<{ usedMb: number; quotaMb: number } | null> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
    const est = await navigator.storage.estimate();
    return {
      usedMb: Math.round(((est.usage ?? 0) / (1024 * 1024)) * 100) / 100,
      quotaMb: Math.round(((est.quota ?? 0) / (1024 * 1024)) * 10) / 10,
    };
  } catch {
    return null;
  }
}
