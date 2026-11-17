import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { store } from '../data/store.js';
import { Profile, CitizenAuthProfile, WardOfficerRecord, ComplaintCategory, Ward } from '../types/index.js';
import { DEFAULT_NAVSARI_CITY_BOUNDARY } from '../utils/postgis.js';

export class AdminController {
  /**
   * Helper to evaluate SLA breaches and flag officers
   */
  public static computeFlaggedOfficers(): Array<{
    officer: WardOfficerRecord;
    overdue_complaints: Array<{
      complaint_number: string;
      category_name: string;
      submitted_at: string;
      days_pending: number;
      max_approval_days: number;
      ward_number: number;
    }>;
  }> {
    const now = Date.now();
    const flaggedMap = new Map<string, { officer: WardOfficerRecord; overdue_complaints: any[] }>();

    for (const complaint of store.complaints) {
      // SLA approval applies to complaints still awaiting officer action: submitted or under_review
      if (complaint.status === 'submitted' || complaint.status === 'under_review') {
        const category = store.categories.find(c => c.id === complaint.category_id);
        const maxApprovalDays = category?.max_approval_days ?? 2;
        const submittedTime = new Date(complaint.submitted_at).getTime();
        const daysPending = Math.max(1, Math.floor((now - submittedTime) / (1000 * 60 * 60 * 24)));

        if (daysPending > maxApprovalDays) {
          const wardNum = complaint.location?.ward_number;
          // Find officer assigned to this ward
          const assignedOfficer = store.wardOfficers.find(o => o.assigned_wards.includes(wardNum))
            || store.wardOfficers.find(o => o.full_name === complaint.location?.assigned_officer_name)
            || store.wardOfficers[0];

          if (assignedOfficer) {
            if (!flaggedMap.has(assignedOfficer.id)) {
              flaggedMap.set(assignedOfficer.id, {
                officer: { ...assignedOfficer, flagged: true },
                overdue_complaints: []
              });
            }
            flaggedMap.get(assignedOfficer.id)!.overdue_complaints.push({
              complaint_number: complaint.complaint_number,
              category_name: category?.category_name || complaint.category_name,
              submitted_at: complaint.submitted_at,
              days_pending: daysPending,
              max_approval_days: maxApprovalDays,
              ward_number: wardNum
            });
          }
        }
      }
    }

    return Array.from(flaggedMap.values());
  }

  /**
   * GET /api/admin/overview
   */
  public static async getOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const flagged = AdminController.computeFlaggedOfficers();
      const totalComplaints = store.complaints.length;
      const resolvedComplaints = store.complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;
      const activeComplaints = store.complaints.filter(c => !['resolved', 'closed', 'rejected'].includes(c.status)).length;
      const pendingApprovalComplaints = store.complaints.filter(c => c.status === 'submitted' || c.status === 'under_review').length;

      // Calculate avg cleanliness score
      const totalCleanliness = store.wards.reduce((acc, w) => acc + (w.cleanliness_score || 85), 0);
      const avgCleanliness = (totalCleanliness / Math.max(1, store.wards.length)).toFixed(1);

      // Top complaints by category
      const categoryCounts = store.categories.map(cat => ({
        id: cat.id,
        name: cat.category_name,
        name_gu: cat.category_name_gu,
        icon: cat.icon,
        count: store.complaints.filter(c => c.category_id === cat.id).length,
        max_approval_days: cat.max_approval_days ?? 2,
        max_work_days: cat.max_work_days ?? 5
      }));

