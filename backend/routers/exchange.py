import csv
import io
import time
import threading
from datetime import date, timedelta
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import httpx
from database import get_db

router = APIRouter()

CACHE_TTL      = 24 * 3600
OMR_USD_PEG    = 2.6008        # CBO official peg, unchanged since 1986
BACKFILL_START = date(2022, 1, 1)

_cache: dict = {"ts": 0.0, "rate": None}
_lock = threading.Lock()


def _init_table():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS exchange_rates (
                date        TEXT PRIMARY KEY,
                omr_to_usd  REAL NOT NULL,
                source      TEXT NOT NULL,
                fetched_at  TEXT NOT NULL
            )
        """)
        conn.commit()


def _fetch_live_rate() -> float | None:
    """Fetch current OMR/USD from open.er-api.com (no key required)."""
    try:
        with httpx.Client(timeout=8.0) as client:
            r = client.get("https://open.er-api.com/v6/latest/OMR")
            r.raise_for_status()
            return float(r.json()["rates"]["USD"])
    except Exception:
        return None


def _backfill():
    """
    On first run: populate every calendar day from BACKFILL_START to today
    at the official CBO peg rate. OMR has been fixed to 2.6008 USD since 1986
    and the rate is set by the Central Bank of Oman, not the open market.
    Also fetches today's live rate to store as the most recent entry.
    """
    today = date.today()

    with get_db() as conn:
        count  = conn.execute("SELECT COUNT(*) FROM exchange_rates").fetchone()[0]
        latest_row = conn.execute("SELECT MAX(date) FROM exchange_rates").fetchone()[0]

    latest = date.fromisoformat(latest_row) if latest_row else None

    # Determine start of gap
    if count == 0:
        start = BACKFILL_START
    elif latest and latest < today:
        start = latest + timedelta(days=1)
    else:
        return  # Already up to date

    # Fetch live rate once to use for today; peg for all historical days
    live_rate = _fetch_live_rate() or OMR_USD_PEG
    fetched_at = today.isoformat()

    rows = []
    d = start
    while d <= today:
        rate = live_rate if d == today else OMR_USD_PEG
        rows.append((d.isoformat(), rate, "CBO peg" if d < today else "open.er-api.com", fetched_at))
        d += timedelta(days=1)

    if rows:
        with get_db() as conn:
            conn.executemany(
                "INSERT OR IGNORE INTO exchange_rates (date, omr_to_usd, source, fetched_at) VALUES (?, ?, ?, ?)",
                rows,
            )
            conn.commit()


try:
    _init_table()
    threading.Thread(target=_backfill, daemon=True).start()
except Exception:
    pass  # DB not yet available on fresh deploy


@router.get("/omr-usd")
def get_omr_usd_rate():
    with _lock:
        stale = (time.time() - _cache["ts"]) >= CACHE_TTL or _cache["rate"] is None
    if stale:
        rate = _fetch_live_rate()
        if rate:
            with _lock:
                _cache["ts"] = time.time()
                _cache["rate"] = rate
    with _lock:
        current = _cache["rate"] or OMR_USD_PEG
    return {"rate": current, "source": "open.er-api.com"}


@router.get("/historical")
def get_exchange_historical(fmt: str = "json"):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT date, omr_to_usd, source FROM exchange_rates ORDER BY date"
        ).fetchall()

    if fmt == "csv":
        def _stream():
            buf = io.StringIO()
            w = csv.writer(buf)
            w.writerow([
                "date",
                "omr_to_usd",
                "source",
                "note",
            ])
            for row in rows:
                note = "CBO fixed peg (unchanged since 1986)" if row["source"] == "CBO peg" else ""
                w.writerow([row["date"], row["omr_to_usd"], row["source"], note])
            yield buf.getvalue()

        return StreamingResponse(
            _stream(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=omr_usd_exchange_rates.csv"},
        )

    return [
        {"date": r["date"], "omr_to_usd": r["omr_to_usd"], "source": r["source"]}
        for r in rows
    ]
