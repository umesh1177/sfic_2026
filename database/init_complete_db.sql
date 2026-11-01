-- ==============================================================================
-- MY CLEAN NAVSARI - PRODUCTION-READY POSTGRESQL SCHEMA & INITIAL DATA
-- Smart India Hackathon Problem Statement: PS000089
-- Navsari Municipal Corporation (NMC), Gujarat, India
-- Compatible with all standard PostgreSQL 12+ (No PostGIS extension required)
-- ==============================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables to recreate clean schema
DROP TABLE IF EXISTS support_ticket_messages CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS citizen_rewards CASCADE;
DROP TABLE IF EXISTS reward_definitions CASCADE;
DROP TABLE IF EXISTS challenge_participants CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;
DROP TABLE IF EXISTS drive_registrations CASCADE;
DROP TABLE IF EXISTS cleanliness_drives CASCADE;
DROP TABLE IF EXISTS complaint_followers CASCADE;
DROP TABLE IF EXISTS complaint_feedback CASCADE;
DROP TABLE IF EXISTS complaint_activity_logs CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS wards CASCADE;
DROP TABLE IF EXISTS complaint_categories CASCADE;
DROP TABLE IF EXISTS otp_verification_sessions CASCADE;
DROP TABLE IF EXISTS citizen_auth_profiles CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. PROFILES TABLE
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NULL,
    avatar_url TEXT NULL,
    preferred_language VARCHAR(10) DEFAULT 'en',
    address TEXT NULL,
    locality VARCHAR(100) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USER ROLES
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'citizen',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_role UNIQUE (user_id, role)
);

-- 3. CITIZEN AUTH PROFILES
CREATE TABLE citizen_auth_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    mobile_number VARCHAR(20) NOT NULL,
    password_hash TEXT NOT NULL,
    mobile_verified BOOLEAN DEFAULT TRUE,
    account_status VARCHAR(30) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. OTP SESSIONS
CREATE TABLE otp_verification_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile_number VARCHAR(20) NOT NULL,
    otp_hash TEXT NOT NULL,
    purpose VARCHAR(30) NOT NULL DEFAULT 'signup',
    expires_at TIMESTAMPTZ NOT NULL,
    attempts_count INT DEFAULT 0,
    resend_count INT DEFAULT 0,
    verified_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COMPLAINT CATEGORIES
