-- ==============================================================================
-- DaNA: Clinically Governed Baseline Database Schema (Version 3.0)
-- 19 Core Tables + Zero-Trust RLS Policies
-- Compliance: UAE Health Data Law (Law 2/2019), Decree-Law 49/2023, ADHICS, PDPL
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. USERS & PROFILES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    identity_ref VARCHAR(128) UNIQUE, -- UAE PASS UUID / hash
    role VARCHAR(32) NOT NULL DEFAULT 'couple' CHECK (role IN ('couple', 'counsellor', 'admin', 'supervisor', 'reviewer')),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_profiles (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(64) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    sex CHAR(1) NOT NULL CHECK (sex IN ('M', 'F')),
    preferred_language VARCHAR(8) NOT NULL DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'en')),
    phone_number_hash VARCHAR(64), -- SHA-256 for duplicate detection without storing plain mobile
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 2. CONSENT RECORDS (Individual Self-Authorization)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(64) NOT NULL, -- e.g. 'GENETIC_PROCESSING', 'MALAFFI_INGESTION', 'RESEARCH'
    scope VARCHAR(64) NOT NULL, -- e.g. 'SCREENING_PANEL', 'COUPLE_ASSESSMENT'
    version VARCHAR(16) NOT NULL DEFAULT '3.0',
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user_active
    ON consent_records (user_id, status) WHERE status = 'ACTIVE';

