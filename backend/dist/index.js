"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const api_js_1 = require("./routes/api.js");
const db_js_1 = require("./data/db.js");
const bootstrapDb_js_1 = require("./data/bootstrapDb.js");
const dbRepository_js_1 = require("./data/dbRepository.js");
const pushService_js_1 = require("./services/pushService.js");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const envPaths = [
    path_1.default.resolve(process.cwd(), '.env'),
    path_1.default.resolve(process.cwd(), 'backend', '.env'),
    path_1.default.resolve(process.cwd(), '..', 'backend', '.env')
];
for (const p of envPaths) {
    if (fs_1.default.existsSync(p)) {
        dotenv_1.default.config({ path: p });
        break;
    }
}
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const PORT = Number(process.env.PORT) || 5000;
// Trust Render / reverse proxy X-Forwarded-For headers (required for express-rate-limit in production)
app.set('trust proxy', 1);
// Enable CORS for frontend Vite dev server (e.g. localhost:5173 / localhost:3000)
app.use((0, cors_1.default)({
    origin: true, // Echo origin to allow development on localhost / ngrok / mobile testing
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key']
}));
app.use(express_1.default.json({ limit: '15mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '15mb' }));
// Global Rate Limiter (Relaxed for dev/testing to prevent 429 lockout)
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100000, // Very generous limit to avoid 429 lockouts during development/eval
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Never rate limit localhost or loopback in development
        const ip = req.ip || req.socket.remoteAddress || '';
        return ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('localhost') || process.env.NODE_ENV !== 'production';
    },
    message: {
        success: false,
        error: 'Too many requests from this client. Please slow down.'
    }
});
app.use('/api', apiLimiter);
// Root route for platform probes & quick verification
app.get('/', (_req, res) => {
    res.status(200).json({
        status: 'online',
        service: 'Swachh Setu - Municipal Citizen Backend',
        health: '/api/health',
        timestamp: new Date().toISOString()
    });
});
// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'Swachh Setu - Municipal Citizen Backend',
        sih_problem_statement: 'PS000089',
        timestamp: new Date().toISOString()
    });
});
// Mount consolidated REST routes
app.use('/api', api_js_1.apiRouter);
// Global 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found'
    });
});
// Global Error Handler
app.use((err, _req, res, _next) => {
    console.error('[UNHANDLED SERVER ERROR]:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal municipal server error' : err.message
    });
});
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`================================================================`);
    console.log(`  SWACHH SETU CITIZEN BACKEND (SIH PS000089)`);
    console.log(`  Navsari Municipal Corporation, Gujarat`);
    console.log(`  Server listening on: http://0.0.0.0:${PORT}`);
    console.log(`  Health Check: http://0.0.0.0:${PORT}/api/health`);
    console.log(`================================================================`);
    await (0, db_js_1.checkDatabaseConnection)();
    await (0, bootstrapDb_js_1.ensureDatabaseInitialized)();
    await dbRepository_js_1.DbRepository.initializeWorkerAndTeamTables();
    await pushService_js_1.PushService.initialize();
});
