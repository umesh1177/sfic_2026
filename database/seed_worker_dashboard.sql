-- ==============================================================================
-- SWACHH SETU: WORKER DASHBOARD & FIELD OPERATIONS SEED DATA
-- Navsari Municipal Corporation - Ward 3 Dudhiya Talao
-- ==============================================================================

-- 1. SEED WORKER DESIGNATIONS
INSERT INTO worker_designations (id, designation_code, designation_name, description, is_active)
VALUES
('d1000000-0000-0000-0000-000000000001', 'sanitation_worker', 'Sanitation Worker', 'General ward cleanliness, waste sweeping and municipal public area hygiene', TRUE),
('d1000000-0000-0000-0000-000000000002', 'street_cleaner', 'Street Cleaning Worker', 'Roadside sweeping, pavement litter clearing and curb scraping', TRUE),
('d1000000-0000-0000-0000-000000000003', 'waste_collector', 'Waste Collection Worker', 'Door-to-door solid waste pickup, commercial waste loading and transit', TRUE),
('d1000000-0000-0000-0000-000000000004', 'vehicle_operator', 'Garbage Vehicle Operator', 'Driver & operator for hydraulic compactor trucks and dumper placers', TRUE),
('d1000000-0000-0000-0000-000000000005', 'drainage_worker', 'Drainage Cleaning Worker', 'Stormwater drain desilting, channel declogging and culvert clearing', TRUE),
('d1000000-0000-0000-0000-000000000006', 'toilet_maintenance', 'Public Toilet Maintenance Worker', 'Disinfection, plumbing hygiene and maintenance of public e-toilets', TRUE),
('d1000000-0000-0000-0000-000000000007', 'segregation_worker', 'Waste Segregation Worker', 'Separation of dry, wet, e-waste and recyclables at transfer stations', TRUE),
('d1000000-0000-0000-0000-000000000008', 'equipment_operator', 'Equipment Operator', 'Suction machine, mechanical sweeper and de-silting crane operator', TRUE)
ON CONFLICT (id) DO UPDATE SET designation_name = EXCLUDED.designation_name;

-- 2. SEED WORKER SKILLS
INSERT INTO worker_skills (id, skill_name, description)
VALUES
('e1000000-0000-0000-0000-000000000001', 'Drainage Desilting', 'Manual and mechanical silt extraction from roadside storm drains'),
('e1000000-0000-0000-0000-000000000002', 'Mechanical Equipment Operation', 'Handling suction pumps, mini jetters and road blowers safely'),
('e1000000-0000-0000-0000-000000000003', 'Waste Segregation Protocols', 'Expertise in 4-stream segregation and bio-medical hazard isolation'),
('e1000000-0000-0000-0000-000000000004', 'Hydraulic Dumper Operation', 'Safe operation of hydraulic tipping collection vehicles'),
('e1000000-0000-0000-0000-000000000005', 'Sanitary Disinfection Chemical Handling', 'Dilution, spraying and safety protocols for sodium hypochlorite and lime powder')
ON CONFLICT (id) DO NOTHING;

-- 3. SEED WORKER USER PROFILES (INTO profiles TABLE)
INSERT INTO profiles (id, full_name, phone, email, avatar_url, preferred_language, address, locality, is_active)
VALUES
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
),
(
    'f1000000-0000-0000-0000-000000000002',
    'Suresh Vaghela',
    '+919825120002',
    'suresh.vaghela@navsarimunicipal.gov.in',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
    'gu',
    'B-12, Shanti Nagar, Near Railway Station',
    'Dudhiya Talao Ward 3',
    TRUE
),
(
    'f1000000-0000-0000-0000-000000000003',
    'Dinesh Rathod',
    '+919825120003',
    'dinesh.rathod@navsarimunicipal.gov.in',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
    'hi',
    'A-4, Valmiki Vas, Ashapuri Road',
    'Dudhiya Talao Ward 3',
    TRUE
),
(
    'f1000000-0000-0000-0000-000000000004',
    'Bhavna Parmar',
    '+919825120004',
    'bhavna.parmar@navsarimunicipal.gov.in',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    'gu',
    'Plot 8, Juna Thana Old Quarters',
    'Junathana Central',
    TRUE
),
(
    'f1000000-0000-0000-0000-000000000005',
    'Mahesh Chauhan',
    '+919825120005',
    'mahesh.chauhan@navsarimunicipal.gov.in',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    'en',
    'C-22, Shivaji Park Society, Station Road',
    'Ward 3 - Dudhiya Talao',
    TRUE
)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- ASSIGN SINGLE WORKER ROLE IN user_roles
INSERT INTO user_roles (user_id, role)
VALUES
('f1000000-0000-0000-0000-000000000001', 'sanitation_worker'),
('f1000000-0000-0000-0000-000000000002', 'sanitation_worker'),
('f1000000-0000-0000-0000-000000000003', 'sanitation_worker'),
('f1000000-0000-0000-0000-000000000004', 'sanitation_worker'),
('f1000000-0000-0000-0000-000000000005', 'sanitation_worker')
ON CONFLICT (user_id, role) DO NOTHING;

