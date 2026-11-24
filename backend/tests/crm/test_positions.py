"""A card's place in its column (PIPE-6)."""

from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy import select, update

from accountable.crm.pipeline import positions
from accountable.crm.pipeline.positions import between, move_deal, place, top
from accountable.crm.tables import deals

TODAY = date(2026, 11, 23)


def test_a_new_column_starts_at_1024():
    assert place(None, None, []) == 1024


def test_a_dropped_card_goes_halfway_between_its_neighbors():
    assert place(1024, 2048, [1024, 2048]) == 1536


def test_the_top_is_the_smallest_number_minus_1024():
    assert top([1024, 2048, 3072]) == 0
    assert place(None, 1024, [1024, 2048]) == 0
    assert place(None, None, [1024, 2048]) == 0


def test_the_bottom_is_the_largest_plus_1024():
    assert place(3072, None, [1024, 2048, 3072]) == 4096


def test_neighbors_closer_than_0_001_need_renumbering():
    assert between(1.0, 1.0015) is None
    assert between(1.0, 1.003) == pytest.approx(1.0015)


def _column(conn, stage):
    rows = conn.execute(
        select(deals.c.name, deals.c.position).where(deals.c.stage == stage).order_by(deals.c.position)
    ).all()
    return [row.name for row in rows]


@pytest.fixture
def column(conn, add):
    """Three cards in Proposal, A, B, C from the top, and one in New."""
    ids = {
        name: add(
            deals, name=name, stage="proposal", position=1024.0 * (index + 1), furthest_open_stage="proposal"
        )
        for index, name in enumerate("ABC")
    }
    ids["N"] = add(deals, name="N", stage="new", position=1024.0)
    return ids


def test_moving_between_two_cards(conn, column):
    move_deal(conn, column["C"], "proposal", column["A"], column["B"], TODAY)
    assert _column(conn, "proposal") == ["A", "C", "B"]


def test_moving_to_the_top_and_bottom_of_its_own_column(conn, column):
    move_deal(conn, column["C"], "proposal", None, column["A"], TODAY)
    assert _column(conn, "proposal") == ["C", "A", "B"]
    move_deal(conn, column["C"], "proposal", column["B"], None, TODAY)
    assert _column(conn, "proposal") == ["A", "B", "C"]


def test_moving_into_an_empty_column(conn, column):
    move_deal(conn, column["A"], "negotiation", None, None, TODAY)
    assert conn.scalar(select(deals.c.position).where(deals.c.id == column["A"])) == 1024
    assert conn.scalar(select(deals.c.stage).where(deals.c.id == column["A"])) == "negotiation"


def test_moving_to_another_column_changes_the_stage(conn, column):
    move_deal(conn, column["N"], "proposal", column["A"], column["B"], TODAY)
    assert _column(conn, "proposal") == ["A", "N", "B", "C"]
    assert conn.scalar(select(deals.c.probability).where(deals.c.id == column["N"])) == 50


def test_renumbering_when_too_close_keeps_the_order(conn, column):
    conn.execute(update(deals).where(deals.c.id == column["B"]).values(position=1024.0005))
    move_deal(conn, column["C"], "proposal", column["A"], column["B"], TODAY)
    assert _column(conn, "proposal") == ["A", "C", "B"]
    numbers = conn.scalars(
        select(deals.c.position).where(deals.c.stage == "proposal").order_by(deals.c.position)
    ).all()
    assert numbers == [1024, 2048, 3072]


def test_many_drops_in_the_same_gap_stay_in_order(conn, column):
    # Each drop halves the gap above B; renumbering happens when it gets too small.
    for index in range(30):
        new_id = conn.execute(
            deals.insert().values(
                name=f"X{index}",
                stage="new",
                value=1,
                probability=10,
                position=5000.0 + index,
                furthest_open_stage="new",
            )
        ).inserted_primary_key[0]
        above = conn.execute(
            select(deals.c.id)
            .where(
                deals.c.stage == "proposal",
                deals.c.position
                < select(deals.c.position).where(deals.c.id == column["B"]).scalar_subquery(),
            )
            .order_by(deals.c.position.desc())
            .limit(1)
        ).scalar()
        move_deal(conn, new_id, "proposal", above, column["B"], TODAY)
    order = _column(conn, "proposal")
    assert order[0] == "A"
    assert order[-2:] == ["B", "C"]
    assert order[1:-2] == [f"X{index}" for index in range(30)]
    assert positions.MIN_GAP == 0.001


def test_a_neighbor_from_another_column_is_refused(conn, column):
    with pytest.raises(HTTPException, match=r"'loc': \['body', 'after_id'\]") as error:
        move_deal(conn, column["A"], "proposal", column["N"], None, TODAY)
    assert error.value.status_code == 422
