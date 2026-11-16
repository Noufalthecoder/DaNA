-- ==============================================================================
-- Migration 031: Insert UAE Locations into public.locations in Supabase
-- Target Database: Supabase PostgreSQL (project: oflqmhfivyzttlivgusr)
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/oflqmhfivyzttlivgusr/sql/new
-- ==============================================================================

-- 1. Ensure RLS allows read access to anon & authenticated users
ALTER TABLE IF EXISTS public.locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS locations_read ON public.locations;
CREATE POLICY locations_read ON public.locations FOR SELECT TO authenticated, anon USING (true);
GRANT SELECT ON public.locations TO anon, authenticated, service_role;

-- 2. Insert all 12 UAE Cities (from SimpleMaps World Cities dataset)
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

-- 3. Verify inserted records
SELECT count(*) AS total_uae_locations FROM public.locations;

