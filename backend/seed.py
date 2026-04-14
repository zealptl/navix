"""
Seed script: downloads HYG v3 stellar catalog, builds Postgres database.
Run once after provisioning Supabase: python seed.py
Requires DATABASE_URL in environment (or .env file).
"""
import csv
import math
import os
import sys
import gzip
import shutil
import subprocess
import ssl
import urllib.request

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CSV_GZ_PATH = os.path.join(DATA_DIR, "hyg_v38.csv.gz")
CSV_PATH = os.path.join(DATA_DIR, "hyg_v38.csv")

HYG_URL = "https://raw.githubusercontent.com/astronexus/HYG-Database/master/hyg/v3/hyg_v38.csv.gz"


def log(msg):
    print(msg, flush=True)


# ---------------------------------------------------------------------------
# Famous stars
# ---------------------------------------------------------------------------
FAMOUS_STARS = [
    {
        "names": ["proxima centauri", "proxima"],
        "display_name": "Proxima Centauri",
        "rank": 1,
        "blurb": "Our nearest stellar neighbor at 4.24 ly; hosts at least one rocky planet (Proxima b) in its habitable zone.",
    },
    {
        "names": ["rigil kentaurus", "alpha centauri", "toliman"],
        "display_name": "Alpha Centauri",
        "rank": 2,
        "blurb": "Third-brightest star in the sky; a triple system with Proxima forming our nearest stellar neighborhood at 4.37 ly.",
    },
    {
        "names": ["barnard's star", "barnard"],
        "display_name": "Barnard's Star",
        "rank": 3,
        "blurb": "The fastest-moving star in the night sky; a dim red dwarf just 5.96 ly away.",
    },
    {
        "names": ["sirius"],
        "display_name": "Sirius",
        "rank": 4,
        "blurb": "The brightest star in Earth's night sky; a white main-sequence star with a white dwarf companion at 8.6 ly.",
    },
    {
        "names": ["ran", "epsilon eridani"],
        "display_name": "Epsilon Eridani",
        "rank": 5,
        "blurb": "One of the nearest sun-like stars at 10.5 ly; hosts a confirmed gas giant and a prominent dust disk.",
    },
    {
        "names": ["tau ceti", "52tau cet"],
        "display_name": "Tau Ceti",
        "rank": 6,
        "blurb": "The destination in Project Hail Mary; a sun-like star 11.9 ly away with several candidate planets.",
    },
    {
        "names": ["vega"],
        "display_name": "Vega",
        "rank": 8,
        "blurb": "Second-brightest star in the northern sky; a rapidly rotating A-type star 25 ly away used as a photometric standard.",
    },
    {
        "names": ["fomalhaut"],
        "display_name": "Fomalhaut",
        "rank": 9,
        "blurb": "A young A-type star 25 ly away with a bright debris ring and a directly imaged planet candidate.",
    },
    {
        "names": ["polaris", "north star"],
        "display_name": "Polaris",
        "rank": 10,
        "blurb": "The current north pole star; a pulsating Cepheid variable supergiant ~433 ly away.",
    },
    {
        "names": ["betelgeuse"],
        "display_name": "Betelgeuse",
        "rank": 11,
        "blurb": "A red supergiant in Orion's shoulder ~700 ly away, expected to explode as a supernova within 100,000 years.",
    },
    {
        "names": ["rigel"],
        "display_name": "Rigel",
        "rank": 12,
        "blurb": "Orion's brightest star; a blue-white supergiant shining with ~100,000 solar luminosities at ~860 ly.",
    },
    {
        "names": ["deneb"],
        "display_name": "Deneb",
        "rank": 13,
        "blurb": "One of the most luminous stars known; anchors the Northern Cross in Cygnus at roughly 2,600 ly.",
    },
    {
        "names": ["aldebaran"],
        "display_name": "Aldebaran",
        "rank": 14,
        "blurb": "The red giant eye of Taurus and one of the brightest stars; a K-type giant 65 ly away.",
    },
    {
        "names": ["arcturus"],
        "display_name": "Arcturus",
        "rank": 15,
        "blurb": "Brightest star in the northern celestial hemisphere; an orange giant 37 ly away and one of the first stars with a measured proper motion.",
    },
    {
        "names": ["spica"],
        "display_name": "Spica",
        "rank": 16,
        "blurb": "Brightest star in Virgo; a close binary with two blue-white stars orbiting every 4 days, 250 ly away.",
    },
]

