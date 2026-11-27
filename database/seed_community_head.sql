-- ==============================================================================
-- SWACHH SETU / MY CLEAN NAVSARI
-- COMMUNITY HEAD DASHBOARD - SEED DATA
-- ==============================================================================

-- 1. Profiles for Community Head, Ward Officer, and NMC Admin
INSERT INTO profiles (id, full_name, phone, email, avatar_url, preferred_language, address, locality, is_active)
VALUES 
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
    'd0000000-0000-0000-0000-000000000003',
    'Ramesh Patel (Chief Sanitary Inspector)',
    '+919825110003',
    'ramesh.patel@navsarimunicipal.gov.in',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    'gu',
    'Dudhiya Talao Municipal Ward Complex',
    'Ward 3 - Dudhiya Talao',
    TRUE
),
(
    'a0000000-0000-0000-0000-000000000001',
    'Dr. Ketan Parekh (NMC Admin Officer)',
    '+919825100001',
    'admin.cleanliness@navsarimunicipal.gov.in',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
    'en',
    'Navsari Municipal Corporation Headquarters',
    'Junathana Central',
    TRUE
)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Assign User Roles
INSERT INTO user_roles (user_id, role)
VALUES 
('c0000000-0000-0000-0000-000000000099', 'community_head'),
('d0000000-0000-0000-0000-000000000003', 'ward_officer'),
('a0000000-0000-0000-0000-000000000001', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Seed Community
INSERT INTO communities (
    id, community_name, organisation_type, registration_number,
    description, logo_path, address, locality, ward_id, ward_number, ward_name,
    contact_email, contact_phone, verification_status, verified_by, verified_at, created_by
) VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'Navsari Green Warriors RWA',
    'Resident Welfare Association',
    'NMC-RWA-2024-042',
    'Citizen-led community coalition dedicated to lakefront conservation, zero-waste segregation and local ward hygiene in Dudhiya Talao and surrounding localities.',
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=300&q=80',
    'Green Warriors Office, Lakeview Arcade, Dudhiya Talao',
    'Dudhiya Talao Ward 3',
    'ward-03',
    3,
    'Ward 3 - Dudhiya Talao & Ashapuri',
    'contact@navsarigreen.org',
    '+919825100099',
    'verified',
    'a0000000-0000-0000-0000-000000000001',
    NOW(),
    'c0000000-0000-0000-0000-000000000099'
) ON CONFLICT (id) DO NOTHING;

-- 3. Community Membership
INSERT INTO community_members (id, community_id, user_id, membership_role, membership_status)
VALUES (
    'b0000000-0000-0000-0000-000000000011',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000099',
    'community_head',
    'active'
) ON CONFLICT DO NOTHING;

-- 4. Cleanliness Activities (Dynamic - Real-time Citizen & Community Created)
-- Mock seed activities removed per production specification
