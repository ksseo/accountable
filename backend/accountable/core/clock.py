"""The only place the backend reads the date (APP-11).

ACCOUNTABLE_TODAY=YYYY-MM-DD fixes today for tests. now() then uses that date
with the current time of day.
"""

import os
from datetime import UTC, date, datetime


def today() -> date:
    fixed = os.environ.get("ACCOUNTABLE_TODAY")
    if fixed:
        return date.fromisoformat(fixed)
    return datetime.now().astimezone().date()


def now() -> datetime:
    """The current moment, time-zone aware, in UTC."""
    local = datetime.now().astimezone()
    if os.environ.get("ACCOUNTABLE_TODAY"):
        local = datetime.combine(today(), local.timetz())
    return local.astimezone(UTC)
