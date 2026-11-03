import {
  Profile,
  Complaint,
  ComplaintCategory,
  CleanlinessDrive,
  Challenge,
  RewardDefinition,
  AppNotification,
  SupportTicket,
  CommunityRecognitionPost,
  RecognitionComment,
  Community,
  CommunityActivity,
  ActivityRegistration,
  ActivityAiSuggestion,
  ActivityQuestion,
  ActivityAnnouncement,
  ActivityEvidence,
  ActivityApprovalLog,
  CommunityDashboardSummary,
  WorkerProfile,
  WorkerDesignation,
  WorkAssignment,
  WorkAssignmentMember,
  WorkerAttendance,
  CommunityProblem,
  AttendanceException,
  WorkProgressUpdate,
  WorkEvidence,
  WorkCompletionReport,
  WorkerDashboardSummary,
  WardDashboardSummary,
  WardHotspot,
  WardCleanlinessScore,
  WardApprovalItem
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

  async validateContent(text: string, fileSize?: number, mimeType?: string, imageBase64?: string) {
    return this.request<{
      success: boolean;
      data: {
        moderation: { is_safe: boolean; status: 'SAFE' | 'UNSAFE' | 'UNCERTAIN'; reason?: string; confidence: number };
        quality?: { is_acceptable: boolean; issues: string[]; suggestions: string[] };
      };
    }>('/complaints/validate-content', {
      method: 'POST',
      body: JSON.stringify({ text, file_size: fileSize, mime_type: mimeType, image_base64: imageBase64 })
    });
  }

  async classifyImage(fileName: string, fileSize: number, description?: string, imageBase64?: string) {
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
      body: JSON.stringify({ file_name: fileName, file_size: fileSize, description, image_base64: imageBase64 })
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

  async deleteComplaint(complaintId: string) {
    return this.request<{ success: boolean; message: string }>(
      `/complaints/${complaintId}`,
      { method: 'DELETE' }
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

  async markCitizenDriveAttendance(driveId: string, latitude?: number, longitude?: number) {
    return this.request<{ success: boolean; message: string; data: any }>(
      `/drives/${driveId}/attendance`,
      {
        method: 'POST',
        body: JSON.stringify({ latitude, longitude })
      }
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

  // --- COMMUNITY RECOGNITION WALL (LINKEDIN-STYLE POSTS) ---

  async getRecognitionPosts() {
    return this.request<{ success: boolean; data: CommunityRecognitionPost[] }>('/community/recognition-posts');
  }

  async togglePostLike(id: string) {
    return this.request<{ success: boolean; data: { is_liked: boolean; likes_count: number } }>(
      `/community/recognition-posts/${id}/like`,
      { method: 'POST' }
    );
  }

  async addPostComment(id: string, commentText: string) {
    return this.request<{ success: boolean; data: RecognitionComment }>(
      `/community/recognition-posts/${id}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ comment_text: commentText })
      }
    );
  }

  async createRecognitionPost(payload: {
    hero_name: string;
    hero_role?: string;
    badge_title?: string;
    title: string;
    description: string;
    ward_number?: number;
    ward_name?: string;
    achievement_stats?: string;
    image_url?: string;
    before_image_url?: string;
    after_image_url?: string;
    after_photos?: string[];
  }) {
    return this.request<{ success: boolean; data: CommunityRecognitionPost }>(
      '/community/recognition-posts',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
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

  // =========================================================================
  // COMMUNITY HEAD DASHBOARD APIS (SIH PS000089)
  // =========================================================================

  async getCommunityDashboardSummary() {
    return this.request<{ success: boolean; data: CommunityDashboardSummary }>('/community/dashboard/summary');
  }

  async getMyCommunity() {
    return this.request<{ success: boolean; data: Community }>('/community/my');
  }

  async updateCommunity(id: string, data: Partial<Community>) {
    return this.request<{ success: boolean; data: Community }>(`/community/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Activities
  async getCommunityActivities(params?: { status?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; data: CommunityActivity[] }>(`/community/activities${qs}`);
  }

  async getCommunityActivity(id: string) {
    return this.request<{ success: boolean; data: CommunityActivity }>(`/community/activities/${id}`);
  }

  async createCommunityActivity(data: Partial<CommunityActivity>) {
    return this.request<{ success: boolean; data: CommunityActivity }>('/community/activities', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateCommunityActivity(id: string, data: Partial<CommunityActivity>) {
    return this.request<{ success: boolean; data: CommunityActivity }>(`/community/activities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteCommunityActivity(id: string) {
    return this.request<{ success: boolean; message: string }>(`/community/activities/${id}`, {
      method: 'DELETE'
    });
  }

  async submitActivityForApproval(id: string, notes?: string) {
    return this.request<{ success: boolean; message: string; data: CommunityActivity }>(`/community/activities/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
  }

  async publishActivity(id: string) {
    return this.request<{ success: boolean; message: string; data: CommunityActivity }>(`/community/activities/${id}/publish`, {
      method: 'POST'
    });
  }

  async openActivityRegistration(id: string) {
    return this.request<{ success: boolean; message: string; data: CommunityActivity }>(`/community/activities/${id}/open-registration`, {
      method: 'POST'
    });
  }

  async closeActivityRegistration(id: string) {
    return this.request<{ success: boolean; message: string; data: CommunityActivity }>(`/community/activities/${id}/close-registration`, {
      method: 'POST'
    });
  }

  async reopenActivityRegistration(id: string) {
    return this.request<{ success: boolean; message: string; data: CommunityActivity }>(`/community/activities/${id}/reopen-registration`, {
      method: 'POST'
    });
  }

  async cancelCommunityActivity(id: string, cancellation_reason: string) {
    return this.request<{ success: boolean; message: string; data: CommunityActivity }>(`/community/activities/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ cancellation_reason })
    });
  }

  async getActivityApprovals(id: string) {
    return this.request<{ success: boolean; data: ActivityApprovalLog[] }>(`/community/activities/${id}/approvals`);
  }

  async officerReviewActivity(id: string, decision: 'approved' | 'rejected' | 'changes_requested', comments: string) {
    return this.request<{ success: boolean; message: string; data: CommunityActivity }>(`/community/activities/${id}/officer-review`, {
      method: 'POST',
      body: JSON.stringify({ decision, comments })
    });
  }

  // Registrations
  async getActivityRegistrations(activityId: string, page = 1, limit = 20, status?: string) {
    const query = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (status) query.append('status', status);
    return this.request<{ success: boolean; data: { registrations: ActivityRegistration[]; total: number; page: number; limit: number } }>(
      `/community/activities/${activityId}/registrations?${query.toString()}`
    );
  }

  getRegistrationCsvUrl(activityId: string): string {
    return `${API_BASE_URL}/community/activities/${activityId}/registrations/export`;
  }

  async updateRegistrationAttendance(id: string, attendance_status: 'present' | 'absent', attendance_notes?: string) {
    return this.request<{ success: boolean; message: string }>(`/community/registrations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ attendance_status, attendance_notes })
    });
  }

  // Citizen Questions (AI-assisted)
  async askActivityQuestion(activityId: string, question_text: string, question_language = 'en') {
    return this.request<{ success: boolean; message: string; data: ActivityQuestion }>(`/activities/${activityId}/questions`, {
      method: 'POST',
      body: JSON.stringify({ question_text, question_language })
    });
  }

  async getCommunityQuestions(params?: { activity_id?: string; status?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.activity_id) query.append('activity_id', params.activity_id);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; data: ActivityQuestion[] }>(`/community/questions${qs}`);
  }

  async getCommunityQuestion(id: string) {
    return this.request<{ success: boolean; data: ActivityQuestion }>(`/community/questions/${id}`);
  }

  async generateAiQuestionSuggestion(questionId: string) {
    return this.request<{ success: boolean; data: ActivityAiSuggestion }>(`/community/questions/${questionId}/generate-suggestion`, {
      method: 'POST'
    });
  }

  async respondToQuestion(questionId: string, response_text: string, suggestion_id?: string) {
    return this.request<{ success: boolean; message: string; data: any }>(`/community/questions/${questionId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response_text, suggestion_id })
    });
  }

  async closeQuestion(questionId: string) {
    return this.request<{ success: boolean; message: string }>(`/community/questions/${questionId}/close`, {
      method: 'POST'
    });
  }

  // Announcements
  async getCommunityAnnouncements(activityId?: string) {
    const qs = activityId ? `?activity_id=${activityId}` : '';
    return this.request<{ success: boolean; data: ActivityAnnouncement[] }>(`/community/announcements${qs}`);
  }

  async createActivityAnnouncement(activityId: string, data: { title: string; message: string; target_audience?: string; priority?: string; channels?: string[] }) {
    return this.request<{ success: boolean; message: string; data: ActivityAnnouncement }>(`/community/activities/${activityId}/announcements`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Evidence & Gallery
  async getActivityEvidence(activityId: string) {
    return this.request<{ success: boolean; data: ActivityEvidence[] }>(`/community/activities/${activityId}/evidence`);
  }

  async uploadActivityEvidence(activityId: string, data: { image_url: string; stage: 'before' | 'during' | 'after'; caption?: string; file_size_bytes?: number }) {
    return this.request<{ success: boolean; message: string; data: ActivityEvidence }>(`/community/activities/${activityId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async submitActivityEvidence(activityId: string, notes?: string) {
    return this.request<{ success: boolean; message: string }>(`/community/activities/${activityId}/evidence/submit`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
  }

  async reviewActivityEvidence(activityId: string, decision: 'verified_complete' | 'rejected', review_comments: string) {
    return this.request<{ success: boolean; message: string }>(`/community/activities/${activityId}/evidence/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, review_comments })
    });
  }

  // AI Helpers
  async aiGenerateDescription(data: { title: string; activity_type: string; target_area: string; planned_tasks?: string[] }) {
    return this.request<{ success: boolean; data: { short_description: string; detailed_description: string; volunteer_instructions: string; equipment_needed: string[] } }>(
      '/community/ai/generate-description',
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );
  }

  async aiCheckEvidenceQuality(image_base64_or_url: string) {
    return this.request<{ success: boolean; data: { passes_quality: boolean; blur_score: number; brightness_score: number; is_blurry: boolean; is_too_dark: boolean; is_too_bright: boolean; feedback_message: string } }>(
      '/community/ai/check-evidence-quality',
      {
        method: 'POST',
        body: JSON.stringify({ image_base64_or_url })
      }
    );
  }

  async aiCompareEvidence(before_image_url: string, after_image_url: string) {
    return this.request<{ success: boolean; data: { visual_change_score: number; improvement_detected: boolean; confidence: number; summary: string } }>(
      '/community/ai/compare-evidence',
      {
        method: 'POST',
        body: JSON.stringify({ before_image_url, after_image_url })
      }
    );
  }

  async aiGetActivityInsights() {
    return this.request<{ success: boolean; data: { key_insights: string[]; recommendations: string[]; sentiment_score: number; predicted_next_turnout: number } }>(
      '/community/ai/activity-insights'
    );
  }

  // --- WORKER DASHBOARD APIS ---
  async getWorkerProfile() {
    return this.request<{ success: boolean; data: WorkerProfile }>('/worker/profile');
  }

  async getWorkerDashboardSummary() {
    return this.request<{ success: boolean; data: WorkerDashboardSummary }>('/worker/dashboard/summary');
  }

  async getWorkerAssignments(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<{ success: boolean; data: WorkAssignment[]; count: number }>(`/worker/assignments${query}`);
  }

  async getWorkerAssignment(id: string) {
    return this.request<{ success: boolean; data: WorkAssignment & { team_members: WorkAssignmentMember[] } }>(`/worker/assignments/${id}`);
  }

  async acknowledgeWorkerAssignment(id: string) {
    return this.request<{ success: boolean; message: string }>(`/worker/assignments/${id}/acknowledge`, {
      method: 'POST'
    });
  }

  async markWorkerAttendance(data: {
    assignment_id: string;
    latitude: number;
    longitude: number;
    gps_accuracy_meters?: number;
  }) {
    return this.request<{ success: boolean; message: string; data: WorkerAttendance }>('/worker/attendance/mark', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async requestAttendanceException(data: {
    assignment_id: string;
    reason: string;
    evidence_photo_url?: string;
  }) {
    return this.request<{ success: boolean; message: string; data: AttendanceException }>('/worker/attendance/exception', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getWorkerAttendanceHistory() {
    return this.request<{ success: boolean; data: WorkerAttendance[] }>('/worker/attendance/history');
  }

  async addWorkProgress(assignmentId: string, data: { comment: string; stage?: string; photo_url?: string }) {
    return this.request<{ success: boolean; message: string; data: WorkProgressUpdate }>(`/worker/assignments/${assignmentId}/progress`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async uploadWorkEvidence(assignmentId: string, data: {
    stage: 'before' | 'during' | 'after';
    photo_url: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    gps_accuracy?: number;
  }) {
    return this.request<{ success: boolean; message: string; data: WorkEvidence }>(`/worker/assignments/${assignmentId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getWorkEvidence(assignmentId: string) {
    return this.request<{ success: boolean; data: WorkEvidence[] }>(`/worker/assignments/${assignmentId}/evidence`);
  }

  async submitWorkCompletionReport(assignmentId: string, data: {
    completion_description: string;
    actual_start_time?: string;
    actual_end_time?: string;
    waste_quantity?: string;
    waste_disposal_destination?: string;
    equipment_used?: string[];
    issues_encountered?: string;
    pending_work?: string;
  }) {
    return this.request<{ success: boolean; message: string; data: WorkCompletionReport }>(`/worker/assignments/${assignmentId}/completion-report`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getTemporaryLeaderTeam(assignmentId: string) {
    return this.request<{ success: boolean; data: { assignment: WorkAssignment; team_members: WorkAssignmentMember[] } }>(`/worker/assignments/${assignmentId}/team`);
  }

  async getWorkerDesignations() {
    return this.request<{ success: boolean; data: WorkerDesignation[] }>('/worker/meta/designations');
  }

  async getWorkersDirectory(filters?: { ward_id?: string; designation_id?: string }) {
    const params = new URLSearchParams();
    if (filters?.ward_id) params.append('ward_id', filters.ward_id);
    if (filters?.designation_id) params.append('designation_id', filters.designation_id);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ success: boolean; data: WorkerProfile[] }>(`/worker/directory${qs}`);
  }

  // =========================================================================
  // WARD OFFICER DASHBOARD (Navsari Municipal Corporation - Ward 3)
  // =========================================================================
  async getWardDashboardSummary() {
    return this.request<{ success: boolean; data: WardDashboardSummary }>('/ward/dashboard/summary');
  }

  async getWardComplaints(params?: Record<string, any>) {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
      });
    }
    const qStr = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<{ success: boolean; data: any[]; pagination: { page: number; limit: number; total: number; total_pages: number } }>(`/ward/complaints${qStr}`);
  }

  async getWardComplaintDetails(id: string) {
    return this.request<{ success: boolean; data: any }>(`/ward/complaints/${id}`);
  }

  async reopenWardComplaint(id: string, data: {
    reopen_reason: string;
    description?: string;
    urgency?: string;
    supporting_evidence?: string;
    team_option?: 'previous' | 'new';
    selected_worker_ids?: string[];
    temporary_leader_id?: string;
  }) {
    return this.request<{ success: boolean; message: string; data: any }>(`/ward/complaints/${id}/reopen`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async assignWardComplaint(id: string, data: {
    team_name?: string;
    team_id?: string;
    work_type?: string;
    worker_ids?: string[];
    temporary_leader_id?: string;
    instructions?: string;
    deadline?: string;
  }) {
    return this.request<{ success: boolean; message: string; data: any }>(`/ward/complaints/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async rejectWardComplaint(id: string, data: { rejection_reason: string }) {
    return this.request<{ success: boolean; message: string; data: any }>(`/ward/complaints/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async verifyCompleteWardComplaint(id: string, data?: { review_notes?: string }) {
    return this.request<{ success: boolean; message: string; data: any }>(`/ward/complaints/${id}/verify-complete`, {
      method: 'POST',
      body: JSON.stringify(data || {})
    });
  }

  async publishWardComplaintToCommunity(id: string, data: {
    title: string;
    description: string;
    before_photo_url: string;
    after_photo_url: string;
    after_photos?: string[];
    waste_kg?: number;
  }) {
    return this.request<{ success: boolean; message: string; data: any }>(`/ward/complaints/${id}/publish-community`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getWardHotspots(filters?: { category?: string; frequency?: string; ward?: number }) {
    const qs = new URLSearchParams();
    if (filters?.category) qs.append('category', filters.category);
    if (filters?.frequency) qs.append('frequency', filters.frequency);
    if (filters?.ward) qs.append('ward', String(filters.ward));
    const qStr = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<{ success: boolean; data: WardHotspot[]; meta: any }>(`/ward/hotspots${qStr}`);
  }

  async getWardAssignments(filters?: any) {
    return this.request<{ success: boolean; data: any[] }>('/ward/assignments');
  }

  async getWardWorkers(params?: { search?: string; availability?: string }) {
    const qs = new URLSearchParams();
    if (params?.search) qs.append('search', params.search);
    if (params?.availability) qs.append('availability', params.availability);
    const qStr = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/ward/workers${qStr}`);
  }

  async addWardWorker(data: {
    full_name: string;
    phone: string;
    username?: string;
    password?: string;
    designation: string;
    skills?: string[];
    availability_status?: string;
  }) {
    return this.request<{ success: boolean; message: string; data: any }>('/ward/workers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateWardWorker(id: string, data: {
    full_name?: string;
    phone?: string;
    designation?: string;
    skills?: string[];
    availability_status?: string;
  }) {
    return this.request<{ success: boolean; message: string; data: any }>(`/ward/workers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteWardWorker(id: string) {
    return this.request<{ success: boolean; message: string; data: any }>(`/ward/workers/${id}`, {
      method: 'DELETE'
    });
  }

  async getWardTeams() {
    return this.request<{ success: boolean; data: any[] }>('/ward/teams');
  }

  async createWardTeam(data: {
    team_name: string;
    worker_ids: string[];
    temporary_leader_id?: string;
    work_type?: string;
  }) {
    return this.request<{ success: boolean; message: string; data: any }>('/ward/teams', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateWardTeam(id: string, data: {
    team_name?: string;
    worker_ids?: string[];
    temporary_leader_id?: string;
    work_type?: string;
  }) {
    return this.request<{ success: boolean; message: string; data: any }>(`/ward/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteWardTeam(id: string) {
    return this.request<{ success: boolean; message: string; data: any }>(`/ward/teams/${id}`, {
      method: 'DELETE'
    });
  }

  async getWardCommunities() {
    return this.request<{ success: boolean; data: any[] }>('/ward/communities');
  }

  async addWardCommunity(data: {
    community_name: string;
    head_name: string;
    phone?: string;
    email?: string;
    username?: string;
    password?: string;
    address?: string;
    locality?: string;
    organisation_type?: string;
  }) {
    return this.request<{ success: boolean; message: string; data: any }>('/ward/communities', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateWardCommunity(id: string, data: {
    community_name?: string;
    head_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    locality?: string;
    organisation_type?: string;
  }) {
    return this.request<{ success: boolean; message: string; data: any }>(`/ward/communities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteWardCommunity(id: string) {
    return this.request<{ success: boolean; message: string; data: any }>(`/ward/communities/${id}`, {
      method: 'DELETE'
    });
  }

  async getWardApprovals(wardNumber?: number) {
    const q = wardNumber ? `?ward_number=${wardNumber}` : '';
    return this.request<{ success: boolean; data: WardApprovalItem[] }>(`/ward/approvals${q}`);
  }

  async reviewWardApproval(id: string, action: 'approve' | 'changes_requested' | 'reject', comments?: string) {
    return this.request<{ success: boolean; message: string; data: any }>(`/ward/approvals/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, comments })
    });
  }

  async getWardCleanlinessScore() {
    return this.request<{ success: boolean; data: WardCleanlinessScore }>('/ward/cleanliness-score');
  }

  async getWardReports(reportType: string = 'complaints') {
    return this.request<{ success: boolean; data: any }>(`/ward/reports?report_type=${reportType}`);
  }

  async getWardCommunityProblems(wardNumber?: number) {
    const qStr = wardNumber ? `?ward_number=${wardNumber}` : '';
    return this.request<{ success: boolean; data: CommunityProblem[] }>(`/ward/community-problems${qStr}`);
  }

  async addWardCommunityProblem(data: {
    title: string;
    description: string;
    location_name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    action_plan: string;
    urgency?: string;
    estimated_volunteers_needed?: number;
    suggested_equipment?: string[];
    image_url?: string;
    ward_number?: number;
  }) {
    return this.request<{ success: boolean; message: string; data: CommunityProblem }>('/ward/community-problems', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteWardCommunityProblem(id: string) {
    return this.request<{ success: boolean; message: string }>(`/ward/community-problems/${id}`, {
      method: 'DELETE'
    });
  }

  async reopenWardCommunityProblem(id: string) {
    return this.request<{ success: boolean; message: string }>(`/ward/community-problems/${id}/reopen`, {
      method: 'POST'
    });
  }

  async getCommunityWardProblems(wardNumber?: number) {
    const qStr = wardNumber ? `?ward_number=${wardNumber}` : '';
    return this.request<{ success: boolean; data: CommunityProblem[] }>(`/community/ward-problems${qStr}`);
  }

  async claimCommunityWardProblem(id: string, activityId?: string) {
    return this.request<{ success: boolean; message: string }>(`/community/ward-problems/${id}/claim`, {
      method: 'POST',
      body: JSON.stringify({ activity_id: activityId })
    });
  }

  // AI Analytics Suite Endpoints
  async getAISeasonalPredictions(ward?: number) {
    const qStr = ward ? `?ward=${ward}` : '';
    return this.request<{
      success: boolean;
      data: {
        current_season: string;
        forecast_month: string;
        total_predictions: number;
        predictions: import('../types/index.js').SeasonalPrediction[];
      };
    }>(`/ward/ai-analytics/seasonal-predictions${qStr}`);
  }

  async getAIPerformersSuggestions(ward?: number) {
    const qStr = ward ? `?ward=${ward}` : '';
    return this.request<{
      success: boolean;
      data: {
        top_workers: import('../types/index.js').WorkerPerformerSuggestion[];
        top_communities: import('../types/index.js').CommunityPerformerSuggestion[];
        top_citizens: import('../types/index.js').CitizenPerformerSuggestion[];
      };
    }>(`/ward/ai-analytics/performers-suggestions${qStr}`);
  }

  async getAIChronicHotspots(ward?: number) {
    const qStr = ward ? `?ward=${ward}` : '';
    return this.request<{
      success: boolean;
      data: {
        total_chronic_spots: number;
        high_reopen_spots_count: number;
        chronic_hotspots: import('../types/index.js').ChronicHotspotSuggestion[];
      };
    }>(`/ward/ai-analytics/chronic-hotspots${qStr}`);
  }

  async executeAIQuickAction(action_type: 'create_community_problem' | 'publish_performer_recognition', payload: any) {
    return this.request<{ success: boolean; message: string; data?: any }>('/ward/ai-analytics/quick-action', {
      method: 'POST',
      body: JSON.stringify({ action_type, payload })
    });
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
