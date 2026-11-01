"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitizenController = void 0;
const store_js_1 = require("../data/store.js");
const dbRepository_js_1 = require("../data/dbRepository.js");
class CitizenController {
    /**
     * GET /api/citizen/dashboard
     */
    static async getDashboard(req, res) {
        try {
            const citizenId = req.user?.id || 'c0000000-0000-0000-0000-000000000001';
            const dashboardStats = await dbRepository_js_1.DbRepository.getDashboardStats(citizenId);
            const complaints = await dbRepository_js_1.DbRepository.getComplaints({});
            // Nearby cleanliness issues around Navsari
            const nearbyIssues = complaints.slice(0, 5).map(c => ({
                id: c.id,
                complaint_number: c.complaint_number,
                category_name: c.category_name,
                ward_name: c.location.ward_name,
                address: c.location.address,
                status: c.status,
                submitted_at: c.submitted_at,
                image_url: c.image_url
            }));
            // Ward cleanliness scores
            const wardScores = store_js_1.store.wards.map(w => ({
                ward_number: w.ward_number,
                ward_name: w.ward_name,
                score: w.cleanliness_score,
                officer: w.ward_officer_name
            }));
            // Community impact metrics
            const userRewards = citizenId ? store_js_1.store.citizenRewards.filter(r => r.citizen_id === citizenId) : [];
            const userDrives = citizenId ? store_js_1.store.driveRegistrations.filter(r => r.citizen_id === citizenId) : [];
            const userChallenges = citizenId ? store_js_1.store.challengeParticipants.filter(p => p.citizen_id === citizenId) : [];
            const communityImpact = {
                drives_joined: userDrives.length,
                rewards_earned: userRewards.length,
                active_challenges: userChallenges.length,
                civic_points: userRewards.length * 250 + userDrives.length * 100
            };
            // Recent notifications preview from PostgreSQL
            const allNotifs = await dbRepository_js_1.DbRepository.getNotifications(citizenId);
            const notifications = allNotifs.slice(0, 4);
            res.status(200).json({
                success: true,
                data: {
                    stats: dashboardStats.stats,
                    municipal_stats: dashboardStats.municipal_stats,
                    nearby_issues: nearbyIssues,
                    ward_scores: wardScores,
                    community_impact: communityImpact,
                    notifications
                }
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * GET /api/citizen/profile
     */
    static async getProfile(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }
        res.status(200).json({ success: true, data: req.user });
    }
    /**
     * PUT /api/citizen/profile
     */
    static async updateProfile(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const { full_name, email, address, locality, avatar_url } = req.body;
            const profile = store_js_1.store.profiles.find(p => p.id === req.user.id);
            if (!profile) {
                res.status(404).json({ success: false, error: 'Profile not found' });
                return;
            }
            if (full_name)
                profile.full_name = full_name.trim();
            if (email !== undefined)
                profile.email = email.trim();
            if (address !== undefined)
                profile.address = address.trim();
            if (locality !== undefined)
                profile.locality = locality.trim();
            if (avatar_url !== undefined)
                profile.avatar_url = avatar_url;
            profile.updated_at = new Date().toISOString();
            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: profile
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
    /**
     * PUT /api/citizen/preferences
     */
    static async updatePreferences(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }
            const { preferred_language } = req.body;
            const profile = store_js_1.store.profiles.find(p => p.id === req.user.id);
            if (!profile) {
                res.status(404).json({ success: false, error: 'Profile not found' });
                return;
            }
            if (preferred_language && ['en', 'gu', 'hi'].includes(preferred_language)) {
                profile.preferred_language = preferred_language;
            }
            profile.updated_at = new Date().toISOString();
            res.status(200).json({
                success: true,
                message: 'Preferences updated successfully',
                data: profile
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}
exports.CitizenController = CitizenController;
