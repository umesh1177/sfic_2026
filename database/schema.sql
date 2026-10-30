-- ==============================================================================
-- MY CLEAN NAVSARI - COMPLETE POSTGRESQL & POSTGIS DATABASE SCHEMA
-- Smart India Hackathon Problem Statement: PS000089
-- Navsari Municipal Corporation (NMC), Gujarat, India
-- ==============================================================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. AUTHENTICATION & SECURITY TABLES
-- ==============================================================================

-- Profiles linked to auth.users (Supabase / Custom JWT)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NULL,
    avatar_url TEXT NULL,
    preferred_language VARCHAR(10) DEFAULT 'en', -- 'en', 'gu', 'hi'
    address TEXT NULL,
    locality VARCHAR(100) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles (Role-based access control)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'citizen', -- 'citizen', 'ward_officer', 'sanitation_worker', 'super_admin'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_role UNIQUE (user_id, role)
);

-- Citizen authentication state and mobile verification metadata
CREATE TABLE IF NOT EXISTS citizen_auth_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    mobile_number VARCHAR(20) NOT NULL,
    password_hash TEXT NOT NULL,
    mobile_verified BOOLEAN DEFAULT FALSE,
    verification_completed_at TIMESTAMPTZ NULL,
    account_status VARCHAR(30) DEFAULT 'active', -- 'active', 'suspended', 'locked'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Secure OTP Verification Sessions (Never exposed through public API)
CREATE TABLE IF NOT EXISTS otp_verification_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile_number VARCHAR(20) NOT NULL,
    otp_hash TEXT NOT NULL,
    purpose VARCHAR(30) NOT NULL, -- 'signup', 'password_reset', 'phone_change'
    expires_at TIMESTAMPTZ NOT NULL,
    attempts_count INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    resend_count INT DEFAULT 0,
    verified_at TIMESTAMPTZ NULL,
    consumed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Login Security Audit Logs (Progressive delays and brute-force protection)
CREATE TABLE IF NOT EXISTS login_security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile_number_hash TEXT NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'login_success', 'login_failed', 'locked_out', 'captcha_failed'
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAPTCHA verification audit logs
CREATE TABLE IF NOT EXISTS captcha_verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    verification_provider VARCHAR(50) NOT NULL, -- 'turnstile', 'recaptcha_v3', 'inbuilt_challenge'
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. GEOGRAPHICAL & MUNICIPAL DATA (POSTGIS)
-- ==============================================================================

-- Navsari Municipal Corporation Official Wards (13 Administrative Wards)
CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_number INT NOT NULL UNIQUE,
    ward_name VARCHAR(100) NOT NULL,
    ward_name_gu VARCHAR(100) NULL,
    boundary GEOMETRY(MultiPolygon, 4326) NOT NULL,
    office_address TEXT NULL,
    ward_officer_name VARCHAR(100) NULL,
    contact_phone VARCHAR(20) NULL,
    cleanliness_score NUMERIC(3, 1) DEFAULT 8.5, -- Out of 10
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Key Localities within Navsari Wards
CREATE TABLE IF NOT EXISTS localities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
    locality_name VARCHAR(120) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Complaint Coordinates & PostGIS Location Mapping
CREATE TABLE IF NOT EXISTS complaint_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    location_point GEOMETRY(Point, 4326) NOT NULL,
    address TEXT NOT NULL,
    landmark VARCHAR(150) NULL,
    ward_id UUID NULL REFERENCES wards(id) ON DELETE SET NULL,
    location_accuracy NUMERIC(6, 2) NULL, -- In meters
    is_inside_nmc_boundary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. COMPLAINT MANAGEMENT SYSTEM
-- ==============================================================================

