"""The sample data's shape, the seed command and the bulk helper (APP-6, SEED-1 to SEED-6)."""

from collections import Counter
from datetime import date, timedelta

import pytest
from sqlalchemy import func, insert, select

from accountable import seed
from accountable.core import clock
from accountable.core.db import make_engine, migrate, write_connection
from accountable.core.settings import db_path
from accountable.crm import bulk
from accountable.crm.dashboard.rules import last_months, month_key
from accountable.crm.pipeline.rules import board_window_start
from accountable.crm.stages import OPEN_STAGE_KEYS, STAGE_KEYS, STATUS_KEYS
from accountable.crm.tables import activities, contacts, deals, organizations


@pytest.fixture
def sample_engine():
    engine = make_engine(db_path())
    migrate(engine)
    seed.reset(engine)
    yield engine
    engine.dispose()


def _all(engine, table):
    with engine.connect() as conn:
        return [dict(row) for row in conn.execute(select(table).order_by(table.c.id)).mappings()]


def test_counts_are_near_25_70_80_and_250(sample_engine):
    assert 20 <= len(_all(sample_engine, organizations)) <= 30
    assert 60 <= len(_all(sample_engine, contacts)) <= 80
    assert 70 <= len(_all(sample_engine, deals)) <= 90
    assert 220 <= len(_all(sample_engine, activities)) <= 280


def test_every_status_and_stage_is_used(sample_engine):
    assert {c["status"] for c in _all(sample_engine, contacts)} == set(STATUS_KEYS)
    assert {d["stage"] for d in _all(sample_engine, deals)} == set(STAGE_KEYS)


def test_values_are_2000_to_250000(sample_engine):
    values = [d["value"] for d in _all(sample_engine, deals)]
    assert min(values) >= 2_000
    assert max(values) <= 250_000


def test_some_contacts_and_deals_have_no_organization_or_contact(sample_engine):
    assert any(c["organization_id"] is None for c in _all(sample_engine, contacts))
    all_deals = _all(sample_engine, deals)
    assert any(d["organization_id"] is None for d in all_deals)
    assert any(d["contact_id"] is None for d in all_deals)


def test_one_won_deal_closes_today_and_the_board_has_recent_wins_and_losses(sample_engine):
    today = clock.today()
    all_deals = _all(sample_engine, deals)
    assert any(d["stage"] == "won" and d["close_date"] == today for d in all_deals)
    recent = [d for d in all_deals if d["close_date"] and d["close_date"] >= board_window_start(today)]
    assert sum(d["stage"] == "won" for d in recent) >= 2
    assert sum(d["stage"] == "lost" for d in recent) >= 1


def test_three_or_four_deals_are_late(sample_engine):
    today = clock.today()
    late = [
        d for d in _all(sample_engine, deals)
        if d["stage"] in OPEN_STAGE_KEYS and d["close_date"] and d["close_date"] < today
    ]
    assert 3 <= len(late) <= 4


@pytest.mark.parametrize("today", ["2026-11-23", "2026-12-01", "2026-12-31", "2027-02-28", "2027-03-01"])
def test_won_and_lost_deals_fill_the_last_12_months(monkeypatch, today):
    monkeypatch.setenv("ACCOUNTABLE_TODAY", today)
    engine = make_engine(db_path())
    migrate(engine)
    seed.reset(engine)
    all_deals = _all(engine, deals)
    engine.dispose()
    months = last_months(date.fromisoformat(today))
    won = Counter(month_key(d["close_date"]) for d in all_deals if d["stage"] == "won")
    lost = Counter(month_key(d["close_date"]) for d in all_deals if d["stage"] == "lost")
    assert all(won[month] > 0 for month in months), won
    assert sum(lost[month] > 0 for month in months) >= 8, lost


def test_stage_entries_follow_each_deals_path(sample_engine):
    entries = _all(sample_engine, activities)
    for deal in _all(sample_engine, deals):
        steps = sorted(
            (e for e in entries if e["deal_id"] == deal["id"] and e["kind"] == "stage_change"),
            key=lambda e: (e["occurred_at"], e["id"]),
        )
        if deal["stage"] in ("won", "lost"):
            assert steps, deal["name"]
        if not steps:
            assert deal["furthest_open_stage"] == deal["stage"]
            continue
        for before, after in zip(steps, steps[1:], strict=False):
            assert before["to_value"] == after["from_value"], deal["name"]
        assert steps[-1]["to_value"] == deal["stage"], deal["name"]
        reached = [s for e in steps for s in (e["from_value"], e["to_value"]) if s in OPEN_STAGE_KEYS]
        furthest = max(reached, key=OPEN_STAGE_KEYS.index)
        assert furthest == deal["furthest_open_stage"], deal["name"]