-- AUTH PROFILES FOR WORKER LOGIN (Password: Navsari@2026)
INSERT INTO citizen_auth_profiles (user_id, mobile_number, password_hash, mobile_verified, account_status)
VALUES
('f1000000-0000-0000-0000-000000000001', '+919825120001', '$2a$10$eO0V4rLhQ5s79m8/L9K6UuO.qXoR8nU6s5q9h9K6UuO.qXoR8nU6s', TRUE, 'active'),
('f1000000-0000-0000-0000-000000000002', '+919825120002', '$2a$10$eO0V4rLhQ5s79m8/L9K6UuO.qXoR8nU6s5q9h9K6UuO.qXoR8nU6s', TRUE, 'active'),
('f1000000-0000-0000-0000-000000000003', '+919825120003', '$2a$10$eO0V4rLhQ5s79m8/L9K6UuO.qXoR8nU6s5q9h9K6UuO.qXoR8nU6s', TRUE, 'active'),
('f1000000-0000-0000-0000-000000000004', '+919825120004', '$2a$10$eO0V4rLhQ5s79m8/L9K6UuO.qXoR8nU6s5q9h9K6UuO.qXoR8nU6s', TRUE, 'active'),
('f1000000-0000-0000-0000-000000000005', '+919825120005', '$2a$10$eO0V4rLhQ5s79m8/L9K6UuO.qXoR8nU6s5q9h9K6UuO.qXoR8nU6s', TRUE, 'active')
ON CONFLICT (user_id) DO NOTHING;

-- 4. SEED WORKER PROFILES
INSERT INTO worker_profiles (
    id, user_id, worker_code, primary_designation_id, ward_id, ward_number, ward_name,
    employment_status, joining_date, experience_years, availability_status,
    emergency_contact_name, emergency_contact_phone, language_preference
)
VALUES
(
    'f2000000-0000-0000-0000-000000000001',
    'f1000000-0000-0000-0000-000000000001',
    'NMC-WRK-001',
    'd1000000-0000-0000-0000-000000000005', -- Drainage Cleaning Worker
    'ward-03', 3, 'Ward 3 - Dudhiya Talao',
    'permanent', '2023-04-01', 4.5, 'on_duty',
    'Ramilaben Solanki (Wife)', '+919825199001', 'gu'
),
(
    'f2000000-0000-0000-0000-000000000002',
    'f1000000-0000-0000-0000-000000000002',
    'NMC-WRK-002',
    'd1000000-0000-0000-0000-000000000001', -- Sanitation Worker
    'ward-03', 3, 'Ward 3 - Dudhiya Talao',
    'permanent', '2024-02-15', 2.0, 'available',
    'Geetaben Vaghela (Wife)', '+919825199002', 'gu'
),
(
    'f2000000-0000-0000-0000-000000000003',
    'f1000000-0000-0000-0000-000000000003',
    'NMC-WRK-003',
    'd1000000-0000-0000-0000-000000000003', -- Waste Collection Worker
    'ward-03', 3, 'Ward 3 - Dudhiya Talao',
    'contractual', '2024-06-01', 1.5, 'available',
    'Mohan Rathod (Brother)', '+919825199003', 'hi'
),
(
    'f2000000-0000-0000-0000-000000000004',
    'f1000000-0000-0000-0000-000000000004',
    'NMC-WRK-004',
    'd1000000-0000-0000-0000-000000000006', -- Public Toilet Maintenance
    'ward-03', 3, 'Ward 3 - Dudhiya Talao',
    'permanent', '2022-09-01', 5.0, 'available',
    'Jitendra Parmar (Husband)', '+919825199004', 'gu'
),
(
    'f2000000-0000-0000-0000-000000000005',
    'f1000000-0000-0000-0000-000000000005',
    'NMC-WRK-005',
    'd1000000-0000-0000-0000-000000000008', -- Equipment Operator
    'ward-03', 3, 'Ward 3 - Dudhiya Talao',
    'permanent', '2021-11-15', 6.0, 'on_duty',
    'Kiran Chauhan (Brother)', '+919825199005', 'en'
)
ON CONFLICT (id) DO NOTHING;

