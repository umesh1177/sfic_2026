-- ==============================================================================
-- MY CLEAN NAVSARI - PRODUCTION SEED DATA
-- Navsari Municipal Corporation (NMC), Gujarat
-- ==============================================================================

-- 1. Complaint Categories
INSERT INTO complaint_categories (id, category_name, category_name_gu, category_name_hi, description, icon) VALUES
('11111111-1111-1111-1111-111111111101', 'Littering', 'કચરો ફેંકવો', 'कचरा फैलाना', 'Public litter on streets, sidewalks, and market areas', 'Trash2'),
('11111111-1111-1111-1111-111111111102', 'Open Garbage Dumping', 'ખુલ્લામાં કચરો ઠાલવવો', 'खुले में कचरा डंपिंग', 'Unauthorized garbage dump heaps on vacant plots or roadside', 'AlertTriangle'),
('11111111-1111-1111-1111-111111111103', 'Overflowing Dustbin', 'ઉભરાતી કચરાપેટી', 'कूड़ेदान का ओवरफ्लो', 'Community dustbins and municipal bins overflowing with waste', 'Archive'),
('11111111-1111-1111-1111-111111111104', 'Roadside Garbage', 'રસ્તા કિનારે કચરો', 'सड़क किनारे कचरा', 'Accumulated debris, plastic packaging, and leaves along roads', 'Truck'),
('11111111-1111-1111-1111-111111111105', 'Drainage / Waste Accumulation', 'ગટર / કચરો જમા થવો', 'नाली या जल जमाव और कचरा', 'Choked drains, sewage overflow, and stagnant filthy waste water', 'Droplets'),
('11111111-1111-1111-1111-111111111106', 'Other Cleanliness Issues', 'અન્ય સ્વચ્છતા સમસ્યાઓ', 'अन्य स्वच्छता समस्याएं', 'Dead animal disposal, construction debris, or public toilet issues', 'HelpCircle')
ON CONFLICT (category_name) DO NOTHING;

-- 2. Official Navsari Administrative Wards (13 Wards with Realistic Boundaries)
INSERT INTO wards (id, ward_number, ward_name, ward_name_gu, office_address, ward_officer_name, contact_phone, cleanliness_score, boundary) VALUES
('22222222-2222-2222-2222-222222222201', 1, 'Lunsikui - Tower Road', 'લુન્સીકુઈ - ટાવર રોડ', 'Near Lunsikui Ground, Navsari', 'Ramesh Patel', '+91 98251 01001', 8.8,
 ST_Multi(ST_GeomFromText('POLYGON((72.9200 20.9400, 72.9350 20.9400, 72.9350 20.9550, 72.9200 20.9550, 72.9200 20.9400))', 4326))),
('22222222-2222-2222-2222-222222222202', 2, 'Station Road - Fuwara', 'સ્ટેશન રોડ - ફુવારા', 'Opp. Railway Station, Navsari', 'Dinesh Desai', '+91 98251 01002', 7.9,
 ST_Multi(ST_GeomFromText('POLYGON((72.9350 20.9400, 72.9500 20.9400, 72.9500 20.9550, 72.9350 20.9550, 72.9350 20.9400))', 4326))),
('22222222-2222-2222-2222-222222222203', 3, 'Dudhiya Talao - Ashapuri', 'દુધિયા તળાવ - આશાપુરી', 'Dudhiya Talao Lake Complex, Navsari', 'Bhavesh Solanki', '+91 98251 01003', 9.1,
 ST_Multi(ST_GeomFromText('POLYGON((72.9200 20.9250, 72.9350 20.9250, 72.9350 20.9400, 72.9200 20.9400, 72.9200 20.9250))', 4326))),
('22222222-2222-2222-2222-222222222204', 4, 'Kaliawadi - Sayaji Road', 'કાલિયાવાડી - સયાજી રોડ', 'Near Sayaji Library, Kaliawadi', 'Mitesh Naik', '+91 98251 01004', 8.4,
 ST_Multi(ST_GeomFromText('POLYGON((72.9350 20.9250, 72.9500 20.9250, 72.9500 20.9400, 72.9350 20.9400, 72.9350 20.9250))', 4326))),
('22222222-2222-2222-2222-222222222205', 5, 'Jalalpore Gateway - Chhapra', 'જલાલપોર - છાપરા', 'Jalalpore Main Rd, Navsari', 'Kiritbhai Vashi', '+91 98251 01005', 8.0,
 ST_Multi(ST_GeomFromText('POLYGON((72.9050 20.9300, 72.9200 20.9300, 72.9200 20.9500, 72.9050 20.9500, 72.9050 20.9300))', 4326))),
('22222222-2222-2222-2222-222222222206', 6, 'Shantadevi - Vijalpore', 'શાંતાદેવી - વિજલપોર', 'Shantadevi Road Civic Center', 'Pravin Rathod', '+91 98251 01006', 7.6,
 ST_Multi(ST_GeomFromText('POLYGON((72.9500 20.9300, 72.9650 20.9300, 72.9650 20.9500, 72.9500 20.9500, 72.9500 20.9300))', 4326))),
('22222222-2222-2222-2222-222222222207', 7, 'Gandevi Road - GIDC', 'ગણદેવી રોડ - જીઆઇડીસી', 'GIDC Office Sector 2, Navsari', 'Sunil Parekh', '+91 98251 01007', 8.2,
 ST_Multi(ST_GeomFromText('POLYGON((72.9350 20.9100, 72.9550 20.9100, 72.9550 20.9250, 72.9350 20.9250, 72.9350 20.9100))', 4326))),
