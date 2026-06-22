import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import get_db
from routers import market, weather, news, exchange, historical, notices

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