-- ==============================================================================
-- 3. MEDICAL & GENETIC RECORDS (Malaffi HIE Provenance)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS medical_records (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    patient_id VARCHAR(64) NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    source VARCHAR(64) NOT NULL DEFAULT 'MALAFFI',
    resource_type VARCHAR(64) NOT NULL, -- e.g. 'DiagnosticReport', 'Observation', 'Condition'
    external_reference VARCHAR(128),
    terminology_system VARCHAR(64), -- e.g. 'SNOMED-CT', 'LOINC', 'ICD-10'
    clinical_code VARCHAR(64),
    display_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'final',
    recorded_date DATE,
    raw_payload JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS genetic_reports (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    patient_id VARCHAR(64) NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    report_id VARCHAR(128) NOT NULL UNIQUE,
    source VARCHAR(64) NOT NULL DEFAULT 'MALAFFI_GENOMICS',
    laboratory_name VARCHAR(128) NOT NULL,
    accreditation_id VARCHAR(64), -- CAP / ISO 15189 accreditation
    test_methodology VARCHAR(128) NOT NULL DEFAULT 'Targeted NGS Panel',
    panel_coverage VARCHAR(64) NOT NULL DEFAULT '570 Genes',
    report_date DATE NOT NULL,
    validation_status VARCHAR(32) NOT NULL DEFAULT 'VALIDATED' CHECK (validation_status IN ('VALIDATED', 'PENDING_REVIEW', 'REJECTED')),
    digital_signature TEXT,
    file_storage_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS genetic_variants (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    report_id VARCHAR(64) NOT NULL REFERENCES genetic_reports(id) ON DELETE CASCADE,
    gene_symbol VARCHAR(32) NOT NULL, -- e.g. 'HBB', 'GJB2', 'SMN1', 'CFTR', 'G6PD'
    ncbi_gene_id VARCHAR(32),
    transcript_id VARCHAR(64),
    hgvs_c VARCHAR(128), -- e.g. 'c.92+1G>A'
    hgvs_p VARCHAR(128), -- e.g. 'p.Glu26Lys'
    genome_build VARCHAR(16) DEFAULT 'GRCh38',
    zygosity VARCHAR(32) NOT NULL CHECK (zygosity IN ('HETEROZYGOUS', 'HOMOZYGOUS', 'HEMIZYGOUS')),
    inheritance_pattern VARCHAR(32) NOT NULL CHECK (inheritance_pattern IN ('AR', 'AD', 'XL', 'MT')),
    clinical_significance VARCHAR(64) NOT NULL CHECK (clinical_significance IN ('PATHOGENIC', 'LIKELY_PATHOGENIC', 'VUS', 'BENIGN')),
    significance_source VARCHAR(64) DEFAULT 'ClinVar / ACMG 2024',
    review_status VARCHAR(64) DEFAULT 'criteria_provided_multiple_submitters',
    disease_association VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_genetic_variants_gene_symbol
    ON genetic_variants (gene_symbol, clinical_significance);

-- ==============================================================================
-- 4. COUPLES & PARTNER CONSENTS (Bonds)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS couples (
    id VARCHAR(64) PRIMARY KEY,
    partner_a_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_b_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_status VARCHAR(32) NOT NULL DEFAULT 'ENGAGED' CHECK (relationship_status IN ('ENGAGED', 'MARRIED', 'DISCONNECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_canonical_partners CHECK (partner_a_id < partner_b_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_couple
    ON couples (partner_a_id, partner_b_id)
    WHERE relationship_status <> 'DISCONNECTED';

-- Connection requests lifecycle preceding couple activation
CREATE TABLE IF NOT EXISTS connection_requests (
    id VARCHAR(64) PRIMARY KEY,
    sender_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED')),
    note VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_not_self_request CHECK (sender_id <> receiver_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_conn_request
    ON connection_requests (sender_id, receiver_id)
    WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS partner_consents (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    couple_id VARCHAR(64) NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope VARCHAR(64) NOT NULL DEFAULT 'COUPLE_RISK_ASSESSMENT' CHECK (scope IN ('COUPLE_RISK_ASSESSMENT', 'CARRIER_GENE', 'COUNSELLOR_DRAFT')),
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_not_self_partner_consent CHECK (owner_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_consents_active
    ON partner_consents (couple_id, owner_id, status)
    WHERE status = 'ACTIVE';

-- ==============================================================================
-- 5. FAMILY MEMBERS & CONDITIONS (Branches Pedigree)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS family_members (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(128) NOT NULL,
    relationship VARCHAR(64) NOT NULL, -- e.g. 'Father', 'Mother', 'Brother', 'Sister', 'Maternal Cousin', 'Paternal Cousin'
    gender CHAR(1) CHECK (gender IN ('M', 'F', 'U')),
    parent_ids TEXT[], -- Array of UUIDs for structural pedigree graph
    is_deceased BOOLEAN NOT NULL DEFAULT FALSE,
    evidence_status VARCHAR(32) NOT NULL DEFAULT 'REPORTED' CHECK (evidence_status IN ('REPORTED', 'DOCUMENTED', 'VERIFIED_GENETIC')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS family_conditions (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    member_id VARCHAR(64) NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    condition_name VARCHAR(128) NOT NULL,
    age_at_onset INT,
    source VARCHAR(64) NOT NULL DEFAULT 'PATIENT_ANAMNESIS',
    verification_status VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED', 'CLINICIAN_CONFIRMED'))
);

-- ==============================================================================
-- 6. CLINICAL CASES, COUNSELLORS & APPOINTMENTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS clinical_cases (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    couple_id VARCHAR(64) REFERENCES couples(id) ON DELETE SET NULL,
    patient_id VARCHAR(64) REFERENCES patient_profiles(id) ON DELETE CASCADE,
    case_type VARCHAR(32) NOT NULL CHECK (case_type IN ('PREMARITAL_COUPLE', 'INDIVIDUAL_CARRIER', 'PRENATAL_ESCALATION', 'CASCADE_SILA')),
    workflow_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_ASSESSMENT',
    clinical_urgency VARCHAR(16) NOT NULL DEFAULT 'ROUTINE' CHECK (clinical_urgency IN ('URGENT', 'HIGH', 'MODERATE', 'ROUTINE')),
    is_pregnant BOOLEAN NOT NULL DEFAULT FALSE,
    gestational_weeks INT,
    triage_tier INT NOT NULL DEFAULT 4 CHECK (triage_tier BETWEEN 1 AND 4),
    case_status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (case_status IN ('OPEN', 'ASSIGNED', 'IN_CONSULTATION', 'REFERRED', 'CLOSED')),
    rule_version_id VARCHAR(32) NOT NULL DEFAULT 'GEN_RULES_v3.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS counsellors (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    gender CHAR(1) CHECK (gender IN ('M', 'F')),
    languages TEXT[] DEFAULT ARRAY['ar', 'en'],
    specialties TEXT[] DEFAULT ARRAY['Premarital Genetics', 'Hemoglobinopathies', 'Reproductive Genetics'],
    employment_type VARCHAR(32) DEFAULT 'DOH_LICENSED',
    location VARCHAR(128) DEFAULT 'Abu Dhabi',
    max_caseload INT NOT NULL DEFAULT 35,
    active_caseload INT NOT NULL DEFAULT 0,
    credentials_verified BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'INACTIVE'))
);

CREATE TABLE IF NOT EXISTS counsellor_availability (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    counsellor_id VARCHAR(64) NOT NULL REFERENCES counsellors(id) ON DELETE CASCADE,
    slot_start TIMESTAMP WITH TIME ZONE NOT NULL,
    slot_end TIMESTAMP WITH TIME ZONE NOT NULL,
    is_booked BOOLEAN NOT NULL DEFAULT FALSE,
    is_emergency_buffer BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_slot_order CHECK (slot_end > slot_start)
);

CREATE TABLE IF NOT EXISTS case_assignments (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    case_id VARCHAR(64) NOT NULL REFERENCES clinical_cases(id) ON DELETE CASCADE,
    counsellor_id VARCHAR(64) NOT NULL REFERENCES counsellors(id) ON DELETE CASCADE,
    assigned_by VARCHAR(64) NOT NULL, -- System or Supervisor
    assignment_reason VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REASSIGNED', 'COMPLETED'))
);

CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    case_id VARCHAR(64) NOT NULL REFERENCES clinical_cases(id) ON DELETE CASCADE,
    counsellor_id VARCHAR(64) NOT NULL REFERENCES counsellors(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    meeting_type VARCHAR(32) NOT NULL DEFAULT 'TELEHEALTH' CHECK (meeting_type IN ('TELEHEALTH', 'IN_PERSON')),
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ATTENDED', 'CANCELLED', 'RESCHEDULED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS counselling_notes (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    appointment_id VARCHAR(64) NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    ai_draft_note TEXT, -- AI-generated draft note (always marked DRAFT)
    final_note TEXT NOT NULL, -- Clinician approved text
    clinical_summary TEXT NOT NULL, -- Patient-facing summary
    approved_by VARCHAR(64) NOT NULL REFERENCES counsellors(id),
    approved_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS referrals (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    case_id VARCHAR(64) NOT NULL REFERENCES clinical_cases(id) ON DELETE CASCADE,
    destination VARCHAR(128) NOT NULL, -- e.g. 'IVF / PGT-M Clinic', 'Fetal Medicine Center', 'Haematology'
    priority VARCHAR(16) NOT NULL DEFAULT 'ROUTINE' CHECK (priority IN ('URGENT', 'HIGH', 'ROUTINE')),
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'COMPLETED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 7. SILA CASCADE INVITATIONS & AUDIT LOGS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS sila_invitations (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    sender_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 token hash (zero contact storage)
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'OPENED', 'SCREENING_INITIATED', 'EXPIRED')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sila_invitations_token
    ON sila_invitations (token_hash, status);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    actor_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_time
    ON audit_logs (actor_id, created_at DESC);
