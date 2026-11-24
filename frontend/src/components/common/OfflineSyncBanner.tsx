import React, { useEffect, useState, useCallback } from 'react';
import { WifiOff, RefreshCw, CloudUpload, CheckCircle2 } from 'lucide-react';
import { getOfflineQueue, syncOfflineQueue, OfflineQueueItem } from '../../services/offlineSync.js';

interface OfflineSyncBannerProps {
  onSynced?: () => void;
}

/**
 * Monitors online/offline status, shows pending locally-saved submissions,
 * and automatically uploads them to the backend server as soon as internet returns.
 */
export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({ onSynced }) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingItems, setPendingItems] = useState<OfflineQueueItem[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [justSyncedMsg, setJustSyncedMsg] = useState<string>('');

  const refreshQueue = useCallback(async () => {
    const items = await getOfflineQueue();
    setPendingItems(items);
  }, []);

  const triggerSync = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    setSyncing(true);
    try {
      const result = await syncOfflineQueue();
      await refreshQueue();
      if (result.synced > 0) {
        setJustSyncedMsg(
          `${result.synced} offline submission${result.synced > 1 ? 's' : ''} automatically synced to the server!`
        );
        if (onSynced) onSynced();
        setTimeout(() => setJustSyncedMsg(''), 7000);
      }
    } finally {
      setSyncing(false);
    }
  }, [refreshQueue, onSynced]);

  useEffect(() => {
    refreshQueue();
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      triggerSync();
    }

    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    const handleQueueUpdated = (e: Event) => {
      const custom = e as CustomEvent;
      refreshQueue();
      if (custom?.detail?.syncedCount > 0) {
        setJustSyncedMsg(
          `${custom.detail.syncedCount} offline submission${custom.detail.syncedCount > 1 ? 's' : ''} automatically synced to the server!`
        );
        if (onSynced) onSynced();
        setTimeout(() => setJustSyncedMsg(''), 7000);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('swachhsetu-offline-queue-updated', handleQueueUpdated);

    // Background retry every 20s when online and queue has pending items
    const timer = window.setInterval(async () => {
      if (navigator.onLine) {
        const items = await getOfflineQueue();
        if (items.length > 0) {
          triggerSync();
        }
      }
    }, 20000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('swachhsetu-offline-queue-updated', handleQueueUpdated);
      window.clearInterval(timer);
    };
  }, [refreshQueue, triggerSync, onSynced]);

  if (isOnline && pendingItems.length === 0 && !justSyncedMsg) {
    return null;
  }

  return (
    <div className="space-y-0">
      {!isOnline && (
        <div className="bg-slate-900 text-white px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-bold">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              You are currently offline — Reports and Evidence submitted now will be stored locally and auto-synced when internet returns.
            </span>
          </div>
          {pendingItems.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
              {pendingItems.length} Saved Locally
            </span>
          )}
        </div>
      )}

      {isOnline && pendingItems.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900">
          <div className="flex items-center gap-2 font-bold">
            <CloudUpload className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              {syncing
                ? `Syncing ${pendingItems.length} offline submission(s) to server...`
                : `${pendingItems.length} offline submission(s) queued locally — ready to sync.`}
            </span>
          </div>
          <button
            type="button"
            disabled={syncing}
            onClick={triggerSync}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      )}

      {justSyncedMsg && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-3 sm:px-6 py-2 flex items-center gap-2 text-xs font-extrabold text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{justSyncedMsg}</span>
        </div>
      )}
    </div>
  );
};