-- Categorization of Civic Cleanliness Issues
CREATE TABLE IF NOT EXISTS complaint_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL UNIQUE,
    category_name_gu VARCHAR(100) NOT NULL,
    category_name_hi VARCHAR(100) NOT NULL,
    description TEXT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'Trash2',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_number VARCHAR(30) NOT NULL UNIQUE, -- e.g. NMC-2026-10023
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES complaint_categories(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES complaint_locations(id) ON DELETE RESTRICT,
    ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    original_language VARCHAR(10) DEFAULT 'en',
    translated_description TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'submitted',
    -- 'submitted', 'under_review', 'assigned', 'in_progress', 'awaiting_verification', 'resolved', 'rejected', 'reopened', 'escalated'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ NULL,
    resolved_at TIMESTAMPTZ NULL,
    closed_at TIMESTAMPTZ NULL,
    reopened_at TIMESTAMPTZ NULL,
    is_duplicate BOOLEAN DEFAULT FALSE,
    parent_complaint_id UUID NULL REFERENCES complaints(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Complaint Media Attachments
CREATE TABLE IF NOT EXISTS complaint_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    media_type VARCHAR(30) DEFAULT 'image', -- 'image', 'audio', 'document'
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    image_hash VARCHAR(64) NULL, -- SHA-256 for perceptual/duplicate detection
    media_role VARCHAR(30) DEFAULT 'citizen_evidence', -- 'citizen_evidence', 'officer_resolution_proof'
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Append-Only Complaint Activity & Status Transition Audit Trail
CREATE TABLE IF NOT EXISTS complaint_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    actor_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    previous_status VARCHAR(30) NULL,
    new_status VARCHAR(30) NULL,
    description TEXT NOT NULL,
    reason TEXT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Citizen Satisfaction Rating & Written Feedback
CREATE TABLE IF NOT EXISTS complaint_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT NULL,
    resolution_satisfactory BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_complaint_feedback UNIQUE (complaint_id, citizen_id)
);

-- Citizen Following Existing Complaints (Subscribed to updates)
CREATE TABLE IF NOT EXISTS complaint_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_complaint_follow UNIQUE (complaint_id, citizen_id)
);

-- ==============================================================================
-- 4. AI / ML INTEGRATIONS & AUDIT
-- ==============================================================================

