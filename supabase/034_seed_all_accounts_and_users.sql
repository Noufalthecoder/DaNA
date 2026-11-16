-- ==============================================================================
-- Migration 034: Complete Supabase Accounts, People, Couples & Location Linking
-- Target Database: Supabase PostgreSQL (project: oflqmhfivyzttlivgusr)
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/oflqmhfivyzttlivgusr/sql/new
-- ==============================================================================

-- 1. Ensure foreign key constraint on accounts.user_id does not block directory accounts
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_user_id_fkey;

-- 2. Add location, status, and email columns
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS location_id INT REFERENCES public.locations (id) ON DELETE SET NULL;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS location_id INT REFERENCES public.locations (id) ON DELETE SET NULL;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 3. Enable Row Level Security (RLS) & Grant Read Permissions for Directory
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounts_read_directory ON public.accounts;
DROP POLICY IF EXISTS accounts_read ON public.accounts;
CREATE POLICY accounts_read ON public.accounts FOR SELECT TO authenticated, anon USING (true);
GRANT SELECT ON public.accounts TO anon, authenticated, service_role;

DROP POLICY IF EXISTS people_read_directory ON public.people;
DROP POLICY IF EXISTS people_read ON public.people;
CREATE POLICY people_read ON public.people FOR SELECT TO authenticated, anon USING (true);
GRANT SELECT ON public.people TO anon, authenticated, service_role;

DROP POLICY IF EXISTS couples_read_directory ON public.couples;
DROP POLICY IF EXISTS couples_read ON public.couples;
CREATE POLICY couples_read ON public.couples FOR SELECT TO authenticated, anon USING (true);
GRANT SELECT ON public.couples TO anon, authenticated, service_role;

DROP POLICY IF EXISTS locations_read_directory ON public.locations;
DROP POLICY IF EXISTS locations_read ON public.locations;
CREATE POLICY locations_read ON public.locations FOR SELECT TO authenticated, anon USING (true);
GRANT SELECT ON public.locations TO anon, authenticated, service_role;

-- 4. Seed People Profiles linked to Locations
DO $$
DECLARE
    v_auh_id INT;
    v_dxb_id INT;
    v_marina_id INT;
    v_shj_id INT;
    v_ain_id INT;
    v_rak_id INT;
    v_fuj_id INT;
    v_saadiyat_id INT;
BEGIN
    SELECT id INTO v_auh_id FROM public.locations WHERE city = 'Abu Dhabi' LIMIT 1;
    SELECT id INTO v_dxb_id FROM public.locations WHERE city = 'Downtown Dubai' LIMIT 1;
    SELECT id INTO v_marina_id FROM public.locations WHERE city = 'Dubai Marina' LIMIT 1;
    SELECT id INTO v_shj_id FROM public.locations WHERE city = 'Sharjah' LIMIT 1;
    SELECT id INTO v_ain_id FROM public.locations WHERE city = 'Al Ain' LIMIT 1;
    SELECT id INTO v_rak_id FROM public.locations WHERE city = 'Ras Al Khaimah' LIMIT 1;
    SELECT id INTO v_fuj_id FROM public.locations WHERE city = 'Fujairah' LIMIT 1;
    SELECT id INTO v_saadiyat_id FROM public.locations WHERE city = 'Saadiyat Island' LIMIT 1;

    INSERT INTO public.people (id, name, short_name, sex, birth_year, language, location_id) VALUES
    ('khalid', 'Khalid Al Mansoori', 'Khalid', 'M', 1998, 'ar', v_auh_id),
    ('fatima', 'Fatima Al Hammadi', 'Fatima', 'F', 2000, 'ar', v_auh_id),
    ('ahmed', 'Ahmed Al Ketbi', 'Ahmed', 'M', 1995, 'ar', v_dxb_id),
    ('noura', 'Noura Al Ketbi', 'Noura', 'F', 1997, 'ar', v_dxb_id),
    ('saeed', 'Saeed Al Nuaimi', 'Saeed', 'M', 1999, 'ar', v_ain_id),
    ('maryam', 'Maryam Al Shamsi', 'Maryam', 'F', 2001, 'ar', v_ain_id),
    ('omar', 'Omar Al Dhaheri', 'Omar', 'M', 1994, 'ar', v_shj_id),
    ('latifa', 'Latifa Al Mazrouei', 'Latifa', 'F', 1996, 'ar', v_shj_id),
    ('rashid', 'Rashid Al Suwaidi', 'Rashid', 'M', 1997, 'ar', v_rak_id),
    ('aisha', 'Aisha Al Falasi', 'Aisha', 'F', 1999, 'ar', v_rak_id),
    ('hamdan', 'Hamdan Al Qubaisi', 'Hamdan', 'M', 2000, 'ar', v_fuj_id),
    ('shamma', 'Shamma Al Zaabi', 'Shamma', 'F', 2002, 'ar', v_fuj_id),
    ('rohit', 'Rohit Sharma', 'Rohit', 'M', 1996, 'en', v_marina_id),
    ('priya', 'Priya Sundaram', 'Priya', 'F', 1998, 'en', v_marina_id),
    ('arjun', 'Arjun Kapoor', 'Arjun', 'M', 1995, 'en', v_saadiyat_id),
    ('ananya_p', 'Ananya Iyer', 'Ananya', 'F', 1997, 'en', v_saadiyat_id)
    ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name, 
        sex = EXCLUDED.sex, 
        location_id = EXCLUDED.location_id;