('22222222-2222-2222-2222-222222222208', 8, 'Madhumati - Parsi Wad', 'મધુમતી - પારસી વાડ', 'Heritage Parsi Vad, Navsari', 'Cyrus Contractor', '+91 98251 01008', 9.3,
 ST_Multi(ST_GeomFromText('POLYGON((72.9200 20.9550, 72.9380 20.9550, 72.9380 20.9700, 72.9200 20.9700, 72.9200 20.9550))', 4326))),
('22222222-2222-2222-2222-222222222209', 9, 'Sandhkuva - Junathana', 'સાંઢકુવા - જૂનાથાણા', 'Junathana Market Compound', 'Haresh Kansara', '+91 98251 01009', 8.1,
 ST_Multi(ST_GeomFromText('POLYGON((72.9380 20.9550, 72.9550 20.9550, 72.9550 20.9700, 72.9380 20.9700, 72.9380 20.9550))', 4326))),
('22222222-2222-2222-2222-222222222210', 10, 'Vejalpore Extension', 'વેજલપોર એક્સટેન્શન', 'Vejalpore Community Hall', 'Jagdish Ahir', '+91 98251 01010', 8.5,
 ST_Multi(ST_GeomFromText('POLYGON((72.9500 20.9150, 72.9700 20.9150, 72.9700 20.9300, 72.9500 20.9300, 72.9500 20.9150))', 4326))),
('22222222-2222-2222-2222-222222222211', 11, 'Sarbhan - Aru Rural Gateway', 'સરભાણ - અરૂ', 'Sarbhan Chokdi Ward Center', 'Chetan Patel', '+91 98251 01011', 8.7,
 ST_Multi(ST_GeomFromText('POLYGON((72.9000 20.9100, 72.9200 20.9100, 72.9200 20.9300, 72.9000 20.9300, 72.9000 20.9100))', 4326))),
('22222222-2222-2222-2222-222222222212', 12, 'Eru Char Rasta - NAU Campus', 'એરૂ ચાર રસ્તા - કૃષિ યુનિવર્સિટી', 'Eru Char Rasta, Near NAU Gate', 'Dr. Sanjay Chauhan', '+91 98251 01012', 9.5,
 ST_Multi(ST_GeomFromText('POLYGON((72.9000 20.8900, 72.9300 20.8900, 72.9300 20.9100, 72.9000 20.9100, 72.9000 20.8900))', 4326))),
('22222222-2222-2222-2222-222222222213', 13, 'Dandi Coastal Corridor', 'દાંડી રોડ કોરિડોર', 'Dandi Road Heritage Junction', 'Amit Tandel', '+91 98251 01013', 9.2,
 ST_Multi(ST_GeomFromText('POLYGON((72.8800 20.9200, 72.9050 20.9200, 72.9050 20.9500, 72.8800 20.9500, 72.8800 20.9200))', 4326)))
ON CONFLICT (ward_number) DO NOTHING;

-- 3. Swachhata Badges & Rewards
INSERT INTO reward_definitions (id, name, description, icon, tier, points, criteria) VALUES
('33333333-3333-3333-3333-333333333301', 'Cleanliness Champion', 'Awarded for 5 verified resolved complaints with top citizen satisfaction', 'Award', 'gold', 500, '{"min_resolved_complaints": 5}'),
('33333333-3333-3333-3333-333333333302', 'Active Community Member', 'Active contributor who participated in municipal cleanliness drives', 'Users', 'silver', 250, '{"min_drives_attended": 2}'),
('33333333-3333-3333-3333-333333333303', 'Clean-up Volunteer', 'Attended first verified cleanliness drive in Navsari', 'HeartHandshake', 'bronze', 100, '{"min_drives_attended": 1}'),
('33333333-3333-3333-3333-333333333304', 'Responsible Reporter', 'Submitted accurate, high-quality civic reports with precise GPS coordinates', 'ShieldCheck', 'platinum', 750, '{"verified_reports": 10}')
ON CONFLICT (name) DO NOTHING;

-- 4. Active Community Challenges
INSERT INTO challenges (id, title, description, challenge_type, start_date, end_date, target_value, status, banner_url) VALUES
('44444444-4444-4444-4444-444444444401', 'Navsari Zero-Litter Week 2026', 'Citizens collaborate to report and verify clean spots across all 13 wards to achieve 100% waste clearance', 'zero_litter', '2026-10-25', '2026-11-05', 200, 'active', 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80'),
('44444444-4444-4444-4444-444444444402', 'Dudhiya Talao Plastic-Free Drive', 'Lakefront heritage preservation mission: pledge to keep Ward 3 lake perimeter free of single-use plastics', 'ward_cleanliness', '2026-10-28', '2026-11-15', 500, 'active', 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80'),
('44444444-4444-4444-4444-444444444403', 'Green Neighborhood 10-Day Streak', 'Encourage daily reporting and prompt resolution verification in residential localities', 'reporting_streak', '2026-10-20', '2026-11-01', 50, 'active', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80')
ON CONFLICT DO NOTHING;

-- 5. Upcoming Cleanliness Drives (Dynamic - No static seed)
