"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
exports.authenticate = authenticate;
exports.authorizeRole = authorizeRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const store_js_1 = require("../data/store.js");
exports.JWT_SECRET = process.env.JWT_SECRET || 'clean-navsari-jwt-secret-key-2026-sih';
function authenticate(req, res, next) {
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
        const decoded = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
        let profile = store_js_1.store.profiles.find(p => p.id === decoded.userId);
        if (!profile) {
            const w = (store_js_1.store.workers || []).find(w => w.user_id === decoded.userId || w.id === decoded.userId);
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
                store_js_1.store.profiles.push(profile);
            }
            const c = (store_js_1.store.communities || []).find(c => c.user_id === decoded.userId || c.id === decoded.userId);
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
                store_js_1.store.profiles.push(profile);
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
    }
    catch {
        res.status(401).json({
            success: false,
            error: 'Invalid or expired session token'
        });
    }
}
function authorizeRole(allowedRoles) {
    return (req, res, next) => {
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
