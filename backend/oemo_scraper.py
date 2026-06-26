"""
Oman Electricity Market Operator (OEMO) - Market Data Scraper
=============================================================
Scrapes market data from https://www.oemo.om and appends only NEW rows
to existing CSVs and the SQLite database.

Usage:
    # Step 1 — run once to migrate the old DB to the new schema:
    python3 oemo_scraper.py --migrate

    # Step 2 — re-scrape the three Market Schedule types from 2022:
    python3 oemo_scraper.py --mode full --start 2022-01-01 --types MSEAMR_MSCH MSEPCMR_MSCH MSEPIMR_MSCH

    # Daily update (fetches only new data for all types):
    python3 oemo_scraper.py --mode update

    # Full historical pull for all types:
    python3 oemo_scraper.py --mode full --start 2022-01-01

    # Custom date range:
    python3 oemo_scraper.py --mode custom --start 2025-01-01 --end 2025-06-01

Requirements:
    pip3 install requests beautifulsoup4 pandas python-dateutil
"""

import requests
import pandas as pd
from bs4 import BeautifulSoup
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
import sqlite3
import time
import os
import glob
import shutil
import argparse
import httpx

# ── Configuration ─────────────────────────────────────────────────────────────

OUTPUT_DIR      = os.path.expanduser("~/Desktop/Oman_Project/oemo_data")
DB_NAME         = "oemo_market.db"

# On Railway, DB_PATH env var points to the persistent volume.
# Locally it falls back to the OUTPUT_DIR/DB_NAME path above.
_ENV_DB_PATH = os.getenv("DB_PATH")
DELAY_SEC       = 1.0
EMPTY_DELAY_SEC = 0.2

BASE_URL = "https://www.oemo.om/market-information/market-information/market-data/"

DATA_TYPES = {
    "MSCC":          "Monthly Scarcity Credit Cap",
    "RELPRICE":      "Reliability Price",
    "EFP":           "Economic Fuel Price",
    "MSEPCMR_ZSMP":  "Ex-Post Confirmed System Marginal Price",
    "MSPEAMR_SP":    "Ex-Ante Scarcity Price",
    "MSPEPCMR_SP":   "Ex-Post Confirmed Scarcity Price",
    "MSPEPCMR_APP":  "Ex-Post Confirmed Aggregate Pool Price",
    "MSPEPIMR_APP":  "Ex-Post Indicative Aggregate Pool Price",
    "MSPEPIMR_SP":   "Ex-Post Indicative Scarcity Price",
    "MSEPIMR_ZSMP":  "Ex-Post Indicative System Marginal Price",
    "MSEAMR_ZSMP":   "Ex-Ante System Marginal Price",
    "MSPEAMR_APP":   "Ex-Ante Aggregate Pool Price",
    "WEATHER_FC":    "Temperature Data",
    "MSEAMR_MSCH":   "Ex-Ante Market Schedule",
    "MSEPIMR_MSCH":  "Ex-Post Indicative Market Schedule",
    "MSEPCMR_MSCH":  "Ex-Post Confirmed Market Schedule",
    "MSPEAMR_EASF":  "Ex-Ante Scarcity Factor",
    "MSPEPIMR_EPSF": "Ex-Post Indicative Scarcity Factor",
    "MSPEPCMR_EPSF": "Ex-Post Confirm Scarcity Factor",
    "MSPEAMR_MAR":   "Ex-Ante Margin",
    "MSPEPIMR_MAR":  "Ex-Post Indicative Margin",
    "MSPEPCMR_MAR":  "Ex-Post Confirm Margin",
}

# The three Market Schedule types that carry per-participant rows
MSCH_TYPES = {"MSEAMR_MSCH", "MSEPIMR_MSCH", "MSEPCMR_MSCH"}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/124.0.0.0 Safari/537.36",
    "Referer": BASE_URL,
}

