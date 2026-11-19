import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/authController.js';
import { CitizenController } from '../controllers/citizenController.js';
import { ComplaintsController } from '../controllers/complaintsController.js';
import { MapController } from '../controllers/mapController.js';
import { DrivesController } from '../controllers/drivesController.js';
import { CommunityController } from '../controllers/communityController.js';
import { CommunityHeadController } from '../controllers/communityHeadController.js';
import { WorkerController } from '../controllers/workerController.js';
import { WardOfficerController } from '../controllers/wardOfficerController.js';
import { AdminController } from '../controllers/adminController.js';
import { SupportController } from '../controllers/supportController.js';
import { NotificationsController } from '../controllers/notificationsController.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { store } from '../data/store.js';

export const apiRouter = Router();

// Soft authentication for optional citizen endpoints
function softAuthenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    void authenticate(req, _res, () => next());
  } else {
    // Default to initial test citizen for seamless preview if unauthenticated
    req.user = store.profiles[0];
    next();
  }
}

// 1. Authentication
apiRouter.post('/auth/signup/send-otp', AuthController.signupSendOtp);
apiRouter.post('/auth/signup/verify-otp', AuthController.signupVerifyOtp);
apiRouter.post('/auth/signup/complete-profile', AuthController.signupCompleteProfile);
apiRouter.get('/auth/check-username', AuthController.checkUsername);
apiRouter.post('/auth/register-community', AuthController.registerCommunity);
apiRouter.post('/auth/login', AuthController.login);
apiRouter.post('/auth/logout', AuthController.logout);
apiRouter.post('/auth/refresh', authenticate, AuthController.refresh);
apiRouter.post('/auth/forgot-password/send-otp', AuthController.forgotPasswordSendOtp);
apiRouter.post('/auth/forgot-password/verify-otp', AuthController.forgotPasswordVerifyOtp);
apiRouter.post('/auth/forgot-password/reset', AuthController.forgotPasswordReset);
apiRouter.get('/auth/me', authenticate, AuthController.getMe);

// 2. Citizen Dashboard & Profile
apiRouter.get('/citizen/dashboard', softAuthenticate, CitizenController.getDashboard);
apiRouter.get('/citizen/profile', authenticate, CitizenController.getProfile);
apiRouter.put('/citizen/profile', authenticate, CitizenController.updateProfile);
apiRouter.put('/citizen/preferences', authenticate, CitizenController.updatePreferences);

// 3. Complaint Categories
apiRouter.get('/complaint-categories', (_req, res) => {
  res.json({ success: true, data: store.categories });
});

// 4. Complaints Management & AI
apiRouter.post('/complaints/validate-content', softAuthenticate, ComplaintsController.validateContent);
apiRouter.post('/complaints/classify-image', softAuthenticate, ComplaintsController.classifyImage);
apiRouter.post('/complaints/check-duplicates', softAuthenticate, ComplaintsController.checkDuplicates);
apiRouter.post('/complaints/validate-location', softAuthenticate, ComplaintsController.validateLocation);
apiRouter.post('/complaints', authenticate, ComplaintsController.createComplaint);
apiRouter.get('/complaints/my', authenticate, ComplaintsController.getMyComplaints);
apiRouter.get('/complaints/:id', softAuthenticate, ComplaintsController.getComplaintById);
apiRouter.delete('/complaints/:id', authenticate, ComplaintsController.deleteComplaint);
apiRouter.post('/complaints/:id/feedback', authenticate, ComplaintsController.submitFeedback);
apiRouter.post('/complaints/:id/reopen', authenticate, ComplaintsController.reopenComplaint);
apiRouter.post('/complaints/:id/follow', softAuthenticate, ComplaintsController.toggleFollow);
apiRouter.post('/complaints/:id/add-evidence', authenticate, ComplaintsController.addEvidence);

// 5. Geographical & Navsari Cleanliness Map
apiRouter.get('/map/wards', MapController.getWards);
apiRouter.get('/map/public-complaints', MapController.getPublicComplaints);
apiRouter.get('/map/hotspots', MapController.getHotspots);
apiRouter.get('/map/ward-scores', MapController.getWardScores);
apiRouter.get('/map/nearby', MapController.getNearby);

