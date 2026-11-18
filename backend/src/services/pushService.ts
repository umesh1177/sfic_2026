import * as webpushPkg from 'web-push';
import fs from 'fs';
import path from 'path';
import { pool, isDbConnected } from '../data/db.js';

const webpush: typeof webpushPkg =
  typeof (webpushPkg as any).generateVAPIDKeys === 'function'
    ? webpushPkg
    : (webpushPkg as any).default;

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  type?: string;
  referenceId?: string;
  icon?: string;
  badge?: string;
}

interface StoredSubscription {
  endpoint: string;
  user_id: string;
  role: string;
  p256dh: string;
  auth: string;
}

export class PushService {
  private static initialized = false;
  private static vapidPublicKey = '';
  private static vapidPrivateKey = '';
  private static memorySubscriptions = new Map<string, StoredSubscription>();
  private static readonly VAPID_FILE = path.resolve(process.cwd(), 'data', 'vapid_keys.json');

  public static async initialize(): Promise<void> {
    if (this.initialized && this.vapidPublicKey && this.vapidPrivateKey) return;

    try {
      // 1. Ensure PostgreSQL tables exist (isolated so DB hiccup never blocks VAPID key generation)
      if (isDbConnected()) {
        try {
          await pool.query(`
            CREATE TABLE IF NOT EXISTS push_vapid_keys (
              id INT PRIMARY KEY DEFAULT 1,
              public_key TEXT NOT NULL,
              private_key TEXT NOT NULL,
              created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS push_subscriptions (
              endpoint TEXT PRIMARY KEY,
              user_id VARCHAR(100) NOT NULL,
              role VARCHAR(50) DEFAULT 'citizen',
              p256dh TEXT NOT NULL,
              auth TEXT NOT NULL,
              user_agent TEXT,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON push_subscriptions(user_id);
          `);
        } catch (dbErr: any) {
          console.warn('[WEB PUSH DB DDL WARN]:', dbErr?.message || dbErr);
        }
      }

      // 2. Load or generate persistent VAPID keys
      let pub = (process.env.VAPID_PUBLIC_KEY || '').trim();
      let priv = (process.env.VAPID_PRIVATE_KEY || '').trim();

      if ((!pub || !priv) && isDbConnected()) {
        try {
          const res = await pool.query('SELECT public_key, private_key FROM push_vapid_keys WHERE id = 1');
          if (res.rows.length > 0) {
            pub = res.rows[0].public_key;
            priv = res.rows[0].private_key;
          }
        } catch {
          // fallback to file/generate
        }
      }

      if ((!pub || !priv) && fs.existsSync(this.VAPID_FILE)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(this.VAPID_FILE, 'utf8'));
          if (parsed?.publicKey && parsed?.privateKey) {
            pub = parsed.publicKey;
            priv = parsed.privateKey;
          }
        } catch {
          // regenerate below
        }
      }

      if (!pub || !priv) {
        const generated = webpush.generateVAPIDKeys();
        pub = generated.publicKey;
        priv = generated.privateKey;

        if (isDbConnected()) {
          await pool
            .query(
              `INSERT INTO push_vapid_keys (id, public_key, private_key)
               VALUES (1, $1, $2)
               ON CONFLICT (id) DO NOTHING`,
              [pub, priv]
            )
            .catch(() => {});
        }
        try {
          fs.mkdirSync(path.dirname(this.VAPID_FILE), { recursive: true });
          fs.writeFileSync(this.VAPID_FILE, JSON.stringify({ publicKey: pub, privateKey: priv }, null, 2));
        } catch {
          // ignore filesystem read-only
        }
      }

      this.vapidPublicKey = pub;
      this.vapidPrivateKey = priv;
      const subject = process.env.VAPID_SUBJECT || 'mailto:swachhsetu@navsarimunicipal.gov.in';
      webpush.setVapidDetails(subject, pub, priv);
      this.initialized = true;
      console.log('[WEB PUSH] VAPID push notification engine initialized.');
    } catch (err: any) {
      console.warn('[WEB PUSH INIT WARN]:', err?.message || err);
    }
  }

  public static async getPublicKey(): Promise<string> {
    if (!this.initialized || !this.vapidPublicKey) {
      await this.initialize();
    }
    return this.vapidPublicKey;
  }

  public static async saveSubscription(
    userId: string,
    role: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string
  ): Promise<void> {
    await this.initialize();
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      throw new Error('Invalid push subscription payload');
    }

    const record: StoredSubscription = {
      endpoint: subscription.endpoint,
      user_id: userId,
      role: role || 'citizen',
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth
    };
    this.memorySubscriptions.set(record.endpoint, record);

    if (isDbConnected()) {
      await pool.query(
        `INSERT INTO push_subscriptions (endpoint, user_id, role, p256dh, auth, user_agent, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (endpoint) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           role = EXCLUDED.role,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           user_agent = EXCLUDED.user_agent,
           updated_at = NOW()`,
        [record.endpoint, record.user_id, record.role, record.p256dh, record.auth, userAgent || null]
      );
    }
  }

  public static async removeSubscription(endpoint: string): Promise<void> {
    this.memorySubscriptions.delete(endpoint);
    if (isDbConnected()) {
      await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]).catch(() => {});
    }
  }

  private static async getSubscriptionsForUser(userId: string): Promise<StoredSubscription[]> {
    const map = new Map<string, StoredSubscription>();
    for (const sub of this.memorySubscriptions.values()) {
      if (sub.user_id === userId) map.set(sub.endpoint, sub);
    }
    if (isDbConnected()) {
      try {
        const res = await pool.query(
          'SELECT endpoint, user_id, role, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
          [userId]
        );
        for (const row of res.rows) {
          map.set(row.endpoint, row);
        }
      } catch {
        // fallback to memory map
      }
    }
    return Array.from(map.values());
  }

  public static async sendToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
    if (!userId) return { sent: 0, failed: 0 };
    await this.initialize();
    if (!this.vapidPublicKey || !this.vapidPrivateKey) {
      return { sent: 0, failed: 0 };
    }

    const subs = await this.getSubscriptionsForUser(userId);
    if (subs.length === 0) return { sent: 0, failed: 0 };

    const message = JSON.stringify({
      title: payload.title || 'Swachh Setu Notification',
      body: payload.body || '',
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      tag: payload.tag || `swachhsetu-${payload.type || 'alert'}-${Date.now()}`,
      url: payload.url || '/',
      type: payload.type || 'system_alert',
      referenceId: payload.referenceId || null,
      timestamp: Date.now()
    });

    let sent = 0;
    let failed = 0;

    await Promise.all(
      subs.map(async sub => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            message,
            { TTL: 86400 }
          );
          sent += 1;
        } catch (err: any) {
          failed += 1;
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            await this.removeSubscription(sub.endpoint);
          }
        }
      })
    );

    return { sent, failed };
  }
}
