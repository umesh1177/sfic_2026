import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { store } from '../data/store.js';
import { Profile, UserRole } from '../types/index.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'clean-navsari-jwt-secret-key-2026-sih';

export interface AuthenticatedRequest extends Request {
  user?: Profile;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication token required'
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: UserRole };
    let profile = store.profiles.find(p => p.id === decoded.userId);
    if (!profile) {
      const w = (store.workers || []).find(w => w.user_id === decoded.userId || w.id === decoded.userId);
      if (w) {
        profile = {
          id: w.user_id || w.id,
          full_name: w.full_name,
          phone: w.phone,
          username: w.username || w.worker_code,
          preferred_language: 'gu',
          locality: w.ward_name || 'Dudhiya Talao Ward 3',
          address: 'Navsari Municipal Staff Quarters',
          is_active: true,
          role: 'worker',
          created_at: w.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        store.profiles.push(profile);
      }
      const c = (store.communities || []).find(c => c.user_id === decoded.userId || c.id === decoded.userId);
      if (c) {
        profile = {
          id: c.user_id || c.id,
          full_name: c.head_name,
          phone: c.phone,
          email: c.email,
          username: c.username || c.email,
          preferred_language: 'en',
          locality: c.locality || 'Dudhiya Talao',
          address: c.address || 'Navsari',
          is_active: true,
          role: 'community_head',
          created_at: c.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        store.profiles.push(profile);
      }
    }

    if (!profile || !profile.is_active) {
      res.status(401).json({
        success: false,
        error: 'Account not found or inactive'
      });
      return;
    }

    req.user = profile;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired session token'
    });
  }
}

export function authorizeRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Access denied: insufficient civic permissions'
      });
      return;
    }
    next();
  };
}