CREATE TABLE complaint_categories (
    id VARCHAR(50) PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    category_name_gu VARCHAR(100) NOT NULL,
    category_name_hi VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'AlertCircle',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. NAVSARI WARDS
CREATE TABLE wards (
    id VARCHAR(50) PRIMARY KEY,
    ward_number INT NOT NULL UNIQUE,
    ward_name VARCHAR(100) NOT NULL,
    ward_name_gu VARCHAR(100) NOT NULL,
    ward_officer_name VARCHAR(150) NOT NULL,
    ward_officer_phone VARCHAR(20) NOT NULL,
    office_address TEXT NOT NULL,
    center_latitude DOUBLE PRECISION NOT NULL,
    center_longitude DOUBLE PRECISION NOT NULL,
    cleanliness_score INT DEFAULT 88,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. COMPLAINTS TABLE (FULL CRUD TARGET)
CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_number VARCHAR(50) UNIQUE NOT NULL,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    citizen_name VARCHAR(150) NOT NULL,
    citizen_phone VARCHAR(20) NOT NULL,
    category_id VARCHAR(50) NOT NULL REFERENCES complaint_categories(id),
    category_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    original_language VARCHAR(10) DEFAULT 'en',
    image_url TEXT NOT NULL,
    resolved_image_url TEXT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT NOT NULL,
    landmark TEXT NULL,
    ward_id VARCHAR(50) NULL REFERENCES wards(id),
    ward_number INT NOT NULL DEFAULT 3,
    ward_name VARCHAR(100) NOT NULL DEFAULT 'Ward 3 - Dudhiya Talao',
    assigned_officer_name VARCHAR(150) DEFAULT 'Ramesh Patel (Chief Sanitary Inspector)',
    status VARCHAR(30) NOT NULL DEFAULT 'submitted', -- 'submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'reopened'
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    is_urgent BOOLEAN DEFAULT FALSE,
    ai_model_name VARCHAR(100) DEFAULT 'NavsariWasteClassifier-PyTorch-ResNet50',
    ai_model_version VARCHAR(50) DEFAULT 'v1.3.0',
    confidence_score DOUBLE PRECISION DEFAULT 0.95,
    upvotes_count INT DEFAULT 0,
    followers_count INT DEFAULT 0,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. COMPLAINT ACTIVITY TIMELINE
CREATE TABLE complaint_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    note TEXT NOT NULL,
    actor_name VARCHAR(150) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. COMPLAINT FEEDBACK
CREATE TABLE complaint_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback_text TEXT NULL,
    resolution_satisfactory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. COMPLAINT FOLLOWERS
CREATE TABLE complaint_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_complaint_follower UNIQUE (complaint_id, citizen_id)
);

-- 11. CLEANLINESS DRIVES
CREATE TABLE cleanliness_drives (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    ward_id VARCHAR(50) NOT NULL REFERENCES wards(id),
    ward_name VARCHAR(100) NOT NULL,
    location_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    registration_deadline TIMESTAMPTZ NOT NULL,
    organiser_name VARCHAR(150) NOT NULL,
    lead_person VARCHAR(150) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    meeting_spot TEXT NOT NULL,
    reporting_time VARCHAR(50) NOT NULL,
    gear_provided TEXT[] NOT NULL,
    karma_reward INT DEFAULT 100,
    status VARCHAR(30) DEFAULT 'upcoming',
    banner_url TEXT NOT NULL,
    max_volunteers INT DEFAULT 50,
    registered_volunteers_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. DRIVE REGISTRATIONS
CREATE TABLE drive_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id VARCHAR(50) NOT NULL REFERENCES cleanliness_drives(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_drive_citizen UNIQUE (drive_id, citizen_id)
);

-- 13. CHALLENGES
CREATE TABLE challenges (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    challenge_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_value INT NOT NULL,
    current_value INT NOT NULL DEFAULT 0,
    status VARCHAR(30) DEFAULT 'active',
    banner_url TEXT NOT NULL,
    participants_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. CHALLENGE PARTICIPANTS
CREATE TABLE challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id VARCHAR(50) NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_challenge_citizen UNIQUE (challenge_id, citizen_id)
);

-- 15. REWARD DEFINITIONS
CREATE TABLE reward_definitions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    tier VARCHAR(30) NOT NULL DEFAULT 'bronze',
    points INT NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. CITIZEN REWARDS
CREATE TABLE citizen_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reward_id VARCHAR(50) NOT NULL REFERENCES reward_definitions(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_citizen_reward UNIQUE (citizen_id, reward_id)
);

-- 17. NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'complaint_status', 'drive_reminder', 'reward_earned', 'civic_alert'
    reference_id VARCHAR(100) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. SUPPORT TICKETS
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'garbage_collection',
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. SUPPORT TICKET MESSAGES
CREATE TABLE support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_name VARCHAR(150) NOT NULL,
    is_staff BOOLEAN DEFAULT FALSE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- SEED DATA POPULATION
-- ==============================================================================

-- 1. Seed Demo Citizen
INSERT INTO profiles (id, full_name, phone, email, avatar_url, preferred_language, address, locality, is_active)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'Harshil Mehta',
    '+919876543210',
    'harshil.mehta@example.com',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    'en',
    'B-402, Ashapuri Residency, Near Dudhiya Talao',
    'Dudhiya Talao Ward 3',
    TRUE
);

INSERT INTO user_roles (user_id, role)
VALUES ('c0000000-0000-0000-0000-000000000001', 'citizen');

INSERT INTO citizen_auth_profiles (user_id, mobile_number, password_hash, mobile_verified)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    '+919876543210',
    '$2b$10$wT3oXf8Z7F7Qn6G3qH8H7uCqJ4k1mP2rS5tU8vW9xY0z1a2b3c4d5',
    TRUE
);

