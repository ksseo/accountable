"""The figures every response that lists deals carries: expected revenue and
lateness (RULE-1, RULE-6).

They live here, beside the tables, because organizations, contacts, deals,
the pipeline and the dashboard all list deals, and those features mustn't
import each other in circles.
"""

from collections.abc import Mapping
from datetime import date
from typing import Any

from accountable.crm.stages import is_open


def expected_revenue(value: int, probability: int) -> int:
    """value x probability / 100, rounded half up to the dollar (RULE-1).

    Python's round() goes to the even number, which would give $0 for $1 at 50%.
    """
    return (value * probability + 50) // 100


def is_late(stage: str, close_date: date | None, today: date) -> bool:
    """Open, with a close date before today (RULE-6). Won and Lost are never late."""
    return is_open(stage) and close_date is not None and close_date < today


def days_late(stage: str, close_date: date | None, today: date) -> int:
    if not is_late(stage, close_date, today):
        return 0
    assert close_date is not None
    return (today - close_date).days


def with_figures(row: Mapping[str, Any], today: date) -> dict:
    """A deal row with expected_revenue, is_late and days_late added."""
    deal = dict(row)
    deal["expected_revenue"] = expected_revenue(deal["value"], deal["probability"])
    deal["is_late"] = is_late(deal["stage"], deal["close_date"], today)
    deal["days_late"] = days_late(deal["stage"], deal["close_date"], today)
    return deal