def test_every_customer_has_a_status_entry_and_every_won_contact_is_a_customer(sample_engine):
    entries = _all(sample_engine, activities)
    with_entry = {e["contact_id"] for e in entries if e["kind"] == "status_change" and e["to_value"] == "customer"}
    people = _all(sample_engine, contacts)
    customers = {c["id"] for c in people if c["status"] == "customer"}
    assert customers == with_entry
    won_contacts = {d["contact_id"] for d in _all(sample_engine, deals) if d["stage"] == "won" and d["contact_id"]}
    assert won_contacts <= customers


def test_the_follow_ups(sample_engine):
    today = clock.today()
    open_follow_ups = [
        e["follow_up_date"] for e in _all(sample_engine, activities)
        if e["follow_up_date"] is not None and not e["follow_up_done"]
    ]
    assert 3 <= sum(day < today for day in open_follow_ups) <= 4
    assert sum(day == today for day in open_follow_ups) == 1
    assert 5 <= sum(today < day <= today + timedelta(days=14) for day in open_follow_ups) <= 6


def test_nothing_is_in_the_future(sample_engine):
    now = clock.now()
    for table in (organizations, contacts, deals, activities):
        for row in _all(sample_engine, table):
            assert row["created_at"] <= now
            assert row["updated_at"] <= now
    assert all(e["occurred_at"] <= now for e in _all(sample_engine, activities))


def test_logged_activities_have_descriptions(sample_engine):
    for entry in _all(sample_engine, activities):
        if entry["kind"] in ("note", "call", "email"):
            assert entry["description"]


def _snapshot(engine):
    skip = {"created_at", "updated_at", "occurred_at"}
    return {
        table.name: [{k: v for k, v in row.items() if k not in skip} for row in _all(engine, table)]
        for table in (organizations, contacts, deals, activities)
    }


def test_two_runs_of_seed_yes_give_the_same_data():
    assert seed.main(["--yes"]) == 0
    engine = make_engine(db_path())
    first = _snapshot(engine)
    assert seed.main(["--yes"]) == 0
    second = _snapshot(engine)
    engine.dispose()
    assert first == second
    assert len(first["deals"]) > 0


def test_seed_asks_first_and_y_resets(capsys):
    engine = make_engine(db_path())
    migrate(engine)
    with write_connection(engine) as conn, conn.begin():
        conn.execute(insert(organizations).values(name="손으로 추가한 거래처"))
    questions = []
    assert seed.main([], ask=lambda question: questions.append(question) or "y") == 0
    assert questions == ["모든 데이터를 지우고 샘플 데이터로 되돌릴까요? (y/N) "]
    names = {row["name"] for row in _all(engine, organizations)}
    engine.dispose()
    assert "손으로 추가한 거래처" not in names
    assert "한빛정밀" in names


@pytest.mark.parametrize("answer", ["", "n", "N", "yes", "아니요"])
def test_any_answer_other_than_y_changes_nothing(answer):
    engine = make_engine(db_path())
    migrate(engine)
    with write_connection(engine) as conn, conn.begin():
        conn.execute(insert(organizations).values(name="손으로 추가한 거래처"))
    assert seed.main([], ask=lambda _: answer) == 0
    assert [row["name"] for row in _all(engine, organizations)] == ["손으로 추가한 거래처"]
    engine.dispose()


def test_no_answer_creates_no_database():
    assert seed.main([], ask=lambda _: "n") == 0
    assert not db_path().exists()


def test_the_bulk_helper_loads_about_1000_of_each():
    engine = make_engine(db_path())
    migrate(engine)
    with write_connection(engine) as conn, conn.begin():
        bulk.load(conn)
    with engine.connect() as conn:
        for table in (organizations, contacts, deals, activities):
            count = conn.scalar(select(func.count()).select_from(table))
            assert 950 <= count <= 1050, table.name
        largest_lane = max(
            conn.scalar(select(func.count()).select_from(deals).where(deals.c.stage == stage))
            for stage in OPEN_STAGE_KEYS
        )
    engine.dispose()
    assert 150 <= largest_lane <= 200