      res.status(200).json({
        success: true,
        data: {
          summary: {
            total_wards: store.wards.length,
            total_officers: store.wardOfficers.filter(o => o.is_active).length,
            total_workers: store.workers.length + store.profiles.filter(p => (p.role === 'sanitation_worker' || (p.role as any) === 'worker') && p.is_active).length,
            total_complaints: totalComplaints,
            active_complaints: activeComplaints,
            resolved_complaints: resolvedComplaints,
            pending_approval_complaints: pendingApprovalComplaints,
            flagged_officers_count: flagged.length,
            avg_cleanliness_score: parseFloat(avgCleanliness),
            sla_compliance_rate: Math.round(((totalComplaints - flagged.reduce((acc, f) => acc + f.overdue_complaints.length, 0)) / Math.max(1, totalComplaints)) * 100)
          },
          flagged_officers: flagged,
          category_breakdown: categoryCounts,
          recent_complaints: store.complaints.slice(-6).reverse()
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/admin/wards
   */
  public static async getWards(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const overrides = store.adminBoundarySettings?.ward_boundary_overrides || {};
      const enrichedWards = store.wards.map(ward => {
        const assignedOfficers = store.wardOfficers.filter(o => o.assigned_wards.includes(ward.ward_number));
        const activeComplaints = store.complaints.filter(
          c => c.location?.ward_number === ward.ward_number && !['resolved', 'closed', 'rejected'].includes(c.status)
        ).length;
        const totalWorkers = store.workers.filter((w: any) => w.ward_id === ward.id || w.ward_number === ward.ward_number).length
          + store.profiles.filter(p => (p.role === 'sanitation_worker' || (p.role as any) === 'worker') && p.ward_number === ward.ward_number).length;

        return {
          ...ward,
          boundary_coordinates: overrides[ward.id] || ward.boundary_coordinates,
          assigned_officers: assignedOfficers.map(o => ({
            id: o.id,
            name: o.full_name,
            phone: o.phone
          })),
          active_complaints_count: activeComplaints,
          total_workers_count: Math.max(totalWorkers, 4) // realistic minimum for ward
        };
      });

      res.status(200).json({ success: true, data: enrichedWards });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PUT /api/admin/wards/:id/boundary
   */
  public static async updateWardBoundary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { boundary_coordinates } = req.body;

      if (!boundary_coordinates || !Array.isArray(boundary_coordinates) || boundary_coordinates.length < 3) {
        res.status(400).json({ success: false, error: 'Valid polygon boundary coordinates array (at least 3 points) is required.' });
        return;
      }

      const ward = store.wards.find(w => w.id === id || String(w.ward_number) === String(id));
      if (!ward) {
        res.status(404).json({ success: false, error: `Ward not found with ID or number: ${id}` });
        return;
      }

      // Update ward boundary in store & overrides
      ward.boundary_coordinates = boundary_coordinates;
      if (!store.adminBoundarySettings) {
        store.adminBoundarySettings = {
          city_name: 'Navsari Municipal Corporation',
          city_boundary: DEFAULT_NAVSARI_CITY_BOUNDARY,
          ward_boundary_overrides: {},
          last_updated: new Date().toISOString()
        };
      }
      if (!store.adminBoundarySettings.ward_boundary_overrides) {
        store.adminBoundarySettings.ward_boundary_overrides = {};
      }
      store.adminBoundarySettings.ward_boundary_overrides[ward.id] = boundary_coordinates;
      store.adminBoundarySettings.last_updated = new Date().toISOString();

      res.status(200).json({
        success: true,
        message: `Boundary for Ward ${ward.ward_number} (${ward.ward_name}) updated successfully.`,
        data: ward
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/admin/city-boundary
   */
  public static async getCityBoundary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const boundary = store.adminBoundarySettings?.city_boundary || DEFAULT_NAVSARI_CITY_BOUNDARY;
      res.status(200).json({
        success: true,
        data: {
          city_name: store.adminBoundarySettings?.city_name || 'Navsari Municipal Corporation',
          city_boundary: boundary,
          last_updated: store.adminBoundarySettings?.last_updated || new Date().toISOString()
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PUT /api/admin/city-boundary
   */
  public static async updateCityBoundary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { city_boundary } = req.body;
      if (!city_boundary || !Array.isArray(city_boundary) || city_boundary.length < 3) {
        res.status(400).json({ success: false, error: 'A valid polygon of at least 3 [longitude, latitude] coordinates is required.' });
        return;
      }

      if (!store.adminBoundarySettings) {
        store.adminBoundarySettings = {
          city_name: 'Navsari Municipal Corporation',
          city_boundary: city_boundary,
          ward_boundary_overrides: {},
          last_updated: new Date().toISOString()
        };
      } else {
        store.adminBoundarySettings.city_boundary = city_boundary;
        store.adminBoundarySettings.last_updated = new Date().toISOString();
      }

      res.status(200).json({
        success: true,
        message: 'Navsari Municipal Corporation city boundary updated and enforced successfully.',
        data: store.adminBoundarySettings
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/admin/ward-officers
   */
  public static async getWardOfficers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const flaggedData = AdminController.computeFlaggedOfficers();
      const flaggedOfficerMap = new Map(flaggedData.map(f => [f.officer.id, f.overdue_complaints]));

      const officers = store.wardOfficers.map(officer => {
        const overdue = flaggedOfficerMap.get(officer.id) || [];
        return {
          ...officer,
          flagged: overdue.length > 0,
          flagged_count: overdue.length,
          flagged_reasons: overdue.map(
            o => `Complaint #${o.complaint_number} (${o.category_name}) pending for ${o.days_pending} days (Max SLA: ${o.max_approval_days} days)`
          )
        };
      });

      res.status(200).json({ success: true, data: officers });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/admin/ward-officers
   */
  public static async createWardOfficer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { full_name, phone, email, password, designation, assigned_wards } = req.body;

      if (!full_name || !phone || !password) {
        res.status(400).json({ success: false, error: 'Full name, phone number, and password are required.' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
        return;
      }

      const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`;
      const existingProfile = store.profiles.find(p => p.phone === formattedPhone);
      if (existingProfile) {
        res.status(400).json({ success: false, error: 'An officer or user with this mobile number already exists.' });
        return;
      }

      const newUserId = randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      const wardsList: number[] = Array.isArray(assigned_wards)
        ? assigned_wards.map(Number).filter(n => !isNaN(n) && n >= 1 && n <= 13)
        : [1];

      // 1. Create Profile
      const newProfile: Profile = {
        id: newUserId,
        full_name: full_name.trim(),
        phone: formattedPhone,
        email: email?.trim() || `${full_name.toLowerCase().replace(/\s+/g, '.')}@navsarimunicipal.gov.in`,
        preferred_language: 'en',
        address: `NMC Ward ${wardsList.join(', ')} Office, Navsari`,
        locality: `Ward ${wardsList.join(', ')}`,
        ward_number: wardsList[0],
        is_active: true,
        role: 'ward_officer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.profiles.push(newProfile);

      // 2. Create AuthProfile for direct login
      const newAuthProfile: CitizenAuthProfile = {
        id: `auth-${randomUUID().slice(0, 8)}`,
        user_id: newUserId,
        mobile_number: formattedPhone,
        password_hash: passwordHash,
        mobile_verified: true,
        verification_completed_at: new Date().toISOString(),
        account_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      (newAuthProfile as any).plain_password = password;
      store.authProfiles.push(newAuthProfile);

      // 3. Create WardOfficerRecord
      const newOfficer: WardOfficerRecord = {
        id: `wo-${randomUUID().slice(0, 8)}`,
        user_id: newUserId,
        full_name: full_name.trim(),
        phone: formattedPhone,
        email: newProfile.email || '',
        designation: designation?.trim() || 'Ward Officer',
        assigned_wards: wardsList,
        is_active: true,
        cleanliness_score: 90.0,
        total_resolved: 0,
        created_at: new Date().toISOString()
      };
      store.wardOfficers.push(newOfficer);

      // Update ward officer names in assigned wards
      for (const wNum of wardsList) {
        const w = store.wards.find(w => w.ward_number === wNum);
        if (w) {
          w.ward_officer_name = newOfficer.full_name;
          w.contact_phone = newOfficer.phone;
        }
      }

      res.status(201).json({
        success: true,
        message: `Ward Officer ${newOfficer.full_name} created successfully. They can log in with mobile ${formattedPhone}.`,
        data: newOfficer
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PUT /api/admin/ward-officers/:id
   */
  public static async updateWardOfficer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { full_name, phone, email, designation, assigned_wards, is_active, password } = req.body;

      const officer = store.wardOfficers.find(o => o.id === id || o.user_id === id);
      if (!officer) {
        res.status(404).json({ success: false, error: 'Ward Officer not found.' });
        return;
      }

      if (full_name) officer.full_name = full_name.trim();
      if (email) officer.email = email.trim();
      if (designation) officer.designation = designation.trim();
      if (is_active !== undefined) officer.is_active = Boolean(is_active);

      if (phone) {
        const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`;
        officer.phone = formattedPhone;
      }

      if (assigned_wards && Array.isArray(assigned_wards)) {
        officer.assigned_wards = assigned_wards.map(Number).filter(n => !isNaN(n) && n >= 1 && n <= 13);
        // Update ward officer names in assigned wards
        for (const wNum of officer.assigned_wards) {
          const w = store.wards.find(w => w.ward_number === wNum);
          if (w) {
            w.ward_officer_name = officer.full_name;
            w.contact_phone = officer.phone;
          }
        }
      }

      // Update corresponding Profile
      const profile = store.profiles.find(p => p.id === officer.user_id);
      if (profile) {
        if (full_name) profile.full_name = full_name.trim();
        if (email) profile.email = email.trim();
        if (phone) profile.phone = officer.phone;
        if (is_active !== undefined) profile.is_active = Boolean(is_active);
        profile.updated_at = new Date().toISOString();
      }

      // If new password provided, update authProfile
      if (password && password.length >= 6) {
        const authProfile = store.authProfiles.find(a => a.user_id === officer.user_id);
        if (authProfile) {
          authProfile.password_hash = await bcrypt.hash(password, 10);
          authProfile.updated_at = new Date().toISOString();
        }
      }

      res.status(200).json({
        success: true,
        message: `Ward Officer ${officer.full_name} updated successfully.`,
        data: officer
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/admin/workers
   */
  public static async getWorkers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Gather all worker profiles
      const workerProfiles = store.profiles.filter(p => p.role === 'sanitation_worker' || (p.role as any) === 'worker');
      const enrichedWorkers = workerProfiles.map(p => {
        const storeWorker = store.workers.find((w: any) => w.user_id === p.id || w.id === p.id);
        const ward = store.wards.find(w => w.ward_number === p.ward_number || w.id === storeWorker?.ward_id);

        return {
          id: p.id,
          worker_code: storeWorker?.worker_code || `WRK-${p.id.slice(-4).toUpperCase()}`,
          full_name: p.full_name,
          phone: p.phone,
          email: p.email || '',
          ward_number: p.ward_number || ward?.ward_number || 3,
          ward_name: ward?.ward_name || 'Ward 3 - Dudhiya Talao',
          designation: storeWorker?.designation || 'Sanitation Worker',
          preferred_language: p.preferred_language || 'gu',
          is_active: p.is_active,
          created_at: p.created_at
        };
      });

      res.status(200).json({ success: true, data: enrichedWorkers });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/admin/workers
   */
  public static async createWorker(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { full_name, phone, password, designation, ward_number, preferred_language } = req.body;

      if (!full_name || !phone || !password) {
        res.status(400).json({ success: false, error: 'Full name, phone number, and password are required.' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
        return;
      }

      const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`;
      const existingProfile = store.profiles.find(p => p.phone === formattedPhone);
      if (existingProfile) {
        res.status(400).json({ success: false, error: 'A staff member or user with this mobile number already exists.' });
        return;
      }

      const newUserId = randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      const wardNum = Number(ward_number) || 3;
      const ward = store.wards.find(w => w.ward_number === wardNum) || store.wards[2];

      // 1. Create Profile
      const newProfile: Profile = {
        id: newUserId,
        full_name: full_name.trim(),
        phone: formattedPhone,
        email: `${full_name.toLowerCase().replace(/\s+/g, '.')}@navsarimunicipal.gov.in`,
        preferred_language: (preferred_language === 'gu' || preferred_language === 'hi') ? preferred_language : 'en',
        address: `Quarter Staff, Ward ${wardNum}, Navsari`,
        locality: ward.ward_name,
        ward_number: wardNum,
        is_active: true,
        role: 'sanitation_worker',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.profiles.push(newProfile);

      // 2. Create AuthProfile for direct login
      const newAuthProfile: CitizenAuthProfile = {
        id: `auth-${randomUUID().slice(0, 8)}`,
        user_id: newUserId,
        mobile_number: formattedPhone,
        password_hash: passwordHash,
        mobile_verified: true,
        verification_completed_at: new Date().toISOString(),
        account_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      (newAuthProfile as any).plain_password = password;
      store.authProfiles.push(newAuthProfile);

      // 3. Create Worker entry
      const workerCode = `WRK-2026-${Math.floor(100 + Math.random() * 900)}`;
      const newWorkerEntry = {
        id: randomUUID(),
        user_id: newUserId,
        worker_code: workerCode,
        full_name: full_name.trim(),
        phone: formattedPhone,
        ward_id: ward.id,
        ward_number: wardNum,
        designation: designation?.trim() || 'Sanitation Worker',
        is_active: true,
        created_at: new Date().toISOString()
      };
      store.workers.push(newWorkerEntry);

      res.status(201).json({
        success: true,
        message: `Sanitation Worker ${newWorkerEntry.full_name} registered successfully. They can login with mobile ${formattedPhone}.`,
        data: {
          ...newWorkerEntry,
          ward_name: ward.ward_name,
          preferred_language: newProfile.preferred_language
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PUT /api/admin/workers/:id
   */
  public static async updateWorker(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { full_name, phone, designation, ward_number, is_active, password } = req.body;

      const profile = store.profiles.find(p => p.id === id);
      if (!profile) {
        res.status(404).json({ success: false, error: 'Worker profile not found.' });
        return;
      }

      if (full_name) profile.full_name = full_name.trim();
      if (ward_number) profile.ward_number = Number(ward_number);
      if (is_active !== undefined) profile.is_active = Boolean(is_active);
      if (phone) {
        profile.phone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`;
      }
      profile.updated_at = new Date().toISOString();

      // Update worker entry in store.workers
      const workerEntry = store.workers.find((w: any) => w.user_id === id || w.id === id);
      if (workerEntry) {
        if (full_name) workerEntry.full_name = full_name.trim();
        if (phone) workerEntry.phone = profile.phone;
        if (designation) workerEntry.designation = designation.trim();
        if (ward_number) workerEntry.ward_number = Number(ward_number);
        if (is_active !== undefined) workerEntry.is_active = Boolean(is_active);
      }

      // Update password if provided
      if (password && password.length >= 6) {
        const authProfile = store.authProfiles.find(a => a.user_id === id);
        if (authProfile) {
          authProfile.password_hash = await bcrypt.hash(password, 10);
          authProfile.updated_at = new Date().toISOString();
        }
      }

      res.status(200).json({
        success: true,
        message: `Worker ${profile.full_name} updated successfully.`,
        data: profile
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * DELETE /api/admin/workers/:id
   */
  public static async deleteWorker(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const profile = store.profiles.find(p => p.id === id);
      if (!profile) {
        res.status(404).json({ success: false, error: 'Worker not found.' });
        return;
      }

      profile.is_active = false;
      const workerEntry = store.workers.find((w: any) => w.user_id === id || w.id === id);
      if (workerEntry) workerEntry.is_active = false;

      res.status(200).json({
        success: true,
        message: `Worker ${profile.full_name} deactivated successfully.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/admin/categories
   */
  public static async getCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const enrichedCategories = store.categories.map(cat => ({
        ...cat,
        max_approval_days: cat.max_approval_days ?? 2,
        max_work_days: cat.max_work_days ?? 5,
        active_complaints_count: store.complaints.filter(
          c => c.category_id === cat.id && !['resolved', 'closed', 'rejected'].includes(c.status)
        ).length,
        total_complaints_count: store.complaints.filter(c => c.category_id === cat.id).length
      }));

      res.status(200).json({ success: true, data: enrichedCategories });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/admin/categories
   */
  public static async createCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        category_name,
        category_name_gu,
        category_name_hi,
        description,
        icon,
        max_approval_days,
        max_work_days
      } = req.body;

      if (!category_name || !description) {
        res.status(400).json({ success: false, error: 'Category name and description are required.' });
        return;
      }

      const nextId = `cat-${String(store.categories.length + 1).padStart(2, '0')}`;
      const newCategory: ComplaintCategory = {
        id: nextId,
        category_name: category_name.trim(),
        category_name_gu: category_name_gu?.trim() || category_name.trim(),
        category_name_hi: category_name_hi?.trim() || category_name.trim(),
        description: description.trim(),
        icon: icon?.trim() || 'HelpCircle',
        is_active: true,
        max_approval_days: Math.max(1, Number(max_approval_days) || 2),
        max_work_days: Math.max(1, Number(max_work_days) || 5),
        created_at: new Date().toISOString()
      };

      store.categories.push(newCategory);

      res.status(201).json({
        success: true,
        message: `Complaint Category "${newCategory.category_name}" added successfully with SLA: ${newCategory.max_approval_days} days approval / ${newCategory.max_work_days} days resolution.`,
        data: newCategory
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PUT /api/admin/categories/:id
   */
  public static async updateCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        category_name,
        category_name_gu,
        category_name_hi,
        description,
        icon,
        max_approval_days,
        max_work_days,
        is_active
      } = req.body;

      const category = store.categories.find(c => c.id === id);
      if (!category) {
        res.status(404).json({ success: false, error: 'Category not found.' });
        return;
      }

      if (category_name) category.category_name = category_name.trim();
      if (category_name_gu) category.category_name_gu = category_name_gu.trim();
      if (category_name_hi) category.category_name_hi = category_name_hi.trim();
      if (description) category.description = description.trim();
      if (icon) category.icon = icon.trim();
      if (max_approval_days !== undefined) category.max_approval_days = Math.max(1, Number(max_approval_days));
      if (max_work_days !== undefined) category.max_work_days = Math.max(1, Number(max_work_days));
      if (is_active !== undefined) category.is_active = Boolean(is_active);

      res.status(200).json({
        success: true,
        message: `Category "${category.category_name}" updated successfully.`,
        data: category
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * DELETE /api/admin/categories/:id
   */
  public static async deleteCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const category = store.categories.find(c => c.id === id);
      if (!category) {
        res.status(404).json({ success: false, error: 'Category not found.' });
        return;
      }

      category.is_active = false;
      res.status(200).json({
        success: true,
        message: `Category "${category.category_name}" deactivated successfully.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/admin/flagged-officers
   */
  public static async getFlaggedOfficers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const flagged = AdminController.computeFlaggedOfficers();
      res.status(200).json({ success: true, data: flagged });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
