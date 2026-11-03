import { Response } from 'express';
import { store } from '../data/store.js';
import { DbRepository } from '../data/dbRepository.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class CommunityController {
  /**
   * GET /api/challenges
   */
  public static async getChallenges(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const citizenId = req.user?.id;
      const challenges = store.challenges.map(ch => ({
        ...ch,
        is_joined: citizenId ? store.challengeParticipants.some(p => p.challenge_id === ch.id && p.citizen_id === citizenId) : false
      }));

      res.status(200).json({
        success: true,
        data: challenges
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/challenges/:id/join
   */
  public static async joinChallenge(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const challenge = store.challenges.find(c => c.id === id);
      if (!challenge) {
        res.status(404).json({ success: false, error: 'Challenge not found' });
        return;
      }

      const alreadyJoined = store.challengeParticipants.some(
        p => p.challenge_id === challenge.id && p.citizen_id === req.user!.id
      );

      if (alreadyJoined) {
        res.status(400).json({ success: false, error: 'You are already participating in this challenge' });
        return;
      }

      store.challengeParticipants.push({
        challenge_id: challenge.id,
        citizen_id: req.user.id,
        progress: 0
      });

      challenge.participants_count += 1;

      res.status(200).json({
        success: true,
        message: 'Successfully joined community challenge!',
        data: {
          challenge_id: challenge.id,
          is_joined: true
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/rewards/my
   */
  public static async getMyRewards(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const citizenId = req.user?.id;
      const userRewards = citizenId ? store.citizenRewards.filter(r => r.citizen_id === citizenId) : [];

      const rewardsWithStatus = store.rewards.map(r => {
        const earned = userRewards.find(ur => ur.reward_id === r.id);
        return {
          ...r,
          is_earned: Boolean(earned),
          awarded_at: earned?.awarded_at
        };
      });

      const totalPoints = rewardsWithStatus
        .filter(r => r.is_earned)
        .reduce((sum, r) => sum + r.points, 0);

      res.status(200).json({
        success: true,
        data: {
          rewards: rewardsWithStatus,
          total_points: totalPoints,
          badges_count: rewardsWithStatus.filter(r => r.is_earned).length
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/rewards/leaderboard
   */
  public static async getLeaderboard(_req: AuthenticatedRequest, res: Response): Promise<void> {
    const leaderboard = [
      {
        rank: 1,
        citizen_name: 'Dr. Pravin Desai',
        ward_name: 'Ward 12 (NAU Campus)',
        points: 1850,
        resolved_count: 14,
        badges_count: 4,
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
      },
      {
        rank: 2,
        citizen_name: 'Meera Trivedi',
        ward_name: 'Ward 3 (Dudhiya Talao)',
        points: 1420,
        resolved_count: 11,
        badges_count: 3,
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
      },
      {
        rank: 3,
        citizen_name: 'Harshil Mehta',
        ward_name: 'Ward 3 (Ashapuri)',
        points: 1150,
        resolved_count: 8,
        badges_count: 3,
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
      },
      {
        rank: 4,
        citizen_name: 'Rajesh Solanki',
        ward_name: 'Ward 1 (Lunsikui)',
        points: 980,
        resolved_count: 6,
        badges_count: 2,
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'
      },
      {
        rank: 5,
        citizen_name: 'Falguni Vashi',
        ward_name: 'Ward 8 (Madhumati)',
        points: 750,
        resolved_count: 5,
        badges_count: 2,
        avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80'
      }
    ];

    res.status(200).json({
      success: true,
      data: leaderboard
    });
  }

  /**
   * GET /api/community/recognition-posts
   */
  public static async getRecognitionPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const citizenId = req.user?.id;
      const posts = await DbRepository.getRecognitionPosts(citizenId);
      res.status(200).json({
        success: true,
        data: posts
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/community/recognition-posts/:id/like
   */
  public static async togglePostLike(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const result = await DbRepository.togglePostLike(id, req.user.id);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/community/recognition-posts/:id/comments
   */
  public static async addPostComment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { comment_text } = req.body;
      if (!comment_text || !comment_text.trim()) {
        res.status(400).json({ success: false, error: 'Comment text is required' });
        return;
      }

      const comment = await DbRepository.addPostComment(id, req.user.id, req.user.full_name || 'Citizen', comment_text.trim());
      res.status(201).json({
        success: true,
        data: comment
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/community/recognition-posts
   */
  public static async createRecognitionPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const {
        hero_name,
        hero_role,
        badge_title,
        title,
        description,
        ward_number,
        ward_name,
        achievement_stats,
        image_url,
        before_image_url,
        after_image_url,
        after_photos = []
      } = req.body;

      if (!hero_name || !title || !description) {
        res.status(400).json({ success: false, error: 'Hero name, title, and description are required' });
        return;
      }

      const effectivePhotos = Array.isArray(after_photos) && after_photos.length > 0
        ? after_photos
        : image_url
        ? [image_url]
        : [];

      const primaryImage = effectivePhotos[0] || image_url || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80';

      const newPost = await DbRepository.createRecognitionPost({
        author_name: req.user.full_name || 'Navsari Municipal Corporation',
        author_role: req.user.role === 'ward_officer' ? 'Ward Officer · Field Operations' : 'NMC Swachhata Cell & Citizen Community',
        ward_number: Number(ward_number || 3),
        ward_name: ward_name || 'Ward 3 - Dudhiya Talao',
        hero_name,
        hero_role: hero_role || 'Civic Cleanliness Champion',
        badge_title: badge_title || 'Community Spotlight',
        title,
        description,
        achievement_stats: achievement_stats || 'Civic Transformation Milestone',
        image_url: primaryImage,
        before_image_url: before_image_url || undefined,
        after_image_url: primaryImage,
        after_photos: effectivePhotos
      });

      res.status(201).json({
        success: true,
        data: newPost
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