END $$;

-- 5. Seed Couple Relationships
INSERT INTO public.couples (id, partner_a, partner_b, stage, pregnant_weeks, screened_on) VALUES
('c1', 'khalid', 'fatima', 'engaged', NULL, '2026-10-12'),
('c2', 'ahmed', 'noura', 'married', 11, '2026-09-02'),
('c3', 'saeed', 'maryam', 'engaged', NULL, '2026-10-20'),
('c4', 'omar', 'latifa', 'married', NULL, '2026-08-15'),
('c5', 'rashid', 'aisha', 'engaged', NULL, '2026-10-28'),
('c6', 'hamdan', 'shamma', 'engaged', NULL, '2026-10-30'),
('c7', 'rohit', 'priya', 'engaged', NULL, '2026-11-01'),
('c8', 'arjun', 'ananya_p', 'married', NULL, '2026-11-05')
ON CONFLICT (id) DO UPDATE SET 
    partner_a = EXCLUDED.partner_a, 
    partner_b = EXCLUDED.partner_b, 
    stage = EXCLUDED.stage;

-- 6. Seed All Accounts into public.accounts
DO $$
DECLARE
    v_auh_id INT;
    v_dxb_id INT;
    v_marina_id INT;
    v_shj_id INT;
    v_ain_id INT;
    v_rak_id INT;
    v_fuj_id INT;
    v_saadiyat_id INT;
    v_difc_id INT;
