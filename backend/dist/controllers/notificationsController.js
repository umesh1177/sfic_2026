"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const store_js_1 = require("../data/store.js");
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
            const notifs = store_js_1.store.notifications.filter(n => n.user_id === req.user.id);
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
            const notif = store_js_1.store.notifications.find(n => n.id === id);
            if (notif) {
                notif.is_read = true;
            }
            res.status(200).json({
                success: true,
                message: 'Notification marked as read'
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
            store_js_1.store.notifications
                .filter(n => n.user_id === req.user.id)
                .forEach(n => { n.is_read = true; });
            res.status(200).json({
                success: true,
                message: 'All notifications marked as read'
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.NotificationsController = NotificationsController;
