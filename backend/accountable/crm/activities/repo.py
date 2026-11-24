"""Activities' data access and timelines, in SQLAlchemy Core (RULE-9 to RULE-11)."""

from collections.abc import Mapping
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import ColumnElement, Connection, Select, delete, func, insert, or_, select, update

from accountable.core import clock
from accountable.core.errors import conflict, field_error, not_found
from accountable.crm.activities.rules import TIMELINE_PAGE_SIZE, follow_up_state, is_automatic
from accountable.crm.tables import activities, contacts, deals

# The browser and the backend read the same clock, but a form can be sent a
# moment after its "now" was filled in.
FUTURE_TOLERANCE = timedelta(minutes=1)


def _entries() -> Select:
    return select(
        activities,
        deals.c.name.label("deal_name"),
        contacts.c.name.label("contact_name"),
    ).select_from(
        activities.outerjoin(deals, activities.c.deal_id == deals.c.id).outerjoin(
            contacts, activities.c.contact_id == contacts.c.id
        )
    )


def as_entry(row: Mapping[str, Any], today: date) -> dict:
    entry = dict(row)
    entry["automatic"] = is_automatic(entry["kind"])
    entry["follow_up_state"] = follow_up_state(entry["follow_up_date"], entry["follow_up_done"], today)
    return entry


def _timeline(conn: Connection, condition: ColumnElement, offset: int, today: date) -> dict:
    total = conn.scalar(select(func.count()).select_from(activities).where(condition))
    rows = conn.execute(
        _entries()
        .where(condition)
        .order_by(activities.c.occurred_at.desc(), activities.c.id.desc())
        .limit(TIMELINE_PAGE_SIZE)
        .offset(offset)
    ).mappings()
    return {
        "items": [as_entry(row, today) for row in rows],
        "total": total,
        "offset": offset,
        "limit": TIMELINE_PAGE_SIZE,
    }


def deal_timeline(conn: Connection, deal_id: int, offset: int, today: date) -> dict:
    """A deal's own activities, newest first."""
    if conn.scalar(select(deals.c.id).where(deals.c.id == deal_id)) is None:
        raise not_found("Deal")
    return _timeline(conn, activities.c.deal_id == deal_id, offset, today)


def contact_timeline(conn: Connection, contact_id: int, offset: int, today: date) -> dict:
    """A contact's own activities plus those of the deals where they're the
    main contact now, each with the deal's name (RULE-9)."""
    if conn.scalar(select(contacts.c.id).where(contacts.c.id == contact_id)) is None:
        raise not_found("Contact")
    their_deals = select(deals.c.id).where(deals.c.contact_id == contact_id)
    condition = or_(activities.c.contact_id == contact_id, activities.c.deal_id.in_(their_deals))
    return _timeline(conn, condition, offset, today)


def _get(conn: Connection, activity_id: int, today: date) -> dict:
    row = conn.execute(_entries().where(activities.c.id == activity_id)).mappings().first()
    if row is None:
        raise not_found("Activity")
    return as_entry(row, today)


def _check_not_future(occurred_at: datetime) -> None:
    """Something to do later is a follow-up, not an activity (DATA-6)."""
    if occurred_at > clock.now() + FUTURE_TOLERANCE:
        raise field_error("occurred_at", "An activity can't have happened in the future", "future")


def create_activity(conn: Connection, data: Mapping[str, Any], today: date) -> dict:
    """Logs a note, call or email on exactly one contact or deal (DATA-7)."""
    contact_id, deal_id = data.get("contact_id"), data.get("deal_id")
    if (contact_id is None) == (deal_id is None):
        raise field_error("deal_id", "Log an activity on either a contact or a deal", "one_record")
    if (
        contact_id is not None
        and conn.scalar(select(contacts.c.id).where(contacts.c.id == contact_id)) is None
    ):
        raise field_error("contact_id", f"contact_id {contact_id} doesn't exist", "missing_link")
    if deal_id is not None and conn.scalar(select(deals.c.id).where(deals.c.id == deal_id)) is None:
        raise field_error("deal_id", f"deal_id {deal_id} doesn't exist", "missing_link")
    occurred_at = data.get("occurred_at") or clock.now()
    _check_not_future(occurred_at)
    activity_id = conn.execute(
        insert(activities)
        .values(
            kind=data["kind"],
            contact_id=contact_id,
            deal_id=deal_id,
            description=data["description"],
            occurred_at=occurred_at,
            follow_up_date=data.get("follow_up_date"),
            follow_up_done=False,
        )
        .returning(activities.c.id)
    ).scalar_one()
    return _get(conn, activity_id, today)


def _editable(conn: Connection, activity_id: int) -> None:
    kind = conn.scalar(select(activities.c.kind).where(activities.c.id == activity_id))
    if kind is None:
        raise not_found("Activity")
    if is_automatic(kind):
        raise conflict("Automatic entries can't be edited or deleted")


def update_activity(conn: Connection, activity_id: int, changes: Mapping[str, Any], today: date) -> dict:
    _editable(conn, activity_id)
    if changes.get("occurred_at") is not None:
        _check_not_future(changes["occurred_at"])
    if changes:
        conn.execute(update(activities).where(activities.c.id == activity_id).values(**changes))
    return _get(conn, activity_id, today)


def delete_activity(conn: Connection, activity_id: int) -> None:
    _editable(conn, activity_id)
    conn.execute(delete(activities).where(activities.c.id == activity_id))
