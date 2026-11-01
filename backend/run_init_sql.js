const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function init() {
  try {
    const sqlPath = path.join(__dirname, '..', 'database', 'init_complete_db.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('[MIGRATION] Executing database schema & seed into PostgreSQL...');
    await pool.query(sql);
    console.log('[MIGRATION SUCCESS] All tables created and seed data inserted!');

    const [comp, cat, prof, wards] = await Promise.all([
      pool.query('SELECT count(*) FROM complaints'),
      pool.query('SELECT count(*) FROM complaint_categories'),
      pool.query('SELECT count(*) FROM profiles'),
      pool.query('SELECT count(*) FROM wards')
    ]);

    console.log(`[VERIFICATION] Complaints: ${comp.rows[0].count}, Categories: ${cat.rows[0].count}, Profiles: ${prof.rows[0].count}, Wards: ${wards.rows[0].count}`);
  } catch (err) {
    console.error('[MIGRATION FAILED]:', err);
  } finally {
    await pool.end();
  }
}

init();

