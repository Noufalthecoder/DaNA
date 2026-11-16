#!/usr/bin/env python3
import csv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "data" / "worldcities" / "worldcities.csv"
OUTPUT_SQL_PATH = BASE_DIR / "supabase" / "030_seed_dubai_uae_locations.sql"

def generate():
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        uae_rows = [r for r in reader if r["iso2"] == "AE"]

    print(f"Loaded {len(uae_rows)} UAE cities.")

    # Distinct regions (emirates)
    regions = sorted(list(set(r["admin_name"] for r in uae_rows if r["admin_name"])))

    sql_lines = [
        "-- ==============================================================================",
        "-- Migration 030: Seed Dubai / UAE Location Reference Database (SimpleMaps)",
        "-- Populates public.countries, public.regions, public.cities, and public.locations",
        "-- Scoped strictly to the UAE / Dubai premarital healthcare jurisdiction.",
        "-- ==============================================================================",
        "",
        "-- 1. Seed Country: United Arab Emirates",
        "INSERT INTO public.countries (name, iso2, iso3)",
        "VALUES ('United Arab Emirates', 'AE', 'ARE')",
        "ON CONFLICT (iso2) DO UPDATE SET name = EXCLUDED.name, iso3 = EXCLUDED.iso3;",
        "",
        "-- 2. Seed Emirates / Regions",
        "DO $$",
        "DECLARE",
        "    v_country_id INT;",
        "BEGIN",
        "    SELECT id INTO v_country_id FROM public.countries WHERE iso2 = 'AE';",
        "",
    ]

    for reg in regions:
        reg_escaped = reg.replace("'", "''")
        sql_lines.append(f"    INSERT INTO public.regions (country_id, name) VALUES (v_country_id, '{reg_escaped}') ON CONFLICT (country_id, name) DO NOTHING;")

    sql_lines.extend([
        "END $$;",
        "",
        "-- 3. Seed Flat Locations (public.locations)",
    ])

    for r in uae_rows:
        city_escaped = r["city"].replace("'", "''")
        admin_escaped = r["admin_name"].replace("'", "''")
        source_id = r["id"]
        lat = r["lat"]
        lng = r["lng"]
        country = r["country"]
        iso2 = r["iso2"]
        sql_lines.append(
            f"INSERT INTO public.locations (source_id, city, state_name, country, country_code, latitude, longitude) "
            f"VALUES ({source_id}, '{city_escaped}', '{admin_escaped}', '{country}', '{iso2}', {lat}, {lng}) "
            f"ON CONFLICT (source_id) DO UPDATE SET city = EXCLUDED.city, state_name = EXCLUDED.state_name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;"
        )

    sql_lines.extend([
        "",
        "-- 4. Seed Normalized Cities (public.cities)",
        "DO $$",
        "DECLARE",
        "    v_country_id INT;",
        "    v_reg_id INT;",
        "BEGIN",
        "    SELECT id INTO v_country_id FROM public.countries WHERE iso2 = 'AE';",
        "",
    ])

    for r in uae_rows:
        city_escaped = r["city"].replace("'", "''")
        city_ascii = r["city_ascii"].replace("'", "''")
        admin_escaped = r["admin_name"].replace("'", "''")
        source_id = r["id"]
        lat = r["lat"]
        lng = r["lng"]
        capital = r["capital"]
        pop = r["population"] or "NULL"
        sql_lines.append(f"    SELECT id INTO v_reg_id FROM public.regions WHERE country_id = v_country_id AND name = '{admin_escaped}';")
        sql_lines.append(
            f"    INSERT INTO public.cities (source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population) "
            f"VALUES ({source_id}, v_country_id, v_reg_id, '{city_escaped}', '{city_ascii}', {lat}, {lng}, '{capital}', {pop}) "
            f"ON CONFLICT (source_id) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id, population = EXCLUDED.population;"
        )

    sql_lines.extend([
        "END $$;",
        "",
        "-- 5. Link Sample User Accounts to UAE Locations",
        "DO $$",
        "DECLARE",
        "    v_dubai_id INT;",
        "    v_ad_id INT;",
        "    v_sharjah_id INT;",
        "    v_rak_id INT;",
        "    v_fuj_id INT;",
        "    v_alain_id INT;",
        "BEGIN",
        "    SELECT id INTO v_dubai_id FROM public.locations WHERE city = 'Dubai' LIMIT 1;",
        "    SELECT id INTO v_ad_id FROM public.locations WHERE city = 'Abu Dhabi' LIMIT 1;",
        "    SELECT id INTO v_sharjah_id FROM public.locations WHERE city = 'Sharjah' LIMIT 1;",
        "    SELECT id INTO v_rak_id FROM public.locations WHERE city LIKE 'Ra%s al Khaymah' LIMIT 1;",
        "    SELECT id INTO v_fuj_id FROM public.locations WHERE city = 'Al Fujayrah' LIMIT 1;",
        "    SELECT id INTO v_alain_id FROM public.locations WHERE city LIKE 'Al%Ayn' LIMIT 1;",
        "",
        "    -- Update DoH Admin accounts",
        "    UPDATE public.accounts SET location_id = v_ad_id WHERE user_id IN ('doh', 'admin_sec');",
        "",
        "    -- Update Counsellor accounts",
        "    UPDATE public.accounts SET location_id = v_ad_id WHERE user_id = 'mariam';",
        "    UPDATE public.accounts SET location_id = v_dubai_id WHERE user_id IN ('sara', 'counsellor_in');",
        "",
        "    -- Update Couple accounts",
        "    UPDATE public.accounts SET location_id = v_ad_id WHERE user_id IN ('khalid', 'fatima', 'arjun', 'ananya_p');",
        "    UPDATE public.accounts SET location_id = v_dubai_id WHERE user_id IN ('ahmed', 'noura', 'rohit', 'priya');",
        "    UPDATE public.accounts SET location_id = v_alain_id WHERE user_id IN ('saeed', 'maryam');",
        "    UPDATE public.accounts SET location_id = v_sharjah_id WHERE user_id IN ('omar', 'latifa');",
        "    UPDATE public.accounts SET location_id = v_rak_id WHERE user_id IN ('rashid', 'aisha');",
        "    UPDATE public.accounts SET location_id = v_fuj_id WHERE user_id IN ('hamdan', 'shamma');",
        "END $$;",
        ""
    ])

    with open(OUTPUT_SQL_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines))

    print(f"Generated {OUTPUT_SQL_PATH} successfully.")

if __name__ == "__main__":
    generate()

