export type UserRole = 'citizen' | 'ward_officer' | 'sanitation_worker' | 'super_admin';

export type ComplaintStatus =
  | 'submitted'
  | 'under_review'
  | 'assigned'
  | 'in_progress'
  | 'awaiting_verification'
  | 'resolved'
  | 'rejected'
  | 'reopened'
  | 'escalated';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  avatar_url?: string;
  preferred_language: 'en' | 'gu' | 'hi';
  address?: string;
  locality?: string;
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
}

export interface ComplaintCategory {
  id: string;
  category_name: string;
  category_name_gu: string;
  category_name_hi: string;
  description: string;
  icon: string;
  is_active: boolean;
}

export interface ComplaintLocation {
  id: string;
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  ward_id: string;
  ward_number: number;
  ward_name: string;
  location_accuracy?: number;
  is_inside_nmc_boundary: boolean;
}

export interface ComplaintActivityLog {
  id: string;
  complaint_id: string;
  actor_user_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  previous_status?: ComplaintStatus;
  new_status?: ComplaintStatus;
  description: string;
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
  notification_type: 'complaint_status' | 'drive_reminder' | 'reward_earned' | 'system_alert';
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
