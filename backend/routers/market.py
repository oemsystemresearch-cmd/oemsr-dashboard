import csv
import io
from datetime import date, timedelta
from collections import defaultdict

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse

from database import get_db

router = APIRouter()

# ── Constants ─────────────────────────────────────────────────────────────────

PRICE_TYPES = [
    "MSPEAMR_APP", "MSEAMR_ZSMP", "MSPEAMR_SP", "MSPEAMR_EASF", "MSPEAMR_MAR",
    "MSPEPCMR_APP", "MSEPCMR_ZSMP", "MSPEPCMR_SP", "MSPEPCMR_EPSF", "MSPEPCMR_MAR",
    "MSPEPIMR_APP", "MSEPIMR_ZSMP", "MSPEPIMR_SP", "MSPEPIMR_EPSF", "MSPEPIMR_MAR",
]
MSCH_TYPES = {"MSEAMR_MSCH", "MSEPCMR_MSCH", "MSEPIMR_MSCH"}
ALL_VALID_TYPES = set(PRICE_TYPES) | MSCH_TYPES | {"EFP", "MSCC", "RELPRICE", "WEATHER_FC"}


def _latest_date(conn, code: str) -> str | None:
    row = conn.execute(
        "SELECT MAX(DateFrom) FROM market_data WHERE DataTypeCode = ?", (code,)
    ).fetchone()
    return row[0] if row else None


# ── Home page endpoints ───────────────────────────────────────────────────────

@router.get("/kpis")
def get_kpis():
    """
    Returns all data needed for the home page KPI cards in a single call:
    latest App price, today's daily stats, latest EFP (Gas + Oil), latest MSCC.
    """
    with get_db() as conn:
        latest_date_app = _latest_date(conn, "MSPEAMR_APP")

        latest_app = conn.execute("""
            SELECT Value, TradingPeriod, DateFrom FROM market_data
            WHERE DataTypeCode = 'MSPEAMR_APP' AND DateFrom = ?
              AND TradingPeriod <= '23.30'
            ORDER BY TradingPeriod DESC LIMIT 1
        """, (latest_date_app,)).fetchone()

        daily_stats = conn.execute("""
            SELECT AVG(Value) as avg_val, MIN(Value) as min_val, MAX(Value) as max_val
            FROM market_data
            WHERE DataTypeCode = 'MSPEAMR_APP' AND DateFrom = ?
              AND TradingPeriod <= '23.30'
        """, (latest_date_app,)).fetchone()

        efp_date = _latest_date(conn, "EFP")
        efp_rows = conn.execute("""
            SELECT ExtraField, Value FROM market_data
            WHERE DataTypeCode = 'EFP' AND DateFrom = ?
        """, (efp_date,)).fetchall()

        mscc_date = _latest_date(conn, "MSCC")
        mscc = conn.execute("""
            SELECT Value, ExtraField, DateFrom FROM market_data
            WHERE DataTypeCode = 'MSCC' AND DateFrom = ?
        """, (mscc_date,)).fetchone()

        ytd_start = f"{date.today().year}-01-01"
        ytd_avg_row = conn.execute("""
            SELECT AVG(Value) as avg_val FROM market_data
            WHERE DataTypeCode = 'MSPEAMR_APP'
              AND DateFrom BETWEEN ? AND ?
              AND TradingPeriod <= '23.30'
        """, (ytd_start, latest_date_app or date.today().isoformat())).fetchone()

        msch_latest = _latest_date(conn, "MSEAMR_MSCH")
        msch_end    = msch_latest or date.today().isoformat()
        peak_row = conn.execute("""
            SELECT period_total as peak_mw, DateFrom as peak_date, TradingPeriod as peak_period
            FROM (
                SELECT DateFrom, TradingPeriod, SUM(Value) as period_total
                FROM market_data
                WHERE DataTypeCode = 'MSEAMR_MSCH'
                  AND DateFrom BETWEEN ? AND ?
                  AND TradingPeriod <= '23.30'
                GROUP BY DateFrom, TradingPeriod
            )
            ORDER BY period_total DESC
            LIMIT 1
        """, (ytd_start, msch_end)).fetchone()

    efp = {r["ExtraField"]: r["Value"] for r in efp_rows}

    return {
        "latest_price": {
            "value":  latest_app["Value"]         if latest_app else None,
            "period": latest_app["TradingPeriod"] if latest_app else None,
            "date":   latest_app["DateFrom"]      if latest_app else None,
        },
        "daily_stats": {
            "avg":  round(daily_stats["avg_val"], 3) if daily_stats and daily_stats["avg_val"] else None,
            "high": daily_stats["max_val"]           if daily_stats else None,
            "low":  daily_stats["min_val"]           if daily_stats else None,
            "date": latest_date_app,
        },
        "yearly_avg": {
            "avg":  round(ytd_avg_row["avg_val"], 3) if ytd_avg_row and ytd_avg_row["avg_val"] else None,
            "year": date.today().year,
        },
        "efp": {
            "gas":  efp.get("Gas"),
            "oil":  efp.get("Oil"),
            "date": efp_date,
        },
        "mscc": {
            "value": mscc["Value"]      if mscc else None,
            "month": mscc["ExtraField"] if mscc else None,
            "date":  mscc["DateFrom"]   if mscc else None,
        },
        "system_peak": {
            "value":  round(peak_row["peak_mw"])    if peak_row and peak_row["peak_mw"] else None,
            "date":   peak_row["peak_date"]          if peak_row else None,
            "period": peak_row["peak_period"]        if peak_row else None,
        },
    }


