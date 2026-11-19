import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { store } from '../data/store.js';
import { DbRepository } from '../data/dbRepository.js';
import { Profile, CitizenAuthProfile, WardOfficerRecord, ComplaintCategory, Ward } from '../types/index.js';
import { DEFAULT_NAVSARI_CITY_BOUNDARY, NAVSARI_WARDS } from '../utils/postgis.js';
import { AIAnalyticsService } from '../services/aiAnalyticsService.js';

export const ALL_WARD_OFFICER_TABS = [
  'overview',
  'complaints',
  'hotspots',
  'workers',
  'teams',
  'activities',
  'approvals',
  'posts',
  'community_problems',
  'ai_analytics',
  'notifications',
  'settings'
];

export class AdminController {
  private static sanitizeAllowedTabs(raw: any): string[] {
    if (!Array.isArray(raw) || raw.length === 0) return [...ALL_WARD_OFFICER_TABS];
    const valid = Array.from(
      new Set(raw.map(String).filter(id => ALL_WARD_OFFICER_TABS.includes(id)))
    );
    return valid.length > 0 ? valid : [...ALL_WARD_OFFICER_TABS];
  }
  /**
   * Helper to evaluate BOTH Approval Days SLA breaches AND Maximum Work Days SLA breaches
   * across live PostgreSQL + in-memory complaints and flag Ward Officers / Team Leaders.
   */
  public static async computeFlaggedOfficers(): Promise<Array<{
    officer: WardOfficerRecord;
    overdue_complaints: Array<{
      complaint_number: string;
      category_name: string;
      submitted_at: string;
      days_pending: number;
      max_approval_days: number;
      max_work_days: number;
      breach_type: 'approval_sla' | 'work_sla';
      team_leader_name?: string;
      team_name?: string;
      status?: string;
      ward_number: number;
    }>;
  }>> {
    await DbRepository.syncWardOfficersFromDb().catch(() => {});
    const dbComplaints = await DbRepository.getComplaints({}).catch(() => []);
    const mergedMap = new Map<string, any>();
    for (const c of (store.complaints || [])) mergedMap.set(c.id, c);
    for (const c of (dbComplaints || [])) mergedMap.set(c.id, c);
    const allComplaints = Array.from(mergedMap.values());

    const now = Date.now();
    const flaggedMap = new Map<string, { officer: WardOfficerRecord; overdue_complaints: any[] }>();

    const attachBreach = (complaint: any, entry: any) => {
      const wardNum = Number(complaint.location?.ward_number || complaint.ward_number || 3);
      const assignedOfficer =
        store.wardOfficers.find(o => o.is_active !== false && Array.isArray(o.assigned_wards) && o.assigned_wards.map(Number).includes(wardNum)) ||
        store.wardOfficers.find(o => o.full_name === complaint.location?.assigned_officer_name) ||
        store.wardOfficers[0];

      if (assignedOfficer) {
        if (!flaggedMap.has(assignedOfficer.id)) {
          flaggedMap.set(assignedOfficer.id, {
            officer: { ...assignedOfficer, flagged: true },
            overdue_complaints: []
          });
        }
        flaggedMap.get(assignedOfficer.id)!.overdue_complaints.push(entry);
      }
    };

    for (const complaint of allComplaints) {
      const st = String(complaint.status || '').toLowerCase();
      if (['resolved', 'closed', 'rejected', 'verified_complete'].includes(st)) continue;

      const category = (store.categories || []).find(
        c =>
          c.id === complaint.category_id ||
          c.category_name.toLowerCase() === String(complaint.category_name || '').toLowerCase()
      );
      const maxApprovalDays = category?.max_approval_days ?? 2;
      const maxWorkDays = category?.max_work_days ?? 3;
      const wardNum = Number(complaint.location?.ward_number || complaint.ward_number || 3);
      const submittedTime = new Date(complaint.submitted_at || Date.now()).getTime();
      const daysSinceSubmitted = Math.max(0, Math.floor((now - submittedTime) / (1000 * 60 * 60 * 24)));

      // 1. Maximum Approval Days SLA Breach
      if (st === 'submitted' || st === 'under_review') {
        if (daysSinceSubmitted > maxApprovalDays) {
          attachBreach(complaint, {
            complaint_number: complaint.complaint_number,
            category_name: category?.category_name || complaint.category_name,
            submitted_at: complaint.submitted_at,
            days_pending: daysSinceSubmitted,
            max_approval_days: maxApprovalDays,
            max_work_days: maxWorkDays,
            breach_type: 'approval_sla',
            status: complaint.status,
            ward_number: wardNum
          });
        }
        continue;
      }

      // 2. Maximum Work Days SLA Breach (approved / assigned / in_progress / team_assigned / reopened)
      const attempts = await DbRepository.getAssignmentsAndEvidenceForComplaint(
        complaint.id,
        complaint.complaint_number
      ).catch(() => []);
      const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
      const workBaseTime = new Date(
        latestAttempt?.assigned_at || complaint.approved_at || complaint.submitted_at || Date.now()
      ).getTime();
      const workDaysElapsed = Math.max(0, Math.floor((now - workBaseTime) / (1000 * 60 * 60 * 24)));

      if (workDaysElapsed > maxWorkDays) {
        attachBreach(complaint, {
          complaint_number: complaint.complaint_number,
          category_name: category?.category_name || complaint.category_name,
          submitted_at: complaint.submitted_at,
          days_pending: workDaysElapsed,
          max_approval_days: maxApprovalDays,
          max_work_days: maxWorkDays,
          breach_type: 'work_sla',
          team_leader_name: latestAttempt?.team_leader_name || (complaint as any).temporary_team_leader_name || undefined,
          team_name: latestAttempt?.team_name || (complaint as any).assigned_team_name || undefined,
          status: complaint.status,
          ward_number: wardNum
        });
      }
    }

    return Array.from(flaggedMap.values());
  }

  /**
   * GET /api/admin/overview
   */
  public static async getOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const flagged = await AdminController.computeFlaggedOfficers();
      const allBreaches = flagged.flatMap(f => f.overdue_complaints);
      const approvalSlaBreaches = allBreaches.filter(b => b.breach_type === 'approval_sla').length;
      const workSlaBreaches = allBreaches.filter(b => b.breach_type === 'work_sla').length;

      const dbComplaints = await DbRepository.getComplaints({}).catch(() => []);
      const mergedMap = new Map<string, any>();
      for (const c of (store.complaints || [])) mergedMap.set(c.id, c);
      for (const c of (dbComplaints || [])) mergedMap.set(c.id, c);
      const allComplaints = Array.from(mergedMap.values());

      const totalComplaints = allComplaints.length;
      const resolvedComplaints = allComplaints.filter(c => ['resolved', 'closed', 'verified_complete'].includes(c.status)).length;
      const activeComplaints = allComplaints.filter(c => !['resolved', 'closed', 'rejected', 'verified_complete'].includes(c.status)).length;
      const pendingApprovalComplaints = allComplaints.filter(c => c.status === 'submitted' || c.status === 'under_review').length;

      // Calculate avg cleanliness score
      const totalCleanliness = store.wards.reduce((acc, w) => acc + (w.cleanliness_score || 85), 0);
      const avgCleanliness = (totalCleanliness / Math.max(1, store.wards.length)).toFixed(1);

