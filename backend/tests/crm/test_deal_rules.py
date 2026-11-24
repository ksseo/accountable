"""Deal rules: expected revenue, open and late, stage changes and won makes a customer (RULE-1 to RULE-8)."""

import json
from datetime import date, timedelta
from pathlib import Path

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from accountable.crm.deals import repo
from accountable.crm.deals.rules import further_open_stage, initial_furthest_stage
from accountable.crm.figures import days_late, expected_revenue, is_late
from accountable.crm.tables import activities, contacts, deals

TODAY = date(2026, 11, 23)
CASES = json.loads((Path(__file__).parent / "expected_revenue_cases.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("case", CASES, ids=[case["why"] for case in CASES])
def test_expected_revenue_rounds_half_up(case):
    assert expected_revenue(case["value"], case["probability"]) == case["expected"]


@pytest.mark.parametrize(
    ("stage", "close_date", "late"),
    [
        ("proposal", None, False),
        ("proposal", TODAY - timedelta(days=1), True),
        ("proposal", TODAY, False),
        ("new", TODAY + timedelta(days=5), False),
        ("won", TODAY - timedelta(days=40), False),
        ("lost", TODAY - timedelta(days=40), False),
    ],
)
def test_late_means_open_with_a_close_date_before_today(stage, close_date, late):
    assert is_late(stage, close_date, TODAY) is late


def test_days_late():
    assert days_late("negotiation", TODAY - timedelta(days=3), TODAY) == 3
    assert days_late("won", TODAY - timedelta(days=3), TODAY) == 0


def test_furthest_stage_only_moves_forward():
    assert further_open_stage("qualified", "negotiation") == "negotiation"
    assert further_open_stage("negotiation", "new") == "negotiation"
    assert further_open_stage("proposal", "won") == "proposal"
    assert further_open_stage("proposal", "lost") == "proposal"
    assert initial_furthest_stage("proposal") == "proposal"
    assert initial_furthest_stage("won") == "new"


def _deal(conn, deal_id):
    return conn.execute(select(deals).where(deals.c.id == deal_id)).mappings().one()


def _entries(conn, **where):
    query = select(activities).order_by(activities.c.id)
    for column, value in where.items():
        query = query.where(activities.c[column] == value)
    return conn.execute(query).mappings().all()


def _new_deal(conn, **data):
    data = {"name": "2027 포장재 공급", "stage": "new", "value": 120_000, **data}
    deal_id, _ = repo.create_deal(conn, data, TODAY)
    return deal_id


def test_a_new_deal_takes_its_stages_usual_probability(conn):
    deal = _deal(conn, _new_deal(conn, stage="proposal"))
    assert deal["probability"] == 50
    assert deal["furthest_open_stage"] == "proposal"
    assert deal["close_date"] is None


def test_a_stage_change_sets_the_usual_probability_and_adds_an_entry(conn):
    deal_id = _new_deal(conn)
    repo.update_deal(conn, deal_id, {"stage": "proposal"}, TODAY)
    deal = _deal(conn, deal_id)
    assert deal["probability"] == 50
    assert deal["furthest_open_stage"] == "proposal"
    [entry] = _entries(conn, deal_id=deal_id)
    assert (entry["kind"], entry["from_value"], entry["to_value"]) == ("stage_change", "new", "proposal")
    assert entry["occurred_at"].tzinfo is not None


def test_a_probability_set_in_the_same_save_is_kept(conn):
    deal_id = _new_deal(conn)
    repo.update_deal(conn, deal_id, {"stage": "negotiation", "probability": 60}, TODAY)
    assert _deal(conn, deal_id)["probability"] == 60


def test_a_probability_set_by_hand_stays_until_the_next_stage_change(conn):
    deal_id = _new_deal(conn, stage="qualified")
    repo.update_deal(conn, deal_id, {"probability": 40}, TODAY)
    repo.update_deal(conn, deal_id, {"name": "새 이름", "value": 130_000}, TODAY)
    assert _deal(conn, deal_id)["probability"] == 40
    repo.update_deal(conn, deal_id, {"stage": "proposal"}, TODAY)
    assert _deal(conn, deal_id)["probability"] == 50


def test_saving_the_same_stage_is_not_a_change(conn):
    deal_id = _new_deal(conn, stage="qualified")
    repo.update_deal(conn, deal_id, {"stage": "qualified", "probability": 30}, TODAY)
    assert _deal(conn, deal_id)["probability"] == 30
    assert _entries(conn, deal_id=deal_id) == []


def test_won_or_lost_takes_today_as_the_close_date(conn):
    won = _new_deal(conn, close_date=TODAY + timedelta(days=30))
    repo.update_deal(conn, won, {"stage": "won"}, TODAY)
    assert _deal(conn, won)["close_date"] == TODAY
    assert _deal(conn, won)["probability"] == 100

    lost = _new_deal(conn)
    repo.update_deal(conn, lost, {"stage": "lost"}, TODAY)
    assert _deal(conn, lost)["close_date"] == TODAY
    assert _deal(conn, lost)["probability"] == 0


def test_a_close_date_set_in_the_same_save_is_kept(conn):
    deal_id = _new_deal(conn)
    repo.update_deal(conn, deal_id, {"stage": "won", "close_date": date(2026, 11, 2)}, TODAY)
    assert _deal(conn, deal_id)["close_date"] == date(2026, 11, 2)


def test_a_deal_created_straight_into_won_gets_today(conn):
    deal = _deal(conn, _new_deal(conn, stage="won"))
    assert deal["close_date"] == TODAY
    assert deal["probability"] == 100
    assert deal["furthest_open_stage"] == "new"


def test_a_closed_deal_needs_a_close_date(conn):
    deal_id = _new_deal(conn, stage="lost")
    with pytest.raises(HTTPException, match=r"'loc': \['body', 'close_date'\]") as error:
        repo.update_deal(conn, deal_id, {"close_date": None}, TODAY)
    assert error.value.status_code == 422


def test_the_furthest_stage_is_kept_when_moving_back(conn):
    deal_id = _new_deal(conn)
    for stage in ("negotiation", "qualified", "lost"):
        repo.update_deal(conn, deal_id, {"stage": stage}, TODAY)
    assert _deal(conn, deal_id)["furthest_open_stage"] == "negotiation"
    stages = [(e["from_value"], e["to_value"]) for e in _entries(conn, deal_id=deal_id)]
    assert stages == [("new", "negotiation"), ("negotiation", "qualified"), ("qualified", "lost")]


def test_back_to_open_keeps_the_close_date_and_the_contacts_status(conn, add):
    contact_id = add(contacts, name="김민준", status="qualified")
    deal_id = _new_deal(conn, contact_id=contact_id)
    repo.update_deal(conn, deal_id, {"stage": "won", "close_date": TODAY - timedelta(days=5)}, TODAY)
    repo.update_deal(conn, deal_id, {"stage": "proposal"}, TODAY)
    deal = repo.get_deal(conn, deal_id, TODAY)
    assert deal["close_date"] == TODAY - timedelta(days=5)
    assert deal["probability"] == 50
    assert deal["is_late"] is True
    assert conn.scalar(select(contacts.c.status).where(contacts.c.id == contact_id)) == "customer"


def test_won_makes_the_main_contact_a_customer(conn, add):
    contact_id = add(contacts, name="김민준", status="qualified")
    deal_id = _new_deal(conn, contact_id=contact_id)
    promoted = repo.update_deal(conn, deal_id, {"stage": "won"}, TODAY)
    assert promoted == {"id": contact_id, "name": "김민준"}
    assert conn.scalar(select(contacts.c.status).where(contacts.c.id == contact_id)) == "customer"
    [entry] = _entries(conn, contact_id=contact_id)
    assert (entry["kind"], entry["from_value"], entry["to_value"]) == (
        "status_change",
        "qualified",
        "customer",
    )
    assert entry["description"] == "2027 포장재 공급"


def test_the_status_entry_keeps_the_deals_name_at_that_moment(conn, add):
    contact_id = add(contacts, name="김민준", status="lead")
    deal_id = _new_deal(conn, contact_id=contact_id)
    repo.update_deal(conn, deal_id, {"stage": "won"}, TODAY)
    repo.update_deal(conn, deal_id, {"name": "바뀐 이름"}, TODAY)
    [entry] = _entries(conn, contact_id=contact_id)
    assert entry["description"] == "2027 포장재 공급"


def test_a_deal_created_straight_into_won_makes_a_customer(conn, add):
    contact_id = add(contacts, name="Sarah Kim", status="lead")
    _, promoted = repo.create_deal(
        conn,
        {"name": "Shrink sleeve labels", "stage": "won", "value": 18_000, "contact_id": contact_id},
        TODAY,
    )
    assert promoted == {"id": contact_id, "name": "Sarah Kim"}


def test_a_new_main_contact_on_a_won_deal_becomes_a_customer(conn, add):
    first = add(contacts, name="김민준", status="qualified")
    second = add(contacts, name="이서윤", status="lead")
    deal_id = _new_deal(conn, contact_id=first, stage="won")
    promoted = repo.update_deal(conn, deal_id, {"contact_id": second}, TODAY)
    assert promoted == {"id": second, "name": "이서윤"}
    assert conn.scalar(select(contacts.c.status).where(contacts.c.id == second)) == "customer"


def test_a_customer_stays_a_customer_and_gets_no_new_entry(conn, add):
    contact_id = add(contacts, name="김민준", status="customer")
    deal_id = _new_deal(conn, contact_id=contact_id)
    assert repo.update_deal(conn, deal_id, {"stage": "won"}, TODAY) is None
    assert _entries(conn, contact_id=contact_id) == []


def test_lost_never_lowers_a_status(conn, add):
    contact_id = add(contacts, name="김민준", status="customer")
    deal_id = _new_deal(conn, contact_id=contact_id)
    repo.update_deal(conn, deal_id, {"stage": "lost"}, TODAY)
    assert conn.scalar(select(contacts.c.status).where(contacts.c.id == contact_id)) == "customer"


def test_a_changed_stage_goes_to_the_top_of_its_new_column(conn):
    first = _new_deal(conn, name="A", stage="proposal")
    second = _new_deal(conn, name="B", stage="proposal")
    assert _deal(conn, second)["position"] < _deal(conn, first)["position"]
    moved = _new_deal(conn, name="C")
    repo.update_deal(conn, moved, {"stage": "proposal"}, TODAY)
    assert _deal(conn, moved)["position"] < _deal(conn, second)["position"]


def test_links_to_missing_records_name_the_field(conn):
    with pytest.raises(HTTPException, match=r"'loc': \['body', 'organization_id'\]") as error:
        _new_deal(conn, organization_id=999)
    assert error.value.status_code == 422
