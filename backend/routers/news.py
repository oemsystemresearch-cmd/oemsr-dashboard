from fastapi import APIRouter
from database import get_db

router = APIRouter()


@router.get("/oemo")
def get_oemo_news():
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT title, url, date, excerpt
            FROM news_articles
            ORDER BY scraped_date DESC, date DESC
            LIMIT 8
            """
        ).fetchall()
    return [
        {
            "title":   r["title"],
            "url":     r["url"],
            "date":    r["date"],
            "excerpt": r["excerpt"],
        }
        for r in rows
    ]
