export interface QueuedMutation { id: string; action: 'POUR_CARD_CREATE' | 'NCR_SUBMIT' | 'DPR_SYNC' | 'MB_MEASUREMENT'; endpoint: string; payload: Record<string, any>; timestamp: number; retryCount: number; status: 'PENDING' | 'SYNCING' | 'FAILED'; lastError?: string; }
export type OfflineMutation = QueuedMutation;
const DB_NAME = 'QuadillarOfflineVault';
const STORE_NAME = 'mutation_ledger';
function openOfflineDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('IndexedDB SSR'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME, { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function enqueueOfflineMutation(action: any, endpoint: string, payload: any): Promise<string> {
  const db = await openOfflineDatabase();
  const id = crypto.randomUUID();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({ id, action, endpoint, payload, timestamp: Date.now(), retryCount: 0, status: 'PENDING' });
    tx.oncomplete = () => res(id);
    tx.onerror = () => rej(tx.error);
  });
}
export async function getPendingOfflineMutations(): Promise<QueuedMutation[]> {
  const db = await openOfflineDatabase();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => rej(req.error);
  });
}
export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> { return { synced: 0, failed: 0 }; }
export const flushOfflineMutations = flushOfflineQueue;
