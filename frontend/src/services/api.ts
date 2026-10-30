import {
  Profile,
  Complaint,
  ComplaintCategory,
  CleanlinessDrive,
  Challenge,
  RewardDefinition,
  AppNotification,
  SupportTicket
} from '../types/index.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('clean_navsari_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = { ...this.getHeaders(), ...(options.headers || {}) };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error occurred');
      }

      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Network offline or backend service unreachable.');
      }
      throw err;
    }
  }

  // --- AUTHENTICATION APIS ---

  async signupSendOtp(mobileNumber: string, consentTerms: boolean) {
    return this.request<{ success: boolean; message: string; data: { session_id: string; mobile_masked: string; expires_in_seconds: number; _dev_otp_code?: string } }>(
      '/auth/signup/send-otp',
      {
        method: 'POST',
        body: JSON.stringify({ mobile_number: mobileNumber, consent_terms: consentTerms })
      }
    );
  }

  async signupVerifyOtp(sessionId: string, otpCode: string) {
    return this.request<{ success: boolean; message: string; data: { verification_token: string; mobile_number: string } }>(
      '/auth/signup/verify-otp',
      {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, otp_code: otpCode })
      }
    );
  }

  async signupCompleteProfile(payload: {
    verification_token: string;
    full_name: string;
    password: string;
    confirm_password: string;
    preferred_language: string;
    email?: string;
    locality?: string;
    address?: string;
    avatar_url?: string;
  }) {
    return this.request<{ success: boolean; message: string; data: { token: string; profile: Profile; is_first_login: boolean } }>(
      '/auth/signup/complete-profile',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
  }

  async login(mobileNumber: string, password: string, captchaToken: string) {
    return this.request<{ success: boolean; message: string; data: { token: string; profile: Profile } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          mobile_number: mobileNumber,
          password,
          captcha_token: captchaToken
        })
      }
    );
  }

  async forgotPasswordSendOtp(mobileNumber: string) {
    return this.request<{ success: boolean; message: string; data: { session_id: string; mobile_masked: string; _dev_otp_code?: string } }>(
      '/auth/forgot-password/send-otp',
      {
        method: 'POST',
        body: JSON.stringify({ mobile_number: mobileNumber })
      }
    );
  }

  async forgotPasswordVerifyOtp(sessionId: string, otpCode: string) {
    return this.request<{ success: boolean; message: string; data: { reset_token: string } }>(
      '/auth/forgot-password/verify-otp',
      {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, otp_code: otpCode })
      }
    );
  }

  async forgotPasswordReset(resetToken: string, newPassword: string, confirmPassword: string) {
    return this.request<{ success: boolean; message: string }>(
      '/auth/forgot-password/reset',
      {
        method: 'POST',
        body: JSON.stringify({
          reset_token: resetToken,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      }
    );
  }

  async getMe() {
    return this.request<{ success: boolean; data: { profile: Profile } }>('/auth/me');
  }

  async logout() {
    localStorage.removeItem('clean_navsari_token');
    return this.request<{ success: boolean; message: string }>('/auth/logout', { method: 'POST' });
  }

  // --- CITIZEN & DASHBOARD APIS ---

  async getDashboard() {
    return this.request<{
      success: boolean;
      data: {
        stats: { total_submitted: number; pending: number; in_progress: number; resolved: number };
        municipal_stats: { city_total_complaints: number; city_resolved_complaints: number; city_average_resolution_hours: number; total_active_drives: number; active_volunteers: number };
        nearby_issues: any[];
        ward_scores: { ward_number: number; ward_name: string; score: number; officer: string }[];
        community_impact: { drives_joined: number; rewards_earned: number; active_challenges: number; civic_points: number };
        notifications: AppNotification[];
      };
    }>('/citizen/dashboard');
  }

  async getProfile() {
    return this.request<{ success: boolean; data: Profile }>('/citizen/profile');
  }

  async updateProfile(payload: Partial<Profile>) {
    return this.request<{ success: boolean; message: string; data: Profile }>('/citizen/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async updatePreferences(preferredLanguage: 'en' | 'gu' | 'hi') {
    return this.request<{ success: boolean; message: string; data: Profile }>('/citizen/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferred_language: preferredLanguage })
    });
  }

  // --- COMPLAINTS APIS ---

  async getCategories() {
    return this.request<{ success: boolean; data: ComplaintCategory[] }>('/complaint-categories');
  }

  async validateContent(text: string, fileSize?: number, mimeType?: string) {
    return this.request<{
      success: boolean;
      data: {
        moderation: { is_safe: boolean; status: 'SAFE' | 'UNSAFE' | 'UNCERTAIN'; reason?: string; confidence: number };
        quality?: { is_acceptable: boolean; issues: string[]; suggestions: string[] };
      };
    }>('/complaints/validate-content', {
      method: 'POST',
      body: JSON.stringify({ text, file_size: fileSize, mime_type: mimeType })
    });
  }

  async classifyImage(fileName: string, fileSize: number) {
    return this.request<{
      success: boolean;
      data: {
        predicted_category_name: string;
        confidence: number;
        alternative_predictions: { category_name: string; confidence: number }[];
        matched_category_id?: string;
        model_name: string;
        model_version: string;
        processing_time_ms: number;
      };
    }>('/complaints/classify-image', {
      method: 'POST',
      body: JSON.stringify({ file_name: fileName, file_size: fileSize })
    });
  }

  async validateLocation(latitude: number, longitude: number) {
    return this.request<{
      success: boolean;
      data: {
        is_inside_nmc: boolean;
        ward_id: string;
        ward_number: number;
        ward_name: string;
        ward_name_gu: string;
        officer_name: string;
      };
    }>('/complaints/validate-location', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude })
    });
  }

  async checkDuplicates(latitude: number, longitude: number, categoryId?: string) {
    return this.request<{
      success: boolean;
      data: {
        has_duplicates: boolean;
        duplicates: {
          id: string;
          complaint_number: string;
          category_name: string;
          description: string;
          image_url: string;
          distance_meters: number;
          status: string;
          submitted_at: string;
        }[];
      };
    }>('/complaints/check-duplicates', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, category_id: categoryId })
    });
  }

  async createComplaint(payload: any) {
    return this.request<{ success: boolean; message: string; data: { complaint: Complaint } }>(
      '/complaints',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
  }

  async getMyComplaints(params: { status?: string; category_id?: string; search?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.category_id) query.append('category_id', params.category_id);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    return this.request<{
      success: boolean;
      data: Complaint[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/complaints/my?${query.toString()}`);
  }

  async getComplaintById(id: string) {
    return this.request<{ success: boolean; data: Complaint }>(`/complaints/${id}`);
  }

  async submitFeedback(complaintId: string, rating: number, feedbackText: string, satisfactory: boolean) {
    return this.request<{ success: boolean; message: string; data: any }>(
      `/complaints/${complaintId}/feedback`,
      {
        method: 'POST',
        body: JSON.stringify({ rating, feedback_text: feedbackText, resolution_satisfactory: satisfactory })
      }
    );
  }

  async reopenComplaint(complaintId: string, reason: string) {
    return this.request<{ success: boolean; message: string; data: Complaint }>(
      `/complaints/${complaintId}/reopen`,
      {
        method: 'POST',
        body: JSON.stringify({ reason })
      }
    );
  }

  async toggleFollow(complaintId: string) {
    return this.request<{ success: boolean; data: { is_following: boolean; followers_count: number } }>(
      `/complaints/${complaintId}/follow`,
      { method: 'POST' }
    );
  }

  // --- MAP APIS ---

  async getWardsGeoJson() {
    return this.request<{ success: boolean; data: any }>('/map/wards');
  }

  async getPublicComplaints(params: { category_id?: string; status?: string; ward_number?: number } = {}) {
    const query = new URLSearchParams();
    if (params.category_id) query.append('category_id', params.category_id);
    if (params.status) query.append('status', params.status);
    if (params.ward_number) query.append('ward_number', params.ward_number.toString());

    return this.request<{ success: boolean; data: any[] }>(`/map/public-complaints?${query.toString()}`);
  }

  async getHotspots() {
    return this.request<{ success: boolean; data: any[] }>('/map/hotspots');
  }

  // --- DRIVES & COMMUNITY ---

  async getDrives() {
    return this.request<{ success: boolean; data: CleanlinessDrive[] }>('/drives');
  }

  async registerForDrive(driveId: string) {
    return this.request<{ success: boolean; message: string; data: any }>(
      `/drives/${driveId}/register`,
      { method: 'POST' }
    );
  }

  async cancelDriveRegistration(driveId: string) {
    return this.request<{ success: boolean; message: string; data: any }>(
      `/drives/${driveId}/register`,
      { method: 'DELETE' }
    );
  }

  async getChallenges() {
    return this.request<{ success: boolean; data: Challenge[] }>('/challenges');
  }

  async joinChallenge(challengeId: string) {
    return this.request<{ success: boolean; message: string; data: any }>(
      `/challenges/${challengeId}/join`,
      { method: 'POST' }
    );
  }

  async getMyRewards() {
    return this.request<{
      success: boolean;
      data: { rewards: RewardDefinition[]; total_points: number; badges_count: number };
    }>('/rewards/my');
  }

  async getLeaderboard() {
    return this.request<{ success: boolean; data: any[] }>('/rewards/leaderboard');
  }

  // --- NOTIFICATIONS & SUPPORT ---

  async getNotifications() {
    return this.request<{ success: boolean; data: AppNotification[] }>('/notifications');
  }

  async markNotificationRead(id: string) {
    return this.request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead() {
    return this.request<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' });
  }

  async getSupportTickets() {
    return this.request<{ success: boolean; data: SupportTicket[] }>('/support/tickets');
  }

  async createSupportTicket(subject: string, description: string, category: string) {
    return this.request<{ success: boolean; message: string; data: SupportTicket }>(
      '/support/tickets',
      {
        method: 'POST',
        body: JSON.stringify({ subject, description, category })
      }
    );
  }

  async replySupportTicket(ticketId: string, message: string) {
    return this.request<{ success: boolean; data: any }>(
      `/support/tickets/${ticketId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ message })
      }
    );
  }
}

export const api = new ApiService();

// Local Draft & Offline Queue Management
export interface OfflineDraft {
  id: string;
  category_id: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  image_url: string;
  created_at: string;
  synced: boolean;
}

export const DraftStore = {
  getDrafts(): OfflineDraft[] {
    const raw = localStorage.getItem('navsari_offline_drafts');
    return raw ? JSON.parse(raw) : [];
  },

  saveDraft(draft: Omit<OfflineDraft, 'id' | 'created_at' | 'synced'>): OfflineDraft {
    const drafts = this.getDrafts();
    const newDraft: OfflineDraft = {
      ...draft,
      id: `draft-${Date.now()}`,
      created_at: new Date().toISOString(),
      synced: false
    };
    drafts.push(newDraft);
    localStorage.setItem('navsari_offline_drafts', JSON.stringify(drafts));
    return newDraft;
  },

  removeDraft(id: string) {
    const drafts = this.getDrafts().filter(d => d.id !== id);
    localStorage.setItem('navsari_offline_drafts', JSON.stringify(drafts));
  }
};