-- 2. Seed 6 Categories
INSERT INTO complaint_categories (id, category_name, category_name_gu, category_name_hi, description, icon) VALUES
('cat-01', 'Littering', 'કચરો ફેંકવો / પ્લાસ્ટિક', 'कचरा फैलाना / प्लास्टिक', 'Discarded plastic bottles, packets, and litter in public spots', 'Trash2'),
('cat-02', 'Open Garbage Dumping', 'ખુલ્લામાં કચરો નાખવો', 'खुले में कचरा फेंकना', 'Illegal heaps of uncollected domestic or commercial waste', 'AlertTriangle'),
('cat-03', 'Overflowing Dustbin', 'ઉભરાતી કચરાપેટી', 'कचरे का डिब्बा भर जाना', 'Public community dustbin completely filled and overflowing', 'Archive'),
('cat-04', 'Roadside Garbage', 'રસ્તા કિનારે કચરો', 'सड़क किनारे कचरा', 'Accumulated debris, plastic packaging, and leaves along roads', 'Truck'),
('cat-05', 'Drainage / Waste Accumulation', 'ગટર / કચરો જમા થવો', 'नाली या जल जमाव और कचरा', 'Choked drains, sewage overflow, and stagnant filthy waste water', 'Droplets'),
('cat-06', 'Other Cleanliness Issues', 'અન્ય સ્વચ્છતા સમસ્યાઓ', 'अन्य स्वच्छता समस्याएं', 'Dead animal disposal, construction debris, or public toilet issues', 'HelpCircle');

-- 3. Seed 13 Navsari Municipal Wards
INSERT INTO wards (id, ward_number, ward_name, ward_name_gu, ward_officer_name, ward_officer_phone, office_address, center_latitude, center_longitude, cleanliness_score) VALUES
('ward-01', 1, 'Ward 1 - Junathana & Tower Area', 'વોર્ડ ૧ - જુનાથાણા અને ટાવર વિસ્તાર', 'Sanjay Patel', '+91 98251 10001', 'Junathana Civic Centre, Navsari', 20.9550, 72.9250, 92),
('ward-02', 2, 'Ward 2 - Station Road & Golwad', 'વોર્ડ ૨ - સ્ટેશન રોડ અને ગોળવાડ', 'Kiritbhai Desai', '+91 98251 10002', 'Station Road Ward Office, Navsari', 20.9510, 72.9320, 84),
('ward-03', 3, 'Ward 3 - Dudhiya Talao & Ashapuri', 'વોર્ડ ૩ - દુધિયા તળાવ અને આશાપુરી', 'Ramesh Patel', '+91 98251 10003', 'Dudhiya Talao Municipal Complex, Navsari', 20.9470, 72.9280, 96),
('ward-04', 4, 'Ward 4 - Lunsikui & Sayaji Road', 'વોર્ડ ૪ - લુન્સીકુઈ અને સયાજી રોડ', 'Jayesh Solanki', '+91 98251 10004', 'Lunsikui Sub-Centre, Navsari', 20.9420, 72.9210, 89),
('ward-05', 5, 'Ward 5 - Fuwara & Chhapra Road', 'વોર્ડ ૫ - ફુવારા અને છાપરા રોડ', 'Pravin Rathod', '+91 98251 10005', 'Fuwara Chowk Civic Office, Navsari', 20.9380, 72.9150, 82),
('ward-06', 6, 'Ward 6 - Kabilpore Industrial Zone', 'વોર્ડ ૬ - કબીલપોર ઔદ્યોગિક વિસ્તાર', 'Anil Mistry', '+91 98251 10006', 'Kabilpore GIDC Liaison Office, Navsari', 20.9300, 72.9050, 78),
('ward-07', 7, 'Ward 7 - Jalalpore North', 'વોર્ડ ૭ - જલાલપોર ઉત્તર', 'Mahesh Parmar', '+91 98251 10007', 'Jalalpore Gram Panchayat Bhavan, Navsari', 20.9600, 72.9100, 87),
('ward-08', 8, 'Ward 8 - Jalalpore South & Kasba', 'વોર્ડ ૮ - જલાલપોર દક્ષિણ અને કસબા', 'Naresh Vashi', '+91 98251 10008', 'Kasba Ward Outpost, Navsari', 20.9650, 72.9000, 81),
('ward-09', 9, 'Ward 9 - Vejalpore & Eru Char Rasta', 'વોર્ડ ૯ - વેજલપોર અને એરુ ચાર રસ્તા', 'Bipin Ahir', '+91 98251 10009', 'Eru Char Rasta Municipal Booth, Navsari', 20.9350, 72.9350, 90),
('ward-10', 10, 'Ward 10 - Vijalpore West', 'વોર્ડ ૧૦ - વિજલપોર પશ્ચિમ', 'Dharmesh Halpati', '+91 98251 10010', 'Vijalpore Ward Centre, Navsari', 20.9250, 72.9400, 85),
('ward-11', 11, 'Ward 11 - Vijalpore East & Railway Colony', 'વોર્ડ ૧૧ - વિજલપોર પૂર્વ અને રેલ્વે કોલોની', 'Chetan Tandel', '+91 98251 10011', 'Railway Colony Ward Office, Navsari', 20.9200, 72.9450, 80),
('ward-12', 12, 'Ward 12 - Gandevi Road & Tariacolony', 'વોર્ડ ૧૨ - ગણદેવી રોડ અને તારીયાકોલોની', 'Hemant Nayak', '+91 98251 10012', 'Gandevi Road Help Center, Navsari', 20.9150, 72.9300, 88),
('ward-13', 13, 'Ward 13 - Mogar & Outer Ring', 'વોર્ડ ૧૩ - મોગાર અને રીંગ રોડ', 'Girish Patel', '+91 98251 10013', 'Outer Ring Road Terminal, Navsari', 20.9700, 72.9350, 83);