// 6. Cleanliness Drives
apiRouter.get('/drives', softAuthenticate, DrivesController.getDrives);
apiRouter.get('/drives/my-registrations', authenticate, DrivesController.getMyRegistrations);
apiRouter.get('/drives/:id', softAuthenticate, DrivesController.getDriveById);
apiRouter.get('/drives/:id/questions', softAuthenticate, DrivesController.getDriveQuestions);
apiRouter.post('/drives/:id/register', softAuthenticate, DrivesController.registerForDrive);
apiRouter.delete('/drives/:id/register', softAuthenticate, DrivesController.cancelRegistration);
apiRouter.post('/drives/:id/attendance', softAuthenticate, DrivesController.markAttendance);

// 7. Community Challenges & Rewards
apiRouter.get('/challenges', softAuthenticate, CommunityController.getChallenges);
apiRouter.post('/challenges/:id/join', authenticate, CommunityController.joinChallenge);
apiRouter.get('/rewards/my', softAuthenticate, CommunityController.getMyRewards);
apiRouter.get('/rewards/leaderboard', CommunityController.getLeaderboard);

// Community Recognition Posts (LinkedIn-Style Wall)
apiRouter.get('/community/recognition-posts', softAuthenticate, CommunityController.getRecognitionPosts);
apiRouter.post('/community/recognition-posts', authenticate, CommunityController.createRecognitionPost);
apiRouter.post('/community/recognition-posts/:id/like', authenticate, CommunityController.togglePostLike);
apiRouter.post('/community/recognition-posts/:id/comments', authenticate, CommunityController.addPostComment);

// 8. Notifications & PWA Web Push
apiRouter.get('/notifications', authenticate, NotificationsController.getNotifications);
apiRouter.patch('/notifications/:id/read', authenticate, NotificationsController.markAsRead);
apiRouter.patch('/notifications/read-all', authenticate, NotificationsController.markAllAsRead);
apiRouter.get('/push/vapid-public-key', NotificationsController.getVapidPublicKey);
apiRouter.post('/push/subscribe', authenticate, NotificationsController.subscribePush);
apiRouter.post('/push/unsubscribe', authenticate, NotificationsController.unsubscribePush);
apiRouter.post('/push/test', authenticate, NotificationsController.sendTestPush);

// 9. Citizen Support
apiRouter.post('/support/tickets', authenticate, SupportController.createTicket);
apiRouter.get('/support/tickets', authenticate, SupportController.getTickets);
apiRouter.get('/support/tickets/:id', authenticate, SupportController.getTicketById);
apiRouter.post('/support/tickets/:id/messages', authenticate, SupportController.addMessage);

// 10. Community Head Dashboard (SIH PS000089)
// Profile
apiRouter.get('/community/my', softAuthenticate, CommunityHeadController.getMyCommunity);
apiRouter.put('/community/:id', authenticate, CommunityHeadController.updateCommunity);

// Activities
apiRouter.get('/community/activities', softAuthenticate, CommunityHeadController.getActivities);
apiRouter.post('/community/activities', authenticate, CommunityHeadController.createActivity);
apiRouter.get('/community/activities/:id', softAuthenticate, CommunityHeadController.getActivity);
apiRouter.put('/community/activities/:id', authenticate, CommunityHeadController.updateActivity);
apiRouter.delete('/community/activities/:id', authenticate, CommunityHeadController.deleteActivity);
apiRouter.post('/community/activities/:id/submit', authenticate, CommunityHeadController.submitForApproval);
apiRouter.post('/community/activities/:id/publish', authenticate, CommunityHeadController.publishActivity);
apiRouter.post('/community/activities/:id/open-registration', authenticate, CommunityHeadController.openRegistration);
apiRouter.post('/community/activities/:id/close-registration', authenticate, CommunityHeadController.closeRegistration);
apiRouter.post('/community/activities/:id/reopen-registration', authenticate, CommunityHeadController.reopenRegistration);
apiRouter.post('/community/activities/:id/cancel', authenticate, CommunityHeadController.cancelActivity);
apiRouter.get('/community/activities/:id/approvals', softAuthenticate, CommunityHeadController.getActivityApprovals);
apiRouter.post('/community/activities/:id/officer-review', authenticate, CommunityHeadController.officerReview);

