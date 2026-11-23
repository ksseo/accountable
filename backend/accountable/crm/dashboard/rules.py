"""The dashboard's rules as plain functions (RULE-12, RULE-13, DASH-12)."""

from collections.abc import Iterable, Mapping
from datetime import date, timedelta
from typing import Any

from accountable.crm.stages import OPEN_STAGE_KEYS, is_open, open_stage_index

MONTHS_SHOWN = 12
FOLLOW_UP_DAYS = 14


def month_key(day: date) -> str:
    return f"{day.year:04d}-{day.month:02d}"


def last_months(today: date, count: int = MONTHS_SHOWN) -> list[str]:
    """The last `count` months including this one, oldest first, as YYYY-MM."""
    months = []
    year, month = today.year, today.month
    for _ in range(count):
        months.append(f"{year:04d}-{month:02d}")
        year, month = (year, month - 1) if month > 1 else (year - 1, 12)
    return months[::-1]


def window_start(today: date, count: int = MONTHS_SHOWN) -> date:
    """The first day of the oldest month shown."""
    first = last_months(today, count)[0]
    return date(int(first[:4]), int(first[5:]), 1)


def won_lost_by_month(deals: Iterable[Mapping[str, Any]], today: date) -> list[dict]:
    """Won revenue, won count and lost count per month, by close date (RULE-12).
    Months with none are zero."""
    figures = {
        month: {"month": month, "won_value": 0, "won_count": 0, "lost_count": 0}
        for month in last_months(today)
    }
    for deal in deals:
        close_date = deal["close_date"]
        if deal["stage"] not in ("won", "lost") or close_date is None:
            continue
        month = figures.get(month_key(close_date))
        if month is None:
            continue
        if deal["stage"] == "won":
            month["won_value"] += deal["value"]
            month["won_count"] += 1
        else:
            month["lost_count"] += 1
    return list(figures.values())


def in_funnel(deal: Mapping[str, Any], today: date) -> bool:
    """Every open deal, plus every deal won or lost in the last 12 months."""
    if is_open(deal["stage"]):
        return True
    return deal["close_date"] is not None and deal["close_date"] >= window_start(today)


def reached(deal: Mapping[str, Any], stage: str) -> bool:
    """Whether a deal counts at a stage of the funnel (RULE-13).

    A won deal counts at every stage. Otherwise a deal counts at each open stage
    up to its furthest one, so a deal added straight into Proposal has passed
    New and Qualified.
    """
    if deal["stage"] == "won":
        return True
    if stage == "won":
        return False
    return open_stage_index(deal["furthest_open_stage"]) >= open_stage_index(stage)


def funnel(deals: Iterable[Mapping[str, Any]], today: date) -> tuple[list[dict], float]:
    """Value and number of deals that reached each stage, each value's share of
    New's, and the conversion rate from New to Won by value."""
    counted = [deal for deal in deals if in_funnel(deal, today)]
    stages = []
    for stage in (*OPEN_STAGE_KEYS, "won"):
        reaching = [deal for deal in counted if reached(deal, stage)]
        stages.append({"stage": stage, "value": sum(d["value"] for d in reaching), "count": len(reaching)})
    new_value = stages[0]["value"]
    for entry in stages:
        entry["share"] = entry["value"] / new_value if new_value else 0.0
    return stages, stages[-1]["share"]


def follow_up_window(
    follow_ups: Iterable[Mapping[str, Any]], today: date, days: int = FOLLOW_UP_DAYS
) -> tuple[list[Mapping[str, Any]], int]:
    """Open follow-ups due by today + `days`, soonest first, so overdue ones come
    first, then today's; and how many fall later (DASH-12)."""
    last_day = today + timedelta(days=days)
    shown, later = [], 0
    for item in follow_ups:
        if item["follow_up_done"] or item["follow_up_date"] is None:
            continue
        if item["follow_up_date"] <= last_day:
            shown.append(item)
        else:
            later += 1
    shown.sort(key=lambda item: (item["follow_up_date"], item["occurred_at"], item["id"]))
    return shown, later
