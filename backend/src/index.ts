import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { apiRouter } from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite dev server (e.g. localhost:5173 / localhost:3000)
app.use(cors({
  origin: true, // Echo origin to allow development on localhost / ngrok / mobile testing
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key']
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Global Rate Limiter
const apiLimiter = rateLimit({
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
    service: 'My Clean Navsari - Municipal Citizen Backend',
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

app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`  MY CLEAN NAVSARI CITIZEN BACKEND (SIH PS000089)`);
  console.log(`  Navsari Municipal Corporation, Gujarat`);
  console.log(`  Server listening on: http://localhost:${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`================================================================`);
});