-- 4. Seed Real Complaints
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
    'c1111111-1111-1111-1111-111111111101',
    'NMC-2026-10021',
    'c0000000-0000-0000-0000-000000000001',
    'Harshil Mehta',
    '+919876543210',
    'cat-03',
    'Overflowing Dustbin',
    'Public community bin overflowing near Dudhiya Talao park entrance. Waste spilling onto pedestrian walkway.',
    'en',
    'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
    NULL,
    20.9472,
    72.9281,
    'Near Dudhiya Talao West Gate, Ward 3',
    'Opposite Ashapuri Garden Main Gate',
    'ward-03',
    3,
    'Ward 3 - Dudhiya Talao & Ashapuri',
    'Ramesh Patel (Chief Sanitary Inspector)',
    'in_progress',
    'high',
    FALSE,
    0.95,
    14,
    6,
    NOW() - INTERVAL '2 days',
    NULL
),
(
    'c1111111-1111-1111-1111-111111111102',
    'NMC-2026-10019',
    'c0000000-0000-0000-0000-000000000001',
    'Harshil Mehta',
    '+919876543210',
    'cat-04',
    'Roadside Garbage',
    'Accumulated waste and dry leaves cleared from Station Road market corner.',
    'en',
    'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
    20.9515,
    72.9325,
    'Station Road Auto Stand Junction',
    'Near Navsari Railway Station Platform 1',
    'ward-02',
    2,
    'Ward 2 - Station Road & Golwad',
    'Kiritbhai Desai',
    'resolved',
    'medium',
    FALSE,
    0.93,
    28,
    12,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '3 days'
),
(
    'c1111111-1111-1111-1111-111111111103',
    'NMC-2026-10034',
    'c0000000-0000-0000-0000-000000000001',
    'Harshil Mehta',
    '+919876543210',
    'cat-05',
    'Drainage / Waste Accumulation',
    'Severe drain blockage causing wastewater overflow near Sayaji Road footpath.',
    'en',
    'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80',
    NULL,
    20.9421,
    72.9214,
    'Near Sayaji Library, Lunsikui',
    'Near Central Bank ATM',
    'ward-04',
    4,
    'Ward 4 - Lunsikui & Sayaji Road',
    'Jayesh Solanki',
    'submitted',
    'urgent',
    TRUE,
    0.96,
    5,
    3,
    NOW() - INTERVAL '4 hours',
    NULL
);

-- 5. Seed Activity Logs
INSERT INTO complaint_activity_logs (complaint_id, status, note, actor_name, actor_role, created_at) VALUES
('c1111111-1111-1111-1111-111111111101', 'submitted', 'Complaint lodged by citizen with photo evidence.', 'Harshil Mehta', 'citizen', NOW() - INTERVAL '2 days'),
('c1111111-1111-1111-1111-111111111101', 'under_review', 'Verified by AI Classifier and geolocated to Ward 3.', 'AI Dispatch Engine', 'system', NOW() - INTERVAL '40 hours'),
('c1111111-1111-1111-1111-111111111101', 'assigned', 'Assigned to Ward 3 Sanitation Inspector Ramesh Patel.', 'NMC Central Control', 'admin', NOW() - INTERVAL '30 hours'),
('c1111111-1111-1111-1111-111111111101', 'in_progress', 'Sanitation Quick-Response Team 4B dispatched with compact compactor.', 'Ramesh Patel', 'ward_officer', NOW() - INTERVAL '4 hours'),
('c1111111-1111-1111-1111-111111111102', 'submitted', 'Citizen reported accumulated road sweepings.', 'Harshil Mehta', 'citizen', NOW() - INTERVAL '5 days'),
('c1111111-1111-1111-1111-111111111102', 'in_progress', 'Mechanical sweeper unit cleared area.', 'Kiritbhai Desai', 'ward_officer', NOW() - INTERVAL '4 days'),
('c1111111-1111-1111-1111-111111111102', 'resolved', 'Cleanup inspected and verified with post-clearance photo.', 'Kiritbhai Desai', 'ward_officer', NOW() - INTERVAL '3 days');

