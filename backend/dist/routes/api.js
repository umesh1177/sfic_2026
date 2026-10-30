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
const supportController_js_1 = require("../controllers/supportController.js");
const notificationsController_js_1 = require("../controllers/notificationsController.js");
const auth_js_1 = require("../middleware/auth.js");
const store_js_1 = require("../data/store.js");
exports.apiRouter = (0, express_1.Router)();
// Soft authentication for optional citizen endpoints
function softAuthenticate(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        (0, auth_js_1.authenticate)(req, _res, () => next());
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
exports.apiRouter.get('/complaints/:id', softAuthenticate, complaintsController_js_1.ComplaintsController.getComplaintById);
exports.apiRouter.post('/complaints/:id/feedback', auth_js_1.authenticate, complaintsController_js_1.ComplaintsController.submitFeedback);
exports.apiRouter.post('/complaints/:id/reopen', auth_js_1.authenticate, complaintsController_js_1.ComplaintsController.reopenComplaint);
exports.apiRouter.post('/complaints/:id/follow', softAuthenticate, complaintsController_js_1.ComplaintsController.toggleFollow);
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
exports.apiRouter.post('/drives/:id/register', auth_js_1.authenticate, drivesController_js_1.DrivesController.registerForDrive);
exports.apiRouter.delete('/drives/:id/register', auth_js_1.authenticate, drivesController_js_1.DrivesController.cancelRegistration);
// 7. Community Challenges & Rewards
exports.apiRouter.get('/challenges', softAuthenticate, communityController_js_1.CommunityController.getChallenges);
exports.apiRouter.post('/challenges/:id/join', auth_js_1.authenticate, communityController_js_1.CommunityController.joinChallenge);
exports.apiRouter.get('/rewards/my', softAuthenticate, communityController_js_1.CommunityController.getMyRewards);
exports.apiRouter.get('/rewards/leaderboard', communityController_js_1.CommunityController.getLeaderboard);
// 8. Notifications
exports.apiRouter.get('/notifications', auth_js_1.authenticate, notificationsController_js_1.NotificationsController.getNotifications);
exports.apiRouter.patch('/notifications/:id/read', auth_js_1.authenticate, notificationsController_js_1.NotificationsController.markAsRead);
exports.apiRouter.patch('/notifications/read-all', auth_js_1.authenticate, notificationsController_js_1.NotificationsController.markAllAsRead);
// 9. Citizen Support
exports.apiRouter.post('/support/tickets', auth_js_1.authenticate, supportController_js_1.SupportController.createTicket);
exports.apiRouter.get('/support/tickets', auth_js_1.authenticate, supportController_js_1.SupportController.getTickets);
exports.apiRouter.get('/support/tickets/:id', auth_js_1.authenticate, supportController_js_1.SupportController.getTicketById);
exports.apiRouter.post('/support/tickets/:id/messages', auth_js_1.authenticate, supportController_js_1.SupportController.addMessage);
