-- ==============================================================================
-- SWACHH SETU / MY CLEAN NAVSARI
-- COMMUNITY HEAD DASHBOARD - DATABASE SCHEMA MIGRATION
-- Smart India Hackathon PS000089
-- ==============================================================================

-- 1. COMMUNITIES TABLE
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_name VARCHAR(150) NOT NULL,
    organisation_type VARCHAR(50) NOT NULL DEFAULT 'Resident Welfare Association',
    registration_number VARCHAR(100) NULL,
    description TEXT NULL,
    logo_path TEXT NULL,
    address TEXT NOT NULL,
    locality VARCHAR(100) NOT NULL DEFAULT 'Navsari',
    ward_id VARCHAR(50) NULL REFERENCES wards(id) ON DELETE SET NULL,
    ward_number INT NOT NULL DEFAULT 3,
    ward_name VARCHAR(100) NOT NULL DEFAULT 'Ward 3 - Dudhiya Talao & Ashapuri',
    contact_email VARCHAR(150) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'verified', -- 'pending', 'verified', 'rejected', 're_verification_required'
    verification_comments TEXT NULL,
    verified_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. COMMUNITY MEMBERS TABLE (Only ONE community_head role)
CREATE TABLE IF NOT EXISTS community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    membership_role VARCHAR(50) NOT NULL DEFAULT 'community_head', -- Enforced: strictly community_head
    membership_status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'suspended'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_community_head UNIQUE (community_id, user_id)
);

