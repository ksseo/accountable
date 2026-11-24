"""The dashboard: its rules on hand-made deals, then GET /api/dashboard on a
small hand-made dataset (API-7, DASH-1 to DASH-13, RULE-12, RULE-13)."""

from datetime import date, datetime, timedelta

import pytest

from accountable.crm.dashboard.rules import (
    follow_up_window,
    funnel,
    last_months,
    won_lost_by_month,
)

TODAY = date(2026, 11, 23)


def deal(stage, value=1_000, close=None, furthest=None):
    return {
        "stage": stage,
        "value": value,
        "close_date": close,
        "furthest_open_stage": furthest or (stage if stage not in ("won", "lost") else "new"),
    }


def test_the_last_12_months_include_this_one():
    months = last_months(TODAY)
    assert months[0] == "2025-12"
    assert months[-1] == "2026-11"
    assert len(months) == 12
    assert last_months(date(2027, 1, 5))[-2:] == ["2026-12", "2027-01"]


def test_won_and_lost_by_month_with_empty_months_at_zero():
    deals = [
        deal("won", 5_000, date(2026, 11, 2)),
        deal("won", 7_000, date(2026, 11, 20)),
        deal("lost", 9_000, date(2026, 11, 21)),
        deal("won", 3_000, date(2026, 1, 15)),
        deal("won", 99_000, date(2025, 11, 30)),  # 13 months ago: not shown
        deal("proposal", 50_000, date(2026, 11, 1)),  # open: not counted
    ]
    months = {m["month"]: m for m in won_lost_by_month(deals, TODAY)}
    assert months["2026-11"] == {"month": "2026-11", "won_value": 12_000, "won_count": 2, "lost_count": 1}
    assert months["2026-01"]["won_value"] == 3_000
    assert months["2026-06"] == {"month": "2026-06", "won_value": 0, "won_count": 0, "lost_count": 0}
    assert "2025-11" not in months


def test_the_funnel_counts_deals_at_every_stage_they_reached():
    deals = [
        deal("won", 100, date(2026, 10, 1), furthest="negotiation"),
        deal("lost", 10, date(2026, 10, 1), furthest="proposal"),
        deal("proposal", 1_000),  # added straight into Proposal
        deal("new", 5),
        deal("lost", 7_777, date(2025, 1, 1), furthest="negotiation"),  # over 12 months ago
    ]
    stages, conversion = funnel(deals, TODAY)
    by_stage = {s["stage"]: (s["value"], s["count"]) for s in stages}
    assert by_stage == {
        "new": (1_115, 4),
        "qualified": (1_110, 3),
        "proposal": (1_110, 3),
        "negotiation": (100, 1),
        "won": (100, 1),
    }
    assert stages[0]["share"] == 1.0
    assert conversion == pytest.approx(100 / 1_115)


def test_the_funnel_with_no_deals():
    stages, conversion = funnel([], TODAY)
    assert all(s["value"] == 0 and s["share"] == 0 for s in stages)
    assert conversion == 0


def test_follow_ups_overdue_first_then_today_then_the_next_14_days():
    def item(item_id, days, done=False):
        return {
            "id": item_id,
            "follow_up_date": TODAY + timedelta(days=days),
            "follow_up_done": done,
            "occurred_at": datetime(2026, 11, 1),
        }

    items = [
        item(1, 3),
        item(2, -2),
        item(3, 0),
        item(4, 14),
        item(5, 15),
        item(6, -5, done=True),
        item(7, 40),
    ]
    shown, later = follow_up_window(items, TODAY)
    assert [i["id"] for i in shown] == [2, 3, 1, 4]
    assert later == 2


def _on(days: int) -> str:
    return (TODAY + timedelta(days=days)).isoformat()


@pytest.fixture
def small_dataset(client, make_org, make_contact, make_deal, make_activity):
    """Six deals in the 12 months and one older; follow-ups around today."""
    from accountable.core import clock

    org = make_org("한빛정밀")
    contact = make_contact("박서연", organization_id=org["id"])
    ids = {
        "A": make_deal("A", value=10_000, stage="new", organization_id=org["id"])["id"],
        "B": make_deal("B", value=20_000, stage="proposal", close_date=_on(22))["id"],
        "C": make_deal("C", value=40_000, stage="negotiation", close_date=_on(-3))["id"],
        "D": make_deal("D", value=50_000, stage="negotiation")["id"],
        "E": make_deal("E", value=30_000, stage="won", close_date="2026-10-10")["id"],
        "F": make_deal("F", value=60_000, stage="proposal")["id"],
        "G": make_deal("G", value=90_000, stage="won", close_date="2025-11-30")["id"],
    }
    client.patch(f"/api/deals/{ids['D']}", json={"stage": "won", "close_date": "2026-11-05"})
    client.patch(f"/api/deals/{ids['F']}", json={"stage": "lost", "close_date": "2026-09-01"})

    def ago(minutes):
        return (clock.now() - timedelta(minutes=minutes)).isoformat()

    follow_ups = {}
    for minutes, (label, days) in enumerate(
        [("+14", 14), ("+3", 3), ("today", 0), ("-5", -5), ("+15", 15), ("+30", 30), ("done", -2)], start=10
    ):
        target = {"contact_id": contact["id"]} if label in ("today", "+3") else {"deal_id": ids["A"]}
        entry = make_activity(
            f"follow-up {label}", follow_up_date=_on(days), occurred_at=ago(minutes), **target
        )
        follow_ups[label] = entry["id"]
    client.patch(f"/api/activities/{follow_ups['done']}", json={"follow_up_done": True})
    for minutes in (100, 200, 300):
        make_activity(f"older {minutes}", kind="note", deal_id=ids["B"], occurred_at=ago(minutes))
    return client.get("/api/dashboard").json()


