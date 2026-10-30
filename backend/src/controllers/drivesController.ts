import { Response } from 'express';
import { store } from '../data/store.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class DrivesController {
  /**
   * GET /api/drives
   */
  public static async getDrives(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const citizenId = req.user?.id;
      const drivesWithStatus = store.drives.map(d => ({
        ...d,
        is_registered: citizenId ? store.driveRegistrations.some(r => r.drive_id === d.id && r.citizen_id === citizenId) : false
      }));

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
      const drive = store.drives.find(d => d.id === id);
      if (!drive) {
        res.status(404).json({ success: false, error: 'Cleanliness drive not found' });
        return;
      }

      const isRegistered = req.user
        ? store.driveRegistrations.some(r => r.drive_id === drive.id && r.citizen_id === req.user!.id)
        : false;

      res.status(200).json({
        success: true,
        data: {
          ...drive,
          is_registered: isRegistered
        }
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
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const drive = store.drives.find(d => d.id === id);
      if (!drive) {
        res.status(404).json({ success: false, error: 'Drive not found' });
        return;
      }

      // Check duplicate
      const alreadyRegistered = store.driveRegistrations.some(
        r => r.drive_id === drive.id && r.citizen_id === req.user!.id
      );

      if (alreadyRegistered) {
        res.status(400).json({
          success: false,
          error: 'You are already registered for this cleanliness drive.'
        });
        return;
      }

      store.driveRegistrations.push({
        drive_id: drive.id,
        citizen_id: req.user.id,
        registered_at: new Date().toISOString()
      });

      drive.registered_volunteers_count += 1;

      // Add in-app notification
      store.notifications.push({
        id: `notif-${Date.now()}`,
        user_id: req.user.id,
        title: 'Drive RSVP Confirmed',
        message: `You successfully registered for "${drive.title}" on ${new Date(drive.start_time).toLocaleDateString()}. Thank you for volunteering!`,
        notification_type: 'drive_reminder',
        reference_id: drive.id,
        is_read: false,
        created_at: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: 'Successfully registered for this cleanliness drive!',
        data: {
          drive_id: drive.id,
          is_registered: true,
          total_volunteers: drive.registered_volunteers_count
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
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const drive = store.drives.find(d => d.id === id);
      if (!drive) {
        res.status(404).json({ success: false, error: 'Drive not found' });
        return;
      }

      const initialLen = store.driveRegistrations.length;
      store.driveRegistrations = store.driveRegistrations.filter(
        r => !(r.drive_id === drive.id && r.citizen_id === req.user!.id)
      );

      if (store.driveRegistrations.length < initialLen) {
        drive.registered_volunteers_count = Math.max(0, drive.registered_volunteers_count - 1);
      }

      res.status(200).json({
        success: true,
        message: 'Registration cancelled',
        data: {
          drive_id: drive.id,
          is_registered: false,
          total_volunteers: drive.registered_volunteers_count
        }
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

      const registeredDriveIds = store.driveRegistrations
        .filter(r => r.citizen_id === req.user!.id)
        .map(r => r.drive_id);

      const registeredDrives = store.drives
        .filter(d => registeredDriveIds.includes(d.id))
        .map(d => ({ ...d, is_registered: true }));

      res.status(200).json({
        success: true,
        data: registeredDrives
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