@router.get("/price-curve")
def get_price_curve(date_str: str = Query(None, alias="date")):
    """
    Returns all 48 half-hourly MSPEAMR_APP intervals for a given date.
    Defaults to the most recent available date if none is specified.
    """
    with get_db() as conn:
        if not date_str:
            date_str = _latest_date(conn, "MSPEAMR_APP")
        rows = conn.execute("""
            SELECT TradingPeriod, Value FROM market_data
            WHERE DataTypeCode = 'MSPEAMR_APP' AND DateFrom = ?
              AND TradingPeriod <= '23.30'
            ORDER BY TradingPeriod
        """, (date_str,)).fetchall()

    return {
        "date": date_str,
        "intervals": [{"period": r["TradingPeriod"], "value": r["Value"]} for r in rows],
    }


@router.get("/summary")
def get_summary():
    """
    Returns the latest available value for each of the 20 active data types.
    Used to populate the Data Summary Table on the home page.
    Market Schedule types are excluded (multi-row per interval — not a single value).
    """
    with get_db() as conn:
        result = []

        # 15 price/factor/margin types — one latest interval each
        for code in PRICE_TYPES:
            latest_date = _latest_date(conn, code)
            if not latest_date:
                continue
            row = conn.execute("""
                SELECT DataTypeName, Value, TradingPeriod, DateFrom FROM market_data
                WHERE DataTypeCode = ? AND DateFrom = ? AND TradingPeriod <= '23.30'
                ORDER BY TradingPeriod DESC LIMIT 1
            """, (code, latest_date)).fetchone()
            if row:
                result.append({
                    "code": code,
                    "name": row["DataTypeName"],
                    "value": row["Value"],
                    "date": row["DateFrom"],
                    "unit": "OMR/MWh",
                    "extra": None,
                })

        # EFP — two rows (Gas + Oil)
        efp_date = _latest_date(conn, "EFP")
        if efp_date:
            for row in conn.execute("""
                SELECT DataTypeName, Value, ExtraField, DateFrom FROM market_data
                WHERE DataTypeCode = 'EFP' AND DateFrom = ?
            """, (efp_date,)).fetchall():
                result.append({
                    "code": "EFP",
                    "name": f"Economic Fuel Price ({row['ExtraField']})",
                    "value": row["Value"],
                    "date": row["DateFrom"],
                    "unit": "OMR/MWh",
                    "extra": row["ExtraField"],
                })

        # MSCC — one monthly value
        mscc_date = _latest_date(conn, "MSCC")
        if mscc_date:
            row = conn.execute("""
                SELECT DataTypeName, Value, ExtraField, DateFrom FROM market_data
                WHERE DataTypeCode = 'MSCC' AND DateFrom = ?
            """, (mscc_date,)).fetchone()
            if row:
                result.append({
                    "code": "MSCC",
                    "name": row["DataTypeName"],
                    "value": row["Value"],
                    "date": row["DateFrom"],
                    "unit": "OMR/month",
                    "extra": row["ExtraField"],
                })

    return result


