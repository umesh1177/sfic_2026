"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplaintsController = void 0;
const store_js_1 = require("../data/store.js");
const dbRepository_js_1 = require("../data/dbRepository.js");
const aiService_js_1 = require("../services/aiService.js");
const postgis_js_1 = require("../utils/postgis.js");
class ComplaintsController {
    /**
     * POST /api/complaints/validate-content
     */
    static async validateContent(req, res) {
        try {
            const { text, file_size, mime_type, image_base64 } = req.body;
            const moderation = await aiService_js_1.AIService.moderateContent(text || '', image_base64);
            let quality = undefined;
            if (file_size && mime_type) {
                quality = aiService_js_1.AIService.checkPhotoQuality(Number(file_size), mime_type);
            }
            res.status(200).json({
                success: true,
                data: {
                    moderation,
                    quality
                }
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * POST /api/complaints/classify-image
     */
    static async classifyImage(req, res) {
        try {
            const { file_name, file_size, description, image_base64, visual_features, source } = req.body;
            const classification = await aiService_js_1.AIService.classifyWasteImage(file_name || 'civic_issue.jpg', Number(file_size || 500000), description, image_base64, visual_features, source === 'live_camera' ? 'live_camera' : 'upload');
            // Match with category ID from database only if photo is relevant to a civic issue
            let matchedCategory = undefined;
            if (classification.is_relevant) {
                const predLower = classification.predicted_category_name.toLowerCase();
                matchedCategory =
                    store_js_1.store.categories.find(c => c.category_name.toLowerCase() === predLower) ||
                        store_js_1.store.categories.find(c => c.category_name.toLowerCase().includes(predLower.split('/')[0].trim()) ||
                            predLower.includes(c.category_name.toLowerCase().split('/')[0].trim()));
            }
            res.status(200).json({
                success: true,
                data: {
                    ...classification,
                    matched_category_id: matchedCategory?.id
                }
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * POST /api/complaints/validate-location
     */
    static async validateLocation(req, res) {
        try {
            const { latitude, longitude } = req.body;
            const lat = Number(latitude);
            const lng = Number(longitude);
            if (isNaN(lat) || isNaN(lng)) {
                res.status(400).json({ success: false, error: 'Valid numeric latitude and longitude are required' });
                return;
            }
            // [CONSTRAINT TEMPORARILY DISABLED] Allow submitting complaints from anywhere for testing
            /*
            const cityBoundary = store.adminBoundarySettings?.city_boundary || DEFAULT_NAVSARI_CITY_BOUNDARY;
            const isInside = isPointInPolygon([lng, lat], cityBoundary);
      
            if (!isInside) {
              res.status(422).json({
                success: false,
                error: 'Location falls outside Navsari Municipal Corporation jurisdiction. Complaints can only be submitted within Navsari city boundaries.'
              });
              return;
            }
            */
            const ward = (0, postgis_js_1.findWardByCoordinates)(lat, lng);
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
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * POST /api/complaints/check-duplicates
     * Monitors active complaints within 200 meters of the citizen's GPS coordinates
     */
    static async checkDuplicates(req, res) {
        try {
            const { latitude, longitude, category_id } = req.body;
            const lat = Number(latitude);
            const lng = Number(longitude);
            const citizenId = req.user?.id;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                res.status(200).json({ success: true, data: { has_duplicates: false, duplicates: [] } });
                return;
            }
            const allComplaints = await dbRepository_js_1.DbRepository.getComplaints();
            // Find active complaints within 200 meters radius
            const nearbyMatches = allComplaints.filter(c => {
                const st = String(c.status || '').toLowerCase();
                if (['resolved', 'closed', 'rejected', 'verified_complete'].includes(st))
                    return false;
                const cLat = Number(c.location?.latitude);
                const cLng = Number(c.location?.longitude);
                if (!Number.isFinite(cLat) || !Number.isFinite(cLng))
                    return false;
                const dist = (0, postgis_js_1.calculateDistanceMeters)(lat, lng, cLat, cLng);
                return dist <= 200;
            }).map(c => {
                const cLat = Number(c.location?.latitude);
                const cLng = Number(c.location?.longitude);
                const dist = Math.round((0, postgis_js_1.calculateDistanceMeters)(lat, lng, cLat, cLng));
                return {
                    id: c.id,
                    complaint_number: c.complaint_number,
                    category_id: c.category_id,
                    category_name: c.category_name,
                    description: c.description,
                    landmark: c.location?.landmark || c.landmark || '',
                    address: c.location?.address || c.address || '',
                    image_url: c.image_url,
                    distance_meters: dist,
                    status: c.status,
                    followers_count: Number(c.followers_count ?? c.upvotes_count ?? 1),
                    upvotes_count: Number(c.upvotes_count ?? c.followers_count ?? 1),
                    submitted_at: c.submitted_at,
                    matches_category: Boolean(category_id && c.category_id === category_id)
                };
            });
            // Sort: matching category first, then closest distance
            nearbyMatches.sort((a, b) => {
                if (a.matches_category && !b.matches_category)
                    return -1;
                if (!a.matches_category && b.matches_category)
                    return 1;
                return a.distance_meters - b.distance_meters;
            });
            res.status(200).json({
                success: true,
                data: {
                    has_duplicates: nearbyMatches.length > 0,
                    duplicates: nearbyMatches.slice(0, 5)
                }
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * POST /api/complaints/:id/raise-count
     * Increases the endorse/raise count on an existing civic issue within 200m radius
     */
    static async raiseCount(req, res) {
        try {
            const { id } = req.params;
            const citizenId = req.user?.id || 'c0000000-0000-0000-0000-000000000001';
            const result = await dbRepository_js_1.DbRepository.raiseComplaintCount(id, citizenId);
            res.status(200).json(result);
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * POST /api/complaints
     */
    static async createComplaint(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const bodyLoc = req.body.location || {};
            const { category_id, description, original_language, image_url, confidence_score, ai_model_name, ai_model_version, is_duplicate, parent_complaint_id, is_urgent, priority } = req.body;
            const latitude = req.body.latitude ?? bodyLoc.latitude;
            const longitude = req.body.longitude ?? bodyLoc.longitude;
            const ward_number = req.body.ward_number ?? bodyLoc.ward_number;
            const ward_id = req.body.ward_id ?? bodyLoc.ward_id;
            const address = req.body.address ?? bodyLoc.address;
            const landmark = req.body.landmark ?? bodyLoc.landmark;
            // 1. Content Moderation Gate
            const moderation = await aiService_js_1.AIService.moderateContent(description || '');
            if (moderation.status === 'UNSAFE') {
                res.status(400).json({
                    success: false,
                    error: moderation.reason || 'Content rejected due to policy violations.'
                });
                return;
            }
            // 2. Ward Resolution (prefer live store.wards so admin officer updates apply)
            const allWards = (store_js_1.store.wards && store_js_1.store.wards.length > 0) ? store_js_1.store.wards : postgis_js_1.NAVSARI_WARDS;
            let ward = (ward_number !== undefined && ward_number !== null && ward_number !== ''
                ? allWards.find(w => w.ward_number === Number(ward_number))
                : null)
                || (ward_id ? allWards.find(w => w.id === ward_id) : null);
            let lat = Number(latitude);
            let lng = Number(longitude);
            if (!ward) {
                const geoWard = (0, postgis_js_1.findWardByCoordinates)(isNaN(lat) ? 20.9325 : lat, isNaN(lng) ? 72.9275 : lng);
                ward = allWards.find(w => w.ward_number === geoWard.ward_number) || geoWard;
            }
            else if (ward && (isNaN(lat) || isNaN(lng) || !lat || !lng || (Math.abs(lat - 20.9325) < 0.001 && Math.abs(lng - 72.9280) < 0.001))) {
                // If user picked a specific ward but coordinates are center of Navsari or missing, adjust to ward center
                if (ward.boundary_coordinates && ward.boundary_coordinates.length >= 3) {
                    lng = (ward.boundary_coordinates[0][0] + ward.boundary_coordinates[2][0]) / 2;
                    lat = (ward.boundary_coordinates[0][1] + ward.boundary_coordinates[2][1]) / 2;
                }
                else {
                    lat = 20.9325;
                    lng = 72.9275;
                }
            }
            const category = store_js_1.store.categories.find(c => c.id === category_id);
            if (!category) {
                res.status(400).json({ success: false, error: 'Invalid complaint category' });
                return;
            }
            // Generate unique human-readable complaint ID: NMC-2026-XXXXX
            const serial = Math.floor(10000 + Math.random() * 90000);
            const complaintNumber = `NMC-2026-${serial}`;
            const resolvedUrgent = Boolean(is_urgent);
            const resolvedPriority = resolvedUrgent ? 'urgent' : (priority || 'medium');
            const newComplaint = await dbRepository_js_1.DbRepository.createComplaint({
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
            const trainResult = await aiService_js_1.AIService.trainOnNewPhoto({
                categoryId: category.id,
                categoryName: category.category_name,
                imageBase64: typeof image_url === 'string' && image_url.startsWith('data:image') ? image_url : undefined,
                description: description?.trim() || '',
                visualFeatures: req.body.visual_features
            }).catch(() => ({ trained: false, total_samples: 0 }));
            // Create confirmation notification in database
            await dbRepository_js_1.DbRepository.getNotifications(req.user.id).catch(() => { });
            store_js_1.store.notifications.push({
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
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * GET /api/complaints/my
     */
    static async getMyComplaints(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const { status, category_id, search, page = '1', limit = '50' } = req.query;
            const pageNum = parseInt(page, 10) || 1;
            const limitNum = parseInt(limit, 10) || 50;
            const complaints = await dbRepository_js_1.DbRepository.getComplaints({
                citizen_id: req.user.id,
                citizen_phone: req.user.phone,
                citizen_name: req.user.full_name,
                status: status,
                category_id: category_id,
                search: search
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
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * GET /api/complaints/:id
     */
    static async getComplaintById(req, res) {
        try {
            const { id } = req.params;
            let complaint = await dbRepository_js_1.DbRepository.getComplaintById(id);
            if (!complaint) {
                complaint = (store_js_1.store.complaints || []).find(c => c.id === id || c.complaint_number === id);
            }
            if (!complaint) {
                res.status(404).json({ success: false, error: 'Complaint not found' });
                return;
            }
            const userDigits = req.user?.phone ? req.user.phone.replace(/\D/g, '') : '';
            const compDigits = (complaint.citizen_phone || '').replace(/\D/g, '');
            const isOwner = Boolean(req.user && (req.user.id === complaint.citizen_id ||
                (userDigits && compDigits && (userDigits === compDigits || compDigits.endsWith(userDigits) || userDigits.endsWith(compDigits))) ||
                (req.user.full_name && complaint.citizen_name && req.user.full_name.toLowerCase() === complaint.citizen_name.toLowerCase())));
            const safeComplaint = {
                ...complaint,
                citizen_name: isOwner ? complaint.citizen_name : 'Anonymous Citizen'
            };
            res.status(200).json({
                success: true,
                data: safeComplaint
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * DELETE /api/complaints/:id
     */
    static async deleteComplaint(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const { id } = req.params;
            const deleted = await dbRepository_js_1.DbRepository.deleteComplaint(id);
            // Also clean up from in-memory store
            const idx = (store_js_1.store.complaints || []).findIndex(c => c.id === id || c.complaint_number === id);
            if (idx !== -1) {
                store_js_1.store.complaints.splice(idx, 1);
            }
            if (!deleted && idx === -1) {
                res.status(404).json({ success: false, error: 'Complaint not found or already deleted' });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Complaint deleted successfully from database'
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * POST /api/complaints/:id/feedback
     */
    static async submitFeedback(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const { id } = req.params;
            const { rating, feedback_text, resolution_satisfactory } = req.body;
            let complaint = await dbRepository_js_1.DbRepository.getComplaintById(id);
            if (!complaint) {
                complaint = (store_js_1.store.complaints || []).find(c => c.id === id || c.complaint_number === id);
            }
            if (!complaint) {
                res.status(404).json({ success: false, error: 'Complaint not found' });
                return;
            }
            const userDigits = req.user.phone ? req.user.phone.replace(/\D/g, '') : '';
            const compDigits = (complaint.citizen_phone || '').replace(/\D/g, '');
            const isOwner = Boolean(complaint.citizen_id === req.user.id ||
                (userDigits && compDigits && (userDigits === compDigits || compDigits.endsWith(userDigits) || userDigits.endsWith(compDigits))) ||
                (req.user.full_name && complaint.citizen_name && req.user.full_name.toLowerCase() === complaint.citizen_name.toLowerCase()));
            if (!isOwner) {
                res.status(403).json({ success: false, error: 'Only the complaint author can submit resolution feedback' });
                return;
            }
            await dbRepository_js_1.DbRepository.submitFeedback(id, req.user.id, Math.max(1, Math.min(5, Number(rating || 5))), feedback_text?.trim() || '', Boolean(resolution_satisfactory));
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
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * POST /api/complaints/:id/reopen
     */
    static async reopenComplaint(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const { id } = req.params;
            const { reason } = req.body;
            const complaint = await dbRepository_js_1.DbRepository.reopenComplaint(id, reason || 'Unresolved civic problem');
            if (!complaint) {
                res.status(404).json({ success: false, error: 'Complaint not found' });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Complaint has been reopened and updated in database.',
                data: complaint
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * POST /api/complaints/:id/follow
     */
    static async toggleFollow(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const { id } = req.params;
            const result = await dbRepository_js_1.DbRepository.toggleFollow(id, req.user.id);
            res.status(200).json({
                success: true,
                data: result
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * POST /api/complaints/:id/add-evidence
     */
    static async addEvidence(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const { id } = req.params;
            const { note } = req.body;
            await dbRepository_js_1.DbRepository.addEvidence(id, req.user.full_name || 'Citizen', note);
            res.status(200).json({
                success: true,
                message: 'Evidence added to complaint history'
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * GET /api/complaints/feedback
     */
    static async getCitizenFeedbackList(req, res) {
        try {
            const wardNumber = req.query.ward_number ? Number(req.query.ward_number) : undefined;
            const feedbacks = await dbRepository_js_1.DbRepository.getCitizenFeedbackList(wardNumber);
            res.status(200).json({
                success: true,
                data: feedbacks,
                total: feedbacks.length
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.ComplaintsController = ComplaintsController;
