"""GET /api/pipeline and POST /api/deals/{id}/move (API-6, API-4)."""

from fastapi import APIRouter

from accountable.core import clock
from accountable.core.db import Conn
from accountable.crm.deals import repo as deals_repo
from accountable.crm.deals.schemas import DealSaved
from accountable.crm.pipeline.positions import move_deal
from accountable.crm.pipeline.rules import board_window_start
from accountable.crm.pipeline.schemas import DealMove, Pipeline, PipelineColumn
from accountable.crm.stages import CLOSED_STAGE_KEYS, OPEN_STAGE_KEYS, STAGE_KEYS
from accountable.crm.tables import deals

router = APIRouter(tags=["pipeline"])


@router.get("/pipeline")
def get_pipeline(conn: Conn) -> Pipeline:
    today = clock.today()
    window_start = board_window_start(today)
    shown = deals_repo.list_deals(conn, today, deals.c.stage.in_(OPEN_STAGE_KEYS)) + deals_repo.list_deals(
        conn, today, deals.c.stage.in_(CLOSED_STAGE_KEYS), deals.c.close_date >= window_start
    )
    columns = []
    for stage in STAGE_KEYS:
        cards = [deal for deal in shown if deal["stage"] == stage]
        columns.append(
            PipelineColumn(
                stage=stage,
                deals=cards,
                count=len(cards),
                value=sum(deal["value"] for deal in cards),
                expected_revenue=sum(deal["expected_revenue"] for deal in cards),
            )
        )
    open_columns = [column for column in columns if column.stage in OPEN_STAGE_KEYS]
    return Pipeline(
        columns=columns,
        open_count=sum(column.count for column in open_columns),
        open_value=sum(column.value for column in open_columns),
        open_expected_revenue=sum(column.expected_revenue for column in open_columns),
        window_start=window_start,
    )


@router.post("/deals/{deal_id}/move", tags=["deals"])
def move(deal_id: int, body: DealMove, conn: Conn) -> DealSaved:
    """Moves a card on the board. The response is the saved card with its new number."""
    today = clock.today()
    promoted = move_deal(conn, deal_id, body.stage, body.after_id, body.before_id, today)
    return DealSaved(**deals_repo.get_deal(conn, deal_id, today), promoted_contact=promoted)
