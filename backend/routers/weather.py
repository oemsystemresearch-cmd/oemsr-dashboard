import csv
import io
from datetime import date, timedelta

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse

from database import get_db, oman_now

router = APIRouter()

VALID_CITIES = {
    "Muscat", "Sohar", "Nizwa", "Sur", "Ibri",
    "Duqm", "Buraymi", "Salalah", "Thumrait", "Marmul",
}


@router.get("/map")
def get_map_temperatures(day: str = Query("tomorrow", description="'today' or 'tomorrow'")):
    """
    Returns hourly temperatures for all 10 cities on the selected day.
    Used by the dashboard temperature map with the today/tomorrow toggle.
    'today' and 'tomorrow' are resolved using Oman local time (UTC+4).
    """
    oman_today = oman_now().date()
    if day == "tomorrow":
        target = oman_today + timedelta(days=1)
    elif day == "today":
        target = oman_today
    else:
        try:
            target = date.fromisoformat(day)
        except ValueError:
            raise HTTPException(400, "day must be 'today', 'tomorrow', or YYYY-MM-DD")

    target_str = target.isoformat()

    with get_db() as conn:
        rows = conn.execute("""
            SELECT city, region, system, lat, lon, timestamp, temperature_c
            FROM weather_data
            WHERE DATE(timestamp) = ?
            ORDER BY city, timestamp
        """, (target_str,)).fetchall()

    # Group by city for easier frontend consumption
    cities: dict = {}
    for r in rows:
        c = r["city"]
        if c not in cities:
            cities[c] = {
                "city":    c,
                "region":  r["region"],
                "system":  r["system"],
                "lat":     r["lat"],
                "lon":     r["lon"],
                "hourly":  [],
            }
        cities[c]["hourly"].append({
            "timestamp":     r["timestamp"],
            "temperature_c": r["temperature_c"],
        })

    return {
        "day":    day,
        "date":   target_str,
        "cities": list(cities.values()),
    }


@router.get("/historical")
def get_weather_historical(
    city: str = Query(..., description="City name or 'all'"),
    start: str = Query(..., description="Start date YYYY-MM-DD"),
    end: str   = Query(..., description="End date YYYY-MM-DD"),
):
    """
    Returns hourly historical temperature data for a city (or all cities).
    Used by the Historical Data page chart and download.
    """
    with get_db() as conn:
        if city == "all":
            rows = conn.execute("""
                SELECT city, region, system, timestamp, temperature_c
                FROM weather_data
                WHERE DATE(timestamp) BETWEEN ? AND ?
                ORDER BY city, timestamp
            """, (start, end)).fetchall()
        else:
            if city not in VALID_CITIES:
                raise HTTPException(400, f"Unknown city: {city}. Valid: {sorted(VALID_CITIES)}")
            rows = conn.execute("""
                SELECT city, region, system, timestamp, temperature_c
                FROM weather_data
                WHERE city = ? AND DATE(timestamp) BETWEEN ? AND ?
                ORDER BY timestamp
            """, (city, start, end)).fetchall()

    return {
        "city":  city,
        "start": start,
        "end":   end,
        "data":  [dict(r) for r in rows],
    }


@router.get("/download")
def download_weather(
    city: str  = Query("all", description="City name or 'all'"),
    start: str = Query(...),
    end: str   = Query(...),
):
    """Streams a CSV of hourly temperature data for the requested city and date range."""
    if city != "all" and city not in VALID_CITIES:
        raise HTTPException(400, f"Unknown city: {city}")

    def generate():
        with get_db() as conn:
            if city == "all":
                rows = conn.execute("""
                    SELECT city, region, system, timestamp, temperature_c
                    FROM weather_data
                    WHERE DATE(timestamp) BETWEEN ? AND ?
                    ORDER BY city, timestamp
                """, (start, end))
            else:
                rows = conn.execute("""
                    SELECT city, region, system, timestamp, temperature_c
                    FROM weather_data
                    WHERE city = ? AND DATE(timestamp) BETWEEN ? AND ?
                    ORDER BY timestamp
                """, (city, start, end))

            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow(["city", "region", "system", "timestamp", "temperature_c"])
            yield buf.getvalue()

            for row in rows:
                buf.truncate(0)
                buf.seek(0)
                writer.writerow(list(row))
                yield buf.getvalue()

    filename = f"weather_{city}_{start}_{end}.csv"
    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
