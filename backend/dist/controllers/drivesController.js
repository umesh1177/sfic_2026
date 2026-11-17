"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrivesController = void 0;
const dbRepository_js_1 = require("../data/dbRepository.js");
class DrivesController {
    /**
     * GET /api/drives
     */
    static async getDrives(req, res) {
        try {
            const citizenId = req.user?.id;
            const drivesWithStatus = await dbRepository_js_1.DbRepository.getDrives(citizenId);
            res.status(200).json({
                success: true,
                data: drivesWithStatus
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * GET /api/drives/:id
     */
    static async getDriveById(req, res) {
        try {
            const { id } = req.params;
            const citizenId = req.user?.id;
            const drives = await dbRepository_js_1.DbRepository.getDrives(citizenId);
            const drive = drives.find(d => d.id === id);
            if (!drive) {
                res.status(404).json({ success: false, error: 'Cleanliness drive not found' });
                return;
            }
            res.status(200).json({
                success: true,
                data: drive
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * POST /api/drives/:id/register
     * Prevents duplicate registration
     */
    static async registerForDrive(req, res) {
        try {
            const citizenId = req.user?.id || 'c0000000-0000-0000-0000-000000000001';
            const { id } = req.params;
            const { community_id, community_name } = req.body || {};
            const regResult = await dbRepository_js_1.DbRepository.registerForDrive(id, citizenId, community_id, community_name);
            if (!regResult.success) {
                res.status(400).json({
                    success: false,
                    error: regResult.message || 'Volunteer quota reached for this community.'
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: regResult.message || 'Successfully registered for this cleanliness drive and recorded in database!',
                data: {
                    drive_id: id,
                    is_registered: true,
                    community_id,
                    community_name
                }
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * DELETE /api/drives/:id/register
     */
    static async cancelRegistration(req, res) {
        try {
            const citizenId = req.user?.id || 'c0000000-0000-0000-0000-000000000001';
            const { id } = req.params;
            await dbRepository_js_1.DbRepository.cancelDriveRegistration(id, citizenId);
            res.status(200).json({
                success: true,
                message: 'Registration cancelled successfully in database.',
                data: {
                    drive_id: id,
                    is_registered: false
                }
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * POST /api/drives/:id/attendance
     * Citizen geo-tagged check-in ("dummy attendance") between start_time and end_time.
     * Sends pending verification to the respective Community Head; does NOT mark present until approved.
     */
    static async markAttendance(req, res) {
        try {
            const { id } = req.params;
            const citizenId = req.user?.id || 'c0000000-0000-0000-0000-000000000001';
            const { latitude, longitude } = req.body || {};
            const result = await dbRepository_js_1.DbRepository.markDriveAttendance(id, citizenId, latitude !== undefined ? Number(latitude) : undefined, longitude !== undefined ? Number(longitude) : undefined);
            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error || 'Could not record attendance check-in.'
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: result.message ||
                    'Geo-tagged check-in submitted! Awaiting final attendance confirmation from your Community Head.',
                data: result.data
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * GET /api/drives/my-registrations
     */
    static async getMyRegistrations(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const drives = await dbRepository_js_1.DbRepository.getDrives(req.user.id);
            const registeredDrives = drives.filter(d => d.is_registered);
            res.status(200).json({
                success: true,
                data: registeredDrives
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.DrivesController = DrivesController;
