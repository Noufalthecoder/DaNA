-- ==============================================================================
-- Migration 032: Seed Locations, People, Couples & Accounts in Supabase
-- Target Database: Supabase PostgreSQL (project: oflqmhfivyzttlivgusr)
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/oflqmhfivyzttlivgusr/sql/new
-- ==============================================================================

-- 1. Ensure Table Columns exist
ALTER TABLE IF EXISTS public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.accounts ENABLE ROW LEVEL SECURITY;

-- 2. Open read access for admin directory inspection
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

-- 3. Insert All 12 UAE Cities into public.locations
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
('Al Jazīrah al Ḩamrā’', 'Al Jazirah al Hamra''', 'Ra’s al Khaymah', 'United Arab Emirates', 'AE', 25.7089, 55.7972);

-- 4. Insert People Profiles
INSERT INTO public.people (id, name, short_name, sex, birth_year, language) VALUES
('khalid', 'Khalid Al Mansoori', 'Khalid', 'M', 1998, 'ar'),
('fatima', 'Fatima Al Hammadi', 'Fatima', 'F', 2000, 'ar'),
('ahmed', 'Ahmed Al Ketbi', 'Ahmed', 'M', 1995, 'ar'),
('noura', 'Noura Al Ketbi', 'Noura', 'F', 1997, 'ar'),
('saeed', 'Saeed Al Nuaimi', 'Saeed', 'M', 1999, 'ar'),
('maryam', 'Maryam Al Shamsi', 'Maryam', 'F', 2001, 'ar'),
('omar', 'Omar Al Dhaheri', 'Omar', 'M', 1994, 'ar'),
('latifa', 'Latifa Al Mazrouei', 'Latifa', 'F', 1996, 'ar'),
('rashid', 'Rashid Al Suwaidi', 'Rashid', 'M', 1997, 'ar'),
('aisha', 'Aisha Al Falasi', 'Aisha', 'F', 1999, 'ar'),
('hamdan', 'Hamdan Al Qubaisi', 'Hamdan', 'M', 2000, 'ar'),
('shamma', 'Shamma Al Zaabi', 'Shamma', 'F', 2002, 'ar'),
('rohit', 'Rohit Sharma', 'Rohit', 'M', 1996, 'en'),
('priya', 'Priya Sundaram', 'Priya', 'F', 1998, 'en'),
('arjun', 'Arjun Kapoor', 'Arjun', 'M', 1995, 'en'),
('ananya_p', 'Ananya Iyer', 'Ananya', 'F', 1997, 'en')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sex = EXCLUDED.sex;

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

-- 6. Insert Accounts
-- Note: If accounts.user_id references auth.users(id), we populate from auth.users or insert with distinct UUIDs
DO $$
BEGIN
    -- Check if user_id in accounts has a foreign key to auth.users
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc 
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name 
        WHERE tc.table_name = 'accounts' AND ccu.table_name = 'users'
    ) THEN
        -- Insert accounts linked to existing auth.users
        INSERT INTO public.accounts (user_id, role, person_id, display_name, title)
        SELECT u.id, a.role, a.person_id, a.display_name, a.title
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
        -- Insert standard sample accounts with stable UUIDs
        INSERT INTO public.accounts (user_id, role, person_id, display_name, title) VALUES
        ('00000000-0000-0000-0000-000000000001', 'admin', NULL, 'Programme team', 'DoH premarital programme'),
        ('00000000-0000-0000-0000-000000000002', 'admin', NULL, 'Security Operations Lead', 'DoH IAM Security Authority'),
        ('00000000-0000-0000-0000-000000000003', 'counsellor', NULL, 'Dr. Mariam Al Hosani', 'Senior Genetic Counsellor'),
        ('00000000-0000-0000-0000-000000000004', 'counsellor', NULL, 'Dr. Sara Al Zaabi', 'Clinical Geneticist & Counsellor'),
        ('00000000-0000-0000-0000-000000000005', 'couple', 'khalid', 'Khalid Al Mansoori', 'Partner · engaged'),
        ('00000000-0000-0000-0000-000000000006', 'couple', 'fatima', 'Fatima Al Hammadi', 'Partner · engaged'),
        ('00000000-0000-0000-0000-000000000007', 'couple', 'ahmed', 'Ahmed Al Ketbi', 'Partner · married'),
        ('00000000-0000-0000-0000-000000000008', 'couple', 'noura', 'Noura Al Ketbi', 'Partner · married')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;

-- 7. Verification Summary
SELECT 
    (SELECT count(*) FROM public.locations) AS total_locations,
    (SELECT count(*) FROM public.people) AS total_people,
    (SELECT count(*) FROM public.couples) AS total_couples,
    (SELECT count(*) FROM public.accounts) AS total_accounts;

