export type UserRole = 'citizen' | 'community_head' | 'ward_officer' | 'sanitation_worker' | 'worker' | 'nmc_admin' | 'super_admin';

export type ComplaintStatus =
  | 'submitted'
  | 'under_review'
  | 'assigned'
  | 'in_progress'
  | 'awaiting_verification'
  | 'resolved'
  | 'closed'
  | 'rejected'
  | 'reopened'
  | 'escalated';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  preferred_language: 'en' | 'gu' | 'hi';
  address?: string;
  locality?: string;
  ward_number?: number;
  is_active: boolean;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface CitizenAuthProfile {
  id: string;
  user_id: string;
  mobile_number: string;
  password_hash: string;
  mobile_verified: boolean;
  verification_completed_at?: string;
  account_status: 'active' | 'suspended' | 'locked';
  created_at: string;
  updated_at: string;
}

export interface OtpSession {
  id: string;
  mobile_number: string;
  otp_hash: string;
  purpose: 'signup' | 'password_reset' | 'phone_change';
  expires_at: string;
  attempts_count: number;
  max_attempts: number;
  resend_count: number;
  verified_at?: string;
  consumed_at?: string;
  created_at: string;
}

export interface Ward {
  id: string;
  ward_number: number;
  ward_name: string;
  ward_name_gu: string;
  office_address: string;
  ward_officer_name: string;
  contact_phone: string;
  cleanliness_score: number;
  boundary_coordinates: [number, number][]; // [lng, lat] polygon
  assigned_officer_ids?: string[];
  total_workers_count?: number;
  active_complaints_count?: number;
}

export interface ComplaintCategory {
  id: string;
  category_name: string;
  category_name_gu: string;
  category_name_hi?: string;
  description: string;
  icon: string;
  is_active: boolean;
  max_approval_days?: number; // SLA: Max days to approve before officer is flagged
  max_work_days?: number;     // SLA: Max days to resolve problem
  created_at?: string;
}

export interface WardOfficerRecord {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  designation: string;
  assigned_wards: number[]; // Supports allocating multiple wards to one officer
  is_active: boolean;
  cleanliness_score?: number;
  total_resolved?: number;
  flagged?: boolean;
  flagged_reasons?: string[];
  created_at: string;
}

export interface AdminBoundarySettings {
  city_name: string;
  city_boundary: [number, number][]; // Outer polygon of Navsari
  ward_boundary_overrides?: Record<string, [number, number][]>;
  last_updated: string;
}

export interface ComplaintLocation {
  id?: string;
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  ward_id: string;
  ward_number: number;
  ward_name: string;
  location_accuracy?: number;
  is_inside_nmc_boundary?: boolean;
  assigned_officer_name?: string;
}

export interface ComplaintActivityLog {
  id: string;
  complaint_id: string;
  actor_user_id?: string;
  actor_name: string;
  actor_role: string;
  action?: string;
  status?: string;
  note?: string;
  previous_status?: ComplaintStatus;
  new_status?: ComplaintStatus;
  description?: string;
  reason?: string;
  created_at: string;
}

export interface ComplaintFeedback {
  id: string;
  complaint_id: string;
  citizen_id: string;
  rating: number; // 1-5
  feedback_text?: string;
  resolution_satisfactory: boolean;
  created_at: string;
}

export interface Complaint {
  id: string;
  complaint_number: string;
  citizen_id: string;
  citizen_name: string;
  category_id: string;
  category_name: string;
  location: ComplaintLocation;
  description: string;
  original_language: 'en' | 'gu' | 'hi';
  translated_description?: string;
  status: ComplaintStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  image_url: string;
  confidence_score?: number;
  ai_model_name?: string;
  ai_model_version?: string;
  is_duplicate: boolean;
  parent_complaint_id?: string;
  submitted_at: string;
  reviewed_at?: string;
  resolved_at?: string;
  reopened_at?: string;
  activity_logs: ComplaintActivityLog[];
  feedback?: ComplaintFeedback;
  followers_count: number;
  is_following?: boolean;
  is_urgent?: boolean;
  upvotes_count?: number;
  updated_at?: string;
  resolved_image_url?: string;
}

