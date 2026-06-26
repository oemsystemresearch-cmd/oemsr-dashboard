import os
import sys
import subprocess
import logging
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from database import get_db
from routers import market, weather, news, exchange, historical, notices

logger = logging.getLogger(__name__)

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

import threading
_scraper_lock = threading.Lock()


def _run_scraper(script: str) -> None:
    """Run a scraper script in update mode, logging output and errors."""
    path = os.path.join(BACKEND_DIR, script)
    logger.info("Scheduler: starting %s", script)
    try:
        result = subprocess.run(
            [sys.executable, path, "--mode", "update"],
            capture_output=True, text=True, timeout=1800,
        )
        if result.stdout:
            logger.info("Scheduler [%s] stdout: %s", script, result.stdout[-2000:])
        if result.returncode != 0:
            logger.error("Scheduler [%s] failed (rc=%d): %s", script, result.returncode, result.stderr[-2000:])
        else:
            logger.info("Scheduler: %s completed successfully", script)
    except Exception as exc:
        logger.exception("Scheduler: unexpected error running %s: %s", script, exc)

app = FastAPI(
    title="OEMS API",
    description="Oman Electricity Market Statistics — public data API",
    version="1.0.0",
)

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(market.router, prefix="/api/market", tags=["Market Data"])
app.include_router(weather.router, prefix="/api/weather", tags=["Weather"])
app.include_router(news.router,      prefix="/api/news",     tags=["News"])
app.include_router(exchange.router,   prefix="/api/exchange",    tags=["Exchange"])
app.include_router(historical.router, prefix="/api/historical",  tags=["Historical"])
app.include_router(notices.router,   prefix="/api/notices",      tags=["Notices"])


@app.on_event("startup")
def warm_caches():
    """Pre-warm the slow codes query so the first real request is instant."""
    try:
        from routers.historical import get_codes
        get_codes()
    except Exception:
        pass  # DB not yet available (e.g. fresh Railway deploy before volume is populated)


@app.on_event("startup")
def start_scheduler():
    """Schedule both scrapers to run at 06:00 and 18:00 Oman time (UTC+4)."""
    try:
        scheduler = BackgroundScheduler(timezone="Asia/Muscat")

        # OEMO market data scraper — 06:00 and 18:00 Oman time
        scheduler.add_job(
            _run_scraper, CronTrigger(hour="6,18", minute=0, timezone="Asia/Muscat"),
            args=["oemo_scraper.py"], id="oemo_scraper", replace_existing=True,
        )
        # Weather data scraper — 06:15 and 18:15 Oman time (staggered to avoid overlap)
        scheduler.add_job(
            _run_scraper, CronTrigger(hour="6,18", minute=15, timezone="Asia/Muscat"),
            args=["weather_scraper.py"], id="weather_scraper", replace_existing=True,
        )

        scheduler.start()
        logger.info("Scheduler started — scrapers will run at 06:00/18:00 and 06:15/18:15 Oman time")
    except Exception:
        logger.exception("Scheduler failed to start — scrapers will not run automatically")


@app.post("/api/admin/scrape", tags=["Admin"])
def trigger_scrape(key: str, target: str = "both"):
    """Manually trigger scrapers. target = 'both' | 'oemo' | 'weather'"""
    from fastapi import HTTPException
    secret = os.getenv("SCRAPER_KEY", "").strip()
    if not secret or key.strip() != secret:
        raise HTTPException(status_code=403, detail="Invalid key")

    scripts = {
        "both":    ["oemo_scraper.py", "weather_scraper.py"],
        "oemo":    ["oemo_scraper.py"],
        "weather": ["weather_scraper.py"],
    }
    if target not in scripts:
        raise HTTPException(status_code=400, detail="target must be 'both', 'oemo', or 'weather'")

    if not _scraper_lock.acquire(blocking=False):
        return {"status": "busy", "message": "A scraper is already running. Try again shortly."}

    def run_all():
        try:
            for s in scripts[target]:
                _run_scraper(s)
        finally:
            _scraper_lock.release()

    threading.Thread(target=run_all, daemon=True).start()
    return {"status": "started", "target": target, "message": f"Running {target} scraper(s) in background."}


@app.get("/api/health", tags=["Meta"])
def health():
    """Returns database row counts and the latest scraped date per key type."""
    try:
        with get_db() as conn:
            market_rows = conn.execute("SELECT COUNT(*) FROM market_data").fetchone()[0]
            weather_rows = conn.execute("SELECT COUNT(*) FROM weather_data").fetchone()[0]

            latest = {}
            for code in ["MSPEAMR_APP", "MSPEPCMR_APP", "EFP", "MSCC", "MSEAMR_MSCH"]:
                row = conn.execute(
                    "SELECT MAX(DateFrom) FROM market_data WHERE DataTypeCode = ?", (code,)
                ).fetchone()
                latest[code] = row[0] if row else None

            weather_latest = conn.execute(
                "SELECT MAX(timestamp) FROM weather_data"
            ).fetchone()[0]
    except Exception:
        return {"status": "ok", "market_rows": 0, "weather_rows": 0, "latest_dates": {}, "weather_latest_timestamp": None}

    return {
        "status": "ok",
        "market_rows": market_rows,
        "weather_rows": weather_rows,
        "latest_dates": latest,
        "weather_latest_timestamp": weather_latest,
    }