MANUAL_STARS = [
    {
        "proper_name": "TRAPPIST-1",
        "bayer_name": "2MASS J23062928-0502285",
        "x": 12.07,
        "y": -2.82,
        "z": -1.09,
        "spectral_type": "M8V",
        "magnitude": 18.8,
        "abs_magnitude": 19.0,
        "is_famous": True,
        "famous_rank": 7,
        "blurb": "An ultracool red dwarf 40 ly away with seven Earth-sized planets, three of them in the habitable zone.",
    },
    {
        "proper_name": "Kepler-452",
        "bayer_name": None,
        "x": 135.1,
        "y": -276.8,
        "z": 300.1,
        "spectral_type": "G2V",
        "magnitude": 13.7,
        "abs_magnitude": 5.0,
        "is_famous": True,
        "famous_rank": 17,
        "blurb": "A solar twin 1,400 ly away hosting Kepler-452b—a super-Earth nicknamed 'Earth's Cousin' in the habitable zone.",
    },
    {
        "proper_name": "Sagittarius A*",
        "bayer_name": None,
        "x": -451.5,
        "y": -7087.7,
        "z": -3939.3,
        "spectral_type": None,
        "magnitude": None,
        "abs_magnitude": None,
        "is_famous": True,
        "famous_rank": 18,
        "blurb": "The supermassive black hole at the heart of the Milky Way; 4 million solar masses, ~26,000 ly from Earth.",
    },
]


def download_csv() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(CSV_PATH):
        log(f"HYG CSV already present at {CSV_PATH}")
        return

    log(f"Downloading HYG v38 catalog from {HYG_URL} …")
    result = subprocess.run(
        ["curl", "-fsSL", HYG_URL, "-o", CSV_GZ_PATH], capture_output=True
    )
    if result.returncode != 0:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(HYG_URL, context=ctx) as resp, open(CSV_GZ_PATH, "wb") as f:
            f.write(resp.read())

    log("Decompressing …")
    with gzip.open(CSV_GZ_PATH, "rb") as gz_in, open(CSV_PATH, "wb") as csv_out:
        shutil.copyfileobj(gz_in, csv_out)
    log(f"CSV ready at {CSV_PATH}")