def test_the_four_figures(small_dataset):
    figures = small_dataset["figures"]
    assert small_dataset["today"] == TODAY.isoformat()
    assert (figures["open_value"], figures["open_count"], figures["expected_revenue"]) == (70_000, 3, 41_000)
    assert (figures["won_this_month_value"], figures["won_this_month_count"]) == (50_000, 1)
    assert (figures["won_last_month_value"], figures["won_last_month_count"]) == (30_000, 1)
    assert (figures["late_count"], figures["late_value"]) == (1, 40_000)
    assert (figures["overdue_follow_up_count"], figures["due_today_follow_up_count"]) == (1, 1)


def test_the_band(small_dataset):
    assert [(s["stage"], s["count"], s["value"], s["expected_revenue"]) for s in small_dataset["band"]] == [
        ("new", 1, 10_000, 1_000),
        ("qualified", 0, 0, 0),
        ("proposal", 1, 20_000, 10_000),
        ("negotiation", 1, 40_000, 30_000),
    ]


def test_12_months_including_this_one_with_empty_months_at_zero(small_dataset):
    months = {m["month"]: (m["won_value"], m["won_count"], m["lost_count"]) for m in small_dataset["months"]}
    assert list(months) == ["2025-12", *[f"2026-{n:02d}" for n in range(1, 12)]]
    assert months["2026-11"] == (50_000, 1, 0)
    assert months["2026-10"] == (30_000, 1, 0)
    assert months["2026-09"] == (0, 0, 1)
    assert months["2026-08"] == (0, 0, 0)
    assert "2025-11" not in months


def test_the_funnel(small_dataset):
    stages = {s["stage"]: (s["value"], s["count"]) for s in small_dataset["funnel"]}
    # A won deal counts everywhere; F, lost from Proposal, counts at three stages;
    # B, added straight into Proposal, counts at New and Qualified too; G is too old.
    assert stages == {
        "new": (210_000, 6),
        "qualified": (200_000, 5),
        "proposal": (200_000, 5),
        "negotiation": (120_000, 3),
        "won": (80_000, 2),
    }
    shares = [s["share"] for s in small_dataset["funnel"]]
    assert shares[0] == 1.0
    assert small_dataset["conversion"] == pytest.approx(80_000 / 210_000)


def test_follow_ups_in_order_with_the_14_day_window_and_later_count(small_dataset):
    items = small_dataset["follow_ups"]
    assert [(i["description"], i["state"], i["days_overdue"]) for i in items] == [
        ("follow-up -5", "overdue", 5),
        ("follow-up today", "today", 0),
        ("follow-up +3", "upcoming", 0),
        ("follow-up +14", "upcoming", 0),
    ]
    assert small_dataset["follow_ups_later"] == 2
    contact, deal = items[1]["record"], items[0]["record"]
    assert (contact["kind"], contact["name"], contact["organization_name"]) == (
        "contact",
        "박서연",
        "한빛정밀",
    )
    assert (deal["kind"], deal["name"], deal["organization_name"]) == ("deal", "A", "한빛정밀")


def test_a_record_names_its_organization_with_its_id(client, small_dataset):
    org_id = client.get("/api/organizations").json()[0]["id"]
    records = [item["record"] for item in small_dataset["follow_ups"] + small_dataset["recent"]]
    assert {record["organization_id"] for record in records if record["organization_name"] == "한빛정밀"} == {
        org_id
    }
    assert {record["organization_id"] for record in records if record["organization_name"] is None} <= {None}


def test_the_10_newest_entries_with_their_records(small_dataset):
    recent = small_dataset["recent"]
    assert len(recent) == 10
    times = [entry["occurred_at"] for entry in recent]
    assert times == sorted(times, reverse=True)
    assert [(e["kind"], e["automatic"], e["record"]["name"]) for e in recent[:2]] == [
        ("stage_change", True, "F"),
        ("stage_change", True, "D"),
    ]
    assert (recent[0]["from_value"], recent[0]["to_value"]) == ("proposal", "lost")
    descriptions = {entry["description"] for entry in recent}
    assert "older 100" in descriptions
    assert not {"older 200", "older 300"} & descriptions


def test_the_dashboard_with_no_data(client):
    board = client.get("/api/dashboard").json()
    assert board["figures"]["open_value"] == 0
    assert len(board["months"]) == 12
    assert board["conversion"] == 0.0
    assert (board["follow_ups"], board["follow_ups_later"], board["recent"]) == ([], 0, [])
