import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { DbRepository } from '../data/dbRepository.js';
import { pool, isDbConnected } from '../data/db.js';
import { AIAnalyticsService } from '../services/aiAnalyticsService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { normalizeIndianPhone } from './authController.js';
import { store } from '../data/store.js';
import {
  WardDashboardSummary,
  ComplaintWorkAttempt,
  WardHotspot,
  WardCleanlinessScore,
  WardApprovalItem,
  WorkerAttendance,
  WorkEvidence,
  WorkCompletionReport,
  WorkAssignment,
  CommunityRegistrationRequest,
  SimulatedSms
} from '../types/index.js';

// In-memory store for work attempts and hotspot tracking
interface InMemoryWardData {
  workAttempts: Map<string, ComplaintWorkAttempt[]>;
  reopenEvents: any[];
  attendanceExceptions: any[];
  cleanlinessScore: WardCleanlinessScore;
}

const wardData: InMemoryWardData = {
  workAttempts: new Map(),
  reopenEvents: [],
  attendanceExceptions: [
    {
      id: 'att-ex-01',
      assignment_id: 'tsk-nav-2026-101',
      worker_id: 'f2000000-0000-0000-0000-000000000002',
      worker_name: 'Suresh Vaghela',
      worker_code: 'WRK-2026-042',
      designation: 'Waste Collection Worker',
      reason: 'Mobile GPS signal shielded inside underground concrete basement of municipal drainage pump room.',
      distance_meters: 185,
      geofence_radius: 100,
      timestamp: '2026-10-31T08:42:00Z',
      status: 'pending'
    }
  ],
  cleanlinessScore: {
    current_score: 87.2,
    previous_score: 83.5,
    monthly_trend: [
      { month: 'Jun', score: 78.4 },
      { month: 'Jul', score: 80.1 },
      { month: 'Aug', score: 81.6 },
      { month: 'Sep', score: 83.5 },
      { month: 'Oct', score: 85.8 },
      { month: 'Nov', score: 87.2 }
    ],
    components: {
      physical_cleanliness: 88.5,     // 0.40 * 88.5 = 35.40
      hotspot_improvement: 84.0,     // 0.25 * 84.0 = 21.00
      verified_resolution: 91.2,     // 0.20 * 91.2 = 18.24
      community_participation: 83.7  // 0.15 * 83.7 = 12.56
    },
    formula_breakdown: '(0.40 × 88.5) + (0.25 × 84.0) + (0.20 × 91.2) + (0.15 × 83.7) = 87.2',
    inspection_coverage_pct: 94.5,
    active_hotspots_count: 3,
    last_updated: '2026-11-01T10:00:00Z'
  }
};

// Seed initial historical work attempts for Ward 3 complaints
function initializeSeedAttempts() {
  if (wardData.workAttempts.size > 0) return;

  // Complaint 1: comp-01 (Multi-attempt demonstration with Reopened attempt)
  const comp1Attempts: ComplaintWorkAttempt[] = [
    {
      id: 'att-comp-01-day1',
      complaint_id: 'comp-01',
      attempt_number: 1,
      assignment_id: 'tsk-nav-2026-101',
      task_code: 'TSK-NAV-2026-101',
      assigned_date: '2026-10-28T09:30:00Z',
      team_leader_id: 'f2000000-0000-0000-0000-000000000001',
      team_leader_name: 'Kanti Solanki',
      team_members: [
        {
          worker_id: 'f2000000-0000-0000-0000-000000000001',
          worker_code: 'WRK-2026-001',
          name: 'Kanti Solanki',
          designation: 'Sanitation Worker',
          is_temporary_leader: true
        },
        {
          worker_id: 'f2000000-0000-0000-0000-000000000002',
          worker_code: 'WRK-2026-042',
          name: 'Suresh Vaghela',
          designation: 'Waste Collection Worker',
          is_temporary_leader: false
        }
      ],
      attendance_records: [
        {
          id: 'att-rec-01',
          assignment_id: 'tsk-nav-2026-101',
          worker_id: 'f2000000-0000-0000-0000-000000000001',
          attendance_timestamp: '2026-10-28T10:15:22Z',
          latitude: 20.93121,
          longitude: 72.92842,
          gps_accuracy: 6.2,
          distance_from_assignment_meters: 14.8,
          geofence_radius_meters: 100,
          validation_status: 'verified_match',
          attendance_method: 'gps',
          created_at: '2026-10-28T10:15:22Z'
        },
        {
          id: 'att-rec-02',
          assignment_id: 'tsk-nav-2026-101',
          worker_id: 'f2000000-0000-0000-0000-000000000002',
          attendance_timestamp: '2026-10-28T10:18:40Z',
          latitude: 20.93118,
          longitude: 72.92839,
          gps_accuracy: 8.5,
          distance_from_assignment_meters: 22.1,
          geofence_radius_meters: 100,
          validation_status: 'verified_match',
          attendance_method: 'gps',
          created_at: '2026-10-28T10:18:40Z'
        }
      ],
      evidence: [
        {
          id: 'ev-comp-01-before',
          assignment_id: 'tsk-nav-2026-101',
          submitted_by: 'f2000000-0000-0000-0000-000000000001',
          evidence_type: 'before',
          storage_path: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
          description: 'Overflowing dustbin with scattered plastic wrappers and milk pouches outside North Garden Gate.',
          latitude: 20.9312,
          longitude: 72.9284,
          distance_from_assignment_meters: 12.0,
          location_validation_status: 'location_matched',
          device_capture_timestamp: '2026-10-28T10:20:00Z',
          server_upload_timestamp: '2026-10-28T10:22:00Z',
          review_status: 'verified',
          created_at: '2026-10-28T10:22:00Z'
        },
        {
          id: 'ev-comp-01-after',
          assignment_id: 'tsk-nav-2026-101',
          submitted_by: 'f2000000-0000-0000-0000-000000000001',
          evidence_type: 'after',
          storage_path: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
          description: 'Garbage cleared from pavement. Bin emptied into municipal tipper truck.',
          latitude: 20.9312,
          longitude: 72.9284,
          distance_from_assignment_meters: 11.5,
          location_validation_status: 'location_matched',
          device_capture_timestamp: '2026-10-28T12:45:00Z',
          server_upload_timestamp: '2026-10-28T12:50:00Z',
          review_status: 'changes_requested',
          review_comments: 'Surface pavement still wet with foul black seepage. Disinfectant bleaching powder spray required.',
          created_at: '2026-10-28T12:50:00Z'
        }
      ],
      completion_report: {
        id: 'cr-comp-01-day1',
        assignment_id: 'tsk-nav-2026-101',
        submitted_by: 'f2000000-0000-0000-0000-000000000001',
        submitted_by_name: 'Kanti Solanki (Team Leader)',
        completion_description: 'Emptied overflowing community bin and swept perimeter of 25 meters.',
        actual_start_time: '2026-10-28T10:25:00Z',
        actual_end_time: '2026-10-28T12:40:00Z',
        waste_quantity: 'Approx 380 kg solid waste',
        waste_disposal_destination: 'Junathana Waste Processing Plant',
        equipment_used: ['NMC Tipper Truck GJ-21-N-4421', 'Heavy brooms', 'Metal shovels', 'Trash bins'],
        issues_encountered: 'High pedestrian foot traffic around lakeside temple gate during peak hours.',
        status: 'changes_requested',
        reviewed_by: 'w0000000-0000-0000-0000-000000000003',
        reviewer_name: 'Ramesh Patel (Ward 3 Officer)',
        review_comments: 'Pavement washing and lime powder dusting not completed. Please spray calcium hypochlorite disinfectant.',
        submitted_at: '2026-10-28T12:55:00Z'
      },
      status: 'changes_requested',
      review_decision: 'changes_requested',
      review_comments: 'Disinfectant powder spray required due to leachate odor near temple gate.',
      created_at: '2026-10-28T09:30:00Z'
    },
    {
      id: 'att-comp-01-day2',
      complaint_id: 'comp-01',
      attempt_number: 2,
      assignment_id: 'tsk-nav-2026-108',
      task_code: 'TSK-NAV-2026-108',
      assigned_date: '2026-10-29T08:00:00Z',
      team_leader_id: 'f2000000-0000-0000-0000-000000000001',
      team_leader_name: 'Kanti Solanki',
      team_members: [
        {
          worker_id: 'f2000000-0000-0000-0000-000000000001',
          worker_code: 'WRK-2026-001',
          name: 'Kanti Solanki',
          designation: 'Sanitation Worker',
          is_temporary_leader: true
        },
        {
          worker_id: 'f2000000-0000-0000-0000-000000000002',
          worker_code: 'WRK-2026-042',
          name: 'Suresh Vaghela',
          designation: 'Waste Collection Worker',
          is_temporary_leader: false
        }
      ],
      attendance_records: [
        {
          id: 'att-rec-03',
          assignment_id: 'tsk-nav-2026-108',
          worker_id: 'f2000000-0000-0000-0000-000000000001',
          attendance_timestamp: '2026-10-29T08:15:10Z',
          latitude: 20.93121,
          longitude: 72.92842,
          gps_accuracy: 5.8,
          distance_from_assignment_meters: 10.2,
          geofence_radius_meters: 100,
          validation_status: 'verified_match',
          attendance_method: 'gps',
          created_at: '2026-10-29T08:15:10Z'
        }
      ],
      evidence: [
        {
          id: 'ev-comp-01-day2-after',
          assignment_id: 'tsk-nav-2026-108',
          submitted_by: 'f2000000-0000-0000-0000-000000000001',
          evidence_type: 'after',
          storage_path: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
          description: 'Disinfectant bleaching powder sprayed thoroughly across 35 meters. Area clean and odor-free.',
          latitude: 20.9312,
          longitude: 72.9284,
          distance_from_assignment_meters: 8.4,
          location_validation_status: 'location_matched',
          device_capture_timestamp: '2026-10-29T09:40:00Z',
          server_upload_timestamp: '2026-10-29T09:45:00Z',
          review_status: 'verified',
          created_at: '2026-10-29T09:45:00Z'
        }
      ],
      completion_report: {
        id: 'cr-comp-01-day2',
        assignment_id: 'tsk-nav-2026-108',
        submitted_by: 'f2000000-0000-0000-0000-000000000001',
        submitted_by_name: 'Kanti Solanki (Team Leader)',
        completion_description: 'Sprayed 20 kg bleaching powder and power-washed stone pavement tiles.',
        actual_start_time: '2026-10-29T08:20:00Z',
        actual_end_time: '2026-10-29T09:40:00Z',
        waste_quantity: 'Disinfection spray and secondary cleaning',
        waste_disposal_destination: 'N/A (Disinfection task)',
        equipment_used: ['High-pressure water nozzle', 'Bleaching powder sprinkler'],
        status: 'verified_complete',
        reviewed_by: 'w0000000-0000-0000-0000-000000000003',
        reviewer_name: 'Ramesh Patel (Ward 3 Officer)',
        review_comments: 'Thoroughly verified. Pavement is sanitized and bin lid secured.',
        submitted_at: '2026-10-29T09:50:00Z'
      },
      status: 'verified_complete',
      review_decision: 'verified_complete',
      review_comments: 'Excellent follow-up. Disinfection verified by field inspection.',
      created_at: '2026-10-29T08:00:00Z'
    }
  ];

  wardData.workAttempts.set('comp-01', comp1Attempts);
}

// Recurring Hotspots in Ward 3 and Navsari
const seedHotspots: WardHotspot[] = [
  {
    id: 'hs-ward3-01',
    hotspot_code: 'HOT-NAV-03-01',
    title: 'North Lake Promenade (Dudhiya Talao)',
    locality: 'Dudhiya Talao',
    address: 'Near Ashapuri Mandir Entrance, North Lakeside Walkway, Ward 3',
    ward_number: 3,
    latitude: 20.9312,
    longitude: 72.9284,
    total_complaints: 12,
    active_complaints: 2,
    resolved_complaints: 10,
    reopened_count: 2,
    primary_category: 'Overflowing Dustbin & Littering',
    first_reported_date: '2026-08-14',
    latest_reported_date: '2026-10-31',
    avg_resolution_days: 1.2,
    frequency_level: 'high',
    linked_complaint_ids: ['comp-01', 'comp-04'],
    ai_summary: 'Recurring waste buildup caused by heavy evening visitors, street food carts, and overflowing 200L bins during festival weekends.'
  },
  {
    id: 'hs-ward3-02',
    hotspot_code: 'HOT-NAV-03-02',
    title: 'Ashapuri Garden East Perimeter',
    locality: 'Ashapuri',
    address: 'Behind Community Hall, East Compound Wall, Ward 3',
    ward_number: 3,
    latitude: 20.9295,
    longitude: 72.9315,
    total_complaints: 8,
    active_complaints: 1,
    resolved_complaints: 7,
    reopened_count: 1,
    primary_category: 'Open Garbage Dumping',
    first_reported_date: '2026-09-02',
    latest_reported_date: '2026-10-29',
    avg_resolution_days: 1.8,
    frequency_level: 'medium',
    linked_complaint_ids: ['comp-02'],
    ai_summary: 'Illegal debris dump in open plot near vacant boundary wall. Cleared 3 times; requires CCTV surveillance or fencing.'
  },
  {
    id: 'hs-ward3-03',
    hotspot_code: 'HOT-NAV-03-03',
    title: 'Navsari Station Road Overbridge Footpath',
    locality: 'Station Road',
    address: 'Near Bus Stop 4, Overbridge Approach, Ward 3',
    ward_number: 3,
    latitude: 20.9248,
    longitude: 72.9221,
    total_complaints: 11,
    active_complaints: 3,
    resolved_complaints: 8,
    reopened_count: 3,
    primary_category: 'Roadside Garbage & Littering',
    first_reported_date: '2026-07-20',
    latest_reported_date: '2026-11-01',
    avg_resolution_days: 2.1,
    frequency_level: 'high',
    linked_complaint_ids: ['comp-03'],
    ai_summary: 'High footfall transit corridor with packaging trash discarded by commuters. Night sweep frequency increase advised.'
  },
  {
    id: 'hs-ward3-04',
    hotspot_code: 'HOT-NAV-03-04',
    title: 'Lunsikui Vegetable Market Lane',
    locality: 'Lunsikui',
    address: 'Back Gate, Lunsikui Mandi, Ward 3',
    ward_number: 3,
    latitude: 20.9380,
    longitude: 72.9340,
    total_complaints: 7,
    active_complaints: 1,
    resolved_complaints: 6,
    reopened_count: 0,
    primary_category: 'Drainage / Waste Accumulation',
    first_reported_date: '2026-08-28',
    latest_reported_date: '2026-10-27',
    avg_resolution_days: 1.4,
    frequency_level: 'medium',
    linked_complaint_ids: [],
    ai_summary: 'Rotting vegetable matter chokes open surface drain. Daily morning mechanical jetting required.'
  }
];

export class WardOfficerController {

  // =========================================================================
  // 1. Dashboard Overview Summary
  // =========================================================================
  public static async getDashboardSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      initializeSeedAttempts();

      const userMatch = req.user?.locality?.match(/Ward\s*(\d+)/i) || req.user?.address?.match(/Ward\s*(\d+)/i);
      const userWardNum = userMatch ? Number(userMatch[1]) : undefined;
      const requestedWard = (req.query as any)?.ward_number ? Number((req.query as any).ward_number) : undefined;
      const wardNum = requestedWard || userWardNum || 3;

      const allComplaints = store.complaints || [];
      const wardComplaints = allComplaints.filter(c => (c.location?.ward_number || 3) === wardNum);

