"""The dashboard's figures, worked out from the same rules as the tables (DASH-1)."""

from collections.abc import Mapping
from datetime import date
from typing import Any

from sqlalchemy import Connection, Select, or_, select

from accountable.crm.activities.rules import follow_up_state, is_automatic
from accountable.crm.dashboard.rules import follow_up_window, funnel, window_start, won_lost_by_month
from accountable.crm.figures import with_figures
from accountable.crm.stages import OPEN_STAGE_KEYS
from accountable.crm.tables import activities, contacts, deals, organizations

RECENT_COUNT = 10

_contact_org = organizations.alias("contact_org")
_deal_org = organizations.alias("deal_org")


def _with_records() -> Select:
    """Activities with the contact or deal they're on, and its organization."""
    return select(
        activities,
        contacts.c.name.label("contact_name"),
        contacts.c.organization_id.label("contact_org_id"),
        _contact_org.c.name.label("contact_org_name"),
        deals.c.name.label("deal_name"),
        deals.c.organization_id.label("deal_org_id"),
        _deal_org.c.name.label("deal_org_name"),
    ).select_from(
        activities.outerjoin(contacts, activities.c.contact_id == contacts.c.id)
        .outerjoin(_contact_org, contacts.c.organization_id == _contact_org.c.id)
        .outerjoin(deals, activities.c.deal_id == deals.c.id)
        .outerjoin(_deal_org, deals.c.organization_id == _deal_org.c.id)
    )


def _record(row: Mapping[str, Any]) -> dict:
    kind = "contact" if row["contact_id"] is not None else "deal"
    return {
        "kind": kind,
        "id": row[f"{kind}_id"],
        "name": row[f"{kind}_name"],
        "organization_id": row[f"{kind}_org_id"],
        "organization_name": row[f"{kind}_org_name"],
    }


def follow_up_query() -> Select:
    return _with_records().where(
        activities.c.follow_up_done.is_(False), activities.c.follow_up_date.is_not(None)
    )


def recent_query() -> Select:
    return (
        _with_records().order_by(activities.c.occurred_at.desc(), activities.c.id.desc()).limit(RECENT_COUNT)
    )


def deals_query(today: date) -> Select:
    """The deals any figure can use: open ones, and those closed in the 12 months
    the charts and funnel cover. Closed deals pile up over the years; this keeps
    them out without reading them."""
    return select(
        deals.c.id,
        deals.c.stage,
        deals.c.value,
        deals.c.probability,
        deals.c.close_date,
        deals.c.furthest_open_stage,
    ).where(or_(deals.c.stage.in_(OPEN_STAGE_KEYS), deals.c.close_date >= window_start(today)))


def dashboard(conn: Connection, today: date) -> dict:
    all_deals = [with_figures(row, today) for row in conn.execute(deals_query(today)).mappings()]
    open_deals = [deal for deal in all_deals if deal["stage"] in OPEN_STAGE_KEYS]
    late = [deal for deal in open_deals if deal["is_late"]]
    months = won_lost_by_month(all_deals, today)
    this_month, last_month = months[-1], months[-2]
    stages, conversion = funnel(all_deals, today)

    open_follow_ups = conn.execute(follow_up_query()).mappings().all()
    shown, later = follow_up_window(open_follow_ups, today)
    follow_ups = []
    for row in shown:
        state = follow_up_state(row["follow_up_date"], False, today)
        follow_ups.append(
            {
                "id": row["id"],
                "kind": row["kind"],
                "description": row["description"],
                "follow_up_date": row["follow_up_date"],
                "state": state,
                "days_overdue": (today - row["follow_up_date"]).days if state == "overdue" else 0,
                "record": _record(row),
            }
        )

    recent = [
        {
            "id": row["id"],
            "kind": row["kind"],
            "automatic": is_automatic(row["kind"]),
            "description": row["description"],
            "occurred_at": row["occurred_at"],
            "from_value": row["from_value"],
            "to_value": row["to_value"],
            "record": _record(row),
        }
        for row in conn.execute(recent_query()).mappings()
    ]

    return {
        "today": today,
        "figures": {
            "open_value": sum(deal["value"] for deal in open_deals),
            "open_count": len(open_deals),
            "expected_revenue": sum(deal["expected_revenue"] for deal in open_deals),
            "won_this_month_value": this_month["won_value"],
            "won_this_month_count": this_month["won_count"],
            "won_last_month_value": last_month["won_value"],
            "won_last_month_count": last_month["won_count"],
            "late_count": len(late),
            "late_value": sum(deal["value"] for deal in late),
            "overdue_follow_up_count": sum(item["state"] == "overdue" for item in follow_ups),
            "due_today_follow_up_count": sum(item["state"] == "today" for item in follow_ups),
        },
        "band": [
            {
                "stage": stage,
                "count": sum(1 for deal in open_deals if deal["stage"] == stage),
                "value": sum(deal["value"] for deal in open_deals if deal["stage"] == stage),
                "expected_revenue": sum(
                    deal["expected_revenue"] for deal in open_deals if deal["stage"] == stage
                ),
            }
            for stage in OPEN_STAGE_KEYS
        ],
        "months": months,
        "funnel": stages,
        "conversion": conversion,
        "follow_ups": follow_ups,
        "follow_ups_later": later,
        "recent": recent,
    }