# ── Historical data endpoints ─────────────────────────────────────────────────

@router.get("/historical")
def get_historical(
    type: str = Query(..., description="DataTypeCode e.g. MSPEAMR_APP"),
    start: str = Query(..., description="Start date YYYY-MM-DD"),
    end: str   = Query(..., description="End date YYYY-MM-DD"),
    granularity: str = Query("daily", description="'interval' for 48 pts/day, 'daily' for daily averages"),
):
    """
    Returns time-series data for charting on the Historical Data page.
    - For price/factor types: interval (48 pts/day) or daily average/high/low.
    - For EFP: Gas + Oil values per publication date.
    - For MSCC: one value per month.
    - For Market Schedule types: total scheduled MW per interval (summed across participants).
    """
    if type not in ALL_VALID_TYPES:
        raise HTTPException(400, f"Unknown DataTypeCode: {type}")

    with get_db() as conn:
        if type in MSCH_TYPES:
            rows = conn.execute("""
                SELECT DateFrom, TradingPeriod, SUM(Value) as value
                FROM market_data
                WHERE DataTypeCode = ? AND DateFrom BETWEEN ? AND ?
                  AND TradingPeriod <= '23.30'
                GROUP BY DateFrom, TradingPeriod
                ORDER BY DateFrom, TradingPeriod
            """, (type, start, end)).fetchall()
            return {
                "type": type,
                "granularity": "interval",
                "data": [{"date": r["DateFrom"], "period": r["TradingPeriod"], "value": r["value"]} for r in rows],
            }

        if type == "EFP":
            rows = conn.execute("""
                SELECT DateFrom, ExtraField as fuel, Value FROM market_data
                WHERE DataTypeCode = 'EFP' AND DateFrom BETWEEN ? AND ?
                ORDER BY DateFrom, ExtraField
            """, (start, end)).fetchall()
            return {
                "type": "EFP",
                "granularity": "monthly",
                "data": [{"date": r["DateFrom"], "fuel": r["fuel"], "value": r["Value"]} for r in rows],
            }

        if type == "MSCC":
            rows = conn.execute("""
                SELECT DateFrom, ExtraField as month, Value FROM market_data
                WHERE DataTypeCode = 'MSCC' AND DateFrom BETWEEN ? AND ?
                ORDER BY DateFrom
            """, (start, end)).fetchall()
            return {
                "type": "MSCC",
                "granularity": "monthly",
                "data": [{"date": r["DateFrom"], "month": r["month"], "value": r["Value"]} for r in rows],
            }

        if type in PRICE_TYPES:
            if granularity == "interval":
                rows = conn.execute("""
                    SELECT DateFrom, TradingPeriod, Value FROM market_data
                    WHERE DataTypeCode = ? AND DateFrom BETWEEN ? AND ?
                      AND TradingPeriod <= '23.30'
                    ORDER BY DateFrom, TradingPeriod
                """, (type, start, end)).fetchall()
                return {
                    "type": type,
                    "granularity": "interval",
                    "data": [{"date": r["DateFrom"], "period": r["TradingPeriod"], "value": r["Value"]} for r in rows],
                }
            else:
                rows = conn.execute("""
                    SELECT DateFrom,
                           AVG(Value) as avg_val,
                           MIN(Value) as min_val,
                           MAX(Value) as max_val
                    FROM market_data
                    WHERE DataTypeCode = ? AND DateFrom BETWEEN ? AND ?
                      AND TradingPeriod <= '23.30'
                    GROUP BY DateFrom
                    ORDER BY DateFrom
                """, (type, start, end)).fetchall()
                return {
                    "type": type,
                    "granularity": "daily",
                    "data": [
                        {"date": r["DateFrom"], "avg": round(r["avg_val"], 4),
                         "high": r["max_val"], "low": r["min_val"]}
                        for r in rows
                    ],
                }

    raise HTTPException(400, f"No handler for type: {type}")


