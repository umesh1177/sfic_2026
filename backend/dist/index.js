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
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 5000;
// Enable CORS for frontend Vite dev server (e.g. localhost:5173 / localhost:3000)
app.use((0, cors_1.default)({
    origin: true, // Echo origin to allow development on localhost / ngrok / mobile testing
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key']
}));
app.use(express_1.default.json({ limit: '15mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '15mb' }));
// Global Rate Limiter
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Limit each IP to 300 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests from this client. Please slow down.'
    }
});
app.use('/api', apiLimiter);
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
app.listen(PORT, async () => {
    console.log(`================================================================`);
    console.log(`  SWACHH SETU CITIZEN BACKEND (SIH PS000089)`);
    console.log(`  Navsari Municipal Corporation, Gujarat`);
    console.log(`  Server listening on: http://localhost:${PORT}`);
    console.log(`  Health Check: http://localhost:${PORT}/api/health`);
    console.log(`================================================================`);
    await (0, db_js_1.checkDatabaseConnection)();
});
