"""Where the database lives."""

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = BACKEND_DIR / "data" / "accountable.db"


def db_path() -> Path:
    """The database file: ACCOUNTABLE_DB if set, else backend/data/accountable.db."""
    value = os.environ.get("ACCOUNTABLE_DB")
    return Path(value).resolve() if value else DEFAULT_DB_PATH
