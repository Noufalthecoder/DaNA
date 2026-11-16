-- ==============================================================================
-- Migration: Add Countries, Regions, Cities & Locations to Supabase
-- Target Database: Supabase PostgreSQL (project: oflqmhfivyzttlivgusr)
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/oflqmhfivyzttlivgusr/sql/new
-- ==============================================================================

-- 1. Create Countries Reference Table
CREATE TABLE IF NOT EXISTS public.countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    iso2 CHAR(2) NOT NULL UNIQUE,
    iso3 CHAR(3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_countries_iso2 ON public.countries (iso2);
CREATE INDEX IF NOT EXISTS idx_countries_name ON public.countries (name);

-- 2. Create Regions (Emirates / States) Reference Table
CREATE TABLE IF NOT EXISTS public.regions (
    id SERIAL PRIMARY KEY,
    country_id INT NOT NULL REFERENCES public.countries (id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_regions_country_name UNIQUE (country_id, name)
);

CREATE INDEX IF NOT EXISTS idx_regions_country_id ON public.regions (country_id);
CREATE INDEX IF NOT EXISTS idx_regions_name ON public.regions (name);

-- 3. Create Cities Reference Table
CREATE TABLE IF NOT EXISTS public.cities (
    id SERIAL PRIMARY KEY,
    source_id BIGINT NOT NULL UNIQUE,
    country_id INT NOT NULL REFERENCES public.countries (id) ON DELETE CASCADE,
    region_id INT REFERENCES public.regions (id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    city_ascii VARCHAR(200) NOT NULL,
    latitude NUMERIC(9, 5) NOT NULL,
    longitude NUMERIC(9, 5) NOT NULL,
    capital VARCHAR(20) DEFAULT '' CHECK (capital IN ('primary', 'admin', 'minor', '')),
    population BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cities_country_id ON public.cities (country_id);
CREATE INDEX IF NOT EXISTS idx_cities_region_id ON public.cities (region_id);
CREATE INDEX IF NOT EXISTS idx_cities_name ON public.cities (name);
CREATE INDEX IF NOT EXISTS idx_cities_source_id ON public.cities (source_id);

-- 4. Create Flat Locations Reference Table (for fast single-join lookups)
CREATE TABLE IF NOT EXISTS public.locations (
    id SERIAL PRIMARY KEY,
    source_id BIGINT NOT NULL UNIQUE,
    city VARCHAR(200) NOT NULL,
    state_name VARCHAR(200),
    country VARCHAR(150) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    latitude NUMERIC(9, 5) NOT NULL,
    longitude NUMERIC(9, 5) NOT NULL,
    source VARCHAR(100) NOT NULL DEFAULT 'simplemaps_worldcities_basicv1.91.4',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_country ON public.locations (country);
CREATE INDEX IF NOT EXISTS idx_locations_country_state ON public.locations (country, state_name);
CREATE INDEX IF NOT EXISTS idx_locations_country_code ON public.locations (country_code);

-- 5. Attach location columns to profiles and accounts
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS location_id INT REFERENCES public.locations (id) ON DELETE SET NULL;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS city_id INT REFERENCES public.cities (id) ON DELETE SET NULL;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS location_id INT REFERENCES public.locations (id) ON DELETE SET NULL;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS city_id INT REFERENCES public.cities (id) ON DELETE SET NULL;

-- 6. Enable Row Level Security (RLS) & Grant Access
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS countries_read ON public.countries;
CREATE POLICY countries_read ON public.countries FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS regions_read ON public.regions;
CREATE POLICY regions_read ON public.regions FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS cities_read ON public.cities;
CREATE POLICY cities_read ON public.cities FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS locations_read ON public.locations;
CREATE POLICY locations_read ON public.locations FOR SELECT TO authenticated, anon USING (true);

GRANT SELECT ON public.countries TO anon, authenticated, service_role;
GRANT SELECT ON public.regions TO anon, authenticated, service_role;
GRANT SELECT ON public.cities TO anon, authenticated, service_role;
GRANT SELECT ON public.locations TO anon, authenticated, service_role;

-- 7. Seed United Arab Emirates (AE) and all 12 UAE Cities from SimpleMaps dataset
INSERT INTO public.countries (name, iso2, iso3)
VALUES ('United Arab Emirates', 'AE', 'ARE')
ON CONFLICT (iso2) DO UPDATE SET name = EXCLUDED.name, iso3 = EXCLUDED.iso3;

DO $$
DECLARE
    v_country_id INT;
BEGIN
    SELECT id INTO v_country_id FROM public.countries WHERE iso2 = 'AE';

    INSERT INTO public.regions (country_id, name) VALUES (v_country_id, 'Abū Z̧aby') ON CONFLICT (country_id, name) DO NOTHING;
    INSERT INTO public.regions (country_id, name) VALUES (v_country_id, 'Al Fujayrah') ON CONFLICT (country_id, name) DO NOTHING;
    INSERT INTO public.regions (country_id, name) VALUES (v_country_id, 'Ash Shāriqah') ON CONFLICT (country_id, name) DO NOTHING;
    INSERT INTO public.regions (country_id, name) VALUES (v_country_id, 'Dubayy') ON CONFLICT (country_id, name) DO NOTHING;
    INSERT INTO public.regions (country_id, name) VALUES (v_country_id, 'Ra’s al Khaymah') ON CONFLICT (country_id, name) DO NOTHING;
    INSERT INTO public.regions (country_id, name) VALUES (v_country_id, 'Umm al Qaywayn') ON CONFLICT (country_id, name) DO NOTHING;
    INSERT INTO public.regions (country_id, name) VALUES (v_country_id, '‘Ajmān') ON CONFLICT (country_id, name) DO NOTHING;
END $$;

-- Insert Flat Locations
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784736618, 'Dubai', 'Dubayy', 'United Arab Emirates', 'AE', 25.2697, 55.3094) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784176710, 'Abu Dhabi', 'Abū Z̧aby', 'United Arab Emirates', 'AE', 24.4511, 54.3969) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784152993, 'Sharjah', 'Ash Shāriqah', 'United Arab Emirates', 'AE', 25.3375, 55.4119) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784674685, 'Al ‘Ayn', 'Abū Z̧aby', 'United Arab Emirates', 'AE', 24.2075, 55.7447) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784337875, '‘Ajmān', '‘Ajmān', 'United Arab Emirates', 'AE', 25.3994, 55.4797) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784053892, 'Ra’s al Khaymah', 'Ra’s al Khaymah', 'United Arab Emirates', 'AE', 25.7851, 55.9479) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784909196, 'Al Fujayrah', 'Al Fujayrah', 'United Arab Emirates', 'AE', 25.1222, 56.3344) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784956003, 'Kalbā', 'Al Fujayrah', 'United Arab Emirates', 'AE', 25.0513, 56.3542) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784525230, 'Umm al Qaywayn', 'Umm al Qaywayn', 'United Arab Emirates', 'AE', 25.5598, 55.5572) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784935461, 'Khawr Fakkān', 'Ash Shāriqah', 'United Arab Emirates', 'AE', 25.3392, 56.3561) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784810704, 'Madīnat Zāyid', 'Abū Z̧aby', 'United Arab Emirates', 'AE', 23.6522, 53.6536) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784137216, 'Al Jazīrah al Ḩamrā’', 'Ra’s al Khaymah', 'United Arab Emirates', 'AE', 25.7089, 55.7972) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name;

