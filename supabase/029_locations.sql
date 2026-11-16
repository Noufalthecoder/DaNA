-- ==============================================================================
-- Migration 029: Location Reference Database & Profile Location Link
-- Creates normalized reference tables for countries, regions, and cities
-- based on SimpleMaps World Cities dataset (50,250 records).
-- ==============================================================================

-- 1. Countries reference table
CREATE TABLE IF NOT EXISTS public.countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    iso2 CHAR(2) NOT NULL UNIQUE,
    iso3 CHAR(3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_countries_iso2 ON public.countries (iso2);
CREATE INDEX IF NOT EXISTS idx_countries_name ON public.countries (name);

-- 2. Regions reference table (states, provinces, emirates, governorates)
CREATE TABLE IF NOT EXISTS public.regions (
    id SERIAL PRIMARY KEY,
    country_id INT NOT NULL REFERENCES public.countries (id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_regions_country_name UNIQUE (country_id, name)
);

CREATE INDEX IF NOT EXISTS idx_regions_country_id ON public.regions (country_id);
CREATE INDEX IF NOT EXISTS idx_regions_name ON public.regions (name);

-- 3. Cities reference table
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

-- 4. Connect user profiles and accounts to location
-- Preferred relationship: profile.city_id -> cities.id
-- Country and region are derived through the city relationship.
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS city_id INT REFERENCES public.cities (id) ON DELETE SET NULL;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS city_id INT REFERENCES public.cities (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_people_city_id ON public.people (city_id);
CREATE INDEX IF NOT EXISTS idx_accounts_city_id ON public.accounts (city_id);

-- 5. Row-Level Security (RLS)
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Reference locations are read-accessible to all authenticated and anonymous users
DROP POLICY IF EXISTS countries_read ON public.countries;
CREATE POLICY countries_read ON public.countries FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS regions_read ON public.regions;
CREATE POLICY regions_read ON public.regions FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS cities_read ON public.cities;
CREATE POLICY cities_read ON public.cities FOR SELECT TO authenticated, anon USING (true);

-- Modifications restricted to service_role / administrators
GRANT SELECT ON public.countries TO anon, authenticated, service_role;
GRANT SELECT ON public.regions TO anon, authenticated, service_role;
GRANT SELECT ON public.cities TO anon, authenticated, service_role;
