import { Response } from 'express';
import { store } from '../data/store.js';
import { DbRepository } from '../data/dbRepository.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class DrivesController {
  /**
   * GET /api/drives
   */
  public static async getDrives(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const citizenId = req.user?.id;
      const drivesWithStatus = await DbRepository.getDrives(citizenId);

      res.status(200).json({
        success: true,
        data: drivesWithStatus
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/drives/:id
   */
  public static async getDriveById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const citizenId = req.user?.id;
      const drives = await DbRepository.getDrives(citizenId);
      const drive = drives.find(d => d.id === id);

      if (!drive) {
        res.status(404).json({ success: false, error: 'Cleanliness drive not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: drive
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/drives/:id/register
   * Prevents duplicate registration
   */
  public static async registerForDrive(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const citizenId = req.user?.id || 'c0000000-0000-0000-0000-000000000001';
      const { id } = req.params;
      await DbRepository.registerForDrive(id, citizenId);

      res.status(200).json({
        success: true,
        message: 'Successfully registered for this cleanliness drive and recorded in database!',
        data: {
          drive_id: id,
          is_registered: true
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * DELETE /api/drives/:id/register
   */
  public static async cancelRegistration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const citizenId = req.user?.id || 'c0000000-0000-0000-0000-000000000001';
      const { id } = req.params;
      await DbRepository.cancelDriveRegistration(id, citizenId);

      res.status(200).json({
        success: true,
        message: 'Registration cancelled successfully in database.',
        data: {
          drive_id: id,
          is_registered: false
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/drives/:id/attendance
   */
  public static async markAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const citizenId = req.user?.id || 'c0000000-0000-0000-0000-000000000001';
      const { latitude, longitude } = req.body;

      const result = await DbRepository.markDriveAttendance(id, citizenId, latitude, longitude);

      res.status(200).json({
        success: true,
        message: '✓ Attendance verified and marked present! 150 Civic Karma points awarded.',
        data: result
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/drives/my-registrations
   */
  public static async getMyRegistrations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const drives = await DbRepository.getDrives(req.user.id);
      const registeredDrives = drives.filter(d => d.is_registered);

      res.status(200).json({
        success: true,
        data: registeredDrives
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