-- PyTorch Custom Classification Predictions
CREATE TABLE IF NOT EXISTS ai_image_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NULL REFERENCES complaints(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    image_hash VARCHAR(64) NOT NULL,
    predicted_category_id UUID NULL REFERENCES complaint_categories(id) ON DELETE SET NULL,
    confidence_score NUMERIC(5, 2) NOT NULL,
    model_name VARCHAR(100) NOT NULL DEFAULT 'NavsariWasteClassifier-ResNet50',
    model_version VARCHAR(20) NOT NULL DEFAULT 'v1.2.0',
    prediction_result JSONB NOT NULL,
    processing_time_ms INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Safety & AI Moderation (Text & Image)
CREATE TABLE IF NOT EXISTS content_moderation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    complaint_id UUID NULL REFERENCES complaints(id) ON DELETE CASCADE,
    image_moderation_result VARCHAR(30) NOT NULL DEFAULT 'SAFE', -- 'SAFE', 'UNSAFE', 'UNCERTAIN'
    text_moderation_result VARCHAR(30) NOT NULL DEFAULT 'SAFE', -- 'SAFE', 'UNSAFE', 'UNCERTAIN'
    moderation_status VARCHAR(30) NOT NULL DEFAULT 'APPROVED', -- 'APPROVED', 'BLOCKED', 'NEEDS_REVIEW'
    confidence_score NUMERIC(5, 2) NOT NULL,
    model_name VARCHAR(100) NOT NULL DEFAULT 'NavsariCivicModerator-Multimodal',
    model_version VARCHAR(20) NOT NULL DEFAULT 'v1.0.4',
    reason_code VARCHAR(100) NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Background Job Tracker
CREATE TABLE IF NOT EXISTS ai_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL, -- 'image_classification', 'content_moderation', 'speech_to_text', 'text_translation'
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    input_reference TEXT NOT NULL,
    result JSONB NULL,
    error_message TEXT NULL,
    started_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. COMMUNITY ACTION: DRIVES, CHALLENGES & REWARDS
-- ==============================================================================

-- NMC Swachhata Cleanliness Drives
CREATE TABLE IF NOT EXISTS cleanliness_drives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE RESTRICT,
    location_id UUID NULL REFERENCES complaint_locations(id) ON DELETE SET NULL,
    location_name VARCHAR(150) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    registration_deadline TIMESTAMPTZ NOT NULL,
    organiser_name VARCHAR(120) NOT NULL,
    status VARCHAR(30) DEFAULT 'upcoming', -- 'upcoming', 'ongoing', 'completed', 'cancelled'
    banner_path TEXT NULL,
    max_volunteers INT DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cleanliness Drive Registrations (Citizen RSVP)
CREATE TABLE IF NOT EXISTS drive_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id UUID NOT NULL REFERENCES cleanliness_drives(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    registration_status VARCHAR(30) DEFAULT 'registered', -- 'registered', 'cancelled'
    attendance_status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'attended', 'absent'
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_drive_registration UNIQUE (drive_id, citizen_id)
);

-- Verified Volunteer Evidence from Drives
CREATE TABLE IF NOT EXISTS drive_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id UUID NOT NULL REFERENCES cleanliness_drives(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    description TEXT NULL,
    verification_status VARCHAR(30) DEFAULT 'verified',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Municipal Community Cleanliness Challenges
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    challenge_type VARCHAR(50) NOT NULL, -- 'ward_cleanliness', 'zero_litter', 'recycling', 'reporting_streak'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_value INT NOT NULL,
    status VARCHAR(30) DEFAULT 'active', -- 'active', 'upcoming', 'completed'
    banner_url TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge Participants & Real-time Progress Tracking
CREATE TABLE IF NOT EXISTS challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    progress_value INT DEFAULT 0,
    participation_status VARCHAR(30) DEFAULT 'active', -- 'active', 'completed', 'dropped'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_challenge_participant UNIQUE (challenge_id, citizen_id)
);

-- Swachhata Badges and Recognition Definitions
CREATE TABLE IF NOT EXISTS reward_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'Award',
    tier VARCHAR(20) DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
    points INT DEFAULT 100,
    criteria JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Citizen Earned Badges & Recognition
CREATE TABLE IF NOT EXISTS citizen_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES reward_definitions(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    verification_reference VARCHAR(100) NULL,
    CONSTRAINT uq_citizen_reward UNIQUE (citizen_id, reward_id)
);

-- ==============================================================================
-- 6. NOTIFICATIONS & CITIZEN SUPPORT SYSTEM
-- ==============================================================================

-- Real-time In-App Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'complaint_status', 'drive_reminder', 'reward_earned', 'system_alert'
    reference_id UUID NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helpdesk Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ticket_number VARCHAR(30) NOT NULL UNIQUE, -- e.g. TKT-2026-0042
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'technical', 'garbage_collection', 'officer_conduct', 'feedback'
    status VARCHAR(30) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    resolution_message TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support Ticket Interactive Messages Thread
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. AUDIT & MULTILINGUAL LOCALIZATION
-- ==============================================================================

-- Immutable Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dynamic Translation Cache (Gujarati, Hindi, English)
CREATE TABLE IF NOT EXISTS translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    language_code VARCHAR(10) NOT NULL, -- 'gu', 'hi', 'en'
    translated_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_translation UNIQUE (entity_type, entity_id, language_code)
);

-- ==============================================================================
-- 8. INDEXES FOR HIGH-CONCURRENCY PERFORMANCE
-- ==============================================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_ward ON complaints(ward_id);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_submitted_at ON complaints(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_activity_complaint ON complaint_activity_logs(complaint_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_drive_registrations_citizen ON drive_registrations(citizen_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_citizen ON challenge_participants(citizen_id);

-- PostGIS GiST Indexes for Spatial Querying & Hotspot Analysis
CREATE INDEX IF NOT EXISTS idx_wards_boundary_gist ON wards USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_localities_location_gist ON localities USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_complaint_locations_point_gist ON complaint_locations USING GIST(location_point);