      const total = wardComplaints.length || 12;
      const newCount = wardComplaints.filter(c => c.status === 'submitted').length;
      const underReview = wardComplaints.filter(c => c.status === 'under_review').length;
      const assigned = wardComplaints.filter(c => c.status === 'assigned').length;
      const inProgress = wardComplaints.filter(c => c.status === 'in_progress').length;
      const resolved = wardComplaints.filter(c => c.status === 'resolved' || c.status === 'awaiting_verification').length;
      const closed = Math.max(0, resolved);
      const reopened = wardComplaints.filter(c => c.status === 'reopened').length;
      const overdue = 1;
      const unassigned = newCount;

      const wardName = wardNum === 8 ? 'Ward 8 - Madhumati & Parsi Wad' : (wardNum === 3 ? 'Ward 3 - Dudhiya Talao & Ashapuri' : `Ward ${wardNum} - Navsari Civic Area`);
      const officerName = req.user?.full_name || (wardNum === 8 ? 'Cyrus Contractor' : 'Ramesh Patel');

      const summary: WardDashboardSummary = {
        ward_number: wardNum,
        ward_name: wardName,
        officer_name: officerName,
        officer_designation: `Chief Sanitary Inspector, Ward ${wardNum}`,
        metrics: {
          total_complaints: total,
          new_complaints: newCount,
          under_review: underReview,
          assigned_complaints: assigned,
          in_progress: inProgress,
          resolved_awaiting_verification: resolved,
          closed_complaints: closed,
          reopened_complaints: reopened,
          overdue_complaints: overdue,
          unassigned_complaints: unassigned,
          active_work_assignments: 5,
          available_workers: 8,
          workers_on_duty: 6,
          pending_evidence_reviews: 3
        },
        analytics: {
          today_received: 3,
          week_received: 14,
          month_received: 42,
          resolved_count: 38,
          reopened_count: reopened,
          avg_resolution_hours: 24.8,
          overdue_count: overdue,
          repeated_locations_count: 4
        },
        today_field_operations: {
          active_tasks: 5,
          teams_working: 3,
          workers_present: 6,
          workers_absent: 1,
          tasks_awaiting_completion: 2,
          tasks_awaiting_evidence_review: 3,
          delayed_tasks: 1
        },
        recent_activity: [
          {
            id: 'act-01',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            type: 'completion_report_submitted',
            title: 'Completion Report Submitted',
            description: 'Team Leader Kanti Solanki submitted final report for TSK-NAV-2026-101 (Dudhiya Talao)',
            actor_name: 'Kanti Solanki',
            actor_role: 'Sanitation Worker',
            complaint_id: 'comp-01',
            assignment_id: 'tsk-nav-2026-101'
          },
          {
            id: 'act-02',
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            type: 'evidence_uploaded',
            title: 'After-Cleanup Photo Uploaded',
            description: 'After-work photo uploaded with GPS location matched within 12m geofence.',
            actor_name: 'Suresh Vaghela',
            actor_role: 'Waste Collection Worker',
            complaint_id: 'comp-01',
            assignment_id: 'tsk-nav-2026-101'
          },
          {
            id: 'act-03',
            timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
            type: 'attendance_exception_requested',
            title: 'Attendance Exception Requested',
            description: 'Suresh Vaghela requested GPS manual exception due to concrete pump room shielding.',
            actor_name: 'Suresh Vaghela',
            actor_role: 'Waste Collection Worker',
            assignment_id: 'tsk-nav-2026-101'
          },
          {
            id: 'act-04',
            timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
            type: 'new_complaint',
            title: 'New Complaint Received',
            description: 'Citizen lodged report for Overflowing Dustbin at Ashapuri Residency.',
            actor_name: 'Harshil Mehta',
            actor_role: 'Citizen',
            complaint_id: 'comp-01'
          }
        ]
      };

