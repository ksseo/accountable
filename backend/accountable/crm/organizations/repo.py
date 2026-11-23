"""Organizations' data access, in SQLAlchemy Core."""

from collections.abc import Mapping
from datetime import date
from typing import Any

from sqlalchemy import Connection, delete, func, insert, select, update

from accountable.core.errors import not_found
from accountable.crm.figures import with_figures
from accountable.crm.stages import OPEN_STAGE_KEYS
from accountable.crm.tables import contacts, deals, organizations


def list_organizations(conn: Connection) -> list[dict]:
    contact_counts = (
        select(contacts.c.organization_id, func.count().label("contact_count"))
        .where(contacts.c.organization_id.is_not(None))
        .group_by(contacts.c.organization_id)
        .subquery()
    )
    open_deals = (
        select(
            deals.c.organization_id,
            func.count().label("open_deal_count"),
            func.sum(deals.c.value).label("open_deal_value"),
        )
        .where(deals.c.organization_id.is_not(None), deals.c.stage.in_(OPEN_STAGE_KEYS))
        .group_by(deals.c.organization_id)
        .subquery()
    )
    query = (
        select(
            organizations,
            func.coalesce(contact_counts.c.contact_count, 0).label("contact_count"),
            func.coalesce(open_deals.c.open_deal_count, 0).label("open_deal_count"),
            func.coalesce(open_deals.c.open_deal_value, 0).label("open_deal_value"),
        )
        .select_from(
            organizations.outerjoin(contact_counts, contact_counts.c.organization_id == organizations.c.id).outerjoin(
                open_deals, open_deals.c.organization_id == organizations.c.id
            )
        )
        .order_by(organizations.c.id)
    )
    return [dict(row) for row in conn.execute(query).mappings()]


def _get(conn: Connection, organization_id: int) -> dict:
    row = conn.execute(select(organizations).where(organizations.c.id == organization_id)).mappings().first()
    if row is None:
        raise not_found("Organization")
    return dict(row)


def get_organization(conn: Connection, organization_id: int, today: date) -> dict:
    """The organization with its contacts, its deals and their figures (REC-1)."""
    organization = _get(conn, organization_id)
    organization["contacts"] = [
        dict(row)
        for row in conn.execute(
            select(contacts).where(contacts.c.organization_id == organization_id).order_by(contacts.c.name)
        ).mappings()
    ]
    deal_rows = conn.execute(
        select(deals, contacts.c.name.label("contact_name"))
        .select_from(deals.outerjoin(contacts, deals.c.contact_id == contacts.c.id))
        .where(deals.c.organization_id == organization_id)
        .order_by(deals.c.close_date.desc().nulls_first(), deals.c.id)
    ).mappings()
    organization["deals"] = [with_figures(row, today) for row in deal_rows]
    open_deals = [d for d in organization["deals"] if d["stage"] in OPEN_STAGE_KEYS]
    organization["open_deal_count"] = len(open_deals)
    organization["open_deal_value"] = sum(d["value"] for d in open_deals)
    organization["won_value"] = sum(d["value"] for d in organization["deals"] if d["stage"] == "won")
    return organization


def create_organization(conn: Connection, data: Mapping[str, Any]) -> dict:
    organization_id = conn.execute(insert(organizations).values(**data)).inserted_primary_key[0]
    return _get(conn, organization_id)


def update_organization(conn: Connection, organization_id: int, changes: Mapping[str, Any]) -> dict:
    _get(conn, organization_id)
    if changes:
        conn.execute(update(organizations).where(organizations.c.id == organization_id).values(**changes))
    return _get(conn, organization_id)


def delete_impact(conn: Connection, organization_id: int) -> dict:
    _get(conn, organization_id)
    count = lambda table: conn.scalar(  # noqa: E731
        select(func.count()).select_from(table).where(table.c.organization_id == organization_id)
    )
    return {"contacts": count(contacts), "deals": count(deals)}


def delete_organization(conn: Connection, organization_id: int) -> None:
    """Deletes it; its contacts and deals stay, with the link emptied (foreign key)."""
    if conn.execute(delete(organizations).where(organizations.c.id == organization_id)).rowcount == 0:
        raise not_found("Organization")
