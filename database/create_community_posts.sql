-- Community Recognition Spotlight Posts (LinkedIn-Style Civic Wall)

CREATE TABLE IF NOT EXISTS community_recognition_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name VARCHAR(150) NOT NULL DEFAULT 'Navsari Municipal Corporation',
  author_role VARCHAR(100) DEFAULT 'NMC Swachhata Cell (Official)',
  author_avatar VARCHAR(255),
  is_verified_nmc BOOLEAN DEFAULT TRUE,
  ward_number INTEGER DEFAULT 3,
  ward_name VARCHAR(150) DEFAULT 'Ward 3 - Dudhiya Talao',
  hero_name VARCHAR(150) NOT NULL,
  hero_role VARCHAR(150) DEFAULT 'Civic Cleanliness Champion',
  badge_title VARCHAR(150) DEFAULT 'Spotlight of the Week',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  achievement_stats VARCHAR(255) DEFAULT '450 kg waste cleared · 15 saplings planted',
  image_url TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recognition_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES community_recognition_posts(id) ON DELETE CASCADE,
  citizen_id UUID,
  citizen_name VARCHAR(150) NOT NULL,
  citizen_role VARCHAR(100) DEFAULT 'Citizen',
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recognition_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES community_recognition_posts(id) ON DELETE CASCADE,
  citizen_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, citizen_id)
);

-- Seed Authentic Community Spotlight Posts
INSERT INTO community_recognition_posts (
  id, author_name, author_role, is_verified_nmc, ward_number, ward_name,
  hero_name, hero_role, badge_title, title, description,
  achievement_stats, image_url, likes_count, comments_count, created_at
) VALUES 
(
  'a0000000-0000-0000-0000-000000000001',
  'Navsari Municipal Corporation',
  'Swachh Bharat Mission Cell · NMC',
  true,
  3,
  'Ward 3 - Dudhiya Talao',
  'Umesh Pal & Jalalpore Green Brigade',
  'Civic Action Lead · 45 Community Volunteers',
  '🌟 Swachhata Hero of the Month',
  'Transforming a 400m Chronic Waste Point near Dudhiya Talao West into a Green Zone',
  'Hearty congratulations to Umesh Pal and the Jalalpore Green Brigade! Over the weekend, 45 passionate youth volunteers teamed up with Ward 3 sanitation workers to clear a 2-year-old chronic garbage accumulation spot. Not only was 650 kg of plastic debris segregated, but the team also painted clean civic wall murals and installed 4 public dustbins. NMC salutes your outstanding dedication to Navsari!',
  '650 kg segregated waste · 12 native saplings planted · 4 bins installed',
  'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=1200&q=80',
  84,
  12,
  NOW() - INTERVAL '3 hours'
),
(
  'a0000000-0000-0000-0000-000000000002',
  'Navsari Municipal Corporation',
  'Sanitation Directorate · NMC',
  true,
  9,
  'Ward 9 - Junathana Market',
  'Kishorebhai Parmar & Night Sanitation Crew',
  'Chief Sanitation Supervisor · 18 Years NMC Service',
  '🧹 Municipal Guardian of Cleanliness',
  'Zero-Litter Morning Mission: Night Shift Sanitation Heroics at Junathana Market',
  'While Navsari sleeps, Kishorebhai Parmar and his dedicated 12-member squad work tirelessly from midnight to 5 AM to ensure the wholesale vegetable market is 100% swept, disinfected, and washed before traders arrive at dawn. This week they achieved a record 99.4% cleanliness rating. Let us take a moment to appreciate the heroes behind our clean mornings!',
  '1.8 tonnes organic waste processed · 100% daily market coverage',
  'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1200&q=80',
  142,
  27,
  NOW() - INTERVAL '1 day'
),
(
  'a0000000-0000-0000-0000-000000000003',
  'Navsari Municipal Corporation',
  'Youth & Education Outreach · NMC',
  true,
  4,
  'Ward 4 - Lunsikui',
  'Sayaji High School Eco-Club (Pooja Desai & Team)',
  'Student Environmental Council',
  '🌱 Green Champions of Navsari',
  'School Campus & Sayaji Library 100% Single-Use Plastic-Free Campaign',
  'Inspiring civic leadership by our younger generation! Pooja Desai and 30 student ambassadors from Sayaji High School ran a 14-day zero-waste drive across Lunsikui public parks. They collected 280 kg of discarded plastic bottles and partnered with local scrap recyclers to convert them into 15 recycled park benches. Inspiring all of Gujarat!',
  '280 kg plastic bottles recycled · 15 benches created · 350 citizens sensitized',
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80',
  96,
  15,
  NOW() - INTERVAL '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Comments
INSERT INTO recognition_post_comments (post_id, citizen_name, citizen_role, comment_text, created_at)
VALUES 
(
  'a0000000-0000-0000-0000-000000000001',
  'Ramesh Patel',
  'Ward 4 Officer',
  'Tremendous teamwork by Umesh and the brigade! As ward officers, having active community partners makes all the difference. Full support from NMC for your next drive.',
  NOW() - INTERVAL '2 hours'
),
(
  'a0000000-0000-0000-0000-000000000001',
  'Dr. Neha Shah',
  'Resident, Dudhiya Talao',
  'I walk along this road every morning and the difference is night and day. The foul smell is completely gone and the planters look gorgeous. Proud of our youth!',
  NOW() - INTERVAL '1 hour'
),
(
  'a0000000-0000-0000-0000-000000000002',
  'Umesh Pal',
  'Citizen Volunteer',
  'Kishorebhai and his team are the real unsung heroes of our city. Seeing their hard work motivates us all to keep our surroundings clean. Thank you NMC!',
  NOW() - INTERVAL '18 hours'
)
ON CONFLICT DO NOTHING;

