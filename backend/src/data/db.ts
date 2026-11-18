import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Look for .env in current directory, backend/.env, or parent
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

// PostgreSQL Connection Pool (supports both local dev and Render/Cloud SSL PostgreSQL)
const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5433/my_clean_navsari';

const isLocalDb =
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1') ||
  connectionString.includes('::1');

const forceNoSsl =
  process.env.DB_SSL === 'false' ||
  process.env.PGSSLMODE === 'disable' ||
  connectionString.includes('sslmode=disable');

const useSsl =
  !forceNoSsl &&
  (process.env.DB_SSL === 'true' ||
    process.env.PGSSLMODE === 'require' ||
    connectionString.includes('sslmode=require') ||
    connectionString.includes('render.com') ||
    (!isLocalDb && process.env.NODE_ENV === 'production') ||
    !isLocalDb);

export const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

// Prevent unhandled idle client errors on cloud PostgreSQL drops (e.g., Render free DB)
pool.on('error', (err) => {
  console.warn('[POSTGRES POOL WARN] Idle client error:', err.message);
});

let isConnected = false;

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT current_database(), current_user, version()');
    client.release();
    isConnected = true;
    console.log(`[POSTGRES] Connected to database: ${res.rows[0].current_database} as user: ${res.rows[0].current_user}`);
    return true;
  } catch (err: any) {
    isConnected = false;
    console.log(`[POSTGRES NOTICE] Not connected to live PostgreSQL (${err.message}). Using high-performance in-memory persistence store.`);
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}