// Registrations
apiRouter.get('/community/activities/:id/registrations', softAuthenticate, CommunityHeadController.getRegistrations);
apiRouter.get('/community/activities/:id/registrations/export', softAuthenticate, CommunityHeadController.exportRegistrationsCsv);
apiRouter.patch('/community/registrations/:id', authenticate, CommunityHeadController.updateAttendance);

// Citizen Questions (AI Answer Suggestions & Review)
apiRouter.post('/activities/:id/questions', softAuthenticate, CommunityHeadController.createQuestion);
apiRouter.get('/community/questions', softAuthenticate, CommunityHeadController.getQuestions);
apiRouter.get('/community/questions/:id', softAuthenticate, CommunityHeadController.getQuestion);
apiRouter.post('/community/questions/:id/generate-suggestion', authenticate, CommunityHeadController.generateAiSuggestion);
apiRouter.post('/community/questions/:id/respond', authenticate, CommunityHeadController.respondToQuestion);
apiRouter.post('/community/questions/:id/close', authenticate, CommunityHeadController.closeQuestion);

// Event Announcements & Targeted Notifications
apiRouter.get('/community/announcements', softAuthenticate, CommunityHeadController.getAnnouncements);
apiRouter.post('/community/activities/:id/announcements', authenticate, CommunityHeadController.createAnnouncement);

// Gallery & Evidence
apiRouter.get('/community/activities/:id/evidence', softAuthenticate, CommunityHeadController.getEvidence);
apiRouter.post('/community/activities/:id/evidence', authenticate, CommunityHeadController.uploadEvidence);
apiRouter.post('/community/activities/:id/evidence/submit', authenticate, CommunityHeadController.submitEvidence);
apiRouter.post('/community/activities/:id/evidence/review', authenticate, CommunityHeadController.reviewEvidence);

// AI Features
apiRouter.post('/community/ai/generate-description', CommunityHeadController.generateDescription);
apiRouter.post('/community/ai/check-evidence-quality', CommunityHeadController.checkEvidenceQuality);
apiRouter.post('/community/ai/compare-evidence', CommunityHeadController.compareEvidence);
apiRouter.get('/community/ai/activity-insights', softAuthenticate, CommunityHeadController.getActivityInsights);

// Dashboard Overview Summary
apiRouter.get('/community/dashboard/summary', softAuthenticate, CommunityHeadController.getDashboardSummary);
apiRouter.get('/community/ward-problems', softAuthenticate, CommunityHeadController.getWardProblems);
apiRouter.post('/community/ward-problems/:id/claim', softAuthenticate, CommunityHeadController.claimWardProblem);

// ============================================================================
// WORKER DASHBOARD ROUTES (Navsari Municipal Corporation)
// ============================================================================
// 1. Profile & Dashboard Summary
apiRouter.get('/worker/profile', softAuthenticate, WorkerController.getProfile);
apiRouter.get('/worker/dashboard/summary', softAuthenticate, WorkerController.getDashboardSummary);

// 2. Assignments
apiRouter.get('/worker/assignments', softAuthenticate, WorkerController.getAssignments);
apiRouter.get('/worker/assignments/:id', softAuthenticate, WorkerController.getAssignmentDetails);
apiRouter.post('/worker/assignments/:id/acknowledge', softAuthenticate, WorkerController.acknowledgeAssignment);

// 3. Location-Validated Attendance (GPS geofencing)
apiRouter.post('/worker/attendance/mark', softAuthenticate, WorkerController.markAttendance);
apiRouter.post('/worker/attendance/exception', softAuthenticate, WorkerController.requestAttendanceException);
apiRouter.get('/worker/attendance/history', softAuthenticate, WorkerController.getAttendanceHistory);

