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
        const profile = store_js_1.store.profiles.find(p => p.id === decoded.userId);
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
