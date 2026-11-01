const { Pool } = require('./node_modules/pg');
const fs = require('fs');
const path = require('path');
require('./node_modules/dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5433/my_clean_navsari'
});

async function run() {
  try {
    const schemaFile = path.join(__dirname, '..', 'database', 'worker_dashboard_schema.sql');
    const seedFile = path.join(__dirname, '..', 'database', 'seed_worker_dashboard.sql');

    console.log('[WORKER MIGRATION] Applying worker dashboard schema...');
    const schemaSql = fs.readFileSync(schemaFile, 'utf8');
    await pool.query(schemaSql);
    console.log('[WORKER MIGRATION] Schema applied successfully.');

    console.log('[WORKER MIGRATION] Applying worker dashboard seed data...');
    const seedSql = fs.readFileSync(seedFile, 'utf8');
    await pool.query(seedSql);
    console.log('[WORKER MIGRATION SUCCESS] Worker Dashboard tables and seed data created!');

    const [desigs, wrks, assigns, atts, evs] = await Promise.all([
      pool.query('SELECT count(*) FROM worker_designations'),
      pool.query('SELECT count(*) FROM worker_profiles'),
      pool.query('SELECT count(*) FROM work_assignments'),
      pool.query('SELECT count(*) FROM worker_attendance'),
      pool.query('SELECT count(*) FROM work_evidence')
    ]);

    console.log(`[VERIFICATION] Designations: ${desigs.rows[0].count}, Workers: ${wrks.rows[0].count}, Tasks: ${assigns.rows[0].count}, Attendance: ${atts.rows[0].count}, Evidence: ${evs.rows[0].count}`);
  } catch (err) {
    console.error('[WORKER MIGRATION FAILED]:', err.message);
  } finally {
    await pool.end();
  }
}

run();

