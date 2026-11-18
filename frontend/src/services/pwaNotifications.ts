import { api } from './api.js';

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers the Swachh Setu PWA Service Worker (/sw.js) once.
 */
export async function registerSwachhServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(async reg => {
        try {
          await navigator.serviceWorker.ready;
        } catch {
          // ignore
        }
        return reg;
      })
      .catch(err => {
        console.warn('[PWA SW] Registration failed:', err?.message || err);
        return null;
      });
  }
  return swRegistrationPromise;
}

/**
 * Subscribes this browser / mobile PWA device to Web Push using backend VAPID public key.
 */
export async function subscribeDeviceToPush(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const registration = await registerSwachhServiceWorker();
    if (!registration || !('pushManager' in registration)) {
      return false;
    }

    const vapidRes = await api.getVapidPublicKey().catch(() => null);
    const publicKey = vapidRes?.data?.publicKey;
    if (!publicKey) return false;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource
      });
    }

    await api.subscribePush(subscription.toJSON());
    return true;
  } catch (err: any) {
    console.warn('[PWA PUSH] Subscription notice:', err?.message || err);
    return false;
  }
}

/**
 * Requests OS notification permission and subscribes the device for native mobile/desktop alerts.
 */
export async function requestAndEnablePushNotifications(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    await subscribeDeviceToPush();
  }
  return perm;
}

/**
 * Displays a real native OS notification (Android/iOS/Desktop system tray with Swachh Setu logo & vibration).
 * Uses Service Worker `registration.showNotification` so it works reliably on Android Chrome & installed PWAs.
 */
export async function showNativeOsNotification(
  title: string,
  body: string,
  options?: { tag?: string; url?: string; referenceId?: string }
): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const registration = await registerSwachhServiceWorker();
    if (registration) {
      await registration.showNotification(title || 'Swachh Setu', {
        body: body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: options?.tag || `swachhsetu-${Date.now()}`,
        renotify: true,
        vibrate: [200, 100, 200],
        data: {
          url: options?.url || '/',
          referenceId: options?.referenceId || null
        }
      } as NotificationOptions);
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    new Notification(title || 'Swachh Setu', {
      body: body || '',
      icon: '/icon-192.png',
      tag: options?.tag || `swachhsetu-${Date.now()}`
    });
    return true;
  } catch {
    return false;
  }
}
