from fastapi import APIRouter
from database import get_db

router = APIRouter()


@router.get("")
def get_notices():
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT category_key, category, title, date, pdf_url
            FROM notices
            ORDER BY category_key, date DESC
            """
        ).fetchall()
    return [
        {
            "category_key": r["category_key"],
            "category":     r["category"],
            "title":        r["title"],
            "date":         r["date"],
            "pdf_url":      r["pdf_url"],
        }
        for r in rows
    ]
