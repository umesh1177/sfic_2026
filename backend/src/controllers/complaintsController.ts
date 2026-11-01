import { Response } from 'express';
import { store } from '../data/store.js';
import { DbRepository } from '../data/dbRepository.js';
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
      const { text, file_size, mime_type, image_base64 } = req.body;
      const moderation = await AIService.moderateContent(text || '', image_base64);

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
      const { file_name, file_size, description, image_base64 } = req.body;
      const classification = await AIService.classifyWasteImage(
        file_name || 'civic_issue.jpg',
        Number(file_size || 500000),
        description,
        image_base64
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

      const allComplaints = await DbRepository.getComplaints();

      // Find active complaints within 120 meters
      const nearbyDuplicates = allComplaints.filter(c => {
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

      // 2. Ward Resolution
      const lat = Number(latitude);
      const lng = Number(longitude);
      const ward = findWardByCoordinates(lat, lng);

      const category = store.categories.find(c => c.id === category_id);
      if (!category) {
        res.status(400).json({ success: false, error: 'Invalid complaint category' });
        return;
      }

      // Generate unique human-readable complaint ID: NMC-2026-XXXXX
      const serial = Math.floor(10000 + Math.random() * 90000);
      const complaintNumber = `NMC-2026-${serial}`;

      const newComplaint = await DbRepository.createComplaint({
        complaint_number: complaintNumber,
        citizen_id: req.user.id,
        citizen_name: req.user.full_name,
        citizen_phone: req.user.phone || '+919876543210',
        category_id: category.id,
        category_name: category.category_name,
        description: description?.trim() || 'No additional description provided.',
        original_language: original_language || 'en',
        image_url: image_url || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
        latitude: lat,
        longitude: lng,
        address: address || `${ward.ward_name}, Navsari`,
        landmark: landmark || undefined,
        ward_id: ward.id,
        ward_number: ward.ward_number,
        ward_name: ward.ward_name,
        assigned_officer_name: ward.ward_officer_name || 'Ramesh Patel (Chief Sanitary Inspector)',
        status: 'submitted',
        priority: 'medium',
        is_urgent: false,
        confidence_score: confidence_score ? Number(confidence_score) : 0.95,
        ai_model_name: ai_model_name || 'NavsariWasteClassifier-PyTorch-ResNet50',
        ai_model_version: ai_model_version || 'v1.3.0'
      });

      // Create confirmation notification in database
      await DbRepository.getNotifications(req.user.id).catch(() => {});
      store.notifications.push({
        id: `notif-${Date.now()}`,
        user_id: req.user.id,
        title: 'Complaint Registered',
        message: `Your complaint ${complaintNumber} has been logged in ${ward.ward_name}. Tracking is now active.`,
        notification_type: 'complaint_status',
        reference_id: newComplaint.id,
        is_read: false,
        created_at: new Date().toISOString()
      });

      res.status(201).json({
        success: true,
        message: 'Complaint lodged successfully and saved to municipal database!',
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

      const complaints = await DbRepository.getComplaints({
        citizen_id: req.user.id,
        status: status as string,
        category_id: category_id as string,
        search: search as string
      });

      const total = complaints.length;
      const totalPages = Math.ceil(total / limitNum);
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedComplaints = complaints.slice(startIndex, startIndex + limitNum);

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
      const complaint = await DbRepository.getComplaintById(id);

      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: complaint
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * DELETE /api/complaints/:id
   */
  public static async deleteComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const deleted = await DbRepository.deleteComplaint(id);

      if (!deleted) {
        res.status(404).json({ success: false, error: 'Complaint not found or already deleted' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Complaint deleted successfully from database'
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

      await DbRepository.submitFeedback(
        id,
        req.user.id,
        Math.max(1, Math.min(5, Number(rating || 5))),
        feedback_text?.trim() || '',
        Boolean(resolution_satisfactory)
      );

      res.status(200).json({
        success: true,
        message: 'Feedback submitted and recorded in database. Thank you for helping keep Navsari clean!',
        data: {
          complaint_id: id,
          rating,
          feedback_text,
          resolution_satisfactory
        }
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

      const complaint = await DbRepository.reopenComplaint(id, reason || 'Unresolved civic problem');
      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Complaint has been reopened and updated in database.',
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
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const result = await DbRepository.toggleFollow(id, req.user.id);

      res.status(200).json({
        success: true,
        data: result
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
      const { note } = req.body;

      await DbRepository.addEvidence(id, req.user.full_name || 'Citizen', note);

      res.status(200).json({
        success: true,
        message: 'Evidence added to complaint history'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
