import { Response } from 'express';
import { DbRepository } from '../data/dbRepository.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class WorkerController {

  // =========================================================================
  // Helper: Resolve Worker ID
  // =========================================================================
  private static async getWorkerIdFromRequest(req: AuthenticatedRequest): Promise<{ workerId: string; userId: string }> {
    const userId = req.user?.id || 'f1000000-0000-0000-0000-000000000001';
    const profile = await DbRepository.getWorkerProfileByUserId(userId);
    const workerId = profile?.id || 'f2000000-0000-0000-0000-000000000001';
    return { workerId, userId };
  }

  // =========================================================================
  // 1. Worker Profile
  // =========================================================================
  public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = await WorkerController.getWorkerIdFromRequest(req);
      const profile = await DbRepository.getWorkerProfileByUserId(userId);
      if (!profile) {
        res.status(404).json({ success: false, error: 'Worker profile not found' });
        return;
      }
      res.status(200).json({ success: true, data: profile });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 2. Dashboard Summary
  // =========================================================================
  public static async getDashboardSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workerId } = await WorkerController.getWorkerIdFromRequest(req);
      const summary = await DbRepository.getWorkerDashboardSummary(workerId);
      res.status(200).json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 3. Worker Assignments
  // =========================================================================
  public static async getAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workerId } = await WorkerController.getWorkerIdFromRequest(req);
      const status = req.query.status as string;

      const assignments = await DbRepository.getWorkerAssignments(workerId, status);
      res.status(200).json({
        success: true,
        data: assignments,
        count: assignments.length
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getAssignmentDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workerId } = await WorkerController.getWorkerIdFromRequest(req);
      const { id } = req.params;

      const assignment = await DbRepository.getAssignmentById(id, workerId);
      if (!assignment) {
        res.status(404).json({ success: false, error: 'Assignment not found' });
        return;
      }

      const teamMembers = await DbRepository.getAssignmentTeamMembers(id);

      res.status(200).json({
        success: true,
        data: {
          ...assignment,
          team_members: teamMembers
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async acknowledgeAssignment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workerId } = await WorkerController.getWorkerIdFromRequest(req);
      const { id } = req.params;

      const success = await DbRepository.acknowledgeAssignment(id, workerId);
      res.status(200).json({
        success,
        message: 'Assignment acknowledged successfully'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 4. GPS Geofence-Validated Attendance
  // =========================================================================
  public static async markAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workerId } = await WorkerController.getWorkerIdFromRequest(req);
      const {
        assignment_id,
        latitude,
        longitude,
        gps_accuracy_meters
      } = req.body;

      if (!assignment_id || latitude === undefined || longitude === undefined) {
        res.status(400).json({
          success: false,
          error: 'assignment_id, latitude, and longitude are required'
        });
        return;
      }

      const result = await DbRepository.recordWorkerAttendance(
        assignment_id,
        workerId,
        parseFloat(latitude),
        parseFloat(longitude),
        gps_accuracy_meters ? parseFloat(gps_accuracy_meters) : 12.0
      );

      res.status(201).json({
        success: result.success,
        message: result.message,
        data: result.attendance
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async requestAttendanceException(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workerId } = await WorkerController.getWorkerIdFromRequest(req);
      const {
        assignment_id,
        reason,
        evidence_photo_url
      } = req.body;

      if (!assignment_id || !reason) {
        res.status(400).json({
          success: false,
          error: 'assignment_id and reason are required'
        });
        return;
      }

      const exceptionRecord = await DbRepository.createAttendanceException(
        assignment_id,
        workerId,
        reason,
        evidence_photo_url
      );

      res.status(201).json({
        success: true,
        message: 'Attendance exception submitted to Ward Officer for authorization',
        data: exceptionRecord
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getAttendanceHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workerId } = await WorkerController.getWorkerIdFromRequest(req);
      const history = await DbRepository.getWorkerAttendanceHistory(workerId);
      res.status(200).json({
        success: true,
        data: history
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 5. Work Progress Updates
  // =========================================================================
  public static async addProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workerId } = await WorkerController.getWorkerIdFromRequest(req);
      const { id } = req.params; // assignment_id
      const {
        comment,
        stage,
        photo_url
      } = req.body;

      if (!comment) {
        res.status(400).json({
          success: false,
          error: 'Comment / progress description is required'
        });
        return;
      }

      const update = await DbRepository.addWorkProgress(
        id,
        workerId,
        comment,
        stage || 'ongoing',
        photo_url
      );

      res.status(201).json({
        success: true,
        message: 'Progress update logged successfully',
        data: update
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 6. Before & After Evidence
  // =========================================================================
  public static async uploadEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workerId } = await WorkerController.getWorkerIdFromRequest(req);
      const { id } = req.params; // assignment_id
      const {
        stage, // 'before' | 'during' | 'after'
        photo_url,
        latitude,
        longitude,
        description,
        gps_accuracy
      } = req.body;

      if (!stage || !photo_url) {
        res.status(400).json({
          success: false,
          error: 'stage (before|during|after) and photo_url are required'
        });
        return;
      }

      const evidence = await DbRepository.addWorkEvidence(
        id,
        workerId,
        stage as 'before' | 'during' | 'after',
        photo_url,
        description || `${stage} photographic verification evidence`,
        latitude ? parseFloat(latitude) : undefined,
        longitude ? parseFloat(longitude) : undefined,
        gps_accuracy ? parseFloat(gps_accuracy) : undefined
      );

      res.status(201).json({
        success: true,
        message: `${stage.toUpperCase()} evidence uploaded successfully with location audit`,
        data: evidence
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params; // assignment_id
      const evidence = await DbRepository.getWorkEvidence(id);
      res.status(200).json({
        success: true,
        data: evidence
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 7. Temporary Team Leader Actions (Strictly Authorized per Task)
  // =========================================================================
  public static async submitCompletionReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workerId } = await WorkerController.getWorkerIdFromRequest(req);
      const { id } = req.params; // assignment_id
      const {
        completion_description,
        actual_start_time,
        actual_end_time,
        waste_quantity,
        waste_disposal_destination,
        equipment_used,
        issues_encountered,
        pending_work
      } = req.body;

      // CRITICAL ARCHITECTURAL CHECK: Only temporary Team Leader for this task can submit
      const isLeader = await DbRepository.isWorkerTemporaryLeader(id, workerId);
      if (!isLeader) {
        res.status(403).json({
          success: false,
          error: 'Only the assigned temporary Team Leader for this specific task can submit the consolidated completion report. Please contact your team leader.'
        });
        return;
      }

      const result = await DbRepository.submitWorkCompletionReport(id, workerId, {
        completion_description: completion_description || 'Task completed satisfactorily by assigned team.',
        actual_start_time: actual_start_time || new Date().toISOString(),
        actual_end_time: actual_end_time || new Date().toISOString(),
        waste_quantity,
        waste_disposal_destination,
        equipment_used,
        issues_encountered,
        pending_work
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Work completion report submitted to Ward Officer for final verification',
        data: result.report
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getTeamManagement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workerId } = await WorkerController.getWorkerIdFromRequest(req);
      const { id } = req.params; // assignment_id

      // Check if temporary leader for this task
      const isLeader = await DbRepository.isWorkerTemporaryLeader(id, workerId);
      if (!isLeader) {
        res.status(403).json({
          success: false,
          error: 'Access restricted: Team management coordination is only accessible to the temporary Team Leader for this task.'
        });
        return;
      }

      const assignment = await DbRepository.getAssignmentById(id, workerId);
      const teamMembers = await DbRepository.getAssignmentTeamMembers(id);

      res.status(200).json({
        success: true,
        data: {
          assignment,
          team_members: teamMembers
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 8. Designations, Skills & Directory
  // =========================================================================
  public static async getDesignations(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const designations = await DbRepository.getWorkerDesignations();
      res.status(200).json({ success: true, data: designations });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getWorkersDirectory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const wardId = req.query.ward_id as string;
      const designationId = req.query.designation_id as string;

      const workers = await DbRepository.getWorkersDirectory({ ward_id: wardId, designation_id: designationId });
      res.status(200).json({ success: true, data: workers });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
