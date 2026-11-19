import { Response } from 'express';
import { store } from '../data/store.js';
import { DbRepository } from '../data/dbRepository.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { Complaint, ComplaintLocation, ComplaintActivityLog } from '../types/index.js';
import { AIService } from '../services/aiService.js';
import { findWardByCoordinates, calculateDistanceMeters, NAVSARI_WARDS, isPointInPolygon, DEFAULT_NAVSARI_CITY_BOUNDARY } from '../utils/postgis.js';
import { extractExifGeoTagFromBase64 } from '../utils/exifParser.js';

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
      const { file_name, file_size, description, image_base64, visual_features, source } = req.body;
      const classification = await AIService.classifyWasteImage(
        file_name || 'civic_issue.jpg',
        Number(file_size || 500000),
        description,
        image_base64,
        visual_features,
        source === 'live_camera' ? 'live_camera' : 'upload'
      );

      // Match with category ID from database (exact or partial keyword match across all 10 categories)
      const predLower = classification.predicted_category_name.toLowerCase();
      const matchedCategory =
        store.categories.find(c => c.category_name.toLowerCase() === predLower) ||
        store.categories.find(
          c =>
            c.category_name.toLowerCase().includes(predLower.split('/')[0].trim()) ||
            predLower.includes(c.category_name.toLowerCase().split('/')[0].trim())
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

      // Enforce Navsari City Geofence if outside complaints are disabled by Super Admin
      const cityBoundary = store.adminBoundarySettings?.city_boundary || DEFAULT_NAVSARI_CITY_BOUNDARY;
      const isInside = isPointInPolygon([lng, lat], cityBoundary);
      const allowOutside = Boolean(store.adminBoundarySettings?.allow_outside_complaints);

      if (!allowOutside && !isInside) {
        res.status(422).json({
          success: false,
          error: 'Location falls outside Navsari Municipal Corporation jurisdiction. Complaints can only be submitted within official NMC boundaries.',
          data: {
            is_inside_nmc: false,
            allow_outside_complaints: false
          }
        });
        return;
      }

      const allWards = (store.wards && store.wards.length > 0) ? store.wards : NAVSARI_WARDS;
      const ward = findWardByCoordinates(lat, lng, allWards);

      res.status(200).json({
        success: true,
        data: {
          is_inside_nmc: isInside,
          allow_outside_complaints: allowOutside,
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

      const bodyLoc = req.body.location || {};
      const {
        category_id,
        description,
        original_language,
        image_url,
        confidence_score,
        ai_model_name,
        ai_model_version,
        is_duplicate,
        parent_complaint_id,
        is_urgent,
        priority
      } = req.body;

      const latitude = req.body.latitude ?? bodyLoc.latitude;
      const longitude = req.body.longitude ?? bodyLoc.longitude;
      const ward_number = req.body.ward_number ?? bodyLoc.ward_number;
      const ward_id = req.body.ward_id ?? bodyLoc.ward_id;
      const address = req.body.address ?? bodyLoc.address;
      const landmark = req.body.landmark ?? bodyLoc.landmark;

      // 1. Content Moderation Gate
      const moderation = await AIService.moderateContent(description || '');
      if (moderation.status === 'UNSAFE') {
        res.status(400).json({
          success: false,
          error: moderation.reason || 'Content rejected due to policy violations.'
        });
        return;
      }

      // 1b. Non-cleanliness Photo Relevance Gate (Doors, Pets, Furniture, Selfies, etc.)
      if (req.body.is_relevant === false) {
        res.status(400).json({
          success: false,
          error: req.body.relevance_reason || 'Photo rejected: Captured or uploaded image does not appear to show a municipal cleanliness issue.'
        });
        return;
      }

      // 1c. Mandatory EXIF Geo-Tag Gate for Gallery Uploads
      const captureSource = req.body.capture_source || req.body.source || 'live_camera';
      if (captureSource === 'gallery' || captureSource === 'upload') {
        let hasValidGeoTag = Boolean(req.body.photo_geo_tagged);
        if (!hasValidGeoTag && image_url && typeof image_url === 'string' && image_url.startsWith('data:image')) {
          const exifCheck = extractExifGeoTagFromBase64(image_url);
          if (exifCheck.hasGeoTag && exifCheck.latitude && exifCheck.longitude) {
            hasValidGeoTag = true;
          }
        }
        if (!hasValidGeoTag) {
          res.status(400).json({
            success: false,
            error: 'Submission rejected: Gallery photos must contain GPS location metadata (EXIF geo-tag). Please enable GPS in your camera or use the live camera option.'
          });
          return;
        }
      }

      // 2. Navsari Outer Boundary Geofence Enforcement (Configurable by Super Admin)
      let lat = Number(latitude);
      let lng = Number(longitude);

      const allowOutside = Boolean(store.adminBoundarySettings?.allow_outside_complaints);
      const cityBoundary = store.adminBoundarySettings?.city_boundary || DEFAULT_NAVSARI_CITY_BOUNDARY;
      const isInsideCity = !isNaN(lat) && !isNaN(lng) ? isPointInPolygon([lng, lat], cityBoundary) : true;

      if (!allowOutside && !isInsideCity) {
        res.status(400).json({
          success: false,
          error: 'Submission rejected: Selected location is outside official Navsari Municipal Corporation boundaries. Outside complaint submissions are currently disabled by NMC Administration.'
        });
        return;
      }

      // 3. Dynamic Ward Resolution (uses live updated ward polygons from store & overrides)
      const allWards = (store.wards && store.wards.length > 0) ? store.wards : NAVSARI_WARDS;
      let ward = (ward_number !== undefined && ward_number !== null && ward_number !== ''
          ? allWards.find(w => w.ward_number === Number(ward_number))
          : null)
        || (ward_id ? allWards.find(w => w.id === ward_id) : null);

      if (!ward) {
        const geoWard = findWardByCoordinates(isNaN(lat) ? 20.9325 : lat, isNaN(lng) ? 72.9275 : lng, allWards);
        ward = allWards.find(w => w.ward_number === geoWard.ward_number) || geoWard;
      } else if (ward && (isNaN(lat) || isNaN(lng) || !lat || !lng || (Math.abs(lat - 20.9325) < 0.001 && Math.abs(lng - 72.9280) < 0.001))) {
        // If user picked a specific ward but coordinates are center of Navsari or missing, adjust to ward center
        if (ward.boundary_coordinates && ward.boundary_coordinates.length >= 3) {
          lng = (ward.boundary_coordinates[0][0] + ward.boundary_coordinates[2][0]) / 2;
          lat = (ward.boundary_coordinates[0][1] + ward.boundary_coordinates[2][1]) / 2;
        } else {
          lat = 20.9325;
          lng = 72.9275;
        }
      }

      const category = store.categories.find(c => c.id === category_id);
      if (!category) {
        res.status(400).json({ success: false, error: 'Invalid complaint category' });
        return;
      }

      // Generate unique human-readable complaint ID: NMC-2026-XXXXX
      const serial = Math.floor(10000 + Math.random() * 90000);
      const complaintNumber = `NMC-2026-${serial}`;

      const resolvedUrgent = Boolean(is_urgent);
      const resolvedPriority = resolvedUrgent ? 'urgent' : (priority || 'medium');

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
        latitude: isNaN(lat) ? 20.9325 : lat,
        longitude: isNaN(lng) ? 72.9275 : lng,
        address: address || `${ward.ward_name}, Navsari`,
        landmark: landmark || undefined,
        ward_id: ward.id,
        ward_number: ward.ward_number,
        ward_name: ward.ward_name,
        assigned_officer_name: ward.ward_officer_name || 'Ward Officer',
        status: 'submitted',
        priority: resolvedPriority,
        is_urgent: resolvedUrgent,
        confidence_score: confidence_score ? Number(confidence_score) : 0.95,
        ai_model_name: ai_model_name || 'NavsariWasteClassifier-PyTorch-ResNet50',
        ai_model_version: ai_model_version || 'v1.3.0'
      });

      // Automatically train AI image model with every newly uploaded complaint photo
      const trainResult = await AIService.trainOnNewPhoto({
        categoryId: category.id,
        categoryName: category.category_name,
        imageBase64: typeof image_url === 'string' && image_url.startsWith('data:image') ? image_url : undefined,
        description: description?.trim() || '',
        visualFeatures: req.body.visual_features
      }).catch(() => ({ trained: false, total_samples: 0 }));

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
          complaint: newComplaint,
          ai_model_trained: trainResult.trained,
          ai_total_samples: trainResult.total_samples
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

      const { status, category_id, search, page = '1', limit = '50' } = req.query;
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 50;

      const complaints = await DbRepository.getComplaints({
        citizen_id: req.user.id,
        citizen_phone: req.user.phone,
        citizen_name: req.user.full_name,
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
      let complaint: any = await DbRepository.getComplaintById(id);
      if (!complaint) {
        complaint = (store.complaints || []).find(c => c.id === id || c.complaint_number === id);
      }

      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found' });
        return;
      }

      const userDigits = req.user?.phone ? req.user.phone.replace(/\D/g, '') : '';
      const compDigits = (complaint.citizen_phone || '').replace(/\D/g, '');
      const isOwner = Boolean(
        req.user && (
          req.user.id === complaint.citizen_id ||
          (userDigits && compDigits && (userDigits === compDigits || compDigits.endsWith(userDigits) || userDigits.endsWith(compDigits))) ||
          (req.user.full_name && complaint.citizen_name && req.user.full_name.toLowerCase() === complaint.citizen_name.toLowerCase())
        )
      );

      const safeComplaint = {
        ...complaint,
        citizen_name: isOwner ? complaint.citizen_name : 'Anonymous Citizen'
      };

      res.status(200).json({
        success: true,
        data: safeComplaint
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

      // Also clean up from in-memory store
      const idx = (store.complaints || []).findIndex(c => c.id === id || c.complaint_number === id);
      if (idx !== -1) {
        store.complaints.splice(idx, 1);
      }

      if (!deleted && idx === -1) {
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

      let complaint: any = await DbRepository.getComplaintById(id);
      if (!complaint) {
        complaint = (store.complaints || []).find(c => c.id === id || c.complaint_number === id);
      }
      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found' });
        return;
      }

      const userDigits = req.user.phone ? req.user.phone.replace(/\D/g, '') : '';
      const compDigits = (complaint.citizen_phone || '').replace(/\D/g, '');
      const isOwner = Boolean(
        complaint.citizen_id === req.user.id ||
        (userDigits && compDigits && (userDigits === compDigits || compDigits.endsWith(userDigits) || userDigits.endsWith(compDigits))) ||
        (req.user.full_name && complaint.citizen_name && req.user.full_name.toLowerCase() === complaint.citizen_name.toLowerCase())
      );

      if (!isOwner) {
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
