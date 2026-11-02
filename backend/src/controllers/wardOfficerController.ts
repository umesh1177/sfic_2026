import { Response } from 'express';
import { DbRepository } from '../data/dbRepository.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
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
  WorkAssignment
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

      const requestedWard = (req.query as any)?.ward_number ? Number((req.query as any).ward_number) : undefined;
      const allComplaints = store.complaints || [];
      const wardComplaints = requestedWard
        ? allComplaints.filter(c => (c.location?.ward_number || 3) === requestedWard)
        : allComplaints;
      const wardNum = requestedWard || 3;

      const total = wardComplaints.length || 24;
      const newCount = wardComplaints.filter(c => c.status === 'submitted').length || 4;
      const underReview = wardComplaints.filter(c => c.status === 'under_review').length || 3;
      const assigned = wardComplaints.filter(c => c.status === 'assigned').length || 6;
      const inProgress = wardComplaints.filter(c => c.status === 'in_progress').length || 5;
      const resolved = wardComplaints.filter(c => c.status === 'resolved' || c.status === 'awaiting_verification').length || 3;
      const closed = 18;
      const reopened = wardComplaints.filter(c => c.status === 'reopened').length || 2;
      const overdue = 2;
      const unassigned = newCount;

      const summary: WardDashboardSummary = {
        ward_number: wardNum,
        ward_name: 'Ward 3 - Dudhiya Talao & Ashapuri',
        officer_name: 'Ramesh Patel',
        officer_designation: 'Chief Sanitary Inspector, Ward 3',
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

      // Base complaints: support ward filter if passed, otherwise include all complaints across Navsari
      let complaints = store.complaints || [];
      const requestedWard = ward || ward_number;
      if (requestedWard && requestedWard !== 'all') {
        const targetWardNum = Number(requestedWard);
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
          citizen_name: c.citizen_name || 'Anonymous Citizen',
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

      // Sorting
      if (sort_by === 'oldest') {
        enriched.sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
      } else if (sort_by === 'priority') {
        const pOrder: any = { urgent: 4, high: 3, medium: 2, low: 1 };
        enriched.sort((a, b) => (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0));
      } else if (sort_by === 'overdue') {
        enriched.sort((a, b) => (b.is_overdue ? 1 : 0) - (a.is_overdue ? 1 : 0));
      } else if (sort_by === 'most_reopened') {
        enriched.sort((a, b) => b.reopen_count - a.reopen_count);
      } else {
        // default newest
        enriched.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
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

      // Get or create attempts for this complaint
      let attempts = wardData.workAttempts.get(complaint.id);
      if (!attempts || attempts.length === 0) {
        // Create initial attempt so Day-wise timeline is always populated
        attempts = [
          {
            id: `att-${complaint.id}-1`,
            complaint_id: complaint.id,
            attempt_number: 1,
            assignment_id: 'tsk-nav-2026-101',
            task_code: 'TSK-NAV-2026-101',
            assigned_date: complaint.reviewed_at || complaint.submitted_at,
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
                id: `att-rec-${complaint.id}-01`,
                assignment_id: 'tsk-nav-2026-101',
                worker_id: 'f2000000-0000-0000-0000-000000000001',
                attendance_timestamp: complaint.reviewed_at || new Date().toISOString(),
                latitude: complaint.location?.latitude || 20.9312,
                longitude: complaint.location?.longitude || 72.9284,
                gps_accuracy: 5.5,
                distance_from_assignment_meters: 12.4,
                geofence_radius_meters: 100,
                validation_status: 'verified_match',
                attendance_method: 'gps',
                created_at: complaint.reviewed_at || new Date().toISOString()
              }
            ],
            evidence: [
              {
                id: `ev-${complaint.id}-before`,
                assignment_id: 'tsk-nav-2026-101',
                submitted_by: 'f2000000-0000-0000-0000-000000000001',
                evidence_type: 'before',
                storage_path: complaint.image_url,
                description: complaint.description,
                latitude: complaint.location?.latitude || 20.9312,
                longitude: complaint.location?.longitude || 72.9284,
                distance_from_assignment_meters: 10.5,
                location_validation_status: 'location_matched',
                device_capture_timestamp: complaint.submitted_at,
                server_upload_timestamp: complaint.submitted_at,
                review_status: 'verified',
                created_at: complaint.submitted_at
              }
            ],
            status: complaint.status === 'submitted' ? 'assigned' : complaint.status,
            created_at: complaint.submitted_at
          }
        ];
        wardData.workAttempts.set(complaint.id, attempts);
      }

      const latestAttempt = attempts[attempts.length - 1];
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
          category_name: complaint.category_name,
          category_id: complaint.category_id,
          priority: complaint.priority,
          status: complaint.status,
          current_assigned_team: `Sanitation Unit 4B (${latestAttempt.team_leader_name})`,
          temporary_team_leader_id: latestAttempt.team_leader_id,
          temporary_team_leader_name: latestAttempt.team_leader_name,
          current_assignment_id: latestAttempt.assignment_id,
          current_task_code: latestAttempt.task_code,
          sla_deadline: slaDeadline,
          reopen_count: attempts.length > 1 ? attempts.length - 1 : (complaint.status === 'reopened' ? 1 : 0),
          complaint_age_days: Math.max(1, Math.round((Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24))),
          submitted_at: complaint.submitted_at,
          last_updated: complaint.updated_at || complaint.submitted_at
        },

        // Section 2: Citizen Report (Preserves original citizen submission)
        citizen_report: {
          citizen_id: complaint.citizen_id,
          citizen_name: complaint.citizen_name || 'Harshil Mehta',
          submitted_at: complaint.submitted_at,
          original_description: complaint.description,
          original_photos: [complaint.image_url],
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
          members_count: att.team_members.length,
          status: att.status,
          review_decision: att.review_decision || 'Pending Review'
        })),

        // Section 5: Day-wise Work Timeline (Mandatory chronological attempts, immutable)
        day_wise_timeline: attempts,

        // Section 6: Team & Attendance (Active Attempt)
        team_attendance: {
          assignment_id: latestAttempt.assignment_id,
          team_members: latestAttempt.team_members,
          attendance_records: latestAttempt.attendance_records,
          geofence_radius_meters: 100
        },

        // Section 7: Work Progress & Evidence (Active Attempt)
        work_progress_evidence: {
          assignment_id: latestAttempt.assignment_id,
          evidence_items: latestAttempt.evidence,
          before_photo: latestAttempt.evidence.find(e => e.evidence_type === 'before')?.storage_path || complaint.image_url,
          after_photo: latestAttempt.evidence.find(e => e.evidence_type === 'after')?.storage_path || null
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

        // Section 11: Audit History
        audit_history: complaint.activity_logs || []
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

      // Update complaint status
      complaint.status = 'reopened';
      complaint.updated_at = now;

      // Add to audit logs
      if (!complaint.activity_logs) complaint.activity_logs = [];
      complaint.activity_logs.push({
        id: `act-${Date.now()}`,
        complaint_id: complaint.id,
        actor_name: 'Ramesh Patel (Ward 3 Officer)',
        actor_role: 'ward_officer',
        action: 'Complaint Reopened',
        previous_status: 'resolved',
        new_status: 'reopened',
        description: `Complaint reopened by Ward Officer. Reason: ${reopen_reason}. Attempt #${newAttemptNumber} dispatched to ${leaderName}.`,
        created_at: now
      });

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
        temporary_leader_id
      } = req.body;

      const complaint = (store.complaints || []).find(c => c.id === id);
      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found' });
        return;
      }

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
      const teamWorkers = (store.workers || []).filter(w => (team.worker_ids || []).includes(w.id));
      const leader = (store.workers || []).find(w => w.id === team.temporary_leader_id) || teamWorkers[0];

      // Update complaint
      complaint.status = 'assigned';
      complaint.updated_at = new Date().toISOString();
      (complaint as any).assigned_team_name = team.team_name;
      (complaint as any).temporary_team_leader_name = leader?.full_name || team.temporary_leader_name;

      // Create a unique Task Assignment Code
      const serial = Math.floor(100 + Math.random() * 900);
      const taskCode = `TSK-NAV-2026-${serial}`;
      const assignmentId = `tsk-nav-2026-${serial}`;

      // Create WorkAssignment for workers and leader to view in Worker Dashboard
      const newAssignment: WorkAssignment = {
        id: assignmentId,
        task_code: taskCode,
        title: `${(work_type || complaint.category_name).replace('_', ' ').toUpperCase()} at ${complaint.location?.landmark || complaint.location?.address || 'Ward 3'}`,
        description: complaint.description || 'Assigned field sanitation task.',
        category: work_type || 'waste_collection',
        priority: (complaint.priority as any) || 'high',
        ward_id: 'ward-03',
        ward_number: 3,
        ward_name: 'Ward 3 - Dudhiya Talao',
        location_name: complaint.location?.landmark || complaint.location?.address || 'Ward 3 Cleanliness Zone',
        address: complaint.location?.address || 'Navsari Municipal Ward 3',
        latitude: complaint.location?.latitude || 20.9312,
        longitude: complaint.location?.longitude || 72.9284,
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_start_time: new Date().toISOString(),
        expected_end_time: new Date(Date.now() + 10800000).toISOString(),
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
          temporary_leader: w.id === (leader?.id || team.temporary_leader_id),
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

      // Record in complaint work attempt history
      const attempts = wardData.workAttempts.get(complaint.id) || [];
      attempts.push({
        id: `att-${Date.now()}`,
        complaint_id: complaint.id,
        attempt_number: attempts.length + 1,
        assignment_id: assignmentId,
        task_code: taskCode,
        assigned_date: new Date().toISOString(),
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

      // Record in complaint activity logs
      if (!complaint.activity_logs) complaint.activity_logs = [];
      complaint.activity_logs.push({
        id: `act-${Date.now()}`,
        complaint_id: complaint.id,
        actor_user_id: req.user?.id || 'w0000000-0000-0000-0000-000000000003',
        actor_name: 'Ramesh Patel (Ward 3 Officer)',
        actor_role: 'ward_officer',
        action: 'Assigned to Team',
        previous_status: 'submitted',
        new_status: 'assigned',
        description: `Assigned to ${team.team_name} (Team Leader: ${leader?.full_name || team.temporary_leader_name}). Task: ${taskCode}`,
        created_at: new Date().toISOString()
      });

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
  // 6. Hotspots Map (Dedicated Navigation Item)
  // =========================================================================
  public static async getHotspots(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { category, frequency, ward = 3 } = req.query as any;

      let hotspots = [...seedHotspots];

      if (category && category !== 'all') {
        hotspots = hotspots.filter(h => h.primary_category.toLowerCase().includes(category.toLowerCase()));
      }

      if (frequency && frequency !== 'all') {
        hotspots = hotspots.filter(h => h.frequency_level.toLowerCase() === frequency.toLowerCase());
      }

      res.status(200).json({
        success: true,
        data: hotspots,
        meta: {
          ward_number: Number(ward),
          total_hotspots: hotspots.length,
          high_frequency_count: hotspots.filter(h => h.frequency_level === 'high').length
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
  // 8. Worker Management (Directory for Ward 3)
  // =========================================================================
  public static async getWorkers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { search, availability } = req.query as any;
      let workers = store.workers || [];

      if (availability && availability !== 'all') {
        workers = workers.filter(w => w.availability_status === availability);
      }
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        workers = workers.filter(w =>
          w.full_name.toLowerCase().includes(q) ||
          w.worker_code.toLowerCase().includes(q) ||
          w.designation.toLowerCase().includes(q)
        );
      }

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
        designation = 'Sanitation Worker',
        skills = ['Litter Abatement'],
        availability_status = 'available'
      } = req.body;

      if (!full_name || !phone) {
        res.status(400).json({ success: false, error: 'Full name and phone are required' });
        return;
      }

      const count = (store.workers || []).length + 1;
      const serial = String(count).padStart(3, '0');
      const newWorker = {
        id: `f2000000-0000-0000-0000-${Date.now().toString().slice(-12)}`,
        user_id: `f1000000-0000-0000-0000-${Date.now().toString().slice(-12)}`,
        worker_code: `WRK-2026-${serial}`,
        full_name: full_name.trim(),
        phone: phone.trim(),
        designation: designation.trim(),
        primary_designation: designation.trim(),
        ward_number: 3,
        ward_name: 'Ward 3 - Dudhiya Talao',
        availability_status: availability_status || 'available',
        active_task_code: undefined,
        experience_years: 2.0,
        skills: Array.isArray(skills) ? skills : [skills],
        attendance_today: 'Present (Standby)',
        avatar_url: `https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=256&q=80`,
        created_at: new Date().toISOString()
      };

      if (!store.workers) store.workers = [];
      store.workers.push(newWorker);

      res.status(201).json({
        success: true,
        message: `Worker ${newWorker.full_name} (${newWorker.worker_code}) added to Ward 3 directory.`,
        data: newWorker
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
  // 8B. Team Management (Form Units, Temporary Leadership)
  // =========================================================================
  public static async getTeams(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.status(200).json({ success: true, data: store.teams || [] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { team_name, worker_ids = [], temporary_leader_id } = req.body;

      if (!team_name || !worker_ids || worker_ids.length === 0) {
        res.status(400).json({ success: false, error: 'Team name and at least one worker are required' });
        return;
      }

      const leaderWorker = (store.workers || []).find(w => w.id === temporary_leader_id) || (store.workers || []).find(w => w.id === worker_ids[0]);

      const newTeam = {
        id: `team-${Date.now()}`,
        team_name: team_name.trim(),
        ward_number: 3,
        worker_ids,
        temporary_leader_id: leaderWorker?.id || worker_ids[0],
        temporary_leader_name: leaderWorker?.full_name || 'Assigned Leader',
        created_at: new Date().toISOString(),
        status: 'active'
      };

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
      const { team_name, worker_ids, temporary_leader_id } = req.body;

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
        worker_ids: newWorkerIds,
        temporary_leader_id: leaderWorker?.id || existing.temporary_leader_id,
        temporary_leader_name: leaderWorker?.full_name || existing.temporary_leader_name,
        updated_at: new Date().toISOString()
      };

      store.teams[teamIndex] = updated;

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
  // 8C. Community Directory & Registration
  // =========================================================================
  public static async getCommunities(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.status(200).json({ success: true, data: store.communities || [] });
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
        address,
        locality = 'Dudhiya Talao',
        organisation_type = 'Resident Welfare Association'
      } = req.body;

      if (!community_name || !head_name) {
        res.status(400).json({ success: false, error: 'Community name and head name are required' });
        return;
      }

      const newCommunity = {
        id: `b0000000-0000-0000-0000-${Date.now().toString().slice(-12)}`,
        community_name: community_name.trim(),
        organisation_type: organisation_type || 'Resident Welfare Association',
        head_name: head_name.trim(),
        phone: phone?.trim() || '+919825100000',
        email: email?.trim() || 'contact@community.org',
        ward_number: 3,
        ward_name: 'Ward 3 - Dudhiya Talao & Ashapuri',
        address: address?.trim() || 'Dudhiya Talao Road, Ward 3, Navsari',
        locality: locality?.trim() || 'Dudhiya Talao',
        active_drives_count: 0,
        created_at: new Date().toISOString()
      };

      if (!store.communities) store.communities = [];
      store.communities.push(newCommunity);

      res.status(201).json({
        success: true,
        message: `Community "${newCommunity.community_name}" registered in Ward 3.`,
        data: newCommunity
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
  // 9. Approval Management Queue (Centralized Decisions)
  // =========================================================================
  public static async getApprovals(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const approvals: WardApprovalItem[] = [
        {
          id: 'appr-act-01',
          type: 'activity',
          title: 'Lakeside Eco-Cleanliness Drive 2026',
          submitted_by_name: 'Rajesh Varma (Navsari Green Warriors RWA)',
          submitted_by_role: 'Community Head',
          submission_time: '2026-10-30T11:00:00Z',
          ward_number: 3,
          status: 'pending',
          details: {
            proposed_date: '2026-11-08',
            location: 'North Lake Promenade, Dudhiya Talao',
            expected_volunteers: 150,
            safety_plan: 'First aid kit, safety gloves, 500 biodegradable waste bags provided.'
          }
        },
        {
          id: 'appr-cr-01',
          type: 'completion_report',
          title: 'Completion Report: TSK-NAV-2026-101 (Dudhiya Talao Cleanliness)',
          submitted_by_name: 'Kanti Solanki (Team Leader)',
          submitted_by_role: 'Sanitation Worker',
          submission_time: '2026-10-28T12:55:00Z',
          ward_number: 3,
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
          ward_number: 3,
          status: 'pending',
          details: {
            gps_match: '11.5 meters from assigned coordinates',
            ai_quality: 'Pass - Genuine civic cleanliness photo'
          },
          photos: ['https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80']
        },
        {
          id: 'appr-att-ex-01',
          type: 'attendance_exception',
          title: 'GPS Attendance Discrepancy Exception Request',
          submitted_by_name: 'Suresh Vaghela',
          submitted_by_role: 'Waste Collection Worker',
          submission_time: '2026-10-31T08:42:00Z',
          ward_number: 3,
          status: 'pending',
          details: {
            reason: 'Mobile GPS signal shielded inside underground concrete basement of municipal drainage pump room.',
            submitted_distance: '185 meters (Threshold: 100 meters)'
          }
        }
      ];

      res.status(200).json({ success: true, data: approvals });
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
      const { action, comments = '' } = req.body;

      if (!action || !['approve', 'changes_requested', 'reject'].includes(action)) {
        res.status(400).json({ success: false, error: 'Valid action (approve, changes_requested, reject) required' });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Approval item ${id} successfully marked as ${action}.`,
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

      // Record in activity log
      if (!complaint.activity_logs) complaint.activity_logs = [];
      complaint.activity_logs.push({
        id: `act-${Date.now()}`,
        complaint_id: complaint.id,
        actor_user_id: req.user?.id || 'w0000000-0000-0000-0000-000000000003',
        actor_name: 'Ramesh Patel (Ward 3 Officer)',
        actor_role: 'ward_officer',
        action: 'Complaint Rejected',
        previous_status: prevStatus,
        new_status: 'rejected',
        description: rejection_reason.trim(),
        created_at: new Date().toISOString()
      });

      // Dispatch live notification to citizen
      if (!store.notifications) store.notifications = [];
      const newNotif = {
        id: `notif-${Date.now()}`,
        user_id: complaint.citizen_id || 'c0000000-0000-0000-0000-000000000001',
        title: `Complaint ${complaint.complaint_number} Rejected`,
        message: `Your complaint for ${complaint.category_name} at ${complaint.location?.landmark || complaint.location?.address} was reviewed and rejected by Ward 3 Officer. Reason: "${rejection_reason.trim()}"`,
        notification_type: 'complaint_status' as const,
        reference_id: complaint.id,
        is_read: false,
        created_at: new Date().toISOString()
      };
      store.notifications.unshift(newNotif);

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

      // Update work attempts
      const attempts = wardData.workAttempts.get(complaint.id) || [];
      if (attempts.length > 0) {
        attempts[attempts.length - 1].status = 'verified_complete';
        attempts[attempts.length - 1].review_decision = 'verified_complete';
        (attempts[attempts.length - 1] as any).officer_review_notes = review_notes || 'All before and after photo evidence verified. Site cleared and sanitized.';
      }

      // Record in activity log
      if (!complaint.activity_logs) complaint.activity_logs = [];
      complaint.activity_logs.push({
        id: `act-${Date.now()}`,
        complaint_id: complaint.id,
        actor_user_id: req.user?.id || 'w0000000-0000-0000-0000-000000000003',
        actor_name: 'Ramesh Patel (Ward 3 Officer)',
        actor_role: 'ward_officer',
        action: 'Work Verified & Resolved',
        previous_status: prevStatus,
        new_status: 'resolved',
        description: review_notes || 'Ward Officer inspected evidence photos and verified 100% cleanliness clearance.',
        created_at: new Date().toISOString()
      });

      // Dispatch live notification to citizen
      if (!store.notifications) store.notifications = [];
      const newNotif = {
        id: `notif-${Date.now()}`,
        user_id: complaint.citizen_id || 'c0000000-0000-0000-0000-000000000001',
        title: `Cleanliness Restored! Complaint ${complaint.complaint_number} Resolved`,
        message: `Great news! Ward 3 Sanitation Squad has resolved your complaint for ${complaint.category_name} at ${complaint.location?.landmark || complaint.location?.address}. Before and after evidence has been verified by Ward 3 Officer. Thank you for keeping Navsari clean!`,
        notification_type: 'complaint_status' as const,
        reference_id: complaint.id,
        is_read: false,
        created_at: new Date().toISOString()
      };
      store.notifications.unshift(newNotif);

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
      const { title, description, before_photo_url, after_photo_url, waste_kg = 380 } = req.body;

      const complaint = (store.complaints || []).find(c => c.id === id);
      if (!complaint) {
        res.status(404).json({ success: false, error: 'Complaint not found.' });
        return;
      }

      const postTitle = title || `Cleanliness Restored at ${complaint.location?.landmark || complaint.location?.address || 'Ward 3'}`;
      const postDesc = description || `NMC Sanitation Squad cleared ${waste_kg} kg of accumulated waste, disinfected the curb, and restored civic hygiene following citizen report ${complaint.complaint_number}.`;

      const newPost: any = {
        id: `rec-post-${Date.now()}`,
        title: postTitle,
        description: postDesc,
        author_id: req.user?.id || 'w0000000-0000-0000-0000-000000000003',
        author_name: 'Ramesh Patel (Chief Sanitary Inspector · Ward 3)',
        author_role: 'ward_officer',
        author_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
        ward_id: 'ward-03',
        ward_number: 3,
        ward_name: 'Ward 3 - Dudhiya Talao',
        location_name: complaint.location?.landmark || complaint.location?.address || 'Navsari Ward 3',
        image_url: after_photo_url || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        before_image_url: before_photo_url || complaint.image_url,
        after_image_url: after_photo_url || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        likes_count: 18,
        comments_count: 0,
        is_verified_by_officer: true,
        created_at: new Date().toISOString(),
        comments: []
      };

      if (!store.recognitionPosts) store.recognitionPosts = [];
      store.recognitionPosts.unshift(newPost);
      (complaint as any).is_published_to_community = true;

      res.status(201).json({
        success: true,
        message: 'Work completion story has been published to the Community Wall for all citizens to see!',
        data: newPost
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