export interface CleanlinessDrive {
  id: string;
  title: string;
  description: string;
  ward_id: string;
  ward_name: string;
  location_name: string;
  start_time: string;
  end_time: string;
  registration_deadline: string;
  organiser_name: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  banner_url: string;
  max_volunteers: number;
  registered_volunteers_count: number;
  is_registered?: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  start_date: string;
  end_date: string;
  target_value: number;
  current_value: number;
  status: 'active' | 'upcoming' | 'completed';
  banner_url: string;
  participants_count: number;
  is_joined?: boolean;
}

export interface RewardDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  is_earned?: boolean;
  awarded_at?: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: 'complaint_status' | 'drive_reminder' | 'reward_earned' | 'system_alert' | 'civic_alert';
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  citizen_id: string;
  subject: string;
  description: string;
  category: 'technical' | 'garbage_collection' | 'officer_conduct' | 'feedback';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  messages: {
    id: string;
    sender_id: string;
    sender_name: string;
    is_staff: boolean;
    message: string;
    created_at: string;
  }[];
}

export interface RecognitionComment {
  id: string;
  post_id: string;
  citizen_id?: string;
  citizen_name: string;
  citizen_role?: string;
  comment_text: string;
  created_at: string;
}

export interface CommunityRecognitionPost {
  id: string;
  author_name: string;
  author_role: string;
  author_avatar?: string;
  is_verified_nmc: boolean;
  ward_number: number;
  ward_name: string;
  hero_name: string;
  hero_role: string;
  badge_title: string;
  title: string;
  description: string;
  achievement_stats: string;
  image_url: string;
  before_image_url?: string;
  after_image_url?: string;
  after_photos?: string[];
  likes_count: number;
  comments_count: number;
  is_liked?: boolean;
  created_at: string;
  comments?: RecognitionComment[];
}

// ==============================================================================
// COMMUNITY HEAD DASHBOARD TYPES (SIH PS000089)
// ==============================================================================

export type ActivityApprovalStatus =
  | 'draft'
  | 'submitted'
  | 'ward_review'
  | 'ward_approved'
  | 'nmc_admin_review'
  | 'nmc_admin_approved'
  | 'changes_requested'
  | 'rejected';

export type ActivityRegistrationStatus =
  | 'not_open'
  | 'open'
  | 'closed'
  | 'reopened'
  | 'full'
  | 'cancelled';

export type ActivityEventStatus =
  | 'upcoming'
  | 'ongoing'
  | 'completed'
  | 'cancelled';

export type ActivityEvidenceStatus =
  | 'not_submitted'
  | 'submitted'
  | 'under_ward_review'
  | 'ward_verified'
  | 'under_nmc_review'
  | 'verified_complete'
  | 'changes_requested';

export type CitizenQuestionStatus =
  | 'new'
  | 'ai_suggestion_pending'
  | 'ai_suggestion_ready'
  | 'awaiting_community_head_review'
  | 'answered'
  | 'closed';

