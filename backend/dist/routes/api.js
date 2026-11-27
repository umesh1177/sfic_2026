"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const authController_js_1 = require("../controllers/authController.js");
const citizenController_js_1 = require("../controllers/citizenController.js");
const complaintsController_js_1 = require("../controllers/complaintsController.js");
const mapController_js_1 = require("../controllers/mapController.js");
const drivesController_js_1 = require("../controllers/drivesController.js");
const communityController_js_1 = require("../controllers/communityController.js");
const communityHeadController_js_1 = require("../controllers/communityHeadController.js");
const workerController_js_1 = require("../controllers/workerController.js");
const wardOfficerController_js_1 = require("../controllers/wardOfficerController.js");
const adminController_js_1 = require("../controllers/adminController.js");
const supportController_js_1 = require("../controllers/supportController.js");
const notificationsController_js_1 = require("../controllers/notificationsController.js");
const auth_js_1 = require("../middleware/auth.js");
const store_js_1 = require("../data/store.js");
exports.apiRouter = (0, express_1.Router)();
// Soft authentication for optional citizen endpoints
function softAuthenticate(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        void (0, auth_js_1.authenticate)(req, _res, () => next());
    }
    else {
        // Default to initial test citizen for seamless preview if unauthenticated
        req.user = store_js_1.store.profiles[0];
        next();
    }
}
// 1. Authentication
exports.apiRouter.post('/auth/signup/send-otp', authController_js_1.AuthController.signupSendOtp);
exports.apiRouter.post('/auth/signup/verify-otp', authController_js_1.AuthController.signupVerifyOtp);
exports.apiRouter.post('/auth/signup/complete-profile', authController_js_1.AuthController.signupCompleteProfile);
exports.apiRouter.get('/auth/check-username', authController_js_1.AuthController.checkUsername);
exports.apiRouter.post('/auth/register-community', authController_js_1.AuthController.registerCommunity);
exports.apiRouter.post('/auth/login', authController_js_1.AuthController.login);
exports.apiRouter.post('/auth/logout', authController_js_1.AuthController.logout);
exports.apiRouter.post('/auth/refresh', auth_js_1.authenticate, authController_js_1.AuthController.refresh);
exports.apiRouter.post('/auth/forgot-password/send-otp', authController_js_1.AuthController.forgotPasswordSendOtp);
exports.apiRouter.post('/auth/forgot-password/verify-otp', authController_js_1.AuthController.forgotPasswordVerifyOtp);
exports.apiRouter.post('/auth/forgot-password/reset', authController_js_1.AuthController.forgotPasswordReset);
exports.apiRouter.get('/auth/me', auth_js_1.authenticate, authController_js_1.AuthController.getMe);
// 2. Citizen Dashboard & Profile
exports.apiRouter.get('/citizen/dashboard', softAuthenticate, citizenController_js_1.CitizenController.getDashboard);
exports.apiRouter.get('/citizen/profile', auth_js_1.authenticate, citizenController_js_1.CitizenController.getProfile);
exports.apiRouter.put('/citizen/profile', auth_js_1.authenticate, citizenController_js_1.CitizenController.updateProfile);
exports.apiRouter.put('/citizen/preferences', auth_js_1.authenticate, citizenController_js_1.CitizenController.updatePreferences);
// 3. Complaint Categories
exports.apiRouter.get('/complaint-categories', (_req, res) => {
    res.json({ success: true, data: store_js_1.store.categories });
});
// 4. Complaints Management & AI
exports.apiRouter.post('/complaints/validate-content', softAuthenticate, complaintsController_js_1.ComplaintsController.validateContent);
exports.apiRouter.post('/complaints/classify-image', softAuthenticate, complaintsController_js_1.ComplaintsController.classifyImage);
exports.apiRouter.post('/complaints/check-duplicates', softAuthenticate, complaintsController_js_1.ComplaintsController.checkDuplicates);
exports.apiRouter.post('/complaints/validate-location', softAuthenticate, complaintsController_js_1.ComplaintsController.validateLocation);
exports.apiRouter.post('/complaints', auth_js_1.authenticate, complaintsController_js_1.ComplaintsController.createComplaint);
exports.apiRouter.get('/complaints/my', auth_js_1.authenticate, complaintsController_js_1.ComplaintsController.getMyComplaints);
exports.apiRouter.get('/complaints/feedback', softAuthenticate, complaintsController_js_1.ComplaintsController.getCitizenFeedbackList);
exports.apiRouter.get('/complaints/:id', softAuthenticate, complaintsController_js_1.ComplaintsController.getComplaintById);
exports.apiRouter.delete('/complaints/:id', auth_js_1.authenticate, complaintsController_js_1.ComplaintsController.deleteComplaint);
exports.apiRouter.post('/complaints/:id/feedback', auth_js_1.authenticate, complaintsController_js_1.ComplaintsController.submitFeedback);
exports.apiRouter.post('/complaints/:id/reopen', auth_js_1.authenticate, complaintsController_js_1.ComplaintsController.reopenComplaint);
exports.apiRouter.post('/complaints/:id/follow', softAuthenticate, complaintsController_js_1.ComplaintsController.toggleFollow);
exports.apiRouter.post('/complaints/:id/raise-count', softAuthenticate, complaintsController_js_1.ComplaintsController.raiseCount);
exports.apiRouter.post('/complaints/:id/add-evidence', auth_js_1.authenticate, complaintsController_js_1.ComplaintsController.addEvidence);
// 5. Geographical & Navsari Cleanliness Map
exports.apiRouter.get('/map/wards', mapController_js_1.MapController.getWards);
exports.apiRouter.get('/map/public-complaints', mapController_js_1.MapController.getPublicComplaints);
exports.apiRouter.get('/map/hotspots', mapController_js_1.MapController.getHotspots);
exports.apiRouter.get('/map/ward-scores', mapController_js_1.MapController.getWardScores);
exports.apiRouter.get('/map/nearby', mapController_js_1.MapController.getNearby);
// 6. Cleanliness Drives
exports.apiRouter.get('/drives', softAuthenticate, drivesController_js_1.DrivesController.getDrives);
exports.apiRouter.get('/drives/my-registrations', auth_js_1.authenticate, drivesController_js_1.DrivesController.getMyRegistrations);
exports.apiRouter.get('/drives/:id', softAuthenticate, drivesController_js_1.DrivesController.getDriveById);
exports.apiRouter.get('/drives/:id/questions', softAuthenticate, drivesController_js_1.DrivesController.getDriveQuestions);
exports.apiRouter.post('/drives/:id/register', softAuthenticate, drivesController_js_1.DrivesController.registerForDrive);
exports.apiRouter.delete('/drives/:id/register', softAuthenticate, drivesController_js_1.DrivesController.cancelRegistration);
exports.apiRouter.post('/drives/:id/attendance', softAuthenticate, drivesController_js_1.DrivesController.markAttendance);
// 7. Community Challenges & Rewards
exports.apiRouter.get('/challenges', softAuthenticate, communityController_js_1.CommunityController.getChallenges);
exports.apiRouter.post('/challenges/:id/join', auth_js_1.authenticate, communityController_js_1.CommunityController.joinChallenge);
exports.apiRouter.get('/rewards/my', softAuthenticate, communityController_js_1.CommunityController.getMyRewards);
exports.apiRouter.get('/rewards/leaderboard', communityController_js_1.CommunityController.getLeaderboard);
// Community Recognition Posts (LinkedIn-Style Wall)
exports.apiRouter.get('/community/recognition-posts', softAuthenticate, communityController_js_1.CommunityController.getRecognitionPosts);
exports.apiRouter.post('/community/recognition-posts', auth_js_1.authenticate, communityController_js_1.CommunityController.createRecognitionPost);
exports.apiRouter.post('/community/recognition-posts/:id/like', auth_js_1.authenticate, communityController_js_1.CommunityController.togglePostLike);
exports.apiRouter.post('/community/recognition-posts/:id/comments', auth_js_1.authenticate, communityController_js_1.CommunityController.addPostComment);
// 8. Notifications & PWA Web Push
exports.apiRouter.get('/notifications', auth_js_1.authenticate, notificationsController_js_1.NotificationsController.getNotifications);
exports.apiRouter.patch('/notifications/:id/read', auth_js_1.authenticate, notificationsController_js_1.NotificationsController.markAsRead);
exports.apiRouter.patch('/notifications/read-all', auth_js_1.authenticate, notificationsController_js_1.NotificationsController.markAllAsRead);
exports.apiRouter.get('/push/vapid-public-key', notificationsController_js_1.NotificationsController.getVapidPublicKey);
exports.apiRouter.post('/push/subscribe', auth_js_1.authenticate, notificationsController_js_1.NotificationsController.subscribePush);
exports.apiRouter.post('/push/unsubscribe', auth_js_1.authenticate, notificationsController_js_1.NotificationsController.unsubscribePush);
exports.apiRouter.post('/push/test', auth_js_1.authenticate, notificationsController_js_1.NotificationsController.sendTestPush);
// 9. Citizen Support
exports.apiRouter.post('/support/tickets', auth_js_1.authenticate, supportController_js_1.SupportController.createTicket);
exports.apiRouter.get('/support/tickets', auth_js_1.authenticate, supportController_js_1.SupportController.getTickets);
exports.apiRouter.get('/support/tickets/:id', auth_js_1.authenticate, supportController_js_1.SupportController.getTicketById);
exports.apiRouter.post('/support/tickets/:id/messages', auth_js_1.authenticate, supportController_js_1.SupportController.addMessage);
// 10. Community Head Dashboard (SIH PS000089)
// Profile
exports.apiRouter.get('/community/my', softAuthenticate, communityHeadController_js_1.CommunityHeadController.getMyCommunity);
exports.apiRouter.put('/community/:id', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.updateCommunity);
// Activities
exports.apiRouter.get('/community/activities', softAuthenticate, communityHeadController_js_1.CommunityHeadController.getActivities);
exports.apiRouter.post('/community/activities', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.createActivity);
exports.apiRouter.get('/community/activities/:id', softAuthenticate, communityHeadController_js_1.CommunityHeadController.getActivity);
exports.apiRouter.put('/community/activities/:id', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.updateActivity);
exports.apiRouter.delete('/community/activities/:id', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.deleteActivity);
exports.apiRouter.post('/community/activities/:id/submit', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.submitForApproval);
exports.apiRouter.post('/community/activities/:id/publish', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.publishActivity);
exports.apiRouter.post('/community/activities/:id/open-registration', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.openRegistration);
exports.apiRouter.post('/community/activities/:id/close-registration', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.closeRegistration);
exports.apiRouter.post('/community/activities/:id/reopen-registration', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.reopenRegistration);
exports.apiRouter.post('/community/activities/:id/cancel', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.cancelActivity);
exports.apiRouter.get('/community/activities/:id/approvals', softAuthenticate, communityHeadController_js_1.CommunityHeadController.getActivityApprovals);
exports.apiRouter.post('/community/activities/:id/officer-review', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.officerReview);
// Registrations
exports.apiRouter.get('/community/activities/:id/registrations', softAuthenticate, communityHeadController_js_1.CommunityHeadController.getRegistrations);
exports.apiRouter.get('/community/activities/:id/registrations/export', softAuthenticate, communityHeadController_js_1.CommunityHeadController.exportRegistrationsCsv);
exports.apiRouter.patch('/community/registrations/:id', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.updateAttendance);
// Citizen Questions (AI Answer Suggestions & Review)
exports.apiRouter.post('/activities/:id/questions', softAuthenticate, communityHeadController_js_1.CommunityHeadController.createQuestion);
exports.apiRouter.get('/community/questions', softAuthenticate, communityHeadController_js_1.CommunityHeadController.getQuestions);
exports.apiRouter.get('/community/questions/:id', softAuthenticate, communityHeadController_js_1.CommunityHeadController.getQuestion);
exports.apiRouter.post('/community/questions/:id/generate-suggestion', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.generateAiSuggestion);
exports.apiRouter.post('/community/questions/:id/respond', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.respondToQuestion);
exports.apiRouter.post('/community/questions/:id/close', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.closeQuestion);
// Event Announcements & Targeted Notifications
exports.apiRouter.get('/community/announcements', softAuthenticate, communityHeadController_js_1.CommunityHeadController.getAnnouncements);
exports.apiRouter.post('/community/activities/:id/announcements', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.createAnnouncement);
// Gallery & Evidence
exports.apiRouter.get('/community/activities/:id/evidence', softAuthenticate, communityHeadController_js_1.CommunityHeadController.getEvidence);
exports.apiRouter.post('/community/activities/:id/evidence', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.uploadEvidence);
exports.apiRouter.post('/community/activities/:id/evidence/submit', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.submitEvidence);
exports.apiRouter.post('/community/activities/:id/evidence/review', auth_js_1.authenticate, communityHeadController_js_1.CommunityHeadController.reviewEvidence);
// AI Features
exports.apiRouter.post('/community/ai/generate-description', communityHeadController_js_1.CommunityHeadController.generateDescription);
exports.apiRouter.post('/community/ai/check-evidence-quality', communityHeadController_js_1.CommunityHeadController.checkEvidenceQuality);
exports.apiRouter.post('/community/ai/compare-evidence', communityHeadController_js_1.CommunityHeadController.compareEvidence);
exports.apiRouter.get('/community/ai/activity-insights', softAuthenticate, communityHeadController_js_1.CommunityHeadController.getActivityInsights);
// Dashboard Overview Summary
exports.apiRouter.get('/community/dashboard/summary', softAuthenticate, communityHeadController_js_1.CommunityHeadController.getDashboardSummary);
exports.apiRouter.get('/community/ward-problems', softAuthenticate, communityHeadController_js_1.CommunityHeadController.getWardProblems);
exports.apiRouter.post('/community/ward-problems/:id/claim', softAuthenticate, communityHeadController_js_1.CommunityHeadController.claimWardProblem);
// ============================================================================
// WORKER DASHBOARD ROUTES (Navsari Municipal Corporation)
// ============================================================================
// 1. Profile & Dashboard Summary
exports.apiRouter.get('/worker/profile', softAuthenticate, workerController_js_1.WorkerController.getProfile);
exports.apiRouter.get('/worker/dashboard/summary', softAuthenticate, workerController_js_1.WorkerController.getDashboardSummary);
// 2. Assignments
exports.apiRouter.get('/worker/assignments', softAuthenticate, workerController_js_1.WorkerController.getAssignments);
exports.apiRouter.get('/worker/assignments/:id', softAuthenticate, workerController_js_1.WorkerController.getAssignmentDetails);
exports.apiRouter.post('/worker/assignments/:id/acknowledge', softAuthenticate, workerController_js_1.WorkerController.acknowledgeAssignment);
// 3. Location-Validated Attendance (GPS geofencing)
exports.apiRouter.get('/worker/attendance/today', softAuthenticate, workerController_js_1.WorkerController.getTodayAttendance);
exports.apiRouter.post('/worker/attendance/mark', softAuthenticate, workerController_js_1.WorkerController.markAttendance);
exports.apiRouter.post('/worker/attendance/exception', softAuthenticate, workerController_js_1.WorkerController.requestAttendanceException);
exports.apiRouter.get('/worker/attendance/history', softAuthenticate, workerController_js_1.WorkerController.getAttendanceHistory);
// 4. Progress Updates
exports.apiRouter.post('/worker/assignments/:id/progress', softAuthenticate, workerController_js_1.WorkerController.addProgress);
// 5. Before & After Evidence
exports.apiRouter.get('/worker/assignments/:id/evidence', softAuthenticate, workerController_js_1.WorkerController.getEvidence);
exports.apiRouter.post('/worker/assignments/:id/evidence', softAuthenticate, workerController_js_1.WorkerController.uploadEvidence);
// 6. Temporary Team Leader Actions (Strictly Authorized)
exports.apiRouter.post('/worker/assignments/:id/completion-report', softAuthenticate, workerController_js_1.WorkerController.submitCompletionReport);
exports.apiRouter.get('/worker/assignments/:id/team', softAuthenticate, workerController_js_1.WorkerController.getTeamManagement);
// 7. Directory & Designations (NMC & Ward)
exports.apiRouter.get('/worker/meta/designations', softAuthenticate, workerController_js_1.WorkerController.getDesignations);
exports.apiRouter.get('/worker/directory', softAuthenticate, workerController_js_1.WorkerController.getWorkersDirectory);
// ============================================================================
// WARD OFFICER DASHBOARD ROUTES (Navsari Municipal Corporation - Ward 3)
// ============================================================================
exports.apiRouter.get('/ward/dashboard/summary', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getDashboardSummary);
exports.apiRouter.get('/ward/complaints', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getComplaints);
exports.apiRouter.get('/ward/complaints/:id', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getComplaintDetails);
exports.apiRouter.delete('/ward/complaints/:id', softAuthenticate, wardOfficerController_js_1.WardOfficerController.deleteComplaint);
exports.apiRouter.post('/ward/complaints/:id/reopen', softAuthenticate, wardOfficerController_js_1.WardOfficerController.reopenComplaint);
exports.apiRouter.post('/ward/complaints/:id/assign', softAuthenticate, wardOfficerController_js_1.WardOfficerController.assignComplaint);
exports.apiRouter.post('/ward/complaints/:id/reject', softAuthenticate, wardOfficerController_js_1.WardOfficerController.rejectComplaint);
exports.apiRouter.post('/ward/complaints/:id/reclassify', softAuthenticate, wardOfficerController_js_1.WardOfficerController.reclassifyComplaint);
exports.apiRouter.post('/ward/complaints/:id/verify-complete', softAuthenticate, wardOfficerController_js_1.WardOfficerController.verifyCompleteComplaint);
exports.apiRouter.post('/ward/complaints/:id/verify-evidence', softAuthenticate, wardOfficerController_js_1.WardOfficerController.verifyLeaderEvidence);
exports.apiRouter.post('/ward/complaints/:id/reject-evidence', softAuthenticate, wardOfficerController_js_1.WardOfficerController.rejectLeaderEvidence);
exports.apiRouter.post('/ward/complaints/:id/add-worker', softAuthenticate, wardOfficerController_js_1.WardOfficerController.addWorkerToComplaintSquad);
exports.apiRouter.post('/ward/complaints/:id/remove-worker', softAuthenticate, wardOfficerController_js_1.WardOfficerController.removeWorkerFromComplaintSquad);
exports.apiRouter.post('/ward/complaints/:id/publish-community', softAuthenticate, wardOfficerController_js_1.WardOfficerController.publishComplaintToCommunity);
exports.apiRouter.post('/ward/complaints/:id/geofence-override', softAuthenticate, wardOfficerController_js_1.WardOfficerController.toggleGeofenceOverride);
exports.apiRouter.get('/ward/complaints/:id/suggested-teams', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getSuggestedTeamsForComplaint);
exports.apiRouter.get('/ward/citizen-feedback', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getCitizenFeedbackList);
exports.apiRouter.get('/ward/hotspots', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getHotspots);
exports.apiRouter.get('/ward/assignments', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getAssignments);
exports.apiRouter.post('/ward/assignments', softAuthenticate, wardOfficerController_js_1.WardOfficerController.createAssignment);
exports.apiRouter.get('/ward/workers', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getWorkers);
exports.apiRouter.post('/ward/workers', softAuthenticate, wardOfficerController_js_1.WardOfficerController.addWorker);
exports.apiRouter.put('/ward/workers/:id', softAuthenticate, wardOfficerController_js_1.WardOfficerController.updateWorker);
exports.apiRouter.delete('/ward/workers/:id', softAuthenticate, wardOfficerController_js_1.WardOfficerController.deleteWorker);
exports.apiRouter.get('/ward/teams', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getTeams);
exports.apiRouter.post('/ward/teams', softAuthenticate, wardOfficerController_js_1.WardOfficerController.createTeam);
exports.apiRouter.put('/ward/teams/:id', softAuthenticate, wardOfficerController_js_1.WardOfficerController.updateTeam);
exports.apiRouter.delete('/ward/teams/:id', softAuthenticate, wardOfficerController_js_1.WardOfficerController.deleteTeam);
exports.apiRouter.get('/ward/communities', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getCommunities);
exports.apiRouter.post('/ward/communities', softAuthenticate, wardOfficerController_js_1.WardOfficerController.addCommunity);
exports.apiRouter.post('/ward/communities/bulk', softAuthenticate, wardOfficerController_js_1.WardOfficerController.bulkAddCommunities);
exports.apiRouter.put('/ward/communities/:id', softAuthenticate, wardOfficerController_js_1.WardOfficerController.updateCommunity);
exports.apiRouter.delete('/ward/communities/:id', softAuthenticate, wardOfficerController_js_1.WardOfficerController.deleteCommunity);
exports.apiRouter.get('/ward/approvals', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getApprovals);
exports.apiRouter.post('/ward/approvals/:id/review', softAuthenticate, wardOfficerController_js_1.WardOfficerController.reviewApproval);
exports.apiRouter.get('/ward/completed-drives', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getCompletedDrives);
exports.apiRouter.post('/ward/drives/:id/publish-completion', softAuthenticate, wardOfficerController_js_1.WardOfficerController.publishDriveCompletion);
exports.apiRouter.delete('/ward/drives/:id', softAuthenticate, wardOfficerController_js_1.WardOfficerController.deleteDrive);
exports.apiRouter.delete('/ward/drives-seed/clean-all', softAuthenticate, wardOfficerController_js_1.WardOfficerController.cleanSeedDrives);
exports.apiRouter.get('/ward/organization-drives', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getOrganizationDrives);
exports.apiRouter.post('/ward/organization-drives/:id/evidence/verify-all', softAuthenticate, wardOfficerController_js_1.WardOfficerController.verifyAllDriveEvidence);
exports.apiRouter.post('/ward/organization-drives/:id/evidence/:evidenceId/verify', softAuthenticate, wardOfficerController_js_1.WardOfficerController.verifyDriveEvidence);
exports.apiRouter.post('/ward/organization-drives/:id/complete', softAuthenticate, wardOfficerController_js_1.WardOfficerController.completeOrganizationDrive);
exports.apiRouter.post('/ward/organization-drives/:id/certificates', softAuthenticate, wardOfficerController_js_1.WardOfficerController.issueDriveCertificates);
exports.apiRouter.get('/ward/organization-drives/:id/certificates', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getDriveCertificates);
exports.apiRouter.get('/certificates/my', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getMyCertificates);
exports.apiRouter.get('/certificates/verify/:code', wardOfficerController_js_1.WardOfficerController.verifyCertificate);
exports.apiRouter.get('/ward/community-problems', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getCommunityProblems);
exports.apiRouter.post('/ward/community-problems', softAuthenticate, wardOfficerController_js_1.WardOfficerController.addCommunityProblem);
exports.apiRouter.post('/ward/community-problems/:id/reopen', softAuthenticate, wardOfficerController_js_1.WardOfficerController.reopenCommunityProblem);
exports.apiRouter.delete('/ward/community-problems/:id', softAuthenticate, wardOfficerController_js_1.WardOfficerController.deleteCommunityProblem);
exports.apiRouter.get('/ward/cleanliness-score', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getCleanlinessScore);
exports.apiRouter.get('/ward/reports', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getReports);
// AI / Civic Analytics Suite Routes
exports.apiRouter.get('/ward/ai-analytics/seasonal-predictions', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getAISeasonalPredictions);
exports.apiRouter.get('/ward/ai-analytics/seasonal-settings', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getSeasonalAlertSettings);
exports.apiRouter.post('/ward/ai-analytics/seasonal-settings', softAuthenticate, wardOfficerController_js_1.WardOfficerController.updateSeasonalAlertSettings);
exports.apiRouter.get('/ward/ai-analytics/complaints-trend', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getComplaintsTrend);
exports.apiRouter.get('/ward/ai-analytics/performers-suggestions', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getAIPerformersSuggestions);
exports.apiRouter.get('/ward/ai-analytics/chronic-hotspots', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getAIChronicHotspots);
exports.apiRouter.post('/ward/ai-analytics/quick-action', softAuthenticate, wardOfficerController_js_1.WardOfficerController.executeAIQuickAction);
// ============================================================================
// NMC ADMIN DASHBOARD ROUTES (Navsari Municipal Corporation)
// ============================================================================
exports.apiRouter.get('/admin/overview', softAuthenticate, adminController_js_1.AdminController.getOverview);
exports.apiRouter.get('/admin/seasonal-predictions/ward-wise', softAuthenticate, adminController_js_1.AdminController.getWardWiseSeasonalPredictions);
exports.apiRouter.get('/admin/ai-analytics/complaints-trend', softAuthenticate, wardOfficerController_js_1.WardOfficerController.getComplaintsTrend);
exports.apiRouter.get('/admin/wards', softAuthenticate, adminController_js_1.AdminController.getWards);
exports.apiRouter.post('/admin/wards', softAuthenticate, adminController_js_1.AdminController.createWard);
exports.apiRouter.put('/admin/wards/:id', softAuthenticate, adminController_js_1.AdminController.updateWard);
exports.apiRouter.get('/admin/wards/:wardNumber/officer-history', softAuthenticate, adminController_js_1.AdminController.getWardOfficerHistory);
exports.apiRouter.put('/admin/wards/:id/boundary', softAuthenticate, adminController_js_1.AdminController.updateWardBoundary);
exports.apiRouter.get('/admin/city-boundary', softAuthenticate, adminController_js_1.AdminController.getCityBoundary);
exports.apiRouter.put('/admin/city-boundary', softAuthenticate, adminController_js_1.AdminController.updateCityBoundary);
exports.apiRouter.get('/admin/boundary-history', softAuthenticate, adminController_js_1.AdminController.getBoundaryHistory);
exports.apiRouter.post('/admin/boundary-history/:id/restore', softAuthenticate, adminController_js_1.AdminController.restoreBoundaryHistory);
exports.apiRouter.get('/admin/ward-officers', softAuthenticate, adminController_js_1.AdminController.getWardOfficers);
exports.apiRouter.post('/admin/ward-officers', softAuthenticate, adminController_js_1.AdminController.createWardOfficer);
exports.apiRouter.put('/admin/ward-officers/:id', softAuthenticate, adminController_js_1.AdminController.updateWardOfficer);
exports.apiRouter.delete('/admin/ward-officers/:id', softAuthenticate, adminController_js_1.AdminController.deleteWardOfficer);
exports.apiRouter.get('/admin/ward-officers/:officerId/ward-history', softAuthenticate, adminController_js_1.AdminController.getOfficerWardHistory);
exports.apiRouter.get('/admin/workers', softAuthenticate, adminController_js_1.AdminController.getWorkers);
exports.apiRouter.post('/admin/workers', softAuthenticate, adminController_js_1.AdminController.createWorker);
exports.apiRouter.put('/admin/workers/:id', softAuthenticate, adminController_js_1.AdminController.updateWorker);
exports.apiRouter.delete('/admin/workers/:id', softAuthenticate, adminController_js_1.AdminController.deleteWorker);
exports.apiRouter.get('/admin/categories', softAuthenticate, adminController_js_1.AdminController.getCategories);
exports.apiRouter.post('/admin/categories', softAuthenticate, adminController_js_1.AdminController.createCategory);
exports.apiRouter.put('/admin/categories/:id', softAuthenticate, adminController_js_1.AdminController.updateCategory);
exports.apiRouter.delete('/admin/categories/:id', softAuthenticate, adminController_js_1.AdminController.deleteCategory);
exports.apiRouter.get('/admin/flagged-officers', softAuthenticate, adminController_js_1.AdminController.getFlaggedOfficers);
exports.apiRouter.get('/admin/ward-analysis/:wardNumber', softAuthenticate, adminController_js_1.AdminController.getWardAnalysis);
exports.apiRouter.get('/admin/complaints/:id/tracking', softAuthenticate, adminController_js_1.AdminController.getComplaintTrackingDetails);