BEGIN
    SELECT id INTO v_auh_id FROM public.locations WHERE city = 'Abu Dhabi' LIMIT 1;
    SELECT id INTO v_dxb_id FROM public.locations WHERE city = 'Downtown Dubai' LIMIT 1;
    SELECT id INTO v_marina_id FROM public.locations WHERE city = 'Dubai Marina' LIMIT 1;
    SELECT id INTO v_shj_id FROM public.locations WHERE city = 'Sharjah' LIMIT 1;
    SELECT id INTO v_ain_id FROM public.locations WHERE city = 'Al Ain' LIMIT 1;
    SELECT id INTO v_rak_id FROM public.locations WHERE city = 'Ras Al Khaimah' LIMIT 1;
    SELECT id INTO v_fuj_id FROM public.locations WHERE city = 'Fujairah' LIMIT 1;
    SELECT id INTO v_saadiyat_id FROM public.locations WHERE city = 'Saadiyat Island' LIMIT 1;
    SELECT id INTO v_difc_id FROM public.locations WHERE city = 'DIFC' LIMIT 1;

    INSERT INTO public.accounts (user_id, role, person_id, display_name, title, status, email, location_id) VALUES
    -- 1. DOH Administrators
    ('a0000000-0000-0000-0000-000000000001', 'admin', NULL, 'Programme team', 'DoH premarital programme', 'active', 'doh@dana.demo', v_auh_id),
    ('a0000000-0000-0000-0000-000000000002', 'admin', NULL, 'Security Operations Lead', 'DoH IAM Security Authority', 'active', 'sec.admin@doh.gov.ae', v_auh_id),

    -- 2. Licensed Genetic Counsellors
    ('a0000000-0000-0000-0000-000000000003', 'counsellor', NULL, 'Dr. Mariam Al Hosani', 'Senior Genetic Counsellor · Lic. LIC-GC-2024-089', 'active', 'mariam@dana.demo', v_auh_id),
    ('a0000000-0000-0000-0000-000000000004', 'counsellor', NULL, 'Dr. Sara Al Zaabi', 'Clinical Geneticist & Counsellor · Lic. LIC-GC-2025-114', 'active', 'sara.zaabi@ssmc.ae', v_dxb_id),
    ('a0000000-0000-0000-0000-000000000005', 'counsellor', NULL, 'Dr. Rajesh Raman', 'Lead Genetic Counsellor · SSMC Dubai Healthcare City', 'active', 'rajesh.raman@genetics.ae', v_difc_id),

    -- 3. Couple Accounts (Linked to individual profiles)
    ('a0000000-0000-0000-0000-000000000006', 'couple', 'khalid', 'Khalid Al Mansoori', 'Partner · engaged with Fatima Al Hammadi (Couple c1)', 'active', 'khalid@dana.demo', v_auh_id),
    ('a0000000-0000-0000-0000-000000000007', 'couple', 'fatima', 'Fatima Al Hammadi', 'Partner · engaged with Khalid Al Mansoori (Couple c1)', 'active', 'fatima@dana.demo', v_auh_id),
    ('a0000000-0000-0000-0000-000000000008', 'couple', 'ahmed', 'Ahmed Al Ketbi', 'Partner · married with Noura Al Ketbi (Couple c2)', 'active', 'ahmed@dana.demo', v_dxb_id),
    ('a0000000-0000-0000-0000-000000000009', 'couple', 'noura', 'Noura Al Ketbi', 'Partner · married with Ahmed Al Ketbi (Couple c2)', 'active', 'noura@dana.demo', v_dxb_id),
    ('a0000000-0000-0000-0000-000000000010', 'couple', 'saeed', 'Saeed Al Nuaimi', 'Partner · engaged with Maryam Al Shamsi (Couple c3)', 'active', 'saeed@dana.demo', v_ain_id),
    ('a0000000-0000-0000-0000-000000000011', 'couple', 'maryam', 'Maryam Al Shamsi', 'Partner · engaged with Saeed Al Nuaimi (Couple c3)', 'active', 'maryam@dana.demo', v_ain_id),
    ('a0000000-0000-0000-0000-000000000012', 'couple', 'omar', 'Omar Al Dhaheri', 'Partner · married with Latifa Al Mazrouei (Couple c4)', 'active', 'omar@dana.demo', v_shj_id),
    ('a0000000-0000-0000-0000-000000000013', 'couple', 'latifa', 'Latifa Al Mazrouei', 'Partner · married with Omar Al Dhaheri (Couple c4)', 'active', 'latifa@dana.demo', v_shj_id),
    ('a0000000-0000-0000-0000-000000000014', 'couple', 'rashid', 'Rashid Al Suwaidi', 'Partner · engaged with Aisha Al Falasi (Couple c5)', 'active', 'rashid@dana.demo', v_rak_id),
    ('a0000000-0000-0000-0000-000000000015', 'couple', 'aisha', 'Aisha Al Falasi', 'Partner · engaged with Rashid Al Suwaidi (Couple c5)', 'active', 'aisha@dana.demo', v_rak_id),
    ('a0000000-0000-0000-0000-000000000016', 'couple', 'hamdan', 'Hamdan Al Qubaisi', 'Partner · engaged with Shamma Al Zaabi (Couple c6)', 'active', 'hamdan@dana.demo', v_fuj_id),
    ('a0000000-0000-0000-0000-000000000017', 'couple', 'shamma', 'Shamma Al Zaabi', 'Partner · engaged with Hamdan Al Qubaisi (Couple c6)', 'active', 'shamma@dana.demo', v_fuj_id),
    ('a0000000-0000-0000-0000-000000000018', 'couple', 'rohit', 'Rohit Sharma', 'Partner · engaged with Priya Sundaram (Couple c7)', 'active', 'rohit.sharma@example.ae', v_marina_id),
    ('a0000000-0000-0000-0000-000000000019', 'couple', 'priya', 'Priya Sundaram', 'Partner · engaged with Rohit Sharma (Couple c7)', 'active', 'priya.sundaram@example.ae', v_marina_id),
    ('a0000000-0000-0000-0000-000000000020', 'couple', 'arjun', 'Arjun Kapoor', 'Partner · married with Ananya Iyer (Couple c8)', 'active', 'arjun.kapoor@example.ae', v_saadiyat_id),
    ('a0000000-0000-0000-0000-000000000021', 'couple', 'ananya_p', 'Ananya Iyer', 'Partner · married with Arjun Kapoor (Couple c8)', 'active', 'ananya.iyer@example.ae', v_saadiyat_id)
    ON CONFLICT (user_id) DO UPDATE SET
        role = EXCLUDED.role,
        person_id = EXCLUDED.person_id,
        display_name = EXCLUDED.display_name,
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        email = EXCLUDED.email,
        location_id = EXCLUDED.location_id;
END $$;

-- 7. Verification Summary
SELECT 
    (SELECT count(*) FROM public.locations) AS total_locations,
    (SELECT count(*) FROM public.people) AS total_people,
    (SELECT count(*) FROM public.couples) AS total_couples,
    (SELECT count(*) FROM public.accounts) AS total_accounts;

