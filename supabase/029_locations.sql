-- ==============================================================================
-- Migration 029: Location Reference Database & Profile Location Link
-- Creates reference table public.locations and normalized reference tables
-- (countries, regions, cities) based on SimpleMaps World Cities (50,250 records).
-- ==============================================================================

-- 1. Main reference table: public.locations
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
CREATE INDEX IF NOT EXISTS idx_locations_country_state_city ON public.locations (country, state_name, city);
CREATE INDEX IF NOT EXISTS idx_locations_country_code ON public.locations (country_code);
CREATE INDEX IF NOT EXISTS idx_locations_source_id ON public.locations (source_id);

-- 2. Normalized countries reference table
CREATE TABLE IF NOT EXISTS public.countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    iso2 CHAR(2) NOT NULL UNIQUE,
    iso3 CHAR(3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_countries_iso2 ON public.countries (iso2);
CREATE INDEX IF NOT EXISTS idx_countries_name ON public.countries (name);

-- 3. Normalized regions reference table (states, provinces, emirates, governorates)
CREATE TABLE IF NOT EXISTS public.regions (
    id SERIAL PRIMARY KEY,
    country_id INT NOT NULL REFERENCES public.countries (id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_regions_country_name UNIQUE (country_id, name)
);

CREATE INDEX IF NOT EXISTS idx_regions_country_id ON public.regions (country_id);
CREATE INDEX IF NOT EXISTS idx_regions_name ON public.regions (name);

-- 4. Normalized cities reference table
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
CREATE INDEX IF NOT EXISTS idx_cities_city_ascii ON public.cities (city_ascii);
CREATE INDEX IF NOT EXISTS idx_cities_source_id ON public.cities (source_id);

-- 5. Connect user profiles and accounts to location
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS location_id INT REFERENCES public.locations (id) ON DELETE SET NULL;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS city_id INT REFERENCES public.cities (id) ON DELETE SET NULL;

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS location_id INT REFERENCES public.locations (id) ON DELETE SET NULL;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS city_id INT REFERENCES public.cities (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_people_location_id ON public.people (location_id);
CREATE INDEX IF NOT EXISTS idx_accounts_location_id ON public.accounts (location_id);
CREATE INDEX IF NOT EXISTS idx_people_city_id ON public.people (city_id);
CREATE INDEX IF NOT EXISTS idx_accounts_city_id ON public.accounts (city_id);

-- 6. Row-Level Security (RLS)
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Reference locations are read-accessible to all authenticated and anonymous users
DROP POLICY IF EXISTS locations_read ON public.locations;
CREATE POLICY locations_read ON public.locations FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS countries_read ON public.countries;
CREATE POLICY countries_read ON public.countries FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS regions_read ON public.regions;
CREATE POLICY regions_read ON public.regions FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS cities_read ON public.cities;
CREATE POLICY cities_read ON public.cities FOR SELECT TO authenticated, anon USING (true);

-- Mutations restricted to service_role
GRANT SELECT ON public.locations TO anon, authenticated, service_role;
GRANT SELECT ON public.countries TO anon, authenticated, service_role;
GRANT SELECT ON public.regions TO anon, authenticated, service_role;
GRANT SELECT ON public.cities TO anon, authenticated, service_role;
