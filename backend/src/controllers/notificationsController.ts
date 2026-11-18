import { Request, Response } from 'express';
import { store } from '../data/store.js';
import { DbRepository } from '../data/dbRepository.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { PushService } from '../services/pushService.js';

export class NotificationsController {
  /**
   * GET /api/notifications
   */
  public static async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const notifs = await DbRepository.getNotifications(req.user.id);
      res.status(200).json({
        success: true,
        data: notifs
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   */
  public static async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await DbRepository.markNotificationRead(id);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read in database'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PATCH /api/notifications/read-all
   */
  public static async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      await DbRepository.markAllNotificationsRead(req.user.id);

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read in database'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/push/vapid-public-key
   */
  public static async getVapidPublicKey(_req: Request, res: Response): Promise<void> {
    try {
      const publicKey = await PushService.getPublicKey();
      res.status(200).json({ success: true, data: { publicKey } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/push/subscribe
   */
  public static async subscribePush(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const { subscription } = req.body;
      await PushService.saveSubscription(
        req.user.id,
        req.user.role || 'citizen',
        subscription,
        req.headers['user-agent']
      );
      res.status(200).json({
        success: true,
        message: 'Device subscribed to Swachh Setu push notifications'
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to subscribe device' });
    }
  }

  /**
   * POST /api/push/unsubscribe
   */
  public static async unsubscribePush(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { endpoint } = req.body;
      if (endpoint) {
        await PushService.removeSubscription(endpoint);
      }
      res.status(200).json({ success: true, message: 'Device unsubscribed from push notifications' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/push/test
   */
  public static async sendTestPush(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const title = 'Swachh Setu · Notifications Active';
      const body = 'You will now receive instant mobile alerts for complaints, approvals, drives, and assignments.';
      await DbRepository.createNotification(req.user.id, title, body, undefined, 'system_alert');
      res.status(200).json({ success: true, message: 'Test push notification dispatched!' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