@router.get("/msch-breakdown")
def get_msch_breakdown(
    date_str: str = Query(..., alias="date"),
    type: str = Query("MSEAMR_MSCH"),
):
    """
    Returns per-participant market schedule data for a single date, pivoted by
    trading period. Participants with zero total MW are excluded.
    Response shape: { date, type, participants: [{id, total_mw}], data: [{period, MP_X: mw, ...}] }
    """
    if type not in MSCH_TYPES:
        raise HTTPException(400, f"type must be one of: {sorted(MSCH_TYPES)}")

    with get_db() as conn:
        rows = conn.execute("""
            SELECT TradingPeriod, Participant, Value
            FROM market_data
            WHERE DataTypeCode = ? AND DateFrom = ?
              AND TradingPeriod <= '23.30'
            ORDER BY TradingPeriod, Participant
        """, (type, date_str)).fetchall()

    if not rows:
        raise HTTPException(404, f"No data for {type} on {date_str}")

    totals: dict[str, float] = defaultdict(float)
    for r in rows:
        totals[r["Participant"]] += r["Value"]

    active = sorted(
        (p for p, t in totals.items() if t > 0),
        key=lambda p: totals[p],
        reverse=True,
    )

    periods: dict[str, dict[str, float]] = defaultdict(dict)
    for r in rows:
        if r["Participant"] in active:
            periods[r["TradingPeriod"]][r["Participant"]] = r["Value"]

    data = [
        {"period": period, **{p: periods[period].get(p, 0) for p in active}}
        for period in sorted(periods)
    ]

    return {
        "date": date_str,
        "type": type,
        "participants": [{"id": p, "total_mw": round(totals[p])} for p in active],
        "data": data,
    }


@router.get("/download")
def download_market_data(
    type: str = Query(...),
    start: str = Query(...),
    end: str   = Query(...),
):
    """
    Streams a CSV file of raw market data for the queried type and date range.
    For Market Schedule types, includes per-participant rows.
    """
    if type not in ALL_VALID_TYPES:
        raise HTTPException(400, f"Unknown DataTypeCode: {type}")

    def generate():
        with get_db() as conn:
            if type in MSCH_TYPES:
                rows = conn.execute("""
                    SELECT DateFrom, TradingPeriod, Participant, Value FROM market_data
                    WHERE DataTypeCode = ? AND DateFrom BETWEEN ? AND ?
                      AND TradingPeriod <= '23.30'
                    ORDER BY DateFrom, TradingPeriod, Participant
                """, (type, start, end))
                headers = ["date", "period", "participant", "value_mw"]
            elif type == "EFP":
                rows = conn.execute("""
                    SELECT DateFrom, ExtraField, Value FROM market_data
                    WHERE DataTypeCode = 'EFP' AND DateFrom BETWEEN ? AND ?
                    ORDER BY DateFrom, ExtraField
                """, (start, end))
                headers = ["date", "fuel_type", "value_omr_per_mwh"]
            elif type == "MSCC":
                rows = conn.execute("""
                    SELECT DateFrom, ExtraField, Value FROM market_data
                    WHERE DataTypeCode = 'MSCC' AND DateFrom BETWEEN ? AND ?
                    ORDER BY DateFrom
                """, (start, end))
                headers = ["date", "month", "value_omr"]
            else:
                rows = conn.execute("""
                    SELECT DateFrom, TradingPeriod, Value FROM market_data
                    WHERE DataTypeCode = ? AND DateFrom BETWEEN ? AND ?
                      AND TradingPeriod <= '23.30'
                    ORDER BY DateFrom, TradingPeriod
                """, (type, start, end))
                headers = ["date", "period", "value"]

            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow(headers)
            yield buf.getvalue()

            for row in rows:
                buf.truncate(0)
                buf.seek(0)
                writer.writerow(list(row))
                yield buf.getvalue()

    filename = f"{type}_{start}_{end}.csv"
    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
