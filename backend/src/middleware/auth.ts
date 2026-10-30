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
    const profile = store.profiles.find(p => p.id === decoded.userId);

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