# Participant column added; UNIQUE constraint now includes it so each
# (type, date, period, participant) combination is deduplicated correctly.
SCHEMA = """
CREATE TABLE IF NOT EXISTS market_data (
    Name          TEXT,
    Value         REAL,
    TradingPeriod TEXT,
    DateFrom      TEXT,
    DateTo        TEXT,
    ExtraField    TEXT,
    DataTypeCode  TEXT,
    DataTypeName  TEXT,
    ScrapedDate   TEXT,
    Participant   TEXT,
    UNIQUE(DataTypeCode, DateFrom, TradingPeriod, Name, ExtraField, Participant)
)
"""

NOTICES_SCHEMA = """
CREATE TABLE IF NOT EXISTS notices (
    category_key TEXT,
    category     TEXT,
    title        TEXT,
    date         TEXT,
    pdf_url      TEXT,
    scraped_date TEXT,
    UNIQUE(category_key, title)
)
"""

NEWS_SCHEMA = """
CREATE TABLE IF NOT EXISTS news_articles (
    title        TEXT,
    url          TEXT UNIQUE,
    date         TEXT,
    excerpt      TEXT,
    scraped_date TEXT
)
"""

OEMO_BASE        = "https://www.oemo.om"
NOTICE_PATHS: dict[str, tuple[str, str]] = {
    "withdrawal":         ("Withdrawal",           "/market-information/market-notices/withdrawal-notices/"),
    "exclusion":          ("Exclusion",             "/market-information/market-notices/exclusion-notices/"),
    "termination":        ("Termination",           "/market-information/market-notices/termination-notices/"),
    "rectification":      ("Rectification",         "/market-information/market-notices/rectification-notices/"),
    "suspension":         ("Suspension",            "/market-information/market-notices/suspension-notices/"),
    "withdrawal-consent": ("Withdrawal Consent",    "/market-information/market-notices/withdrawal-consent-notices/"),
    "market-review":      ("Market Review Report",  "/market-information/market-reports/market-review-reports/"),
    "annual-report":      ("Annual Report",         "/market-information/market-reports/annual-reports/"),
}
OEMO_NEWS_URL = "https://www.oemo.om/media-center/news-articles/"
SCRAPER_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; OEMSDashboard/1.0)"}


# ── Notices scraping ──────────────────────────────────────────────────────────

def _scrape_notice_category(key: str, label: str, path: str, client: httpx.Client) -> list[dict]:
    try:
        resp = client.get(OEMO_BASE + path)
        resp.raise_for_status()
    except Exception:
        return []
    soup = BeautifulSoup(resp.text, "html.parser")
    results = []
    for div in soup.select("div.review-content"):
        date_el  = div.find("span", class_="publishdate")
        title_el = div.find("h4")
        if not title_el:
            continue
        # Link may be inside the div, in a sibling (div.review-icon for annual reports),
        # or the entire card is wrapped in an <a> several levels up (market review page).
        link_el = div.find("a", href=True)
        if not link_el:
            node = div.parent
            for _ in range(6):
                if node is None:
                    break
                if node.name == "a" and node.get("href"):
                    link_el = node
                    break
                found = node.find("a", href=True)
                if found:
                    link_el = found
                    break
                node = node.parent
        href = link_el["href"] if link_el else None
        pdf_url = (OEMO_BASE + href) if href and href.startswith("/") else href
        results.append({
            "category_key": key,
            "category":     label,
            "title":        title_el.get_text(strip=True),
            "date":         date_el.get_text(strip=True) if date_el else None,
            "pdf_url":      pdf_url,
            "scraped_date": date.today().isoformat(),
        })
    return results


