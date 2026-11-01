-- ==============================================================================
-- SWACHH SETU: WORKER DASHBOARD & MUNICIPAL FIELD OPERATIONS SCHEMA
-- Navsari Municipal Corporation (NMC) - Smart India Hackathon
-- ==============================================================================

-- 1. WORKER DESIGNATIONS (Configurable by NMC Admin)
CREATE TABLE IF NOT EXISTS worker_designations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    designation_code VARCHAR(50) UNIQUE NOT NULL,
    designation_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WORKER SKILLS
CREATE TABLE IF NOT EXISTS worker_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. WORKER PROFILES (Extends profiles table)
CREATE TABLE IF NOT EXISTS worker_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    worker_code VARCHAR(30) UNIQUE NOT NULL,
    primary_designation_id UUID REFERENCES worker_designations(id),
    ward_id VARCHAR(50),
    ward_number INT DEFAULT 3,
    ward_name VARCHAR(100) DEFAULT 'Ward 3 - Dudhiya Talao',
    employment_status VARCHAR(30) DEFAULT 'permanent', -- 'permanent', 'contractual', 'daily_wage'
    joining_date DATE DEFAULT '2024-01-15',
    experience_years NUMERIC(4, 1) DEFAULT 3.0,
    availability_status VARCHAR(30) DEFAULT 'available', -- 'available', 'on_duty', 'on_leave', 'reassigned'
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    language_preference VARCHAR(10) DEFAULT 'gu', -- 'gu', 'hi', 'en'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WORKER PROFILE SKILLS MAPPING
CREATE TABLE IF NOT EXISTS worker_profile_skills (
    worker_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES worker_skills(id) ON DELETE CASCADE,
    proficiency VARCHAR(30) DEFAULT 'skilled', -- 'basic', 'skilled', 'expert'
    PRIMARY KEY (worker_id, skill_id)
);

-- 5. DAILY WORK ASSIGNMENTS
CREATE TABLE IF NOT EXISTS work_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_code VARCHAR(30) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'drainage_cleaning', 'street_cleaning', 'garbage_collection', 'open_dumping_removal', 'bin_clearance', 'public_toilet_maintenance', 'cleanliness_drive_support'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'emergency'
    ward_id VARCHAR(50),
    ward_number INT DEFAULT 3,
    ward_name VARCHAR(100) DEFAULT 'Ward 3 - Dudhiya Talao',
    location_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_start_time TIMESTAMPTZ NOT NULL,
    expected_end_time TIMESTAMPTZ NOT NULL,
    attendance_radius_meters INT DEFAULT 100, -- Geofence radius in meters
    evidence_radius_meters INT DEFAULT 150,
    work_instructions TEXT,
    safety_instructions TEXT,
    required_equipment JSONB DEFAULT '[]'::jsonb,
    emergency_contact_phone VARCHAR(20) DEFAULT '+919825110003',
    status VARCHAR(30) DEFAULT 'assigned', -- 'assigned', 'acknowledged', 'in_progress', 'completion_submitted', 'under_review', 'changes_requested', 'verified_complete', 'closed', 'cancelled'
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. WORK ASSIGNMENT MEMBERS & TEMPORARY TEAM LEADERSHIP
-- Leadership is task-specific, stored here rather than as a permanent role
CREATE TABLE IF NOT EXISTS work_assignment_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES work_assignments(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    temporary_leader BOOLEAN DEFAULT FALSE, -- Temporary leadership flag for THIS task
    assignment_status VARCHAR(30) DEFAULT 'assigned', -- 'assigned', 'acknowledged', 'present', 'absent', 'reassigned'
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES profiles(id),
    removed_at TIMESTAMPTZ,
    removed_by UUID REFERENCES profiles(id),
    UNIQUE (assignment_id, worker_id)
);

