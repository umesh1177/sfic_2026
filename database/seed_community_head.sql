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

-- 4. Seed Activities
INSERT INTO community_activities (
    id, community_id, title, short_description, detailed_description,
    activity_category, objectives, expected_outcomes, instructions,
    equipment_requirements, safety_guidelines, faq,
    cover_image_path, ward_id, ward_number, ward_name, latitude, longitude,
    address, landmark, proposed_start_at, proposed_end_at,
    registration_open_at, registration_close_at,
    maximum_participants, minimum_participants, waiting_list_enabled,
    publication_status, approval_status, registration_status, event_status, evidence_status,
    created_by
) VALUES 
(
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Dudhiya Talao Lakefront Mega Cleanliness Drive',
    'Comprehensive shoreline plastic debris clearance and public awareness campaign around Dudhiya Talao promenade.',
    'Join hands with 60+ passionate Navsari citizens, NMC sanitary supervisors, and youth environmentalists. We will clear discarded single-use plastics, clear clogged promenade stormwater grates, install educational segregation signs, and preserve lake ecology.',
    'Public Area Cleaning',
    '["Clear 500kg plastic waste", "Restore pedestrian promenade", "Install 8 color-coded wet/dry bins"]'::jsonb,
    '["100% litter-free lakefront perimeter", "Zero drain blockage for upcoming monsoon", "Higher civic cleanliness score"]'::jsonb,
    'Report to West Gate promenade booth by 7:15 AM for kit collection and volunteer safety briefing. Wear sturdy shoes and cap.',
    '["Heavy duty biodegradable gloves (provided)", "Garbage collection grabbers (provided)", "Reflective safety jackets (provided)"]'::jsonb,
    'Do not step into the water reservoir under any circumstance. High-visibility vests must be worn at all times near vehicular access points. First-aid box on site.',
    '[{"q": "Are cleaning gloves provided?", "a": "Yes, high-grade reusable rubber gloves and trash collection grabbers are supplied to all registered volunteers."}, {"q": "Where is the meeting point?", "a": "Opposite Ashapuri Garden Gate at West Promenade Helpdesk Booth."}]'::jsonb,
    'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1200&q=80',
    'ward-03',
    3,
    'Ward 3 - Dudhiya Talao & Ashapuri',
    20.9472,
    72.9281,
    'Dudhiya Talao West Promenade, Ward 3, Navsari',
    'Opposite Ashapuri Garden Gate 2',
    NOW() + INTERVAL '2 days',
    NOW() + INTERVAL '2 days 3 hours',
    NOW() - INTERVAL '5 days',
    NOW() + INTERVAL '1 day 18 hours',
    60,
    15,
    TRUE,
    'published',
    'nmc_admin_approved',
    'open',
    'upcoming',
    'not_submitted',
    'c0000000-0000-0000-0000-000000000099'
),
(
    'e0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'Sayaji Road Zero-Plastic & Segregation Drive',
    'Commercial shopping district plastic eradication and merchant shop-to-shop awareness drive.',
    'Commercial corridor cleanup involving 40 retail merchant establishments along Sayaji Road. Volunteers and municipal sanitary staff conducted street sweep, segregated commercial waste, and distributed cloth bags.',
    'Plastic-Free Campaign',
    '["Eliminate roadside plastic litter", "Engage 40 merchant shops in 2-bin segregation"]'::jsonb,
    '["850kg plastic collected and sent to NMC recycling centre", "Pledge taken by 40 shops"]'::jsonb,
    'Meet outside Sayaji Library Main Gate at 8:00 AM sharp.',
    '["Cloth bags", "Recycling jumbo bags", "Brooms & dustpans"]'::jsonb,
    'Stay on pedestrian pavements. Follow traffic warden guidance.',
    '[{"q": "Can school students participate?", "a": "Yes, secondary students are welcome with teacher or guardian guidance."}]'::jsonb,
    'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=1200&q=80',
    'ward-04',
    4,
    'Ward 4 - Lunsikui & Sayaji Road',
    20.9420,
    72.9210,
    'Sayaji Road Commercial Corridor, Ward 4, Navsari',
    'Near Sayaji Library & Town Hall',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days 3 hours',
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '5 days',
    40,
    10,
    TRUE,
    'published',
    'nmc_admin_approved',
    'closed',
    'completed',
    'verified_complete',
    'c0000000-0000-0000-0000-000000000099'
),
(
    'e0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'Junathana Heritage Ward Clean Sweep',
    'Heritage precinct deep cleanup, wall whitewashing and community dustbin placement.',
    'Community-driven restoration of historic Junathana clock tower perimeter and traditional marketplace streets.',
    'Public Area Cleaning',
    '["Heritage clock tower perimeter restoration", "Clean 4 traditional alleys"]'::jsonb,
    '["Spruce up heritage tourist zone"]'::jsonb,
    'Assemble near Clock Tower chowk at 7:30 AM.',
    '["Sanitation brushes", "Eco-friendly disinfectant sprays", "Safety gloves"]'::jsonb,
    'Wear masks in dusty historic alleys.',
    '[]'::jsonb,
    'https://images.unsplash.com/photo-1528323273322-d81458248d40?auto=format&fit=crop&w=1200&q=80',
    'ward-01',
    1,
    'Ward 1 - Junathana & Tower Area',
    20.9550,
    72.9250,
    'Tower Chowk, Junathana, Ward 1, Navsari',
    'Near Heritage Clock Tower',
    NOW() + INTERVAL '10 days',
    NOW() + INTERVAL '10 days 4 hours',
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '9 days',
    50,
    10,
    TRUE,
    'draft',
    'draft',
    'not_open',
    'upcoming',
    'not_submitted',
    'c0000000-0000-0000-0000-000000000099'
),
(
    'e0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    'Fuwara Chowk Anti-Littering Volunteer Campaign',
    'Intensive street cleaning and flyer distribution across busy transport junction.',
    'Cleaning up Fuwara circle road verges, passenger shelter areas and tea-stall public bins.',
    'Roadside Cleaning',
    '["Zero open littering at Fuwara Chowk"]'::jsonb,
    '["Cleaner traffic junction"]'::jsonb,
    'Meet near Fountain roundabout pavilion.',
    '["Litter tongs", "Trash bags", "Safety aprons"]'::jsonb,
    'Stay within zebra crossings and pedestrian zones.',
    '[]'::jsonb,
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80',
    'ward-05',
    5,
    'Ward 5 - Fuwara & Chhapra Road',
    20.9380,
    72.9150,
    'Fuwara Chowk Junction, Ward 5, Navsari',
    'Near Central Fountain',
    NOW() + INTERVAL '6 days',
    NOW() + INTERVAL '6 days 3 hours',
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '5 days',
    35,
    10,
    TRUE,
    'draft',
    'ward_review',
    'not_open',
    'upcoming',
    'not_submitted',
    'c0000000-0000-0000-0000-000000000099'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Approval Logs
INSERT INTO community_activity_approval_logs (activity_id, reviewer_id, reviewer_role, review_stage, decision, comments)
VALUES 
(
    'e0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000003',
    'ward_officer',
    'ward_officer_review',
    'approved',
    'Verified route around Dudhiya Talao promenade. Municipal dumper and sanitary staff allocated for Sunday 7:30 AM.'
),
(
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'nmc_admin',
    'nmc_admin_review',
    'approved',
    'Official NMC cleanliness campaign clearance granted. Green Warriors RWA authorised to open citizen registration.'
)
ON CONFLICT DO NOTHING;

-- 6. Seed Citizen Registrations
INSERT INTO activity_registrations (activity_id, citizen_id, registration_number, registration_status, attendance_status, registered_at)
VALUES 
(
    'e0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'REG-2026-NMC-101',
    'registered',
    'not_marked',
    NOW() - INTERVAL '2 days'
),
(
    'e0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'REG-2026-NMC-084',
    'registered',
    'present',
    NOW() - INTERVAL '8 days'
)
ON CONFLICT DO NOTHING;

-- 7. Seed Citizen Questions & AI Suggestions
INSERT INTO activity_questions (id, activity_id, community_id, citizen_id, question_text, question_language, status)
VALUES 
(
    'fa000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Where is the exact reporting and kit collection point for Sunday morning?',
    'en',
    'ai_suggestion_ready'
),
(
    'fa000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Are cleaning gloves and trash bags provided or do we need to bring our own?',
    'en',
    'answered'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_ai_answer_suggestions (id, question_id, suggested_answer, answerability_status, supporting_information)
VALUES 
(
    'fb000000-0000-0000-0000-000000000001',
    'fa000000-0000-0000-0000-000000000001',
    'Volunteers are requested to report at the West Promenade Helpdesk Booth opposite Ashapuri Garden Gate 2 at 7:15 AM for registration verification, safety vest allocation, and glove distribution.',
    'high_confidence',
    '["Approved meeting location: Opposite Ashapuri Garden Gate 2", "Reporting time: 7:15 AM", "Equipment: Gloves & vests provided"]'::jsonb
),
(
    'fb000000-0000-0000-0000-000000000002',
    'fa000000-0000-0000-0000-000000000002',
    'Yes, heavy-duty reusable rubber gloves, litter tongs/grabbers, and biodegradable trash collection bags will be provided to all registered participants at the registration desk.',
    'high_confidence',
    '["Equipment: Biodegradable gloves, grabbers, and bags provided by NMC & RWA"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_question_responses (id, question_id, suggestion_id, responder_id, response_text, ai_assisted)
VALUES (
    'fc000000-0000-0000-0000-000000000002',
    'fa000000-0000-0000-0000-000000000002',
    'fb000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000099',
    'Hi Harshil! Yes, high-grade rubber gloves, garbage pickers, and color-coded disposal bags are completely provided by Navsari Green Warriors and NMC. Just come with comfortable shoes and your water bottle!',
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- 8. Seed Announcements
INSERT INTO activity_announcements (
    id, activity_id, community_id, created_by, title, message,
    notification_category, target_audience, total_recipients, status
) VALUES (
    'fd000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000099',
    'Reporting Time & Kit Distribution for Dudhiya Talao Drive',
    'All confirmed volunteers please arrive by 7:15 AM at the West Promenade Helpdesk. Refreshments and certificate stamps will be provided post-drive.',
    'Important Instructions',
    'confirmed_participants',
    38,
    'sent'
)
ON CONFLICT (id) DO NOTHING;

-- 9. Seed Evidence Photos (Before, During, After for Sayaji Road)
INSERT INTO activity_evidence (
    id, activity_id, uploaded_by, evidence_type, storage_path, caption,
    description, submission_status
) VALUES 
(
    'fe000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000099',
    'before',
    'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
    'Before Cleanup - Heavy litter near pedestrian walkway',
    'Accumulated plastic cups, bottles, and commercial wrappers along Sayaji Road shopping lane before drive started.',
    'verified'
),
(
    'fe000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000099',
    'during',
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    'During Activity - Citizen Volunteers in Action',
    '40 volunteers and sanitation personnel sorting recyclable dry waste and loading bags onto NMC electric carrier.',
    'verified'
),
(
    'fe000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000099',
    'after',
    'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80',
    'After Cleanup - Spotless pavement & newly installed dustbins',
    'Pavement and road gutters completely cleared of debris, washed and certified spotless by Ward 4 Sanitary Inspector.',
    'verified'
)
ON CONFLICT (id) DO NOTHING;

-- Evidence Review Record
INSERT INTO activity_evidence_reviews (activity_id, reviewer_id, reviewer_role, decision, comments)
VALUES (
    'e0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000003',
    'ward_officer',
    'approved',
    'On-site inspection completed. Pavement is clear and 850kg waste safely handed over to GIDC recycling facility. Activity officially verified complete.'
)
ON CONFLICT DO NOTHING;
