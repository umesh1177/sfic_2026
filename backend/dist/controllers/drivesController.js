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
     * Prevents duplicate registration and enforces max volunteer capacity
     */
    static async registerForDrive(req, res) {
        try {
            const citizenId = req.user?.id || 'c0000000-0000-0000-0000-000000000001';
            const { id } = req.params;
            const result = await dbRepository_js_1.DbRepository.registerForDrive(id, citizenId, {
                fullName: req.user?.full_name,
                phone: req.user?.phone,
                email: req.user?.email
            });
            if (!result.success) {
                res.status(400).json({
                    success: false,
                    error: result.error || 'Unable to register for this cleanliness drive.'
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: result.autoClosed
                    ? 'Successfully registered! Volunteer capacity is now full and registrations have automatically closed.'
                    : 'Successfully registered for this cleanliness drive and recorded in database!',
                data: {
                    drive_id: id,
                    is_registered: true,
                    registered_volunteers_count: result.registeredCount,
                    max_volunteers: result.maxVolunteers,
                    registration_status: result.autoClosed ? 'closed' : 'open'
                }
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * GET /api/drives/:id/questions
     * Returns all citizen questions and official Community Head replies for a drive
     */
    static async getDriveQuestions(req, res) {
        try {
            const { id } = req.params;
            const result = await dbRepository_js_1.DbRepository.getActivityQuestions('', { activityId: id, limit: 100 });
            res.status(200).json({
                success: true,
                data: result.questions,
                total: result.total
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
     */
    static async markAttendance(req, res) {
        try {
            const { id } = req.params;
            const citizenId = req.user?.id || 'c0000000-0000-0000-0000-000000000001';
            const { latitude, longitude } = req.body;
            const result = await dbRepository_js_1.DbRepository.markDriveAttendance(id, citizenId, latitude, longitude);
            res.status(200).json({
                success: true,
                message: '✓ Attendance verified and marked present! Official participation certificate issued.',
                data: result
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
    /**
     * DELETE /api/drives/:id
     */
    static async deleteDrive(req, res) {
        try {
            const { id } = req.params;
            await dbRepository_js_1.DbRepository.deleteDrive(id);
            res.status(200).json({
                success: true,
                message: 'Cleanliness drive deleted successfully from all systems.'
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.DrivesController = DrivesController;
