-- ==============================================================================
-- DaNA: Comprehensive Mock Data Seed Script
-- Populates all tables with clinically authentic UAE premarital screening data.
-- ==============================================================================

-- 1. Enable Read/Write Permissions (Disable RLS for Demo & Dev Environment)
ALTER TABLE IF EXISTS people DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS couples DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS counsellors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clinical_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS case_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS genetic_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS genetic_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS medical_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS family_conditions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS partner_consents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sila_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notes DISABLE ROW LEVEL SECURITY;

-- 2. Seed People (Citizens & Premarital Candidates - User Registry for Partner Search)
INSERT INTO people (id, name, short_name, sex, date_of_birth, phone_number_hash)
VALUES
  ('fatima', 'Fatima Al Hammadi', 'Fatima', 'F', '1998-05-14', '+971501234567'),
  ('khalid', 'Khalid Al Mansoori', 'Khalid', 'M', '1996-09-20', '+971509876543'),
  ('ahmed', 'Ahmed Al Ketbi', 'Ahmed', 'M', '1995-11-03', '+971502345678'),
  ('noura', 'Noura Al Suwaidi', 'Noura', 'F', '1997-02-18', '+971508765432'),
  ('saeed', 'Saeed Al Dhaheri', 'Saeed', 'M', '1994-07-25', '+971503456789'),
  ('maryam', 'Maryam Al Romaithi', 'Maryam', 'F', '1999-12-01', '+971507654321'),
  ('omar', 'Omar Al Nuaimi', 'Omar', 'M', '1993-04-15', '+971504567890'),
  ('latifa', 'Latifa Al Mazrouei', 'Latifa', 'F', '1996-08-30', '+971506543210'),
  ('aisha', 'Aisha Al Shamsi', 'Aisha', 'F', '1998-10-12', '+971505678901'),
  ('rashid', 'Rashid Al Falasi', 'Rashid', 'M', '1995-01-22', '+971505432109'),
  ('hamdan', 'Hamdan Al Maktoum', 'Hamdan', 'M', '1994-06-18', '+971506789012'),
  ('shamma', 'Shamma Al Qassimi', 'Shamma', 'F', '1997-03-09', '+971504321098')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    sex = EXCLUDED.sex,
    date_of_birth = EXCLUDED.date_of_birth,
    phone_number_hash = EXCLUDED.phone_number_hash;

-- 3. Seed Accounts (User Credentials & Identity References from Supabase Database)
INSERT INTO accounts (user_id, role, person_id, display_name, title, email)
VALUES
  ('00e55974-7b43-4831-bddf-c3c113b62c51', 'couple', 'u_00e559747b43', 'Karthikeyan', 'Partner · engaged (sample journey)', 'karthi@gmail.com'),
  ('049656ea-3047-493c-ba49-cd0810cd259c', 'couple', 'u_049656ea3047', 'Mubashira', 'Partner · engaged (sample journey)', 'mubashira@gmail.com'),
  ('0a5d2e44-26ca-4d20-b449-076c33c2775b', 'couple', 'u_0a5d2e4426ca', 'Noufaldemo', 'Partner · engaged (sample journey)', 'devendranprabhakar2007@gmail.com'),
  ('0e0d677b-677c-4546-aa3e-2fc962979088', 'couple', 'u_0e0d677b677c', 'API Check', 'Partner · engaged (sample journey)', 'dana.api.check+1793782648@gmail.com'),
  ('14579163-9d60-4ed2-8f33-0e3717230093', 'admin', NULL, 'Programme team', 'DoH premarital programme', 'doh@dana.demo'),
  ('25f9d5a9-e44c-466c-9d86-85bd84fa53df', 'couple', 'u_25f9d5a9e44c', 'Noufal Noufal', 'Partner · engaged (sample journey)', 'garena123official@gmail.com'),
  ('311b1864-de4e-4e5b-a59a-8166de9320b8', 'couple', 'u_311b1864de4e', 'Noufal Noufal', 'Partner · engaged (sample journey)', 'vagirahamed@gmail.com'),
  ('44359735-c612-498e-afde-0f58b12a0a5a', 'couple', 'u_44359735c612', 'Signup Test', 'Partner · engaged (sample journey)', 'dana.signup.ui+1793781239@gmail.com'),
  ('4570b5ad-9e62-469e-a845-0750f6678d14', 'couple', 'u_4570b5ad9e62', 'Signup Test', 'Partner · engaged (sample journey)', 'dana.signup.ui+1793781300@gmail.com'),
  ('4a1d4c23-344f-4d64-9e14-cdb4afc101e1', 'couple', 'u_4a1d4c23344f', 'Signup Test', 'Partner · engaged (sample journey)', 'dana.signup.ui+1793781372@gmail.com'),
  ('7f7b1bf6-eb18-40ff-ac55-44378606d46d', 'couple', 'u_7f7b1bf6eb18', 'DEVENDRAN P', 'Partner · engaged (sample journey)', 'devendranp.it2024@citchennai.net'),
  ('92dc8f17-e9c7-49cc-8f16-58f171747bc3', 'couple', 'khalid', 'Khalid Al Mansoori', 'Partner · engaged', 'khalid@dana.demo'),
  ('9c8e15a8-be65-498a-86bc-7a21a4d51b62', 'couple', 'u_9c8e15a8be65', 'Signup Test', 'Partner · engaged (sample journey)', 'dana.signup.ui+1793780776@gmail.com'),
  ('9fa5cc44-ac80-4aaa-a36a-de31209352a1', 'couple', 'u_9fa5cc44ac80', 'Noufaldemolatest', 'Partner · engaged (sample journey)', 'noufal@demo'),
  ('b0992703-40a3-483e-8fac-ff81ce187f68', 'counsellor', NULL, 'Dr. Mariam Al Hosani', 'Genetic counsellor', 'mariam@dana.demo'),
  ('b573d102-52bb-45b0-8c78-6f011a51a9c5', 'couple', 'u_b573d10252bb', 'Signup Test', 'Partner · engaged (sample journey)', 'dana.signup.ui+1793781438@gmail.com'),
  ('be2d29a7-8a06-4c80-ba18-091bdabcb7f6', 'couple', 'u_be2d29a78a06', 'Signup Test', 'Partner · engaged (sample journey)', 'dana.signup.ui+1793781061@gmail.com'),
  ('cedcb625-5655-4ced-80ea-3e7f938929a9', 'couple', 'fatima', 'Fatima Al Hammadi', 'Partner · engaged', 'fatima@dana.demo'),
  ('dc210e37-1ffd-415e-83de-4422603ce87a', 'couple', 'u_dc210e371ffd', 'HARI PANDI', 'Partner · engaged (sample journey)', 'haripandin.it2024@citchennai.net'),
  ('e4dea6e8-b101-44c4-a474-93d9eec3bc59', 'couple', 'u_e4dea6e8b101', 'Signup Test', 'Partner · engaged (sample journey)', 'dana.signup.ui+1793781328@gmail.com'),
  ('fc66eb27-288f-4340-bfb5-fe34f4bb8f7e', 'couple', 'u_fc66eb27288f', 'MOHAMMED NOUFAL V IT', 'Partner · engaged (sample journey)', 'mohammednoufalv.it2024@citchennai.net')
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role,
    person_id = EXCLUDED.person_id,
    display_name = EXCLUDED.display_name,
    title = EXCLUDED.title,
    email = EXCLUDED.email;

