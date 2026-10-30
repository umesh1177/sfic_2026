import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2 } from 'lucide-react';
import { DraftStore, OfflineDraft, api } from '../services/api.js';

export const PwaOfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [drafts, setDrafts] = useState<OfflineDraft[]>(DraftStore.getDrafts());
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setDrafts(DraftStore.getDrafts());
    }, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSyncDrafts = async () => {
    if (!isOnline || drafts.length === 0) return;
    setSyncing(true);
    setSyncMessage('');

    try {
      for (const draft of drafts) {
        await api.createComplaint({
          category_id: draft.category_id,
          description: draft.description,
          latitude: draft.latitude,
          longitude: draft.longitude,
          address: draft.address,
          image_url: draft.image_url
        });
        DraftStore.removeDraft(draft.id);
      }
      setDrafts(DraftStore.getDrafts());
      setSyncMessage('All offline drafts synchronized with Navsari Municipal Corporation database!');
      setTimeout(() => setSyncMessage(''), 4000);
    } catch (err: any) {
      setSyncMessage(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && drafts.length === 0 && !syncMessage) return null;

  return (
    <div className="fixed top-16 sm:top-20 left-0 right-0 z-30 px-4 py-2 text-center text-xs font-bold transition-all animate-fadeIn">
      <div className="max-w-md mx-auto rounded-2xl shadow-lg border p-2.5 flex items-center justify-between gap-2 bg-white">
        {!isOnline ? (
          <div className="flex items-center gap-2 text-[#b45309]">
            <WifiOff className="w-4 h-4 text-[#dc2626]" />
            <span>You are currently offline. New complaints will be safely saved as drafts.</span>
          </div>
        ) : drafts.length > 0 ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-[#095c54] flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-[#10b981]" />
              {drafts.length} offline complaint draft{drafts.length > 1 ? 's' : ''} ready to sync.
            </span>
            <button
              onClick={handleSyncDrafts}
              disabled={syncing}
              className="px-3 py-1 rounded-lg bg-[#095c54] text-white text-[11px] font-bold hover:bg-[#05443e] transition flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[#10b981] w-full justify-center">
            <CheckCircle2 className="w-4 h-4" />
            <span>{syncMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
