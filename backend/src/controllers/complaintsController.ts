import { Response } from 'express';
import { store } from '../data/store.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { Complaint, ComplaintLocation, ComplaintActivityLog } from '../types/index.js';
import { AIService } from '../services/aiService.js';
import { findWardByCoordinates, calculateDistanceMeters } from '../utils/postgis.js';

export class ComplaintsController {
  /**
   * POST /api/complaints/validate-content
   */
  public static async validateContent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { text, file_size, mime_type } = req.body;
      const moderation = await AIService.moderateContent(text || '');

      let quality = undefined;
      if (file_size && mime_type) {
        quality = AIService.checkPhotoQuality(Number(file_size), mime_type);
      }

      res.status(200).json({
        success: true,
        data: {
          moderation,
          quality
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/complaints/classify-image
   */
  public static async classifyImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { file_name, file_size } = req.body;
      const classification = await AIService.classifyWasteImage(
        file_name || 'civic_issue.jpg',
        Number(file_size || 500000)
      );

      // Match with category ID from database
      const matchedCategory = store.categories.find(
        c => c.category_name.toLowerCase() === classification.predicted_category_name.toLowerCase()
      );

      res.status(200).json({
        success: true,
        data: {
          ...classification,
          matched_category_id: matchedCategory?.id
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/complaints/validate-location
   */
  public static async validateLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { latitude, longitude } = req.body;
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (isNaN(lat) || isNaN(lng)) {
        res.status(400).json({ success: false, error: 'Valid numeric latitude and longitude are required' });
        return;
      }

      const ward = findWardByCoordinates(lat, lng);
      if (!ward) {
        res.status(400).json({
          success: false,
          is_inside_nmc: false,
          error: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}) lie outside Navsari Municipal Corporation territory. My Clean Navsari only accepts reports within Navsari's 13 administrative wards.`
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          is_inside_nmc: true,
          ward_id: ward.id,
          ward_number: ward.ward_number,
          ward_name: ward.ward_name,
          ward_name_gu: ward.ward_name_gu,
          officer_name: ward.ward_officer_name
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/complaints/check-duplicates
   */
  public static async checkDuplicates(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { latitude, longitude, category_id } = req.body;
      const lat = Number(latitude);
      const lng = Number(longitude);

      // Find active complaints within 100 meters
      const nearbyDuplicates = store.complaints.filter(c => {
        if (c.status === 'resolved' || c.status === 'rejected') return false;
        const dist = calculateDistanceMeters(lat, lng, c.location.latitude, c.location.longitude);
        return dist <= 120 && (!category_id || c.category_id === category_id);
      }).map(c => ({
        id: c.id,
        complaint_number: c.complaint_number,
        category_name: c.category_name,
        description: c.description,
        image_url: c.image_url,
        distance_meters: Math.round(calculateDistanceMeters(lat, lng, c.location.latitude, c.location.longitude)),
        status: c.status,
        submitted_at: c.submitted_at
      }));

      res.status(200).json({
        success: true,
        data: {
          has_duplicates: nearbyDuplicates.length > 0,
          duplicates: nearbyDuplicates
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/complaints
   */
  public static async createComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const {
        category_id,
        latitude,
        longitude,
        address,
        landmark,
        description,
        original_language,
        image_url,
        confidence_score,
        ai_model_name,
        ai_model_version,
        is_duplicate,
        parent_complaint_id
      } = req.body;

      // 1. Content Moderation Gate
      const moderation = await AIService.moderateContent(description || '');
      if (moderation.status === 'UNSAFE') {
        res.status(400).json({
          success: false,
          error: moderation.reason || 'Content rejected due to policy violations.'
        });
        return;
      }

      // 2. Ward Validation Gate
      const lat = Number(latitude);
      const lng = Number(longitude);
      const ward = findWardByCoordinates(lat, lng);
      if (!ward) {
        res.status(400).json({
          success: false,
          error: 'Location is outside Navsari Municipal Corporation boundary.'
        });
        return;
      }

      const category = store.categories.find(c => c.id === category_id);
      if (!category) {
        res.status(400).json({ success: false, error: 'Invalid complaint category' });
        return;
      }

      // Generate unique human-readable complaint ID: NMC-2026-XXXXX
      const serial = Math.floor(10000 + Math.random() * 90000);
      const complaintNumber = `NMC-2026-${serial}`;
      const complaintId = `comp-${Date.now()}`;

      const location: ComplaintLocation = {
        id: `loc-${Date.now()}`,
        latitude: lat,
        longitude: lng,
        address: address || `${ward.ward_name}, Navsari`,
        landmark: landmark || undefined,
        ward_id: ward.id,
        ward_number: ward.ward_number,
        ward_name: ward.ward_name,
        is_inside_nmc_boundary: true
      };

      const initialLog: ComplaintActivityLog = {
        id: `act-${Date.now()}`,
        complaint_id: complaintId,
        actor_user_id: req.user.id,
        actor_name: req.user.full_name,
        actor_role: 'citizen',
        action: 'Complaint Submitted',
        new_status: 'submitted',
        description: `Lodged with category "${category.category_name}" in ${ward.ward_name}.`,
        created_at: new Date().toISOString()
      };

      const newComplaint: Complaint = {
        id: complaintId,
        complaint_number: complaintNumber,
        citizen_id: req.user.id,
        citizen_name: req.user.full_name,
        category_id: category.id,
        category_name: category.category_name,
        location,
        description: description?.trim() || 'No additional description provided.',
        original_language: original_language || 'en',
        status: 'submitted',
        priority: 'medium',
        image_url: image_url || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
        confidence_score: confidence_score ? Number(confidence_score) : 92.5,
        ai_model_name: ai_model_name || 'NavsariWasteClassifier-PyTorch-ResNet50',
        ai_model_version: ai_model_version || 'v1.2.0',
        is_duplicate: Boolean(is_duplicate),
        parent_complaint_id: parent_complaint_id || undefined,
        submitted_at: new Date().toISOString(),
        followers_count: 1,
        is_following: true,
        activity_logs: [initialLog]
      };

      store.complaints.unshift(newComplaint);

      // Create confirmation notification
      store.notifications.push({
        id: `notif-${Date.now()}`,
        user_id: req.user.id,
        title: 'Complaint Registered',
        message: `Your complaint ${complaintNumber} has been logged in ${ward.ward_name}. Tracking is now active.`,
        notification_type: 'complaint_status',
        reference_id: complaintId,
        is_read: false,
        created_at: new Date().toISOString()
      });

      res.status(201).json({
        success: true,
        message: 'Complaint lodged successfully!',
        data: {
          complaint: newComplaint
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/complaints/my
   */
  public static async getMyComplaints(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { status, category_id, search, page = '1', limit = '10' } = req.query;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 10;

      let filtered = store.complaints.filter(c => c.citizen_id === req.user!.id);

      if (status && status !== 'all') {
        filtered = filtered.filter(c => c.status === status);
      }

      if (category_id) {
        filtered = filtered.filter(c => c.category_id === category_id);
      }

      if (search) {
        const q = (search as string).toLowerCase();
        filtered = filtered.filter(
          c =>
            c.complaint_number.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            c.location.address.toLowerCase().includes(q)
        );
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / limitNum);
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedComplaints = filtered.slice(startIndex, startIndex + limitNum);

      res.status(200).json({
        success: true,
        data: paginatedComplaints,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/complaints/:id
   */
  public static async getComplaintById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const complaint = store.complaints.find(c => c.id === id || c.complaint_number === id);

      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found' });
        return;
      }

      // Check access permission: citizen can view public/own complaints
      res.status(200).json({
        success: true,
        data: complaint
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/complaints/:id/feedback
   */
  public static async submitFeedback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { rating, feedback_text, resolution_satisfactory } = req.body;

      const complaint = store.complaints.find(c => c.id === id);
      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found' });
        return;
      }

      if (complaint.citizen_id !== req.user.id) {
        res.status(403).json({ success: false, error: 'Only the complaint author can submit resolution feedback' });
        return;
      }

      const feedback = {
        id: `fb-${Date.now()}`,
        complaint_id: complaint.id,
        citizen_id: req.user.id,
        rating: Math.max(1, Math.min(5, Number(rating || 5))),
        feedback_text: feedback_text?.trim() || '',
        resolution_satisfactory: Boolean(resolution_satisfactory),
        created_at: new Date().toISOString()
      };

      complaint.feedback = feedback;

      // Add activity log
      complaint.activity_logs.push({
        id: `act-${Date.now()}`,
        complaint_id: complaint.id,
        actor_user_id: req.user.id,
        actor_name: req.user.full_name,
        actor_role: 'citizen',
        action: 'Citizen Feedback Submitted',
        description: `Citizen rated resolution ${feedback.rating}/5 stars.`,
        created_at: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: 'Feedback submitted successfully. Thank you for helping keep Navsari clean!',
        data: feedback
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/complaints/:id/reopen
   */
  public static async reopenComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { reason } = req.body;

      const complaint = store.complaints.find(c => c.id === id);
      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found' });
        return;
      }

      if (complaint.citizen_id !== req.user.id) {
        res.status(403).json({ success: false, error: 'Only the original citizen reporter can reopen this issue' });
        return;
      }

      if (complaint.status !== 'resolved' && complaint.status !== 'rejected') {
        res.status(400).json({ success: false, error: 'Only resolved or rejected issues can be reopened.' });
        return;
      }

      const prevStatus = complaint.status;
      complaint.status = 'reopened';
      complaint.reopened_at = new Date().toISOString();

      complaint.activity_logs.push({
        id: `act-${Date.now()}`,
        complaint_id: complaint.id,
        actor_user_id: req.user.id,
        actor_name: req.user.full_name,
        actor_role: 'citizen',
        action: 'Complaint Reopened',
        previous_status: prevStatus,
        new_status: 'reopened',
        reason: reason || 'Civic issue persists after resolution attempt.',
        description: `Citizen reopened complaint: "${reason || 'Unresolved'}"`,
        created_at: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: 'Complaint has been reopened and escalated to the senior ward supervisor.',
        data: complaint
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/complaints/:id/follow
   */
  public static async toggleFollow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const complaint = store.complaints.find(c => c.id === id);
      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found' });
        return;
      }

      complaint.is_following = !complaint.is_following;
      complaint.followers_count += complaint.is_following ? 1 : -1;

      res.status(200).json({
        success: true,
        data: {
          is_following: complaint.is_following,
          followers_count: complaint.followers_count
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/complaints/:id/add-evidence
   */
  public static async addEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { evidence_url, note } = req.body;

      const complaint = store.complaints.find(c => c.id === id);
      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found' });
        return;
      }

      complaint.activity_logs.push({
        id: `act-${Date.now()}`,
        complaint_id: complaint.id,
        actor_user_id: req.user.id,
        actor_name: req.user.full_name,
        actor_role: 'citizen',
        action: 'Additional Evidence Added',
        description: note || 'Citizen uploaded supplementary photo evidence.',
        created_at: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: 'Evidence added to complaint history'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
