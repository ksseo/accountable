"""Deals' data access, in SQLAlchemy Core.

Saving a deal applies RULE-3 to RULE-7 in the caller's transaction: a change of
stage sets the probability, close date and furthest stage, puts the card on top
of its new column and adds a timeline entry; a save that leaves the deal Won
makes its main contact a customer.
"""

from collections.abc import Mapping
from datetime import date
from typing import Any

from sqlalchemy import Connection, Select, delete, func, insert, select, update

from accountable.core.errors import field_error, not_found
from accountable.crm.activities.rules import add_automatic_entry
from accountable.crm.contacts.rules import promote_to_customer
from accountable.crm.deals.rules import (
    POSITION_STEP,
    initial_furthest_stage,
    stage_change_fields,
    usual_probability,
)
from accountable.crm.figures import with_figures
from accountable.crm.stages import CLOSED_STAGE_KEYS
from accountable.crm.tables import activities, contacts, deals, organizations


def _rows() -> Select:
    return select(
        deals,
        organizations.c.name.label("organization_name"),
        contacts.c.name.label("contact_name"),
    ).select_from(
        deals.outerjoin(organizations, deals.c.organization_id == organizations.c.id).outerjoin(
            contacts, deals.c.contact_id == contacts.c.id
        )
    )


def list_deals(conn: Connection, today: date, *conditions) -> list[dict]:
    query = _rows().where(*conditions).order_by(deals.c.position, deals.c.id)
    return [with_figures(row, today) for row in conn.execute(query).mappings()]


def get_deal(conn: Connection, deal_id: int, today: date) -> dict:
    row = conn.execute(_rows().where(deals.c.id == deal_id)).mappings().first()
    if row is None:
        raise not_found("Deal")
    return with_figures(row, today)


def top_position(conn: Connection, stage: str, exclude_id: int | None = None) -> float:
    """The number for the top of a stage's column."""
    query = select(func.min(deals.c.position)).where(deals.c.stage == stage)
    if exclude_id is not None:
        query = query.where(deals.c.id != exclude_id)
    lowest = conn.scalar(query)
    return POSITION_STEP if lowest is None else lowest - POSITION_STEP


def check_links(conn: Connection, values: Mapping[str, Any]) -> None:
    """422 naming the field when a linked organization or contact doesn't exist."""
    for field, table in (("organization_id", organizations), ("contact_id", contacts)):
        linked = values.get(field)
        if linked is not None and conn.scalar(select(table.c.id).where(table.c.id == linked)) is None:
            raise field_error(field, f"{field} {linked} doesn't exist", "missing_link")


def _won_makes_customer(conn: Connection, deal_id: int) -> dict | None:
    """RULE-7: a save that leaves a deal Won makes its main contact a customer."""
    row = conn.execute(
        select(deals.c.stage, deals.c.contact_id, deals.c.name).where(deals.c.id == deal_id)
    ).first()
    if row is None or row.stage != "won" or row.contact_id is None:
        return None
    return promote_to_customer(conn, row.contact_id, deal_name=row.name)


def create_deal(conn: Connection, data: Mapping[str, Any], today: date) -> tuple[int, dict | None]:
    """Adds a deal at the top of its column. Returns its id and any contact made a customer."""
    check_links(conn, data)
    stage = data["stage"]
    probability = data.get("probability")
    close_date = data.get("close_date")
    if close_date is None and stage in CLOSED_STAGE_KEYS:
        close_date = today
    deal_id = conn.execute(
        insert(deals).values(
            name=data["name"],
            organization_id=data.get("organization_id"),
            contact_id=data.get("contact_id"),
            stage=stage,
            value=data["value"],
            probability=usual_probability(stage) if probability is None else probability,
            close_date=close_date,
            furthest_open_stage=initial_furthest_stage(stage),
            position=top_position(conn, stage),
        )
    ).inserted_primary_key[0]
    return deal_id, _won_makes_customer(conn, deal_id)


def update_deal(conn: Connection, deal_id: int, changes: Mapping[str, Any], today: date) -> dict | None:
    """Saves the fields in `changes`. Returns any contact made a customer.

    A field in `changes` counts as set by hand in this save (RULE-3, RULE-4).
    """
    current = conn.execute(select(deals).where(deals.c.id == deal_id)).mappings().first()
    if current is None:
        raise not_found("Deal")
    check_links(conn, changes)

    values = {key: value for key, value in changes.items() if key != "stage"}
    new_stage = changes.get("stage") or current["stage"]
    stage_changed = new_stage != current["stage"]
    if stage_changed:
        values.update(stage_change_fields(current, new_stage, changes, today))
        if "position" not in values:
            values["position"] = top_position(conn, new_stage, exclude_id=deal_id)
    elif values.get("probability", 0) is None:
        del values["probability"]

    close_date = values.get("close_date", current["close_date"])
    if new_stage in CLOSED_STAGE_KEYS and close_date is None:
        raise field_error("close_date", "A won or lost deal needs a close date", "close_date_required")

    if values:
        conn.execute(update(deals).where(deals.c.id == deal_id).values(**values))
    if stage_changed:
        add_automatic_entry(
            conn, "stage_change", deal_id=deal_id, from_value=current["stage"], to_value=new_stage
        )
    return _won_makes_customer(conn, deal_id)


def delete_impact(conn: Connection, deal_id: int) -> dict:
    if conn.scalar(select(deals.c.id).where(deals.c.id == deal_id)) is None:
        raise not_found("Deal")
    count = conn.scalar(select(func.count()).select_from(activities).where(activities.c.deal_id == deal_id))
    return {"activities": count}


def delete_deal(conn: Connection, deal_id: int) -> None:
    """Deletes the deal; its activities go with it (foreign key cascade)."""
    result = conn.execute(delete(deals).where(deals.c.id == deal_id))
    if result.rowcount == 0:
        raise not_found("Deal")
