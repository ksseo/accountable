"""Activities' endpoints and both timelines (API-5, and the timelines of API-3
and API-4), since a timeline is a list of activities."""

from typing import Annotated

from fastapi import APIRouter, Query, Response

from accountable.core import clock
from accountable.core.db import Conn
from accountable.crm.activities import repo
from accountable.crm.activities.schemas import ActivityIn, ActivityPatch, TimelineEntry, TimelinePage

router = APIRouter(tags=["activities"])

Offset = Annotated[int, Query(ge=0)]


@router.post("/activities", status_code=201)
def create_activity(body: ActivityIn, conn: Conn) -> TimelineEntry:
    return TimelineEntry(**repo.create_activity(conn, body.model_dump(), clock.today()))


@router.patch("/activities/{activity_id}")
def update_activity(activity_id: int, body: ActivityPatch, conn: Conn) -> TimelineEntry:
    changes = body.model_dump(exclude_unset=True)
    return TimelineEntry(**repo.update_activity(conn, activity_id, changes, clock.today()))


@router.delete("/activities/{activity_id}", status_code=204)
def delete_activity(activity_id: int, conn: Conn) -> Response:
    repo.delete_activity(conn, activity_id)
    return Response(status_code=204)


@router.get("/contacts/{contact_id}/timeline", tags=["contacts"])
def contact_timeline(contact_id: int, conn: Conn, offset: Offset = 0) -> TimelinePage:
    return TimelinePage(**repo.contact_timeline(conn, contact_id, offset, clock.today()))


@router.get("/deals/{deal_id}/timeline", tags=["deals"])
def deal_timeline(deal_id: int, conn: Conn, offset: Offset = 0) -> TimelinePage:
    return TimelinePage(**repo.deal_timeline(conn, deal_id, offset, clock.today()))
