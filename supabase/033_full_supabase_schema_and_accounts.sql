-- ==============================================================================
-- Migration 033: Seed Accounts, People, Couples, & Locations in Supabase
-- Target Database: Supabase PostgreSQL (project: oflqmhfivyzttlivgusr)
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/oflqmhfivyzttlivgusr/sql/new
-- ==============================================================================

-- 1. Ensure Table Columns exist
ALTER TABLE IF EXISTS public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.accounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.people ADD COLUMN IF NOT EXISTS location_id INT REFERENCES public.locations (id) ON DELETE SET NULL;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Grant Directory Read Permissions for Admin
DROP POLICY IF EXISTS locations_read ON public.locations;
CREATE POLICY locations_read ON public.locations FOR SELECT TO authenticated, anon USING (true);
GRANT SELECT ON public.locations TO anon, authenticated, service_role;

DROP POLICY IF EXISTS people_read_directory ON public.people;
CREATE POLICY people_read_directory ON public.people FOR SELECT TO authenticated, anon USING (true);
GRANT SELECT ON public.people TO anon, authenticated, service_role;

DROP POLICY IF EXISTS couples_read_directory ON public.couples;
CREATE POLICY couples_read_directory ON public.couples FOR SELECT TO authenticated, anon USING (true);
GRANT SELECT ON public.couples TO anon, authenticated, service_role;

DROP POLICY IF EXISTS accounts_read_directory ON public.accounts;
CREATE POLICY accounts_read_directory ON public.accounts FOR SELECT TO authenticated, anon USING (true);
GRANT SELECT ON public.accounts TO anon, authenticated, service_role;

-- 3. Insert all 12 UAE Cities into public.locations
INSERT INTO public.locations (city, city_ascii, state_name, country, country_code, latitude, longitude) VALUES
('Dubai', 'Dubai', 'Dubayy', 'United Arab Emirates', 'AE', 25.2697, 55.3094),
('Abu Dhabi', 'Abu Dhabi', 'Abū Z̧aby', 'United Arab Emirates', 'AE', 24.4511, 54.3969),
('Sharjah', 'Sharjah', 'Ash Shāriqah', 'United Arab Emirates', 'AE', 25.3375, 55.4119),
('Al ‘Ayn', 'Al `Ayn', 'Abū Z̧aby', 'United Arab Emirates', 'AE', 24.2075, 55.7447),
('‘Ajmān', '`Ajman', '‘Ajmān', 'United Arab Emirates', 'AE', 25.3994, 55.4797),
('Ra’s al Khaymah', 'Ra''s al Khaymah', 'Ra’s al Khaymah', 'United Arab Emirates', 'AE', 25.7851, 55.9479),
('Al Fujayrah', 'Al Fujayrah', 'Al Fujayrah', 'United Arab Emirates', 'AE', 25.1222, 56.3344),
('Kalbā', 'Kalba', 'Al Fujayrah', 'United Arab Emirates', 'AE', 25.0513, 56.3542),
('Umm al Qaywayn', 'Umm al Qaywayn', 'Umm al Qaywayn', 'United Arab Emirates', 'AE', 25.5598, 55.5572),
('Khawr Fakkān', 'Khawr Fakkan', 'Ash Shāriqah', 'United Arab Emirates', 'AE', 25.3392, 56.3561),
('Madīnat Zāyid', 'Madinat Zayid', 'Abū Z̧aby', 'United Arab Emirates', 'AE', 23.6522, 53.6536),
('Al Jazīrah al Ḩamrā’', 'Al Jazirah al Hamra''', 'Ra’s al Khaymah', 'United Arab Emirates', 'AE', 25.7089, 55.7972)
ON CONFLICT DO NOTHING;

-- 4. Insert People Profiles linked to locations
DO $$
DECLARE
    v_auh_id INT;
    v_dxb_id INT;
    v_shj_id INT;
    v_ain_id INT;
    v_rak_id INT;
    v_fuj_id INT;
