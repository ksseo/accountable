"""Which deals the board shows (RULE-14)."""

from datetime import date, timedelta

from accountable.crm.stages import is_open

# Won and Lost show only the deals closed in the last 30 days.
BOARD_DAYS = 30


def board_window_start(today: date) -> date:
    return today - timedelta(days=BOARD_DAYS)


def shows_on_board(stage: str, close_date: date | None, today: date) -> bool:
    if is_open(stage):
        return True
    return close_date is not None and close_date >= board_window_start(today)
