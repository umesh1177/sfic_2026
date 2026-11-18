import fs from 'fs';
import path from 'path';
import { pool, isDbConnected } from './db.js';

function resolveDatabaseDir(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'database'),
    path.resolve(process.cwd(), '..', 'database'),
    path.resolve(process.cwd(), '..', '..', 'database')
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'init_complete_db.sql'))) {
      return dir;
    }
  }
  return null;
}

async function runSqlFile(dbDir: string, filename: string): Promise<boolean> {
  const filePath = path.join(dbDir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[DB BOOTSTRAP] SQL file not found, skipping: ${filePath}`);
    return false;
  }
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`[DB BOOTSTRAP] Running ${filename}...`);
  await pool.query(sql);
  console.log(`[DB BOOTSTRAP] Completed ${filename}.`);
  return true;
}

/**
 * Safely bootstraps a brand-new PostgreSQL database (such as a fresh Render PostgreSQL instance).
 * Uses `to_regclass` checks so existing production data is NEVER dropped or overwritten on redeploy.
 */
export async function ensureDatabaseInitialized(): Promise<void> {
  if (!isDbConnected()) {
    return;
  }

  const dbDir = resolveDatabaseDir();
  if (!dbDir) {
    console.log('[DB BOOTSTRAP] database/ SQL directory not found; skipping automatic SQL bootstrap.');
    return;
  }

  try {
    const check = await pool.query(`
      SELECT
        to_regclass('public.profiles') AS profiles_tbl,
        to_regclass('public.communities') AS communities_tbl,
        to_regclass('public.worker_profiles') AS workers_tbl,
        to_regclass('public.community_recognition_posts') AS posts_tbl
    `);

    const row = check.rows[0] || {};

    if (!row.profiles_tbl) {
      console.log('[DB BOOTSTRAP] Fresh database detected — initializing core schema & seed data...');
      await runSqlFile(dbDir, 'init_complete_db.sql');
    }

    if (!row.communities_tbl) {
      await runSqlFile(dbDir, 'community_head_schema.sql');
      await runSqlFile(dbDir, 'seed_community_head.sql');
    }

    if (!row.workers_tbl) {
      await runSqlFile(dbDir, 'worker_dashboard_schema.sql');
      await runSqlFile(dbDir, 'seed_worker_dashboard.sql');
    }

    if (!row.posts_tbl) {
      await runSqlFile(dbDir, 'create_community_posts.sql');
    }
  } catch (err: any) {
    console.error('[DB BOOTSTRAP WARN]:', err.message);
  }
}
