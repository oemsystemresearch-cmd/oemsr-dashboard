import sqlite3
import os
from contextlib import contextmanager
from datetime import datetime
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DB_PATH = os.getenv(
    "DB_PATH",
    os.path.expanduser("~/Desktop/Oman_Project/oemo_data/oemo_market.db")
)

OMAN_TZ = ZoneInfo("Asia/Muscat")


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def oman_now() -> datetime:
    return datetime.now(OMAN_TZ)
