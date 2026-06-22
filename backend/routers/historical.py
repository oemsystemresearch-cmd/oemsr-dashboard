import csv
import io

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from database import get_db

router = APIRouter()

_codes_cache: list[dict] | None = None

UNIT_MAP: dict[str, str] = {
    "MSPEAMR_APP":   "OMR/MWh",
    "MSPEPCMR_APP":  "OMR/MWh",
    "MSPEPIMR_APP":  "OMR/MWh",
    "MSPEAMR_SP":    "OMR/MWh",
    "MSPEPCMR_SP":   "OMR/MWh",
    "MSPEPIMR_SP":   "OMR/MWh",
    "MSPEAMR_MAR":   "OMR/MWh",
    "MSPEPCMR_MAR":  "OMR/MWh",
    "MSPEPIMR_MAR":  "OMR/MWh",
    "MSEAMR_ZSMP":   "OMR/MWh",
    "MSEPCMR_ZSMP":  "OMR/MWh",
    "MSEPIMR_ZSMP":  "OMR/MWh",
    "MSPEAMR_EASF":  "",
    "MSPEPCMR_EPSF": "",
    "MSPEPIMR_EPSF": "",
    "MSEAMR_MSCH":   "MWh",
    "MSEPCMR_MSCH":  "MWh",
    "MSEPIMR_MSCH":  "MWh",
    "EFP":           "OMR/MWh",
    "MSCC":          "OMR/month",
}


@router.get("/codes")
def get_codes():
    global _codes_cache
    if _codes_cache is not None:
        return _codes_cache
    with get_db() as conn:
        rows = conn.execute(
            "SELECT DISTINCT DataTypeCode, DataTypeName FROM market_data ORDER BY DataTypeCode"
        ).fetchall()
    _codes_cache = [
        {"code": r["DataTypeCode"], "name": r["DataTypeName"], "unit": UNIT_MAP.get(r["DataTypeCode"], "")}
        for r in rows
    ]
    return _codes_cache


@router.get("/data")
def get_data(
    code:        str = Query(...),
    date_from:   str = Query(...),
    date_to:     str = Query(...),
    extra_field: str | None = Query(None),
):
    extra_clause = "AND ExtraField = ?" if extra_field else ""
    params = [code, date_from, date_to]
    if extra_field:
        params.append(extra_field)
    with get_db() as conn:
        rows = conn.execute(
            f"""
            SELECT DateFrom, AVG(Value) AS avg_val
            FROM market_data
            WHERE DataTypeCode = ?
              AND DateFrom BETWEEN ? AND ?
              {extra_clause}
            GROUP BY DateFrom
            ORDER BY DateFrom
            """,
            params,
        ).fetchall()
    return [
        {"date": r["DateFrom"], "value": round(r["avg_val"], 4) if r["avg_val"] is not None else None}
        for r in rows
    ]


MSCH_CODES = {"MSEAMR_MSCH", "MSEPCMR_MSCH", "MSEPIMR_MSCH"}


@router.get("/data-by-participant")
def get_data_by_participant(
    code:      str = Query(...),
    date_from: str = Query(...),
    date_to:   str = Query(...),
):
    if code not in MSCH_CODES:
        return {"participants": [], "data": []}

    with get_db() as conn:
        # Top participants by average scheduled volume over the period
        top = conn.execute(
            """
            SELECT Participant, AVG(Value) AS avg_val
            FROM market_data
            WHERE DataTypeCode = ?
              AND DateFrom BETWEEN ? AND ?
              AND Participant IS NOT NULL AND Participant != ''
            GROUP BY Participant
            ORDER BY avg_val DESC
            LIMIT 12
            """,
            (code, date_from, date_to),
        ).fetchall()

        participants = [r["Participant"] for r in top]
        if not participants:
            return {"participants": [], "data": []}

        placeholders = ",".join("?" * len(participants))
        rows = conn.execute(
            f"""
            SELECT DateFrom, Participant, AVG(Value) AS avg_val
            FROM market_data
            WHERE DataTypeCode = ?
              AND DateFrom BETWEEN ? AND ?
              AND Participant IN ({placeholders})
            GROUP BY DateFrom, Participant
            ORDER BY DateFrom
            """,
            (code, date_from, date_to, *participants),
        ).fetchall()

    from collections import defaultdict
    by_date: dict = defaultdict(dict)
    for r in rows:
        by_date[r["DateFrom"]][r["Participant"]] = (
            round(r["avg_val"], 2) if r["avg_val"] is not None else None
        )

    data = [{"date": d, **vals} for d, vals in sorted(by_date.items())]
    return {"participants": participants, "data": data}


@router.get("/download")
def download_data(
    code:        str = Query(...),
    date_from:   str = Query(...),
    date_to:     str = Query(...),
    extra_field: str | None = Query(None),
):
    extra_clause = "AND ExtraField = ?" if extra_field else ""
    params = [code, date_from, date_to]
    if extra_field:
        params.append(extra_field)

    is_msch = code in MSCH_CODES

    with get_db() as conn:
        if is_msch:
            rows = conn.execute(
                f"""
                SELECT DateFrom, TradingPeriod, Participant, Value
                FROM market_data
                WHERE DataTypeCode = ?
                  AND DateFrom BETWEEN ? AND ?
                  {extra_clause}
                ORDER BY DateFrom, TradingPeriod, Participant
                """,
                params,
            ).fetchall()
        else:
            rows = conn.execute(
                f"""
                SELECT DateFrom, TradingPeriod, AVG(Value) AS avg_val
                FROM market_data
                WHERE DataTypeCode = ?
                  AND DateFrom BETWEEN ? AND ?
                  {extra_clause}
                GROUP BY DateFrom, TradingPeriod
                ORDER BY DateFrom, TradingPeriod
                """,
                params,
            ).fetchall()
        name_row = conn.execute(
            "SELECT DataTypeName FROM market_data WHERE DataTypeCode = ? LIMIT 1", (code,)
        ).fetchone()

    name = name_row["DataTypeName"] if name_row else code
    unit = UNIT_MAP.get(code, "")
    value_header = f"Value ({unit})" if unit else "Value"

    output = io.StringIO()
    writer = csv.writer(output)
    if is_msch:
        writer.writerow(["Date", "Trading Period", "Participant", value_header, "Data Type Code", "Data Type Name"])
        for r in rows:
            writer.writerow([r["DateFrom"], r["TradingPeriod"], r["Participant"], r["Value"], code, name])
    else:
        writer.writerow(["Date", "Trading Period", value_header, "Data Type Code", "Data Type Name"])
        for r in rows:
            writer.writerow([r["DateFrom"], r["TradingPeriod"], r["avg_val"], code, name])

    filename = f"oems_{code}_{date_from}_{date_to}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
