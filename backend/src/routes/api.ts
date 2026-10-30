import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/authController.js';
import { CitizenController } from '../controllers/citizenController.js';
import { ComplaintsController } from '../controllers/complaintsController.js';
import { MapController } from '../controllers/mapController.js';
import { DrivesController } from '../controllers/drivesController.js';
import { CommunityController } from '../controllers/communityController.js';
import { SupportController } from '../controllers/supportController.js';
import { NotificationsController } from '../controllers/notificationsController.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { store } from '../data/store.js';

export const apiRouter = Router();

// Soft authentication for optional citizen endpoints
function softAuthenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    authenticate(req, _res, () => next());
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
apiRouter.post('/drives/:id/register', authenticate, DrivesController.registerForDrive);
apiRouter.delete('/drives/:id/register', authenticate, DrivesController.cancelRegistration);

// 7. Community Challenges & Rewards
apiRouter.get('/challenges', softAuthenticate, CommunityController.getChallenges);
apiRouter.post('/challenges/:id/join', authenticate, CommunityController.joinChallenge);
apiRouter.get('/rewards/my', softAuthenticate, CommunityController.getMyRewards);
apiRouter.get('/rewards/leaderboard', CommunityController.getLeaderboard);

// 8. Notifications
apiRouter.get('/notifications', authenticate, NotificationsController.getNotifications);
apiRouter.patch('/notifications/:id/read', authenticate, NotificationsController.markAsRead);
apiRouter.patch('/notifications/read-all', authenticate, NotificationsController.markAllAsRead);

// 9. Citizen Support
apiRouter.post('/support/tickets', authenticate, SupportController.createTicket);
apiRouter.get('/support/tickets', authenticate, SupportController.getTickets);
apiRouter.get('/support/tickets/:id', authenticate, SupportController.getTicketById);
apiRouter.post('/support/tickets/:id/messages', authenticate, SupportController.addMessage);
