const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5433/my_clean_navsari'
});

async function run() {
  try {
    const schemaFile = path.join(__dirname, '..', 'database', 'community_head_schema.sql');
    const seedFile = path.join(__dirname, '..', 'database', 'seed_community_head.sql');

    console.log('[MIGRATION] Applying community head schema...');
    const schemaSql = fs.readFileSync(schemaFile, 'utf8');
    await pool.query(schemaSql);
    console.log('[MIGRATION] Schema applied successfully.');

    console.log('[MIGRATION] Applying community head seed data...');
    const seedSql = fs.readFileSync(seedFile, 'utf8');
    await pool.query(seedSql);
    console.log('[MIGRATION SUCCESS] Community Head tables and seed data created!');

    const [comms, acts, regs, qs, evs] = await Promise.all([
      pool.query('SELECT count(*) FROM communities'),
      pool.query('SELECT count(*) FROM community_activities'),
      pool.query('SELECT count(*) FROM activity_registrations'),
      pool.query('SELECT count(*) FROM activity_questions'),
      pool.query('SELECT count(*) FROM activity_evidence')
    ]);

    console.log(`[VERIFICATION] Communities: ${comms.rows[0].count}, Activities: ${acts.rows[0].count}, Registrations: ${regs.rows[0].count}, Questions: ${qs.rows[0].count}, Evidence: ${evs.rows[0].count}`);
  } catch (err) {
    console.error('[COMMUNITY MIGRATION FAILED]:', err.message, err);
  } finally {
    await pool.end();
  }
}

run();
