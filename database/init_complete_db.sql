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
),
(
    'c0000000-0000-0000-0000-000000000002',
    'Priya Shah',
    '+919876543211',
    'priya.shah@example.com',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
    'en',
    'A-12, Green City Enclave, Gandevi Road',
    'Ward 12 - Gandevi Road',
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

-- 4. Seed Real Complaints Across Multiple Wards and Dashboards
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
      );


-- 5. Seed Activity Logs
INSERT INTO complaint_activity_logs (id, complaint_id, status, note, actor_name, actor_role, created_at)
      VALUES
      ('al111111-1111-1111-1111-111111111101', 'c1111111-1111-1111-1111-111111111104', 'submitted', 'Citizen reported open garbage dumping with photo evidence.', 'Harshil Mehta', 'citizen', NOW() - INTERVAL '3 days'),
      ('al111111-1111-1111-1111-111111111102', 'c1111111-1111-1111-1111-111111111104', 'assigned', 'Assigned to Ward 3 Sanitation Squad 1 led by Kanti Solanki.', 'Rajesh Patel', 'ward_officer', NOW() - INTERVAL '2 days'),
      ('al111111-1111-1111-1111-111111111103', 'c1111111-1111-1111-1111-111111111104', 'resolved', 'Cleared 380 kg waste, pavement washed and disinfected with bleaching powder.', 'Rajesh Patel', 'ward_officer', NOW() - INTERVAL '1 day'),
      ('al111111-1111-1111-1111-111111111104', 'c1111111-1111-1111-1111-111111111107', 'submitted', 'Commercial vegetable dumping reported on Gandevi Road.', 'Harshil Mehta', 'citizen', NOW() - INTERVAL '1 day'),
      ('al111111-1111-1111-1111-111111111105', 'c1111111-1111-1111-1111-111111111107', 'in_progress', 'Ward 12 Sanitation Squad 2 dispatched with mini-dumper truck.', 'Hemant Nayak', 'ward_officer', NOW() - INTERVAL '4 hours');


-- 5.1 Seed Complaint Feedbacks
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
      );


-- 6. Cleanliness Drives (Dynamic - Real-time Citizen & Community Created)
-- Mock seed drives removed per production specification

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
