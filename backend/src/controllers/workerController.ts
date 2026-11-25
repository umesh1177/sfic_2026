import { Response } from 'express';
import { DbRepository } from '../data/dbRepository.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { store } from '../data/store.js';
import { recordAttendanceForAssignment, recordEvidenceForAssignment } from './wardOfficerController.js';

export class WorkerController {

  // =========================================================================
  // Helper: Resolve Worker ID (NEVER fall back to another worker's static ID!)
  // =========================================================================
  private static async getWorkerIdFromRequest(req: AuthenticatedRequest): Promise<{ workerId: string; userId: string; workerName: string }> {
    const userId = req.user?.id || 'f1000000-0000-0000-0000-000000000001';
    const profile = await DbRepository.getWorkerProfileByUserId(userId);
    const workerId = profile?.id || (req.user?.id ? req.user.id : 'f2000000-0000-0000-0000-000000000001');
    const workerName = profile?.full_name || req.user?.full_name || 'Sanitation Worker';
    return { workerId, userId, workerName };
  }

  // Helper: Sync linked complaint status when worker performs attendance / evidence / completion
  private static async syncLinkedComplaintStatus(
    assignmentId: string,
    targetStatus: 'in_progress' | 'awaiting_verification',
    actorName: string,
    note: string,
    notifyTitle?: string,
    notifyMessage?: string
  ): Promise<void> {
    try {
      const assignment: any = await DbRepository.getAssignmentById(assignmentId);
      const memAssignment: any = (store.workAssignments || []).find(wa => wa.id === assignmentId);
      const complaintId = assignment?.complaint_id || memAssignment?.complaint_id;
      const complaintNumber = assignment?.complaint_number || memAssignment?.complaint_number;
      const lookup = complaintId || complaintNumber;
      if (!lookup) return;

      const comp = await DbRepository.getComplaintById(lookup) || (store.complaints || []).find(c => c.id === lookup || c.complaint_number === lookup);
      if (!comp) return;

      // Never downgrade a resolved/rejected complaint
      if (comp.status === 'resolved' || comp.status === 'rejected') return;
      // Don't downgrade awaiting_verification back to in_progress
      if (comp.status === 'awaiting_verification' && targetStatus === 'in_progress') return;

      await DbRepository.updateComplaintStatus(comp.id, targetStatus, {
        name: actorName,
        role: 'worker',
        note
      });

      if (notifyTitle && notifyMessage && comp.citizen_id) {
        await DbRepository.createNotification(
          comp.citizen_id,
          notifyTitle,
          notifyMessage.replace('{complaint_number}', comp.complaint_number),
          comp.id,
          'complaint_status'
        );
      }
    } catch (err: any) {
      console.error('[WorkerController syncLinkedComplaintStatus warning]:', err.message);
    }
  }

  // =========================================================================
  // 1. Worker Profile
  // =========================================================================
  public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = await WorkerController.getWorkerIdFromRequest(req);
      let profile = await DbRepository.getWorkerProfileByUserId(userId);
      if (!profile && req.user) {
        const wardNum = (req.user as any).ward_number || 3;
        profile = {
          id: req.user.id,
          user_id: req.user.id,
          worker_code: (req.user as any).username || `WRK-${req.user.id.slice(0, 6).toUpperCase()}`,
          full_name: req.user.full_name,
          phone: req.user.phone,
          email: req.user.email,
          avatar_url: req.user.avatar_url,
          designation_name: 'Sanitation Worker',
          designation_code: 'sanitation_worker',
          ward_id: `ward-${String(wardNum).padStart(2, '0')}`,
          ward_number: wardNum,
          ward_name: `Ward ${wardNum}`,
          employment_status: 'permanent',
          joining_date: req.user.created_at ? req.user.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          experience_years: 0,
          availability_status: 'available',
          language_preference: req.user.preferred_language || 'gu',
          skills: []
        };
      }
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
  private static async enrichAssignmentWithWorkSla(a: any): Promise<any> {
    let maxWorkDays = Number(a.max_work_days || 0);
    if (!maxWorkDays) {
      let comp: any = null;
      const lookup = a.complaint_id || a.complaint_number;
      if (lookup) {
        comp =
          (await DbRepository.getComplaintById(lookup).catch(() => null)) ||
          (store.complaints || []).find(c => c.id === lookup || c.complaint_number === lookup);
      }
      const cat = comp
        ? (store.categories || []).find(
            c =>
              c.id === comp.category_id ||
              c.category_name.toLowerCase() === String(comp.category_name || '').toLowerCase()
          )
        : (store.categories || []).find(c =>
            String(a.title || '').toLowerCase().includes(c.category_name.toLowerCase().split(' ')[0])
          );
      maxWorkDays = cat?.max_work_days ?? 3;
    }
    const baseTime = new Date(a.created_at || a.scheduled_date || Date.now()).getTime();
    const daysElapsed = Math.max(0, Math.floor((Date.now() - baseTime) / (1000 * 60 * 60 * 24)));
    const isDone = ['verified_complete', 'closed', 'resolved'].includes(String(a.status || '').toLowerCase());
    return {
      ...a,
      max_work_days: maxWorkDays,
      work_days_elapsed: daysElapsed,
      is_work_sla_overdue: !isDone && daysElapsed > maxWorkDays
    };
  }

