"""Deals' endpoints (API-4). The move is in pipeline/routes.py and the
timeline in activities/routes.py."""

from fastapi import APIRouter, Response

from accountable.core import clock
from accountable.core.db import Conn
from accountable.crm.deals import repo
from accountable.crm.deals.schemas import Deal, DealImpact, DealIn, DealPatch, DealSaved

router = APIRouter(prefix="/deals", tags=["deals"])


@router.get("")
def list_deals(conn: Conn) -> list[Deal]:
    return [Deal(**row) for row in repo.list_deals(conn, clock.today())]


@router.post("", status_code=201)
def create_deal(body: DealIn, conn: Conn) -> DealSaved:
    today = clock.today()
    deal_id, promoted = repo.create_deal(conn, body.model_dump(), today)
    return DealSaved(**repo.get_deal(conn, deal_id, today), promoted_contact=promoted)


@router.get("/{deal_id}")
def get_deal(deal_id: int, conn: Conn) -> Deal:
    return Deal(**repo.get_deal(conn, deal_id, clock.today()))


@router.patch("/{deal_id}")
def update_deal(deal_id: int, body: DealPatch, conn: Conn) -> DealSaved:
    today = clock.today()
    promoted = repo.update_deal(conn, deal_id, body.model_dump(exclude_unset=True), today)
    return DealSaved(**repo.get_deal(conn, deal_id, today), promoted_contact=promoted)


@router.get("/{deal_id}/delete-impact")
def deal_delete_impact(deal_id: int, conn: Conn) -> DealImpact:
    return DealImpact(**repo.delete_impact(conn, deal_id))


@router.delete("/{deal_id}", status_code=204)
def delete_deal(deal_id: int, conn: Conn) -> Response:
    repo.delete_deal(conn, deal_id)
    return Response(status_code=204)
