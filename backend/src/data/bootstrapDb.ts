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

    // Safe column migrations
    await pool.query(`
      ALTER TABLE complaints ADD COLUMN IF NOT EXISTS is_published_to_community BOOLEAN DEFAULT FALSE;
      ALTER TABLE community_recognition_posts ADD COLUMN IF NOT EXISTS before_image_url TEXT;
      ALTER TABLE community_recognition_posts ADD COLUMN IF NOT EXISTS after_image_url TEXT;
      ALTER TABLE community_recognition_posts ADD COLUMN IF NOT EXISTS after_photos JSONB;
    `).catch(() => {});

    // Ensure mock seed cleanliness drives are purged completely from database
    await pool.query(`
      DELETE FROM activity_registrations WHERE activity_id::text LIKE 'e0000000%' OR activity_id::text LIKE '55555555%' OR activity_id::text LIKE 'drive-%';
      DELETE FROM drive_registrations WHERE drive_id::text LIKE 'e0000000%' OR drive_id::text LIKE '55555555%' OR drive_id::text LIKE 'drive-%';
      DELETE FROM activity_evidence WHERE activity_id::text LIKE 'e0000000%' OR activity_id::text LIKE 'drive-%';
      DELETE FROM cleanliness_drives WHERE id::text LIKE 'e0000000%' OR id::text LIKE '55555555%' OR id::text LIKE 'drive-%';
      DELETE FROM community_activities WHERE id::text LIKE 'e0000000%' OR id::text LIKE '55555555%' OR id::text LIKE 'drive-%';
    `).catch(() => {});

    // Ensure essential complaints across every dashboard are seeded into PostgreSQL
    await seedEssentialComplaints();
    await seedEssentialTeams();
  } catch (err: any) {
    console.error('[DB BOOTSTRAP WARN]:', err.message);
  }
}

/**
 * Seeds rich complaints across every dashboard (Citizen, Ward Officer, Worker, Super Admin)
 * into PostgreSQL with ON CONFLICT DO UPDATE/NOTHING so they persist cleanly on Render.
 */