      res.status(200).json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 2. Complaint Catalogue (Comprehensive Filtering, Progress Status, Sorting)
  // =========================================================================
  public static async getComplaints(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      initializeSeedAttempts();

      const {
        status,
        category,
        priority,
        progress_status,
        date_range,
        location,
        assignment,
        additional_flags,
        search,
        sort_by,
        ward,
        ward_number,
        page = 1,
        limit = 10
      } = req.query as any;

      // Base complaints: strictly filter by ward. Default to the authenticated officer's ward so Ward 8 never sees Ward 3!
      let complaints = store.complaints || [];
      let officerWardNum = (req.user as any)?.ward_number;
      if (!officerWardNum) {
        const userMatch = req.user?.locality?.match(/Ward\s*(\d+)/i) || req.user?.address?.match(/Ward\s*(\d+)/i);
        if (userMatch) officerWardNum = Number(userMatch[1]);
      }

      const requestedWard = ward || ward_number;
      const targetWardNum = (requestedWard && requestedWard !== 'all')
        ? Number(requestedWard)
        : (officerWardNum ? Number(officerWardNum) : undefined);

      if (targetWardNum !== undefined) {
        complaints = complaints.filter(c => (c.location?.ward_number || 3) === targetWardNum);
      }

      // Enhance with progress status and assignment details
      let enriched = complaints.map(c => {
        const attempts = wardData.workAttempts.get(c.id) || [];
        const latestAttempt = attempts[attempts.length - 1];
        const reopenCount = attempts.length > 1 ? attempts.length - 1 : (c.status === 'reopened' ? 1 : 0);

        // Calculate progress status
        let progressStatus = 'Not Assigned';
        if (c.status === 'submitted') {
          progressStatus = 'Not Assigned';
        } else if (c.status === 'under_review') {
          progressStatus = 'Not Assigned';
        } else if (c.status === 'assigned') {
          progressStatus = latestAttempt?.attendance_records?.length ? 'Attendance & Monitoring' : 'Assigned – Awaiting Attendance';
        } else if (c.status === 'in_progress') {
          const hasEvidence = latestAttempt?.evidence?.length;
          progressStatus = hasEvidence ? 'Work Progress & Evidence' : 'Work In Progress';
        } else if (c.status === 'awaiting_verification' || (latestAttempt?.completion_report && latestAttempt.completion_report.status === 'submitted')) {
          progressStatus = 'Completion Report Submitted';
        } else if (latestAttempt?.review_decision === 'changes_requested') {
          progressStatus = 'Changes Requested';
        } else if (c.status === 'resolved' || c.status === 'closed' || latestAttempt?.review_decision === 'verified_complete') {
          progressStatus = 'Verified Complete';
        } else if (c.status === 'reopened') {
          progressStatus = 'Reopened – New Work Required';
        } else if (c.status === 'rejected') {
          progressStatus = 'Rejected';
        }

        // SLA deadline (48 hours from submission)
        const submittedDate = new Date(c.submitted_at || '2026-10-28T08:15:00Z');
        const slaDeadline = new Date(submittedDate.getTime() + 48 * 60 * 60 * 1000).toISOString();
        const daysPending = Math.max(1, Math.round((Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24)));
        const isOverdue = Date.now() > new Date(slaDeadline).getTime() && c.status !== 'resolved' && c.status !== 'closed' && c.status !== 'rejected';

        if (isOverdue && progressStatus !== 'Verified Complete') {
          progressStatus = 'Overdue Work';
        }

        return {
          id: c.id,
          complaint_number: c.complaint_number || 'NMC-2026-10021',
          title: `${c.category_name} at ${c.location?.landmark || c.location?.address || `Ward ${c.location?.ward_number || 3}`}`,
          category_name: c.category_name,
          category_id: c.category_id,
          citizen_id: c.citizen_id,
          citizen_name: 'Anonymous Citizen',
          submitted_at: c.submitted_at,
          location: c.location,
          priority: c.priority || 'medium',
          status: c.status,
          assigned_team_name: latestAttempt ? `Sanitation Unit 4B (${latestAttempt.team_leader_name})` : ((c as any).assigned_team_name || (c.status === 'submitted' ? 'Unassigned' : 'Sanitation Unit 4B')),
          temporary_team_leader_name: latestAttempt?.team_leader_name || ((c as any).temporary_leader_name || (c.status !== 'submitted' ? 'Kanti Solanki' : null)),
          assignment_id: latestAttempt?.assignment_id || (c.status === 'submitted' ? null : 'tsk-nav-2026-101'),
          assignment_date: latestAttempt?.assigned_date || c.reviewed_at,
          last_activity_date: c.updated_at || c.submitted_at,
          sla_deadline: slaDeadline,
          days_pending: daysPending,
          reopen_count: reopenCount,
          progress_status: progressStatus,
          has_photos: !!c.image_url,
          has_feedback: !!c.feedback,
          is_overdue: isOverdue,
          work_attempts_count: attempts.length || 1,
          image_url: c.image_url,
          description: c.description
        };
      });

      // Filter: Status
      if (status && status !== 'all') {
        enriched = enriched.filter(c => c.status.toLowerCase() === status.toLowerCase());
      }

      // Filter: Category
      if (category && category !== 'all') {
        enriched = enriched.filter(c => c.category_id === category || c.category_name.toLowerCase().includes(category.toLowerCase()));
      }

      // Filter: Priority
      if (priority && priority !== 'all') {
        enriched = enriched.filter(c => c.priority.toLowerCase() === priority.toLowerCase());
      }

      // Filter: Progress Status (CRITICAL FILTER!)
      if (progress_status && progress_status !== 'all') {
        enriched = enriched.filter(c => c.progress_status.toLowerCase() === progress_status.toLowerCase());
      }

      // Filter: Assignment
      if (assignment) {
        if (assignment === 'unassigned') {
          enriched = enriched.filter(c => c.status === 'submitted' || c.status === 'under_review');
        } else if (assignment === 'assigned') {
          enriched = enriched.filter(c => c.status !== 'submitted' && c.status !== 'under_review');
        }
      }

      // Filter: Location search
      if (location && location !== 'all') {
        enriched = enriched.filter(c =>
          c.location?.address?.toLowerCase().includes(location.toLowerCase()) ||
          c.location?.landmark?.toLowerCase().includes(location.toLowerCase())
        );
      }

      // Filter: Additional flags
      if (additional_flags) {
        if (additional_flags === 'with_photos') {
          enriched = enriched.filter(c => c.has_photos);
        } else if (additional_flags === 'without_photos') {
          enriched = enriched.filter(c => !c.has_photos);
        } else if (additional_flags === 'reopened') {
          enriched = enriched.filter(c => c.reopen_count > 0);
        } else if (additional_flags === 'overdue') {
          enriched = enriched.filter(c => c.is_overdue);
        } else if (additional_flags === 'has_feedback') {
          enriched = enriched.filter(c => c.has_feedback);
        }
      }

      // Filter: Search query
      if (search) {
        const q = search.toLowerCase();
        enriched = enriched.filter(c =>
          c.complaint_number.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.citizen_name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.location?.address.toLowerCase().includes(q) ||
          (c.temporary_team_leader_name && c.temporary_team_leader_name.toLowerCase().includes(q))
        );
      }

      // Sorting (Urgent & high priority complaints bubble to top by default)
      if (sort_by === 'oldest') {
        enriched.sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
      } else if (sort_by === 'priority') {
        const pOrder: any = { emergency: 5, urgent: 4, high: 3, medium: 2, low: 1 };
        enriched.sort((a, b) => (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0));
      } else if (sort_by === 'overdue') {
        enriched.sort((a, b) => (b.is_overdue ? 1 : 0) - (a.is_overdue ? 1 : 0));
      } else if (sort_by === 'most_reopened') {
        enriched.sort((a, b) => b.reopen_count - a.reopen_count);
      } else {
        // default: high urgency complaints always at top, then newest
        const pOrder: any = { emergency: 5, urgent: 4, high: 3, medium: 2, low: 1 };
        enriched.sort((a, b) => {
          const scoreA = (a as any).is_urgent ? 5 : (pOrder[a.priority?.toLowerCase()] || 2);
          const scoreB = (b as any).is_urgent ? 5 : (pOrder[b.priority?.toLowerCase()] || 2);
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
          return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
        });
      }

      const totalItems = enriched.length;
      const parsedPage = parseInt(page as string, 10) || 1;
      const parsedLimit = parseInt(limit as string, 10) || 10;
      const startIndex = (parsedPage - 1) * parsedLimit;
      const paginated = enriched.slice(startIndex, startIndex + parsedLimit);

      res.status(200).json({
        success: true,
        data: paginated,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total: totalItems,
          total_pages: Math.ceil(totalItems / parsedLimit) || 1
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 3. Individual Complaint Details (Comprehensive 11 Internal Sections)
  // =========================================================================
  public static async getComplaintDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      initializeSeedAttempts();
      const { id } = req.params;

      const complaint = (store.complaints || []).find(c => c.id === id) || store.complaints[0];
      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found' });
        return;
      }

      // Get attempts for this complaint (NO fake mock data generation)
      let attempts = wardData.workAttempts.get(complaint.id) || [];

      const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
      const submittedDate = new Date(complaint.submitted_at);
      const slaDeadline = new Date(submittedDate.getTime() + 48 * 60 * 60 * 1000).toISOString();

      // Assemble 11-section comprehensive data package
      const detailedComplaint = {
        // Section 1: Overview
        overview: {
          id: complaint.id,
          complaint_number: complaint.complaint_number,
          title: `${complaint.category_name} at ${complaint.location?.landmark || complaint.location?.address}`,
          description: complaint.description,
          image_url: complaint.image_url,
          category_name: complaint.category_name,
          category_id: complaint.category_id,
          priority: complaint.priority,
          status: complaint.status,
          current_assigned_team: latestAttempt
            ? `${(complaint as any).assigned_team_name || 'Sanitation Team'} (${latestAttempt.team_leader_name})`
            : ((complaint as any).assigned_team_name || (complaint.status === 'submitted' ? 'Unassigned' : 'Pending Team Assignment')),
          temporary_team_leader_id: latestAttempt ? latestAttempt.team_leader_id : ((complaint as any).temporary_team_leader_id || null),
          temporary_team_leader_name: latestAttempt ? latestAttempt.team_leader_name : ((complaint as any).temporary_team_leader_name || null),
          current_assignment_id: latestAttempt ? latestAttempt.assignment_id : null,
          current_task_code: latestAttempt ? latestAttempt.task_code : null,
          deadline: (complaint as any).deadline || (complaint as any).target_completion_date || slaDeadline,
          sla_deadline: slaDeadline,
          reopen_count: attempts.length > 1 ? attempts.length - 1 : (complaint.status === 'reopened' ? 1 : 0),
          complaint_age_days: Math.max(1, Math.round((Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24))),
          submitted_at: complaint.submitted_at,
          last_updated: complaint.updated_at || complaint.submitted_at
        },

        // Section 2: Citizen Report (Preserves original citizen submission with full privacy protection)
        citizen_report: {
          citizen_id: complaint.citizen_id,
          citizen_name: 'Anonymous Citizen',
          citizen_phone: 'Confidential (Anonymous Submission)',
          submitted_at: complaint.submitted_at,
          original_description: complaint.description,
          original_photos: complaint.image_url ? [complaint.image_url] : [],
          photo_url: complaint.image_url,
          reported_location: complaint.location?.address,
          ai_confidence: complaint.confidence_score || 94.6,
          ai_category_detected: complaint.category_name
        },

        // Section 3: Location & Map
        location_map: {
          ward_number: complaint.location?.ward_number || 3,
          ward_name: complaint.location?.ward_name || 'Ward 3 - Dudhiya Talao',
          address: complaint.location?.address || 'North Lake Promenade, Dudhiya Talao',
          landmark: complaint.location?.landmark || 'Near Ashapuri Mandir Garden Gate',
          latitude: complaint.location?.latitude || 20.9312,
          longitude: complaint.location?.longitude || 72.9284,
          is_inside_nmc_boundary: true
        },

        // Section 4: Assignment History
        assignment_history: attempts.map(att => ({
          assignment_id: att.assignment_id,
          task_code: att.task_code,
          attempt_number: att.attempt_number,
          assigned_date: att.assigned_date,
          team_leader_name: att.team_leader_name,
          members_count: (att.team_members || []).length,
          status: att.status,
          review_decision: att.review_decision || 'Pending Review'
        })),

        // Section 5: Day-wise Work Timeline (Mandatory chronological attempts, immutable)
        day_wise_timeline: attempts,

        // Section 6: Team & Attendance (Active Attempt)
        team_attendance: {
          assignment_id: latestAttempt ? latestAttempt.assignment_id : null,
          team_members: latestAttempt ? (latestAttempt.team_members || []) : [],
          attendance_records: latestAttempt ? (latestAttempt.attendance_records || []) : [],
          records: latestAttempt ? (latestAttempt.attendance_records || []) : [],
          geofence_radius_meters: 100
        },

        // Section 7: Work Progress & Evidence (Active Attempt)
        work_progress_evidence: {
          assignment_id: latestAttempt ? latestAttempt.assignment_id : null,
          evidence_items: latestAttempt ? (latestAttempt.evidence || []) : [],
          before_photo: latestAttempt?.evidence?.find((e: any) => e.evidence_type === 'before')?.storage_path || null,
          before_photo_url: latestAttempt?.evidence?.find((e: any) => e.evidence_type === 'before')?.storage_path || null,
          after_photo: latestAttempt?.evidence?.find((e: any) => e.evidence_type === 'after')?.storage_path || null,
          after_photo_url: latestAttempt?.evidence?.find((e: any) => e.evidence_type === 'after')?.storage_path || null
        },

        // Section 8: Completion Reports
        completion_reports: attempts
          .filter(att => att.completion_report)
          .map(att => att.completion_report),

        // Section 9: Citizen Feedback
        citizen_feedback: complaint.feedback || {
          rating: 4,
          feedback_text: 'Issue was attended to promptly by sanitation workers.',
          resolution_satisfactory: true,
          created_at: '2026-10-30T14:20:00Z'
        },

        // Section 10: Review & Reopening History
        review_reopening_history: {
          reviews: attempts.filter(att => att.review_decision).map(att => ({
            attempt_number: att.attempt_number,
            decision: att.review_decision,
            comments: att.review_comments,
            reviewer: 'Ramesh Patel (Ward 3 Officer)',
            timestamp: att.completion_report?.submitted_at || att.created_at
          })),
          reopenings: wardData.reopenEvents.filter(r => r.complaint_id === complaint.id)
        },

        // Section 11: Audit History (Citizen identity protected)
        audit_history: (complaint.activity_logs || []).map((l: any) => ({
          ...l,
          actor_name: l.actor_role === 'citizen' ? 'Anonymous Citizen' : l.actor_name
        }))
      };

      res.status(200).json({ success: true, data: detailedComplaint });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 4. Reopen Complaint (Inside Complaint Details Only)
  // =========================================================================
  public static async reopenComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      initializeSeedAttempts();
      const { id } = req.params;
      const {
        reopen_reason,
        description,
        urgency = 'high',
        supporting_evidence,
        team_option = 'previous',
        selected_worker_ids = [],
        temporary_leader_id
      } = req.body;

      if (!reopen_reason) {
        res.status(400).json({ success: false, error: 'Reopening reason is mandatory' });
        return;
      }

      const complaint = (store.complaints || []).find(c => c.id === id);
      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found' });
        return;
      }

      let attempts = wardData.workAttempts.get(complaint.id) || [];
      const newAttemptNumber = attempts.length + 1;
      const newAssignmentId = `tsk-nav-2026-reopen-${complaint.id}-${newAttemptNumber}`;
      const newTaskCode = `TSK-NAV-2026-${100 + newAttemptNumber + 10}`;

      // Resolve team members based on option
      let teamMembers: any[] = [];
      let leaderId = temporary_leader_id;
      let leaderName = 'Kanti Solanki';

      if (team_option === 'previous' && attempts.length > 0) {
        const prev = attempts[attempts.length - 1];
        teamMembers = [...prev.team_members];
        leaderId = prev.team_leader_id;
        leaderName = prev.team_leader_name;
      } else {
        // Option B: Assign New Team from directory
        leaderId = temporary_leader_id || 'f2000000-0000-0000-0000-000000000001';
        leaderName = leaderId === 'f2000000-0000-0000-0000-000000000001' ? 'Kanti Solanki' : 'Suresh Vaghela';
        teamMembers = [
          {
            worker_id: leaderId,
            worker_code: 'WRK-2026-001',
            name: leaderName,
            designation: 'Sanitation Worker',
            is_temporary_leader: true
          }
        ];
        if (selected_worker_ids && selected_worker_ids.length > 0) {
          selected_worker_ids.forEach((wId: string) => {
            if (wId !== leaderId) {
              teamMembers.push({
                worker_id: wId,
                worker_code: 'WRK-2026-042',
                name: 'Suresh Vaghela',
                designation: 'Waste Collection Worker',
                is_temporary_leader: false
              });
            }
          });
        }
      }

      const now = new Date().toISOString();

      // Create NEW attempt without overwriting previous history!
      const newAttempt: ComplaintWorkAttempt = {
        id: `att-${complaint.id}-reopen-${newAttemptNumber}`,
        complaint_id: complaint.id,
        attempt_number: newAttemptNumber,
        assignment_id: newAssignmentId,
        task_code: newTaskCode,
        assigned_date: now,
        team_leader_id: leaderId,
        team_leader_name: leaderName,
        team_members: teamMembers,
        attendance_records: [],
        evidence: supporting_evidence ? [
          {
            id: `ev-${complaint.id}-reopen-photo`,
            assignment_id: newAssignmentId,
            submitted_by: 'w0000000-0000-0000-0000-000000000003',
            evidence_type: 'before',
            storage_path: supporting_evidence,
            description: `Ward Officer Reopening Evidence: ${description || reopen_reason}`,
            latitude: complaint.location?.latitude || 20.9312,
            longitude: complaint.location?.longitude || 72.9284,
            distance_from_assignment_meters: 5.0,
            location_validation_status: 'location_matched',
            device_capture_timestamp: now,
            server_upload_timestamp: now,
            review_status: 'submitted',
            created_at: now
          }
        ] : [],
        status: 'assigned',
        reopen_reason,
        reopened_by: 'Ramesh Patel (Ward 3 Officer)',
        reopened_at: now,
        created_at: now
      };

      attempts.push(newAttempt);
      wardData.workAttempts.set(complaint.id, attempts);

      // Record reopening event
      wardData.reopenEvents.push({
        id: `reopen-ev-${Date.now()}`,
        complaint_id: complaint.id,
        previous_status: complaint.status,
        reopened_by: 'Ramesh Patel (Ward 3 Officer)',
        reopen_reason,
        description,
        urgency,
        new_assignment_id: newAssignmentId,
        new_attempt_number: newAttemptNumber,
        assigned_team_leader: leaderName,
        created_at: now
      });

      // Update complaint status in store and PostgreSQL
      const officerName = req.user?.full_name || (complaint.location?.ward_number === 8 ? 'Cyrus Contractor (Ward 8 Officer)' : 'Ramesh Patel (Ward 3 Officer)');
      await DbRepository.updateComplaintStatus(complaint.id, 'reopened', {
        name: officerName,
        role: 'ward_officer',
        note: `Complaint reopened by Ward Officer. Reason: ${reopen_reason}. Attempt #${newAttemptNumber} dispatched to ${leaderName}.`
      });

      // Dispatch notification to citizen
      await DbRepository.createNotification(
        complaint.citizen_id,
        'Complaint Reopened for Follow-up',
        `Your complaint ${complaint.complaint_number} has been reopened for additional sanitation. Squad leader: ${leaderName}.`,
        complaint.id,
        'complaint_status'
      );

      res.status(200).json({
        success: true,
        message: `Complaint ${complaint.complaint_number} successfully reopened. New assignment ${newTaskCode} created for ${leaderName}.`,
        data: {
          complaint_id: complaint.id,
          attempt_number: newAttemptNumber,
          assignment_id: newAssignmentId,
          task_code: newTaskCode,
          team_leader: leaderName,
          status: 'reopened'
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 5. Assign & Reassign Complaint to Team & Work Type
  // =========================================================================
  public static async assignComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        team_name,
        team_id,
        work_type = 'waste_collection',
        instructions = '',
        worker_ids = [],
        temporary_leader_id,
        deadline
      } = req.body;

      const complaint = (store.complaints || []).find(c => c.id === id);
      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found' });
        return;
      }

      // Calculate deadline
      const targetDeadline = deadline || new Date(Date.now() + 24 * 3600 * 1000).toISOString();

      // Find the selected team or create on the fly
      let team = (store.teams || []).find(t => t.id === team_id || t.team_name === team_name);
      if (!team) {
        const leaderWorker = (store.workers || []).find(w => w.id === temporary_leader_id) || store.workers[0];
        team = {
          id: team_id || `team-${Date.now()}`,
          team_name: team_name || 'Sanitation Squad 3A',
          ward_number: 3,
          worker_ids: worker_ids.length > 0 ? worker_ids : [store.workers[0]?.id, store.workers[1]?.id].filter(Boolean),
          temporary_leader_id: leaderWorker?.id || 'f2000000-0000-0000-0000-000000000001',
          temporary_leader_name: leaderWorker?.full_name || 'Kanti Solanki',
          created_at: new Date().toISOString(),
          status: 'active'
        };
        if (!store.teams) store.teams = [];
        store.teams.push(team);
      }

      // Find leader and workers for this team
      let teamWorkers = (store.workers || []).filter(w => (team.worker_ids || []).includes(w.id) || (team.worker_ids || []).includes(w.user_id));
      if (teamWorkers.length === 0 && (team.worker_ids || []).length > 0) {
        // Query from DB if not yet cached in store
        const dbWorkers = await DbRepository.getWorkersList({}).catch(() => []);
        teamWorkers = dbWorkers.filter(w => (team.worker_ids || []).includes(w.id) || (team.worker_ids || []).includes(w.user_id));
      }
      if (teamWorkers.length === 0 && (team.worker_ids || []).length > 0) {
        // Fallback team member to ensure single-worker teams always have membership
        teamWorkers = team.worker_ids.map((wId: string) => ({
          id: wId,
          user_id: wId,
          worker_code: 'WRK-2026-NMC',
          full_name: team.temporary_leader_name || 'Sanitation Worker',
          phone: '+919876543210',
          designation: 'Sanitation Worker',
          ward_number: complaint.location?.ward_number || 3
        }));
      }

      const leader = (store.workers || []).find(w => w.id === team.temporary_leader_id || w.user_id === team.temporary_leader_id) 
        || teamWorkers.find(w => w.id === team.temporary_leader_id || w.user_id === team.temporary_leader_id) 
        || teamWorkers[0];

      // Update complaint
      complaint.status = 'assigned';
      complaint.updated_at = new Date().toISOString();
      (complaint as any).assigned_team_name = team.team_name;
      (complaint as any).temporary_team_leader_id = leader?.id || team.temporary_leader_id;
      (complaint as any).temporary_team_leader_name = leader?.full_name || team.temporary_leader_name;
      (complaint as any).deadline = targetDeadline;
      (complaint as any).target_completion_date = targetDeadline;

      // Create a unique Task Assignment Code and UUID
      const serial = Math.floor(100 + Math.random() * 900);
      const taskCode = `TSK-NAV-2026-${serial}`;
      const assignmentId = randomUUID();

      // Create WorkAssignment for workers and leader to view in Worker Dashboard
      const newAssignment: WorkAssignment = {
        id: assignmentId,
        task_code: taskCode,
        title: `${(work_type || complaint.category_name).replace('_', ' ').toUpperCase()} at ${complaint.location?.landmark || complaint.location?.address || 'Ward 3'}`,
        description: complaint.description || 'Assigned field sanitation task.',
        category: work_type || 'waste_collection',
        priority: (complaint.priority as any) || 'high',
        ward_id: complaint.location?.ward_id || (complaint.location?.ward_number ? `ward-${String(complaint.location.ward_number).padStart(2, '0')}` : 'ward-03'),
        ward_number: complaint.location?.ward_number || 3,
        ward_name: complaint.location?.ward_name || `Ward ${complaint.location?.ward_number || 3}`,
        location_name: complaint.location?.landmark || complaint.location?.address || `Ward ${complaint.location?.ward_number || 3} Cleanliness Zone`,
        address: complaint.location?.address || `Navsari Municipal Ward ${complaint.location?.ward_number || 3}`,
        latitude: complaint.location?.latitude || 20.9312,
        longitude: complaint.location?.longitude || 72.9284,
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_start_time: new Date().toISOString(),
        expected_end_time: targetDeadline,
        deadline: targetDeadline,
        target_completion_date: targetDeadline,
        attendance_radius_meters: 100,
        evidence_radius_meters: 150,
        work_instructions: instructions || 'Clear civic waste and wash area thoroughly with bleaching powder.',
        safety_instructions: 'Wear heavy-duty rubber gloves, safety mask, and reflective vest.',
        required_equipment: ['Safety Gloves', 'Rubber Boots', 'Shovel', 'Broom', 'Bleaching Powder'],
        emergency_contact_phone: '+919825130003',
        status: 'assigned',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_temporary_leader: true,
        temporary_leader_id: leader?.id || team.temporary_leader_id,
        temporary_leader_name: leader?.full_name || team.temporary_leader_name,
        team_members: teamWorkers.map(w => ({
          id: `wam-${Date.now()}-${w.id}`,
          assignment_id: assignmentId,
          worker_id: w.id,
          worker_code: w.worker_code,
          worker_name: w.full_name,
          worker_phone: w.phone,
          designation_name: w.designation,
          temporary_leader: w.id === (leader?.id || team.temporary_leader_id) || (teamWorkers.length === 1),
          assignment_status: 'assigned',
          attendance_timestamp: undefined,
          validation_status: undefined
        })),
        my_attendance_status: 'assigned',
        has_before_evidence: false,
        has_after_evidence: false
      };

      if (!store.workAssignments) store.workAssignments = [];
      store.workAssignments.unshift(newAssignment);

      // Persist to PostgreSQL Database
      await DbRepository.saveWorkAssignment(newAssignment, teamWorkers.map(w => ({
        id: w.id,
        worker_id: w.id,
        temporary_leader: w.id === (leader?.id || team.temporary_leader_id) || (teamWorkers.length === 1)
      }))).catch(err => console.error('Failed to persist work assignment to DB:', err));

      // Record in complaint work attempt history
      const attempts = wardData.workAttempts.get(complaint.id) || [];
      attempts.push({
        id: `att-${Date.now()}`,
        complaint_id: complaint.id,
        attempt_number: attempts.length + 1,
        assignment_id: assignmentId,
        task_code: taskCode,
        assigned_date: new Date().toISOString(),
        deadline: targetDeadline,
        team_leader_id: leader?.id || team.temporary_leader_id,
        team_leader_name: leader?.full_name || team.temporary_leader_name,
        team_members: teamWorkers.map(w => ({
          worker_id: w.id,
          worker_code: w.worker_code,
          name: w.full_name,
          designation: w.designation,
          is_temporary_leader: w.id === (leader?.id || team.temporary_leader_id)
        })),
        attendance_records: [],
        evidence: [],
        status: 'assigned',
        created_at: new Date().toISOString()
      });
      wardData.workAttempts.set(complaint.id, attempts);

      // Persist status change to both store and PostgreSQL database
      const officerName = req.user?.full_name || (complaint.location?.ward_number === 8 ? 'Cyrus Contractor (Ward 8 Officer)' : 'Ramesh Patel (Ward 3 Officer)');
      await DbRepository.updateComplaintStatus(complaint.id, 'assigned', {
        name: officerName,
        role: 'ward_officer',
        note: `Assigned to ${team.team_name} (Team Leader: ${leader?.full_name || team.temporary_leader_name}). Task: ${taskCode}`
      });

      // Dispatch live notification to citizen
      await DbRepository.createNotification(
        complaint.citizen_id,
        'Complaint Assigned to Squad',
        `Your complaint ${complaint.complaint_number} has been assigned to squad "${team.team_name}". Field sanitation team dispatched.`,
        complaint.id,
        'complaint_status'
      );

      res.status(200).json({
        success: true,
        message: `Assigned complaint ${complaint.complaint_number} to team "${team.team_name}". Task ${taskCode} dispatched.`,
        data: {
          complaint_id: complaint.id,
          status: 'assigned',
          task_code: taskCode,
          team_name: team.team_name,
          temporary_team_leader_name: leader?.full_name || team.temporary_leader_name
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 6. Hotspots Map (Dedicated Navigation Item - Dynamic Clustering)
  // =========================================================================
  public static async getHotspots(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { category, frequency, ward } = req.query as any;

      // Determine target ward
      let targetWardNum: number | 'all' = 3;
      if (ward && ward !== 'all') {
        targetWardNum = Number(ward);
      } else if (ward === 'all') {
        targetWardNum = 'all';
      } else if ((req.user as any)?.ward_number) {
        targetWardNum = Number((req.user as any).ward_number);
      } else if (req.user?.locality) {
        const match = req.user.locality.match(/Ward\s*(\d+)/i);
        if (match) targetWardNum = Number(match[1]);
      }

      const allComplaints = store.complaints || [];
      const relevantComplaints = targetWardNum === 'all'
        ? allComplaints
        : allComplaints.filter(c => (c.location?.ward_number || 3) === targetWardNum);

      // Dynamic Clustering by proximity (~0.003 deg ~ 300m) or landmark/locality
      interface ComplaintCluster {
        centerLat: number;
        centerLng: number;
        locality: string;
        address: string;
        ward_number: number;
        complaints: typeof allComplaints;
      }

      const clusters: ComplaintCluster[] = [];

      for (const comp of relevantComplaints) {
        const lat = comp.location?.latitude || (20.9250 + ((comp.location?.ward_number || 3) * 0.002));
        const lng = comp.location?.longitude || (72.9250 + ((comp.location?.ward_number || 3) * 0.0015));
        const loc = comp.location?.landmark || comp.location?.ward_name || (comp.location as any)?.locality || `Ward ${comp.location?.ward_number || 3}`;
        const addr = comp.location?.address || `${loc}, Navsari`;
        const compWard = comp.location?.ward_number || (typeof targetWardNum === 'number' ? targetWardNum : 3);

        let matchedCluster = clusters.find(cl => {
          const dLat = Math.abs(cl.centerLat - lat);
          const dLng = Math.abs(cl.centerLng - lng);
          const distanceDeg = Math.sqrt(dLat * dLat + dLng * dLng);
          const sameLoc = cl.locality.toLowerCase().includes(loc.toLowerCase()) || loc.toLowerCase().includes(cl.locality.toLowerCase());
          return distanceDeg < 0.0035 || (sameLoc && distanceDeg < 0.008);
        });

        if (matchedCluster) {
          matchedCluster.complaints.push(comp);
          // Gently update centroid
          matchedCluster.centerLat = (matchedCluster.centerLat + lat) / 2;
          matchedCluster.centerLng = (matchedCluster.centerLng + lng) / 2;
        } else {
          clusters.push({
            centerLat: lat,
            centerLng: lng,
            locality: loc,
            address: addr,
            ward_number: compWard,
            complaints: [comp]
          });
        }
      }

      // Convert clusters into WardHotspot objects
      const dynamicHotspots: WardHotspot[] = clusters.map((cl, idx) => {
        const total = cl.complaints.length;
        const active = cl.complaints.filter(c => !['resolved', 'closed', 'verified_complete', 'rejected'].includes(c.status)).length;
        const resolved = cl.complaints.filter(c => ['resolved', 'closed', 'verified_complete'].includes(c.status)).length;
        const reopened = cl.complaints.filter(c => c.status === 'reopened').length;

        // Determine dominant category
        const catCounts: Record<string, number> = {};
        for (const c of cl.complaints) {
          const cat = c.category_name || (c as any).category || 'General Waste';
          catCounts[cat] = (catCounts[cat] || 0) + 1;
        }
        let dominantCat = 'Overflowing Dustbin & Littering';
        let maxCount = 0;
        for (const [cat, cnt] of Object.entries(catCounts)) {
          if (cnt > maxCount) {
            maxCount = cnt;
            dominantCat = cat;
          }
        }

        const dates = cl.complaints.map(c => c.submitted_at || (c as any).created_at).filter(Boolean).sort();
        const firstReported = dates[0] ? dates[0].slice(0, 10) : '2026-10-01';
        const latestReported = dates[dates.length - 1] ? dates[dates.length - 1].slice(0, 10) : '2026-11-02';

        const freqLevel: 'high' | 'medium' | 'low' = total >= 4 ? 'high' : total >= 2 ? 'medium' : 'low';

        return {
          id: `hs-dyn-w${cl.ward_number}-${idx + 1}`,
          hotspot_code: `HOT-NAV-${String(cl.ward_number).padStart(2, '0')}-${String(idx + 1).padStart(2, '0')}`,
          title: `${cl.locality} Problem Cluster`,
          locality: cl.locality,
          address: cl.address,
          ward_number: cl.ward_number,
          latitude: Number(cl.centerLat.toFixed(5)),
          longitude: Number(cl.centerLng.toFixed(5)),
          total_complaints: total,
          active_complaints: active,
          resolved_complaints: resolved,
          reopened_count: reopened,
          primary_category: dominantCat,
          first_reported_date: firstReported,
          latest_reported_date: latestReported,
          avg_resolution_days: 1.4,
          frequency_level: freqLevel,
          linked_complaint_ids: cl.complaints.map(c => c.id),
          ai_summary: `AI Geospatial Intelligence: ${total} complaints recorded near ${cl.locality}. Dominant pattern: ${dominantCat}. ${active} issues actively require sanitation team dispatch.`
        };
      });

      // Filter seedHotspots if matching ward
      const relevantSeed = (seedHotspots || []).filter(h => {
        if (targetWardNum === 'all') return true;
        return h.ward_number === targetWardNum;
      });

      // Combine dynamic hotspots first, followed by seed hotspots that don't collide
      let combined = [...dynamicHotspots];
      for (const s of relevantSeed) {
        const collides = combined.some(d => {
          const dist = Math.sqrt(Math.pow(d.latitude - s.latitude, 2) + Math.pow(d.longitude - s.longitude, 2));
          return dist < 0.002 || d.locality.toLowerCase() === s.locality.toLowerCase();
        });
        if (!collides) {
          combined.push(s);
        }
      }

      // If combined is empty (e.g. brand new ward with no complaints yet), provide a sensible baseline cluster
      if (combined.length === 0 && targetWardNum !== 'all') {
        combined.push({
          id: `hs-w${targetWardNum}-default`,
          hotspot_code: `HOT-NAV-${String(targetWardNum).padStart(2, '0')}-01`,
          title: `Ward ${targetWardNum} Municipal Hub Area`,
          locality: `Ward ${targetWardNum}`,
          address: `Central Sector, Ward ${targetWardNum}, Navsari`,
          ward_number: Number(targetWardNum),
          latitude: 20.9250 + (Number(targetWardNum) * 0.0025),
          longitude: 72.9250 + (Number(targetWardNum) * 0.002),
          total_complaints: relevantComplaints.length,
          active_complaints: relevantComplaints.filter(c => c.status !== 'resolved' && c.status !== 'closed').length,
          resolved_complaints: relevantComplaints.filter(c => c.status === 'resolved' || c.status === 'closed').length,
          reopened_count: 0,
          primary_category: 'Civic Cleanliness',
          first_reported_date: '2026-10-01',
          latest_reported_date: '2026-11-02',
          avg_resolution_days: 1.5,
          frequency_level: relevantComplaints.length >= 4 ? 'high' : relevantComplaints.length >= 2 ? 'medium' : 'low',
          linked_complaint_ids: relevantComplaints.map(c => c.id),
          ai_summary: `Real-time ward monitoring active. ${relevantComplaints.length} registered reports processed.`
        });
      }

      // Filter by category
      if (category && category !== 'all') {
        combined = combined.filter(h => h.primary_category.toLowerCase().includes(category.toLowerCase()));
      }

      // Filter by frequency
      if (frequency && frequency !== 'all') {
        combined = combined.filter(h => h.frequency_level.toLowerCase() === frequency.toLowerCase());
      }

      res.status(200).json({
        success: true,
        data: combined,
        meta: {
          ward_number: targetWardNum === 'all' ? 0 : Number(targetWardNum),
          total_hotspots: combined.length,
          high_frequency_count: combined.filter(h => h.frequency_level === 'high').length
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 7. Work Assignments
  // =========================================================================
  public static async getAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      initializeSeedAttempts();
      const assignments = (store.workAssignments || []).map(a => ({
        id: a.id,
        task_code: a.task_code,
        title: a.title,
        linked_complaint_id: (a as any).complaint_id || 'comp-01',
        linked_complaint_number: (a as any).complaint_number || 'NMC-2026-10021',
        category: a.category,
        priority: a.priority,
        ward_number: a.ward_number || 3,
        location_name: a.location_name,
        address: a.address,
        latitude: a.latitude,
        longitude: a.longitude,
        team_leader_name: a.temporary_leader_name || 'Kanti Solanki',
        team_leader_id: a.temporary_leader_id || 'f2000000-0000-0000-0000-000000000001',
        team_members_count: (a.team_members || []).length || 2,
        scheduled_date: a.scheduled_date,
        status: a.status,
        attendance_status: a.my_attendance_status?.includes('present') || a.my_attendance_status?.includes('Checked')
          ? 'All Present (GPS Verified)'
          : 'Attendance Pending',
        evidence_status: a.has_before_evidence && a.has_after_evidence
          ? 'Before & After Uploaded'
          : a.has_before_evidence
          ? 'Before Uploaded'
          : 'Pending Evidence'
      }));

      res.status(200).json({ success: true, data: assignments });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 8. Worker Management (Directory for Ward 3 & DB Persistence)
  // =========================================================================
  public static async getWorkers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { search, availability } = req.query as any;
      const officerWard = (req.user as any)?.ward_number || 3;
      const workers = await DbRepository.getWorkersList({ search, availability, ward_number: officerWard });
      store.workers = workers;
      res.status(200).json({ success: true, data: workers });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async addWorker(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        full_name,
        phone,
        username,
        password,
        designation = 'Sanitation Worker',
        skills = ['Litter Abatement'],
        availability_status = 'available'
      } = req.body;

      if (!full_name || !phone) {
        res.status(400).json({ success: false, error: 'Full name and phone are required' });
        return;
      }

      const rawPhone = String(phone).trim();
      const normalizedPhone = normalizeIndianPhone(rawPhone) || rawPhone;
      const workerPassword = (password && String(password).trim().length > 0) ? String(password).trim() : 'Worker@123';
      const passwordHash = await bcrypt.hash(workerPassword, 10);
      const newUserId = randomUUID();
      const newWorkerId = randomUUID();

      const count = (store.workers || []).length + 1;
      const serial = String(count).padStart(3, '0');
      const workerCode = `WRK-2026-${serial}`;
      const effectiveUsername = (username && String(username).trim().length > 0) ? String(username).trim() : workerCode;

      const officerWard = (req.body.ward_number ? parseInt(req.body.ward_number, 10) : undefined) || (req.user as any)?.ward_number || 3;

      // Create Profile so worker can log in
      const newProfile: any = {
        id: newUserId,
        full_name: full_name.trim(),
        phone: normalizedPhone,
        username: effectiveUsername,
        plain_password: workerPassword,
        preferred_language: 'gu',
        ward_number: officerWard,
        locality: `Ward ${officerWard}`,
        address: 'Navsari Municipal Staff Quarters',
        is_active: true,
        role: 'worker',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create CitizenAuthProfile
      const newAuthProfile: any = {
        id: `auth-${newUserId}`,
        user_id: newUserId,
        mobile_number: normalizedPhone,
        password_hash: passwordHash,
        plain_password: workerPassword,
        mobile_verified: true,
        verification_completed_at: new Date().toISOString(),
        account_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (!store.profiles) store.profiles = [];
      store.profiles.push(newProfile);

      if (!store.authProfiles) store.authProfiles = [];
      store.authProfiles.push(newAuthProfile);

      const newWorker = {
        id: newWorkerId,
        user_id: newUserId,
        worker_code: workerCode,
        username: effectiveUsername,
        plain_password: workerPassword,
        full_name: full_name.trim(),
        phone: normalizedPhone,
        designation: designation.trim(),
        primary_designation: designation.trim(),
        ward_number: officerWard,
        ward_name: `Ward ${officerWard}`,
        availability_status: availability_status || 'available',
        active_task_code: undefined,
        experience_years: req.body.experience_years ? parseFloat(req.body.experience_years) : 0,
        skills: Array.isArray(skills) ? skills : [skills],
        attendance_today: 'Not Marked',
        avatar_url: `https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=256&q=80`,
        created_at: new Date().toISOString()
      };

      // Persist worker directly to PostgreSQL database
      const savedWorker = await DbRepository.saveWorkerProfile(newWorker, passwordHash);

      if (!store.workers) store.workers = [];
      const existingIdx = store.workers.findIndex(w => w.id === savedWorker.id || w.user_id === savedWorker.user_id);
      if (existingIdx !== -1) {
        store.workers[existingIdx] = savedWorker;
      } else {
        store.workers.push(savedWorker);
      }

      res.status(201).json({
        success: true,
        message: `Worker ${savedWorker.full_name} (${savedWorker.worker_code}) registered! Log in with Mobile: "${normalizedPhone}" or Username: "${effectiveUsername}", Password: "${workerPassword}".`,
        data: savedWorker
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateWorker(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { full_name, phone, designation, availability_status, skills } = req.body;

      const workerIndex = (store.workers || []).findIndex(w => w.id === id);
      if (workerIndex === -1) {
        res.status(404).json({ success: false, error: 'Worker not found' });
        return;
      }

      const existing = store.workers[workerIndex];
      const updated = {
        ...existing,
        full_name: full_name?.trim() || existing.full_name,
        phone: phone?.trim() || existing.phone,
        designation: designation?.trim() || existing.designation,
        primary_designation: designation?.trim() || existing.primary_designation,
        availability_status: availability_status || existing.availability_status,
        skills: Array.isArray(skills) ? skills : existing.skills,
        updated_at: new Date().toISOString()
      };

      store.workers[workerIndex] = updated;

      // Update in PostgreSQL
      await DbRepository.updateWorkerProfile(id, req.body);

      res.status(200).json({
        success: true,
        message: `Worker ${updated.full_name} profile updated successfully.`,
        data: updated
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async deleteWorker(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const workerIndex = (store.workers || []).findIndex(w => w.id === id);
      if (workerIndex === -1) {
        res.status(404).json({ success: false, error: 'Worker not found' });
        return;
      }

      const deleted = store.workers.splice(workerIndex, 1)[0];

      // Remove from any teams
      (store.teams || []).forEach(team => {
        team.worker_ids = (team.worker_ids || []).filter((wId: string) => wId !== id);
      });

      // Delete from PostgreSQL
      await DbRepository.deleteWorkerProfile(id);

      res.status(200).json({
        success: true,
        message: `Worker ${deleted.full_name} (${deleted.worker_code}) removed from active directory.`,
        data: deleted
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 8B. Team Management (Form Units, Temporary Leadership, DB Persistence)
  // =========================================================================
  public static async getTeams(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const officerWard = (req.user as any)?.ward_number || 3;
      const rawTeams = await DbRepository.getTeamsList(officerWard);

      const activeAssignments = (store.workAssignments || []).filter(a =>
        ['assigned', 'in_progress', 'pending_review', 'under_review', 'action_required'].includes(a.status?.toLowerCase())
      );
      const activeComplaints = (store.complaints || []).filter(c =>
        !['resolved', 'closed', 'rejected', 'verified_complete'].includes(c.status?.toLowerCase())
      );

      const teams = rawTeams.map(team => {
        const matchingAssignments = activeAssignments.filter(a =>
          (a as any).team_id === team.id ||
          (a as any).team_name === team.team_name ||
          (team.worker_ids || []).includes((a as any).assigned_to) ||
          (team.temporary_leader_id && (a as any).assigned_to === team.temporary_leader_id)
        );
        const matchingComplaints = activeComplaints.filter(c =>
          (c as any).assigned_team_id === team.id ||
          (c as any).assigned_team_name === team.team_name ||
          (team.temporary_leader_id && (c as any).temporary_leader_id === team.temporary_leader_id)
        );
        const uniqueTaskIds = new Set([
          ...matchingAssignments.map(a => a.id),
          ...matchingComplaints.map(c => c.id)
        ]);

        return {
          ...team,
          work_type: team.work_type || 'General Civic Sanitation Squad',
          active_tasks_count: uniqueTaskIds.size
        };
      });

      store.teams = teams;
      res.status(200).json({ success: true, data: teams });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { team_name, worker_ids = [], temporary_leader_id, work_type } = req.body;

      if (!team_name || !worker_ids || worker_ids.length === 0) {
        res.status(400).json({ success: false, error: 'Team name and at least one worker are required' });
        return;
      }

      const leaderWorker = (store.workers || []).find(w => w.id === temporary_leader_id) || (store.workers || []).find(w => w.id === worker_ids[0]);

      const newTeam = {
        id: `team-${Date.now()}`,
        team_name: team_name.trim(),
        work_type: work_type || 'General Civic Sanitation Squad',
        ward_number: 3,
        ward_name: 'Ward 3 - Dudhiya Talao',
        worker_ids,
        temporary_leader_id: leaderWorker?.id || worker_ids[0],
        temporary_leader_name: leaderWorker?.full_name || 'Assigned Leader',
        created_at: new Date().toISOString(),
        status: 'active'
      };

      await DbRepository.saveTeam(newTeam);

      if (!store.teams) store.teams = [];
      store.teams.push(newTeam);

      res.status(201).json({
        success: true,
        message: `Team "${newTeam.team_name}" created with temporary leader ${newTeam.temporary_leader_name}.`,
        data: newTeam
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { team_name, worker_ids, temporary_leader_id, work_type } = req.body;

      const teamIndex = (store.teams || []).findIndex(t => t.id === id);
      if (teamIndex === -1) {
        res.status(404).json({ success: false, error: 'Team not found' });
        return;
      }

      const existing = store.teams[teamIndex];
      const newWorkerIds = worker_ids || existing.worker_ids;
      const leaderWorker = (store.workers || []).find(w => w.id === temporary_leader_id) || (store.workers || []).find(w => w.id === newWorkerIds[0]);

      const updated = {
        ...existing,
        team_name: team_name?.trim() || existing.team_name,
        work_type: work_type || existing.work_type || 'General Civic Sanitation Squad',
        worker_ids: newWorkerIds,
        temporary_leader_id: leaderWorker?.id || existing.temporary_leader_id,
        temporary_leader_name: leaderWorker?.full_name || existing.temporary_leader_name,
        updated_at: new Date().toISOString()
      };

      store.teams[teamIndex] = updated;

      await DbRepository.updateTeam(id, {
        team_name: updated.team_name,
        worker_ids: updated.worker_ids,
        temporary_leader_id: updated.temporary_leader_id,
        temporary_leader_name: updated.temporary_leader_name
      });

      res.status(200).json({
        success: true,
        message: `Team "${updated.team_name}" updated successfully.`,
        data: updated
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async deleteTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const teamIndex = (store.teams || []).findIndex(t => t.id === id);
      if (teamIndex === -1) {
        res.status(404).json({ success: false, error: 'Team not found' });
        return;
      }

      const deleted = store.teams.splice(teamIndex, 1)[0];

      await DbRepository.deleteTeam(id);

      res.status(200).json({
        success: true,
        message: `Team "${deleted.team_name}" disbandment complete.`,
        data: deleted
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 8C. Community Directory & Registration (DB Persistence)
  // =========================================================================
  public static async getCommunities(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const officerWard = (req.user as any)?.ward_number || 3;
      const comms = await DbRepository.getCommunitiesList(officerWard);
      store.communities = comms;
      res.status(200).json({ success: true, data: comms });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async addCommunity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        community_name,
        head_name,
        phone,
        email,
        username,
        password,
        address,
        locality = 'Dudhiya Talao',
        organisation_type = 'Resident Welfare Association'
      } = req.body;

      if (!community_name || !head_name) {
        res.status(400).json({ success: false, error: 'Community name and head name are required' });
        return;
      }

      const rawPhone = String(phone || '+919825100000').trim();
      const normalizedPhone = normalizeIndianPhone(rawPhone) || rawPhone;
      const headPassword = (password && String(password).trim().length > 0) ? String(password).trim() : 'Head@123';
      const passwordHash = await bcrypt.hash(headPassword, 10);
      const newUserId = randomUUID();
      const newCommunityId = randomUUID();
      const effectiveEmail = email?.trim() || `${head_name.toLowerCase().replace(/\s+/g, '.')}@community.org`;
      const effectiveUsername = (username && String(username).trim().length > 0) ? String(username).trim() : (effectiveEmail || normalizedPhone);

      // Create profile for Community Head login
      const newProfile: any = {
        id: newUserId,
        full_name: head_name.trim(),
        phone: normalizedPhone,
        email: effectiveEmail,
        username: effectiveUsername,
        plain_password: headPassword,
        preferred_language: 'en',
        locality: locality?.trim() || 'Dudhiya Talao',
        address: address?.trim() || 'Dudhiya Talao Road, Ward 3, Navsari',
        is_active: true,
        role: 'community_head',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const newAuthProfile: any = {
        id: `auth-${newUserId}`,
        user_id: newUserId,
        mobile_number: normalizedPhone,
        password_hash: passwordHash,
        plain_password: headPassword,
        mobile_verified: true,
        verification_completed_at: new Date().toISOString(),
        account_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (!store.profiles) store.profiles = [];
      store.profiles.push(newProfile);

      if (!store.authProfiles) store.authProfiles = [];
      store.authProfiles.push(newAuthProfile);

      const newCommunity = {
        id: newCommunityId,
        user_id: newUserId,
        community_name: community_name.trim(),
        organisation_type: organisation_type || 'Resident Welfare Association',
        head_name: head_name.trim(),
        phone: normalizedPhone,
        email: effectiveEmail,
        username: effectiveUsername,
        plain_password: headPassword,
        ward_number: 3,
        ward_name: 'Ward 3 - Dudhiya Talao & Ashapuri',
        address: address?.trim() || 'Dudhiya Talao Road, Ward 3, Navsari',
        locality: locality?.trim() || 'Dudhiya Talao',
        active_drives_count: 0,
        created_at: new Date().toISOString()
      };

      // Persist to PostgreSQL database
      const savedComm = await DbRepository.saveCommunityToDb(newCommunity, passwordHash);

      if (!store.communities) store.communities = [];
      const commIdx = store.communities.findIndex(c => c.id === savedComm.id);
      if (commIdx !== -1) {
        store.communities[commIdx] = savedComm;
      } else {
        store.communities.push(savedComm);
      }

      res.status(201).json({
        success: true,
        message: `Community "${savedComm.community_name}" registered! Head can log in with Mobile: "${normalizedPhone}" or Username/Email: "${effectiveUsername}", Password: "${headPassword}".`,
        data: savedComm
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateCommunity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { community_name, head_name, phone, email, address, locality, organisation_type } = req.body;

      const commIndex = (store.communities || []).findIndex(c => c.id === id);
      if (commIndex === -1) {
        res.status(404).json({ success: false, error: 'Community not found' });
        return;
      }

      const existing = store.communities[commIndex];
      const updated = {
        ...existing,
        community_name: community_name?.trim() || existing.community_name,
        head_name: head_name?.trim() || existing.head_name,
        phone: phone?.trim() || existing.phone,
        email: email?.trim() || existing.email,
        address: address?.trim() || existing.address,
        locality: locality?.trim() || existing.locality,
        organisation_type: organisation_type || existing.organisation_type,
        updated_at: new Date().toISOString()
      };

      store.communities[commIndex] = updated;

      await DbRepository.updateCommunityInDb(id, req.body);

      res.status(200).json({
        success: true,
        message: `Community "${updated.community_name}" details updated successfully.`,
        data: updated
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async deleteCommunity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const commIndex = (store.communities || []).findIndex(c => c.id === id);
      if (commIndex === -1) {
        res.status(404).json({ success: false, error: 'Community not found' });
        return;
      }

      const deleted = store.communities.splice(commIndex, 1)[0];

      await DbRepository.deleteCommunityFromDb(id);

      res.status(200).json({
        success: true,
        message: `Community "${deleted.community_name}" removed from Ward 3 directory.`,
        data: deleted
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 8D. Community Registration Requests (Pending Approval by Ward Officer)
  // =========================================================================
  public static async getCommunityRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let officerWardNum = (req.user as any)?.ward_number ? Number((req.user as any)?.ward_number) : undefined;
      if (!officerWardNum && req.query.ward_number && req.query.ward_number !== 'all') {
        officerWardNum = parseInt(req.query.ward_number as string, 10);
      }
      const allRequests = store.communityRegistrationRequests || [];
      const filtered = (officerWardNum && req.query.all !== 'true')
        ? allRequests.filter(r => (r.ward_number || 3) === officerWardNum)
        : allRequests;
      res.status(200).json({ success: true, data: filtered });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async approveCommunityRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { password, comments = '' } = req.body;

      if (!password || String(password).trim().length < 6) {
        res.status(400).json({ success: false, error: 'Password is required and must be at least 6 characters' });
        return;
      }

      if (!store.communityRegistrationRequests) store.communityRegistrationRequests = [];
      const request = store.communityRegistrationRequests.find(r => r.id === id);
      if (!request) {
        res.status(404).json({ success: false, error: 'Community registration request not found' });
        return;
      }

      if (request.status === 'approved') {
        res.status(400).json({ success: false, error: 'This community has already been approved' });
        return;
      }

      const assignedPass = String(password).trim();
      const passwordHash = await bcrypt.hash(assignedPass, 10);
      const newUserId = randomUUID();
      const newCommunityId = randomUUID();
      const normalizedPhone = request.phone;
      const effectiveEmail = `${request.full_name.toLowerCase().replace(/\s+/g, '.')}@community.org`;
      const effectiveUsername = normalizedPhone;

      // Update request status
      request.status = 'approved';
      request.assigned_password = assignedPass;
      request.reviewed_at = new Date().toISOString();
      request.reviewed_by_officer_id = req.user?.id;
      request.reviewed_by_officer_name = req.user?.full_name || 'Ramesh Patel (Chief Sanitary Inspector)';

      // Create community head profile
      const newProfile: any = {
        id: newUserId,
        full_name: request.full_name.trim(),
        phone: normalizedPhone,
        email: effectiveEmail,
        username: effectiveUsername,
        plain_password: assignedPass,
        preferred_language: 'en',
        locality: request.locality || 'Dudhiya Talao',
        address: request.address || `Ward ${request.ward_number || 3}, Navsari`,
        is_active: true,
        role: 'community_head',
        ward_number: request.ward_number || 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const newAuthProfile: any = {
        id: `auth-${newUserId}`,
        user_id: newUserId,
        mobile_number: normalizedPhone,
        password_hash: passwordHash,
        plain_password: assignedPass,
        mobile_verified: true,
        verification_completed_at: new Date().toISOString(),
        account_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (!store.profiles) store.profiles = [];
      store.profiles = store.profiles.filter(p => p.phone !== normalizedPhone);
      store.profiles.push(newProfile);

      if (!store.authProfiles) store.authProfiles = [];
      store.authProfiles = store.authProfiles.filter(a => a.mobile_number !== normalizedPhone);
      store.authProfiles.push(newAuthProfile);

      const newCommunity = {
        id: newCommunityId,
        user_id: newUserId,
        community_name: request.community_name.trim(),
        organisation_type: request.organisation_type || 'Resident Welfare Association',
        head_name: request.full_name.trim(),
        phone: normalizedPhone,
        email: effectiveEmail,
        username: effectiveUsername,
        plain_password: assignedPass,
        ward_number: request.ward_number || 3,
        ward_name: request.ward_name || `Ward ${request.ward_number || 3} - Dudhiya Talao`,
        address: request.address || 'Navsari',
        locality: request.locality || 'Dudhiya Talao',
        active_drives_count: 0,
        verification_document: request.document_url,
        created_at: new Date().toISOString()
      };

      if (!store.communities) store.communities = [];
      store.communities.push(newCommunity);

      // Persist to Postgres if available
      try {
        await DbRepository.saveCommunityToDb(newCommunity, passwordHash);
      } catch (e: any) {
        console.log('[COMMUNITY APPROVAL DB SAVE]:', e.message);
      }

      // Send SMS message to community head's device with the password!
      if (!store.smsMessages) store.smsMessages = [];
      const approvalSms: SimulatedSms = {
        id: `sms-${Date.now()}`,
        phone: normalizedPhone,
        sender: 'VM-NMCGOV',
        senderName: 'Govt. of Gujarat · Navsari Municipal Corporation',
        body: `Govt. of Gujarat · Navsari Municipal Corporation (Ward ${request.ward_number || 3}): Congratulations ${request.full_name}! Your Community Head registration for "${request.community_name}" has been APPROVED by the Ward Officer. Your login credentials are: Mobile: ${normalizedPhone}, Password: ${assignedPass}. You can now log in at the Swachh Setu Portal.`,
        password: assignedPass,
        type: 'approval',
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        isRead: false
      };
      store.smsMessages.unshift(approvalSms);

      // Push notification
      if (!store.notifications) store.notifications = [];
      store.notifications.push({
        id: `notif-${Date.now()}`,
        user_id: newUserId,
        title: 'Community Head Registration Approved!',
        message: `Your community "${request.community_name}" is approved. Your password is ${assignedPass}`,
        notification_type: 'system_alert',
        is_read: false,
        created_at: new Date().toISOString()
      });

      console.log(`[COMMUNITY APPROVED] By Ward Officer: "${request.community_name}". Password set: "${assignedPass}". SMS sent to ${normalizedPhone}`);

      res.status(200).json({
        success: true,
        message: `Community "${request.community_name}" approved! Login password "${assignedPass}" sent to head's mobile (${normalizedPhone}).`,
        data: {
          request,
          community: newCommunity,
          credentials: {
            mobile: normalizedPhone,
            password: assignedPass
          }
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async rejectCommunityRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason = 'Document verification could not be validated' } = req.body;

      if (!store.communityRegistrationRequests) store.communityRegistrationRequests = [];
      const request = store.communityRegistrationRequests.find(r => r.id === id);
      if (!request) {
        res.status(404).json({ success: false, error: 'Community registration request not found' });
        return;
      }

      request.status = 'rejected';
      request.rejection_reason = reason;
      request.reviewed_at = new Date().toISOString();
      request.reviewed_by_officer_id = req.user?.id;
      request.reviewed_by_officer_name = req.user?.full_name || 'Ward Officer';

      // Send rejection SMS to applicant device
      if (!store.smsMessages) store.smsMessages = [];
      store.smsMessages.unshift({
        id: `sms-${Date.now()}`,
        phone: request.phone,
        sender: 'VM-NMCGOV',
        senderName: 'Govt. of Gujarat · Navsari Municipal Corporation',
        body: `Navsari Municipal Corporation (Ward ${request.ward_number || 3}): Your Community Head registration request for "${request.community_name}" was rejected. Reason: ${reason}. Please visit the Ward office or re-apply with valid documents.`,
        type: 'submission',
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        isRead: false
      });

      res.status(200).json({
        success: true,
        message: `Registration request for "${request.community_name}" has been rejected. Notification dispatched.`,
        data: request
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 9. Approval Management Queue (Centralized Decisions)
  // =========================================================================
  public static async getApprovals(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let officerWardNum = (req.user as any)?.ward_number ? Number((req.user as any)?.ward_number) : undefined;
      if (!officerWardNum && req.query.ward_number && req.query.ward_number !== 'all') {
        officerWardNum = parseInt(req.query.ward_number as string, 10);
      }
      if (!officerWardNum && req.user?.locality) {
        const m = req.user.locality.match(/Ward\s*(\d+)/i);
        if (m) officerWardNum = parseInt(m[1], 10);
      }
      if (!officerWardNum && req.user?.address) {
        const m = req.user.address.match(/Ward\s*(\d+)/i);
        if (m) officerWardNum = parseInt(m[1], 10);
      }
      const dynamicPending = await DbRepository.getPendingActivitiesForOfficer(officerWardNum);

      // Pending Community Registration Requests mapped to WardApprovalItem
      const pendingCommRequests: WardApprovalItem[] = (store.communityRegistrationRequests || [])
        .filter(r => r.status === 'pending' && (!officerWardNum || r.ward_number === officerWardNum))
        .map(r => ({
          id: r.id,
          type: 'community_registration' as const,
          title: `Community Head Registration: ${r.community_name}`,
          submitted_by_name: `${r.full_name} (${r.phone})`,
          submitted_by_role: 'Community Head Applicant',
          submission_time: r.submitted_at,
          ward_number: r.ward_number || officerWardNum || 3,
          status: 'pending' as const,
          details: {
            request_code: r.request_code,
            full_name: r.full_name,
            phone: r.phone,
            community_name: r.community_name,
            organisation_type: r.organisation_type,
            locality: r.locality,
            address: r.address,
            document_name: r.document_name,
            document_url: r.document_url,
            document_type: r.document_type,
            notes: r.notes
          },
          photos: r.document_url ? [r.document_url] : []
        }));

      const otherApprovals: WardApprovalItem[] = [
        {
          id: 'appr-cr-01',
          type: 'completion_report',
          title: 'Completion Report: TSK-NAV-2026-101 (Dudhiya Talao Cleanliness)',
          submitted_by_name: 'Kanti Solanki (Team Leader)',
          submitted_by_role: 'Sanitation Worker',
          submission_time: '2026-10-28T12:55:00Z',
          ward_number: officerWardNum || 3,
          status: 'pending',
          details: {
            task_code: 'TSK-NAV-2026-101',
            waste_quantity: 'Approx 380 kg',
            equipment: ['NMC Tipper Truck GJ-21-N-4421', 'Heavy brooms', 'Disinfectant Sprayer']
          },
          photos: [
            'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80'
          ]
        },
        {
          id: 'appr-ev-01',
          type: 'evidence_review',
          title: 'Work Evidence: Pavement Desludging at Ashapuri Residency',
          submitted_by_name: 'Suresh Vaghela',
          submitted_by_role: 'Waste Collection Worker',
          submission_time: '2026-10-29T10:15:00Z',
          ward_number: officerWardNum || 3,
          status: 'pending',
          details: {
            gps_match: '11.5 meters from assigned coordinates',
            ai_quality: 'Pass - Genuine civic cleanliness photo'
          },
          photos: ['https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80']
        }
      ];

      // Pending Community Problem Drive Proposals mapped to WardApprovalItem
      const pendingProblemProposals: WardApprovalItem[] = [];
      const pendingEvidenceReviews: WardApprovalItem[] = [];
      const problemsList = await DbRepository.getCommunityProblems(officerWardNum);
      for (const p of problemsList) {
        for (const reqItem of (p.drive_requests || [])) {
          if (reqItem.status === 'pending') {
            pendingProblemProposals.push({
              id: reqItem.id || `${p.id}_${reqItem.community_id}`,
              type: 'activity' as const,
              title: `Cleanliness Drive Proposal: ${p.title}`,
              submitted_by_name: `${reqItem.community_name} (${reqItem.head_name || 'Community Leader'})`,
              submitted_by_role: 'Community Head',
              submission_time: reqItem.submitted_at || new Date().toISOString(),
              ward_number: p.ward_number || officerWardNum || 3,
              status: 'pending' as const,
              details: {
                proposed_date: reqItem.proposed_date ? new Date(reqItem.proposed_date).toLocaleDateString() : (p.start_time ? new Date(p.start_time).toLocaleDateString() : 'Upcoming'),
                location: p.location_name || p.address || 'Navsari',
                expected_volunteers: reqItem.proposed_volunteers_count || p.estimated_volunteers_needed || 20,
                safety_plan: reqItem.notes || p.action_plan,
                linked_problem: `Civic Focus: "${p.title}" (Ward ${p.ward_number})`
              },
              photos: p.image_url ? [p.image_url] : []
            });
          }
        }

        // Completed Drive Work Evidence submitted for Officer Review (Ward Officer-created drives)
        if (p.evidence_status === 'submitted') {
          const evList = await DbRepository.getActivityEvidence(p.id);
          const regRes = await DbRepository.getActivityRegistrations(p.id, { limit: 200 });
          const presentCount = regRes.registrations.filter(r => r.attendance_status === 'present').length;
          pendingEvidenceReviews.push({
            id: `ev-review-${p.id}`,
            type: 'evidence_review' as const,
            title: `Drive Completion Evidence: ${p.title}`,
            submitted_by_name: p.claimed_by_community_name || 'Community Organization',
            submitted_by_role: 'Community Head',
            submission_time: p.evidence_submitted_at || p.updated_at || new Date().toISOString(),
            ward_number: p.ward_number || officerWardNum || 3,
            status: 'pending' as const,
            details: {
              drive_source: 'Ward Officer Drive',
              location: p.location_name || p.address || 'Navsari',
              attendance_verified: `${presentCount} present / ${regRes.total} registered volunteers`,
              evidence_photos_count: `${evList.length} photo(s) (${evList.map(e => e.evidence_type || e.stage).join(', ') || 'attached'})`,
              submission_notes: p.evidence_review_comments || 'Community Head has requested Ward Officer verification of completed cleanliness work.'
            },
            photos: evList.map(e => e.storage_path || e.image_url || '').filter(Boolean)
          });
        }
      }

      // Completed Drive Work Evidence submitted for Officer Review (Community Head-created drives)
      const submittedEvidenceActs = await DbRepository.getPendingEvidenceReviewActivities(officerWardNum);
      for (const act of submittedEvidenceActs) {
        const evList = await DbRepository.getActivityEvidence(act.id);
        const regRes = await DbRepository.getActivityRegistrations(act.id, { limit: 200 });
        const presentCount = regRes.registrations.filter(r => r.attendance_status === 'present').length;
        pendingEvidenceReviews.push({
          id: `ev-review-${act.id}`,
          type: 'evidence_review' as const,
          title: `Drive Completion Evidence: ${act.title}`,
          submitted_by_name: (act as any).community_name || 'Community Organization',
          submitted_by_role: 'Community Head',
          submission_time: act.updated_at || new Date().toISOString(),
          ward_number: act.ward_number || officerWardNum || 3,
          status: 'pending' as const,
          details: {
            drive_source: 'Community Head Drive',
            location: act.address || act.target_area || act.landmark || 'Navsari',
            attendance_verified: `${presentCount} present / ${regRes.total} registered volunteers`,
            evidence_photos_count: `${evList.length} photo(s) (${evList.map(e => e.evidence_type || e.stage).join(', ') || 'attached'})`,
            submission_notes: 'Community Head has submitted completion evidence and requested Ward Officer verification.'
          },
          photos: evList.map(e => e.storage_path || e.image_url || '').filter(Boolean)
        });
      }

      res.status(200).json({
        success: true,
        data: [...pendingCommRequests, ...pendingEvidenceReviews, ...pendingProblemProposals, ...dynamicPending, ...otherApprovals]
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 10. Review Approval Item (Approve, Request Changes, Reject)
  // =========================================================================
  public static async reviewApproval(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { action, comments = '', password } = req.body;

      if (!action || !['approve', 'changes_requested', 'reject'].includes(action)) {
        res.status(400).json({ success: false, error: 'Valid action (approve, changes_requested, reject) required' });
        return;
      }

      // Check if this approval item is a Drive Completion Evidence Review
      if (id.startsWith('ev-review-')) {
        const targetDriveId = id.replace('ev-review-', '');
        const decision = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'changes_requested';
        const reviewerId = req.user?.id || 'w0000000-0000-0000-0000-000000000003';
        await DbRepository.reviewActivityEvidence(
          targetDriveId,
          reviewerId,
          'ward_officer',
          decision,
          comments || (decision === 'approved' ? 'Work verified and approved by Ward Officer.' : 'Please review officer feedback and resubmit evidence.')
        );

        // Build drive completion metadata so Officer UI can immediately post completion & send certificates
        const prob = (store.communityProblems || []).find(p => p.id === targetDriveId);
        const act = !prob ? ((store.communityActivities || []).find(a => a.id === targetDriveId) || await DbRepository.getActivityById(targetDriveId)) : null;
        const evList = await DbRepository.getActivityEvidence(targetDriveId);
        const regRes = await DbRepository.getActivityRegistrations(targetDriveId, { limit: 200 });

        let participatingCommunities: string[] = [];
        if (prob?.assigned_communities && prob.assigned_communities.length > 0) {
          participatingCommunities = prob.assigned_communities.map(c => c.community_name);
        } else if (prob?.claimed_by_community_name) {
          participatingCommunities = prob.claimed_by_community_name
            .replace(/\s*\(Joint Drive\)\s*/i, '')
            .split('&')
            .map(s => s.trim())
            .filter(Boolean);
        } else if (act) {
          const comm = (store.communities || []).find(c => c.id === act.community_id);
          participatingCommunities = [comm?.community_name || (act as any).community_name || 'Community Action Team'];
        }

        res.status(200).json({
          success: true,
          message:
            decision === 'approved'
              ? 'Drive completion evidence verified & approved! You can now post the drive completion and issue certificates & points.'
              : decision === 'changes_requested'
              ? 'Changes requested on drive completion evidence. Community Head notified.'
              : 'Drive completion evidence rejected. Community Head notified.',
          data: {
            id,
            target_drive_id: targetDriveId,
            action,
            decision,
            comments,
            ready_to_post: decision === 'approved',
            completed_drive: decision === 'approved' ? {
              id: targetDriveId,
              title: prob?.title || act?.title || 'Cleanliness Drive',
              ward_number: prob?.ward_number || act?.ward_number || 3,
              ward_name: prob?.ward_name || act?.ward_name || `Ward ${prob?.ward_number || act?.ward_number || 3}`,
              location_name: prob?.location_name || prob?.address || act?.address || (act as any)?.target_area || 'Navsari',
              participating_communities: participatingCommunities,
              volunteers_count: regRes.registrations.filter(r => r.attendance_status === 'present').length,
              registered_count: regRes.total,
              photos: evList.map(e => ({ url: e.storage_path || e.image_url || '', stage: e.evidence_type || e.stage || 'after', caption: e.caption })),
              completion_posted: Boolean((prob as any)?.completion_posted || (act as any)?.completion_posted)
            } : undefined
          }
        });
        return;
      }

      // Check if this approval item is a community registration request
      const commReq = (store.communityRegistrationRequests || []).find(r => r.id === id);
      if (commReq) {
        if (action === 'approve') {
          const pass = password || (comments && comments.length >= 6 ? comments : 'Navsari@2026');
          req.body.password = pass;
          return WardOfficerController.approveCommunityRequest(req, res);
        } else {
          req.body.reason = comments || 'Verification document rejected by Ward Officer';
          return WardOfficerController.rejectCommunityRequest(req, res);
        }
      }

      // Check if this approval item is a community problem proposal
      const problems = store.communityProblems || [];
      const problemMatch = problems.find(p =>
        (p.drive_requests || []).some(r => r.id === id || `${p.id}_${r.community_id}` === id)
      );
      if (problemMatch) {
        const dReq = problemMatch.drive_requests?.find(r => r.id === id || `${problemMatch.id}_${r.community_id}` === id);
        if (dReq) {
          if (action === 'approve') {
            await DbRepository.approveProblemCommunities(
              problemMatch.id,
              [dReq.community_id],
              comments || 'Approved by Ward Officer for community execution',
              req.user?.full_name || 'Ward Officer'
            );
            res.status(200).json({
              success: true,
              message: `Cleanliness Drive proposal for "${problemMatch.title}" approved for ${dReq.community_name}!`,
              data: { id, action, comments }
            });
            return;
          } else {
            dReq.status = 'rejected';
            dReq.reviewed_at = new Date().toISOString();
            res.status(200).json({
              success: true,
              message: `Proposal rejected: ${comments}`,
              data: { id, action, comments }
            });
            return;
          }
        }
      }

      const officerWard = (req.user as any)?.ward_number;
      const result = await DbRepository.officerReviewApproval(id, action, comments, officerWard);

      res.status(200).json({
        success: true,
        message: result.message,
        data: { id, action, comments, reviewed_at: new Date().toISOString() }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 11. Ward Cleanliness Score (Formula: 0.40*C + 0.25*H + 0.20*R + 0.15*P)
  // =========================================================================
  public static async getCleanlinessScore(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: wardData.cleanlinessScore
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 12. Reports & Analytics
  // =========================================================================
  public static async getReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { report_type = 'complaints' } = req.query as any;

      const reportData = {
        generated_at: new Date().toISOString(),
        ward_number: 3,
        ward_name: 'Ward 3 - Dudhiya Talao & Ashapuri',
        report_type,
        summary: {
          total_complaints_analyzed: 42,
          resolution_rate_pct: 90.5,
          avg_resolution_hours: 24.8,
          worker_attendance_rate_pct: 96.2,
          total_waste_cleared_tonnes: 14.8
        },
        breakdowns: [
          { category: 'Overflowing Dustbin', count: 18, resolved: 17, avg_hours: 18.2 },
          { category: 'Open Garbage Dumping', count: 12, resolved: 10, avg_hours: 32.4 },
          { category: 'Littering', count: 8, resolved: 8, avg_hours: 14.5 },
          { category: 'Drainage Blockage', count: 4, resolved: 3, avg_hours: 28.0 }
        ]
      };

      res.status(200).json({ success: true, data: reportData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 12. Reject Citizen Complaint with Reason & Citizen Notification
  // =========================================================================
  public static async rejectComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rejection_reason } = req.body;

      if (!rejection_reason || !rejection_reason.trim()) {
        res.status(400).json({ success: false, error: 'A specific reason for rejection is required.' });
        return;
      }

      const complaint = (store.complaints || []).find(c => c.id === id);
      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found.' });
        return;
      }

      const prevStatus = complaint.status;
      complaint.status = 'rejected';
      (complaint as any).rejection_reason = rejection_reason.trim();
      complaint.updated_at = new Date().toISOString();

      const officerName = req.user?.full_name || (complaint.location?.ward_number === 8 ? 'Cyrus Contractor (Ward 8 Officer)' : 'Ramesh Patel (Ward 3 Officer)');

      // Update in both memory store and PostgreSQL database
      await DbRepository.updateComplaintStatus(complaint.id, 'rejected', {
        name: officerName,
        role: 'ward_officer',
        note: `Complaint rejected: ${rejection_reason.trim()}`,
        rejection_reason: rejection_reason.trim()
      });

      // Dispatch live notification to citizen
      await DbRepository.createNotification(
        complaint.citizen_id || 'c0000000-0000-0000-0000-000000000001',
        `Complaint ${complaint.complaint_number} Rejected`,
        `Your complaint for ${complaint.category_name} at ${complaint.location?.landmark || complaint.location?.address} was reviewed and rejected by the Ward Officer. Reason: "${rejection_reason.trim()}"`,
        complaint.id,
        'complaint_status'
      );

      res.status(200).json({
        success: true,
        message: `Complaint ${complaint.complaint_number} has been rejected and the citizen has been notified.`,
        data: {
          complaint_id: complaint.id,
          status: 'rejected',
          rejection_reason: rejection_reason.trim()
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 13. Verify & Mark Work Complete (Trigger Citizen Resolution Notification)
  // =========================================================================
  public static async verifyCompleteComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { review_notes } = req.body;

      const complaint = (store.complaints || []).find(c => c.id === id);
      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found.' });
        return;
      }

      const prevStatus = complaint.status;
      complaint.status = 'resolved';
      complaint.updated_at = new Date().toISOString();
      (complaint as any).resolved_at = new Date().toISOString();

      // Update corresponding work assignments
      (store.workAssignments || []).forEach(wa => {
        if (wa.id === (complaint as any).assignment_id || wa.title?.includes(complaint.category_name)) {
          wa.status = 'verified_complete';
          (wa as any).verified_complete = true;
          wa.updated_at = new Date().toISOString();
        }
      });
      await DbRepository.verifyCompleteAssignment(complaint.id, complaint.category_name);

      // Update work attempts
      const attempts = wardData.workAttempts.get(complaint.id) || [];
      if (attempts.length > 0) {
        attempts[attempts.length - 1].status = 'verified_complete';
        attempts[attempts.length - 1].review_decision = 'verified_complete';
        (attempts[attempts.length - 1] as any).officer_review_notes = review_notes || 'All before and after photo evidence verified. Site cleared and sanitized.';
      }

      const officerName = req.user?.full_name || (complaint.location?.ward_number === 8 ? 'Cyrus Contractor (Ward 8 Officer)' : 'Ramesh Patel (Ward 3 Officer)');

      // Persist status change to both store and PostgreSQL database
      await DbRepository.updateComplaintStatus(complaint.id, 'resolved', {
        name: officerName,
        role: 'ward_officer',
        note: review_notes || 'Ward Officer inspected evidence photos and verified 100% cleanliness clearance.'
      });

      // Dispatch live notification to citizen
      await DbRepository.createNotification(
        complaint.citizen_id || 'c0000000-0000-0000-0000-000000000001',
        `Cleanliness Restored! Complaint ${complaint.complaint_number} Resolved`,
        `Great news! The Sanitation Squad has resolved your complaint for ${complaint.category_name} at ${complaint.location?.landmark || complaint.location?.address}. Before and after evidence has been verified. Thank you for keeping Navsari clean!`,
        complaint.id,
        'complaint_status'
      );

      res.status(200).json({
        success: true,
        message: `Complaint ${complaint.complaint_number} verified and marked complete. Citizen has been notified!`,
        data: {
          complaint_id: complaint.id,
          status: 'resolved',
          resolved_at: complaint.updated_at
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 14. Publish Work Completion to Community Wall (Citizen Feed)
  // =========================================================================
  public static async publishComplaintToCommunity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, before_photo_url, after_photo_url, after_photos = [], waste_kg = 380 } = req.body;

      const complaint = (store.complaints || []).find(c => c.id === id);
      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found.' });
        return;
      }

      const allAfterPhotos = Array.isArray(after_photos) && after_photos.length > 0
        ? after_photos
        : after_photo_url
        ? [after_photo_url]
        : ['https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80'];

      const primaryAfterPhoto = allAfterPhotos[0];
      const primaryBeforePhoto = before_photo_url || complaint.image_url;

      const postTitle = title || `Cleanliness Restored at ${complaint.location?.landmark || complaint.location?.address || 'Ward 3'}`;
      const postDesc = description || `NMC Sanitation Squad cleared ${waste_kg} kg of accumulated waste, disinfected the curb, and restored civic hygiene following citizen report ${complaint.complaint_number}.`;

      const officerWard = (req.user as any)?.ward_number || complaint.location?.ward_number || 3;
      const officerName = req.user?.full_name || (officerWard === 8 ? 'Cyrus Contractor (Ward 8 Officer)' : 'Ramesh Patel (Chief Sanitary Inspector · Ward 3)');

      const newPost: any = {
        id: `rec-post-${Date.now()}`,
        title: postTitle,
        description: postDesc,
        author_id: req.user?.id || 'w0000000-0000-0000-0000-000000000003',
        author_name: officerName,
        author_role: 'ward_officer',
        author_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
        ward_id: `ward-0${officerWard}`,
        ward_number: officerWard,
        ward_name: complaint.location?.ward_name || `Ward ${officerWard}`,
        location_name: complaint.location?.landmark || complaint.location?.address || `Navsari Ward ${officerWard}`,
        image_url: primaryAfterPhoto,
        before_image_url: primaryBeforePhoto,
        after_image_url: primaryAfterPhoto,
        after_photos: allAfterPhotos,
        hero_name: 'Sanitation Squad Lead',
        hero_role: 'NMC Field Hero',
        badge_title: 'Hygiene Champion',
        achievement_stats: `${waste_kg} kg waste cleared`,
        likes_count: 24,
        comments_count: 2,
        is_verified_by_officer: true,
        created_at: new Date().toISOString(),
        comments: [
          {
            id: `c-1-${Date.now()}`,
            user_id: 'cit-10',
            user_name: 'Navsari Civic Watch',
            user_role: 'citizen',
            user_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            text: 'Huge kudos to the municipal team for clearing this so swiftly!',
            created_at: new Date().toISOString()
          }
        ]
      };

      if (!store.recognitionPosts) store.recognitionPosts = [];
      store.recognitionPosts.unshift(newPost);

      // Persist to DB if connected
      await DbRepository.createRecognitionPost({
        author_name: officerName,
        author_role: 'ward_officer',
        ward_number: officerWard,
        ward_name: complaint.location?.ward_name || `Ward ${officerWard}`,
        hero_name: 'Sanitation Squad Lead',
        hero_role: 'Field Sanitation Squad',
        badge_title: 'Civic Champion',
        title: postTitle,
        description: postDesc,
        achievement_stats: `${waste_kg} kg waste cleared`,
        image_url: primaryAfterPhoto,
        before_image_url: primaryBeforePhoto,
        after_image_url: primaryAfterPhoto,
        after_photos: allAfterPhotos
      }).catch(() => {});

      // Update complaint status & photos to fully resolved
      complaint.status = 'resolved';
      complaint.resolved_at = new Date().toISOString();
      complaint.resolved_image_url = primaryAfterPhoto;
      (complaint as any).is_published_to_community = true;
      (complaint as any).work_done_photos = allAfterPhotos;

      if (!(complaint as any).progress_updates) (complaint as any).progress_updates = [];
      (complaint as any).progress_updates.push({
        status: 'Verified Complete',
        message: 'Ward Officer verified work done completion, sent resolution photos to citizen, and published to community feed.',
        timestamp: new Date().toISOString(),
        by: officerName
      });

      if (isDbConnected()) {
        await pool.query(
          `UPDATE complaints SET status = 'resolved', resolved_image_url = $1, resolved_at = NOW(), updated_at = NOW() WHERE id = $2`,
          [primaryAfterPhoto, complaint.id]
        ).catch(() => {});
      }

      // Automatically send live notification to the citizen who filed this complaint!
      if (complaint.citizen_id) {
        await DbRepository.createNotification(
          complaint.citizen_id,
          'Cleanliness Work Done & Verified! 🎉',
          `Your complaint ${complaint.complaint_number} at ${complaint.location?.landmark || complaint.location?.address || 'Navsari'} has been successfully resolved! Ward Officer has verified the field crew's work and sent work done completion photos to your dashboard.`,
          complaint.id,
          'complaint_resolved'
        );
      }

      res.status(201).json({
        success: true,
        message: 'Work done proof sent to citizen and published to community feed successfully! Citizen notified.',
        data: newPost
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 13. Ward Community Problems (Ward Officer posts for Community Head drives)
  // =========================================================================
  public static async getCommunityProblems(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const officerWard = (req.user as any)?.ward_number || 3;
      const wardParam = req.query.ward_number ? parseInt(req.query.ward_number as string, 10) : officerWard;
      const problems = await DbRepository.getCommunityProblems(wardParam);
      res.status(200).json({ success: true, data: problems });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async addCommunityProblem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        title,
        description,
        location_name,
        address,
        latitude,
        longitude,
        action_plan,
        urgency = 'medium',
        estimated_volunteers_needed = 15,
        suggested_equipment = ['Brooms', 'Gloves', 'Trash Bags'],
        image_url,
        ward_number,
        start_time,
        end_time,
        max_volunteers_per_community = 25
      } = req.body;

      if (!title || !description || !action_plan) {
        res.status(400).json({
          success: false,
          error: 'Title, description, and action plan ("what should be done") are required.'
        });
        return;
      }

      const officerWard = ward_number ? parseInt(ward_number, 10) : ((req.user as any)?.ward_number || 3);
      const officerName = req.user?.full_name || 'Ward Officer';

      const savedProblem = await DbRepository.saveCommunityProblem({
        ward_number: officerWard,
        ward_name: `Ward ${officerWard}`,
        title,
        description,
        location_name: location_name || `Ward ${officerWard} Cleanliness Locus`,
        address: address || `Navsari Ward ${officerWard}`,
        latitude: latitude || 20.9325,
        longitude: longitude || 72.9275,
        action_plan,
        urgency,
        estimated_volunteers_needed,
        suggested_equipment,
        image_url,
        start_time,
        end_time,
        max_volunteers_per_community: Number(max_volunteers_per_community) || 25,
        created_by: req.user?.id,
        officer_name: officerName
      });

      res.status(201).json({
        success: true,
        message: 'Civic problem successfully posted for community action!',
        data: savedProblem
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async deleteCommunityProblem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await DbRepository.deleteCommunityProblem(id);
      res.status(200).json({ success: true, message: 'Community problem removed.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async reopenCommunityProblem(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await DbRepository.reopenCommunityProblem(id);
      res.status(200).json({ success: true, message: 'Community problem reopened for civic action.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getProblemDriveRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const requests = await DbRepository.getProblemDriveRequests(id);
      res.status(200).json({ success: true, data: requests });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async approveProblemCommunities(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { community_ids, comments } = req.body;

      if (!Array.isArray(community_ids) || community_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Please select at least one community organization to approve for this drive.'
        });
        return;
      }

      const officerName = req.user?.full_name || 'Ward Officer';
      const result = await DbRepository.approveProblemCommunities(
        id,
        community_ids,
        comments,
        officerName
      );

      if (!result.success || !result.problem) {
        res.status(404).json({ success: false, error: 'Problem/Drive not found or approval failed.' });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Successfully approved ${result.approvedCount} ${result.approvedCount > 1 ? 'communities for joint drive' : 'community for drive'}!`,
        data: result.problem
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // AI ANALYTICS SUITE (Seasonal Predictions, Performers, Chronic Hotspots)
  // =========================================================================

  public static async getAISeasonalPredictions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const wardNumber = req.query.ward ? Number(req.query.ward) : undefined;
      const data = await AIAnalyticsService.getSeasonalPredictions(wardNumber);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getAIPerformersSuggestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const wardNumber = req.query.ward ? Number(req.query.ward) : undefined;
      const data = await AIAnalyticsService.getPerformersSuggestions(wardNumber);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getAIChronicHotspots(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const wardNumber = req.query.ward ? Number(req.query.ward) : undefined;
      const data = await AIAnalyticsService.getChronicHotspots(wardNumber);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async executeAIQuickAction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { action_type, payload } = req.body;
      if (action_type === 'create_community_problem') {
        const problem = await DbRepository.saveCommunityProblem({
          ward_number: payload.ward_number || 3,
          created_by_officer_id: req.user?.id || 'd0000000-0000-0000-0000-000000000003',
          officer_name: req.user?.full_name || 'Ramesh Patel (Ward 3 Officer)',
          title: payload.title,
          category: payload.category || 'Drainage / Waste Accumulation',
          description: payload.description,
          action_required: payload.action_required || 'Conduct preemptive cleanliness and clearing drive with volunteers.',
          location_name: payload.location_name,
          landmark: payload.landmark,
          latitude: payload.latitude || 20.9312,
          longitude: payload.longitude || 72.9284,
          photo_urls: payload.photo_urls || []
        });
        res.status(201).json({ success: true, message: 'AI Suggested Civic Challenge added to Community Hub successfully!', data: problem });
        return;
      }

      if (action_type === 'publish_performer_recognition') {
        const post = await DbRepository.createRecognitionPost({
          author_name: req.user?.full_name || 'Ramesh Patel',
          author_role: 'Ward 3 Officer',
          hero_name: payload.hero_name,
          hero_role: payload.hero_role || 'Sanitation Star',
          badge_title: payload.badge_title || 'AI Verified Civic Champion',
          title: payload.title,
          description: payload.description,
          ward_number: payload.ward_number || 3,
          ward_name: payload.ward_name || 'Ward 3 (Dudhiya Talao)',
          achievement_stats: payload.achievement_stats || 'Top Performance Index Rating',
          image_url: payload.image_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80'
        });
        res.status(201).json({ success: true, message: 'Performer recognition post broadcast to Citizen & Community posts successfully!', data: post });
        return;
      }

      res.status(400).json({ success: false, error: 'Unknown AI quick action type' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // =========================================================================
  // 21. COMPLETED DRIVES & COMPLETION POST + CERTIFICATES + POINTS
  // =========================================================================

  /**
   * GET /api/ward/completed-drives
   * Returns all verified/completed drives (Officer-created & Community-created) eligible for completion post & certificates
   */
  public static async getCompletedDrives(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let officerWardNum = (req.user as any)?.ward_number ? Number((req.user as any)?.ward_number) : undefined;
      if (req.query.ward_number && req.query.ward_number !== 'all') {
        officerWardNum = parseInt(req.query.ward_number as string, 10);
      }

      const completedList: any[] = [];
      const seenIds = new Set<string>();

      // 1. Verified Ward Officer-created drives (communityProblems)
      const problems = await DbRepository.getCommunityProblems(officerWardNum);
      for (const p of problems) {
        const isVerified =
          p.status === 'resolved' ||
          p.evidence_status === 'verified_complete' ||
          p.evidence_status === 'ward_verified';
        if (!isVerified) continue;

        seenIds.add(p.id);
        const evList = await DbRepository.getActivityEvidence(p.id);
        const regRes = await DbRepository.getActivityRegistrations(p.id, { limit: 300 });
        const presentCount = regRes.registrations.filter(r => r.attendance_status === 'present').length;

        const participatingCommunities =
          p.assigned_communities && p.assigned_communities.length > 0
            ? p.assigned_communities.map(c => c.community_name)
            : p.claimed_by_community_name
            ? p.claimed_by_community_name.replace(/\s*\(Joint Drive\)\s*/i, '').split('&').map(s => s.trim()).filter(Boolean)
            : ['Community Volunteers'];

        completedList.push({
          id: p.id,
          source: 'ward_officer',
          title: p.title,
          description: p.description,
          ward_number: p.ward_number,
          ward_name: p.ward_name || `Ward ${p.ward_number}`,
          location_name: p.location_name || p.address || 'Navsari',
          participating_communities: participatingCommunities,
          volunteers_count: presentCount,
          registered_count: regRes.total,
          photos: evList.map(e => ({ url: e.storage_path || e.image_url || '', stage: e.evidence_type || e.stage || 'after', caption: e.caption })),
          image_url: p.image_url,
          completion_posted: Boolean(p.completion_posted),
          completion_post_id: p.completion_post_id,
          completed_at: p.updated_at || new Date().toISOString()
        });
      }

      // 2. Verified Community Head-created drives (communityActivities)
      const memActs = (store.communityActivities || []).filter(a => {
        const isVerified = a.evidence_status === 'verified_complete' || a.evidence_status === 'ward_verified';
        const matchesWard = !officerWardNum || !a.ward_number || a.ward_number === officerWardNum;
        return isVerified && matchesWard && !seenIds.has(a.id);
      });

      for (const act of memActs) {
        seenIds.add(act.id);
        const evList = await DbRepository.getActivityEvidence(act.id);
        const regRes = await DbRepository.getActivityRegistrations(act.id, { limit: 300 });
        const presentCount = regRes.registrations.filter(r => r.attendance_status === 'present').length;
        const comm = (store.communities || []).find(c => c.id === act.community_id);

        completedList.push({
          id: act.id,
          source: 'community_head',
          title: act.title,
          description: act.short_description || act.detailed_description,
          ward_number: act.ward_number || officerWardNum || 3,
          ward_name: act.ward_name || `Ward ${act.ward_number || 3}`,
          location_name: act.address || (act as any).target_area || act.landmark || 'Navsari',
          participating_communities: [comm?.community_name || (act as any).community_name || 'Community Action Team'],
          volunteers_count: presentCount,
          registered_count: regRes.total,
          photos: evList.map(e => ({ url: e.storage_path || e.image_url || '', stage: e.evidence_type || e.stage || 'after', caption: e.caption })),
          image_url: act.cover_image_path,
          completion_posted: Boolean((act as any).completion_posted),
          completion_post_id: (act as any).completion_post_id,
          completed_at: act.updated_at || new Date().toISOString()
        });
      }

      res.status(200).json({ success: true, data: completedList });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/ward/drives/:id/publish-completion
   * Ward Officer posts completed drive to Public Feed listing all participating communities below,
   * sends Completion Certificates to all participated citizens AND participating communities in Notifications,
   * and awards Civic Karma / Community Impact points to them!
   */
  public static async publishDriveCompletion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        achievement_stats,
        citizen_points = 150,
        community_points = 300,
        custom_communities
      } = req.body || {};

      const prob = (store.communityProblems || []).find(p => p.id === id);
      const act = !prob ? ((store.communityActivities || []).find(a => a.id === id) || await DbRepository.getActivityById(id)) : null;

      if (!prob && !act) {
        res.status(404).json({ success: false, error: 'Completed drive not found.' });
        return;
      }

      const officerWard = (req.user as any)?.ward_number || prob?.ward_number || act?.ward_number || 3;
      const officerName = req.user?.full_name || `Ward ${officerWard} Officer (NMC)`;
      const driveTitle = prob?.title || act?.title || 'Cleanliness Drive';
      const wardName = prob?.ward_name || act?.ward_name || `Ward ${officerWard} - Navsari`;
      const locationName = prob?.location_name || prob?.address || act?.address || (act as any)?.target_area || `Ward ${officerWard}, Navsari`;

      // Helper to resolve a community's head userId (by created_by, phone match, or community id)
      const resolveCommunityUserId = (commId: string, contactPhone?: string): string => {
        const commRec = (store.communities || []).find(c => c.id === commId);
        if (commRec?.created_by) return commRec.created_by;
        const phoneDigits = (contactPhone || commRec?.phone || commRec?.contact_phone || '').replace(/\D/g, '').slice(-10);
        if (phoneDigits.length === 10) {
          const matchedProfile = (store.profiles || []).find(
            p => p.role === 'community_head' && (p.phone || '').replace(/\D/g, '').slice(-10) === phoneDigits
          );
          if (matchedProfile) return matchedProfile.id;
        }
        return commId || 'c0000000-0000-0000-0000-000000000099';
      };

      // Gather participating communities (both id + name + owner user_id)
      const communityTargets: { id: string; name: string; userId: string }[] = [];
      if (prob?.assigned_communities && prob.assigned_communities.length > 0) {
        for (const ac of prob.assigned_communities) {
          communityTargets.push({
            id: ac.community_id,
            name: ac.community_name,
            userId: resolveCommunityUserId(ac.community_id, ac.contact_phone)
          });
        }
      } else if (prob?.claimed_by_community_id) {
        const ids = prob.claimed_by_community_id.split(',').map(s => s.trim()).filter(Boolean);
        const names = (prob.claimed_by_community_name || '')
          .replace(/\s*\(Joint Drive\)\s*/i, '')
          .split('&')
          .map(s => s.trim())
          .filter(Boolean);
        ids.forEach((cid, i) => {
          const commRec = (store.communities || []).find(c => c.id === cid);
          communityTargets.push({
            id: cid,
            name: names[i] || commRec?.community_name || 'Community Partner',
            userId: resolveCommunityUserId(cid)
          });
        });
      } else if (act) {
        const commRec = (store.communities || []).find(c => c.id === act.community_id);
        communityTargets.push({
          id: act.community_id || 'b0000000-0000-0000-0000-000000000001',
          name: commRec?.community_name || (act as any).community_name || 'Community Action Team',
          userId: act.created_by || resolveCommunityUserId(act.community_id || 'b0000000-0000-0000-0000-000000000001')
        });
      }

      const participatingCommunityNames: string[] =
        Array.isArray(custom_communities) && custom_communities.length > 0
          ? custom_communities.map((s: any) => String(s).trim()).filter(Boolean)
          : communityTargets.map(c => c.name);

      if (participatingCommunityNames.length === 0) {
        participatingCommunityNames.push('Navsari Community Volunteers');
      }

      // Gather evidence photos (before & after)
      const evList = await DbRepository.getActivityEvidence(id);
      const beforeEv = evList.find(e => (e.evidence_type || e.stage) === 'before');
      const afterEvs = evList.filter(e => (e.evidence_type || e.stage) === 'after');
      const allPhotos = evList.map(e => e.storage_path || e.image_url || '').filter(Boolean);
      const beforeImg = beforeEv?.storage_path || beforeEv?.image_url || prob?.image_url;
      const afterImg =
        afterEvs[0]?.storage_path ||
        afterEvs[0]?.image_url ||
        allPhotos[0] ||
        prob?.image_url ||
        act?.cover_image_path ||
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1000&q=80';

      // STRICT CERTIFICATE ELIGIBILITY: ONLY citizens explicitly marked 'present' by their Community Head receive completion certificates & points!
      const regRes = await DbRepository.getActivityRegistrations(id, { limit: 500 });
      const activeRegs = regRes.registrations.filter(r => r.registration_status !== 'cancelled');
      const participants = activeRegs.filter(r => r.attendance_status === 'present');

      const ptsCitizen = Math.max(10, Number(citizen_points) || 150);
      const ptsCommunity = Math.max(25, Number(community_points) || 300);
      const nowIso = new Date().toISOString();

      // 1. Create Official NMC Drive Completion Recognition Post listing Participating Communities below
      const postTitle = title?.trim() || `Cleanliness Drive Completed: ${driveTitle}`;
      const postDesc =
        description?.trim() ||
        `Ward ${officerWard} officially celebrates the successful completion of "${driveTitle}" at ${locationName}! Together with ${participants.length} dedicated citizen volunteers, the site has been restored to spotless civic hygiene. Official completion certificates and Civic Karma points (+${ptsCitizen} pts to volunteers, +${ptsCommunity} pts to communities) have been issued.`;
      const statsLabel =
        achievement_stats?.trim() ||
        `${participants.length} Volunteers · ${participatingCommunityNames.length} ${participatingCommunityNames.length === 1 ? 'Community' : 'Communities'} · +${ptsCitizen} Karma Pts`;

      const post = await DbRepository.createRecognitionPost({
        author_name: officerName,
        author_role: `Ward ${officerWard} Officer · Navsari Municipal Corporation`,
        ward_number: officerWard,
        ward_name: wardName,
        hero_name: participatingCommunityNames.join(' & '),
        hero_role: participatingCommunityNames.length > 1 ? 'Joint Cleanliness Drive Partners' : 'Community Cleanliness Partner',
        badge_title: 'Official Drive Completion · NMC Verified',
        title: postTitle,
        description: postDesc,
        achievement_stats: statsLabel,
        image_url: afterImg,
        before_image_url: beforeImg,
        after_image_url: afterImg,
        after_photos: allPhotos.length > 0 ? allPhotos : [afterImg],
        participating_communities: participatingCommunityNames,
        drive_id: id,
        volunteers_count: participants.length,
        points_awarded_citizen: ptsCitizen,
        points_awarded_community: ptsCommunity
      });

      // 2. Issue Completion Certificates & Award Points to ALL Participated Citizens in Notifications
      const sentCitizenIds = new Set<string>();
      for (const participant of participants) {
        if (sentCitizenIds.has(participant.citizen_id)) continue;
        sentCitizenIds.add(participant.citizen_id);

        const certCode = `NMC-CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const certificate = {
          certificate_id: certCode,
          recipient_name: participant.citizen_name || 'Citizen Volunteer',
          recipient_type: 'citizen' as const,
          drive_id: id,
          drive_title: driveTitle,
          ward_number: officerWard,
          ward_name: wardName,
          location_name: locationName,
          completed_date: nowIso,
          communities_involved: participatingCommunityNames,
          points_awarded: ptsCitizen,
          issued_by: officerName,
          issued_at: nowIso
        };

        // Award Civic Karma Points to citizen profile
        const citizenProfile = (store.profiles || []).find(p => p.id === participant.citizen_id);
        if (citizenProfile) {
          citizenProfile.civic_points = (citizenProfile.civic_points || 0) + ptsCitizen;
        }

        // Send Certificate Notification to Citizen
        await DbRepository.createNotification(
          participant.citizen_id,
          `🏅 Completion Certificate & +${ptsCitizen} Points: ${driveTitle}`,
          `Congratulations ${certificate.recipient_name}! Ward Officer ${officerName} has verified the completion of "${driveTitle}" (${locationName}) and awarded you +${ptsCitizen} Civic Karma Points along with your Official NMC Completion Certificate (${certCode}).`,
          id,
          'certificate',
          { points_awarded: ptsCitizen, certificate }
        );
      }

      // 3. Issue Completion Certificates & Award Points to ALL Participating Communities in Notifications
      const notifiedCommUsers = new Set<string>();
      for (const comm of communityTargets) {
        const certCode = `NMC-COMM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const certificate = {
          certificate_id: certCode,
          recipient_name: comm.name,
          recipient_type: 'community' as const,
          drive_id: id,
          drive_title: driveTitle,
          ward_number: officerWard,
          ward_name: wardName,
          location_name: locationName,
          completed_date: nowIso,
          communities_involved: participatingCommunityNames,
          points_awarded: ptsCommunity,
          issued_by: officerName,
          issued_at: nowIso
        };

        // Award Community Impact Points
        const commRecord = (store.communities || []).find(c => c.id === comm.id);
        if (commRecord) {
          commRecord.civic_points = (commRecord.civic_points || 0) + ptsCommunity;
        }
        const headProfile = (store.profiles || []).find(p => p.id === comm.userId);
        if (headProfile) {
          headProfile.civic_points = (headProfile.civic_points || 0) + ptsCommunity;
        }

        // Send Certificate Notification to Community Head
        const recipientKey = `${comm.userId}::${comm.id}`;
        if (!notifiedCommUsers.has(recipientKey)) {
          notifiedCommUsers.add(recipientKey);
          await DbRepository.createNotification(
            comm.userId,
            `🏆 Community Completion Certificate & +${ptsCommunity} Points: ${driveTitle}`,
            `Congratulations ${comm.name}! Ward Officer ${officerName} has officially published the completion of "${driveTitle}" and awarded your organization +${ptsCommunity} Community Impact Points along with an Official NMC Appreciation Certificate (${certCode}).`,
            id,
            'certificate',
            { points_awarded: ptsCommunity, certificate }
          );
        }
      }

      // 4. Mark drive as completion_posted = true
      if (prob) {
        prob.completion_posted = true;
        prob.completion_post_id = post?.id;
        prob.status = 'resolved';
        prob.evidence_status = 'verified_complete';
        prob.updated_at = nowIso;
      }
      if (act) {
        (act as any).completion_posted = true;
        (act as any).completion_post_id = post?.id;
        act.evidence_status = 'verified_complete' as any;
        act.event_status = 'completed' as any;
        act.updated_at = nowIso;
      }

      res.status(201).json({
        success: true,
        message: `Drive completion posted! Certificates & points sent to ${sentCitizenIds.size} citizen(s) (+${ptsCitizen} pts each) and ${communityTargets.length} community partner(s) (+${ptsCommunity} pts each).`,
        data: {
          post,
          certificates_sent_citizens: sentCitizenIds.size,
          certificates_sent_communities: communityTargets.length,
          citizen_points_awarded: ptsCitizen,
          community_points_awarded: ptsCommunity,
          participating_communities: participatingCommunityNames
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

// =========================================================================
// Real-time Dynamic Linkage Helpers between Worker & Ward Officer
// =========================================================================
export function recordAttendanceForAssignment(assignmentId: string, attendanceRecord: any): void {
  for (const [, attempts] of wardData.workAttempts.entries()) {
    const attempt = attempts.find(a => a.assignment_id === assignmentId);
    if (attempt) {
      if (!attempt.attendance_records) attempt.attendance_records = [];
      attempt.attendance_records.push(attendanceRecord);
      return;
    }
  }
}

export function recordEvidenceForAssignment(assignmentId: string, evidenceRecord: any): void {
  for (const [, attempts] of wardData.workAttempts.entries()) {
    const attempt = attempts.find(a => a.assignment_id === assignmentId);
    if (attempt) {
      if (!attempt.evidence) attempt.evidence = [];
      attempt.evidence.push(evidenceRecord);
      return;
    }
  }
}