-- Insert Normalized Cities
DO $$
DECLARE
    v_country_id INT;
    v_reg_id INT;
BEGIN
    SELECT id INTO v_country_id FROM public.countries WHERE iso2 = 'AE';

    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Dubayy';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784736618, v_country_id, v_reg_id, 'Dubai', 'Dubai', 25.2697, 55.3094, 'admin', 4945000) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name;

    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Abū Z̧aby';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784176710, v_country_id, v_reg_id, 'Abu Dhabi', 'Abu Dhabi', 24.4511, 54.3969, 'primary', 1570000) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name;

    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Ash Shāriqah';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784152993, v_country_id, v_reg_id, 'Sharjah', 'Sharjah', 25.3375, 55.4119, 'admin', 1247749) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name;

    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Abū Z̧aby';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784674685, v_country_id, v_reg_id, 'Al ‘Ayn', 'Al `Ayn', 24.2075, 55.7447, '', 766936) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name;

    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = '‘Ajmān';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784337875, v_country_id, v_reg_id, '‘Ajmān', '`Ajman', 25.3994, 55.4797, 'admin', 490035) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name;

    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Ra’s al Khaymah';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784053892, v_country_id, v_reg_id, 'Ra’s al Khaymah', 'Ra''s al Khaymah', 25.7851, 55.9479, 'admin', 115949) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name;

    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Al Fujayrah';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784909196, v_country_id, v_reg_id, 'Al Fujayrah', 'Al Fujayrah', 25.1222, 56.3344, 'admin', 93673) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name;

    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Al Fujayrah';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784956003, v_country_id, v_reg_id, 'Kalbā', 'Kalba', 25.0513, 56.3542, '', 54876) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name;

    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Umm al Qaywayn';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784525230, v_country_id, v_reg_id, 'Umm al Qaywayn', 'Umm al Qaywayn', 25.5598, 55.5572, 'admin', 44411) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name;

    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Ash Shāriqah';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784935461, v_country_id, v_reg_id, 'Khawr Fakkān', 'Khawr Fakkan', 25.3392, 56.3561, '', 39151) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name;

    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Abū Z̧aby';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784810704, v_country_id, v_reg_id, 'Madīnat Zāyid', 'Madinat Zayid', 23.6522, 53.6536, '', 29095) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name;

    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Ra’s al Khaymah';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784137216, v_country_id, v_reg_id, 'Al Jazīrah al Ḩamrā’', 'Al Jazirah al Hamra''', 25.7089, 55.7972, '', 10190) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name;
END $$;