export interface Community {
  id: string;
  community_name: string;
  organisation_type: string;
  registration_number?: string;
  description?: string;
  logo_path?: string;
  address: string;
  locality: string;
  ward_id?: string;
  ward_number: number;
  ward_name: string;
  contact_email: string;
  contact_phone: string;
  verification_status: 'pending' | 'verified' | 'rejected' | 're_verification_required';
  verification_comments?: string;
  verified_by?: string;
  verified_at?: string;
  created_by: string;
  head_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityActivity {
  id: string;
  community_id: string;
  community_name?: string;
  title: string;
  short_description: string;
  detailed_description: string;
  activity_category: string;
  objectives: string[];
  expected_outcomes: string[];
  instructions: string;
  equipment_requirements: string[];
  safety_guidelines: string;
  faq: { q: string; a: string }[];
  cover_image_path: string;
  ward_id?: string;
  ward_number: number;
  ward_name: string;
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  proposed_start_at: string;
  proposed_end_at: string;
  registration_open_at: string;
  registration_close_at: string;
  maximum_participants: number;
  minimum_participants: number;
  waiting_list_enabled: boolean;
  registration_requires_approval: boolean;
  publication_status: 'draft' | 'published' | 'unpublished';
  approval_status: ActivityApprovalStatus;
  registration_status: ActivityRegistrationStatus;
  event_status: ActivityEventStatus;
  evidence_status: ActivityEvidenceStatus;
  registered_count?: number;
  verified_participants_count?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityRegistration {
  id: string;
  activity_id: string;
  activity_title?: string;
  citizen_id: string;
  citizen_name?: string;
  citizen_phone?: string;
  citizen_email?: string;
  registration_number: string;
  registration_status: 'registered' | 'waitlisted' | 'cancelled' | 'pending_approval';
  attendance_status: 'not_marked' | 'present' | 'absent' | 'excused';
  registered_at: string;
  cancelled_at?: string;
}

export interface ActivityAiSuggestion {
  id: string;
  question_id: string;
  suggested_answer: string;
  answer_language: string;
  answerability_status: 'high_confidence' | 'partial_info' | 'requires_manual_confirmation';
  supporting_information: string[];
  missing_information: string[];
  model_name?: string;
  generation_status: string;
  created_at: string;
}

export interface ActivityQuestionResponse {
  id: string;
  question_id: string;
  suggestion_id?: string;
  responder_id: string;
  responder_name?: string;
  response_text: string;
  ai_assisted: boolean;
  created_at: string;
}

export interface ActivityQuestionMessage {
  id: string;
  question_id: string;
  sender_id: string;
  sender_type: 'citizen' | 'community_head';
  sender_name?: string;
  message_text: string;
  message_language: string;
  created_at: string;
}

export interface ActivityQuestion {
  id: string;
  activity_id: string;
  activity_title?: string;
  community_id: string;
  citizen_id: string;
  citizen_name?: string;
  question_text: string;
  question_language: 'en' | 'gu' | 'hi';
  status: CitizenQuestionStatus;
  created_at: string;
  updated_at: string;
  ai_suggestion?: ActivityAiSuggestion;
  response?: ActivityQuestionResponse;
  messages?: ActivityQuestionMessage[];
}

export interface ActivityAnnouncement {
  id: string;
  activity_id: string;
  activity_title?: string;
  community_id: string;
  created_by: string;
  title: string;
  message: string;
  notification_category: string;
  target_audience: 'all_registered' | 'confirmed_participants' | 'waitlisted';
  scheduled_at?: string;
  published_at?: string;
  status: 'draft' | 'scheduled' | 'queued' | 'sent' | 'cancelled';
  total_recipients: number;
  created_at: string;
}

export interface ActivityEvidence {
  id: string;
  activity_id: string;
  uploaded_by: string;
  evidence_type: 'before' | 'during' | 'after';
  storage_path: string;
  caption: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  image_hash?: string;
  evidence_version: number;
  submission_status: 'draft' | 'submitted' | 'verified' | 'rejected';
  created_at: string;
}

export interface ActivityApprovalLog {
  id: string;
  activity_id: string;
  reviewer_id: string;
  reviewer_name?: string;
  reviewer_role: 'ward_officer' | 'nmc_admin';
  review_stage: string;
  decision: 'approved' | 'rejected' | 'changes_requested' | 'resubmitted';
  comments: string;
  created_at: string;
}

export interface CommunityDashboardSummary {
  community: Community;
  stats: {
    total_activities_created: number;
    activities_awaiting_approval: number;
    approved_activities: number;
    upcoming_activities: number;
    completed_activities: number;
    activities_awaiting_evidence: number;
    total_citizen_registrations: number;
    total_verified_participants: number;
    unanswered_citizen_questions: number;
  };
  metrics?: {
    total_activities: number;
    upcoming_activities: number;
    completed_activities: number;
    awaiting_evidence_activities: number;
    total_registrations: number;
    verified_participants: number;
    volunteer_attendance_rate: number;
    unanswered_citizen_questions: number;
  };
  upcoming_activities: CommunityActivity[];
  pending_actions: {
    activities_requiring_edits: CommunityActivity[];
    activities_awaiting_approval: CommunityActivity[];
    unanswered_questions: ActivityQuestion[];
    evidence_pending: CommunityActivity[];
  };
  impact: {
    verified_activities_count: number;
    verified_participants_count: number;
    total_cleanliness_hours: number;
    monthly_trend: { month: string; activities: number; volunteers: number; waste_kg: number }[];
    ward_distribution: { ward_name: string; count: number }[];
  };
}

// ==============================================================================
// WORKER DASHBOARD TYPES (My Clean Navsari - Municipal Field Operations)
// ==============================================================================

export interface WorkerDesignation {
  id: string;
  designation_code: string;
  designation_name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface WorkerSkill {
  id: string;
  skill_name: string;
  description?: string;
}

export interface WorkerProfile {
  id: string;
  user_id: string;
  worker_code: string;
  full_name: string;
  phone: string;
  email?: string;
  avatar_url?: string;
  primary_designation_id?: string;
  designation_name?: string;
  designation_code?: string;
  ward_id?: string;
  ward_number: number;
  ward_name: string;
  employment_status: 'permanent' | 'contractual' | 'daily_wage';
  joining_date: string;
  experience_years: number;
  availability_status: 'available' | 'on_duty' | 'on_leave' | 'reassigned';
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  language_preference: 'gu' | 'hi' | 'en';
  skills?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface WorkAssignmentMember {
  id: string;
  assignment_id: string;
  worker_id: string;
  worker_name: string;
  worker_code: string;
  worker_phone: string;
  designation_name: string;
  temporary_leader: boolean;
  assignment_status: 'assigned' | 'acknowledged' | 'present' | 'absent' | 'reassigned';
  attendance_timestamp?: string;
  validation_status?: string;
  distance_from_assignment_meters?: number;
}

export interface WorkAssignment {
  id: string;
  task_code: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  ward_id?: string;
  ward_number: number;
  ward_name: string;
  location_name: string;
  address: string;
  latitude: number;
  longitude: number;
  scheduled_date: string;
  scheduled_start_time: string;
  expected_end_time: string;
  attendance_radius_meters: number;
  evidence_radius_meters: number;
  work_instructions?: string;
  safety_instructions?: string;
  required_equipment: string[];
  emergency_contact_phone: string;
  status:
    | 'assigned'
    | 'acknowledged'
    | 'in_progress'
    | 'completion_submitted'
    | 'under_review'
    | 'changes_requested'
    | 'verified_complete'
    | 'closed'
    | 'cancelled';
  created_by?: string;
  created_at: string;
  updated_at: string;
  deadline?: string;
  target_completion_date?: string;
  // Dynamic worker context fields
  is_temporary_leader?: boolean;
  temporary_leader_name?: string;
  temporary_leader_id?: string;
  team_members?: WorkAssignmentMember[];
  my_attendance_status?: string;
  has_before_evidence?: boolean;
  has_after_evidence?: boolean;
}

export interface WorkerAttendance {
  id: string;
  assignment_id: string;
  worker_id: string;
  attendance_timestamp: string;
  latitude: number;
  longitude: number;
  gps_accuracy: number;
  distance_from_assignment_meters: number;
  geofence_radius_meters: number;
  validation_status: 'verified_match' | 'location_mismatch' | 'poor_accuracy' | 'exception_approved' | 'exception_rejected';
  validation_reason?: string;
  attendance_method: 'gps' | 'manual_exception';
  approved_by?: string;
  created_at: string;
}

export interface AttendanceException {
  id: string;
  attendance_id?: string;
  assignment_id: string;
  assignment_title?: string;
  worker_id: string;
  worker_name?: string;
  reason: string;
  supporting_evidence?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  reviewer_comments?: string;
  created_at: string;
}

export interface WorkProgressUpdate {
  id: string;
  assignment_id: string;
  submitted_by: string;
  worker_name?: string;
  progress_description: string;
  progress_stage: string;
  image_url?: string;
  created_at: string;
}

export interface WorkEvidence {
  id: string;
  assignment_id: string;
  submitted_by: string;
  worker_name?: string;
  evidence_type: 'before' | 'during' | 'after';
  storage_path: string;
  description: string;
  latitude?: number;
  longitude?: number;
  gps_accuracy?: number;
  distance_from_assignment_meters?: number;
  location_validation_status: 'location_matched' | 'location_mismatch' | 'accuracy_insufficient' | 'manual_upload';
  device_capture_timestamp: string;
  server_upload_timestamp: string;
  file_hash?: string;
  ai_analysis_status?: string;
  ai_analysis_result?: any;
  review_status: 'submitted' | 'verified' | 'changes_requested' | 'rejected';
  review_comments?: string;
  created_at: string;
}

export interface WorkCompletionReport {
  id: string;
  assignment_id: string;
  assignment_title?: string;
  submitted_by: string;
  submitted_by_name?: string;
  completion_description: string;
  actual_start_time: string;
  actual_end_time: string;
  waste_quantity?: string;
  waste_disposal_destination?: string;
  equipment_used: string[];
  issues_encountered?: string;
  pending_work?: string;
  status: 'submitted' | 'under_review' | 'verified_complete' | 'changes_requested' | 'rejected';
  reviewed_by?: string;
  reviewer_name?: string;
  review_comments?: string;
  submitted_at: string;
  created_at?: string;
}

export interface WorkReviewLog {
  id: string;
  assignment_id: string;
  report_id?: string;
  reviewer_id: string;
  reviewer_name?: string;
  reviewer_role: 'ward_officer' | 'nmc_admin';
  action: 'verified_complete' | 'changes_requested' | 'rejected' | 'evidence_verified';
  comments: string;
  created_at: string;
}

export interface WorkerDashboardSummary {
  worker: WorkerProfile;
  metrics: {
    today_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    in_progress_tasks: number;
    attendance_status: string;
    is_temporary_leader_today: boolean;
    on_time_attendance_rate: number;
    verified_evidence_rate: number;
  };
  today_assignments: WorkAssignment[];
  upcoming_assignments: WorkAssignment[];
  recent_attendance: WorkerAttendance[];
  timeline_events: {
    id: string;
    timestamp: string;
    title: string;
    description: string;
    stage: string;
    status: string;
  }[];
}

// ==============================================================================
// WARD OFFICER DASHBOARD TYPES (Navsari Municipal Corporation - Ward 3)
// ==============================================================================

export interface WardDashboardSummary {
  ward_number: number;
  ward_name: string;
  officer_name: string;
  officer_designation: string;
  metrics: {
    total_complaints: number;
    new_complaints: number;
    under_review: number;
    assigned_complaints: number;
    in_progress: number;
    resolved_awaiting_verification: number;
    closed_complaints: number;
    reopened_complaints: number;
    overdue_complaints: number;
    unassigned_complaints: number;
    active_work_assignments: number;
    available_workers: number;
    workers_on_duty: number;
    pending_evidence_reviews: number;
  };
  analytics: {
    today_received: number;
    week_received: number;
    month_received: number;
    resolved_count: number;
    reopened_count: number;
    avg_resolution_hours: number;
    overdue_count: number;
    repeated_locations_count: number;
  };
  today_field_operations: {
    active_tasks: number;
    teams_working: number;
    workers_present: number;
    workers_absent: number;
    tasks_awaiting_completion: number;
    tasks_awaiting_evidence_review: number;
    delayed_tasks: number;
  };
  recent_activity: {
    id: string;
    timestamp: string;
    type: string;
    title: string;
    description: string;
    actor_name: string;
    actor_role: string;
    complaint_id?: string;
    assignment_id?: string;
  }[];
}

export interface ComplaintWorkAttempt {
  deadline?: string;
  id: string;
  complaint_id: string;
  attempt_number: number;
  assignment_id: string;
  task_code: string;
  assigned_date: string;
  team_leader_id: string;
  team_leader_name: string;
  team_members: {
    worker_id: string;
    worker_code: string;
    name: string;
    designation: string;
    is_temporary_leader: boolean;
  }[];
  attendance_records: WorkerAttendance[];
  evidence: WorkEvidence[];
  completion_report?: WorkCompletionReport;
  status: string;
  review_decision?: 'verified_complete' | 'changes_requested' | 'rejected';
  review_comments?: string;
  reopen_reason?: string;
  reopened_by?: string;
  reopened_at?: string;
  created_at: string;
}

export interface WardHotspot {
  id: string;
  hotspot_code: string;
  title: string;
  locality: string;
  address: string;
  ward_number: number;
  latitude: number;
  longitude: number;
  total_complaints: number;
  active_complaints: number;
  resolved_complaints: number;
  reopened_count: number;
  primary_category: string;
  first_reported_date: string;
  latest_reported_date: string;
  avg_resolution_days: number;
  frequency_level: 'low' | 'medium' | 'high';
  linked_complaint_ids: string[];
  ai_summary?: string;
}

export interface WardCleanlinessScore {
  current_score: number;
  previous_score: number;
  monthly_trend: { month: string; score: number }[];
  components: {
    physical_cleanliness: number;
    hotspot_improvement: number;
    verified_resolution: number;
    community_participation: number;
  };
  formula_breakdown: string;
  inspection_coverage_pct: number;
  active_hotspots_count: number;
  last_updated: string;
}

export interface WardApprovalItem {
  id: string;
  type: 'activity' | 'evidence' | 'completion_report' | 'evidence_review' | 'attendance_exception';
  title: string;
  submitted_by_name: string;
  submitted_by_role: string;
  submission_time: string;
  ward_number: number;
  status: 'pending' | 'approved' | 'changes_requested' | 'rejected';
  details: any;
  photos?: string[];
  comments?: string;
}


export interface CommunityProblem {
  id: string;
  ward_number: number;
  ward_name: string;
  title: string;
  description: string;
  location_name: string;
  address: string;
  latitude: number;
  longitude: number;
  action_plan: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimated_volunteers_needed: number;
  suggested_equipment: string[];
  image_url?: string;
  status: 'open' | 'claimed' | 'in_progress' | 'resolved';
  claimed_by_community_id?: string;
  claimed_by_community_name?: string;
  linked_activity_id?: string;
  created_by?: string;
  officer_name?: string;
  created_at: string;
  updated_at: string;
}


export interface CommunityProblem {
  id: string;
  ward_number: number;
  ward_name: string;
  title: string;
  description: string;
  location_name: string;
  address: string;
  latitude: number;
  longitude: number;
  action_plan: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimated_volunteers_needed: number;
  suggested_equipment: string[];
  image_url?: string;
  status: 'open' | 'claimed' | 'in_progress' | 'resolved';
  claimed_by_community_id?: string;
  claimed_by_community_name?: string;
  linked_activity_id?: string;
  created_by?: string;
  officer_name?: string;
  created_at: string;
  updated_at: string;
}