BEGIN
    SELECT id INTO v_auh_id FROM public.locations WHERE city = 'Abu Dhabi' LIMIT 1;
    SELECT id INTO v_dxb_id FROM public.locations WHERE city = 'Dubai' LIMIT 1;
    SELECT id INTO v_shj_id FROM public.locations WHERE city = 'Sharjah' LIMIT 1;
    SELECT id INTO v_ain_id FROM public.locations WHERE city LIKE 'Al%Ayn%' LIMIT 1;
    SELECT id INTO v_rak_id FROM public.locations WHERE city LIKE 'Ra%al Khaymah' LIMIT 1;
    SELECT id INTO v_fuj_id FROM public.locations WHERE city = 'Al Fujayrah' LIMIT 1;

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
    ('rohit', 'Rohit Sharma', 'Rohit', 'M', 1996, 'en', v_dxb_id),
    ('priya', 'Priya Sundaram', 'Priya', 'F', 1998, 'en', v_dxb_id),
    ('arjun', 'Arjun Kapoor', 'Arjun', 'M', 1995, 'en', v_auh_id),
    ('ananya_p', 'Ananya Iyer', 'Ananya', 'F', 1997, 'en', v_auh_id)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sex = EXCLUDED.sex, location_id = EXCLUDED.location_id;
END $$;

-- 5. Insert Couple Relationships
INSERT INTO public.couples (id, partner_a, partner_b, stage, pregnant_weeks, screened_on) VALUES
('c1', 'khalid', 'fatima', 'engaged', NULL, '2026-10-12'),
('c2', 'ahmed', 'noura', 'married', 11, '2026-09-02'),
('c3', 'saeed', 'maryam', 'engaged', NULL, '2026-10-20'),
('c4', 'omar', 'latifa', 'married', NULL, '2026-08-15'),
('c5', 'rashid', 'aisha', 'engaged', NULL, '2026-10-28'),
('c6', 'hamdan', 'shamma', 'engaged', NULL, '2026-10-30'),
('c7', 'rohit', 'priya', 'engaged', NULL, '2026-11-01'),
('c8', 'arjun', 'ananya_p', 'married', NULL, '2026-11-05')
ON CONFLICT (id) DO UPDATE SET partner_a = EXCLUDED.partner_a, partner_b = EXCLUDED.partner_b, stage = EXCLUDED.stage;

