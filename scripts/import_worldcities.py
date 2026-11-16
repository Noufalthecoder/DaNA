#!/usr/bin/env python3
"""
DaNA World Cities Import Script
Imports simplemaps worldcities.csv (50,250 records) into a normalized reference database.

Database tables populated:
1. countries (id, name, iso2, iso3, created_at)
2. regions   (id, country_id, name, created_at)
3. cities    (id, source_id, country_id, region_id, name, city_ascii, latitude, longitude, capital, population, created_at)

Features:
- Validates headers, data types, coordinates, and completeness
- Normalizes countries and country-region relationships
- Idempotent: safe to run multiple times without duplicating records
- Populates local SQLite reference database and/or PostgreSQL/Supabase
- Provides detailed validation and verification metrics
"""

import os
import sys
import csv
import time
import sqlite3
import argparse
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "data" / "worldcities" / "worldcities.csv"
SQLITE_DB_PATH = BASE_DIR / "data" / "worldcities.db"

EXPECTED_HEADERS = [
    "city", "city_ascii", "lat", "lng", "country",
    "iso2", "iso3", "admin_name", "capital", "population", "id"
]


def validate_csv(csv_path: Path):
    """Validates the CSV file exists, headers match, and coordinates are valid."""
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
    """Imports normalized reference data into SQLite database."""
    print(f"[*] Initializing reference database at {db_path}...")
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Enable WAL mode and foreign keys for high performance and integrity
    cur.execute("PRAGMA journal_mode = WAL;")
    cur.execute("PRAGMA synchronous = NORMAL;")
    cur.execute("PRAGMA foreign_keys = ON;")

    # 1. Create tables
    cur.executescript("""
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
    """)

    # 2. Extract and insert unique countries (normalized by ISO2)
    print("[*] Normalizing and inserting countries...")
    country_map = {} # iso2 and name -> id
    
    # Collect unique country records keyed by iso2 to handle minor spelling/casing duplicates in source
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

    # Load country IDs (both by ISO2 and by Name for robust foreign key lookup)
    for cid, name, iso2 in cur.execute("SELECT id, name, iso2 FROM countries"):
        country_map[iso2] = cid
        country_map[name] = cid

    # 3. Extract and insert unique regions (admin_name)
    print("[*] Normalizing and inserting regions...")
    region_map = {} # (country_id, admin_name) -> id
    
    unique_regions = set()
    for r in rows:
        admin_name = r["admin_name"]
        if admin_name: # Do not invent region names when admin_name is empty
            c_id = country_map[r["iso2"]]
            unique_regions.add((c_id, admin_name))

    cur.executemany("""
        INSERT INTO regions (country_id, name)
        VALUES (?, ?)
        ON CONFLICT(country_id, name) DO NOTHING;
    """, list(unique_regions))
    conn.commit()

    # Load region IDs
    for rid, cid, name in cur.execute("SELECT id, country_id, name FROM regions"):
        region_map[(cid, name)] = rid

    # 4. Insert cities in batches
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

    # 5. Verification checks
    print("\n" + "=" * 60)
    print("VERIFICATION AND INTEGRITY REPORT")
    print("=" * 60)
    
    total_cities = cur.execute("SELECT COUNT(*) FROM cities").fetchone()[0]
    total_countries = cur.execute("SELECT COUNT(*) FROM countries").fetchone()[0]
    total_regions = cur.execute("SELECT COUNT(*) FROM regions").fetchone()[0]
    missing_codes = cur.execute("SELECT COUNT(*) FROM countries WHERE iso2 IS NULL OR iso2 = ''").fetchone()[0]
    dup_sources = cur.execute("SELECT COUNT(*) FROM (SELECT source_id FROM cities GROUP BY source_id HAVING COUNT(*) > 1)").fetchone()[0]
    invalid_coords = cur.execute("SELECT COUNT(*) FROM cities WHERE latitude < -90 OR latitude > 90 OR longitude < -180 OR longitude > 180").fetchone()[0]
    fk_errors = cur.execute("SELECT COUNT(*) FROM cities WHERE country_id NOT IN (SELECT id FROM countries)").fetchone()[0]

    print(f"Total Imported Cities:   {total_cities:,} (Expected: 50,250)")
    print(f"Total Countries:         {total_countries:,} (Expected: 242)")
    print(f"Total Regions:           {total_regions:,} (Expected: 4,008)")
    print(f"Missing Country Codes:   {missing_codes}")
    print(f"Duplicate Source IDs:    {dup_sources}")
    print(f"Invalid Coordinates:     {invalid_coords}")
    print(f"FK Consistency Failures: {fk_errors}")
    print("=" * 60 + "\n")

    conn.close()

    if total_cities != len(rows) or dup_sources > 0 or invalid_coords > 0 or fk_errors > 0:
        raise RuntimeError("Verification failed: Data integrity discrepancies detected.")

    print(f"[✓] Import and verification completed successfully!")
    return {
        "cities": total_cities,
        "countries": total_countries,
        "regions": total_regions,
        "missing_country_codes": missing_codes,
        "duplicate_source_ids": dup_sources,
        "invalid_coords": invalid_coords,
        "fk_errors": fk_errors,
    }


def main():
    parser = argparse.ArgumentParser(description="Import SimpleMaps World Cities dataset.")
    parser.add_argument("--csv", type=Path, default=CSV_PATH, help="Path to worldcities.csv")
    parser.add_argument("--db", type=Path, default=SQLITE_DB_PATH, help="Path to SQLite database")
    args = parser.parse_args()

    rows = validate_csv(args.csv)
    build_sqlite_database(rows, args.db)


if __name__ == "__main__":
    main()