-- 3. COMMUNITY ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS community_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    short_description VARCHAR(300) NOT NULL,
    detailed_description TEXT NOT NULL,
    activity_category VARCHAR(60) NOT NULL, -- 'Public Area Cleaning', 'Roadside Cleaning', etc.
    objectives JSONB DEFAULT '[]'::jsonb,
    expected_outcomes JSONB DEFAULT '[]'::jsonb,
    instructions TEXT NOT NULL,
    equipment_requirements JSONB DEFAULT '[]'::jsonb,
    safety_guidelines TEXT NOT NULL,
    faq JSONB DEFAULT '[]'::jsonb,
    cover_image_path TEXT NOT NULL,
    ward_id VARCHAR(50) NULL REFERENCES wards(id) ON DELETE SET NULL,
    ward_number INT NOT NULL DEFAULT 3,
    ward_name VARCHAR(100) NOT NULL DEFAULT 'Ward 3 - Dudhiya Talao',
    latitude DOUBLE PRECISION NOT NULL DEFAULT 20.9470,
    longitude DOUBLE PRECISION NOT NULL DEFAULT 72.9280,
    address TEXT NOT NULL,
    landmark VARCHAR(150) NULL,
    proposed_start_at TIMESTAMPTZ NOT NULL,
    proposed_end_at TIMESTAMPTZ NOT NULL,
    registration_open_at TIMESTAMPTZ NOT NULL,
    registration_close_at TIMESTAMPTZ NOT NULL,
    maximum_participants INT NOT NULL DEFAULT 50,
    minimum_participants INT NOT NULL DEFAULT 10,
    waiting_list_enabled BOOLEAN DEFAULT TRUE,
    registration_requires_approval BOOLEAN DEFAULT FALSE,
    publication_status VARCHAR(30) NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'unpublished'
    approval_status VARCHAR(40) NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'ward_review', 'ward_approved', 'nmc_admin_review', 'nmc_admin_approved', 'changes_requested', 'rejected'
    registration_status VARCHAR(30) NOT NULL DEFAULT 'not_open', -- 'not_open', 'open', 'closed', 'reopened', 'full', 'cancelled'
    event_status VARCHAR(30) NOT NULL DEFAULT 'upcoming', -- 'upcoming', 'ongoing', 'completed', 'cancelled'
    evidence_status VARCHAR(30) NOT NULL DEFAULT 'not_submitted', -- 'not_submitted', 'submitted', 'ward_verified', 'nmc_verified', 'changes_requested'
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ACTIVITY APPROVAL LOGS (Ward Officer & NMC Admin)
CREATE TABLE IF NOT EXISTS community_activity_approval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES community_activities(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewer_role VARCHAR(50) NOT NULL, -- 'ward_officer', 'nmc_admin'
    review_stage VARCHAR(50) NOT NULL, -- 'ward_officer_review', 'nmc_admin_review'
    decision VARCHAR(50) NOT NULL, -- 'approved', 'rejected', 'changes_requested', 'resubmitted'
    comments TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ACTIVITY VERSIONS & AUDIT LOGS
CREATE TABLE IF NOT EXISTS community_activity_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES community_activities(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    snapshot JSONB NOT NULL,
    changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    change_reason VARCHAR(255) NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES community_activities(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action VARCHAR(60) NOT NULL,
    previous_status VARCHAR(40) NULL,
    new_status VARCHAR(40) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ACTIVITY REGISTRATIONS & ATTENDANCE
CREATE TABLE IF NOT EXISTS activity_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES community_activities(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    registration_number VARCHAR(50) NOT NULL UNIQUE,
    registration_status VARCHAR(30) NOT NULL DEFAULT 'registered', -- 'registered', 'waitlisted', 'cancelled', 'pending_approval'
    attendance_status VARCHAR(30) NOT NULL DEFAULT 'not_marked', -- 'not_marked', 'present', 'absent', 'excused'
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_activity_citizen UNIQUE (activity_id, citizen_id)
);

CREATE TABLE IF NOT EXISTS activity_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES community_activities(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    position INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'waiting', -- 'waiting', 'promoted', 'expired', 'cancelled'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_activity_waitlist UNIQUE (activity_id, citizen_id)
);

-- 7. CITIZEN QUESTIONS & AI CHATBOT SUGGESTIONS
CREATE TABLE IF NOT EXISTS activity_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES community_activities(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_language VARCHAR(10) NOT NULL DEFAULT 'en', -- 'en', 'gu', 'hi'
    status VARCHAR(40) NOT NULL DEFAULT 'new', -- 'new', 'ai_suggestion_pending', 'ai_suggestion_ready', 'awaiting_community_head_review', 'answered', 'closed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_question_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES activity_questions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sender_type VARCHAR(30) NOT NULL, -- 'citizen', 'community_head'
    message_text TEXT NOT NULL,
    message_language VARCHAR(10) NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_ai_answer_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES activity_questions(id) ON DELETE CASCADE,
    suggested_answer TEXT NOT NULL,
    answer_language VARCHAR(10) NOT NULL DEFAULT 'en',
    answerability_status VARCHAR(30) NOT NULL DEFAULT 'high_confidence', -- 'high_confidence', 'partial_info', 'requires_manual_confirmation'
    supporting_information JSONB DEFAULT '[]'::jsonb,
    missing_information JSONB DEFAULT '[]'::jsonb,
    model_name VARCHAR(100) DEFAULT 'NavsariCivicNLP-Retrieval-v1',
    model_version VARCHAR(30) DEFAULT 'v1.4.0',
    prompt_version VARCHAR(30) DEFAULT 'rag-navsari-sih-2026',
    generation_status VARCHAR(30) DEFAULT 'ready',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_question_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES activity_questions(id) ON DELETE CASCADE,
    suggestion_id UUID NULL REFERENCES activity_ai_answer_suggestions(id) ON DELETE SET NULL,
    responder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL,
    ai_assisted BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. EVENT ANNOUNCEMENTS & TARGETED NOTIFICATIONS
CREATE TABLE IF NOT EXISTS activity_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES community_activities(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_category VARCHAR(50) NOT NULL DEFAULT 'General Announcement',
    target_audience VARCHAR(40) NOT NULL DEFAULT 'confirmed_participants', -- 'all_registered', 'confirmed_participants', 'waitlisted'
    scheduled_at TIMESTAMPTZ NULL,
    published_at TIMESTAMPTZ NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'sent', -- 'draft', 'scheduled', 'queued', 'sent', 'cancelled'
    idempotency_key VARCHAR(100) NULL,
    total_recipients INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_announcement_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES activity_announcements(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    registration_id UUID NULL REFERENCES activity_registrations(id) ON DELETE CASCADE,
    delivery_status VARCHAR(30) NOT NULL DEFAULT 'delivered', -- 'queued', 'sent', 'delivered', 'read', 'failed'
    delivered_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ NULL,
    error_message TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_announcement_citizen UNIQUE (announcement_id, citizen_id)
);

-- 9. EVENT GALLERY & EVIDENCE
CREATE TABLE IF NOT EXISTS activity_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES community_activities(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    evidence_type VARCHAR(30) NOT NULL, -- 'before', 'during', 'after'
    storage_path TEXT NOT NULL,
    caption VARCHAR(255) NOT NULL,
    description TEXT NULL,
    latitude DOUBLE PRECISION NULL,
    longitude DOUBLE PRECISION NULL,
    image_hash VARCHAR(64) NULL,
    evidence_version INT NOT NULL DEFAULT 1,
    submission_status VARCHAR(30) NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'verified', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_evidence_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES community_activities(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    submission_version INT NOT NULL DEFAULT 1,
    submission_status VARCHAR(40) NOT NULL DEFAULT 'under_ward_review', -- 'under_ward_review', 'ward_approved', 'under_nmc_review', 'verified_complete', 'changes_requested', 'rejected'
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_evidence_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID NULL REFERENCES activity_evidence(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES community_activities(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewer_role VARCHAR(50) NOT NULL, -- 'ward_officer', 'nmc_admin'
    decision VARCHAR(40) NOT NULL, -- 'approved', 'rejected', 'changes_requested'
    comments TEXT NOT NULL,
    reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. COMMUNITY AI AUDIT RECORDS
CREATE TABLE IF NOT EXISTS community_ai_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NULL REFERENCES community_activities(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_type VARCHAR(60) NOT NULL, -- 'suggest_answer', 'generate_description', 'check_quality', 'compare_before_after', 'community_insights'
    status VARCHAR(30) NOT NULL DEFAULT 'completed',
    result JSONB NOT NULL,
    error_message TEXT NULL,
    model_name VARCHAR(100) DEFAULT 'NavsariAI-DeepVision-ResNet50',
    model_version VARCHAR(30) DEFAULT 'v1.3.0',
    processing_time_ms INT DEFAULT 185,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_image_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES community_activities(id) ON DELETE CASCADE,
    evidence_id UUID NOT NULL REFERENCES activity_evidence(id) ON DELETE CASCADE,
    predicted_category VARCHAR(100) NOT NULL,
    confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0.94,
    quality_flags JSONB DEFAULT '{"is_blurry": false, "is_dark": false, "is_duplicate": false}'::jsonb,
    duplicate_similarity DOUBLE PRECISION DEFAULT 0.05,
    model_name VARCHAR(100) DEFAULT 'OpenCV-Laplacian+PyTorchResNet50',
    model_version VARCHAR(30) DEFAULT 'v1.3.0',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_before_after_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES community_activities(id) ON DELETE CASCADE,
    before_evidence_id UUID NOT NULL REFERENCES activity_evidence(id) ON DELETE CASCADE,
    after_evidence_id UUID NOT NULL REFERENCES activity_evidence(id) ON DELETE CASCADE,
    analysis_result JSONB NOT NULL,
    model_name VARCHAR(100) DEFAULT 'Navsari-PerceptualDiff-v1',
    model_version VARCHAR(30) DEFAULT 'v1.1.0',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR HIGH-PERFORMANCE SEARCH & PAGINATION
CREATE INDEX IF NOT EXISTS idx_community_activities_community_id ON community_activities(community_id);
CREATE INDEX IF NOT EXISTS idx_community_activities_ward_id ON community_activities(ward_id);
CREATE INDEX IF NOT EXISTS idx_community_activities_status ON community_activities(approval_status, registration_status, event_status);
CREATE INDEX IF NOT EXISTS idx_activity_registrations_activity_id ON activity_registrations(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_registrations_citizen_id ON activity_registrations(citizen_id);
CREATE INDEX IF NOT EXISTS idx_activity_questions_activity_id ON activity_questions(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_questions_status ON activity_questions(status);
CREATE INDEX IF NOT EXISTS idx_activity_evidence_activity_id ON activity_evidence(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_announcements_activity_id ON activity_announcements(activity_id);