-- 6. Insert All Accounts (Admins, Counsellors, Couples)
DO $$
BEGIN
    -- Check if accounts.user_id references auth.users table
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc 
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name 
        WHERE tc.table_name = 'accounts' AND ccu.table_name = 'users'
    ) THEN
        -- Insert accounts mapped to existing auth.users logins
        INSERT INTO public.accounts (user_id, role, person_id, display_name, title, status, email)
        SELECT u.id, a.role, a.person_id, a.display_name, a.title, 'active', u.email
        FROM auth.users u
        JOIN (VALUES
          ('doh@dana.demo', 'admin', NULL, 'Programme team', 'DoH premarital programme'),
          ('sec.admin@doh.gov.ae', 'admin', NULL, 'Security Operations Lead', 'DoH IAM Security Authority'),
          ('mariam@dana.demo', 'counsellor', NULL, 'Dr. Mariam Al Hosani', 'Senior Genetic Counsellor'),
          ('sara.zaabi@ssmc.ae', 'counsellor', NULL, 'Dr. Sara Al Zaabi', 'Clinical Geneticist & Counsellor'),
          ('khalid@dana.demo', 'couple', 'khalid', 'Khalid Al Mansoori', 'Partner · engaged'),
          ('fatima@dana.demo', 'couple', 'fatima', 'Fatima Al Hammadi', 'Partner · engaged'),
          ('ahmed@dana.demo', 'couple', 'ahmed', 'Ahmed Al Ketbi', 'Partner · married'),
          ('noura@dana.demo', 'couple', 'noura', 'Noura Al Ketbi', 'Partner · married')
        ) AS a(email, role, person_id, display_name, title) ON a.email = u.email
        ON CONFLICT (user_id) DO NOTHING;
    ELSE
        -- Insert directory accounts with deterministic UUIDs
        INSERT INTO public.accounts (user_id, role, person_id, display_name, title, status, email) VALUES
        ('a0000000-0000-0000-0000-000000000001', 'admin', NULL, 'Programme team', 'DoH premarital programme', 'active', 'doh@dana.demo'),
        ('a0000000-0000-0000-0000-000000000002', 'admin', NULL, 'Security Operations Lead', 'DoH IAM Security Authority', 'active', 'sec.admin@doh.gov.ae'),
        ('a0000000-0000-0000-0000-000000000003', 'counsellor', NULL, 'Dr. Mariam Al Hosani', 'Senior Genetic Counsellor', 'active', 'mariam@dana.demo'),
        ('a0000000-0000-0000-0000-000000000004', 'counsellor', NULL, 'Dr. Sara Al Zaabi', 'Clinical Geneticist & Counsellor', 'active', 'sara.zaabi@ssmc.ae'),
        ('a0000000-0000-0000-0000-000000000005', 'counsellor', NULL, 'Dr. Rajesh Raman', 'Lead Genetic Counsellor · SSMC', 'active', 'rajesh.raman@genetics.ae'),
        ('a0000000-0000-0000-0000-000000000006', 'couple', 'khalid', 'Khalid Al Mansoori', 'Partner · engaged', 'active', 'khalid@dana.demo'),
        ('a0000000-0000-0000-0000-000000000007', 'couple', 'fatima', 'Fatima Al Hammadi', 'Partner · engaged', 'active', 'fatima@dana.demo'),
        ('a0000000-0000-0000-0000-000000000008', 'couple', 'ahmed', 'Ahmed Al Ketbi', 'Partner · married', 'active', 'ahmed@dana.demo'),
        ('a0000000-0000-0000-0000-000000000009', 'couple', 'noura', 'Noura Al Ketbi', 'Partner · married', 'active', 'noura@dana.demo'),
        ('a0000000-0000-0000-0000-000000000010', 'couple', 'saeed', 'Saeed Al Nuaimi', 'Partner · engaged', 'active', 'saeed@dana.demo'),
        ('a0000000-0000-0000-0000-000000000011', 'couple', 'maryam', 'Maryam Al Shamsi', 'Partner · engaged', 'active', 'maryam@dana.demo'),
        ('a0000000-0000-0000-0000-000000000012', 'couple', 'omar', 'Omar Al Dhaheri', 'Partner · married', 'active', 'omar@dana.demo'),
        ('a0000000-0000-0000-0000-000000000013', 'couple', 'latifa', 'Latifa Al Mazrouei', 'Partner · married', 'active', 'latifa@dana.demo'),
        ('a0000000-0000-0000-0000-000000000014', 'couple', 'rashid', 'Rashid Al Suwaidi', 'Partner · engaged', 'active', 'rashid@dana.demo'),
        ('a0000000-0000-0000-0000-000000000015', 'couple', 'aisha', 'Aisha Al Falasi', 'Partner · engaged', 'active', 'aisha@dana.demo'),
        ('a0000000-0000-0000-0000-000000000016', 'couple', 'hamdan', 'Hamdan Al Qubaisi', 'Partner · engaged', 'active', 'hamdan@dana.demo'),
        ('a0000000-0000-0000-0000-000000000017', 'couple', 'shamma', 'Shamma Al Zaabi', 'Partner · engaged', 'active', 'shamma@dana.demo'),
        ('a0000000-0000-0000-0000-000000000018', 'couple', 'rohit', 'Rohit Sharma', 'Partner · engaged', 'active', 'rohit.sharma@example.ae'),
        ('a0000000-0000-0000-0000-000000000019', 'couple', 'priya', 'Priya Sundaram', 'Partner · engaged', 'active', 'priya.sundaram@example.ae'),
        ('a0000000-0000-0000-0000-000000000020', 'couple', 'arjun', 'Arjun Kapoor', 'Partner · married', 'active', 'arjun.kapoor@example.ae'),
        ('a0000000-0000-0000-0000-000000000021', 'couple', 'ananya_p', 'Ananya Iyer', 'Partner · married', 'active', 'ananya.iyer@example.ae')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;

-- 7. Verification Summary
SELECT 
    (SELECT count(*) FROM public.locations) AS total_locations,
    (SELECT count(*) FROM public.people) AS total_people,
    (SELECT count(*) FROM public.couples) AS total_couples,
    (SELECT count(*) FROM public.accounts) AS total_accounts;

