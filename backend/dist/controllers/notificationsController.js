"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const dbRepository_js_1 = require("../data/dbRepository.js");
const pushService_js_1 = require("../services/pushService.js");
class NotificationsController {
    /**
     * GET /api/notifications
     */
    static async getNotifications(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const notifs = await dbRepository_js_1.DbRepository.getNotifications(req.user.id);
            res.status(200).json({
                success: true,
                data: notifs
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * PATCH /api/notifications/:id/read
     */
    static async markAsRead(req, res) {
        try {
            const { id } = req.params;
            await dbRepository_js_1.DbRepository.markNotificationRead(id);
            res.status(200).json({
                success: true,
                message: 'Notification marked as read in database'
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * PATCH /api/notifications/read-all
     */
    static async markAllAsRead(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            await dbRepository_js_1.DbRepository.markAllNotificationsRead(req.user.id);
            res.status(200).json({
                success: true,
                message: 'All notifications marked as read in database'
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * GET /api/push/vapid-public-key
     */
    static async getVapidPublicKey(_req, res) {
        try {
            const publicKey = await pushService_js_1.PushService.getPublicKey();
            res.status(200).json({ success: true, data: { publicKey } });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * POST /api/push/subscribe
     */
    static async subscribePush(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const { subscription } = req.body;
            await pushService_js_1.PushService.saveSubscription(req.user.id, req.user.role || 'citizen', subscription, req.headers['user-agent']);
            res.status(200).json({
                success: true,
                message: 'Device subscribed to Swachh Setu push notifications'
            });
        }
        catch (err) {
            res.status(400).json({ success: false, error: err.message || 'Failed to subscribe device' });
        }
    }
    /**
     * POST /api/push/unsubscribe
     */
    static async unsubscribePush(req, res) {
        try {
            const { endpoint } = req.body;
            if (endpoint) {
                await pushService_js_1.PushService.removeSubscription(endpoint);
            }
            res.status(200).json({ success: true, message: 'Device unsubscribed from push notifications' });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * POST /api/push/test
     */
    static async sendTestPush(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const title = 'Swachh Setu · Notifications Active';
            const body = 'You will now receive instant mobile alerts for complaints, approvals, drives, and assignments.';
            await dbRepository_js_1.DbRepository.createNotification(req.user.id, title, body, undefined, 'system_alert');
            res.status(200).json({ success: true, message: 'Test push notification dispatched!' });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.NotificationsController = NotificationsController;
