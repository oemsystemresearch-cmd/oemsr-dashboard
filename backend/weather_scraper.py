"""
OEMO Weather Data Scraper
=========================
Fetches hourly temperature for 10 Omani cities from the Open-Meteo API
(free, no API key required) and stores results in the weather_data table
of oemo_market.db alongside the market data.

Usage:
    # Full historical pull from market data start date:
    python3 weather_scraper.py --mode full --start 2022-01-01

    # Daily update (resumes from last stored timestamp per city):
    python3 weather_scraper.py --mode update

    # Custom date range:
    python3 weather_scraper.py --mode custom --start 2025-01-01 --end 2025-06-01

Requirements:
    pip3 install requests
    (no other dependencies — uses only the standard library otherwise)
"""

import requests
import sqlite3
import os
import time
import argparse
from datetime import date, timedelta

# ── Configuration ─────────────────────────────────────────────────────────────

DB_PATH = os.getenv(
    "DB_PATH",
    os.path.expanduser("~/Desktop/Oman_Project/oemo_data/oemo_market.db")
)

# Open-Meteo archive API covers data up to ~5 days ago (ERA5 reanalysis).
# The forecast API fills in the recent gap using its past_days parameter.
ARCHIVE_URL  = "https://archive-api.open-meteo.com/v1/archive"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# Days before today where archive data is reliably available.
# We use 7 as a conservative buffer (actual lag is ~5 days).
ARCHIVE_LAG_DAYS = 7

CITIES = [
    {"city": "Muscat",   "region": "Capital",             "system": "MIS", "lat": 23.5880, "lon": 58.3829},
    {"city": "Sohar",    "region": "Al Batinah North",    "system": "MIS", "lat": 24.3473, "lon": 56.7459},
    {"city": "Nizwa",    "region": "Ad Dakhiliyah",       "system": "MIS", "lat": 22.9333, "lon": 57.5333},
    {"city": "Sur",      "region": "Ash Sharqiyah South", "system": "MIS", "lat": 22.5667, "lon": 59.5289},
    {"city": "Ibri",     "region": "Ad Dhahirah",         "system": "MIS", "lat": 23.2256, "lon": 56.5138},
    {"city": "Duqm",     "region": "Al Wusta",            "system": "MIS", "lat": 19.6500, "lon": 57.7000},
    {"city": "Buraymi",  "region": "Al Buraymi",          "system": "MIS", "lat": 24.2333, "lon": 55.7833},
    {"city": "Salalah",  "region": "Dhofar",              "system": "DTS", "lat": 17.0151, "lon": 54.0924},
    {"city": "Thumrait", "region": "Dhofar",              "system": "DTS", "lat": 17.6660, "lon": 54.0460},
    {"city": "Marmul",   "region": "Dhofar",              "system": "DTS", "lat": 18.2747, "lon": 55.1811},
]

SCHEMA = """
CREATE TABLE IF NOT EXISTS weather_data (
    city          TEXT,
    region        TEXT,
    system        TEXT,
    lat           REAL,
    lon           REAL,
    timestamp     TEXT,
    temperature_c REAL,
    UNIQUE(city, timestamp)
)
"""

# ── Database ──────────────────────────────────────────────────────────────────

def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute(SCHEMA)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_weather_city    ON weather_data(city)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_weather_ts      ON weather_data(timestamp)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_weather_city_ts ON weather_data(city, timestamp)")
    conn.commit()
    return conn


def get_last_historical_timestamp(conn: sqlite3.Connection, city: str) -> str | None:
    """Return the latest stored timestamp that is not in the future.
    Ignores any forecast rows already stored ahead of today, so the
    historical resume point is always based on actual/archive data."""
    today_end = f"{date.today().isoformat()}T23:59"
    row = conn.execute(
        "SELECT MAX(timestamp) FROM weather_data WHERE city = ? AND timestamp <= ?",
        (city, today_end)
    ).fetchone()
    return row[0] if row and row[0] else None


def save_rows(rows: list[dict], conn: sqlite3.Connection) -> int:
    """Write rows, replacing any existing row for the same (city, timestamp).
    Returns total rows written. Using REPLACE ensures:
    - Forecast rows are refreshed daily with the latest prediction
    - Archive (actual) data overwrites old forecast values as they become available
    """
    conn.executemany("""
        INSERT OR REPLACE INTO weather_data
            (city, region, system, lat, lon, timestamp, temperature_c)
        VALUES
            (:city, :region, :system, :lat, :lon, :timestamp, :temperature_c)
    """, rows)
    conn.commit()
    return len(rows)


# ── Fetching ──────────────────────────────────────────────────────────────────

