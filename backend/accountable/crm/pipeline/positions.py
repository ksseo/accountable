"""A card's place in its column (PIPE-6).

A card's number sits between its neighbors' numbers. A new column starts at
1024 and steps by 1024; the top of a column is the smallest number minus 1024.
When two neighbors get closer than 0.001, the column is renumbered in 1024
steps, keeping its order.
"""

from collections.abc import Sequence

from sqlalchemy import Connection, bindparam, select, update

from accountable.core.errors import field_error, not_found
from accountable.crm.deals.repo import update_deal
from accountable.crm.deals.rules import POSITION_STEP
from accountable.crm.tables import deals

MIN_GAP = 0.001


def top(positions: Sequence[float]) -> float:
    return min(positions) - POSITION_STEP if positions else POSITION_STEP


def bottom(positions: Sequence[float]) -> float:
    return max(positions) + POSITION_STEP if positions else POSITION_STEP


def between(above: float, below: float) -> float | None:
    """Halfway between two cards, or None when they're too close to split."""
    middle = (above + below) / 2
    if middle - above < MIN_GAP or below - middle < MIN_GAP:
        return None
    return middle


def place(above: float | None, below: float | None, column: Sequence[float]) -> float | None:
    """The number for a card dropped between `above` and `below` (either may be
    empty). None means the column has to be renumbered first."""
    if above is None and below is None:
        return top(column)
    if above is None:
        assert below is not None
        return below - POSITION_STEP
    if below is None:
        return above + POSITION_STEP
    return between(above, below)


def renumbered(count: int) -> list[float]:
    return [POSITION_STEP * (index + 1) for index in range(count)]


def move_deal(
    conn: Connection,
    deal_id: int,
    stage: str,
    after_id: int | None,
    before_id: int | None,
    today,
) -> dict | None:
    """Moves a card to `stage`, below `after_id` and above `before_id`.

    A change of stage follows RULE-3. Returns any contact made a customer.
    """
    if conn.scalar(select(deals.c.id).where(deals.c.id == deal_id)) is None:
        raise not_found("Deal")
    column = conn.execute(
        select(deals.c.id, deals.c.position)
        .where(deals.c.stage == stage, deals.c.id != deal_id)
        .order_by(deals.c.position, deals.c.id)
    ).all()
    positions = {row.id: row.position for row in column}
    for field, neighbor in (("after_id", after_id), ("before_id", before_id)):
        if neighbor is not None and neighbor not in positions:
            raise field_error(field, f"Deal {neighbor} isn't a card in the {stage} column", "not_in_column")
    above = positions.get(after_id) if after_id is not None else None
    below = positions.get(before_id) if before_id is not None else None
    if above is not None and below is not None and above >= below:
        raise field_error("before_id", "before_id must be below after_id", "wrong_order")

    new_position = place(above, below, list(positions.values()))
    if new_position is None:
        order = [row.id for row in column]
        order.insert(order.index(after_id) + 1, deal_id)
        numbers = dict(zip(order, renumbered(len(order)), strict=True))
        conn.execute(
            update(deals).where(deals.c.id == bindparam("deal")).values(position=bindparam("number")),
            [{"deal": other, "number": number} for other, number in numbers.items() if other != deal_id],
        )
        new_position = numbers[deal_id]

    return update_deal(conn, deal_id, {"stage": stage, "position": new_position}, today)
