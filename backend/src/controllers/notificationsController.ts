import { Response } from 'express';
import { store } from '../data/store.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

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

      const notifs = store.notifications.filter(n => n.user_id === req.user!.id);
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
      const notif = store.notifications.find(n => n.id === id);
      if (notif) {
        notif.is_read = true;
      }

      res.status(200).json({
        success: true,
        message: 'Notification marked as read'
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

      store.notifications
        .filter(n => n.user_id === req.user!.id)
        .forEach(n => { n.is_read = true; });

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