def build_database() -> None:
    database_url = os.environ["DATABASE_URL"]
    log(f"Connecting to database …")
    con = psycopg2.connect(database_url)
    cur = con.cursor()
    log("Connected.")

    # -----------------------------------------------------------------------
    # Create stars table (Postgres DDL)
    # -----------------------------------------------------------------------
    log("Creating schema …")
    cur.execute("DROP TABLE IF EXISTS stars")
    cur.execute("""
        CREATE TABLE stars (
            id            SERIAL PRIMARY KEY,
            hyg_id        INTEGER,
            hip           INTEGER,
            proper_name   TEXT,
            bayer_name    TEXT,
            x             DOUBLE PRECISION NOT NULL,
            y             DOUBLE PRECISION NOT NULL,
            z             DOUBLE PRECISION NOT NULL,
            distance_pc   DOUBLE PRECISION NOT NULL,
            distance_ly   DOUBLE PRECISION NOT NULL,
            spectral_type TEXT,
            magnitude     DOUBLE PRECISION,
            abs_magnitude DOUBLE PRECISION,
            is_famous     INTEGER NOT NULL DEFAULT 0,
            famous_rank   INTEGER,
            blurb         TEXT
        )
    """)
    cur.execute("CREATE INDEX idx_distance_ly ON stars (distance_ly)")
    cur.execute("CREATE INDEX idx_is_famous ON stars (is_famous)")
    cur.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    cur.execute("""
        CREATE INDEX idx_stars_name_trgm ON stars
        USING GIN (lower(coalesce(proper_name, '')) gin_trgm_ops,
                   lower(coalesce(bayer_name, '')) gin_trgm_ops)
    """)
    con.commit()
    log("Schema created.")

    # -----------------------------------------------------------------------
    # Parse HYG CSV and bulk-insert
    # -----------------------------------------------------------------------
    log("Parsing HYG CSV …")
    batch = []
    BATCH_SIZE = 5000
    parsed = 0
    total = 0

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                x = float(row["x"]) if row.get("x") else 0.0
                y = float(row["y"]) if row.get("y") else 0.0
                z = float(row["z"]) if row.get("z") else 0.0
            except ValueError:
                x = y = z = 0.0

            distance_pc = math.sqrt(x * x + y * y + z * z)
            distance_ly = distance_pc * 3.26156

            proper = row.get("proper", "").strip() or None
            bayer = row.get("bf", "").strip() or row.get("bayer", "").strip() or None

            try:
                mag = float(row["mag"]) if row.get("mag") else None
            except ValueError:
                mag = None
            try:
                absmag = float(row["absmag"]) if row.get("absmag") else None
            except ValueError:
                absmag = None
            try:
                hyg_id = int(row["id"]) if row.get("id") else None
            except ValueError:
                hyg_id = None
            try:
                hip = int(row["hip"]) if row.get("hip") else None
            except ValueError:
                hip = None

            spect = row.get("spect", "").strip() or None

            batch.append((
                hyg_id, hip, proper, bayer,
                x, y, z, distance_pc, distance_ly,
                spect, mag, absmag,
                0, None, None,
            ))

            parsed += 1
            if parsed % 10000 == 0:
                log(f"  Parsed {parsed} rows …")

            if len(batch) >= BATCH_SIZE:
                try:
                    execute_values(
                        cur,
                        "INSERT INTO stars (hyg_id,hip,proper_name,bayer_name,x,y,z,distance_pc,distance_ly,"
                        "spectral_type,magnitude,abs_magnitude,is_famous,famous_rank,blurb) VALUES %s",
                        batch,
                    )
                    con.commit()
                    total += len(batch)
                    log(f"  Inserted {total} stars …")
                except Exception as e:
                    log(f"  ERROR inserting batch at total={total}: {e}")
                    con.rollback()
                    raise
                finally:
                    batch = []

    if batch:
        try:
            execute_values(
                cur,
                "INSERT INTO stars (hyg_id,hip,proper_name,bayer_name,x,y,z,distance_pc,distance_ly,"
                "spectral_type,magnitude,abs_magnitude,is_famous,famous_rank,blurb) VALUES %s",
                batch,
            )
            con.commit()
            total += len(batch)
        except Exception as e:
            log(f"  ERROR inserting final batch: {e}")
            con.rollback()
            raise

    log(f"Inserted {total} stars from HYG catalog.")

    # -----------------------------------------------------------------------
    # Insert manual stars (not in HYG)
    # -----------------------------------------------------------------------
    for s in MANUAL_STARS:
        x, y, z = s["x"], s["y"], s["z"]
        distance_pc = math.sqrt(x * x + y * y + z * z)
        distance_ly = distance_pc * 3.26156
        try:
            cur.execute(
                "INSERT INTO stars (hyg_id,hip,proper_name,bayer_name,x,y,z,distance_pc,distance_ly,"
                "spectral_type,magnitude,abs_magnitude,is_famous,famous_rank,blurb) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (
                    None, None, s["proper_name"], s["bayer_name"],
                    x, y, z, distance_pc, distance_ly,
                    s["spectral_type"], s["magnitude"], s["abs_magnitude"],
                    1 if s["is_famous"] else 0, s["famous_rank"], s["blurb"],
                ),
            )
            log(f"  Inserted manual star: {s['proper_name']}")
        except Exception as e:
            log(f"  ERROR inserting manual star {s['proper_name']}: {e}")
            con.rollback()
            raise
    con.commit()
    log(f"Inserted {len(MANUAL_STARS)} manual stars.")

    # -----------------------------------------------------------------------
    # Mark famous stars from HYG with ranks and blurbs
    # -----------------------------------------------------------------------
    log("Marking famous stars …")
    for entry in FAMOUS_STARS:
        names = [n.lower() for n in entry["names"]]
        placeholders = ",".join(["%s"] * len(names))
        cur.execute(
            f"SELECT id FROM stars WHERE lower(proper_name) IN ({placeholders}) "
            f"OR lower(bayer_name) IN ({placeholders}) "
            "ORDER BY distance_ly LIMIT 1",
            names * 2,
        )
        row = cur.fetchone()
        if row:
            cur.execute(
                "UPDATE stars SET is_famous=1, famous_rank=%s, blurb=%s, "
                "proper_name=coalesce(proper_name, %s) WHERE id=%s",
                (entry["rank"], entry["blurb"], entry["display_name"], row[0]),
            )
        else:
            log(f"  WARNING: famous star not found in HYG: {entry['names']}")
    con.commit()

    cur.close()
    con.close()
    log("Database seeded successfully.")


if __name__ == "__main__":
    download_csv()
    build_database()