-- 7. LOCATION-VALIDATED WORKER ATTENDANCE
CREATE TABLE IF NOT EXISTS worker_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES work_assignments(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    attendance_timestamp TIMESTAMPTZ DEFAULT NOW(),
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    gps_accuracy NUMERIC(8, 2) DEFAULT 10.0,
    distance_from_assignment_meters NUMERIC(10, 2) NOT NULL,
    geofence_radius_meters INT NOT NULL,
    validation_status VARCHAR(30) NOT NULL, -- 'verified_match', 'location_mismatch', 'poor_accuracy', 'exception_approved', 'exception_rejected'
    validation_reason TEXT,
    device_capture_timestamp TIMESTAMPTZ DEFAULT NOW(),
    server_received_at TIMESTAMPTZ DEFAULT NOW(),
    attendance_method VARCHAR(30) DEFAULT 'gps', -- 'gps', 'manual_exception'
    approved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ATTENDANCE EXCEPTIONS (GPS Discrepancy & Manual Verification Request)
CREATE TABLE IF NOT EXISTS attendance_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID REFERENCES worker_attendance(id) ON DELETE SET NULL,
    assignment_id UUID NOT NULL REFERENCES work_assignments(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    supporting_evidence TEXT,
    status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    reviewer_comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. WORK PROGRESS UPDATES
CREATE TABLE IF NOT EXISTS work_progress_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES work_assignments(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES worker_profiles(id),
    progress_description TEXT NOT NULL,
    progress_stage VARCHAR(50) DEFAULT 'ongoing', -- 'started', 'midway', 'debris_cleared', 'finishing'
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. BEFORE & AFTER WORK EVIDENCE
CREATE TABLE IF NOT EXISTS work_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES work_assignments(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES worker_profiles(id),
    evidence_type VARCHAR(20) NOT NULL, -- 'before', 'during', 'after'
    storage_path TEXT NOT NULL,
    description TEXT NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    gps_accuracy NUMERIC(8, 2) DEFAULT 10.0,
    distance_from_assignment_meters NUMERIC(10, 2),
    location_validation_status VARCHAR(50) DEFAULT 'location_matched', -- 'location_matched', 'location_mismatch', 'accuracy_insufficient', 'manual_upload'
    device_capture_timestamp TIMESTAMPTZ DEFAULT NOW(),
    server_upload_timestamp TIMESTAMPTZ DEFAULT NOW(),
    file_hash VARCHAR(64),
    ai_analysis_status VARCHAR(50) DEFAULT 'completed',
    ai_analysis_result JSONB,
    review_status VARCHAR(30) DEFAULT 'submitted', -- 'submitted', 'verified', 'changes_requested', 'rejected'
    review_comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. WORK COMPLETION REPORTS (Submitted by Temporary Team Leader)
CREATE TABLE IF NOT EXISTS work_completion_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL UNIQUE REFERENCES work_assignments(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES worker_profiles(id),
    completion_description TEXT NOT NULL,
    actual_start_time TIMESTAMPTZ NOT NULL,
    actual_end_time TIMESTAMPTZ NOT NULL,
    waste_quantity VARCHAR(100), -- 'Approx 380 kg' or '2.5 mini truck loads'
    waste_disposal_destination VARCHAR(255) DEFAULT 'Navsari Municipal Solid Waste Processing Plant, Junathana',
    equipment_used JSONB DEFAULT '[]'::jsonb,
    issues_encountered TEXT,
    pending_work TEXT,
    status VARCHAR(30) DEFAULT 'submitted', -- 'submitted', 'under_review', 'verified_complete', 'changes_requested', 'rejected'
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_comments TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. WORK REVIEW & AUDIT LOGS
CREATE TABLE IF NOT EXISTS work_review_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES work_assignments(id) ON DELETE CASCADE,
    report_id UUID REFERENCES work_completion_reports(id),
    reviewer_id UUID NOT NULL REFERENCES profiles(id),
    reviewer_role VARCHAR(50) NOT NULL, -- 'ward_officer', 'nmc_admin'
    action VARCHAR(50) NOT NULL, -- 'verified_complete', 'changes_requested', 'rejected', 'evidence_verified'
    comments TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TEMPORARY LEADERSHIP ASSIGNMENT HISTORY
CREATE TABLE IF NOT EXISTS temporary_leadership_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES work_assignments(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    removed_at TIMESTAMPTZ,
    removal_reason TEXT
);

-- INDEXES FOR HIGH PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_work_assignments_ward ON work_assignments(ward_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_work_assignments_status ON work_assignments(status);
CREATE INDEX IF NOT EXISTS idx_work_members_worker ON work_assignment_members(worker_id, assignment_id);
CREATE INDEX IF NOT EXISTS idx_work_attendance_worker ON worker_attendance(worker_id, assignment_id);
CREATE INDEX IF NOT EXISTS idx_work_evidence_assignment ON work_evidence(assignment_id, evidence_type);