  public static async getAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workerId } = await WorkerController.getWorkerIdFromRequest(req);
      const status = req.query.status as string;

      const rawAssignments = await DbRepository.getWorkerAssignments(workerId, status);
      const assignments = await Promise.all(
        rawAssignments.map(a => WorkerController.enrichAssignmentWithWorkSla(a))
      );
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
      const enriched = await WorkerController.enrichAssignmentWithWorkSla(assignment);

      res.status(200).json({
        success: true,
        data: {
          ...enriched,
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
  public static async getTodayAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workerId } = await WorkerController.getWorkerIdFromRequest(req);
      const assignmentId = req.query.assignment_id as string | undefined;
      const todayAttendance = await DbRepository.getTodayWorkerAttendance(workerId, assignmentId);
      res.status(200).json({ success: true, data: todayAttendance });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async markAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workerId, workerName } = await WorkerController.getWorkerIdFromRequest(req);
      const {
        assignment_id,
        latitude,
        longitude,
        gps_accuracy_meters,
        action = 'check_in'
      } = req.body;

      if (!assignment_id || latitude === undefined || longitude === undefined) {
        res.status(400).json({
          success: false,
          error: 'assignment_id, latitude, and longitude are required'
        });
        return;
      }

      // Check if assignment was reassigned to another squad
      const assignment = (store.workAssignments || []).find(wa => wa.id === assignment_id);
      if (assignment && (assignment.status === 'reassigned' || assignment.status === 'cancelled')) {
        res.status(403).json({
          success: false,
          error: 'Your squad has been replaced by another team for this complaint. You are no longer authorized to record attendance for this task.'
        });
        return;
      }

      const result = await DbRepository.recordWorkerAttendance(
        assignment_id,
        workerId,
        parseFloat(latitude),
        parseFloat(longitude),
        gps_accuracy_meters ? parseFloat(gps_accuracy_meters) : 12.0,
        action === 'check_out' ? 'check_out' : 'check_in'
      );

      if (result.attendance) {
        recordAttendanceForAssignment(assignment_id, result.attendance);
        if (assignment) {
          if (action === 'check_in') {
            assignment.my_attendance_status = 'verified';
            if (assignment.status === 'assigned') assignment.status = 'in_progress';
          }
          if (assignment.team_members) {
            const mem = assignment.team_members.find((m: any) => m.worker_id === workerId);
            if (mem) {
              mem.assignment_status = action === 'check_out' ? 'completed' : 'present';
              mem.attendance_timestamp = new Date().toISOString();
              mem.validation_status = result.attendance?.validation_status || 'verified_match';
            }
          }
        }
        if (result.success && action === 'check_in') {
          await WorkerController.syncLinkedComplaintStatus(
            assignment_id,
            'in_progress',
            workerName,
            `${workerName} checked in at the site via GPS geofence and started field work.`
          );
        }
      }

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
      const { workerId, workerName } = await WorkerController.getWorkerIdFromRequest(req);
      const { id } = req.params; // assignment_id
      const {
        stage, // 'before' | 'during' | 'after'
        photo_url,
        photos,
        latitude,
        longitude,
        description,
        gps_accuracy
      } = req.body;

      const photoList: string[] = Array.isArray(photos) && photos.length > 0
        ? photos
        : (photo_url ? [photo_url] : []);

      if (!stage || photoList.length === 0) {
        res.status(400).json({
          success: false,
          error: 'stage (before|during|after) and at least one photo (photos array or photo_url) are required'
        });
        return;
      }

      // Check if assignment was reassigned to another squad
      const assignment = (store.workAssignments || []).find(wa => wa.id === id);
      if (assignment && (assignment.status === 'reassigned' || assignment.status === 'cancelled')) {
        res.status(403).json({
          success: false,
          error: 'Your squad has been replaced by another team for this complaint. You are no longer authorized to submit evidence for this task.'
        });
        return;
      }

      const normalizedStage = String(stage).toLowerCase() as 'before' | 'during' | 'after';
      const primaryPhoto = photoList[0];
      const evidence = await DbRepository.addWorkEvidence(
        id,
        workerId,
        normalizedStage,
        primaryPhoto,
        description || `${normalizedStage.toUpperCase()} photographic verification evidence`,
        latitude ? parseFloat(latitude) : undefined,
        longitude ? parseFloat(longitude) : undefined,
        gps_accuracy ? parseFloat(gps_accuracy) : undefined,
        photoList
      );

      if (evidence) {
        evidence.photos = photoList;
        recordEvidenceForAssignment(id, evidence);
        const assignment = (store.workAssignments || []).find(wa => wa.id === id);
        if (assignment) {
          if (normalizedStage === 'before') assignment.has_before_evidence = true;
          if (normalizedStage === 'after') assignment.has_after_evidence = true;
          if (assignment.status === 'assigned') assignment.status = 'in_progress';
        }

        if (normalizedStage === 'after') {
          await WorkerController.syncLinkedComplaintStatus(
            id,
            'awaiting_verification',
            workerName,
            `Team Leader (${workerName}) submitted AFTER-cleanup photo evidence: "${evidence.description}"`,
            'Cleanup Work Completed — Awaiting Officer Verification',
            'The sanitation squad has finished cleaning for complaint {complaint_number} and submitted after-work photo proof for Ward Officer verification.'
          );
        } else {
          await WorkerController.syncLinkedComplaintStatus(
            id,
            'in_progress',
            workerName,
            `Team Leader (${workerName}) uploaded ${normalizedStage.toUpperCase()} field evidence: "${evidence.description}"`
          );
        }
      }

      res.status(201).json({
        success: true,
        message: `${normalizedStage.toUpperCase()} evidence uploaded successfully with location audit`,
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
      const { workerId, workerName } = await WorkerController.getWorkerIdFromRequest(req);
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

      await WorkerController.syncLinkedComplaintStatus(
        id,
        'awaiting_verification',
        workerName,
        `Team Leader (${workerName}) submitted completion report: ${completion_description || 'Site cleared and sanitized.'}`,
        'Completion Report Submitted — Pending Final Verification',
        'Sanitation Team Leader submitted the final completion report for complaint {complaint_number}. Ward Officer will review and verify shortly.'
      );

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
