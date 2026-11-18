import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { apiRouter } from './routes/api.js';
import { checkDatabaseConnection } from './data/db.js';
import { ensureDatabaseInitialized } from './data/bootstrapDb.js';
import { DbRepository } from './data/dbRepository.js';

import path from 'path';
import fs from 'fs';

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(process.cwd(), '..', 'backend', '.env')
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Trust Render / reverse proxy X-Forwarded-For headers (required for express-rate-limit in production)
app.set('trust proxy', 1);

// Enable CORS for frontend Vite dev server (e.g. localhost:5173 / localhost:3000)
app.use(cors({
  origin: true, // Echo origin to allow development on localhost / ngrok / mobile testing
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key']
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Global Rate Limiter (Relaxed for dev/testing to prevent 429 lockout)
const apiLimiter = rateLimit({
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
app.use('/api', apiRouter);

// Global 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
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
  await checkDatabaseConnection();
  await ensureDatabaseInitialized();
  await DbRepository.initializeWorkerAndTeamTables();
});

export { app };