-- 4. Seed Couples (Bonds)
INSERT INTO couples (id, partner_a, partner_b, stage, pregnant_weeks)
VALUES
  ('c1', 'fatima', 'khalid', 'Engaged', NULL),
  ('c2', 'ahmed', 'noura', 'Married', 11),
  ('c3', 'maryam', 'saeed', 'Engaged', NULL),
  ('c4', 'latifa', 'omar', 'Married', NULL),
  ('c5', 'aisha', 'rashid', 'Engaged', NULL),
  ('c6', 'hamdan', 'shamma', 'Engaged', NULL)
ON CONFLICT (id) DO UPDATE
SET partner_a = EXCLUDED.partner_a,
    partner_b = EXCLUDED.partner_b,
    stage = EXCLUDED.stage,
    pregnant_weeks = EXCLUDED.pregnant_weeks;

-- 3. Seed Counsellors
INSERT INTO counsellors (id, user_id, name, gender, languages, specialties, location, status)
VALUES
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Dr. Mariam Al Hosani', 'F', ARRAY['ar', 'en'], ARRAY['Premarital Genetics', 'Hemoglobinopathies', 'Reproductive Genetics'], 'Abu Dhabi', 'ACTIVE'),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Dr. Salem Al Kaabi', 'M', ARRAY['ar', 'en'], ARRAY['Spinal Muscular Atrophy', 'Metabolic Disorders'], 'Al Ain', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Clinical Cases
INSERT INTO clinical_cases (id, couple_id, case_type, workflow_status, clinical_urgency, is_pregnant, triage_tier)
VALUES
  ('33333333-3333-3333-3333-333333333331', 'c1', 'PREMARITAL_COUPLE', 'PENDING_COUNSELLING', 'HIGH', FALSE, 2),
  ('33333333-3333-3333-3333-333333333332', 'c2', 'PRENATAL_ESCALATION', 'IN_CONSULTATION', 'URGENT', TRUE, 1),
  ('33333333-3333-3333-3333-333333333333', 'c3', 'INDIVIDUAL_CARRIER', 'ASSESSMENT_COMPLETED', 'MODERATE', FALSE, 3)
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Case Assignments
INSERT INTO case_assignments (id, case_id, counsellor_id, assigned_by, status)
VALUES
  ('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'ACTIVE'),
  ('44444444-4444-4444-4444-444444444442', '33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Appointments (Omitting auto-generated id)
INSERT INTO appointments (case_id, counsellor_id, meeting_type, status)
VALUES
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'TELEHEALTH', 'SCHEDULED'),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'IN_PERSON', 'ATTENDED');