      // Top complaints by category
      const categoryCounts = store.categories.map(cat => ({
        id: cat.id,
        name: cat.category_name,
        name_gu: cat.category_name_gu,
        icon: cat.icon,
        count: allComplaints.filter(c => c.category_id === cat.id).length,
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
            approval_sla_breaches_count: approvalSlaBreaches,
            work_sla_breaches_count: workSlaBreaches,
            avg_cleanliness_score: parseFloat(avgCleanliness),
            sla_compliance_rate: Math.max(0, Math.round(((totalComplaints - allBreaches.length) / Math.max(1, totalComplaints)) * 100))
          },
          flagged_officers: flagged,
          category_breakdown: categoryCounts,
          recent_complaints: allComplaints.slice(-6).reverse()
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
      await DbRepository.syncWardOfficersFromDb().catch(() => {});
      const dbComplaints = await DbRepository.getComplaints({}).catch(() => []);
      const mergedComplaintsMap = new Map<string, any>();
      for (const sc of (store.complaints || [])) mergedComplaintsMap.set(sc.id, sc);
      for (const dc of dbComplaints) mergedComplaintsMap.set(dc.id, dc);
      const allComplaints = Array.from(mergedComplaintsMap.values());

      const dbWorkers = await DbRepository.getWorkersList().catch(() => []);
      const wardHistoryRows = await DbRepository.getBoundaryHistory('ward').catch(() => []);
      const latestWardBoundaryByNum = new Map<number, [number, number][]>();
      for (const h of wardHistoryRows) {
        if (h.ward_number && !latestWardBoundaryByNum.has(Number(h.ward_number)) && Array.isArray(h.coordinates) && h.coordinates.length >= 3) {
          latestWardBoundaryByNum.set(Number(h.ward_number), h.coordinates);
        }
      }
      const overrides = store.adminBoundarySettings?.ward_boundary_overrides || {};

      const enrichedWards = store.wards.map(ward => {
        // Match active ward officers assigned to this ward, most recently updated/created first
        const assignedOfficers = store.wardOfficers
          .filter(o => o.is_active !== false && Array.isArray(o.assigned_wards) && o.assigned_wards.map(Number).includes(ward.ward_number))
          .sort((a: any, b: any) => {
            const ta = new Date(a.updated_at || a.created_at || 0).getTime();
            const tb = new Date(b.updated_at || b.created_at || 0).getTime();
            return tb - ta;
          });

        const primaryOfficer = assignedOfficers[0];
        const activeComplaints = allComplaints.filter(
          c => Number(c.location?.ward_number) === ward.ward_number && !['resolved', 'closed', 'rejected'].includes(c.status)
        ).length;

        const wardDbWorkers = dbWorkers.filter((w: any) => Number(w.ward_number) === ward.ward_number);
        const totalWorkers = wardDbWorkers.length > 0
          ? wardDbWorkers.length
          : store.workers.filter((w: any) => w.ward_id === ward.id || Number(w.ward_number) === ward.ward_number).length;

        const resolvedOfficerName = primaryOfficer
          ? (assignedOfficers.length > 1
              ? assignedOfficers.map(o => o.full_name).join(', ')
              : primaryOfficer.full_name)
          : (ward.ward_officer_name || 'Unassigned');
        const resolvedPhone = primaryOfficer?.phone || ward.contact_phone || 'N/A';

        // Keep in-memory store.wards synchronized
        ward.ward_officer_name = resolvedOfficerName;
        ward.contact_phone = resolvedPhone;

        return {
          ...ward,
          ward_officer_name: resolvedOfficerName,
          contact_phone: resolvedPhone,
          boundary_coordinates:
            latestWardBoundaryByNum.get(ward.ward_number) || overrides[ward.id] || ward.boundary_coordinates,
          assigned_officers: assignedOfficers.map(o => ({
            id: o.id,
            user_id: o.user_id,
            name: o.full_name,
            phone: o.phone,
            email: o.email,
            designation: o.designation
          })),
          active_complaints_count: activeComplaints,
          total_workers_count: totalWorkers
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
      const { boundary_coordinates, location_summary } = req.body;

      if (!boundary_coordinates || !Array.isArray(boundary_coordinates) || boundary_coordinates.length < 3) {
        res.status(400).json({ success: false, error: 'Valid polygon boundary coordinates array (at least 3 points) is required.' });
        return;
      }

      const ward = store.wards.find(w => w.id === id || String(w.ward_number) === String(id));
      if (!ward) {
        res.status(404).json({ success: false, error: `Ward not found with ID or number: ${id}` });
        return;
      }

      // Snapshot previous default boundary if this is the very first edit so admin can always roll back
      const existingHistory = await DbRepository.getBoundaryHistory('ward', ward.ward_number).catch(() => []);
      if (existingHistory.length === 0 && Array.isArray(ward.boundary_coordinates) && ward.boundary_coordinates.length >= 3) {
        await DbRepository.recordBoundaryHistory({
          boundary_type: 'ward',
          ward_id: ward.id,
          ward_number: ward.ward_number,
          ward_name: ward.ward_name,
          coordinates: ward.boundary_coordinates as [number, number][],
          location_summary: `Initial Default Boundary — Ward ${ward.ward_number} (${ward.ward_name})`,
          saved_by: 'System Default'
        });
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

      const savedRecord = await DbRepository.recordBoundaryHistory({
        boundary_type: 'ward',
        ward_id: ward.id,
        ward_number: ward.ward_number,
        ward_name: ward.ward_name,
        coordinates: boundary_coordinates,
        location_summary:
          location_summary?.trim() ||
          `Ward ${ward.ward_number} (${ward.ward_name}) — ${boundary_coordinates.length} vertices`,
        saved_by: req.user?.full_name || 'Super Admin'
      });

      res.status(200).json({
        success: true,
        message: `Boundary for Ward ${ward.ward_number} (${ward.ward_name}) updated successfully.`,
        data: { ...ward, history_record: savedRecord }
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
      const history = await DbRepository.getBoundaryHistory('city').catch(() => []);
      if (history.length > 0 && Array.isArray(history[0].coordinates) && history[0].coordinates.length >= 3) {
        if (!store.adminBoundarySettings) {
          store.adminBoundarySettings = {
            city_name: 'Navsari Municipal Corporation',
            city_boundary: history[0].coordinates,
            ward_boundary_overrides: {},
            allow_outside_complaints: false,
            last_updated: history[0].created_at
          };
        } else {
          store.adminBoundarySettings.city_boundary = history[0].coordinates;
          store.adminBoundarySettings.last_updated = history[0].created_at;
        }
      }
      const boundary = store.adminBoundarySettings?.city_boundary || DEFAULT_NAVSARI_CITY_BOUNDARY;
      res.status(200).json({
        success: true,
        data: {
          city_name: store.adminBoundarySettings?.city_name || 'Navsari Municipal Corporation',
          city_boundary: boundary,
          allow_outside_complaints: Boolean(store.adminBoundarySettings?.allow_outside_complaints),
          last_updated: store.adminBoundarySettings?.last_updated || new Date().toISOString()
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/admin/boundary-settings
   */
  public static async getBoundarySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!store.adminBoundarySettings) {
        store.adminBoundarySettings = {
          city_name: 'Navsari Municipal Corporation',
          city_boundary: DEFAULT_NAVSARI_CITY_BOUNDARY,
          ward_boundary_overrides: {},
          allow_outside_complaints: false,
          last_updated: new Date().toISOString()
        };
      }
      res.status(200).json({
        success: true,
        data: {
          city_name: store.adminBoundarySettings.city_name,
          city_boundary: store.adminBoundarySettings.city_boundary || DEFAULT_NAVSARI_CITY_BOUNDARY,
          allow_outside_complaints: Boolean(store.adminBoundarySettings.allow_outside_complaints),
          ward_boundary_overrides: store.adminBoundarySettings.ward_boundary_overrides || {},
          last_updated: store.adminBoundarySettings.last_updated
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PUT /api/admin/boundary-settings
   * Allows updating allow_outside_complaints toggle, city boundary, or both
   */
  public static async updateBoundarySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { allow_outside_complaints, city_boundary, location_summary } = req.body;

      if (!store.adminBoundarySettings) {
        store.adminBoundarySettings = {
          city_name: 'Navsari Municipal Corporation',
          city_boundary: DEFAULT_NAVSARI_CITY_BOUNDARY,
          ward_boundary_overrides: {},
          allow_outside_complaints: false,
          last_updated: new Date().toISOString()
        };
      }

      if (allow_outside_complaints !== undefined) {
        store.adminBoundarySettings.allow_outside_complaints = Boolean(allow_outside_complaints);
      }

      let savedRecord = null;
      if (city_boundary && Array.isArray(city_boundary) && city_boundary.length >= 3) {
        store.adminBoundarySettings.city_boundary = city_boundary;
        savedRecord = await DbRepository.recordBoundaryHistory({
          boundary_type: 'city',
          ward_id: null,
          ward_number: null,
          ward_name: 'Navsari City',
          coordinates: city_boundary,
          location_summary: location_summary?.trim() || `Navsari City Geofence — ${city_boundary.length} vertices`,
          saved_by: req.user?.full_name || 'Super Admin'
        });
      }

      store.adminBoundarySettings.last_updated = new Date().toISOString();

      res.status(200).json({
        success: true,
        message: allow_outside_complaints !== undefined
          ? `Boundary settings updated. Citizen complaints from outside Navsari boundary are now ${store.adminBoundarySettings.allow_outside_complaints ? 'ENABLED (Open Mode)' : 'DISABLED (Strict Geo-Fencing Enforced)'}.`
          : 'Boundary settings updated successfully.',
        data: {
          ...store.adminBoundarySettings,
          history_record: savedRecord
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/admin/boundary/reset-official
   * 1-click restore to official Survey of India / Gujarat GIS administrative boundaries
   */
  public static async resetToOfficialBoundaries(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { target, ward_number } = req.body || {};

      if (target === 'ward' && ward_number !== undefined) {
        const defaultWard = NAVSARI_WARDS.find(w => w.ward_number === Number(ward_number));
        if (!defaultWard) {
          res.status(404).json({ success: false, error: `Official boundary not found for Ward ${ward_number}` });
          return;
        }

        const liveWard = store.wards.find(w => w.ward_number === Number(ward_number));
        if (liveWard) {
          liveWard.boundary_coordinates = [...defaultWard.boundary_coordinates];
        }

        if (!store.adminBoundarySettings) {
          store.adminBoundarySettings = {
            city_name: 'Navsari Municipal Corporation',
            city_boundary: DEFAULT_NAVSARI_CITY_BOUNDARY,
            ward_boundary_overrides: {},
            allow_outside_complaints: false,
            last_updated: new Date().toISOString()
          };
        }
        if (store.adminBoundarySettings.ward_boundary_overrides) {
          delete store.adminBoundarySettings.ward_boundary_overrides[defaultWard.id];
        }

        const savedRecord = await DbRepository.recordBoundaryHistory({
          boundary_type: 'ward',
          ward_id: defaultWard.id,
          ward_number: defaultWard.ward_number,
          ward_name: defaultWard.ward_name,
          coordinates: defaultWard.boundary_coordinates,
          location_summary: `Official Survey of India GIS Boundary Reset — Ward ${defaultWard.ward_number} (${defaultWard.ward_name})`,
          saved_by: req.user?.full_name || 'Super Admin'
        });

        res.status(200).json({
          success: true,
          message: `Ward ${defaultWard.ward_number} (${defaultWard.ward_name}) reset to official Government GIS boundary successfully.`,
          data: {
            ward_number: defaultWard.ward_number,
            boundary_coordinates: defaultWard.boundary_coordinates,
            history_record: savedRecord
          }
        });
        return;
      }

      // Default: Reset outer city boundary to official Survey of India boundary
      if (!store.adminBoundarySettings) {
        store.adminBoundarySettings = {
          city_name: 'Navsari Municipal Corporation',
          city_boundary: DEFAULT_NAVSARI_CITY_BOUNDARY,
          ward_boundary_overrides: {},
          allow_outside_complaints: false,
          last_updated: new Date().toISOString()
        };
      } else {
        store.adminBoundarySettings.city_boundary = DEFAULT_NAVSARI_CITY_BOUNDARY;
        store.adminBoundarySettings.last_updated = new Date().toISOString();
      }

      const savedRecord = await DbRepository.recordBoundaryHistory({
        boundary_type: 'city',
        ward_id: null,
        ward_number: null,
        ward_name: 'Navsari City',
        coordinates: DEFAULT_NAVSARI_CITY_BOUNDARY,
        location_summary: `Official Survey of India / Gujarat Urban Development GIS Boundary Reset (25 vertices)`,
        saved_by: req.user?.full_name || 'Super Admin'
      });

      res.status(200).json({
        success: true,
        message: 'Navsari Municipal Corporation boundary reset to official Government GIS boundary successfully.',
        data: {
          city_boundary: DEFAULT_NAVSARI_CITY_BOUNDARY,
          allow_outside_complaints: Boolean(store.adminBoundarySettings.allow_outside_complaints),
          history_record: savedRecord
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
      const { city_boundary, location_summary, allow_outside_complaints } = req.body;
      if (!city_boundary || !Array.isArray(city_boundary) || city_boundary.length < 3) {
        res.status(400).json({ success: false, error: 'A valid polygon of at least 3 [longitude, latitude] coordinates is required.' });
        return;
      }

      // Snapshot previous Navsari city boundary if this is the first edit so admin can always roll back
      const existingHistory = await DbRepository.getBoundaryHistory('city').catch(() => []);
      const prevBoundary = store.adminBoundarySettings?.city_boundary || DEFAULT_NAVSARI_CITY_BOUNDARY;
      if (existingHistory.length === 0 && Array.isArray(prevBoundary) && prevBoundary.length >= 3) {
        await DbRepository.recordBoundaryHistory({
          boundary_type: 'city',
          ward_id: null,
          ward_number: null,
          ward_name: 'Navsari City',
          coordinates: prevBoundary as [number, number][],
          location_summary: 'Initial Default Navsari Municipal Corporation Boundary',
          saved_by: 'System Default'
        });
      }

      if (!store.adminBoundarySettings) {
        store.adminBoundarySettings = {
          city_name: 'Navsari Municipal Corporation',
          city_boundary: city_boundary,
          ward_boundary_overrides: {},
          allow_outside_complaints: allow_outside_complaints !== undefined ? Boolean(allow_outside_complaints) : false,
          last_updated: new Date().toISOString()
        };
      } else {
        store.adminBoundarySettings.city_boundary = city_boundary;
        if (allow_outside_complaints !== undefined) {
          store.adminBoundarySettings.allow_outside_complaints = Boolean(allow_outside_complaints);
        }
        store.adminBoundarySettings.last_updated = new Date().toISOString();
      }

      const savedRecord = await DbRepository.recordBoundaryHistory({
        boundary_type: 'city',
        ward_id: null,
        ward_number: null,
        ward_name: 'Navsari City',
        coordinates: city_boundary,
        location_summary:
          location_summary?.trim() ||
          `Navsari City Geofence — ${city_boundary.length} vertices`,
        saved_by: req.user?.full_name || 'Super Admin'
      });

      res.status(200).json({
        success: true,
        message: 'Navsari Municipal Corporation city boundary updated and enforced successfully.',
        data: { ...store.adminBoundarySettings, history_record: savedRecord }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/admin/boundary-history?type=city|ward&ward_number=...
   */
  public static async getBoundaryHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const typeParam = req.query.type ? String(req.query.type) : undefined;
      const boundaryType = typeParam === 'city' || typeParam === 'ward' ? typeParam : undefined;
      const wardNumber = req.query.ward_number !== undefined ? Number(req.query.ward_number) : undefined;
      const rows = await DbRepository.getBoundaryHistory(boundaryType, wardNumber);
      res.status(200).json({ success: true, data: rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/admin/boundary-history/:id/restore
   */
  public static async restoreBoundaryHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const record = await DbRepository.getBoundaryHistoryById(id);
      if (!record || !Array.isArray(record.coordinates) || record.coordinates.length < 3) {
        res.status(404).json({ success: false, error: 'Boundary history snapshot not found.' });
        return;
      }

      if (record.boundary_type === 'city') {
        if (!store.adminBoundarySettings) {
          store.adminBoundarySettings = {
            city_name: 'Navsari Municipal Corporation',
            city_boundary: record.coordinates,
            ward_boundary_overrides: {},
            last_updated: new Date().toISOString()
          };
        } else {
          store.adminBoundarySettings.city_boundary = record.coordinates;
          store.adminBoundarySettings.last_updated = new Date().toISOString();
        }
        await DbRepository.recordBoundaryHistory({
          boundary_type: 'city',
          ward_id: null,
          ward_number: null,
          ward_name: 'Navsari City',
          coordinates: record.coordinates,
          location_summary: `Restored: ${record.location_summary || 'Previous Navsari City Boundary'}`,
          saved_by: req.user?.full_name || 'Super Admin'
        });
        res.status(200).json({
          success: true,
          message: 'Previous Navsari City boundary restored successfully.',
          data: { boundary_type: 'city', coordinates: record.coordinates }
        });
        return;
      }

      const ward = store.wards.find(
        w => w.id === record.ward_id || Number(w.ward_number) === Number(record.ward_number)
      );
      if (!ward) {
        res.status(404).json({ success: false, error: 'Target ward not found for this history snapshot.' });
        return;
      }

      ward.boundary_coordinates = record.coordinates;
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
      store.adminBoundarySettings.ward_boundary_overrides[ward.id] = record.coordinates;
      store.adminBoundarySettings.last_updated = new Date().toISOString();

      await DbRepository.recordBoundaryHistory({
        boundary_type: 'ward',
        ward_id: ward.id,
        ward_number: ward.ward_number,
        ward_name: ward.ward_name,
        coordinates: record.coordinates,
        location_summary: `Restored: ${record.location_summary || `Previous Ward ${ward.ward_number} Boundary`}`,
        saved_by: req.user?.full_name || 'Super Admin'
      });

      res.status(200).json({
        success: true,
        message: `Previous boundary restored for Ward ${ward.ward_number} (${ward.ward_name}).`,
        data: { boundary_type: 'ward', ward_number: ward.ward_number, coordinates: record.coordinates }
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
      await DbRepository.syncWardOfficersFromDb().catch(() => {});
      const flaggedData = await AdminController.computeFlaggedOfficers();
      const flaggedOfficerMap = new Map(flaggedData.map(f => [f.officer.id, f.overdue_complaints]));

      const officers = store.wardOfficers.map(officer => {
        const overdue = flaggedOfficerMap.get(officer.id) || [];
        return {
          ...officer,
          flagged: overdue.length > 0,
          flagged_count: overdue.length,
          flagged_reasons: overdue.map(o =>
            o.breach_type === 'work_sla'
              ? `Work Days SLA Breach: #${o.complaint_number} (${o.category_name}${o.team_leader_name ? ` · Leader: ${o.team_leader_name}` : ''}) active for ${o.days_pending} days (Max Work Days: ${o.max_work_days}d)`
              : `Approval SLA Breach: #${o.complaint_number} (${o.category_name}) pending for ${o.days_pending} days (Max Approval Days: ${o.max_approval_days}d)`
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
      const { full_name, phone, email, username, password, designation, assigned_wards, allowed_tabs } = req.body;

      if (!full_name || !phone || !password) {
        res.status(400).json({ success: false, error: 'Full name, phone number, and password are required.' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
        return;
      }

      const trimmedUsername = username && String(username).trim() ? String(username).trim() : undefined;
      if (trimmedUsername) {
        if (/\s/.test(trimmedUsername)) {
          res.status(400).json({ success: false, error: 'Username cannot contain spaces.' });
          return;
        }
        const unameCheck = await DbRepository.isUsernameTaken(trimmedUsername);
        if (unameCheck.taken) {
          res.status(409).json({
            success: false,
            error: `Username "${trimmedUsername}" is already taken across the platform. Please choose a unique username.`
          });
          return;
        }
      }

      const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`;
      const existingProfile = store.profiles.find(p => p.phone === formattedPhone && p.role === 'ward_officer');
      if (existingProfile) {
        res.status(400).json({ success: false, error: 'A Ward Officer with this mobile number already exists.' });
        return;
      }

      const newUserId = randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      const wardsList: number[] = Array.isArray(assigned_wards) && assigned_wards.length > 0
        ? Array.from(new Set(assigned_wards.map(Number).filter(n => !isNaN(n) && n >= 1 && n <= 13))).sort((a, b) => a - b)
        : [1];
      const allowedTabsList = AdminController.sanitizeAllowedTabs(allowed_tabs);
      const primaryWardNum = wardsList[0] || 1;
      const primaryWardObj = store.wards.find(w => w.ward_number === primaryWardNum);
      const nowIso = new Date().toISOString();

      // 1. Create Profile
      const newProfile: Profile = {
        id: newUserId,
        full_name: full_name.trim(),
        phone: formattedPhone,
        username: trimmedUsername,
        email: email?.trim() || `${full_name.toLowerCase().replace(/\s+/g, '.')}@navsarimunicipal.gov.in`,
        preferred_language: 'en',
        address: `NMC Ward ${wardsList.join(', ')} Office, Navsari`,
        locality: primaryWardObj ? `Ward ${primaryWardObj.ward_number} - ${primaryWardObj.ward_name}` : `Ward ${primaryWardNum}`,
        ward_number: primaryWardNum,
        is_active: true,
        role: 'ward_officer',
        created_at: nowIso,
        updated_at: nowIso
      };
      (newProfile as any).assigned_wards = wardsList;
      (newProfile as any).allowed_tabs = allowedTabsList;
      store.profiles.push(newProfile);

      // 2. Create AuthProfile for direct login
      const newAuthProfile: CitizenAuthProfile = {
        id: `auth-${randomUUID().slice(0, 8)}`,
        user_id: newUserId,
        mobile_number: formattedPhone,
        password_hash: passwordHash,
        mobile_verified: true,
        verification_completed_at: nowIso,
        account_status: 'active',
        created_at: nowIso,
        updated_at: nowIso
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
        created_at: nowIso
      };
      if (trimmedUsername) (newOfficer as any).username = trimmedUsername;
      (newOfficer as any).allowed_tabs = allowedTabsList;
      (newOfficer as any).updated_at = nowIso;
      store.wardOfficers.push(newOfficer);

      // 4. Persist to PostgreSQL so officer & ward assignments survive restarts & reflect everywhere
      await DbRepository.saveWardOfficerToDb(newOfficer, passwordHash, password);

      // 5. Update ward officer names in both store.wards and NAVSARI_WARDS
      for (const wNum of wardsList) {
        const w = store.wards.find(w => w.ward_number === wNum);
        if (w) {
          w.ward_officer_name = newOfficer.full_name;
          w.contact_phone = newOfficer.phone;
        }
        const nw = NAVSARI_WARDS.find(w => w.ward_number === wNum);
        if (nw) {
          nw.ward_officer_name = newOfficer.full_name;
          nw.contact_phone = newOfficer.phone;
        }
      }

      res.status(201).json({
        success: true,
        message: `Ward Officer ${newOfficer.full_name} created successfully for Ward ${wardsList.join(', ')}. They can log in with mobile ${formattedPhone}.`,
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
      const { full_name, phone, email, username, designation, assigned_wards, allowed_tabs, is_active, password } = req.body;

      await DbRepository.syncWardOfficersFromDb().catch(() => {});
      const officer = store.wardOfficers.find(o => o.id === id || o.user_id === id);
      if (!officer) {
        res.status(404).json({ success: false, error: 'Ward Officer not found.' });
        return;
      }

      if (username !== undefined && String(username).trim()) {
        const trimmedU = String(username).trim();
        if (/\s/.test(trimmedU)) {
          res.status(400).json({ success: false, error: 'Username cannot contain spaces.' });
          return;
        }
        const unameCheck = await DbRepository.isUsernameTaken(trimmedU, {
          officerId: officer.id,
          userId: officer.user_id
        });
        if (unameCheck.taken) {
          res.status(409).json({
            success: false,
            error: `Username "${trimmedU}" is already taken across the platform. Please choose a unique username.`
          });
          return;
        }
        (officer as any).username = trimmedU;
      }

      const previousWards = [...(officer.assigned_wards || [])];
      if (full_name) officer.full_name = full_name.trim();
      if (email) officer.email = email.trim();
      if (designation) officer.designation = designation.trim();
      if (is_active !== undefined) officer.is_active = Boolean(is_active);

      if (phone) {
        const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`;
        officer.phone = formattedPhone;
      }

      if (assigned_wards && Array.isArray(assigned_wards) && assigned_wards.length > 0) {
        officer.assigned_wards = Array.from(
          new Set(assigned_wards.map(Number).filter(n => !isNaN(n) && n >= 1 && n <= 13))
        ).sort((a, b) => a - b);
      }

      if (allowed_tabs !== undefined) {
        (officer as any).allowed_tabs = AdminController.sanitizeAllowedTabs(allowed_tabs);
      }

      const nowIso = new Date().toISOString();
      (officer as any).updated_at = nowIso;

      // Sync ward officer names in store.wards & NAVSARI_WARDS for both newly assigned and removed wards
      const affectedWards = Array.from(new Set([...previousWards, ...(officer.assigned_wards || [])]));
      for (const wNum of affectedWards) {
        const activeOfficersForWard = store.wardOfficers
          .filter(o => o.is_active !== false && o.assigned_wards.map(Number).includes(wNum))
          .sort((a: any, b: any) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
        const lead = activeOfficersForWard[0];
        const w = store.wards.find(w => w.ward_number === wNum);
        if (w) {
          w.ward_officer_name = lead ? lead.full_name : 'Unassigned';
          w.contact_phone = lead ? lead.phone : 'N/A';
        }
        const nw = NAVSARI_WARDS.find(w => w.ward_number === wNum);
        if (nw) {
          nw.ward_officer_name = lead ? lead.full_name : 'Unassigned';
          nw.contact_phone = lead ? lead.phone : 'N/A';
        }
      }

      // Update corresponding Profile (including ward_number, locality, address, assigned_wards!)
      const primaryWardNum = officer.assigned_wards[0] || 1;
      const primaryWardObj = store.wards.find(w => w.ward_number === primaryWardNum);
      const profile = store.profiles.find(p => p.id === officer.user_id);
      if (profile) {
        if (full_name) profile.full_name = full_name.trim();
        if (email) profile.email = email.trim();
        if (phone) profile.phone = officer.phone;
        if (is_active !== undefined) profile.is_active = Boolean(is_active);
        profile.ward_number = primaryWardNum;
        profile.locality = primaryWardObj ? `Ward ${primaryWardObj.ward_number} - ${primaryWardObj.ward_name}` : `Ward ${primaryWardNum}`;
        profile.address = `NMC Ward ${officer.assigned_wards.join(', ')} Office, Navsari`;
        (profile as any).assigned_wards = officer.assigned_wards;
        if ((officer as any).allowed_tabs) {
          (profile as any).allowed_tabs = (officer as any).allowed_tabs;
        }
        profile.updated_at = nowIso;
      }

      // If new password provided, update authProfile
      let newPasswordHash: string | undefined;
      if (password && password.length >= 6) {
        newPasswordHash = await bcrypt.hash(password, 10);
        const authProfile = store.authProfiles.find(a => a.user_id === officer.user_id);
        if (authProfile) {
          authProfile.password_hash = newPasswordHash;
          (authProfile as any).plain_password = password;
          authProfile.updated_at = nowIso;
        }
      }

      // Persist changes to PostgreSQL
      await DbRepository.saveWardOfficerToDb(officer, newPasswordHash, password && password.length >= 6 ? password : undefined);

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
      const { full_name, phone, username, password, designation, ward_number, preferred_language } = req.body;

      if (!full_name || !phone || !password) {
        res.status(400).json({ success: false, error: 'Full name, phone number, and password are required.' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
        return;
      }

      const trimmedUsername = username && String(username).trim() ? String(username).trim() : undefined;
      if (trimmedUsername) {
        if (/\s/.test(trimmedUsername)) {
          res.status(400).json({ success: false, error: 'Username cannot contain spaces.' });
          return;
        }
        const unameCheck = await DbRepository.isUsernameTaken(trimmedUsername);
        if (unameCheck.taken) {
          res.status(409).json({
            success: false,
            error: `Username "${trimmedUsername}" is already taken across the platform. Please choose a unique username.`
          });
          return;
        }
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

      const workerCode = await DbRepository.generateUniqueWorkerCode();
      const effectiveUsername = trimmedUsername || workerCode;

      // 1. Create Profile
      const newProfile: Profile = {
        id: newUserId,
        full_name: full_name.trim(),
        phone: formattedPhone,
        username: effectiveUsername,
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
      const newWorkerEntry = {
        id: randomUUID(),
        user_id: newUserId,
        worker_code: workerCode,
        username: effectiveUsername,
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
      const flagged = await AdminController.computeFlaggedOfficers();
      res.status(200).json({ success: true, data: flagged });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/admin/ward-analysis/:wardNumber
   * End-to-end dynamic Ward Analysis for Super Admin:
   * - Ward profile, geofence polygon & centroid, assigned officers & SLA breaches
   * - Real-time KPIs & live formula-driven cleanliness score
   * - Dynamic geospatial hotspots & individual complaint markers
   * - Category-wise counts, SLA breaches & average resolution hours
   * - Status breakdown & 6-month reported vs resolved trend
   * - Full ward complaints list with live assignment & status-tracking timelines
   * - Live AI Analytics suite (Seasonal Predictions, Chronic Hotspots, Top Performers, Executive Insights)
   * - Workforce, teams, registered communities, drives & community problems
   */
  public static async getWardAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const wardNumber = Number(req.params.wardNumber);
      if (!Number.isFinite(wardNumber) || wardNumber < 1) {
        res.status(400).json({ success: false, error: 'Valid wardNumber is required.' });
        return;
      }

      await DbRepository.syncWardOfficersFromDb().catch(() => {});

      const ward = store.wards.find(w => Number(w.ward_number) === wardNumber);
      if (!ward) {
        res.status(404).json({ success: false, error: `Ward ${wardNumber} not found.` });
        return;
      }

      // Parallel fetch of all live PostgreSQL + AI analytics data for this ward
      const [
        dbComplaints,
        dbWorkers,
        dbTeams,
        dbCommunities,
        dbDrives,
        dbCommunityProblems,
        wardBoundaryHistory,
        allFlaggedOfficers,
        aiSeasonal,
        aiPerformers,
        aiChronic
      ] = await Promise.all([
        DbRepository.getComplaints({}).catch(() => []),
        DbRepository.getWorkersList({ ward_number: wardNumber }).catch(() => []),
        DbRepository.getTeamsList(wardNumber).catch(() => []),
        DbRepository.getCommunitiesList([wardNumber], true).catch(() => []),
        DbRepository.getWardOrganizationDrives([wardNumber]).catch(() => []),
        DbRepository.getCommunityProblems([wardNumber]).catch(() => []),
        DbRepository.getBoundaryHistory('ward').catch(() => []),
        AdminController.computeFlaggedOfficers().catch(() => []),
        AIAnalyticsService.getSeasonalPredictions([wardNumber]).catch(() => ({
          current_season: '',
          forecast_month: '',
          total_predictions: 0,
          ward_numbers: [wardNumber],
          predictions: []
        })),
        AIAnalyticsService.getPerformersSuggestions([wardNumber]).catch(() => ({
          ward_numbers: [wardNumber],
          top_workers: [],
          top_communities: [],
          top_citizens: []
        })),
        AIAnalyticsService.getChronicHotspots([wardNumber]).catch(() => ({
          ward_numbers: [wardNumber],
          total_chronic_spots: 0,
          high_reopen_spots_count: 0,
          chronic_hotspots: []
        }))
      ]);

      // Merge store + DB complaints (DB wins on duplicate ID) and filter strictly to this ward
      const mergedComplaintsMap = new Map<string, any>();
      for (const sc of store.complaints || []) mergedComplaintsMap.set(sc.id, sc);
      for (const dc of dbComplaints || []) mergedComplaintsMap.set(dc.id, dc);

      const wardComplaintsRaw = Array.from(mergedComplaintsMap.values())
        .filter(c => Number(c.location?.ward_number ?? c.ward_number) === wardNumber)
        .sort((a, b) => {
          const ta = new Date(a.submitted_at || a.created_at || 0).getTime();
          const tb = new Date(b.submitted_at || b.created_at || 0).getTime();
          return tb - ta;
        });

      // Resolve latest ward boundary polygon ([lng, lat][] -> [lat, lng][] for Leaflet)
      const latestHistoryBoundary = (wardBoundaryHistory || []).find(
        (h: any) => Number(h.ward_number) === wardNumber && Array.isArray(h.coordinates) && h.coordinates.length >= 3
      );
      const overrideBoundary = store.adminBoundarySettings?.ward_boundary_overrides?.[wardNumber];
      const rawBoundaryCoords: [number, number][] =
        (latestHistoryBoundary?.coordinates as [number, number][]) ||
        overrideBoundary ||
        ward.boundary_coordinates ||
        [];

      const leafletPolygon: [number, number][] = rawBoundaryCoords.map(pt => {
        const a = Number(pt[0]);
        const b = Number(pt[1]);
        // Navsari lat ~20.8-21.1, lng ~72.8-73.1: detect order safely
        return a > 60 ? [b, a] : [a, b];
      });

      const centroid: [number, number] =
        leafletPolygon.length > 0
          ? [
              Number((leafletPolygon.reduce((s, p) => s + p[0], 0) / leafletPolygon.length).toFixed(5)),
              Number((leafletPolygon.reduce((s, p) => s + p[1], 0) / leafletPolygon.length).toFixed(5))
            ]
          : [Number((20.925 + wardNumber * 0.0022).toFixed(5)), Number((72.922 + wardNumber * 0.0018).toFixed(5))];

      // Filter SLA breaches strictly to this ward
      const wardBreaches = allFlaggedOfficers.flatMap(f =>
        (f.overdue_complaints || [])
          .filter((b: any) => Number(b.ward_number) === wardNumber)
          .map((b: any) => ({
            ...b,
            officer_name: f.officer.full_name,
            officer_phone: f.officer.phone
          }))
      );
      const breachByComplaintNumber = new Map<string, any>();
      for (const b of wardBreaches) {
        breachByComplaintNumber.set(String(b.complaint_number), b);
      }

      // Enrich each complaint with live assignments, SLA tracking, and complete status timeline
      const now = Date.now();
      const RESOLVED_STATUSES = new Set(['resolved', 'closed', 'verified_complete']);
      const CLOSED_OR_REJECTED = new Set(['resolved', 'closed', 'verified_complete', 'rejected']);

      const enrichedComplaints = await Promise.all(
        wardComplaintsRaw.map(async c => {
          const st = String(c.status || 'submitted').toLowerCase();
          const category = (store.categories || []).find(
            cat =>
              cat.id === c.category_id ||
              cat.category_name.toLowerCase() === String(c.category_name || '').toLowerCase()
          );
          const maxApprovalDays = category?.max_approval_days ?? 2;
          const maxWorkDays = category?.max_work_days ?? 3;

          const attempts = await DbRepository.getAssignmentsAndEvidenceForComplaint(
            c.id,
            c.complaint_number
          ).catch(() => []);
          const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;

          const submittedMs = new Date(c.submitted_at || c.created_at || now).getTime();
          const resolvedMs = c.resolved_at ? new Date(c.resolved_at).getTime() : null;
          const daysElapsed = Math.max(0, Math.floor((now - submittedMs) / (1000 * 60 * 60 * 24)));
          const resolutionHours =
            resolvedMs && resolvedMs >= submittedMs
              ? Number(((resolvedMs - submittedMs) / (1000 * 60 * 60)).toFixed(1))
              : null;

          const breach = breachByComplaintNumber.get(String(c.complaint_number));
          let slaStatus: 'on_track' | 'approval_breach' | 'work_breach' | 'resolved_on_time' | 'resolved_late' | 'rejected' = 'on_track';
          if (st === 'rejected') {
            slaStatus = 'rejected';
          } else if (RESOLVED_STATUSES.has(st)) {
            const maxTotalHours = (maxApprovalDays + maxWorkDays) * 24;
            slaStatus = resolutionHours !== null && resolutionHours > maxTotalHours ? 'resolved_late' : 'resolved_on_time';
          } else if (breach?.breach_type === 'approval_sla') {
            slaStatus = 'approval_breach';
          } else if (breach?.breach_type === 'work_sla') {
            slaStatus = 'work_breach';
          }

          // Normalize status timeline
          const rawTimeline: any[] = Array.isArray(c.timeline) ? c.timeline : [];
          const normalizedTimeline =
            rawTimeline.length > 0
              ? rawTimeline.map((t: any) => ({
                  status: t.status || 'updated',
                  timestamp: t.timestamp || t.created_at || c.submitted_at,
                  actor_name: t.actor_name || t.actor || 'NMC System',
                  actor_role: t.actor_role || 'system',
                  note: t.note || ''
                }))
              : [
                  {
                    status: 'submitted',
                    timestamp: c.submitted_at || c.created_at,
                    actor_name: c.citizen_name || 'Citizen',
                    actor_role: 'citizen',
                    note: 'Complaint registered with geo-tagged evidence.'
                  },
                  ...(latestAttempt?.assigned_at
                    ? [
                        {
                          status: 'assigned',
                          timestamp: latestAttempt.assigned_at,
                          actor_name: latestAttempt.team_leader_name || 'Ward Officer',
                          actor_role: 'ward_officer',
                          note: `Assigned to ${latestAttempt.team_name || 'Ward Field Squad'}`
                        }
                      ]
                    : []),
                  ...(c.resolved_at
                    ? [
                        {
                          status: st,
                          timestamp: c.resolved_at,
                          actor_name: 'Ward Officer',
                          actor_role: 'ward_officer',
                          note: 'Work completed and verified.'
                        }
                      ]
                    : [])
                ];

          const rawLat = Number(c.location?.latitude ?? c.latitude);
          const rawLng = Number(c.location?.longitude ?? c.longitude);
          const hasValidCoords = Number.isFinite(rawLat) && Number.isFinite(rawLng) && rawLat !== 0 && rawLng !== 0;

          return {
            id: c.id,
            complaint_number: c.complaint_number,
            category_id: c.category_id || category?.id || 'general',
            category_name: category?.category_name || c.category_name || 'General Waste',
            category_name_gu: category?.category_name_gu || '',
            description: c.description || '',
            status: st,
            is_urgent: Boolean(c.is_urgent || c.priority === 'urgent' || c.priority === 'high'),
            priority: c.priority || (c.is_urgent ? 'high' : 'normal'),
            submitted_at: c.submitted_at || c.created_at,
            approved_at: c.approved_at || null,
            resolved_at: c.resolved_at || null,
            updated_at: c.updated_at || c.submitted_at || c.created_at,
            days_elapsed: daysElapsed,
            resolution_hours: resolutionHours,
            max_approval_days: maxApprovalDays,
            max_work_days: maxWorkDays,
            sla_status: slaStatus,
            sla_breached: slaStatus === 'approval_breach' || slaStatus === 'work_breach',
            rejection_reason: c.rejection_reason || null,
            citizen_name: c.citizen_name || 'Navsari Citizen',
            citizen_phone: c.citizen_phone || null,
            address: c.location?.address || c.address || `Ward ${wardNumber}, Navsari`,
            landmark: c.location?.landmark || c.landmark || '',
            latitude: hasValidCoords ? rawLat : centroid[0],
            longitude: hasValidCoords ? rawLng : centroid[1],
            has_exact_coords: hasValidCoords,
            image_url: c.image_url || null,
            resolved_image_url: c.resolved_image_url || null,
            followers_count: Number(c.followers_count || 0),
            assigned_team_name: latestAttempt?.team_name || c.assigned_team_name || null,
            team_leader_name: latestAttempt?.team_leader_name || c.temporary_team_leader_name || null,
            assigned_workers_count: Array.isArray(latestAttempt?.members) ? latestAttempt.members.length : 0,
            assignment_status: latestAttempt?.status || null,
            attempts_count: attempts.length,
            status_timeline: normalizedTimeline
          };
        })
      );

      // Summary counts
      const totalComplaints = enrichedComplaints.length;
      const resolvedComplaints = enrichedComplaints.filter(c => RESOLVED_STATUSES.has(c.status)).length;
      const rejectedComplaints = enrichedComplaints.filter(c => c.status === 'rejected').length;
      const reopenedComplaints = enrichedComplaints.filter(c => c.status === 'reopened').length;
      const activeComplaints = enrichedComplaints.filter(c => !CLOSED_OR_REJECTED.has(c.status)).length;
      const pendingApproval = enrichedComplaints.filter(
        c => c.status === 'submitted' || c.status === 'under_review'
      ).length;
      const inProgress = enrichedComplaints.filter(c =>
        ['approved', 'assigned', 'team_assigned', 'in_progress', 'work_submitted', 'reopened'].includes(c.status)
      ).length;
      const urgentComplaints = enrichedComplaints.filter(c => c.is_urgent && !CLOSED_OR_REJECTED.has(c.status)).length;

      const resolvedHoursList = enrichedComplaints
        .map(c => c.resolution_hours)
        .filter((h): h is number => h !== null && Number.isFinite(h));
      const avgResolutionHours =
        resolvedHoursList.length > 0
          ? Number((resolvedHoursList.reduce((a, b) => a + b, 0) / resolvedHoursList.length).toFixed(1))
          : 0;

      const approvalSlaBreaches = wardBreaches.filter((b: any) => b.breach_type === 'approval_sla').length;
      const workSlaBreaches = wardBreaches.filter((b: any) => b.breach_type === 'work_sla').length;
      const totalSlaBreaches = approvalSlaBreaches + workSlaBreaches;

      const effectiveComplaints = Math.max(0, totalComplaints - rejectedComplaints);
      const resolutionRatePct =
        effectiveComplaints > 0 ? Math.round((resolvedComplaints / effectiveComplaints) * 100) : 100;
      const slaCompliancePct =
        effectiveComplaints > 0
          ? Math.max(0, Math.round(((effectiveComplaints - totalSlaBreaches) / effectiveComplaints) * 100))
          : 100;

      // Dynamic Geospatial Hotspots Clustering for this ward
      interface ClusterAcc {
        centerLat: number;
        centerLng: number;
        locality: string;
        address: string;
        items: typeof enrichedComplaints;
      }
      const hotspotClusters: ClusterAcc[] = [];
      for (const comp of enrichedComplaints) {
        const loc = comp.landmark || comp.address || `Ward ${wardNumber}`;
        const matched = hotspotClusters.find(cl => {
          const dist = Math.hypot(cl.centerLat - comp.latitude, cl.centerLng - comp.longitude);
          const sameLoc =
            cl.locality.toLowerCase().includes(loc.toLowerCase()) ||
            loc.toLowerCase().includes(cl.locality.toLowerCase());
          return dist < 0.003 || (sameLoc && dist < 0.007);
        });
        if (matched) {
          matched.items.push(comp);
          matched.centerLat = (matched.centerLat + comp.latitude) / 2;
          matched.centerLng = (matched.centerLng + comp.longitude) / 2;
        } else {
          hotspotClusters.push({
            centerLat: comp.latitude,
            centerLng: comp.longitude,
            locality: loc,
            address: comp.address,
            items: [comp]
          });
        }
      }

      const dynamicHotspots = hotspotClusters
        .map((cl, idx) => {
          const total = cl.items.length;
          const active = cl.items.filter(i => !CLOSED_OR_REJECTED.has(i.status)).length;
          const resolved = cl.items.filter(i => RESOLVED_STATUSES.has(i.status)).length;
          const reopened = cl.items.filter(i => i.status === 'reopened').length;
          const slaBreached = cl.items.filter(i => i.sla_breached).length;

          const catFreq: Record<string, number> = {};
          for (const it of cl.items) {
            catFreq[it.category_name] = (catFreq[it.category_name] || 0) + 1;
          }
          const dominantCategory =
            Object.entries(catFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General Waste';

          const frequencyLevel: 'high' | 'medium' | 'low' =
            total >= 3 || active >= 2 || reopened >= 1
              ? 'high'
              : total >= 2 || active >= 1
              ? 'medium'
              : 'low';

          const riskScore = Math.min(100, total * 18 + active * 15 + reopened * 20 + slaBreached * 15);
          const sortedDates = cl.items
            .map(i => new Date(i.submitted_at || 0).getTime())
            .filter(t => t > 0)
            .sort((a, b) => b - a);

          return {
            id: `whs-w${wardNumber}-${idx + 1}`,
            ward_number: wardNumber,
            locality: cl.locality,
            address: cl.address,
            latitude: Number(cl.centerLat.toFixed(5)),
            longitude: Number(cl.centerLng.toFixed(5)),
            total_complaints: total,
            active_complaints: active,
            resolved_complaints: resolved,
            reopened_complaints: reopened,
            sla_breached_count: slaBreached,
            dominant_category: dominantCategory,
            frequency_level: frequencyLevel,
            risk_score: riskScore,
            last_reported_at: sortedDates[0] ? new Date(sortedDates[0]).toISOString() : null,
            complaint_ids: cl.items.map(i => i.id),
            complaint_numbers: cl.items.map(i => i.complaint_number)
          };
        })
        .sort((a, b) => b.risk_score - a.risk_score || b.total_complaints - a.total_complaints);

      // Category-wise dynamic breakdown
      const catAccMap = new Map<string, {
        category_id: string;
        category_name: string;
        category_name_gu: string;
        icon: string;
        max_approval_days: number;
        max_work_days: number;
        items: typeof enrichedComplaints;
      }>();

      for (const cat of store.categories || []) {
        if (cat.is_active === false) continue;
        catAccMap.set(cat.category_name.toLowerCase(), {
          category_id: cat.id,
          category_name: cat.category_name,
          category_name_gu: cat.category_name_gu || '',
          icon: cat.icon || 'trash',
          max_approval_days: cat.max_approval_days ?? 2,
          max_work_days: cat.max_work_days ?? 3,
          items: []
        });
      }

      for (const comp of enrichedComplaints) {
        const key = comp.category_name.toLowerCase();
        if (!catAccMap.has(key)) {
          catAccMap.set(key, {
            category_id: comp.category_id,
            category_name: comp.category_name,
            category_name_gu: comp.category_name_gu || '',
            icon: 'alert',
            max_approval_days: comp.max_approval_days,
            max_work_days: comp.max_work_days,
            items: []
          });
        }
        catAccMap.get(key)!.items.push(comp);
      }

      const categoryBreakdown = Array.from(catAccMap.values())
        .map(entry => {
          const total = entry.items.length;
          const active = entry.items.filter(i => !CLOSED_OR_REJECTED.has(i.status)).length;
          const pending = entry.items.filter(i => i.status === 'submitted' || i.status === 'under_review').length;
          const inProg = entry.items.filter(i =>
            ['approved', 'assigned', 'team_assigned', 'in_progress', 'work_submitted', 'reopened'].includes(i.status)
          ).length;
          const resolved = entry.items.filter(i => RESOLVED_STATUSES.has(i.status)).length;
          const reopened = entry.items.filter(i => i.status === 'reopened').length;
          const rejected = entry.items.filter(i => i.status === 'rejected').length;
          const breaches = entry.items.filter(i => i.sla_breached).length;
          const hrs = entry.items
            .map(i => i.resolution_hours)
            .filter((h): h is number => h !== null);
          const avgHrs = hrs.length > 0 ? Number((hrs.reduce((a, b) => a + b, 0) / hrs.length).toFixed(1)) : 0;
          const eff = Math.max(0, total - rejected);

          return {
            category_id: entry.category_id,
            category_name: entry.category_name,
            category_name_gu: entry.category_name_gu,
            icon: entry.icon,
            max_approval_days: entry.max_approval_days,
            max_work_days: entry.max_work_days,
            total,
            active,
            pending_approval: pending,
            in_progress: inProg,
            resolved,
            reopened,
            rejected,
            sla_breaches: breaches,
            resolution_rate_pct: eff > 0 ? Math.round((resolved / eff) * 100) : 0,
            avg_resolution_hours: avgHrs,
            share_pct: totalComplaints > 0 ? Math.round((total / totalComplaints) * 100) : 0
          };
        })
        .sort((a, b) => b.total - a.total || a.category_name.localeCompare(b.category_name));

      // Status distribution
      const statusCountsMap: Record<string, number> = {};
      for (const comp of enrichedComplaints) {
        statusCountsMap[comp.status] = (statusCountsMap[comp.status] || 0) + 1;
      }
      const statusBreakdown = Object.entries(statusCountsMap)
        .map(([status, count]) => ({
          status,
          count,
          share_pct: totalComplaints > 0 ? Math.round((count / totalComplaints) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

      // 6-month dynamic trend computed strictly from actual complaint timestamps
      const monthBuckets: Array<{ key: string; label: string; reported: number; resolved: number }> = [];
      const refDate = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        monthBuckets.push({ key, label, reported: 0, resolved: 0 });
      }
      const bucketMap = new Map(monthBuckets.map(b => [b.key, b]));
      for (const comp of enrichedComplaints) {
        const subDate = comp.submitted_at ? new Date(comp.submitted_at) : null;
        if (subDate && !isNaN(subDate.getTime())) {
          const k = `${subDate.getFullYear()}-${String(subDate.getMonth() + 1).padStart(2, '0')}`;
          if (bucketMap.has(k)) bucketMap.get(k)!.reported += 1;
        }
        const resDate = comp.resolved_at ? new Date(comp.resolved_at) : null;
        if (resDate && !isNaN(resDate.getTime())) {
          const k = `${resDate.getFullYear()}-${String(resDate.getMonth() + 1).padStart(2, '0')}`;
          if (bucketMap.has(k)) bucketMap.get(k)!.resolved += 1;
        }
      }

      // Assigned officers for this ward
      const assignedOfficers = (store.wardOfficers || [])
        .filter(
          o =>
            o.is_active !== false &&
            Array.isArray(o.assigned_wards) &&
            o.assigned_wards.map(Number).includes(wardNumber)
        )
        .map(o => {
          const officerBreaches = wardBreaches.filter((b: any) => b.officer_name === o.full_name);
          return {
            id: o.id,
            full_name: o.full_name,
            phone: o.phone,
            email: o.email,
            designation: o.designation,
            assigned_wards: o.assigned_wards,
            flagged: officerBreaches.length > 0,
            overdue_count: officerBreaches.length
          };
        });

      // Workforce & Civic Operations
      const workers =
        dbWorkers.length > 0
          ? dbWorkers
          : (store.workers || []).filter(
              (w: any) => w.ward_id === ward.id || Number(w.ward_number) === wardNumber
            );
      const availableWorkers = workers.filter(
        (w: any) => String(w.availability_status || 'available').toLowerCase() === 'available'
      ).length;
      const completedDrives = (dbDrives || []).filter(
        (d: any) =>
          String(d.event_status || d.status || '').toLowerCase() === 'completed' ||
          String(d.evidence_status || '').toLowerCase() === 'verified_complete'
      ).length;
      const openCommunityProblems = (dbCommunityProblems || []).filter(
        (p: any) => !['completed', 'resolved', 'closed'].includes(String(p.status || '').toLowerCase())
      ).length;

      // Dynamic Cleanliness Score Formula (100% real data, zero hardcoded static values)
      // 0.40 * Resolution Rate + 0.25 * SLA Compliance + 0.20 * Hotspot/Reopen Control + 0.15 * Civic Participation
      const highRiskHotspots = dynamicHotspots.filter(h => h.frequency_level === 'high').length;
      const reopenPenalty =
        effectiveComplaints > 0 ? Math.min(40, Math.round((reopenedComplaints / effectiveComplaints) * 100)) : 0;
      const hotspotControlScore = Math.max(20, 100 - highRiskHotspots * 12 - reopenPenalty);
      const participationScore = Math.min(
        100,
        50 + (dbCommunities || []).length * 10 + completedDrives * 15 + Math.max(0, (dbCommunityProblems || []).length - openCommunityProblems) * 10
      );
      const dynamicCleanlinessScore = Number(
        Math.min(
          100,
          Math.max(
            0,
            0.4 * resolutionRatePct +
              0.25 * slaCompliancePct +
              0.2 * hotspotControlScore +
              0.15 * participationScore
          )
        ).toFixed(1)
      );
      const cleanlinessGrade =
        dynamicCleanlinessScore >= 90
          ? 'A+'
          : dynamicCleanlinessScore >= 80
          ? 'A'
          : dynamicCleanlinessScore >= 70
          ? 'B+'
          : dynamicCleanlinessScore >= 60
          ? 'B'
          : dynamicCleanlinessScore >= 50
          ? 'C'
          : 'D';

      // Dynamic AI Executive Insights strictly computed from this ward's real metrics
      const executiveInsights: Array<{
        type: 'critical' | 'warning' | 'positive' | 'info';
        title: string;
        detail: string;
        metric?: string;
      }> = [];

      if (totalSlaBreaches > 0) {
        executiveInsights.push({
          type: 'critical',
          title: 'Active SLA Escalation Required',
          detail: `Ward ${wardNumber} currently has ${totalSlaBreaches} overdue complaint${totalSlaBreaches === 1 ? '' : 's'} (${approvalSlaBreaches} approval breach${approvalSlaBreaches === 1 ? '' : 'es'}, ${workSlaBreaches} work deadline breach${workSlaBreaches === 1 ? '' : 'es'}). Immediate officer intervention is recommended.`,
          metric: `${slaCompliancePct}% SLA`
        });
      } else {
        executiveInsights.push({
          type: 'positive',
          title: 'Zero Active SLA Breaches',
          detail: `All ${effectiveComplaints} recorded civic complaints in Ward ${wardNumber} are operating within configured approval and field work SLA deadlines.`,
          metric: '100% On-Time'
        });
      }

      const topCategory = categoryBreakdown.find(c => c.total > 0);
      if (topCategory) {
        executiveInsights.push({
          type: topCategory.active >= 3 ? 'warning' : 'info',
          title: `Primary Grievance Driver: ${topCategory.category_name}`,
          detail: `"${topCategory.category_name}" accounts for ${topCategory.share_pct}% of Ward ${wardNumber} reports (${topCategory.total} total, ${topCategory.active} still active, ${topCategory.resolution_rate_pct}% resolved).`,
          metric: `${topCategory.total} Reports`
        });
      }

      if (dynamicHotspots.length > 0 && dynamicHotspots[0].total_complaints >= 2) {
        const topHs = dynamicHotspots[0];
        executiveInsights.push({
          type: topHs.frequency_level === 'high' ? 'critical' : 'warning',
          title: `Highest-Density Hotspot: ${topHs.locality}`,
          detail: `${topHs.total_complaints} clustered complaints (${topHs.active_complaints} active, ${topHs.reopened_complaints} reopened) predominantly for "${topHs.dominant_category}". Consider deploying a dedicated pickup schedule or permanent bin installation.`,
          metric: `Risk ${topHs.risk_score}/100`
        });
      }

      if (workers.length > 0) {
        const loadRatio = Number((activeComplaints / Math.max(1, workers.length)).toFixed(2));
        executiveInsights.push({
          type: loadRatio > 2 ? 'warning' : 'positive',
          title: 'Field Workforce Capacity Balance',
          detail: `${workers.length} assigned field worker${workers.length === 1 ? '' : 's'} (${availableWorkers} currently available) across ${(dbTeams || []).length} team${(dbTeams || []).length === 1 ? '' : 's'} handling ${activeComplaints} open task${activeComplaints === 1 ? '' : 's'} (~${loadRatio} open complaints per worker).`,
          metric: `${workers.length} Staff`
        });
      } else if (activeComplaints > 0) {
        executiveInsights.push({
          type: 'critical',
          title: 'Unstaffed Active Workload Alert',
          detail: `Ward ${wardNumber} has ${activeComplaints} active complaint${activeComplaints === 1 ? '' : 's'} but 0 sanitation workers mapped in the directory. Assign field workers from Staff Management.`,
          metric: '0 Staff'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          generated_at: new Date().toISOString(),
          ward: {
            id: ward.id,
            ward_number: wardNumber,
            ward_name: ward.ward_name,
            ward_name_gu: ward.ward_name_gu,
            office_address: ward.office_address,
            officers: assignedOfficers,
            primary_officer_name: assignedOfficers[0]?.full_name || ward.ward_officer_name || 'Unassigned',
            primary_officer_phone: assignedOfficers[0]?.phone || ward.contact_phone || 'N/A',
            cleanliness_score: dynamicCleanlinessScore,
            cleanliness_grade: cleanlinessGrade,
            score_breakdown: {
              resolution_component: Number((0.4 * resolutionRatePct).toFixed(1)),
              sla_component: Number((0.25 * slaCompliancePct).toFixed(1)),
              hotspot_control_component: Number((0.2 * hotspotControlScore).toFixed(1)),
              participation_component: Number((0.15 * participationScore).toFixed(1)),
              resolution_rate_pct: resolutionRatePct,
              sla_compliance_pct: slaCompliancePct,
              hotspot_control_pct: hotspotControlScore,
              participation_pct: participationScore
            }
          },
          summary: {
            total_complaints: totalComplaints,
            active_complaints: activeComplaints,
            pending_approval: pendingApproval,
            in_progress: inProgress,
            resolved_complaints: resolvedComplaints,
            reopened_complaints: reopenedComplaints,
            rejected_complaints: rejectedComplaints,
            urgent_complaints: urgentComplaints,
            resolution_rate_pct: resolutionRatePct,
            avg_resolution_hours: avgResolutionHours,
            sla_compliance_rate_pct: slaCompliancePct,
            approval_sla_breaches: approvalSlaBreaches,
            work_sla_breaches: workSlaBreaches,
            total_sla_breaches: totalSlaBreaches,
            total_hotspots: dynamicHotspots.length,
            high_risk_hotspots: highRiskHotspots,
            total_workers: workers.length,
            available_workers: availableWorkers,
            total_teams: (dbTeams || []).length,
            total_communities: (dbCommunities || []).length,
            total_drives: (dbDrives || []).length,
            completed_drives: completedDrives,
            total_community_problems: (dbCommunityProblems || []).length,
            open_community_problems: openCommunityProblems
          },
          map_data: {
            ward_boundary: leafletPolygon,
            centroid,
            hotspots: dynamicHotspots,
            complaint_markers: enrichedComplaints.map(c => ({
              id: c.id,
              complaint_number: c.complaint_number,
              category_name: c.category_name,
              status: c.status,
              is_urgent: c.is_urgent,
              sla_breached: c.sla_breached,
              latitude: c.latitude,
              longitude: c.longitude,
              address: c.address,
              landmark: c.landmark,
              submitted_at: c.submitted_at
            }))
          },
          category_breakdown: categoryBreakdown,
          status_breakdown: statusBreakdown,
          monthly_trend: monthBuckets,
          complaints: enrichedComplaints,
          ai_analytics: {
            executive_insights: executiveInsights,
            seasonal: aiSeasonal,
            performers: aiPerformers,
            chronic: aiChronic
          },
          operations: {
            sla_breaches: wardBreaches,
            workers,
            teams: dbTeams || [],
            communities: dbCommunities || [],
            drives: dbDrives || [],
            community_problems: dbCommunityProblems || []
          }
        }
      });
    } catch (err: any) {
      console.error('[AdminController.getWardAnalysis ERROR]:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to generate ward analysis' });
    }
  }

  /**
   * GET /api/admin/complaints/:id/tracking
   * Deep complaint status-tracking audit (timeline, worker assignments, attendance, evidence, SLA)
   */
  public static async getComplaintTrackingDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dbComplaint = await DbRepository.getComplaintById(id).catch(() => null);
      const complaint: any = dbComplaint || (store.complaints || []).find(c => c.id === id);

      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found.' });
        return;
      }

      const attempts = await DbRepository.getAssignmentsAndEvidenceForComplaint(
        complaint.id,
        complaint.complaint_number
      ).catch(() => []);

      const category = (store.categories || []).find(
        cat =>
          cat.id === complaint.category_id ||
          cat.category_name.toLowerCase() === String(complaint.category_name || '').toLowerCase()
      );

      const rawTimeline: any[] = Array.isArray(complaint.timeline) ? complaint.timeline : [];
      const builtTimeline =
        rawTimeline.length > 0
          ? rawTimeline
          : [
              {
                status: 'submitted',
                timestamp: complaint.submitted_at || complaint.created_at,
                actor_name: complaint.citizen_name || 'Citizen',
                actor_role: 'citizen',
                note: 'Complaint submitted with geo-tagged evidence.'
              },
              ...(complaint.approved_at
                ? [
                    {
                      status: 'approved',
                      timestamp: complaint.approved_at,
                      actor_name: 'Ward Officer',
                      actor_role: 'ward_officer',
                      note: 'Complaint verified and approved for field action.'
                    }
                  ]
                : []),
              ...attempts.map((a: any) => ({
                status: a.status || 'assigned',
                timestamp: a.assigned_at || a.created_at || complaint.updated_at,
                actor_name: a.team_leader_name || 'Ward Officer',
                actor_role: 'ward_officer',
                note: `Assigned to ${a.team_name || 'Field Squad'}${
                  Array.isArray(a.members) && a.members.length > 0 ? ` (${a.members.length} workers)` : ''
                }`
              })),
              ...(complaint.resolved_at
                ? [
                    {
                      status: complaint.status || 'resolved',
                      timestamp: complaint.resolved_at,
                      actor_name: 'Ward Officer',
                      actor_role: 'ward_officer',
                      note: 'Work verified and complaint resolved.'
                    }
                  ]
                : []),
              ...(complaint.status === 'rejected'
                ? [
                    {
                      status: 'rejected',
                      timestamp: complaint.updated_at || complaint.submitted_at,
                      actor_name: 'Ward Officer',
                      actor_role: 'ward_officer',
                      note: complaint.rejection_reason || 'Complaint rejected during ward review.'
                    }
                  ]
                : [])
            ];

      res.status(200).json({
        success: true,
        data: {
          complaint,
          category_sla: {
            max_approval_days: category?.max_approval_days ?? 2,
            max_work_days: category?.max_work_days ?? 3
          },
          assignments: attempts,
          timeline: builtTimeline
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to load complaint tracking details' });
    }
  }
}
