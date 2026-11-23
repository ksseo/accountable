"""The board's shapes (API-6, PIPE-6)."""

from datetime import date

from pydantic import BaseModel

from accountable.crm.deals.schemas import Deal
from accountable.crm.stages import StageKey


class DealMove(BaseModel):
    """The card's new stage and the cards it now sits between: `after_id` is the
    card above it and `before_id` the card below. Either may be empty."""

    stage: StageKey
    after_id: int | None = None
    before_id: int | None = None


class PipelineColumn(BaseModel):
    stage: StageKey
    deals: list[Deal]
    count: int
    value: int
    expected_revenue: int


class Pipeline(BaseModel):
    """Six columns in stage order, cards in place order. Won and Lost hold the
    deals closed since `window_start` (RULE-14). The totals are open deals only."""

    columns: list[PipelineColumn]
    open_count: int
    open_value: int
    open_expected_revenue: int
    window_start: date
