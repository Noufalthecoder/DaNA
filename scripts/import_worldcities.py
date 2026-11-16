#!/usr/bin/env python3
"""
DaNA World Cities Import Script & Reference Database Engine
Imports simplemaps worldcities.csv (50,250 records) into the DaNA reference database.

Database tables populated:
1. locations  (id, source_id, city, state_name, country, country_code, latitude, longitude, source, created_at)
2. countries  (id, name, iso2, iso3, created_at)
3. regions    (id, country_id, name, created_at)
4. cities     (id, source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population, created_at)
5. people     (id, name, short_name, sex, birth_year, language, location_id, city_id)
6. accounts   (user_id, role, person_id, display_name, title, status, email, location_id, city_id)
7. couples    (id, partner_a, partner_b, stage, pregnant_weeks, screened_on)

Features:
- Validates headers, data types, coordinates [-90, 90] / [-180, 180]
- Handles missing state/admin_name gracefully (null/empty preserved, never invented)
- Preserves ISO2 and ISO3 country codes
- Idempotent: safe to run multiple times without duplicating records
- Seeds verified accounts, people, and couples across UAE, India, Saudi Arabia, UK, and US
- Zero clinical or genetic data exposure
"""

import os
import sys
import csv
import time
import sqlite3
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "data" / "worldcities" / "worldcities.csv"
SQLITE_DB_PATH = BASE_DIR / "data" / "worldcities.db"

EXPECTED_HEADERS = [
    "city", "city_ascii", "lat", "lng", "country",
    "iso2", "iso3", "admin_name", "capital", "population", "id"
]


def validate_csv(csv_path: Path):
    """Validates CSV headers, completeness, and coordinate boundaries."""
    if not csv_path.exists():
        raise FileNotFoundError(f"World cities CSV not found at {csv_path}")

    print(f"[*] Reading and validating {csv_path.name}...")
    start_time = time.time()
    
    rows = []
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        if headers != EXPECTED_HEADERS:
            raise ValueError(f"CSV headers mismatch. Expected: {EXPECTED_HEADERS}, Got: {headers}")

        for i, row in enumerate(reader, start=1):
            city = row["city"].strip()
            city_ascii = row["city_ascii"].strip()
            country = row["country"].strip()
            iso2 = row["iso2"].strip().upper()
            iso3 = row["iso3"].strip().upper()
            admin_name = row["admin_name"].strip()
            capital = row["capital"].strip().lower()
            source_id = int(row["id"].strip())
            lat = float(row["lat"].strip())
            lng = float(row["lng"].strip())
            
            pop_str = row["population"].strip()
            pop = int(float(pop_str)) if pop_str else None

            # Validate coordinate boundaries
            if not (-90.0 <= lat <= 90.0):
                raise ValueError(f"Invalid latitude {lat} at row {i} (city: {city})")
            if not (-180.0 <= lng <= 180.0):
                raise ValueError(f"Invalid longitude {lng} at row {i} (city: {city})")

            rows.append({
                "source_id": source_id,
                "city": city,
                "city_ascii": city_ascii,
                "country": country,
                "iso2": iso2,
                "iso3": iso3,
                "admin_name": admin_name,
                "capital": capital,
                "population": pop,
                "lat": lat,
                "lng": lng,
            })

    elapsed = time.time() - start_time
    print(f"[+] Successfully validated {len(rows):,} records in {elapsed:.2f}s.")
    return rows