-- 7. Seed Genetic Reports
INSERT INTO genetic_reports (id, report_id, laboratory_name, test_methodology, panel_coverage, report_date, validation_status)
VALUES
  ('66666666-6666-6666-6666-666666666661', 'NRL-2026-GEN-00129', 'National Reference Laboratory (NRL) Abu Dhabi', 'Targeted NGS Panel 570 Genes', '570 Genes', '2026-10-12', 'VALIDATED'),
  ('66666666-6666-6666-6666-666666666662', 'NRL-2026-GEN-00130', 'National Reference Laboratory (NRL) Abu Dhabi', 'Targeted NGS Panel 570 Genes', '570 Genes', '2026-10-12', 'VALIDATED'),
  ('66666666-6666-6666-6666-666666666663', 'G42-2026-PRE-00445', 'G42 Healthcare Omics Centre', 'Targeted NGS Panel 570 Genes', '570 Genes', '2026-09-02', 'VALIDATED')
ON CONFLICT (id) DO NOTHING;

-- 8. Seed Genetic Variants
INSERT INTO genetic_variants (id, report_id, gene_symbol, hgvs_c, hgvs_p, zygosity, inheritance_pattern, clinical_significance, disease_association)
VALUES
  ('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666661', 'HBB', 'c.92+1G>A', 'Splice donor variant', 'HETEROZYGOUS', 'AR', 'PATHOGENIC', 'Beta-thalassaemia'),
  ('77777777-7777-7777-7777-777777777772', '66666666-6666-6666-6666-666666666662', 'HBB', 'c.118C>T', 'p.Gln40Ter', 'HETEROZYGOUS', 'AR', 'PATHOGENIC', 'Beta-thalassaemia'),
  ('77777777-7777-7777-7777-777777777773', '66666666-6666-6666-6666-666666666663', 'GJB2', 'c.35delG', 'p.Gly12fs', 'HETEROZYGOUS', 'AR', 'PATHOGENIC', 'Non-syndromic hearing loss')
ON CONFLICT (id) DO NOTHING;

-- 9. Seed Medical Records (Malaffi HIE)
INSERT INTO medical_records (id, source, resource_type, clinical_code, display_name, status, recorded_date, raw_payload)
VALUES
  ('88888888-8888-8888-8888-888888888881', 'MALAFFI_HIE', 'Observation', '718-7', 'Hemoglobin [Mass/volume] in Blood', 'final', '2026-10-10', '{"value": 13.8, "unit": "g/dL", "referenceRange": "13.0-17.0"}'::jsonb),
  ('88888888-8888-8888-8888-888888888882', 'MALAFFI_HIE', 'Observation', '787-2', 'MCV [Entitic volume] in Blood', 'final', '2026-10-10', '{"value": 72.4, "unit": "fL", "referenceRange": "80.0-100.0", "flag": "LOW"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 10. Seed Family Members (Branches Pedigree)
INSERT INTO family_members (id, owner_id, display_name, relationship, gender, is_deceased)
VALUES
  ('99999999-9999-9999-9999-999999999991', 'khalid', 'Rashid Al Mansoori', 'Brother', 'M', FALSE),
  ('99999999-9999-9999-9999-999999999992', 'khalid', 'Maryam Al Mansoori', 'Sister', 'F', FALSE),
  ('99999999-9999-9999-9999-999999999993', 'fatima', 'Shaikha Al Hammadi', 'Sister', 'F', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 11. Seed Family Conditions
INSERT INTO family_conditions (id, member_id, condition_name, age_at_onset)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999991', 'Carrier for Beta-thalassaemia', 24)
ON CONFLICT (id) DO NOTHING;

-- 12. Seed Partner Consents
INSERT INTO partner_consents (id, couple_id, owner_id, recipient_id, scope, status, granted_at)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'c1', 'khalid', 'fatima', 'COUPLE_RISK_ASSESSMENT', 'ACTIVE', '2026-10-12 09:05:00+00'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc', 'c1', 'fatima', 'khalid', 'COUPLE_RISK_ASSESSMENT', 'ACTIVE', '2026-10-12 09:05:00+00')
ON CONFLICT (id) DO NOTHING;

-- 13. Seed Referrals
INSERT INTO referrals (id, case_id, destination, priority, reason, status)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333331', 'Abu Dhabi PGT-M / IVF Center of Excellence', 'HIGH', 'Dual HBB carriers requesting pre-implantation genetic testing counselling', 'PENDING')
ON CONFLICT (id) DO NOTHING;

-- 14. Seed Sila Cascade Invitations
INSERT INTO sila_invitations (id, sender_id, token_hash, status, expires_at)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'khalid', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'PENDING', '2026-12-31 23:59:59+00')
ON CONFLICT (id) DO NOTHING;

-- 15. Seed Counselling Notes (Omitting auto-generated id)
INSERT INTO notes (appointment_id, clinical_summary)
VALUES
  ('55555555-5555-5555-5555-555555555551', 'Couple counseled on 25% autosomal recessive risk for Beta-thalassaemia. Reviewed PGT-M reproductive options, timeline, and DoH coverage. Scheduled follow-up in 2 weeks.');