-- 5. SEED WORKER SKILLS MAPPING
INSERT INTO worker_profile_skills (worker_id, skill_id, proficiency)
VALUES
('f2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'expert'),
('f2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000002', 'skilled'),
('f2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000003', 'skilled'),
('f2000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000003', 'skilled'),
('f2000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000005', 'expert'),
('f2000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000002', 'expert'),
('f2000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000004', 'expert')
ON CONFLICT DO NOTHING;

-- 6. SEED WORK ASSIGNMENTS
INSERT INTO work_assignments (
    id, task_code, title, description, category, priority,
    ward_id, ward_number, ward_name, location_name, address,
    latitude, longitude, scheduled_date, scheduled_start_time, expected_end_time,
    attendance_radius_meters, evidence_radius_meters,
    work_instructions, safety_instructions, required_equipment, emergency_contact_phone,
    status, created_by
)
VALUES
(
    'a1000000-0000-0000-0000-000000000001',
    'TSK-NAV-2026-101',
    'Dudhiya Talao East Canal Drainage Desilting & Silt Clearance',
    'Clear blockage in primary municipal storm drain near Dudhiya Talao East gate before pre-monsoon flow tests.',
    'drainage_cleaning',
    'high',
    'ward-03', 3, 'Ward 3 - Dudhiya Talao',
    'Dudhiya Talao East Canal Sluice Gate',
    'Near East Promenade Sluice Gate, Dudhiya Talao Road, Navsari',
    20.9485000, 72.9260000,
    CURRENT_DATE,
    (CURRENT_DATE + TIME '07:30:00')::timestamptz,
    (CURRENT_DATE + TIME '11:30:00')::timestamptz,
    100, 150,
    '1. Open culvert cover with mechanical hoist. 2. Remove accumulated plastic debris and heavy silt. 3. Flush channel with municipal suction jetter. 4. Collect sludge in designated sealed municipal container.',
    'Wear industrial gumboots, heavy-duty puncture-resistant rubber gloves, face mask, and high-visibility neon reflective safety jacket.',
    '["Culvert lifting hook", "Deep desilting shovel", "High-pressure jetter pipe", "Sludge trolley", "Safety cones"]'::jsonb,
    '+919825110003',
    'in_progress',
    'd0000000-0000-0000-0000-000000000003' -- Assigned by Ward 3 Inspector Ramesh Patel
),
(
    'a1000000-0000-0000-0000-000000000002',
    'TSK-NAV-2026-102',
    'Tower Road Commercial Stretch Morning Sweeping & Litter Clearing',
    'Scheduled morning sweeping of central commercial corridor and clearing of scattered paper, plastic, and tea cup litter.',
    'street_cleaning',
    'medium',
    'ward-03', 3, 'Ward 3 - Dudhiya Talao',
    'Tower Road Clock Circle to Ashapuri Gate',
    'Tower Road, Main Market Corridor, Ward 3, Navsari',
    20.9520000, 72.9310000,
    CURRENT_DATE,
    (CURRENT_DATE + TIME '14:00:00')::timestamptz,
    (CURRENT_DATE + TIME '17:30:00')::timestamptz,
    100, 150,
    'Sweep both sides of commercial carriageway, clear curbside debris, empty all secondary twin waste dustbins into the collection tricycle.',
    'Stay within barricaded curb lane. Do not step into fast vehicular lanes without safety cones.',
    '["Long-handle nylon broom", "Dustpan with handle", "Heavy duty waste collection bags", "Reflective safety jacket"]'::jsonb,
    '+919825110003',
    'assigned',
    'd0000000-0000-0000-0000-000000000003'
),
(
    'a1000000-0000-0000-0000-000000000003',
    'TSK-NAV-2026-103',
    'Ashapuri Temple Market Overflowing Bin Removal & Lime Powder Disinfection',
    'Emergency clearance of overflowing wet waste bin behind Ashapuri temple following festival crowd disposal.',
    'bin_clearance',
    'emergency',
    'ward-03', 3, 'Ward 3 - Dudhiya Talao',
    'Ashapuri Temple Rear Waste Hub',
    'Behind Ashapuri Mata Mandir, Ashapuri Road, Navsari',
    20.9442000, 72.9221000,
    CURRENT_DATE,
    (CURRENT_DATE + TIME '06:00:00')::timestamptz,
    (CURRENT_DATE + TIME '09:00:00')::timestamptz,
    100, 150,
    'Clear overflowing 1100-litre green bin, wash surrounding floor area with disinfectant spray, sprinkle white lime powder to prevent odor and insect breeding.',
    'Wear full PPE, double nitrile gloves, and N95 mask during wet organic waste clearance.',
    '["Hydraulic dumper bin lifter", "Pressure spray tank", "Disinfectant liquid", "Lime powder bag"]'::jsonb,
    '+919825110003',
    'completion_submitted',
    'd0000000-0000-0000-0000-000000000003'
)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- 7. ASSIGN WORKERS AND TEMPORARY TEAM LEADERSHIP
-- Task 1: Kanti Solanki is TEMPORARY TEAM LEADER
INSERT INTO work_assignment_members (id, assignment_id, worker_id, temporary_leader, assignment_status)
VALUES
('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', TRUE, 'present'),  -- Kanti Solanki (Temporary Leader!)
('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000002', FALSE, 'present'), -- Suresh Vaghela (Team member)
('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000005', FALSE, 'present'), -- Mahesh Chauhan (Equipment operator)

-- Task 2: Suresh Vaghela is TEMPORARY TEAM LEADER for Task 2 (Demonstrating task-specific leadership!)
('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000002', TRUE, 'assigned'),  -- Suresh Vaghela (Leader for Task 2)
('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000003', 'f2000000-0000-0000-0000-000000000001', TRUE, 'present')   -- Kanti Solanki (Leader for Task 3)
ON CONFLICT (assignment_id, worker_id) DO NOTHING;

-- 8. RECORD ATTENDANCE FOR TASK 1 (Location-Validated within 24 meters!)
INSERT INTO worker_attendance (
    id, assignment_id, worker_id, attendance_timestamp,
    latitude, longitude, gps_accuracy, distance_from_assignment_meters, geofence_radius_meters,
    validation_status, validation_reason, attendance_method
)
VALUES
(
    'c1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'f2000000-0000-0000-0000-000000000001',
    (CURRENT_DATE + TIME '07:22:00')::timestamptz,
    20.9486200, 72.9261100, 8.5, 17.4, 100,
    'verified_match', 'GPS coordinates matched task site within 17.4 meters (permitted radius: 100m).', 'gps'
),
(
    'c1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001',
    'f2000000-0000-0000-0000-000000000002',
    (CURRENT_DATE + TIME '07:25:00')::timestamptz,
    20.9485800, 72.9260500, 10.0, 10.2, 100,
    'verified_match', 'GPS coordinates matched task site within 10.2 meters (permitted radius: 100m).', 'gps'
)
ON CONFLICT (id) DO NOTHING;

-- 9. SEED BEFORE EVIDENCE FOR TASK 1
INSERT INTO work_evidence (
    id, assignment_id, submitted_by, evidence_type, storage_path, description,
    latitude, longitude, gps_accuracy, distance_from_assignment_meters, location_validation_status,
    ai_analysis_status, ai_analysis_result, review_status
)
VALUES
(
    'e2000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'f2000000-0000-0000-0000-000000000001',
    'before',
    'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
    'Heavy silt and plastic debris clogged across the storm drain mouth, obstructing culvert water discharge.',
    20.9485200, 72.9260300, 6.2, 4.2, 'location_matched',
    'completed', '{"cleanliness_score": 18, "waste_detected": true, "debris_type": "silt_and_plastic"}'::jsonb,
    'verified'
),
-- And for Task 3 (Completed task with Before & After evidence)
(
    'e2000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000003',
    'f2000000-0000-0000-0000-000000000001',
    'before',
    'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
    'Overspill of wet flower offerings, cardboard boxes, and plastics around the market dustbin perimeter.',
    20.9442100, 72.9221200, 7.0, 2.5, 'location_matched',
    'completed', '{"cleanliness_score": 22, "waste_detected": true}'::jsonb,
    'verified'
),
(
    'e2000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000003',
    'f2000000-0000-0000-0000-000000000001',
    'after',
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    'Entire waste pile loaded into compactor, surrounding platform disinfected and sprinkled with sanitary lime.',
    20.9442050, 72.9221050, 5.8, 1.2, 'location_matched',
    'completed', '{"cleanliness_score": 96, "waste_detected": false, "improvement_rate": 88}'::jsonb,
    'submitted'
)
ON CONFLICT (id) DO NOTHING;

-- 10. SEED WORK COMPLETION REPORT FOR TASK 3 (Submitted by Temporary Team Leader Kanti Solanki)
INSERT INTO work_completion_reports (
    id, assignment_id, submitted_by, completion_description,
    actual_start_time, actual_end_time, waste_quantity, waste_disposal_destination,
    equipment_used, issues_encountered, pending_work, status
)
VALUES
(
    'r1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000003',
    'f2000000-0000-0000-0000-000000000001',
    'Successfully cleared festival waste overspill, washed cement apron with bleaching solution, and applied insecticidal lime boundary powder.',
    (CURRENT_DATE + TIME '06:10:00')::timestamptz,
    (CURRENT_DATE + TIME '08:45:00')::timestamptz,
    'Approx 420 kg (1 full dumper bin load)',
    'Navsari Municipal Solid Waste Processing Plant, Junathana',
    '["1100L Hydraulic Dumper Bin", "Pressure Wash Jet", "2 Bags Lime Powder", "Safety Cones"]'::jsonb,
    'Heavy initial parked two-wheeler congestion near temple gate resolved with traffic warden.',
    'None. Site completely restored and handed over.',
    'submitted'
)
ON CONFLICT (id) DO NOTHING;