def scrape_and_save_notices(conn: sqlite3.Connection) -> int:
    conn.execute(NOTICES_SCHEMA)
    conn.commit()
    all_notices: list[dict] = []
    with httpx.Client(timeout=30.0, follow_redirects=True, headers=SCRAPER_HEADERS) as client:
        for key, (label, path) in NOTICE_PATHS.items():
            all_notices.extend(_scrape_notice_category(key, label, path, client))
    if not all_notices:
        return 0
    cursor = conn.cursor()
    inserted = 0
    for n in all_notices:
        cursor.execute(
            """
            INSERT INTO notices (category_key, category, title, date, pdf_url, scraped_date)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(category_key, title) DO UPDATE SET
                date         = excluded.date,
                pdf_url      = excluded.pdf_url,
                scraped_date = excluded.scraped_date
            """,
            (n["category_key"], n["category"], n["title"], n["date"], n["pdf_url"], n["scraped_date"]),
        )
        if cursor.rowcount:
            inserted += 1
    conn.commit()
    return inserted


# ── News scraping ─────────────────────────────────────────────────────────────

def scrape_and_save_news(conn: sqlite3.Connection) -> int:
    conn.execute(NEWS_SCHEMA)
    conn.commit()
    try:
        with httpx.Client(timeout=150.0, follow_redirects=True, headers=SCRAPER_HEADERS) as client:
            resp = client.get(OEMO_NEWS_URL)
            resp.raise_for_status()
    except Exception as e:
        print(f"    ⚠️  News fetch failed: {e}")
        return 0
    soup = BeautifulSoup(resp.text, "html.parser")
    articles = []
    for el in soup.select("div.newsbox-content")[:8]:
        title_el   = el.find("h5")
        link_el    = el.find("a", class_="news-link")
        date_el    = el.find("span")
        excerpt_el = el.find("p")
        title = title_el.get_text(strip=True) if title_el else None
        if not title:
            continue
        href    = link_el["href"] if link_el else OEMO_NEWS_URL
        if href and not href.startswith("http"):
            href = OEMO_BASE + href
        articles.append({
            "title":        title,
            "url":          href,
            "date":         date_el.get_text(strip=True) if date_el else None,
            "excerpt":      excerpt_el.get_text(strip=True)[:180] if excerpt_el else None,
            "scraped_date": date.today().isoformat(),
        })
    if not articles:
        return 0
    cursor = conn.cursor()
    inserted = 0
    for a in articles:
        cursor.execute(
            """
            INSERT INTO news_articles (title, url, date, excerpt, scraped_date)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(url) DO UPDATE SET
                title        = excluded.title,
                date         = excluded.date,
                excerpt      = excluded.excerpt,
                scraped_date = excluded.scraped_date
            """,
            (a["title"], a["url"], a["date"], a["excerpt"], a["scraped_date"]),
        )
        if cursor.rowcount:
            inserted += 1
    conn.commit()
    return inserted


# ── Date range helpers ────────────────────────────────────────────────────────

def date_chunks(start: date, end: date):
    """Split a date range into monthly chunks."""
    cursor = start
    while cursor < end:
        chunk_end = min(cursor + relativedelta(months=1) - timedelta(days=1), end)
        yield cursor, chunk_end
        cursor = chunk_end + timedelta(days=1)


def get_start_date(mode: str, code: str, conn: sqlite3.Connection,
                   manual_start: date | None) -> date:
    if mode == "full":
        return manual_start or date(2024, 1, 1)

    if mode == "update":
        cursor = conn.cursor()
        cursor.execute(
            "SELECT MAX(DateFrom) FROM market_data WHERE DataTypeCode = ?", (code,)
        )
        row = cursor.fetchone()
        if row and row[0]:
            last = date.fromisoformat(row[0])
            return last + timedelta(days=1)
        return date.today() - timedelta(days=7)

    if mode == "custom":
        return manual_start or date(2024, 1, 1)

    return date(2024, 1, 1)


# ── Data fetching ─────────────────────────────────────────────────────────────

def fetch_table(data_type: str, from_date: date, to_date: date) -> pd.DataFrame | None:
    payload = {
        "DataTypeSelect": data_type,
        "ScheduleDate":   from_date.strftime("%d/%m/%Y"),
        "ScheduleToDate": to_date.strftime("%d/%m/%Y"),
    }
    try:
        resp = requests.post(BASE_URL, data=payload, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"    ⚠️  Request failed: {e}")
        return None

    soup = BeautifulSoup(resp.text, "html.parser")
    table = soup.find("table", {"id": "basic-datatables2"})
    if not table:
        return None

    headers = [th.get_text(strip=True) for th in table.select("thead th")]
    if not headers:
        return None

    rows = []
    for tr in table.select("tbody tr"):
        cells = [td.get_text(strip=True) for td in tr.find_all("td")]
        if cells and cells != ["No data available in table"]:
            rows.append(cells)

    return pd.DataFrame(rows, columns=headers) if rows else None


