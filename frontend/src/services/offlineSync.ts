import { api } from './api.js';

export type OfflineSubmissionType = 'complaint' | 'community_evidence' | 'worker_evidence';

export interface OfflineQueueItem {
  id: string;
  type: OfflineSubmissionType;
  label: string;
  payload: any;
  meta?: {
    activityId?: string;
    assignmentId?: string;
    stage?: string;
  };
  createdAt: string;
  attempts: number;
  lastError?: string;
}

const DB_NAME = 'swachhsetu_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_submissions';
const FALLBACK_KEY = 'swachhsetu_offline_queue_v1';

let isSyncingNow = false;

function openOfflineDb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readFallback(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFallback(items: OfflineQueueItem[]) {
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(items));
  } catch {
    // ignore quota error
  }
}

function emitQueueUpdated(detail?: { syncedCount?: number; syncedTypes?: OfflineSubmissionType[] }) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('swachhsetu-offline-queue-updated', { detail: detail || {} }));
  }
}

export function isNetworkError(err: any): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('fetch') && msg.includes('abort')
  );
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  const db = await openOfflineDb();
  if (!db) return readFallback();

  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result || []) as OfflineQueueItem[];
        rows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        resolve(rows);
      };
      req.onerror = () => resolve(readFallback());
    } catch {
      resolve(readFallback());
    }
  });
}

export async function enqueueOfflineSubmission(
  type: OfflineSubmissionType,
  label: string,
  payload: any,
  meta?: OfflineQueueItem['meta']
): Promise<OfflineQueueItem> {
  const item: OfflineQueueItem = {
    id: `offline-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    label,
    payload,
    meta,
    createdAt: new Date().toISOString(),
    attempts: 0
  };

  const db = await openOfflineDb();
  if (!db) {
    const existing = readFallback();
    existing.push(item);
    writeFallback(existing);
    emitQueueUpdated();
    return item;
  }

  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(item);
      tx.oncomplete = () => {
        emitQueueUpdated();
        resolve(item);
      };
      tx.onerror = () => {
        const existing = readFallback();
        existing.push(item);
        writeFallback(existing);
        emitQueueUpdated();
        resolve(item);
      };
    } catch {
      const existing = readFallback();
      existing.push(item);
      writeFallback(existing);
      emitQueueUpdated();
      resolve(item);
    }
  });
}

export async function removeOfflineSubmission(id: string): Promise<void> {
  const db = await openOfflineDb();
  if (!db) {
    writeFallback(readFallback().filter(i => i.id !== id));
    emitQueueUpdated();
    return;
  }

  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => {
        emitQueueUpdated();
        resolve();
      };
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function updateOfflineItemError(item: OfflineQueueItem, errMsg: string): Promise<void> {
  const updated: OfflineQueueItem = {
    ...item,
    attempts: (item.attempts || 0) + 1,
    lastError: errMsg
  };
  const db = await openOfflineDb();
  if (!db) {
    writeFallback(readFallback().map(i => (i.id === item.id ? updated : i)));
    return;
  }
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(updated);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Automatically replays all queued offline submissions to the backend server
 * when internet connectivity is available.
 */
export async function syncOfflineQueue(): Promise<{ synced: number; remaining: number; syncedTypes: OfflineSubmissionType[] }> {
  if (isSyncingNow) {
    const q = await getOfflineQueue();
    return { synced: 0, remaining: q.length, syncedTypes: [] };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const q = await getOfflineQueue();
    return { synced: 0, remaining: q.length, syncedTypes: [] };
  }

  isSyncingNow = true;
  let synced = 0;
  const syncedTypes: OfflineSubmissionType[] = [];

  try {
    const queue = await getOfflineQueue();
    for (const item of queue) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) break;
      try {
        if (item.type === 'complaint') {
          await api.createComplaint(item.payload);
        } else if (item.type === 'community_evidence' && item.meta?.activityId) {
          await api.uploadActivityEvidence(item.meta.activityId, item.payload);
        } else if (item.type === 'worker_evidence' && item.meta?.assignmentId) {
          await api.uploadWorkEvidence(item.meta.assignmentId, item.payload);
        }
        await removeOfflineSubmission(item.id);
        synced += 1;
        if (!syncedTypes.includes(item.type)) syncedTypes.push(item.type);
      } catch (err: any) {
        if (isNetworkError(err)) {
          // Stop retrying until internet returns
          break;
        }
        await updateOfflineItemError(item, err?.message || 'Sync error');
      }
    }

    const remainingQueue = await getOfflineQueue();
    if (synced > 0) {
      emitQueueUpdated({ syncedCount: synced, syncedTypes });
    }
    return { synced, remaining: remainingQueue.length, syncedTypes };
  } finally {
    isSyncingNow = false;
  }
}
