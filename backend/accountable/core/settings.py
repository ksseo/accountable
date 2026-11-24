"""Where the database lives, and the addresses the app answers to."""

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = BACKEND_DIR / "data" / "accountable.db"

# Listening on 127.0.0.1 isn't enough: another site can point its own name
# there, and the browser would then let that site read and change everything.
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]


def db_path() -> Path:
    """The database file: ACCOUNTABLE_DB if set, else backend/data/accountable.db."""
    value = os.environ.get("ACCOUNTABLE_DB")
    return Path(value).resolve() if value else DEFAULT_DB_PATH