// 4. Progress Updates
apiRouter.post('/worker/assignments/:id/progress', softAuthenticate, WorkerController.addProgress);

// 5. Before & After Evidence
apiRouter.get('/worker/assignments/:id/evidence', softAuthenticate, WorkerController.getEvidence);
apiRouter.post('/worker/assignments/:id/evidence', softAuthenticate, WorkerController.uploadEvidence);

// 6. Temporary Team Leader Actions (Strictly Authorized)
apiRouter.post('/worker/assignments/:id/completion-report', softAuthenticate, WorkerController.submitCompletionReport);
apiRouter.get('/worker/assignments/:id/team', softAuthenticate, WorkerController.getTeamManagement);

// 7. Directory & Designations (NMC & Ward)
apiRouter.get('/worker/meta/designations', softAuthenticate, WorkerController.getDesignations);
apiRouter.get('/worker/directory', softAuthenticate, WorkerController.getWorkersDirectory);

// ============================================================================
// WARD OFFICER DASHBOARD ROUTES (Navsari Municipal Corporation - Ward 3)
// ============================================================================
apiRouter.get('/ward/dashboard/summary', softAuthenticate, WardOfficerController.getDashboardSummary);
apiRouter.get('/ward/complaints', softAuthenticate, WardOfficerController.getComplaints);
apiRouter.get('/ward/complaints/:id', softAuthenticate, WardOfficerController.getComplaintDetails);
apiRouter.delete('/ward/complaints/:id', softAuthenticate, WardOfficerController.deleteComplaint);
apiRouter.post('/ward/complaints/:id/reopen', softAuthenticate, WardOfficerController.reopenComplaint);
apiRouter.post('/ward/complaints/:id/assign', softAuthenticate, WardOfficerController.assignComplaint);
apiRouter.post('/ward/complaints/:id/reject', softAuthenticate, WardOfficerController.rejectComplaint);
apiRouter.post('/ward/complaints/:id/verify-complete', softAuthenticate, WardOfficerController.verifyCompleteComplaint);
apiRouter.post('/ward/complaints/:id/publish-community', softAuthenticate, WardOfficerController.publishComplaintToCommunity);
apiRouter.get('/ward/hotspots', softAuthenticate, WardOfficerController.getHotspots);
apiRouter.get('/ward/assignments', softAuthenticate, WardOfficerController.getAssignments);
apiRouter.post('/ward/assignments', softAuthenticate, WardOfficerController.createAssignment);
apiRouter.get('/ward/workers', softAuthenticate, WardOfficerController.getWorkers);
apiRouter.post('/ward/workers', softAuthenticate, WardOfficerController.addWorker);
apiRouter.put('/ward/workers/:id', softAuthenticate, WardOfficerController.updateWorker);
apiRouter.delete('/ward/workers/:id', softAuthenticate, WardOfficerController.deleteWorker);

apiRouter.get('/ward/teams', softAuthenticate, WardOfficerController.getTeams);
apiRouter.post('/ward/teams', softAuthenticate, WardOfficerController.createTeam);
apiRouter.put('/ward/teams/:id', softAuthenticate, WardOfficerController.updateTeam);
apiRouter.delete('/ward/teams/:id', softAuthenticate, WardOfficerController.deleteTeam);