def fetch_archive(city_info: dict, start: date, end: date) -> list[dict]:
    """Fetch from the ERA5 archive API (reliable for dates > ~5 days ago)."""
    params = {
        "latitude":   city_info["lat"],
        "longitude":  city_info["lon"],
        "start_date": start.isoformat(),
        "end_date":   end.isoformat(),
        "hourly":     "temperature_2m",
        "timezone":   "Asia/Muscat",
    }
    resp = requests.get(ARCHIVE_URL, params=params, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    return _parse_response(data, city_info)


def fetch_forecast(city_info: dict, past_days: int = 7) -> list[dict]:
    """Fetch from the forecast API: last past_days of actual + 7 days ahead.
    The 7-day forward window is what powers the dashboard temperature map,
    including the today/tomorrow toggle."""
    params = {
        "latitude":      city_info["lat"],
        "longitude":     city_info["lon"],
        "hourly":        "temperature_2m",
        "past_days":     past_days,
        "forecast_days": 7,
        "timezone":      "Asia/Muscat",
    }
    resp = requests.get(FORECAST_URL, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return _parse_response(data, city_info)


def _parse_response(data: dict, city_info: dict) -> list[dict]:
    """Convert Open-Meteo JSON response into a list of row dicts."""
    times = data["hourly"]["time"]
    temps = data["hourly"]["temperature_2m"]
    rows = []
    for ts, temp in zip(times, temps):
        if temp is not None:
            rows.append({
                "city":          city_info["city"],
                "region":        city_info["region"],
                "system":        city_info["system"],
                "lat":           city_info["lat"],
                "lon":           city_info["lon"],
                "timestamp":     ts,   # already YYYY-MM-DDTHH:MM from Open-Meteo
                "temperature_c": temp,
            })
    return rows


def fetch_city(city_info: dict, historical_start: date,
               historical_end: date | None = None) -> list[dict]:
    """
    Fetch temperature data for one city.

    Always does two things:
    1. Archive pull: historical data from historical_start up to the archive cutoff
       (or historical_end if provided, whichever is earlier).
    2. Forecast pull: always fetches the last ARCHIVE_LAG_DAYS days + next 7 days.
       This fills the archive gap AND stores tomorrow's forecast for the dashboard.
    """
    cutoff = date.today() - timedelta(days=ARCHIVE_LAG_DAYS)
    archive_end = min(historical_end, cutoff) if historical_end else cutoff
    rows = []

    if historical_start <= archive_end:
        rows += fetch_archive(city_info, historical_start, archive_end)

    # Always fetch the forecast window — this is unconditional so that
    # every run refreshes the 7-day ahead data for the dashboard toggle.
    rows += fetch_forecast(city_info, past_days=ARCHIVE_LAG_DAYS)

    return rows


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="OEMO Weather Data Scraper")
    parser.add_argument(
        "--mode", choices=["full", "update", "custom"], default="update",
        help="full=all history from --start, update=resume per city, custom=manual range"
    )
    parser.add_argument("--start", type=date.fromisoformat,
                        help="Start date YYYY-MM-DD (required for full/custom)")
    parser.add_argument("--end", type=date.fromisoformat,
                        default=date.today(),
                        help="End date YYYY-MM-DD (default: today)")
    args = parser.parse_args()

    if not os.path.exists(DB_PATH):
        print(f"\n❌ Database not found at {DB_PATH}")
        print("   Run oemo_scraper.py first to create the database.\n")
        return

    conn = get_db()
    total_new = 0

    print(f"\n{'='*60}")
    print(f"  OEMO Weather Scraper  —  mode: {args.mode}")
    print(f"  Source: Open-Meteo (ERA5 archive + forecast)")
    print(f"  Timezone: Asia/Muscat (UTC+4)")
    print(f"  Cities: {len(CITIES)}")
    print(f"{'='*60}\n")

    for city_info in CITIES:
        city = city_info["city"]

        if args.mode == "full":
            historical_start = args.start or date(2022, 1, 1)
        elif args.mode == "update":
            last = get_last_historical_timestamp(conn, city)
            if last:
                historical_start = date.fromisoformat(last[:10]) + timedelta(days=1)
            else:
                historical_start = date.today() - timedelta(days=30)
        else:  # custom
            historical_start = args.start or date(2022, 1, 1)

        print(f"  {city:<12} history from {historical_start} + 7-day forecast ... ", end="", flush=True)

        historical_end = args.end if args.mode == "custom" else None

        try:
            rows = fetch_city(city_info, historical_start, historical_end)
            written = save_rows(rows, conn)
            total_new += written
            print(f"{written:>6} rows written")
        except requests.RequestException as e:
            print(f"FAILED — {e}")

        time.sleep(0.5)

    conn.close()
    print(f"\n{'='*60}")
    print(f"  Done!  +{total_new:,} new weather rows added.")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