-- 6. Seed Cleanliness Drives
INSERT INTO cleanliness_drives (
    id, title, description, ward_id, ward_name, location_name,
    latitude, longitude, start_time, end_time, registration_deadline,
    organiser_name, lead_person, contact_phone, meeting_spot,
    reporting_time, gear_provided, karma_reward, status,
    banner_url, max_volunteers, registered_volunteers_count
) VALUES
(
    'drive-01',
    'Dudhiya Talao Lakefront Mega Swachhata Drive',
    'Join fellow citizens to clear plastic litter and restore the natural beauty of historic Dudhiya Talao perimeter.',
    'ward-03',
    'Ward 3 - Dudhiya Talao',
    'Dudhiya Talao Lake Promenade, Ward 3',
    20.9470,
    72.9280,
    NOW() + INTERVAL '2 days',
    NOW() + INTERVAL '2 days 3 hours',
    NOW() + INTERVAL '1 day',
    'Rotary Club of Navsari & NMC Joint Cell',
    'Dr. Suresh Desai (Rotary President)',
    '+91 98251 40120',
    'Dudhiya Talao West Gate Fountain Plaza',
    '06:45 AM (Sunday)',
    ARRAY['Nitrile Heavy-Duty Gloves', 'Biodegradable Waste Sacks', 'Reflective Safety Vest', 'Hydration & Refreshments'],
    150,
    'upcoming',
    'https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?auto=format&fit=crop&w=800&q=80',
    50,
    42
),
(
    'drive-02',
    'Navsari Railway Station Plastic-Free Corridor Campaign',
    'Volunteers unite to clean up access paths and station approaches to ensure zero-plastic litter for travelers.',
    'ward-02',
    'Ward 2 - Station Road',
    'Station Road Approach & Parking Grounds',
    20.9510,
    72.9320,
    NOW() + INTERVAL '5 days',
    NOW() + INTERVAL '5 days 4 hours',
    NOW() + INTERVAL '4 days',
    'Navsari Youth Green Brigade',
    'Pooja Patel (Youth Coordinator)',
    '+91 98251 60234',
    'Opposite Navsari Railway Station Auto Stand',
    '07:30 AM',
    ARRAY['Rubber Gloves', 'Trash Pickers', 'Recyclable Collection Sacks', 'Sanitizers & Snacks'],
    120,
    'upcoming',
    'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
    40,
    18
),
(
    'drive-03',
    'Lunsikui Green Belt & Community Park Cleanup',
    'Community drive focusing on public gardens, tree beds, and segregated disposal awareness.',
    'ward-04',
    'Ward 4 - Lunsikui',
    'Lunsikui Community Park & Playgrounds',
    20.9420,
    72.9210,
    NOW() + INTERVAL '8 days',
    NOW() + INTERVAL '8 days 3 hours',
    NOW() + INTERVAL '7 days',
    'Lunsikui Citizens Welfare Association',
    'Hasmukh Shah (RWA Secretary)',
    '+91 98251 89110',
    'Lunsikui Community Ground Pavilion',
    '07:00 AM',
    ARRAY['Gloves', 'Brooms', 'Collection Dustbins', 'Breakfast & Certificate'],
    100,
    'upcoming',
    'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
    60,
    35
);

-- Register demo citizen for drive-01
INSERT INTO drive_registrations (drive_id, citizen_id)
VALUES ('drive-01', 'c0000000-0000-0000-0000-000000000001');

