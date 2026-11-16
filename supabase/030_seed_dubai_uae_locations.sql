-- ==============================================================================
-- Migration 030: Seed Dubai / UAE Location Reference Database (SimpleMaps)
-- Populates public.countries, public.regions, public.cities, and public.locations
-- Scoped strictly to the UAE / Dubai premarital healthcare jurisdiction.
-- ==============================================================================

-- 1. Seed Country: United Arab Emirates
INSERT INTO public.countries (name, iso2, iso3)
VALUES ('United Arab Emirates', 'AE', 'ARE')
ON CONFLICT (iso2) DO UPDATE SET name = EXCLUDED.name, iso3 = EXCLUDED.iso3;

-- 2. Seed Emirates / Regions
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

-- 3. Seed Flat Locations (public.locations)
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784736618, 'Dubai', 'Dubayy', 'United Arab Emirates', 'AE', 25.2697, 55.3094) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784176710, 'Abu Dhabi', 'Abū Z̧aby', 'United Arab Emirates', 'AE', 24.4511, 54.3969) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784152993, 'Sharjah', 'Ash Shāriqah', 'United Arab Emirates', 'AE', 25.3375, 55.4119) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784674685, 'Al ‘Ayn', 'Abū Z̧aby', 'United Arab Emirates', 'AE', 24.2075, 55.7447) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784337875, '‘Ajmān', '‘Ajmān', 'United Arab Emirates', 'AE', 25.3994, 55.4797) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784053892, 'Ra’s al Khaymah', 'Ra’s al Khaymah', 'United Arab Emirates', 'AE', 25.7851, 55.9479) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784909196, 'Al Fujayrah', 'Al Fujayrah', 'United Arab Emirates', 'AE', 25.1222, 56.3344) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784956003, 'Kalbā', 'Al Fujayrah', 'United Arab Emirates', 'AE', 25.0513, 56.3542) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784525230, 'Umm al Qaywayn', 'Umm al Qaywayn', 'United Arab Emirates', 'AE', 25.5598, 55.5572) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784935461, 'Khawr Fakkān', 'Ash Shāriqah', 'United Arab Emirates', 'AE', 25.3392, 56.3561) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784810704, 'Madīnat Zāyid', 'Abū Z̧aby', 'United Arab Emirates', 'AE', 23.6522, 53.6536) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;
INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) VALUES (1784137216, 'Al Jazīrah al Ḩamrā’', 'Ra’s al Khaymah', 'United Arab Emirates', 'AE', 25.7089, 55.7972) ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- 4. Seed Normalized Cities (public.cities)
DO $$
DECLARE
    v_country_id INT;
    v_reg_id INT;
BEGIN
    SELECT id INTO v_country_id FROM public.countries WHERE iso2 = 'AE';

    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Dubayy';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784736618, v_country_id, v_reg_id, 'Dubai', 'Dubai', 25.2697, 55.3094, 'admin', 4945000) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id, population = EXCLUDED.population;
    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Abū Z̧aby';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784176710, v_country_id, v_reg_id, 'Abu Dhabi', 'Abu Dhabi', 24.4511, 54.3969, 'primary', 1570000) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id, population = EXCLUDED.population;
    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Ash Shāriqah';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784152993, v_country_id, v_reg_id, 'Sharjah', 'Sharjah', 25.3375, 55.4119, 'admin', 1247749) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id, population = EXCLUDED.population;
    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Abū Z̧aby';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784674685, v_country_id, v_reg_id, 'Al ‘Ayn', 'Al `Ayn', 24.2075, 55.7447, '', 766936) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id, population = EXCLUDED.population;
    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = '‘Ajmān';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784337875, v_country_id, v_reg_id, '‘Ajmān', '`Ajman', 25.3994, 55.4797, 'admin', 490035) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id, population = EXCLUDED.population;
    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Ra’s al Khaymah';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784053892, v_country_id, v_reg_id, 'Ra’s al Khaymah', 'Ra''s al Khaymah', 25.7851, 55.9479, 'admin', 115949) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id, population = EXCLUDED.population;
    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Al Fujayrah';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784909196, v_country_id, v_reg_id, 'Al Fujayrah', 'Al Fujayrah', 25.1222, 56.3344, 'admin', 93673) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id, population = EXCLUDED.population;
    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Al Fujayrah';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784956003, v_country_id, v_reg_id, 'Kalbā', 'Kalba', 25.0513, 56.3542, '', 54876) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id, population = EXCLUDED.population;
    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Umm al Qaywayn';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784525230, v_country_id, v_reg_id, 'Umm al Qaywayn', 'Umm al Qaywayn', 25.5598, 55.5572, 'admin', 44411) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id, population = EXCLUDED.population;
    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Ash Shāriqah';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784935461, v_country_id, v_reg_id, 'Khawr Fakkān', 'Khawr Fakkan', 25.3392, 56.3561, '', 39151) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id, population = EXCLUDED.population;
    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Abū Z̧aby';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784810704, v_country_id, v_reg_id, 'Madīnat Zāyid', 'Madinat Zayid', 23.6522, 53.6536, '', 29095) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id, population = EXCLUDED.population;
    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = 'Ra’s al Khaymah';
    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) VALUES (1784137216, v_country_id, v_reg_id, 'Al Jazīrah al Ḩamrā’', 'Al Jazirah al Hamra''', 25.7089, 55.7972, '', 10190) ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id, population = EXCLUDED.population;
END $$;

-- 5. Link Sample User Accounts to UAE Locations
DO $$
DECLARE
    v_dubai_id INT;
    v_ad_id INT;
    v_sharjah_id INT;
    v_rak_id INT;
    v_fuj_id INT;
    v_alain_id INT;
BEGIN
    SELECT id INTO v_dubai_id FROM public.locations WHERE city = 'Dubai' LIMIT 1;
    SELECT id INTO v_ad_id FROM public.locations WHERE city = 'Abu Dhabi' LIMIT 1;
    SELECT id INTO v_sharjah_id FROM public.locations WHERE city = 'Sharjah' LIMIT 1;
    SELECT id INTO v_rak_id FROM public.locations WHERE city LIKE 'Ra%s al Khaymah' LIMIT 1;
    SELECT id INTO v_fuj_id FROM public.locations WHERE city = 'Al Fujayrah' LIMIT 1;
    SELECT id INTO v_alain_id FROM public.locations WHERE city LIKE 'Al%Ayn' LIMIT 1;

    -- Update DoH Admin accounts
    UPDATE public.accounts SET location_id = v_ad_id WHERE user_id IN ('doh', 'admin_sec');

    -- Update Counsellor accounts
    UPDATE public.accounts SET location_id = v_ad_id WHERE user_id = 'mariam';
    UPDATE public.accounts SET location_id = v_dubai_id WHERE user_id IN ('sara', 'counsellor_in');

    -- Update Couple accounts
    UPDATE public.accounts SET location_id = v_ad_id WHERE user_id IN ('khalid', 'fatima', 'arjun', 'ananya_p');
    UPDATE public.accounts SET location_id = v_dubai_id WHERE user_id IN ('ahmed', 'noura', 'rohit', 'priya');
    UPDATE public.accounts SET location_id = v_alain_id WHERE user_id IN ('saeed', 'maryam');
    UPDATE public.accounts SET location_id = v_sharjah_id WHERE user_id IN ('omar', 'latifa');
    UPDATE public.accounts SET location_id = v_rak_id WHERE user_id IN ('rashid', 'aisha');
    UPDATE public.accounts SET location_id = v_fuj_id WHERE user_id IN ('hamdan', 'shamma');
END $$;
