const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runSeed() {
  console.log('[SEED] Connecting to PostgreSQL at', process.env.DATABASE_URL);
  const client = await pool.connect();

  try {
    // 0. Ensure all Key User Profiles Exist with valid UUIDs
    console.log('[SEED] Ensuring key profiles exist...');
    await client.query(`
      INSERT INTO profiles (id, full_name, phone, email, avatar_url, preferred_language, address, locality, is_active)
      VALUES
      (
        'c0000000-0000-0000-0000-000000000001',
        'Harshil Mehta',
        '+919876543210',
        'harshil.mehta@example.com',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        'en',
        'B-402, Ashapuri Residency, Near Dudhiya Talao',
        'Dudhiya Talao Ward 3',
        TRUE
      ),
      (
        'c0000000-0000-0000-0000-000000000002',
        'Ananya Patel',
        '+919876543212',
        'ananya.patel@example.com',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
        'gu',
        '14, Heritage Row, Madhumati',
        'Madhumati Ward 8',
        TRUE
      ),
      (
        'd0000000-0000-0000-0000-000000000003',
        'Rajesh Patel',
        '+919825130003',
        'ward3.officer@navsarimunicipal.gov.in',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
        'gu',
        'Ward 3 Administrative Office, Dudhiya Talao',
        'Dudhiya Talao Ward 3',
        TRUE
      ),
      (
        'd0000000-0000-0000-0000-000000000008',
        'Sunita Desai',
        '+919825130008',
        'ward8.officer@navsarimunicipal.gov.in',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
        'en',
        'Ward 8 Office, Madhumati',
        'Madhumati Ward 8',
        TRUE
      ),
      (
        'c0000000-0000-0000-0000-000000000099',
        'Rajesh Varma',
        '+919825100099',
        'rajesh.varma@navsarigreen.org',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
        'en',
        '12, Green Avenue, Dudhiya Talao',
        'Dudhiya Talao Ward 3',
        TRUE
      ),
      (
        'f1000000-0000-0000-0000-000000000001',
        'Kanti Solanki',
        '+919825120001',
        'kanti.solanki@navsarimunicipal.gov.in',
        'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=256&q=80',
        'gu',
        'Quarter 14, Municipal Staff Quarters, Dudhiya Talao',
        'Dudhiya Talao Ward 3',
        TRUE
      )
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

      -- Assign roles
      INSERT INTO user_roles (user_id, role) VALUES
      ('c0000000-0000-0000-0000-000000000001', 'citizen'),
      ('c0000000-0000-0000-0000-000000000002', 'citizen'),
      ('d0000000-0000-0000-0000-000000000003', 'ward_officer'),
      ('d0000000-0000-0000-0000-000000000008', 'ward_officer'),
      ('c0000000-0000-0000-0000-000000000099', 'community_head'),
      ('f1000000-0000-0000-0000-000000000001', 'sanitation_worker')
      ON CONFLICT (user_id, role) DO NOTHING;
    `);

    // 1. Run worker_dashboard_schema.sql
    const workerSchemaPath = path.join(__dirname, '..', 'database', 'worker_dashboard_schema.sql');
    if (fs.existsSync(workerSchemaPath)) {
      console.log('[SEED] Executing worker_dashboard_schema.sql...');
      await client.query(fs.readFileSync(workerSchemaPath, 'utf8'));
    }

    // 2. Run seed_worker_dashboard.sql
    const workerSeedPath = path.join(__dirname, '..', 'database', 'seed_worker_dashboard.sql');
    if (fs.existsSync(workerSeedPath)) {
      console.log('[SEED] Executing seed_worker_dashboard.sql...');
      await client.query(fs.readFileSync(workerSeedPath, 'utf8'));
    }

    // 3. Run community_head_schema.sql
    const commSchemaPath = path.join(__dirname, '..', 'database', 'community_head_schema.sql');
    if (fs.existsSync(commSchemaPath)) {
      console.log('[SEED] Executing community_head_schema.sql...');
      await client.query(fs.readFileSync(commSchemaPath, 'utf8'));
    }

    // 4. Run seed_community_head.sql
    const commSeedPath = path.join(__dirname, '..', 'database', 'seed_community_head.sql');
    if (fs.existsSync(commSeedPath)) {
      console.log('[SEED] Executing seed_community_head.sql...');
      await client.query(fs.readFileSync(commSeedPath, 'utf8'));
    }

    // 5. Run create_community_posts.sql
    const postsPath = path.join(__dirname, '..', 'database', 'create_community_posts.sql');
    if (fs.existsSync(postsPath)) {
      console.log('[SEED] Executing create_community_posts.sql...');
      await client.query(fs.readFileSync(postsPath, 'utf8'));
    }

    // 6. Ensure community_problems table and worker_teams table
    console.log('[SEED] Ensuring community_problems & worker_teams tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_problems (
        id VARCHAR(100) PRIMARY KEY,
        ward_number INT NOT NULL,
        ward_name VARCHAR(100),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        location_name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        latitude NUMERIC(10, 7) NOT NULL,
        longitude NUMERIC(10, 7) NOT NULL,
        action_plan TEXT NOT NULL,
        urgency VARCHAR(20) DEFAULT 'medium',
        estimated_volunteers_needed INT DEFAULT 15,
        suggested_equipment JSONB DEFAULT '[]'::jsonb,
        image_url TEXT,
        status VARCHAR(30) DEFAULT 'open',
        claimed_by_community_id VARCHAR(100),
        claimed_by_community_name VARCHAR(255),
        linked_activity_id VARCHAR(100),
        created_by VARCHAR(100),
        officer_name VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS worker_teams (
        id VARCHAR(100) PRIMARY KEY,
        team_name VARCHAR(150) NOT NULL,
        ward_number INTEGER DEFAULT 3,
        ward_name VARCHAR(150) DEFAULT 'Ward 3 - Dudhiya Talao',
        temporary_leader_id VARCHAR(100),
        temporary_leader_name VARCHAR(150),
        worker_ids JSONB DEFAULT '[]'::jsonb,
        shift VARCHAR(50) DEFAULT 'Morning (06:00 - 14:00)',
        status VARCHAR(50) DEFAULT 'active',
        active_task_code VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Insert Rich Community Problems
    console.log('[SEED] Seeding community_problems...');
    await client.query(`
      INSERT INTO community_problems (
        id, ward_number, ward_name, title, description, location_name, address,
        latitude, longitude, action_plan, urgency, estimated_volunteers_needed,
        suggested_equipment, image_url, status, claimed_by_community_id, claimed_by_community_name,
        linked_activity_id, created_by, officer_name
      ) VALUES 
      (
        'prob-01', 3, 'Ward 3 - Dudhiya Talao',
        'Plastic Chokepoint & Waste Accumulation at Ashapuri Lake Outflow',
        'Severe build-up of single-use plastics, beverage bottles, and non-biodegradable debris near the lake water overflow weir. Threatens local aquatic bird sanctuary and smells.',
        'Dudhiya Talao South Outflow Sluice',
        'South Lake Promenade, Near Ashapuri Mandir Garden Gate, Navsari',
        20.9298000, 72.9275000,
        'Deploy 25 volunteer grabbers with safety waders to clear 400kg plastic, place segregation net barriers, and install permanent warning signs.',
        'high', 25,
        '["Heavy-duty Rubber Gumboots", "Biohazard Trash Bags", "Litter Grabber Sticks", "Protective Cotton Gloves", "First-Aid Kit"]'::jsonb,
        'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
        'open', NULL, NULL, NULL,
        'd0000000-0000-0000-0000-000000000003', 'Rajesh Patel (Ward 3 Officer)'
      ),
      (
        'prob-02', 3, 'Ward 3 - Dudhiya Talao',
        'Overgrown Weeds, Dry Leaves & Paper Litter at Sayaji Library Lawn',
        'Historic library perimeter garden has overgrown invasive shrubs and wind-blown wrappers spoiling the scenic heritage reading atmosphere.',
        'Sayaji Vaibhav Public Library Compound',
        'Tower Road Heritage Enclave, Dudhiya Talao, Ward 3, Navsari',
        20.9325000, 72.9302000,
        'Conduct pruning, rake dry leaf foliage into municipal compost trenches, and sweep paved reading walkways.',
        'medium', 20,
        '["Garden Rakes", "Compost Collection Sacks", "Hand Pruners", "Brooms", "Reflective Jackets"]'::jsonb,
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        'claimed', 'b0000000-0000-0000-0000-000000000001', 'Navsari Green Warriors RWA', 'act-02',
        'd0000000-0000-0000-0000-000000000003', 'Rajesh Patel (Ward 3 Officer)'
      ),
      (
        'prob-03', 3, 'Ward 3 - Dudhiya Talao',
        'Old Textile Market Commercial Back Alley Debris Dump',
        'Discarded commercial packing sacks, fabric remnants, and cardboard cartons piled up along Lane 4 behind wholesale textile shops.',
        'Cloth Market Lane 4',
        'Near Ganeshsish Commercial Complex, Ward 3, Navsari',
        20.9305000, 72.9268000,
        'Segregate dry recyclables with local scrap traders and clear passage for municipal sweeping tractors.',
        'high', 15,
        '["Heavy-duty Brooms", "Wheelbarrows", "Cotton Face Masks", "Recycling Bags"]'::jsonb,
        'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
        'open', NULL, NULL, NULL,
        'd0000000-0000-0000-0000-000000000003', 'Rajesh Patel (Ward 3 Officer)'
      ),
      (
        'prob-04', 8, 'Ward 8 - Madhumati - Parsi Wad',
        'Heritage Parsi Wad Street Beautification & Anti-Littering Drive',
        'Historic colonial architectural street corners near Sohrab Baug accumulate tourist beverage cups and dried foliage.',
        'Sohrab Baug Heritage Gate',
        'Opposite Parsi Agiary Gate, Madhumati, Ward 8, Navsari',
        20.9620000, 72.9300000,
        'Install hand-painted terracotta dustbins, remove roadside plastic, and engage local heritage shopkeepers in zero-waste pledge.',
        'medium', 30,
        '["Color-coded Bins", "Sanitizing Spray", "Brooms", "Gardening Trowels"]'::jsonb,
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
        'open', NULL, NULL, NULL,
        'd0000000-0000-0000-0000-000000000008', 'Sunita Desai (Ward 8 Officer)'
      ),
      (
        'prob-05', 8, 'Ward 8 - Madhumati - Parsi Wad',
        'Madhumati Creek Plastic Waste Barrier & Silt Interception',
        'Creek embankment accumulates plastic wrappers and plastic polythene carrying into river mouth during heavy rains.',
        'Madhumati Creek Bridge',
        'Near Madhumati River Embankment, Ward 8, Navsari',
        20.9580000, 72.9250000,
        'Install floating trash booms and mobilize community volunteers on embankment cleaning.',
        'critical', 35,
        '["Floating Net Boom", "Long Hook Poles", "Safety Harnesses", "Heavy Gloves"]'::jsonb,
        'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=800&q=80',
        'claimed', 'b0000000-0000-0000-0000-000000000002', 'Rotary Club of Navsari Heritage', NULL,
        'd0000000-0000-0000-0000-000000000008', 'Sunita Desai (Ward 8 Officer)'
      )
      ON CONFLICT (id) DO UPDATE SET 
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        claimed_by_community_name = EXCLUDED.claimed_by_community_name;
    `);

    // 8. Seed Citizen Complaints across Ward 3 and Ward 8
    console.log('[SEED] Seeding citizen complaints across all statuses...');
    await client.query(`
      INSERT INTO complaints (
        id, complaint_number, citizen_id, citizen_name, citizen_phone, category_id, category_name,
        ward_id, ward_number, ward_name, address, landmark, latitude, longitude,
        description, status, priority, image_url, resolved_image_url,
        confidence_score, submitted_at, updated_at
      ) VALUES
      (
        'c0000000-0000-0000-0000-000000000010',
        'NMC-2026-30001',
        'c0000000-0000-0000-0000-000000000001',
        'Harshil Mehta',
        '+919876543210',
        'cat-01',
        'Open Garbage Dumping',
        'ward-03', 3, 'Ward 3 - Dudhiya Talao',
        'North Lake Promenade, Opposite Lake View Garden, Dudhiya Talao',
        'Near Ashapuri Garden Gate',
        20.9312000, 72.9284000,
        'Overflowing garbage bins with plastic bags and household waste scattered across the promenade.',
        'resolved', 'high',
        'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        98.5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'
      ),
      (
        'c0000000-0000-0000-0000-000000000020',
        'NMC-2026-30002',
        'c0000000-0000-0000-0000-000000000001',
        'Harshil Mehta',
        '+919876543210',
        'cat-02',
        'Broken Dustbin & Waste Spillage',
        'ward-03', 3, 'Ward 3 - Dudhiya Talao',
        'Ashapuri Mandir Approach Road, Ward 3, Navsari',
        'Near North Temple Gate',
        20.9302000, 72.9291000,
        'Broken municipal dustbin leaking organic waste and plastic cups onto pedestrian walkway.',
        'awaiting_verification', 'medium',
        'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        94.2, NOW() - INTERVAL '2 days', NOW() - INTERVAL '4 hours'
      ),
      (
        'c0000000-0000-0000-0000-000000000030',
        'NMC-2026-30003',
        'c0000000-0000-0000-0000-000000000001',
        'Harshil Mehta',
        '+919876543210',
        'cat-03',
        'Choked Gutter / Open Drainage',
        'ward-03', 3, 'Ward 3 - Dudhiya Talao',
        'Sayaji Vaibhav Library Back Lane, Ward 3, Navsari',
        'Behind Library Reading Hall',
        20.9328000, 72.9308000,
        'Stagnant drain water and mixed waste choking open stormwater drainage gutter.',
        'in_progress', 'high',
        'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
        NULL,
        96.0, NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours'
      ),
      (
        'c0000000-0000-0000-0000-000000000040',
        'NMC-2026-30004',
        'c0000000-0000-0000-0000-000000000001',
        'Harshil Mehta',
        '+919876543210',
        'cat-04',
        'Commercial Packaging Waste',
        'ward-03', 3, 'Ward 3 - Dudhiya Talao',
        'Tower Road Commercial Market, Ward 3, Navsari',
        'Near Ganeshsish Complex',
        20.9335000, 72.9315000,
        'Cardboard packaging boxes and commercial vegetable refuse scattered behind market shops.',
        'assigned', 'medium',
        'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
        NULL,
        92.8, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '1 hour'
      ),
      (
        'c0000000-0000-0000-0000-000000000050',
        'NMC-2026-30005',
        'c0000000-0000-0000-0000-000000000001',
        'Harshil Mehta',
        '+919876543210',
        'cat-01',
        'Littering & Discarded Plastic',
        'ward-03', 3, 'Ward 3 - Dudhiya Talao',
        'Lunsikui Ground East Corner, Ward 3, Navsari',
        'Next to Cricket Pavilion',
        20.9340000, 72.9260000,
        'Discarded water bottles and snack packets after weekend sports event.',
        'submitted', 'low',
        'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=800&q=80',
        NULL,
        95.1, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'
      ),
      (
        'c0000000-0000-0000-0000-000000000081',
        'NMC-2026-80001',
        'c0000000-0000-0000-0000-000000000002',
        'Ananya Patel',
        '+919876543212',
        'cat-01',
        'Heritage Street Littering',
        'ward-08', 8, 'Ward 8 - Madhumati - Parsi Wad',
        'Heritage Parsi Vad, Near Sohrab Baug, Navsari',
        'Opposite Parsi Agiary Gate',
        20.9620000, 72.9300000,
        'Accumulation of garden waste and dry tree branches near heritage street corner.',
        'submitted', 'medium',
        'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
        NULL,
        96.0, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
      ),
      (
        'c0000000-0000-0000-0000-000000000082',
        'NMC-2026-80002',
        'c0000000-0000-0000-0000-000000000002',
        'Ananya Patel',
        '+919876543212',
        'cat-01',
        'Open Garbage Dumping',
        'ward-08', 8, 'Ward 8 - Madhumati - Parsi Wad',
        'Madhumati River Bank Road, Ward 8, Navsari',
        'Near Old Water Pump House',
        20.9590000, 72.9270000,
        'Household garbage bags dumped along river bank footpath.',
        'in_progress', 'high',
        'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
        NULL,
        93.4, NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 hours'
      ),
      (
        'c0000000-0000-0000-0000-000000000083',
        'NMC-2026-80003',
        'c0000000-0000-0000-0000-000000000002',
        'Ananya Patel',
        '+919876543212',
        'cat-02',
        'Curb Sweeping & Plastic Cleanup',
        'ward-08', 8, 'Ward 8 - Madhumati - Parsi Wad',
        'Station Road Parsi Wad Junction, Ward 8, Navsari',
        'Near Heritage Clock Tower',
        20.9610000, 72.9285000,
        'Heavy plastic accumulation after evening market cleared.',
        'resolved', 'high',
        'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        97.1, NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days'
      )
      ON CONFLICT (id) DO UPDATE SET 
        status = EXCLUDED.status,
        resolved_image_url = EXCLUDED.resolved_image_url;
    `);

    // 9. Insert Feedback for the Resolved Complaint
    console.log('[SEED] Seeding complaint feedback...');
    await client.query(`
      INSERT INTO complaint_feedback (
        id, complaint_id, citizen_id, rating, feedback_text, created_at
      ) VALUES (
        'fb000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000001',
        5, 'Remarkable prompt action by NMC Ward 3 squad! Within 3 hours the waste was cleared and bleaching powder disinfected the spot. Thank you!',
        NOW() - INTERVAL '1 day'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 10. Seed Notifications for All Roles
    console.log('[SEED] Seeding notifications for all roles...');
    await client.query(`
      INSERT INTO notifications (
        id, user_id, title, message, notification_type, is_read, reference_id, created_at
      ) VALUES
      (
        'bb000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
        'Work Done Update: Cleanliness Restored!',
        'Your complaint NMC-2026-30001 at Dudhiya Talao has been successfully verified & resolved with before and after photo proof.',
        'complaint_status', false, 'c0000000-0000-0000-0000-000000000010', NOW() - INTERVAL '1 day'
      ),
      (
        'bb000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
        'Worker Squad Assigned',
        'Sanitation Squad led by Kanti Solanki has been deployed for complaint NMC-2026-30003.',
        'complaint_status', false, 'c0000000-0000-0000-0000-000000000030', NOW() - INTERVAL '5 hours'
      ),
      (
        'bb000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001',
        'Drive Registration Confirmed',
        'You are registered for Dudhiya Talao Lakefront Mega Swachhata Drive on Sunday. Report at 07:00 AM!',
        'drive_reminder', true, 'act-01', NOW() - INTERVAL '2 days'
      ),
      (
        'bb000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001',
        '50 Green Points Earned',
        'You earned 50 Green Points for rating and verifying the resolution of your civic report.',
        'reward_earned', true, NULL, NOW() - INTERVAL '1 day'
      ),
      (
        'bb000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000003',
        'Community Drive Submitted for Approval',
        'Navsari Green Warriors RWA submitted "Ashapuri Temple Area Cleanliness Drive" for Ward 3 approval.',
        'civic_alert', false, 'act-02', NOW() - INTERVAL '2 hours'
      ),
      (
        'bb000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000003',
        'Work Evidence Awaiting Verification',
        'Team Leader Kanti Solanki submitted after cleanup evidence for complaint NMC-2026-30002.',
        'complaint_status', false, 'c0000000-0000-0000-0000-000000000020', NOW() - INTERVAL '4 hours'
      ),
      (
        'bb000000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000001',
        'New Task Dispatched',
        'Task TSK-NAV-2026-101 at North Lake Promenade assigned to your squad. Reporting time: 08:30 AM.',
        'civic_alert', false, 'a1000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 hours'
      ),
      (
        'bb000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000099',
        'Drive Approved by Ward 3 Officer',
        'Lakeside Eco-Cleanliness Drive 2026 has been approved! Citizen registrations are now officially live.',
        'civic_alert', false, 'act-01', NOW() - INTERVAL '1 day'
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 11. Seed Community Recognition Wall Posts
    console.log('[SEED] Seeding community recognition posts...');
    await client.query(`
      INSERT INTO community_recognition_posts (
        id, author_name, author_role, author_avatar, is_verified_nmc,
        ward_number, ward_name, hero_name, hero_role, badge_title,
        title, description, achievement_stats, image_url,
        likes_count, comments_count, created_at
      ) VALUES
      (
        'a0000000-0000-0000-0000-000000000011',
        'Rajesh Patel', 'Ward Officer · NMC Ward 3',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
        TRUE, 3, 'Ward 3 - Dudhiya Talao',
        'Kanti Solanki (Team Leader)', 'Sanitation Squad Lead', 'Civic Hygiene Champion',
        'Cleanliness Restored at Dudhiya Talao North Promenade',
        'Ward 3 Sanitation Squad successfully cleared 380 kg of accumulated solid waste, sanitized the pathway with bleaching powder, and restored hygiene along Dudhiya Talao.',
        '380 kg waste cleared · Disinfected with bleaching powder',
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        48, 6, NOW() - INTERVAL '1 day'
      ),
      (
        'a0000000-0000-0000-0000-000000000012',
        'Sunita Desai', 'Ward Officer · NMC Ward 8',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
        TRUE, 8, 'Ward 8 - Madhumati - Parsi Wad',
        'Heritage Sanitation Taskforce', 'Heritage Cleanliness Squad', 'Zero Plastic Champion',
        'Heritage Parsi Wad Beautification & Zero Plastic Campaign',
        'Special heritage hygiene squad swept and desilted curbs near Sohrab Baug. Heritage facades and street pavements are now spotless.',
        '290 kg plastic cleared · Pavements washed',
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        62, 9, NOW() - INTERVAL '2 days'
      ),
      (
        'a0000000-0000-0000-0000-000000000013',
        'Rajesh Varma', 'President · Navsari Green Warriors RWA',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
        FALSE, 3, 'Ward 3 - Dudhiya Talao',
        '35 Community Volunteers', 'Active Citizen Volunteers', 'Community Heroes of the Week',
        '420 kg Plastic Cleared at Mota Bazaar Sunday Drive',
        'Over 35 dedicated citizen volunteers joined forces with NMC municipal sweepers. Proud to keep our historic market pristine!',
        '420 kg waste segregated · 35 citizen volunteers',
        'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
        39, 4, NOW() - INTERVAL '3 days'
      )
      ON CONFLICT (id) DO UPDATE SET 
        likes_count = EXCLUDED.likes_count,
        comments_count = EXCLUDED.comments_count;
    `);

    console.log('[SEED COMPLETED] All roles and sections seeded into PostgreSQL successfully!');
  } catch (err) {
    console.error('[SEED FAILED]:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed();