apiRouter.get('/ward/communities', softAuthenticate, WardOfficerController.getCommunities);
apiRouter.post('/ward/communities', softAuthenticate, WardOfficerController.addCommunity);
apiRouter.post('/ward/communities/bulk', softAuthenticate, WardOfficerController.bulkAddCommunities);
apiRouter.put('/ward/communities/:id', softAuthenticate, WardOfficerController.updateCommunity);
apiRouter.delete('/ward/communities/:id', softAuthenticate, WardOfficerController.deleteCommunity);
apiRouter.get('/ward/approvals', softAuthenticate, WardOfficerController.getApprovals);
apiRouter.post('/ward/approvals/:id/review', softAuthenticate, WardOfficerController.reviewApproval);
apiRouter.get('/ward/organization-drives', softAuthenticate, WardOfficerController.getOrganizationDrives);
apiRouter.post('/ward/organization-drives/:id/complete', softAuthenticate, WardOfficerController.completeOrganizationDrive);
apiRouter.post('/ward/organization-drives/:id/certificates', softAuthenticate, WardOfficerController.issueDriveCertificates);
apiRouter.get('/ward/organization-drives/:id/certificates', softAuthenticate, WardOfficerController.getDriveCertificates);
apiRouter.get('/certificates/my', softAuthenticate, WardOfficerController.getMyCertificates);
apiRouter.get('/certificates/verify/:code', WardOfficerController.verifyCertificate);
apiRouter.get('/ward/community-problems', softAuthenticate, WardOfficerController.getCommunityProblems);
apiRouter.post('/ward/community-problems', softAuthenticate, WardOfficerController.addCommunityProblem);
apiRouter.post('/ward/community-problems/:id/reopen', softAuthenticate, WardOfficerController.reopenCommunityProblem);
apiRouter.delete('/ward/community-problems/:id', softAuthenticate, WardOfficerController.deleteCommunityProblem);
apiRouter.get('/ward/cleanliness-score', softAuthenticate, WardOfficerController.getCleanlinessScore);
apiRouter.get('/ward/reports', softAuthenticate, WardOfficerController.getReports);

// AI Analytics Suite Routes
apiRouter.get('/ward/ai-analytics/seasonal-predictions', softAuthenticate, WardOfficerController.getAISeasonalPredictions);
apiRouter.get('/ward/ai-analytics/performers-suggestions', softAuthenticate, WardOfficerController.getAIPerformersSuggestions);
apiRouter.get('/ward/ai-analytics/chronic-hotspots', softAuthenticate, WardOfficerController.getAIChronicHotspots);
apiRouter.post('/ward/ai-analytics/quick-action', softAuthenticate, WardOfficerController.executeAIQuickAction);

// ============================================================================
// NMC ADMIN DASHBOARD ROUTES (Navsari Municipal Corporation)
// ============================================================================
apiRouter.get('/admin/overview', softAuthenticate, AdminController.getOverview);
apiRouter.get('/admin/wards', softAuthenticate, AdminController.getWards);
apiRouter.put('/admin/wards/:id/boundary', softAuthenticate, AdminController.updateWardBoundary);
apiRouter.get('/admin/city-boundary', softAuthenticate, AdminController.getCityBoundary);
apiRouter.put('/admin/city-boundary', softAuthenticate, AdminController.updateCityBoundary);
apiRouter.get('/admin/boundary-history', softAuthenticate, AdminController.getBoundaryHistory);
apiRouter.post('/admin/boundary-history/:id/restore', softAuthenticate, AdminController.restoreBoundaryHistory);

apiRouter.get('/admin/ward-officers', softAuthenticate, AdminController.getWardOfficers);
apiRouter.post('/admin/ward-officers', softAuthenticate, AdminController.createWardOfficer);
apiRouter.put('/admin/ward-officers/:id', softAuthenticate, AdminController.updateWardOfficer);

apiRouter.get('/admin/workers', softAuthenticate, AdminController.getWorkers);
apiRouter.post('/admin/workers', softAuthenticate, AdminController.createWorker);
apiRouter.put('/admin/workers/:id', softAuthenticate, AdminController.updateWorker);
apiRouter.delete('/admin/workers/:id', softAuthenticate, AdminController.deleteWorker);

apiRouter.get('/admin/categories', softAuthenticate, AdminController.getCategories);
apiRouter.post('/admin/categories', softAuthenticate, AdminController.createCategory);
apiRouter.put('/admin/categories/:id', softAuthenticate, AdminController.updateCategory);
apiRouter.delete('/admin/categories/:id', softAuthenticate, AdminController.deleteCategory);

apiRouter.get('/admin/flagged-officers', softAuthenticate, AdminController.getFlaggedOfficers);
apiRouter.get('/admin/ward-analysis/:wardNumber', softAuthenticate, AdminController.getWardAnalysis);
apiRouter.get('/admin/complaints/:id/tracking', softAuthenticate, AdminController.getComplaintTrackingDetails);