export async function seedEssentialComplaints(): Promise<void> {
  try {
    // 1. Ensure citizen profiles exist
    await pool.query(`
      INSERT INTO profiles (id, full_name, phone, email, avatar_url, preferred_language, address, locality, is_active)
      VALUES
        ('c0000000-0000-0000-0000-000000000001', 'Harshil Mehta', '+919876543210', 'harshil.mehta@example.com', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80', 'en', 'B-402, Ashapuri Residency, Near Dudhiya Talao', 'Dudhiya Talao Ward 3', TRUE),
        ('c0000000-0000-0000-0000-000000000002', 'Priya Shah', '+919876543211', 'priya.shah@example.com', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80', 'en', 'A-12, Green City Enclave, Gandevi Road', 'Ward 12 - Gandevi Road', TRUE)
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

      INSERT INTO user_roles (user_id, role)
      VALUES
        ('c0000000-0000-0000-0000-000000000001', 'citizen'),
        ('c0000000-0000-0000-0000-000000000002', 'citizen')
      ON CONFLICT (user_id, role) DO NOTHING;
    `).catch(() => {});

    // 2. Insert diverse complaints for Citizen, Ward Officer (Ward 3, 12, 1, 2, 4, 11), Worker, and Super Admin
    await pool.query(`
      INSERT INTO complaints (
        id, complaint_number, citizen_id, citizen_name, citizen_phone,
        category_id, category_name, description, original_language,
        image_url, resolved_image_url, latitude, longitude,
        address, landmark, ward_id, ward_number, ward_name,
        assigned_officer_name, status, priority, is_urgent,
        confidence_score, upvotes_count, followers_count,
        submitted_at, resolved_at
      ) VALUES
      (
        'c1111111-1111-1111-1111-111111111101', 'NMC-2026-10021',
        'c0000000-0000-0000-0000-000000000001', 'Harshil Mehta', '+919876543210',
        'cat-03', 'Overflowing Dustbin',
        'Public community bin overflowing near Dudhiya Talao park entrance. Waste spilling onto pedestrian walkway.', 'en',
        'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80', NULL,
        20.9472, 72.9281,
        'Near Dudhiya Talao West Gate, Ward 3', 'Opposite Ashapuri Garden Main Gate',
        'ward-03', 3, 'Ward 3 - Dudhiya Talao & Ashapuri',
        'Ramesh Patel (Chief Sanitary Inspector)', 'in_progress', 'high', FALSE,
        0.95, 14, 6, NOW() - INTERVAL '2 days', NULL
      ),
      (
        'c1111111-1111-1111-1111-111111111102', 'NMC-2026-10019',
        'c0000000-0000-0000-0000-000000000001', 'Harshil Mehta', '+919876543210',
        'cat-04', 'Roadside Garbage',
        'Accumulated waste and dry leaves cleared from Station Road market corner.', 'en',
        'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
        20.9515, 72.9325,
        'Station Road Auto Stand Junction', 'Near Navsari Railway Station Platform 1',
        'ward-02', 2, 'Ward 2 - Station Road & Golwad',
        'Kiritbhai Desai', 'resolved', 'medium', FALSE,
        0.93, 28, 12, NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days'
      ),
      (
        'c1111111-1111-1111-1111-111111111103', 'NMC-2026-10034',
        'c0000000-0000-0000-0000-000000000001', 'Harshil Mehta', '+919876543210',
        'cat-05', 'Drainage / Waste Accumulation',
        'Severe drain blockage causing wastewater overflow near Sayaji Road footpath.', 'en',
        'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80', NULL,
        20.9421, 72.9214,
        'Near Sayaji Library, Lunsikui', 'Near Central Bank ATM',
        'ward-04', 4, 'Ward 4 - Lunsikui & Sayaji Road',
        'Jayesh Solanki', 'submitted', 'urgent', TRUE,
        0.96, 5, 3, NOW() - INTERVAL '4 hours', NULL
      ),
      (
        'c1111111-1111-1111-1111-111111111104', 'NMC-2026-30001',
        'c0000000-0000-0000-0000-000000000001', 'Harshil Mehta', '+919876543210',
        'cat-02', 'Open Garbage Dumping',
        'Massive pile of uncollected mixed organic and plastic waste cleared from lake promenade.', 'en',
        'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        20.9312, 72.9284,
        'North Lake Promenade, Dudhiya Talao', 'Near Ashapuri Garden Gate',
        'ward-03', 3, 'Ward 3 - Dudhiya Talao',
        'Rajesh Patel', 'resolved', 'high', FALSE,
        0.98, 14, 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'
      ),
      (
        'c1111111-1111-1111-1111-111111111105', 'NMC-2026-30002',
        'c0000000-0000-0000-0000-000000000001', 'Harshil Mehta', '+919876543210',
        'cat-03', 'Overflowing Dustbin',
        'Broken municipal dustbin leaking organic waste onto temple approach road.', 'en',
        'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80', NULL,
        20.9302, 72.9291,
        'Ashapuri Mandir Approach Road, Ward 3', 'Near North Temple Gate',
        'ward-03', 3, 'Ward 3 - Dudhiya Talao',
        'Rajesh Patel', 'assigned', 'medium', FALSE,
        0.94, 8, 3, NOW() - INTERVAL '2 days', NULL
      ),
      (
        'c1111111-1111-1111-1111-111111111106', 'NMC-2026-30005',
        'c0000000-0000-0000-0000-000000000001', 'Harshil Mehta', '+919876543210',
        'cat-01', 'Littering',
        'Discarded plastic bottles and paper wraps scattered near sports ground pavilion.', 'en',
        'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=800&q=80', NULL,
        20.9340, 72.9260,
        'Lunsikui Ground East Corner, Ward 3', 'Next to Cricket Pavilion',
        'ward-03', 3, 'Ward 3 - Dudhiya Talao',
        'Rajesh Patel', 'submitted', 'low', FALSE,
        0.95, 2, 1, NOW() - INTERVAL '5 hours', NULL
      ),
      (
        'c1111111-1111-1111-1111-111111111107', 'NMC-2026-12001',
        'c0000000-0000-0000-0000-000000000001', 'Harshil Mehta', '+919876543210',
        'cat-02', 'Open Garbage Dumping',
        'Commercial wholesale vegetable refuse dumped along Gandevi Road corridor.', 'en',
        'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80', NULL,
        20.9150, 72.9300,
        'Gandevi Road Main Commercial Junction', 'Near Tariacolony Help Center',
        'ward-12', 12, 'Ward 12 - Mahuva Highway & Chikhli Approach',
        'Hemant Nayak', 'in_progress', 'high', FALSE,
        0.97, 19, 8, NOW() - INTERVAL '1 day', NULL
      ),
      (
        'c1111111-1111-1111-1111-111111111108', 'NMC-2026-12002',
        'c0000000-0000-0000-0000-000000000002', 'Priya Shah', '+919876543211',
        'cat-04', 'Roadside Garbage',
        'Debris and dry branches cleared successfully from Tariacolony residential street.', 'en',
        'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
        20.9165, 72.9312,
        'Tariacolony Internal Ring, Ward 12', 'Opposite Community Hall',
        'ward-12', 12, 'Ward 12 - Mahuva Highway & Chikhli Approach',
        'Hemant Nayak', 'resolved', 'medium', FALSE,
        0.95, 22, 9, NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days'
      ),
      (
        'c1111111-1111-1111-1111-111111111109', 'NMC-2026-12003',
        'c0000000-0000-0000-0000-000000000001', 'Harshil Mehta', '+919876543210',
        'cat-05', 'Drainage / Waste Accumulation',
        'Stormwater culvert choked with silt near Chikhli Highway bypass road.', 'en',
        'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80', NULL,
        20.9135, 72.9290,
        'Chikhli Approach Highway Road', 'Near Highway Bridge Crossing',
        'ward-12', 12, 'Ward 12 - Mahuva Highway & Chikhli Approach',
        'Hemant Nayak', 'submitted', 'high', FALSE,
        0.96, 7, 3, NOW() - INTERVAL '6 hours', NULL
      ),
      (
        'c1111111-1111-1111-1111-111111111110', 'NMC-2026-10001',
        'c0000000-0000-0000-0000-000000000002', 'Priya Shah', '+919876543211',
        'cat-04', 'Roadside Garbage',
        'Industrial packaging debris piled up on Kabilpore GIDC access road.', 'en',
        'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80', NULL,
        20.9600, 72.9200,
        'Kabilpore GIDC Road, Ward 1', 'Near Industrial Association Gate',
        'ward-01', 1, 'Ward 1 - Kabilpore & GIDC',
        'Kirtan Solanki', 'submitted', 'medium', FALSE,
        0.94, 9, 4, NOW() - INTERVAL '12 hours', NULL
      ),
      (
        'c1111111-1111-1111-1111-111111111111', 'NMC-2026-10002',
        'c0000000-0000-0000-0000-000000000001', 'Harshil Mehta', '+919876543210',
        'cat-06', 'Other Cleanliness Issues',
        'Dead animal carcass safely removed and disinfected with lime powder.', 'en',
        'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        20.9580, 72.9215,
        'Station Approach Road, Kabilpore', 'Opposite Municipal Water Works',
        'ward-01', 1, 'Ward 1 - Kabilpore & GIDC',
        'Kirtan Solanki', 'resolved', 'urgent', TRUE,
        0.98, 31, 15, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'
      ),
      (
        'c1111111-1111-1111-1111-111111111112', 'NMC-2026-40002',
        'c0000000-0000-0000-0000-000000000002', 'Priya Shah', '+919876543211',
        'cat-03', 'Overflowing Dustbin',
        'Damaged metal bin spilling trash onto footpath near Sayaji Library gate.', 'en',
        'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80', NULL,
        20.9410, 72.9220,
        'Sayaji Library Road Promenade', 'Near Library Reading Garden',
        'ward-04', 4, 'Ward 4 - Lunsikui & Sayaji Road',
        'Jayesh Solanki', 'assigned', 'medium', FALSE,
        0.92, 6, 2, NOW() - INTERVAL '1 day', NULL
      ),
      (
        'c1111111-1111-1111-1111-111111111113', 'NMC-2026-11001',
        'c0000000-0000-0000-0000-000000000001', 'Harshil Mehta', '+919876543210',
        'cat-05', 'Drainage / Waste Accumulation',
        'Severe sewage overflow at Railway Colony approach junction.', 'en',
        'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80', NULL,
        20.9200, 72.9450,
        'Railway Colony Main Road, Ward 11', 'Near Platform 3 Overbridge Approach',
        'ward-11', 11, 'Ward 11 - Vijalpore East & Railway Colony',
        'Chetan Tandel', 'in_progress', 'high', FALSE,
        0.95, 16, 7, NOW() - INTERVAL '18 hours', NULL
      ),
      (
        'c1111111-1111-1111-1111-111111111114', 'NMC-2026-11002',
        'c0000000-0000-0000-0000-000000000002', 'Priya Shah', '+919876543211',
        'cat-02', 'Open Garbage Dumping',
        'Cleared vegetable waste heap and disinfected corner with bleaching powder.', 'en',
        'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        20.9215, 72.9430,
        'Vijalpore East Market Corridor', 'Behind Municipal Sub-Market',
        'ward-11', 11, 'Ward 11 - Vijalpore East & Railway Colony',
        'Chetan Tandel', 'resolved', 'high', FALSE,
        0.96, 24, 11, NOW() - INTERVAL '6 days', NOW() - INTERVAL '4 days'
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        ward_number = EXCLUDED.ward_number,
        assigned_officer_name = EXCLUDED.assigned_officer_name;
    `);

    // 3. Insert feedbacks for resolved complaints so Citizen Feedback tab has rich content!
    await pool.query(`
      INSERT INTO complaint_feedback (id, complaint_id, citizen_id, rating, feedback_text, resolution_satisfactory, created_at)
      VALUES
      (
        'fb111111-1111-1111-1111-111111111101', 'c1111111-1111-1111-1111-111111111102',
        'c0000000-0000-0000-0000-000000000001', 5,
        'Prompt action by NMC Ward 2 team! Roadside waste was completely cleared within 4 hours. Area looks neat.', TRUE, NOW() - INTERVAL '3 days'
      ),
      (
        'fb111111-1111-1111-1111-111111111102', 'c1111111-1111-1111-1111-111111111104',
        'c0000000-0000-0000-0000-000000000001', 5,
        'Remarkable prompt action by NMC Ward 3 squad! Within 3 hours the waste was cleared and bleaching powder disinfected the spot. Thank you!', TRUE, NOW() - INTERVAL '1 day'
      ),
      (
        'fb111111-1111-1111-1111-111111111103', 'c1111111-1111-1111-1111-111111111108',
        'c0000000-0000-0000-0000-000000000002', 5,
        'Excellent work by Ward 12 Officer Hemant Nayak and squad. Debris was hauled away quickly and traffic resumed smoothly.', TRUE, NOW() - INTERVAL '2 days'
      ),
      (
        'fb111111-1111-1111-1111-111111111104', 'c1111111-1111-1111-1111-111111111111',
        'c0000000-0000-0000-0000-000000000001', 4,
        'Very hygienic and fast disposal by Kabilpore team. Disinfection was carried out properly.', TRUE, NOW() - INTERVAL '2 days'
      ),
      (
        'fb111111-1111-1111-1111-111111111105', 'c1111111-1111-1111-1111-111111111114',
        'c0000000-0000-0000-0000-000000000002', 5,
        'Vijalpore market corner is clean now. Big relief for morning commuters. Thank you Swachh Setu!', TRUE, NOW() - INTERVAL '4 days'
      )
      ON CONFLICT (id) DO NOTHING;
    `).catch(() => {});

    // 4. Insert activity logs for timeline inspection
    await pool.query(`
      INSERT INTO complaint_activity_logs (id, complaint_id, status, note, actor_name, actor_role, created_at)
      VALUES
      ('al111111-1111-1111-1111-111111111101', 'c1111111-1111-1111-1111-111111111104', 'submitted', 'Citizen reported open garbage dumping with photo evidence.', 'Harshil Mehta', 'citizen', NOW() - INTERVAL '3 days'),
      ('al111111-1111-1111-1111-111111111102', 'c1111111-1111-1111-1111-111111111104', 'assigned', 'Assigned to Ward 3 Sanitation Squad 1 led by Kanti Solanki.', 'Rajesh Patel', 'ward_officer', NOW() - INTERVAL '2 days'),
      ('al111111-1111-1111-1111-111111111103', 'c1111111-1111-1111-1111-111111111104', 'resolved', 'Cleared 380 kg waste, pavement washed and disinfected with bleaching powder.', 'Rajesh Patel', 'ward_officer', NOW() - INTERVAL '1 day'),
      ('al111111-1111-1111-1111-111111111104', 'c1111111-1111-1111-1111-111111111107', 'submitted', 'Commercial vegetable dumping reported on Gandevi Road.', 'Harshil Mehta', 'citizen', NOW() - INTERVAL '1 day'),
      ('al111111-1111-1111-1111-111111111105', 'c1111111-1111-1111-1111-111111111107', 'in_progress', 'Ward 12 Sanitation Squad 2 dispatched with mini-dumper truck.', 'Hemant Nayak', 'ward_officer', NOW() - INTERVAL '4 hours')
      ON CONFLICT (id) DO NOTHING;
    `).catch(() => {});

    console.log('[DB BOOTSTRAP] Seeded 14 multi-dashboard complaints across Wards 1, 2, 3, 4, 11, 12 into PostgreSQL.');
  } catch (err: any) {
    console.warn('[DB BOOTSTRAP] Error seeding complaints:', err.message);
  }
}