# ── Normalization ─────────────────────────────────────────────────────────────

def fix_trading_period(val) -> str | None:
    """
    Normalizes TradingPeriod to HH.MM format.
    Handles float strings (0.3 → 00.30), D+1 suffixes, already-correct strings,
    and the out-of-range 24.xx–26.xx periods (next-day schedule slots stored as-is).
    """
    if pd.isna(val):
        return None
    s = str(val).strip()

    for suffix in [" D + 1", " D+1", " d + 1", " d+1"]:
        if s.endswith(suffix):
            s = s[:-len(suffix)].strip()
            break

    if len(s) >= 4 and "." in s:
        try:
            parts = s.split(".")
            h, m = int(parts[0]), int(parts[1])
            if (0 <= h <= 23 or 24 <= h <= 26) and m in (0, 30):
                return f"{h:02d}.{m:02d}"
        except ValueError:
            pass

    try:
        f = float(s)
        h = int(f)
        m = round((f - h) * 10)
        if (0 <= h <= 23 or 24 <= h <= 26) and m in (0, 3):
            return f"{h:02d}.{m * 10:02d}"
    except (ValueError, TypeError):
        pass

    return s if s not in ("", "nan") else None


def parse_interval(interval_str) -> tuple[str | None, str | None]:
    if pd.isna(interval_str):
        return None, None
    try:
        parts = str(interval_str).split(" - ")
        if len(parts) != 2:
            return str(interval_str).strip(), None
        def to_iso(d):
            d = d.strip()
            for fmt in ("%d/%m/%Y", "%m/%d/%Y", "%d %b %Y", "%Y-%m-%d"):
                try:
                    return pd.to_datetime(d, format=fmt).strftime("%Y-%m-%d")
                except ValueError:
                    continue
            try:
                return pd.to_datetime(d).strftime("%Y-%m-%d")
            except Exception:
                return d
        return to_iso(parts[0]), to_iso(parts[1])
    except Exception:
        return str(interval_str), None


def normalize(df: pd.DataFrame, code: str) -> pd.DataFrame:
    out = pd.DataFrame()
    value_col = next((c for c in df.columns if c.lower().startswith("value")), None)
    out["Value"] = pd.to_numeric(df[value_col], errors="coerce") if value_col else None
    out["Name"]  = df["Name"] if "Name" in df.columns else DATA_TYPES.get(code, code)

    if "Fuel Type" in df.columns:
        out["ExtraField"] = df["Fuel Type"]
    elif "Month" in df.columns:
        out["ExtraField"] = df["Month"]
    else:
        out["ExtraField"] = None

    out["TradingPeriod"] = (
        df["Trading Period"].apply(fix_trading_period)
        if "Trading Period" in df.columns else None
    )

    if "Interval" in df.columns:
        parsed = df["Interval"].apply(parse_interval)
        out["DateFrom"] = parsed.apply(lambda x: x[0])
        out["DateTo"]   = parsed.apply(lambda x: x[1])
    else:
        out["DateFrom"] = None
        out["DateTo"]   = None

    out["DataTypeCode"] = code
    out["DataTypeName"] = DATA_TYPES.get(code, code)
    out["ScrapedDate"]  = date.today().isoformat()

    if code in MSCH_TYPES:
        # The OEMO table interleaves participant header rows (Name = "MP_BARKA3"
        # etc., Value empty) with the 54 data rows for that participant.
        # Walk the Name column, latch onto each MP_ code, and propagate it
        # forward to all subsequent rows until the next participant header.
        current_participant = None
        participant_col = []
        for name in out["Name"]:
            name_str = str(name).strip() if pd.notna(name) else ""
            if name_str.startswith("MP_"):
                current_participant = name_str
            participant_col.append(current_participant)
        out["Participant"] = participant_col
        # Remove header rows — they have no numeric Value
        out = out.dropna(subset=["Value"])
        # Safety: drop any rows that somehow have no participant assigned
        out = out[out["Participant"].notna()]
    else:
        out["Participant"] = None
        out = out.dropna(subset=["Value"], how="all")

    return out.reset_index(drop=True)


