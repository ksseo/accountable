"""Contacts' data access, in SQLAlchemy Core."""

from collections.abc import Mapping
from datetime import date
from typing import Any

from sqlalchemy import Connection, Select, delete, func, insert, select, update

from accountable.core.errors import field_error, not_found
from accountable.crm.contacts.rules import change_status
from accountable.crm.figures import with_figures
from accountable.crm.tables import activities, contacts, deals, organizations


def _rows() -> Select:
    return select(contacts, organizations.c.name.label("organization_name")).select_from(
        contacts.outerjoin(organizations, contacts.c.organization_id == organizations.c.id)
    )


def list_contacts(conn: Connection) -> list[dict]:
    return [dict(row) for row in conn.execute(_rows().order_by(contacts.c.id)).mappings()]


def _get(conn: Connection, contact_id: int) -> dict:
    row = conn.execute(_rows().where(contacts.c.id == contact_id)).mappings().first()
    if row is None:
        raise not_found("Contact")
    return dict(row)


def get_contact(conn: Connection, contact_id: int, today: date) -> dict:
    """The contact with the deals where they're the main contact (REC-2)."""
    contact = _get(conn, contact_id)
    rows = conn.execute(
        select(deals, organizations.c.name.label("organization_name"))
        .select_from(deals.outerjoin(organizations, deals.c.organization_id == organizations.c.id))
        .where(deals.c.contact_id == contact_id)
        .order_by(deals.c.close_date.desc().nulls_first(), deals.c.id)
    ).mappings()
    contact["deals"] = [with_figures(row, today) for row in rows]
    return contact


def _check_organization(conn: Connection, organization_id: int | None) -> None:
    if organization_id is not None and conn.scalar(
        select(organizations.c.id).where(organizations.c.id == organization_id)
    ) is None:
        raise field_error("organization_id", f"organization_id {organization_id} doesn't exist", "missing_link")


def create_contact(conn: Connection, data: Mapping[str, Any]) -> dict:
    _check_organization(conn, data.get("organization_id"))
    contact_id = conn.execute(insert(contacts).values(**data)).inserted_primary_key[0]
    return _get(conn, contact_id)


def update_contact(conn: Connection, contact_id: int, changes: Mapping[str, Any]) -> dict:
    """Saves the fields sent. A status changed by hand adds a timeline entry (RULE-8)."""
    current = _get(conn, contact_id)
    if "organization_id" in changes:
        _check_organization(conn, changes["organization_id"])
    values = {key: value for key, value in changes.items() if key != "status"}
    if values:
        conn.execute(update(contacts).where(contacts.c.id == contact_id).values(**values))
    new_status = changes.get("status")
    if new_status is not None and new_status != current["status"]:
        change_status(conn, contact_id, current["status"], new_status)
    return _get(conn, contact_id)


def delete_impact(conn: Connection, contact_id: int) -> dict:
    _get(conn, contact_id)
    return {
        "deals": conn.scalar(select(func.count()).select_from(deals).where(deals.c.contact_id == contact_id)),
        "activities": conn.scalar(
            select(func.count()).select_from(activities).where(activities.c.contact_id == contact_id)
        ),
    }


def delete_contact(conn: Connection, contact_id: int) -> None:
    """Deletes the contact and the activities logged on them; their deals stay
    with the main contact emptied (foreign keys)."""
    if conn.execute(delete(contacts).where(contacts.c.id == contact_id)).rowcount == 0:
        raise not_found("Contact")
