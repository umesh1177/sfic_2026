"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const dbRepository_js_1 = require("../data/dbRepository.js");
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
}
exports.NotificationsController = NotificationsController;
