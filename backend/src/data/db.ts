import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

// PostgreSQL Connection Pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/my_clean_navsari',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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

