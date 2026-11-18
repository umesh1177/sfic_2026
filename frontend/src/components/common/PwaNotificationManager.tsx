import React, { useEffect, useState, useRef } from 'react';
import { BellRing, CheckCircle2, X } from 'lucide-react';
import { api } from '../../services/api.js';
import {
  isPushSupported,
  registerSwachhServiceWorker,
  requestAndEnablePushNotifications,
  showNativeOsNotification,
  subscribeDeviceToPush
} from '../../services/pwaNotifications.js';

interface PwaNotificationManagerProps {
  userId?: string;
  onNewNotifications?: (notifs: any[]) => void;
}

const SEEN_KEY_PREFIX = 'swachhsetu_seen_notif_ids_';

function loadSeenIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${SEEN_KEY_PREFIX}${userId}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenIds(userId: string, set: Set<string>) {
  try {
    const trimmed = Array.from(set).slice(-150);
    localStorage.setItem(`${SEEN_KEY_PREFIX}${userId}`, JSON.stringify(trimmed));
  } catch {
    // ignore storage quota
  }
}

/**
 * Global PWA Push Notification Manager (mounted across all 5 authenticated roles).
 * - Registers `/sw.js` and subscribes device to Web Push (VAPID)
 * - Displays a 1-tap enable bar when OS notification permission is not yet granted
 * - Polls live notifications and immediately triggers native OS notifications
 *   (Android/iOS/Desktop notification shade with Swachh Setu logo & vibration)
 *   for every newly arriving alert — just like WhatsApp / Messages / Email.
 */
export const PwaNotificationManager: React.FC<PwaNotificationManagerProps> = ({
  userId,
  onNewNotifications
}) => {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    isPushSupported() ? Notification.permission : 'denied'
  );
  const [dismissed, setDismissed] = useState<boolean>(() =>
    sessionStorage.getItem('swachhsetu_push_prompt_dismissed') === '1'
  );
  const [enabling, setEnabling] = useState<boolean>(false);
  const [enabledToast, setEnabledToast] = useState<boolean>(false);
  const initializedUserRef = useRef<string | null>(null);

  // 1. Register Service Worker and auto-subscribe if already granted
  useEffect(() => {
    if (!userId || !isPushSupported()) return;
    registerSwachhServiceWorker().then(() => {
      if (Notification.permission === 'granted') {
        subscribeDeviceToPush();
      }
    });
  }, [userId]);

  // 2. Poll notifications every 12 seconds and trigger native OS notification for brand-new alerts
  useEffect(() => {
    if (!userId || !isPushSupported()) return;

    let cancelled = false;

    const checkIncomingNotifications = async (isFirstCheck: boolean) => {
      try {
        const res = await api.getNotifications().catch(() => null);
        if (cancelled || !res?.data || !Array.isArray(res.data)) return;

        const list = res.data;
        if (onNewNotifications) onNewNotifications(list);

        const seen = loadSeenIds(userId);

        // On the very first load for a fresh device, mark older already-existing notifications as seen
        // so we don't spam 10 old alerts at once; only notify for newly arriving ones thereafter.
        if (isFirstCheck && seen.size === 0) {
          list.forEach((n: any) => {
            if (n?.id) seen.add(String(n.id));
          });
          saveSeenIds(userId, seen);
          return;
        }

        const freshUnread = list.filter(
          (n: any) => n?.id && !n.is_read && !seen.has(String(n.id))
        );

        if (freshUnread.length > 0) {
          for (const notif of freshUnread.slice(0, 3)) {
            seen.add(String(notif.id));
            if (Notification.permission === 'granted') {
              await showNativeOsNotification(
                notif.title || 'Swachh Setu Alert',
                notif.message || '',
                {
                  tag: `swachhsetu-notif-${notif.id}`,
                  url: '/',
                  referenceId: notif.reference_id
                }
              );
            }
          }
          // Mark any remaining beyond 3 as seen to avoid notification flooding
          freshUnread.forEach((n: any) => seen.add(String(n.id)));
          saveSeenIds(userId, seen);
        }
      } catch {
        // silent network errors when offline
      }
    };

    const isFirstForUser = initializedUserRef.current !== userId;
    initializedUserRef.current = userId;
    checkIncomingNotifications(isFirstForUser);

    const interval = window.setInterval(() => {
      if (navigator.onLine) {
        checkIncomingNotifications(false);
      }
    }, 12000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [userId]);

  const handleEnable = async () => {
    setEnabling(true);
    try {
      const result = await requestAndEnablePushNotifications();
      setPermission(result);
      if (result === 'granted') {
        setEnabledToast(true);
        await showNativeOsNotification(
          'Swachh Setu · Notifications Enabled',
          'You will now receive instant alerts on this device for complaints, drives, approvals, and assignments.',
          { tag: 'swachhsetu-welcome-push' }
        );
        setTimeout(() => setEnabledToast(false), 4500);
      }
    } finally {
      setEnabling(false);
    }
  };

  if (!userId || !isPushSupported()) return null;

  if (enabledToast) {
    return (
      <div className="fixed bottom-20 lg:bottom-5 right-3 sm:right-5 z-[60] max-w-xs bg-[#095c54] text-white px-3.5 py-2.5 rounded-2xl shadow-xl border border-emerald-400/30 flex items-center gap-2 text-xs font-bold animate-in fade-in">
        <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
        <span>Mobile Push Notifications Activated!</span>
      </div>
    );
  }

  if (permission !== 'default' || dismissed) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-5 left-3 right-3 sm:left-auto sm:right-5 z-[60] sm:max-w-sm bg-white/95 backdrop-blur-md border border-[#b8e0d7] rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-2.5 animate-in fade-in">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-[#095c54] text-white flex items-center justify-center shrink-0 shadow-xs">
          <BellRing className="w-4 h-4 text-emerald-300" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="text-xs font-black text-[#0f2925] truncate">Enable Mobile Alerts</p>
          <p className="text-[10px] font-semibold text-slate-500 line-clamp-1">
            Get instant push notifications like WhatsApp
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={handleEnable}
          disabled={enabling}
          className="px-3 py-1.5 rounded-xl bg-[#095c54] hover:bg-[#074741] text-white text-[11px] font-black transition shadow-2xs whitespace-nowrap"
        >
          {enabling ? 'Enabling...' : 'Allow'}
        </button>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            sessionStorage.setItem('swachhsetu_push_prompt_dismissed', '1');
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          aria-label="Dismiss notification prompt"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
