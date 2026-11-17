import { Request, Response } from 'express';
import { DbRepository } from '../data/dbRepository.js';
import { store } from '../data/store.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { AIService } from '../services/aiService.js';
import { findWardByCoordinates } from '../utils/postgis.js';

export class CommunityHeadController {

  // =========================================================================
  // 1. COMMUNITY PROFILE
  // =========================================================================

  public static async getMyCommunity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';
      const community = await DbRepository.getCommunityByUserId(userId);
      res.status(200).json({ success: true, data: community });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateCommunity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await DbRepository.updateCommunity(id, req.body);
      res.status(200).json({ success: true, data: updated, message: 'Community profile updated successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 2. ACTIVITY MANAGEMENT
  // =========================================================================

  public static async getActivities(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';
      const community = await DbRepository.getCommunityByUserId(userId);
      const communityId = community?.id || 'b0000000-0000-0000-0000-000000000001';

      const status = req.query.status as string;
      const search = req.query.search as string;
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '15');

      const result = await DbRepository.getCommunityActivities(communityId, { status, search, page, limit });
      res.status(200).json({
        success: true,
        data: result.activities,
        pagination: {
          total: result.total,
          page,
          limit,
          total_pages: Math.ceil(result.total / limit)
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const activity = await DbRepository.getActivityById(id);
      if (!activity) {
        res.status(404).json({ success: false, error: 'Activity not found' });
        return;
      }
      res.status(200).json({ success: true, data: activity });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';
      const community = await DbRepository.getCommunityByUserId(userId);
      const communityId = community?.id || 'b0000000-0000-0000-0000-000000000001';

      // Ward resolution: respect explicitly passed ward_number first!
      let wardNumber = req.body.ward_number ? Number(req.body.ward_number) : undefined;
      let wardId = req.body.ward_id || (wardNumber ? `ward-0${wardNumber}` : undefined);
      let wardName = req.body.ward_name || (wardNumber ? `Ward ${wardNumber}` : undefined);

      if (!wardNumber && req.body.latitude && req.body.longitude) {
        const resolvedWard = findWardByCoordinates(Number(req.body.latitude), Number(req.body.longitude));
        wardId = resolvedWard.id;
        wardNumber = resolvedWard.ward_number;
        wardName = resolvedWard.ward_name;
      }

      if (!wardNumber) {
        wardNumber = community?.ward_number || 3;
        wardId = `ward-0${wardNumber}`;
        wardName = `Ward ${wardNumber}`;
      }

      // Content moderation check
      const modCheck = await AIService.moderateContent(
        `${req.body.title || ''} ${req.body.short_description || ''} ${req.body.detailed_description || ''}`
      );
      if (modCheck.status === 'UNSAFE') {
        res.status(400).json({
          success: false,
          error: modCheck.reason || 'Content rejected due to inappropriate words or policy violation.'
        });
        return;
      }

      const isDraft = req.body.save_as_draft === true;
      const initialApprovalStatus = isDraft ? 'draft' : 'pending_officer_review';

      const created = await DbRepository.createCommunityActivity({
        ...req.body,
        community_id: communityId,
        created_by: userId,
        ward_id: wardId,
        ward_number: wardNumber,
        ward_name: wardName,
        publication_status: isDraft ? 'draft' : 'draft',
        approval_status: initialApprovalStatus as any,
        registration_status: 'not_open',
        event_status: 'upcoming'
      });

      // If submitted for officer review, dispatch notification to Ward Officer
      if (!isDraft) {
        await DbRepository.createNotification(
          `ward-officer-${wardNumber}`,
          'New Cleanliness Drive Proposed',
          `Community "${community?.community_name || 'Action Team'}" submitted "${req.body.title}" in Ward ${wardNumber} for your review and approval.`,
          created.id,
          'drive_submitted'
        );
      }

      res.status(201).json({
        success: true,
        data: created,
        message: isDraft
          ? 'Cleanliness activity saved as draft.'
          : 'Cleanliness activity submitted for official Ward Officer approval!'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await DbRepository.updateCommunityActivity(id, req.body);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Activity not found' });
        return;
      }
      res.status(200).json({ success: true, data: updated, message: 'Activity details updated successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async deleteActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await DbRepository.deleteCommunityActivity(id);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Activity not found or already deleted' });
        return;
      }
      res.status(200).json({ success: true, message: 'Activity draft deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async submitForApproval(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';

      const activity = await DbRepository.changeActivityStatus(
        id,
        { approval_status: 'ward_review' },
        userId,
        'Submitted by Community Head for official Ward Officer approval'
      );

      res.status(200).json({
        success: true,
        data: activity,
        message: 'Activity submitted to Ward Sanitary Officer for route & resource review.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async publishActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';

      const act = await DbRepository.getActivityById(id);
      if (act && act.approval_status !== 'nmc_admin_approved' && act.approval_status !== 'ward_approved') {
        res.status(400).json({
          success: false,
          error: 'Cannot publish activity before receiving official Ward Officer and NMC Admin approvals.'
        });
        return;
      }

      const activity = await DbRepository.changeActivityStatus(
        id,
        { publication_status: 'published' },
        userId,
        'Activity published publicly on Swachh Setu platform'
      );

      res.status(200).json({ success: true, data: activity, message: 'Activity published successfully!' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async openRegistration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';

      const activity = await DbRepository.changeActivityStatus(
        id,
        { registration_status: 'open', publication_status: 'published' },
        userId,
        'Citizen registration opened by Community Head'
      );

      res.status(200).json({ success: true, data: activity, message: 'Citizen registration is now OPEN!' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async closeRegistration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';

      const activity = await DbRepository.changeActivityStatus(
        id,
        { registration_status: 'closed' },
        userId,
        'Registration closed by Community Head'
      );

      res.status(200).json({ success: true, data: activity, message: 'Registration closed.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async reopenRegistration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';

      const activity = await DbRepository.changeActivityStatus(
        id,
        { registration_status: 'reopened' },
        userId,
        'Registration reopened by Community Head'
      );

      res.status(200).json({ success: true, data: activity, message: 'Registration reopened for additional volunteers.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async cancelActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';

      const activity = await DbRepository.changeActivityStatus(
        id,
        { event_status: 'cancelled', registration_status: 'cancelled' },
        userId,
        `Activity cancelled: ${reason || 'Cancelled by community organiser'}`
      );

      res.status(200).json({ success: true, data: activity, message: 'Activity has been cancelled.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getActivityApprovals(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const logs = await DbRepository.getActivityApprovalLogs(id);
      res.status(200).json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async officerReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role, decision, comments, stage } = req.body;
      const userId = req.user?.id || (role === 'ward_officer' ? 'd0000000-0000-0000-0000-000000000003' : 'a0000000-0000-0000-0000-000000000001');

      const log = await DbRepository.recordActivityApproval(
        id,
        userId,
        role || 'ward_officer',
        stage || (role === 'ward_officer' ? 'ward_officer_review' : 'nmc_admin_review'),
        decision || 'approved',
        comments || 'Approved by municipal official'
      );

      res.status(200).json({ success: true, data: log, message: `Review recorded: ${decision.toUpperCase()}` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 3. REGISTRATIONS & ATTENDANCE
  // =========================================================================

  public static async getRegistrations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const status = req.query.status as string;
      const attendance = req.query.attendance as string;
      const search = req.query.search as string;
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '20');

      const result = await DbRepository.getActivityRegistrations(id, { status, attendance, search, page, limit });
      res.status(200).json({
        success: true,
        data: result.registrations,
        pagination: {
          total: result.total,
          page,
          limit,
          total_pages: Math.ceil(result.total / limit)
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async exportRegistrationsCsv(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await DbRepository.getActivityRegistrations(id, { limit: 1000 });
      const act = await DbRepository.getActivityById(id);

      let csv = 'Registration ID,Citizen Name,Mobile Number,Email,Registration Status,Attendance Status,Registered Date\n';
      result.registrations.forEach(r => {
        csv += `"${r.registration_number}","${r.citizen_name || 'Citizen'}","${r.citizen_phone || 'N/A'}","${r.citizen_email || 'N/A'}","${r.registration_status}","${r.attendance_status}","${new Date(r.registered_at).toLocaleString()}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="navsari_event_volunteers_${id.slice(0, 8)}.csv"`);
      res.status(200).send(csv);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params; // registration_id
      const { attendance_status, registration_status } = req.body;

      // Resolve logged-in Community Head's community ID so in Joint Drives only the respective Community Head marks their citizens
      let actingCommunityId: string | undefined;
      if (req.user?.role === 'community_head' && req.user?.id) {
        const comm = await DbRepository.getCommunityByUserId(req.user.id);
        actingCommunityId = comm?.id;
      }

      const result = await DbRepository.updateRegistrationAttendance(
        id,
        attendance_status,
        registration_status,
        actingCommunityId
      );

      if (!result.success) {
        res.status(403).json({ success: false, error: result.error || 'Not authorized to update this volunteer.' });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data,
        message:
          attendance_status === 'present'
            ? 'Final attendance confirmed as PRESENT! Citizen has been notified.'
            : 'Attendance status updated.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 4. CITIZEN QUESTIONS WITH AI CHATBOT SUGGESTIONS
  // =========================================================================

  public static async createQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params; // activity_id or officer-created problem/drive id
      const { question_text, language, question_language } = req.body;
      const lang = language || question_language || 'en';
      const citizenId = req.user?.id || 'c0000000-0000-0000-0000-000000000001';

      if (!question_text || !question_text.trim()) {
        res.status(400).json({ success: false, error: 'Question text is required' });
        return;
      }

      const act = await DbRepository.getActivityById(id);
      const prob = !act ? (store.communityProblems || []).find(p => p.id === id) : null;
      const drv = (!act && !prob) ? (store.drives || []).find(d => d.id === id) : null;

      if (!act && !prob && !drv) {
        res.status(404).json({ success: false, error: 'Cleanliness drive not found' });
        return;
      }

      const targetCommunityId =
        act?.community_id ||
        prob?.assigned_communities?.[0]?.community_id ||
        prob?.claimed_by_community_id?.split(',')[0]?.trim() ||
        'b0000000-0000-0000-0000-000000000001';

      // 1. Save question in database / store
      const question = await DbRepository.createActivityQuestion(
        id,
        targetCommunityId,
        citizenId,
        question_text,
        lang
      );

      // 2. Trigger AI answer suggestion generation using approved event context
      const aiSug = await AIService.suggestQuestionAnswer(
        question_text,
        {
          title: act?.title || prob?.title || drv?.title || 'Cleanliness Drive',
          description: act?.detailed_description || prob?.description || drv?.description || '',
          date: act?.proposed_start_at || prob?.start_time || drv?.start_time || '',
          location: act?.address || prob?.location_name || prob?.address || drv?.location_name || '',
          landmark: act?.landmark || prob?.meeting_point,
          instructions: act?.instructions || prob?.citizen_instructions || prob?.action_plan,
          equipment: act?.equipment_requirements || prob?.necessary_gears || prob?.suggested_equipment,
          safety: act?.safety_guidelines || prob?.citizen_instructions,
          faq: act?.faq
        },
        lang
      );

      // 3. Store AI suggestion
      const savedSug = await DbRepository.saveAiAnswerSuggestion(question.id, aiSug);
      question.ai_suggestion = savedSug;
      question.status = 'ai_suggestion_ready';

      res.status(201).json({
        success: true,
        data: question,
        message: 'Question submitted. It has been routed to the Community Head with AI-assisted review.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getQuestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';
      const community = await DbRepository.getCommunityByUserId(userId);
      const communityId = community?.id || 'b0000000-0000-0000-0000-000000000001';

      const status = req.query.status as string;
      const activityId = req.query.activity_id as string;
      const search = req.query.search as string;
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '15');

      const result = await DbRepository.getActivityQuestions(communityId, { status, activityId, search, page, limit });
      res.status(200).json({
        success: true,
        data: result.questions,
        pagination: {
          total: result.total,
          page,
          limit,
          total_pages: Math.ceil(result.total / limit)
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const question = await DbRepository.getQuestionById(id);
      if (!question) {
        res.status(404).json({ success: false, error: 'Question not found' });
        return;
      }
      res.status(200).json({ success: true, data: question });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async generateAiSuggestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params; // question_id
      const question = await DbRepository.getQuestionById(id);
      if (!question) {
        res.status(404).json({ success: false, error: 'Question not found' });
        return;
      }

      const act = await DbRepository.getActivityById(question.activity_id);
      const prob = !act ? (store.communityProblems || []).find(p => p.id === question.activity_id) : null;
      const drv = (!act && !prob) ? (store.drives || []).find(d => d.id === question.activity_id) : null;

      const aiSug = await AIService.suggestQuestionAnswer(
        question.question_text,
        {
          title: act?.title || prob?.title || drv?.title || '',
          description: act?.detailed_description || prob?.description || drv?.description || '',
          date: act?.proposed_start_at || prob?.start_time || drv?.start_time || '',
          location: act?.address || prob?.location_name || prob?.address || drv?.location_name || '',
          landmark: act?.landmark || prob?.meeting_point,
          instructions: act?.instructions || prob?.citizen_instructions || prob?.action_plan,
          equipment: act?.equipment_requirements || prob?.necessary_gears || prob?.suggested_equipment,
          safety: act?.safety_guidelines || prob?.citizen_instructions,
          faq: act?.faq
        },
        question.question_language || 'en'
      );

      const saved = await DbRepository.saveAiAnswerSuggestion(id, aiSug);
      res.status(200).json({ success: true, data: saved, message: 'AI suggestion generated' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async respondToQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params; // question_id
      const { response_text, suggestion_id } = req.body;
      const responderId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';

      if (!response_text || !response_text.trim()) {
        res.status(400).json({ success: false, error: 'Response text is required' });
        return;
      }

      const response = await DbRepository.respondToQuestion(id, responderId, response_text, suggestion_id);
      res.status(200).json({
        success: true,
        data: response,
        message: 'Answer delivered to citizen and notification dispatched!'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async closeQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await DbRepository.updateQuestionStatus(id, 'closed');
      res.status(200).json({ success: true, message: 'Question thread marked closed' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 5. EVENT ANNOUNCEMENTS & TARGETED NOTIFICATIONS
  // =========================================================================

  public static async getAnnouncements(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';
      const community = await DbRepository.getCommunityByUserId(userId);
      const communityId = community?.id || 'b0000000-0000-0000-0000-000000000001';
      const activityId = req.query.activity_id as string;

      const announcements = await DbRepository.getActivityAnnouncements(communityId, activityId);
      res.status(200).json({ success: true, data: announcements });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createAnnouncement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params; // activity_id
      const { title, message, notification_category, target_audience, scheduled_at } = req.body;
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';
      const community = await DbRepository.getCommunityByUserId(userId);
      const communityId = community?.id || 'b0000000-0000-0000-0000-000000000001';

      if (!title || !message) {
        res.status(400).json({ success: false, error: 'Announcement title and message are required' });
        return;
      }

      const announcement = await DbRepository.createActivityAnnouncement({
        activity_id: id,
        community_id: communityId,
        created_by: userId,
        title,
        message,
        notification_category,
        target_audience,
        scheduled_at
      });

      res.status(201).json({
        success: true,
        data: announcement,
        message: `Announcement dispatched to ${announcement.total_recipients} eligible registered citizens.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 6. EVENT EVIDENCE & GALLERY
  // =========================================================================

  public static async getEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params; // activity_id
      const evidence = await DbRepository.getActivityEvidence(id);
      res.status(200).json({ success: true, data: evidence });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async uploadEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params; // activity_id or ward problem/drive id
      const {
        evidence_type,
        stage,
        storage_path,
        image_url,
        caption,
        description,
        latitude,
        longitude,
        image_hash
      } = req.body;
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';

      const finalPath = storage_path || image_url;
      const finalType = (evidence_type || stage || 'after') as 'before' | 'during' | 'after';
      const finalCaption = (caption || description || '').trim();

      if (!finalPath || !finalCaption) {
        res.status(400).json({ success: false, error: 'Evidence photograph and caption/description are required' });
        return;
      }

      const ev = await DbRepository.createActivityEvidence({
        activity_id: id,
        uploaded_by: userId,
        evidence_type: finalType,
        storage_path: finalPath,
        caption: finalCaption,
        description: description || finalCaption,
        latitude,
        longitude,
        image_hash
      });

      res.status(201).json({ success: true, data: ev, message: 'Evidence photograph recorded' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async submitEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params; // activity_id or ward problem/drive id
      const { notes } = req.body || {};
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';

      await DbRepository.submitActivityEvidence(id, userId, notes);
      res.status(200).json({
        success: true,
        message: 'Evidence submitted! Review request has been sent to the Ward Officer.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async reviewEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params; // activity_id
      const { role, decision, comments } = req.body;
      const userId = req.user?.id || (role === 'ward_officer' ? 'd0000000-0000-0000-0000-000000000003' : 'a0000000-0000-0000-0000-000000000001');

      await DbRepository.reviewActivityEvidence(id, userId, role || 'ward_officer', decision || 'approved', comments || 'Verified');
      res.status(200).json({ success: true, message: `Evidence verification updated: ${decision.toUpperCase()}` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 7. AI SUITE ENDPOINTS
  // =========================================================================

  public static async generateDescription(req: Request, res: Response): Promise<void> {
    try {
      const { title, activity_category, location, objectives, language } = req.body;
      const draft = await AIService.generateActivityDescription({
        title: title || 'Cleanliness Drive',
        category: activity_category || 'Public Area Cleaning',
        location: location || 'Navsari',
        objectives: objectives || ['Remove plastic waste', 'Promote community segregation'],
        language: language || 'en'
      });
      res.status(200).json({ success: true, data: draft });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async checkEvidenceQuality(req: Request, res: Response): Promise<void> {
    try {
      const { image_url, file_size } = req.body;
      const analysis = await AIService.checkEvidenceQuality(image_url, file_size);
      res.status(200).json({ success: true, data: analysis });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async compareEvidence(req: Request, res: Response): Promise<void> {
    try {
      const { before_url, after_url } = req.body;
      const comparison = await AIService.compareBeforeAfter(before_url, after_url);
      res.status(200).json({ success: true, data: comparison });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getActivityInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';
      const community = await DbRepository.getCommunityByUserId(userId);
      const communityId = community?.id || 'b0000000-0000-0000-0000-000000000001';

      const summary = await DbRepository.getCommunityDashboardSummary(communityId);
      const insights = await AIService.generateCommunityInsights(summary.impact, summary.stats);

      res.status(200).json({ success: true, data: insights });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 8. DASHBOARD OVERVIEW SUMMARY
  // =========================================================================

  public static async getDashboardSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';
      const community = await DbRepository.getCommunityByUserId(userId);
      const communityId = community?.id || 'b0000000-0000-0000-0000-000000000001';

      const summary = await DbRepository.getCommunityDashboardSummary(communityId);
      res.status(200).json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 9. WARD PROBLEMS FOR COMMUNITY ACTION
  // =========================================================================
  public static async getWardProblems(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';
      const community = await DbRepository.getCommunityByUserId(userId);
      // If ward_number is specified (and not 'all'), filter by ward; otherwise return ALL problems across all wards
      const wardQuery = req.query.ward_number as string | undefined;
      const wardNum = wardQuery && wardQuery !== 'all' ? parseInt(wardQuery, 10) : undefined;
      const problems = await DbRepository.getCommunityProblems(wardNum);
      res.status(200).json({ success: true, data: problems });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async claimWardProblem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { activity_id } = req.body;
      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';
      const community = await DbRepository.getCommunityByUserId(userId);
      const commId = community?.id || 'comm-lead';
      const commName = community?.community_name || 'Community Organization';

      await DbRepository.claimCommunityProblem(id, commId, commName, activity_id);
      res.status(200).json({
        success: true,
        message: 'Problem claimed for community drive!'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async requestPlanDrive(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        proposed_volunteers_count,
        proposed_date,
        equipment_available,
        notes
      } = req.body;

      const userId = req.user?.id || 'c0000000-0000-0000-0000-000000000099';
      let community = await DbRepository.getCommunityByUserId(userId);
      if (!community) {
        const all = await DbRepository.getCommunitiesList();
        community = all[0] || null;
      }

      if (!community) {
        res.status(404).json({ success: false, error: 'Community organization not found for this user.' });
        return;
      }

      const driveRequest = await DbRepository.submitDriveRequest(id, {
        communityId: community.id,
        communityName: community.community_name,
        headName: community.head_name || req.user?.full_name || 'Community Leader',
        contactPhone: (community as any).phone || community.contact_phone || (req.user as any)?.phone || '+919825100099',
        proposedVolunteersCount: Number(proposed_volunteers_count) || 15,
        proposedDate: proposed_date || new Date(Date.now() + 86400000 * 3).toISOString(),
        equipmentAvailable: Array.isArray(equipment_available) ? equipment_available : [],
        notes: notes?.trim() || ''
      });

      if (!driveRequest) {
        res.status(404).json({ success: false, error: 'Problem/Drive not found.' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Your request to plan this cleanliness drive has been submitted to the Ward Officer for review!',
        data: driveRequest
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/community/ward-problems/:id/plan-drive
   * Allows approved community to set instructions & necessary gears for citizens
   */
  public static async planDriveForProblem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        citizen_instructions,
        necessary_gears,
        meeting_point,
        emergency_contact
      } = req.body;

      const userId = req.user?.id || 'u0000000-0000-0000-0000-000000000001';
      let community = await DbRepository.getCommunityByUserId(userId);
      if (!community) {
        const all = await DbRepository.getCommunitiesList();
        community = all[0] || null;
      }

      const updated = await DbRepository.updateProblemDrivePlan(id, {
        communityId: community?.id,
        citizenInstructions: citizen_instructions,
        necessaryGears: Array.isArray(necessary_gears) ? necessary_gears : [],
        meetingPoint: meeting_point,
        emergencyContact: emergency_contact
      });

      if (!updated) {
        res.status(404).json({ success: false, error: 'Problem/Drive not found.' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Cleanliness drive instructions and necessary gears successfully published for citizens!',
        data: updated
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