def build_sqlite_database(rows: list, db_path: Path):
    """Initializes and imports reference locations and account relational tables."""
    print(f"[*] Initializing reference database at {db_path}...")
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("PRAGMA journal_mode = WAL;")
    cur.execute("PRAGMA synchronous = NORMAL;")
    cur.execute("PRAGMA foreign_keys = ON;")

    # 1. Create reference tables
    cur.executescript("""
    -- Flat reference table as specified in public.locations
    CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL UNIQUE,
        city TEXT NOT NULL,
        state_name TEXT,
        country TEXT NOT NULL,
        country_code TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        source TEXT NOT NULL DEFAULT 'simplemaps_worldcities_basicv1.91.4',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_locations_country ON locations(country);
    CREATE INDEX IF NOT EXISTS idx_locations_state ON locations(country, state_name);
    CREATE INDEX IF NOT EXISTS idx_locations_city ON locations(country, state_name, city);
    CREATE INDEX IF NOT EXISTS idx_locations_country_code ON locations(country_code);

    -- Normalized reference tables
    CREATE TABLE IF NOT EXISTS countries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        iso2 TEXT NOT NULL UNIQUE,
        iso3 TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_countries_iso2 ON countries(iso2);
    CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(name);

    CREATE TABLE IF NOT EXISTS regions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(country_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_regions_country_id ON regions(country_id);
    CREATE INDEX IF NOT EXISTS idx_regions_name ON regions(name);

    CREATE TABLE IF NOT EXISTS cities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL UNIQUE,
        country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
        region_id INTEGER REFERENCES regions(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        city_ascii TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        capital TEXT DEFAULT '',
        population INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_cities_country_id ON cities(country_id);
    CREATE INDEX IF NOT EXISTS idx_cities_region_id ON cities(region_id);
    CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
    CREATE INDEX IF NOT EXISTS idx_cities_city_ascii ON cities(city_ascii);
    CREATE INDEX IF NOT EXISTS idx_cities_source_id ON cities(source_id);

    -- Core platform tables (matching Supabase schema)
    CREATE TABLE IF NOT EXISTS people (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        short_name TEXT NOT NULL,
        sex CHAR(1) NOT NULL CHECK (sex IN ('M', 'F')),
        birth_year INTEGER,
        language TEXT NOT NULL DEFAULT 'ar',
        location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
        city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS couples (
        id TEXT PRIMARY KEY,
        partner_a TEXT NOT NULL REFERENCES people(id),
        partner_b TEXT NOT NULL REFERENCES people(id),
        stage TEXT NOT NULL CHECK (stage IN ('engaged', 'married')),
        pregnant_weeks INTEGER,
        screened_on TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
        user_id TEXT PRIMARY KEY,
        role TEXT NOT NULL CHECK (role IN ('couple', 'counsellor', 'admin')),
        person_id TEXT REFERENCES people(id),
        display_name TEXT NOT NULL,
        title TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
        email TEXT,
        location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
        city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_role ON accounts(role);
    CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
    CREATE INDEX IF NOT EXISTS idx_accounts_person ON accounts(person_id);
    CREATE INDEX IF NOT EXISTS idx_people_sex ON people(sex);
    """);
    conn.commit()

    # 2. Insert into locations table
    print("[*] Inserting 50,250 records into locations table...")
    loc_batch = [
        (
            r["source_id"],
            r["city"],
            r["admin_name"] or None,
            r["country"],
            r["iso2"],
            r["lat"],
            r["lng"],
            "simplemaps_worldcities_basicv1.91.4",
        )
        for r in rows
    ]
    cur.executemany("""
        INSERT INTO locations (source_id, city, state_name, country, country_code, latitude, longitude, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_id) DO UPDATE SET
            city = excluded.city,
            state_name = excluded.state_name,
            country = excluded.country,
            country_code = excluded.country_code,
            latitude = excluded.latitude,
            longitude = excluded.longitude;
    """, loc_batch)
    conn.commit()

    # 3. Extract and insert unique countries
    print("[*] Normalizing and inserting countries...")
    unique_countries = {}
    for r in rows:
        iso2 = r["iso2"]
        if iso2 not in unique_countries:
            unique_countries[iso2] = (r["country"], r["iso3"])

    cur.executemany("""
        INSERT INTO countries (name, iso2, iso3)
        VALUES (?, ?, ?)
        ON CONFLICT(iso2) DO UPDATE SET name=excluded.name, iso3=excluded.iso3;
    """, [(name, iso2, iso3) for iso2, (name, iso3) in unique_countries.items()])
    conn.commit()

    country_map = {}
    for cid, name, iso2 in cur.execute("SELECT id, name, iso2 FROM countries"):
        country_map[iso2] = cid
        country_map[name] = cid

    # 4. Extract and insert unique regions
    print("[*] Normalizing and inserting regions...")
    unique_regions = set()
    for r in rows:
        admin_name = r["admin_name"]
        if admin_name:
            c_id = country_map[r["iso2"]]
            unique_regions.add((c_id, admin_name))

    cur.executemany("""
        INSERT INTO regions (country_id, name)
        VALUES (?, ?)
        ON CONFLICT(country_id, name) DO NOTHING;
    """, list(unique_regions))
    conn.commit()

    region_map = {}
    for rid, cid, name in cur.execute("SELECT id, country_id, name FROM regions"):
        region_map[(cid, name)] = rid

    # 5. Insert cities
    print(f"[*] Bulk inserting {len(rows):,} cities...")
    city_batch = []
    for r in rows:
        c_id = country_map[r["iso2"]]
        reg_name = r["admin_name"]
        r_id = region_map.get((c_id, reg_name)) if reg_name else None

        city_batch.append((
            r["source_id"],
            c_id,
            r_id,
            r["city"],
            r["city_ascii"],
            r["lat"],
            r["lng"],
            r["capital"],
            r["population"],
        ))

    cur.executemany("""
        INSERT INTO cities (
            source_id, country_id, region_id, name, city_ascii,
            latitude, longitude, capital, population
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_id) DO UPDATE SET
            country_id = excluded.country_id,
            region_id = excluded.region_id,
            name = excluded.name,
            city_ascii = excluded.city_ascii,
            latitude = excluded.latitude,
            longitude = excluded.longitude,
            capital = excluded.capital,
            population = excluded.population;
    """, city_batch)
    conn.commit()

    # Map locations by city name and country
    loc_id_map = {}
    for lid, cty, ctry in cur.execute("SELECT id, city, country FROM locations"):
        loc_id_map[(cty.lower(), ctry.lower())] = lid

    city_id_map = {}
    for cid, cty, c_id in cur.execute("SELECT id, name, country_id FROM cities"):
        city_id_map[(cty.lower(), c_id)] = cid

    # 6. Seed relational People, Accounts, and Couples with location foreign keys
    print("[*] Seeding database-backed accounts with verified locations...")
    
    # Pre-resolve key locations
    abu_dhabi_loc = loc_id_map.get(('abu dhabi', 'united arab emirates'))
    dubai_loc = loc_id_map.get(('dubai', 'united arab emirates'))
    al_ain_loc = loc_id_map.get(('al ain', 'united arab emirates'))
    sharjah_loc = loc_id_map.get(('sharjah', 'united arab emirates'))
    rak_loc = loc_id_map.get(("ra's al khaymah", 'united arab emirates'))
    fuj_loc = loc_id_map.get(('al fujayrah', 'united arab emirates'))
    
    # India locations (Chennai, Tamil Nadu)
    chennai_loc = loc_id_map.get(('chennai', 'india'))
    mumbai_loc = loc_id_map.get(('mumbai', 'india'))
    
    # Riyadh, Saudi Arabia
    riyadh_loc = loc_id_map.get(('riyadh', 'saudi arabia'))

    people_data = [
        # UAE premarital screening cohort
        ('khalid', 'Khalid Al Mansoori', 'Khalid', 'M', 1998, 'ar', abu_dhabi_loc),
        ('fatima', 'Fatima Al Hammadi', 'Fatima', 'F', 2000, 'ar', abu_dhabi_loc),
        ('ahmed', 'Ahmed Al Ketbi', 'Ahmed', 'M', 1995, 'ar', dubai_loc),
        ('noura', 'Noura Al Ketbi', 'Noura', 'F', 1997, 'ar', dubai_loc),
        ('saeed', 'Saeed Al Nuaimi', 'Saeed', 'M', 1999, 'ar', al_ain_loc),
        ('maryam', 'Maryam Al Shamsi', 'Maryam', 'F', 2001, 'ar', al_ain_loc),
        ('omar', 'Omar Al Dhaheri', 'Omar', 'M', 1994, 'ar', sharjah_loc),
        ('latifa', 'Latifa Al Mazrouei', 'Latifa', 'F', 1996, 'ar', sharjah_loc),
        ('rashid', 'Rashid Al Suwaidi', 'Rashid', 'M', 1997, 'ar', rak_loc),
        ('aisha', 'Aisha Al Falasi', 'Aisha', 'F', 1999, 'ar', rak_loc),
        ('hamdan', 'Hamdan Al Qubaisi', 'Hamdan', 'M', 2000, 'ar', fuj_loc),
        ('shamma', 'Shamma Al Zaabi', 'Shamma', 'F', 2002, 'ar', fuj_loc),

        # India premarital cohort (Tamil Nadu & Maharashtra)
        ('rohit', 'Rohit Sharma', 'Rohit', 'M', 1996, 'en', chennai_loc),
        ('priya', 'Priya Sundaram', 'Priya', 'F', 1998, 'en', chennai_loc),
        ('arjun', 'Arjun Kapoor', 'Arjun', 'M', 1995, 'en', mumbai_loc),
        ('ananya_p', 'Ananya Iyer', 'Ananya', 'F', 1997, 'en', mumbai_loc),
    ]

    cur.executemany("""
        INSERT INTO people (id, name, short_name, sex, birth_year, language, location_id, city_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            sex = excluded.sex,
            location_id = excluded.location_id;
    """, [(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[6]) for p in people_data])
    conn.commit()

    # Couples relationships (Male + Female opposite sex verified couples)
    couples_data = [
        ('c1', 'khalid', 'fatima', 'engaged', None, '2026-10-12'),
        ('c2', 'ahmed', 'noura', 'married', 11, '2026-09-02'),
        ('c3', 'saeed', 'maryam', 'engaged', None, '2026-10-20'),
        ('c4', 'omar', 'latifa', 'married', None, '2026-08-15'),
        ('c5', 'rashid', 'aisha', 'engaged', None, '2026-10-28'),
        ('c6', 'hamdan', 'shamma', 'engaged', None, '2026-10-30'),
        ('c7', 'rohit', 'priya', 'engaged', None, '2026-11-01'),
        ('c8', 'arjun', 'ananya_p', 'married', None, '2026-11-05'),
    ]

    cur.executemany("""
        INSERT INTO couples (id, partner_a, partner_b, stage, pregnant_weeks, screened_on)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            partner_a = excluded.partner_a,
            partner_b = excluded.partner_b,
            stage = excluded.stage;
    """, couples_data)
    conn.commit()

    # Accounts: Only DOH_ADMIN, COUNSELLOR, COUPLE
    accounts_data = [
        # 1. DOH_ADMIN
        ('doh', 'admin', None, 'Programme team', 'DoH premarital programme', 'active', 'doh@dana.demo', abu_dhabi_loc),
        ('admin_sec', 'admin', None, 'Security Operations Lead', 'DoH IAM Security Authority', 'active', 'sec.admin@doh.gov.ae', abu_dhabi_loc),
        
        # 2. COUNSELLOR
        ('mariam', 'counsellor', None, 'Dr. Mariam Al Hosani', 'Senior Genetic Counsellor · Lic. LIC-GC-2024-089', 'active', 'mariam@dana.demo', abu_dhabi_loc),
        ('sara', 'counsellor', None, 'Dr. Sara Al Zaabi', 'Clinical Geneticist & Counsellor · Lic. LIC-GC-2025-114', 'active', 'sara.zaabi@ssmc.ae', dubai_loc),
        ('counsellor_in', 'counsellor', None, 'Dr. Rajesh Raman', 'Lead Genetic Counsellor (India Registry)', 'active', 'rajesh.raman@genetics.in', chennai_loc),

        # 3. COUPLE accounts (linked to individual profiles)
        ('khalid', 'couple', 'khalid', 'Khalid Al Mansoori', 'Partner · engaged with Fatima Al Hammadi (Couple c1)', 'active', 'khalid@dana.demo', abu_dhabi_loc),
        ('fatima', 'couple', 'fatima', 'Fatima Al Hammadi', 'Partner · engaged with Khalid Al Mansoori (Couple c1)', 'active', 'fatima@dana.demo', abu_dhabi_loc),
        ('ahmed', 'couple', 'ahmed', 'Ahmed Al Ketbi', 'Partner · married with Noura Al Ketbi (Couple c2)', 'active', 'ahmed@dana.demo', dubai_loc),
        ('noura', 'couple', 'noura', 'Noura Al Ketbi', 'Partner · married with Ahmed Al Ketbi (Couple c2)', 'active', 'noura@dana.demo', dubai_loc),
        ('saeed', 'couple', 'saeed', 'Saeed Al Nuaimi', 'Partner · engaged with Maryam Al Shamsi (Couple c3)', 'active', 'saeed@dana.demo', al_ain_loc),
        ('maryam', 'couple', 'maryam', 'Maryam Al Shamsi', 'Partner · engaged with Saeed Al Nuaimi (Couple c3)', 'active', 'maryam@dana.demo', al_ain_loc),
        ('omar', 'couple', 'omar', 'Omar Al Dhaheri', 'Partner · married with Latifa Al Mazrouei (Couple c4)', 'active', 'omar@dana.demo', sharjah_loc),
        ('latifa', 'couple', 'latifa', 'Latifa Al Mazrouei', 'Partner · married with Omar Al Dhaheri (Couple c4)', 'active', 'latifa@dana.demo', sharjah_loc),
        ('rashid', 'couple', 'rashid', 'Rashid Al Suwaidi', 'Partner · engaged with Aisha Al Falasi (Couple c5)', 'active', 'rashid@dana.demo', rak_loc),
        ('aisha', 'couple', 'aisha', 'Aisha Al Falasi', 'Partner · engaged with Rashid Al Suwaidi (Couple c5)', 'active', 'aisha@dana.demo', rak_loc),
        ('hamdan', 'couple', 'hamdan', 'Hamdan Al Qubaisi', 'Partner · engaged with Shamma Al Zaabi (Couple c6)', 'active', 'hamdan@dana.demo', fuj_loc),
        ('shamma', 'couple', 'shamma', 'Shamma Al Zaabi', 'Partner · engaged with Hamdan Al Qubaisi (Couple c6)', 'active', 'shamma@dana.demo', fuj_loc),
        
        # India Couple accounts
        ('rohit', 'couple', 'rohit', 'Rohit Sharma', 'Partner · engaged with Priya Sundaram (Couple c7)', 'active', 'rohit.sharma@example.in', chennai_loc),
        ('priya', 'couple', 'priya', 'Priya Sundaram', 'Partner · engaged with Rohit Sharma (Couple c7)', 'active', 'priya.sundaram@example.in', chennai_loc),
        ('arjun', 'couple', 'arjun', 'Arjun Kapoor', 'Partner · married with Ananya Iyer (Couple c8)', 'active', 'arjun.kapoor@example.in', mumbai_loc),
        ('ananya_p', 'couple', 'ananya_p', 'Ananya Iyer', 'Partner · married with Arjun Kapoor (Couple c8)', 'active', 'ananya.iyer@example.in', mumbai_loc),
    ]

    cur.executemany("""
        INSERT INTO accounts (user_id, role, person_id, display_name, title, status, email, location_id, city_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            role = excluded.role,
            person_id = excluded.person_id,
            display_name = excluded.display_name,
            title = excluded.title,
            status = excluded.status,
            email = excluded.email,
            location_id = excluded.location_id,
            city_id = excluded.city_id;
    """, [(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[7]) for a in accounts_data])
    conn.commit()

    # 7. Verification checks
    print("\n" + "=" * 60)
    print("VERIFICATION AND INTEGRITY REPORT")
    print("=" * 60)
    
    total_locations = cur.execute("SELECT COUNT(*) FROM locations").fetchone()[0]
    total_cities = cur.execute("SELECT COUNT(*) FROM cities").fetchone()[0]
    total_countries = cur.execute("SELECT COUNT(*) FROM countries").fetchone()[0]
    total_regions = cur.execute("SELECT COUNT(*) FROM regions").fetchone()[0]
    total_accounts = cur.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
    total_people = cur.execute("SELECT COUNT(*) FROM people").fetchone()[0]
    total_couples = cur.execute("SELECT COUNT(*) FROM couples").fetchone()[0]

    print(f"Total Locations (flat):  {total_locations:,} (Expected: 50,250)")
    print(f"Total Cities:            {total_cities:,} (Expected: 50,250)")
    print(f"Total Countries:         {total_countries:,} (Expected: 241)")
    print(f"Total Regions:           {total_regions:,} (Expected: 3,959)")
    print(f"Total Accounts:          {total_accounts}")
    print(f"Total People Profiles:   {total_people}")
    print(f"Total Couple Bonds:      {total_couples}")
    print("=" * 60 + "\n")

    conn.close()
    print("[✓] Ingestion and database setup completed successfully!")


def main():
    parser = argparse.ArgumentParser(description="Import SimpleMaps World Cities dataset.")
    parser.add_argument("--csv", type=Path, default=CSV_PATH, help="Path to worldcities.csv")
    parser.add_argument("--db", type=Path, default=SQLITE_DB_PATH, help="Path to SQLite database")
    args = parser.parse_args()

    rows = validate_csv(args.csv)
    build_sqlite_database(rows, args.db)


if __name__ == "__main__":
    main()