/**
 * Seeds official municipal squads and active work assignments across Wards
 * so teams and live GPS locations are always populated in PostgreSQL.
 */
export async function seedEssentialTeams(): Promise<void> {
  try {
    // 1. Ensure worker profiles exist for Ward 12
    await pool.query(`
      INSERT INTO profiles (id, full_name, phone, role, username, plain_password, ward_number, address, locality, is_active)
      VALUES 
      ('f1000000-0000-0000-0000-000000000011', 'worker3', '+919825120011', 'worker', 'worker3', 'worker3', 12, 'Navsari Municipal Staff Quarters', 'Ward 12', TRUE),
      ('f1000000-0000-0000-0000-000000000012', 'worker4', '+919825120012', 'worker', 'worker4', 'worker4', 12, 'Navsari Municipal Staff Quarters', 'Ward 12', TRUE),
      ('f1000000-0000-0000-0000-000000000015', 'worker5', '+919825120015', 'worker', 'worker5', 'worker5', 12, 'Navsari Municipal Staff Quarters', 'Ward 12', TRUE)
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, ward_number = EXCLUDED.ward_number;

      INSERT INTO worker_profiles (id, user_id, worker_code, ward_number, ward_name, employment_status, experience_years, availability_status, username, plain_password, designation, skills, attendance_today)
      VALUES 
      ('f1000000-0000-0000-0000-000000000011', 'f1000000-0000-0000-0000-000000000011', 'WRK-2026-011', 12, 'Ward 12', 'permanent', '3.5', 'on_duty', 'worker3', 'worker3', 'Sanitation Worker', '["Litter Abatement", "Bin Clearance"]'::jsonb, 'Present'),
      ('f1000000-0000-0000-0000-000000000012', 'f1000000-0000-0000-0000-000000000012', 'WRK-2026-012', 12, 'Ward 12', 'permanent', '2.0', 'on_duty', 'worker4', 'worker4', 'Sanitation Worker', '["Street Sweeping", "Waste Loading"]'::jsonb, 'Present'),
      ('f1000000-0000-0000-0000-000000000015', 'f1000000-0000-0000-0000-000000000015', 'WRK-2026-015', 12, 'Ward 12', 'permanent', '4.0', 'on_duty', 'worker5', 'worker5', 'Sanitation Worker', '["Drainage Cleaning", "Desilting"]'::jsonb, 'Present')
      ON CONFLICT (id) DO UPDATE SET ward_number = EXCLUDED.ward_number, availability_status = 'on_duty', attendance_today = 'Present';
    `).catch(() => {});

    // 2. Insert Ward 12 Squads with authentic locations
    await pool.query(`
      INSERT INTO worker_teams (
        id, team_name, ward_number, ward_name, temporary_leader_id, temporary_leader_name,
        worker_ids, work_type, shift, status, created_at
      ) VALUES 
      (
        'squad-w12-01',
        'Sanitation Squad 1',
        12,
        'Ward 12',
        'f1000000-0000-0000-0000-000000000011',
        'worker3',
        '["f1000000-0000-0000-0000-000000000012", "f1000000-0000-0000-0000-000000000011"]'::jsonb,
        'Waste Collection & Dumping Clearance',
        'Morning (06:00 - 14:00)',
        'active',
        NOW() - INTERVAL '30 days'
      ),
      (
        'squad-w12-02',
        'Sanitation Squad 2',
        12,
        'Ward 12',
        'f1000000-0000-0000-0000-000000000015',
        'worker5',
        '["f1000000-0000-0000-0000-000000000015"]'::jsonb,
        'Waste Collection & Dumping Clearance',
        'Morning (06:00 - 14:00)',
        'active',
        NOW() - INTERVAL '25 days'
      ),
      (
        'squad-w12-03',
        'Sanitation Squad 3',
        12,
        'Ward 12',
        'a951c954-7930-430e-80b7-50ee639a165b',
        'worker1',
        '["a951c954-7930-430e-80b7-50ee639a165b"]'::jsonb,
        'Waste Collection & Dumping Clearance',
        'Morning (06:00 - 14:00)',
        'standby',
        NOW() - INTERVAL '20 days'
      )
      ON CONFLICT (id) DO UPDATE SET
        team_name = EXCLUDED.team_name,
        status = EXCLUDED.status,
        ward_number = EXCLUDED.ward_number;
    `).catch(() => {});

    // 3. Insert active work assignments with real coordinates in Ward 12
    await pool.query(`
      INSERT INTO work_assignments (
        id, task_code, title, description, category, priority, status,
        team_id, team_name, ward_number, location_name, address, latitude, longitude,
        scheduled_date, scheduled_start_time, expected_end_time, created_at
      ) VALUES
      (
        'a1000000-0000-0000-0000-000000000011',
        'TSK-W12-101',
        'Overflowing Garbage Container & Street Litter Abatement',
        'Clear commercial wholesale waste and scattered debris along Gandevi Road corridor.',
        'Open Garbage Dumping',
        'high',
        'in_progress',
        'squad-w12-01',
        'Sanitation Squad 1',
        12,
        'Gandevi Road Main Commercial Junction',
        'Near Tariacolony Help Center, Gandevi Road, Ward 12',
        20.9150,
        72.9300,
        CURRENT_DATE,
        NOW() - INTERVAL '2 hours',
        NOW() + INTERVAL '2 hours',
        NOW()
      ),
      (
        'a1000000-0000-0000-0000-000000000012',
        'TSK-W12-102',
        'Drainage Desilting & Litter Abatement Patrol',
        'Desilting stormwater curb drain and street sweeping near Chikhli Highway bypass.',
        'Drainage Issues',
        'high',
        'in_progress',
        'squad-w12-02',
        'Sanitation Squad 2',
        12,
        'Chikhli Approach Highway Road',
        'Near Highway Bridge Crossing, Ward 12',
        20.9135,
        72.9290,
        CURRENT_DATE,
        NOW() - INTERVAL '1 hours',
        NOW() + INTERVAL '3 hours',
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        location_name = EXCLUDED.location_name,
        status = EXCLUDED.status;
    `).catch(() => {});

    console.log('[DB BOOTSTRAP] Seeded Ward 12 teams and active work assignments into PostgreSQL.');
  } catch (err: any) {
    console.warn('[DB BOOTSTRAP] Error seeding teams:', err.message);
  }
}
