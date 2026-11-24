"""Activity rules: follow-up state, fixed automatic entries, and the one
function that writes an automatic entry (RULE-9 to RULE-11)."""

from datetime import date, datetime
from typing import Literal

from sqlalchemy import Connection, insert

from accountable.core import clock
from accountable.crm.stages import AUTOMATIC_KIND_KEYS
from accountable.crm.tables import activities

FollowUpState = Literal["overdue", "today", "upcoming", "done"]

# Timelines come 50 entries at a time (REC-4).
TIMELINE_PAGE_SIZE = 50


def follow_up_state(follow_up_date: date | None, done: bool, today: date) -> FollowUpState | None:
    """Overdue before today, due today, upcoming after (RULE-10)."""
    if follow_up_date is None:
        return None
    if done:
        return "done"
    if follow_up_date < today:
        return "overdue"
    if follow_up_date == today:
        return "today"
    return "upcoming"


def is_automatic(kind: str) -> bool:
    """Stage and status changes are written by the app and can't be edited (RULE-11)."""
    return kind in AUTOMATIC_KIND_KEYS


def add_automatic_entry(
    conn: Connection,
    kind: str,
    *,
    contact_id: int | None = None,
    deal_id: int | None = None,
    from_value: str | None,
    to_value: str,
    description: str | None = None,
    occurred_at: datetime | None = None,
) -> int:
    """The only way a stage_change or status_change entry is written."""
    if not is_automatic(kind):
        raise ValueError(f"{kind} isn't an automatic entry")
    return conn.execute(
        insert(activities)
        .values(
            kind=kind,
            contact_id=contact_id,
            deal_id=deal_id,
            from_value=from_value,
            to_value=to_value,
            description=description,
            occurred_at=occurred_at or clock.now(),
            follow_up_done=False,
        )
        .returning(activities.c.id)
    ).scalar_one()