# ── EFP label correction ──────────────────────────────────────────────────────
# DATA QUALITY NOTE: The OEMO source CSVs for EFP have historically published
# the Gas and Oil "Fuel Type" labels swapped on some months (confirmed in 2023
# and 2024 data). The rule is: Gas price is always the lower value (~5 OMR/MWh)
# and Oil is always the higher value (~24 OMR/MWh). Any month where the source
# labels are inverted will be silently corrected here so the error cannot be
# re-introduced by a re-scrape. The 9 affected rows were also fixed directly in
# the database on 2026-06-21.
def fix_efp_labels(df: pd.DataFrame) -> pd.DataFrame:
    """For each DateFrom in an EFP dataframe, ensure Gas=lower value, Oil=higher.
    If both values are equal the source published the oil price twice — Gas is set
    to NULL (confirmed: 2023-05-30 had Gas=24.258, Oil=24.258; gas value unknown)."""
    if df.empty:
        return df
    df = df.copy()
    for date_val, group in df.groupby("DateFrom"):
        if len(group) < 2:
            continue
        min_val = group["Value"].min()
        max_val = group["Value"].max()
        if min_val == max_val:
            # Same value published for both fuel types — gas price is unknown
            gas_idx = group.index[group["ExtraField"] == "Gas"].tolist()
            df.loc[gas_idx, "Value"] = None
            continue
        idx_min = group["Value"].idxmin()
        idx_max = group["Value"].idxmax()
        df.loc[idx_min, "ExtraField"] = "Gas"
        df.loc[idx_max, "ExtraField"] = "Oil"
    return df


# ── Persistence ───────────────────────────────────────────────────────────────

def save_to_db(df: pd.DataFrame, conn: sqlite3.Connection) -> int:
    """Insert new rows only. Returns count of rows inserted."""
    df.to_sql("_staging", conn, if_exists="replace", index=False)
    before = conn.execute("SELECT COUNT(*) FROM market_data").fetchone()[0]
    conn.execute("""
        INSERT OR IGNORE INTO market_data
            (Name, Value, TradingPeriod, DateFrom, DateTo,
             ExtraField, DataTypeCode, DataTypeName, ScrapedDate, Participant)
        SELECT Name, Value, TradingPeriod, DateFrom, DateTo,
               ExtraField, DataTypeCode, DataTypeName, ScrapedDate, Participant
        FROM _staging
    """)
    conn.execute("DROP TABLE IF EXISTS _staging")
    conn.commit()
    after = conn.execute("SELECT COUNT(*) FROM market_data").fetchone()[0]
    return after - before


def append_to_csv(df: pd.DataFrame, code: str) -> int:
    """Append only new rows to the CSV. Returns count of rows appended."""
    csv_path = os.path.join(OUTPUT_DIR, f"{code}.csv")
    key_cols = ["DataTypeCode", "DateFrom", "TradingPeriod", "Name", "ExtraField", "Participant"]

    if os.path.exists(csv_path):
        existing = pd.read_csv(csv_path, dtype={"TradingPeriod": str})
        # If the CSV is missing any key column (old schema), overwrite it entirely
        if not all(c in existing.columns for c in key_cols):
            df.to_csv(csv_path, index=False)
            return len(df)
        existing_keys = set(
            map(tuple, existing[key_cols].fillna("").astype(str).values)
        )
        new_rows = df[
            ~df[key_cols].fillna("").astype(str).apply(tuple, axis=1).isin(existing_keys)
        ]
        if not new_rows.empty:
            new_rows.to_csv(csv_path, mode="a", header=False, index=False)
        return len(new_rows)
    else:
        df.to_csv(csv_path, index=False)
        return len(df)