-- 7. Seed Challenges
INSERT INTO challenges (id, title, description, challenge_type, start_date, end_date, target_value, current_value, status, banner_url, participants_count) VALUES
('ch-01', 'Navsari Zero-Litter Week 2026', 'Citizens collaborate to report and verify clean spots across all 13 wards.', 'zero_litter', CURRENT_DATE - 5, CURRENT_DATE + 10, 200, 142, 'active', 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80', 530),
('ch-02', 'Dudhiya Talao Plastic-Free Mission', 'Lakefront heritage preservation mission: pledge to keep Ward 3 perimeter clean.', 'ward_cleanliness', CURRENT_DATE - 2, CURRENT_DATE + 15, 500, 310, 'active', 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80', 320);

INSERT INTO challenge_participants (challenge_id, citizen_id)
VALUES ('ch-01', 'c0000000-0000-0000-0000-000000000001');

-- 8. Seed Reward Definitions & Citizen Rewards
INSERT INTO reward_definitions (id, name, description, icon, tier, points) VALUES
('rew-01', 'Cleanliness Champion', 'Awarded for 5 verified resolved complaints with top citizen satisfaction rating.', 'Award', 'gold', 500),
('rew-02', 'Active Community Member', 'Active contributor who participated in municipal cleanliness drives.', 'Users', 'silver', 250),
('rew-03', 'Clean-up Volunteer', 'Attended first verified cleanliness drive in Navsari.', 'HeartHandshake', 'bronze', 100),
('rew-04', 'Responsible Reporter', 'Submitted accurate, high-quality civic reports with precise GPS coordinates.', 'ShieldCheck', 'platinum', 750);

INSERT INTO citizen_rewards (citizen_id, reward_id) VALUES
('c0000000-0000-0000-0000-000000000001', 'rew-01'),
('c0000000-0000-0000-0000-000000000001', 'rew-02'),
('c0000000-0000-0000-0000-000000000001', 'rew-03');

-- 9. Seed Notifications
INSERT INTO notifications (user_id, title, message, notification_type, reference_id, is_read, created_at) VALUES
('c0000000-0000-0000-0000-000000000001', 'Action In Progress: Dudhiya Talao Dustbin', 'Sanitation Unit 4B has been dispatched to resolve overflowing bin complaint #NMC-2026-10021.', 'complaint_status', 'c1111111-1111-1111-1111-111111111101', FALSE, NOW() - INTERVAL '35 minutes'),
('c0000000-0000-0000-0000-000000000001', 'Civic Alert: Ward 4 Monsoon Drain Clearance', 'NMC Health Dept is carrying out pre-monsoon deep gutter desilting in Ward 4. Road access may be slow near Bazar Gate.', 'civic_alert', NULL, FALSE, NOW() - INTERVAL '2 hours'),
('c0000000-0000-0000-0000-000000000001', 'Cleanliness Drive RSVP Confirmed', 'You are successfully registered for the Dudhiya Talao Lakefront Mega Swachhata Drive on Sunday. Gloves and vests provided.', 'drive_reminder', 'drive-01', TRUE, NOW() - INTERVAL '18 hours'),
('c0000000-0000-0000-0000-000000000001', 'Civic Karma Reward: +50 Points Added', 'Your report was verified by the Ward Officer with 5-star accuracy. You earned +50 Civic Karma points!', 'reward_earned', 'rew-01', TRUE, NOW() - INTERVAL '36 hours');

-- 10. Seed Support Tickets
INSERT INTO support_tickets (id, ticket_number, citizen_id, subject, description, category, status) VALUES
(
    '00000000-0000-0000-0000-000000000042',
    'TKT-2026-0042',
    'c0000000-0000-0000-0000-000000000001',
    'Request for additional garbage bins near Ashapuri Garden',
    'Due to morning walkers, the existing single bin gets full by 9 AM. Requesting one more segregated bin.',
    'garbage_collection',
    'in_progress'
);

INSERT INTO support_ticket_messages (ticket_id, sender_id, sender_name, is_staff, message) VALUES
('00000000-0000-0000-0000-000000000042', 'c0000000-0000-0000-0000-000000000001', 'Harshil Mehta', FALSE, 'Request for additional garbage bins near Ashapuri Garden due to high morning footfall.'),
('00000000-0000-0000-0000-000000000042', 'c0000000-0000-0000-0000-000000000001', 'NMC Helpdesk Support', TRUE, 'Your request has been forwarded to Ward 3 Sanitary Inspector Ramesh Patel for site verification.');