# ── DB Migration ──────────────────────────────────────────────────────────────

def migrate_db(db_path: str):
    """
    Migrate from the old schema (no Participant column) to the new one.

    What it does:
      1. Backs up the old DB as oemo_market_backup.db (your data is safe)
      2. Creates a fresh DB with the new schema
      3. Reloads all non-MSCH CSVs (prices, EFP, MSCC) — these are already clean
      4. Skips the three MSCH CSVs — their data had no participant info, needs re-scrape
      5. Prints the exact command to run next for the MSCH re-scrape
    """
    backup_path = db_path.replace(".db", "_backup.db")

    print(f"\n{'='*60}")
    print(f"  OEMO DB Migration — adding Participant column")
    print(f"{'='*60}\n")

    if os.path.exists(db_path):
        shutil.copy2(db_path, backup_path)
        print(f"  ✅ Backed up old DB → {os.path.basename(backup_path)}")
        os.remove(db_path)

    conn = sqlite3.connect(db_path)
    conn.execute(SCHEMA)
    conn.commit()
    print(f"  ✅ New DB created with Participant column\n")
    print(f"  Loading existing CSVs (MSCH types skipped — need re-scrape):\n")

    csv_files = sorted(glob.glob(os.path.join(OUTPUT_DIR, "*.csv")))
    total_rows = 0

    for csv_path in csv_files:
        code = os.path.splitext(os.path.basename(csv_path))[0]
        if code in MSCH_TYPES:
            print(f"    ⏭  {code:<25} skipped — needs re-scrape")
            continue
        try:
            df = pd.read_csv(csv_path, dtype={"TradingPeriod": str})
            if df.empty:
                print(f"    —  {code:<25} empty")
                continue
            if "TradingPeriod" in df.columns:
                df["TradingPeriod"] = df["TradingPeriod"].apply(fix_trading_period)
            if "Participant" not in df.columns:
                df["Participant"] = None
            df.to_sql("_staging", conn, if_exists="replace", index=False)
            conn.execute("""
                INSERT OR IGNORE INTO market_data
                    (Name, Value, TradingPeriod, DateFrom, DateTo,
                     ExtraField, DataTypeCode, DataTypeName, ScrapedDate, Participant)
                SELECT Name, Value, TradingPeriod, DateFrom, DateTo,
                       ExtraField, DataTypeCode, DataTypeName, ScrapedDate, Participant
                FROM _staging
            """)
            conn.execute("DROP TABLE IF EXISTS _staging")
            conn.commit()
            total_rows += len(df)
            print(f"    ✅ {code:<25} {len(df):>8,} rows")
        except Exception as e:
            print(f"    ❌ {code:<25} ERROR: {e}")

    conn.execute("CREATE INDEX IF NOT EXISTS idx_code ON market_data(DataTypeCode)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_date ON market_data(DateFrom)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_code_date ON market_data(DataTypeCode, DateFrom)")
    conn.commit()
    conn.close()

    print(f"\n  ✅ Migration complete — {total_rows:,} rows loaded from existing CSVs")
    print(f"\n  ─────────────────────────────────────────────────────")
    print(f"  Next: re-scrape all three Market Schedule types.")
    print(f"  This will take several hours. Run:\n")
    print(f"  python3 oemo_scraper.py --mode full --start 2022-01-01 --types MSEAMR_MSCH MSEPCMR_MSCH MSEPIMR_MSCH")
    print(f"\n  ─────────────────────────────────────────────────────")
    print(f"{'='*60}\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="OEMO Market Data Scraper")
    parser.add_argument(
        "--mode", choices=["full", "update", "custom"], default="update",
        help="full=all history, update=since last DB entry, custom=manual range"
    )
    parser.add_argument("--start", type=date.fromisoformat,
                        help="Start date YYYY-MM-DD (required for full/custom)")
    parser.add_argument("--end",   type=date.fromisoformat,
                        default=date.today(),
                        help="End date YYYY-MM-DD (default: today)")
    parser.add_argument("--types", nargs="+",
                        help="Only scrape these DataTypeCodes, e.g. --types MSEAMR_MSCH MSEPIMR_MSCH")
    parser.add_argument("--migrate", action="store_true",
                        help="Migrate old DB (no Participant column) to new schema")
    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    db_path = _ENV_DB_PATH or os.path.join(OUTPUT_DIR, DB_NAME)

    if args.migrate:
        migrate_db(db_path)
        return

    conn = sqlite3.connect(db_path)
    conn.execute(SCHEMA)
    conn.commit()

    # Guard: catch old DB that is missing the Participant column
    cols = [r[1] for r in conn.execute("PRAGMA table_info(market_data)").fetchall()]
    if "Participant" not in cols:
        print("\n⚠️  Your database uses the old schema (no Participant column).")
        print("   Run this first:  python3 oemo_scraper.py --migrate")
        print("   Then re-scrape MSCH types as instructed. Exiting.\n")
        conn.close()
        return

    # Filter to requested types if --types was given
    if args.types:
        unknown = [t for t in args.types if t not in DATA_TYPES]
        if unknown:
            print(f"  ⚠️  Unknown type codes: {unknown}")
        types_to_scrape = {k: v for k, v in DATA_TYPES.items() if k in args.types}
    else:
        types_to_scrape = DATA_TYPES

    end_date = args.end
    total_new_rows = 0

    print(f"\n{'='*60}")
    print(f"  OEMO Market Data Scraper  —  mode: {args.mode}")
    if args.mode != "update":
        print(f"  Range: {args.start} → {end_date}")
    if args.types:
        print(f"  Types: {', '.join(types_to_scrape.keys())}")
    print(f"  Output: {OUTPUT_DIR}/")
    print(f"{'='*60}\n")

    for i, (code, name) in enumerate(types_to_scrape.items(), 1):
        start_date = get_start_date(args.mode, code, conn, args.start)

        if start_date > end_date:
            print(f"[{i:02d}/{len(types_to_scrape)}] {code:<25} already up to date ✓")
            continue

        print(f"[{i:02d}/{len(types_to_scrape)}] {name} ({code})")
        print(f"    Fetching {start_date} → {end_date}")
        all_chunks = []

        for from_dt, to_dt in date_chunks(start_date, end_date):
            print(f"    {from_dt.strftime('%b %Y')} ... ", end="", flush=True)
            raw = fetch_table(code, from_dt, to_dt)

            if raw is not None and not raw.empty:
                df = normalize(raw, code)
                if code == 'EFP':
                    df = fix_efp_labels(df)
                all_chunks.append(df)
                print(f"{len(df)} rows")
                time.sleep(DELAY_SEC)
            else:
                print("no data")
                time.sleep(EMPTY_DELAY_SEC)

        if all_chunks:
            combined = pd.concat(all_chunks, ignore_index=True)
            csv_new = append_to_csv(combined, code)
            db_new  = save_to_db(combined, conn)
            total_new_rows += db_new
            print(f"    ✅ +{csv_new} rows to CSV, +{db_new} rows to DB\n")
        else:
            print(f"    — No new data found\n")

    # ── Notices ───────────────────────────────────────────────────────────────
    print(f"\n  Scraping market notices...")
    n_notices = scrape_and_save_notices(conn)
    print(f"  ✅ Notices: {n_notices} upserted\n")

    # ── News ──────────────────────────────────────────────────────────────────
    print(f"  Scraping news articles...")
    n_news = scrape_and_save_news(conn)
    print(f"  ✅ News: {n_news} upserted\n")

    conn.close()

    print(f"{'='*60}")
    print(f"  Done! +{total_new_rows:,} market data rows, {n_notices} notices, {n_news} news articles.")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
